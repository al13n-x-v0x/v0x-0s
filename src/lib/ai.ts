import type { ProviderId, RouterLogEntry } from './types';
import { uid } from './fmt';

const BASE = '/api';

export type BackendStatus = 'unknown' | 'online' | 'offline';

export async function pingBackend(): Promise<BackendStatus> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

export interface ChatResult {
  text: string;
  provider: ProviderId;
  model: string;
  latencyMs: number;
  demo?: boolean;
  error?: string;
  errorCategory?: string;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: (result: ChatResult) => void;
  onError: (result: ChatResult) => void;
}

// Streams a chat completion from the VOX backend. Falls back to JSON if streaming fails.
export async function streamChat(
  content: string,
  messages: { role: string; content: string }[],
  settings: { primaryProvider: ProviderId | 'auto'; secondaryProvider: ProviderId; routingMode: string; temperature: number; maxTokens: number; systemPrompt: string },
  cb: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ content, messages, settings }),
      signal,
    });
    if (signal?.aborted) {
      cb.onError({ text: '', provider: 'gemini', model: '', latencyMs: performance.now() - started, error: 'Generation stopped', errorCategory: 'STOPPED' });
      return;
    }
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      cb.onError({
        text: '', provider: 'gemini', model: '', latencyMs: performance.now() - started,
        error: err.error ?? `HTTP ${res.status}`,
        errorCategory: err.category ?? 'PROVIDER ERROR',
      });
      return;
    }
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/event-stream')) {
      const data = await res.json();
      if (data.error) {
        cb.onError({ text: '', provider: 'gemini', model: '', latencyMs: performance.now() - started, error: data.error, errorCategory: data.category ?? 'PROVIDER ERROR' });
      } else {
        cb.onDelta(data.text ?? '');
        cb.onDone({ text: data.text ?? '', provider: data.provider ?? 'gemini', model: data.model ?? '', latencyMs: data.latencyMs ?? performance.now() - started });
      }
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let failed = false;
    let meta: Partial<ChatResult> = {};
    const flush = () => {
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const evt = JSON.parse(payload);
          if (evt.delta) {
            full += evt.delta;
            cb.onDelta(full);
          } else if (evt.meta) {
            meta = { ...meta, ...evt.meta };
          } else if (evt.error) {
            failed = true;
            cb.onError({ text: full, provider: 'gemini', model: '', latencyMs: performance.now() - started, error: evt.error, errorCategory: evt.category });
            return;
          }
        } catch {
          // ignore malformed frames
        }
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flush();
    }
    flush();
    if (!failed) {
      cb.onDone({
        text: full,
        provider: meta.provider ?? 'gemini',
        model: meta.model ?? '',
        latencyMs: meta.latencyMs ?? performance.now() - started,
      });
    }
  } catch (e) {
    cb.onError({
      text: '', provider: 'gemini', model: '', latencyMs: performance.now() - started,
      error: e instanceof Error ? e.message : 'Network error', errorCategory: 'NETWORK ERROR',
    });
  }
}

export async function testProvider(id: ProviderId): Promise<{ ok: boolean; latencyMs?: number; error?: string; category?: string; model?: string }> {
  try {
    const res = await fetch(`${BASE}/ai/providers/${id}/test`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}`, category: data.category ?? 'PROVIDER ERROR' };
    return { ok: true, latencyMs: data.latencyMs, model: data.model };
  } catch {
    return { ok: false, error: 'Backend unreachable', category: 'NETWORK ERROR' };
  }
}

export async function saveProviderKey(id: ProviderId, key: string): Promise<{ ok: boolean; masked: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/ai/providers/${id}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, masked: '', error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, masked: data.masked ?? '••••••••••••••••••' };
  } catch {
    return { ok: false, masked: '', error: 'Backend unreachable — configure GEMINI_API_KEY / GROQ_API_KEY in server/.env' };
  }
}

export async function removeProviderKey(id: ProviderId): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/ai/providers/${id}/config`, { method: 'DELETE' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Backend unreachable' };
  }
}

export async function fetchModels(id: ProviderId): Promise<string[] | null> {
  try {
    const res = await fetch(`${BASE}/ai/providers/${id}/models`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.models ?? null;
  } catch {
    return null;
  }
}

export async function githubStatus(): Promise<{ connected: boolean; user?: string }> {
  try {
    const res = await fetch(`${BASE}/github/status`);
    const data = await res.json();
    return { connected: !!data.connected, user: data.user };
  } catch {
    return { connected: false };
  }
}

export async function fetchGithubRepos(): Promise<{ repos: { name: string; full_name: string; language: string | null; stargazers_count: number; forks_count: number; pushed_at: string | null; default_branch: string }[]; error?: string }> {
  try {
    const res = await fetch(`${BASE}/github/repos`);
    const data = await res.json();
    if (!res.ok) return { repos: [], error: data.error ?? `HTTP ${res.status}` };
    return { repos: data.repos ?? [] };
  } catch {
    return { repos: [], error: 'Backend unreachable' };
  }
}

// ============================================================
// DEMO ASSISTANT — clearly labeled preview responses.
// Only used when no provider is configured and demo mode is on.
// ============================================================

export function demoReply(input: string, context: { projectName: string; language: string; healthScore: number; buildStatus: string; gitChanges: number; branch: string }): string {
  const q = input.toLowerCase();
  const p = context;
  if (/(error|fail|broken|crash)/.test(q)) {
    return `Looking at the current build state for ${p.projectName}: last build ${p.buildStatus}. The error center tracks ${'recent failures'}. Common causes: missing dependency, stale lockfile, or a type mismatch in ${p.language}. Run a full health scan or open the Error Center for the exact message — then I can explain the fix.`;
  }
  if (/health|scan|status of (my )?(system|project)/.test(q)) {
    return `Project ${p.projectName}: health ${p.healthScore}/100, build ${p.buildStatus}, ${p.gitChanges} uncommitted change${p.gitChanges === 1 ? '' : 's'} on ${p.branch}. No critical issues detected.`;
  }
  if (/review|analy(se|ze)|optimize|refactor/.test(q)) {
    return `Project analysis: ${p.projectName} is a ${p.language} codebase with a health score of ${p.healthScore}/100. Recommended focus: resolve uncommitted changes, check the ${p.gitChanges > 0 ? 'modified files' : 'dependency updates'}, and run the test suite.`;
  }
  if (/minecraft|mod/.test(q)) {
    return 'A Minecraft mod scaffold would target the Fabric or Forge toolchain. I can generate a Gradle-based Java project with the fabric-loom plugin, a mixin entrypoint, and a sample block/item. Say "create a Minecraft mod" with a provider connected and I will produce the full scaffold.';
  }
  if (/build.*fail|why.*build/.test(q)) {
    return `Build diagnostics for ${p.projectName}: last exit code reflects ${p.buildStatus === 'success' ? 'a clean compile' : 'a failure'}. Open the Error Center for the specific message, or run a build in the Terminal to reproduce it.`;
  }
  if (/log/.test(q)) {
    return 'To analyze a log, open the file in Code Studio and select "EXPLAIN WITH VOX", or paste the log here. I will look for exception patterns, stack traces, and slow queries.';
  }
  if (/optimize (this )?function|performance/.test(q)) {
    return `For performance work in ${p.projectName}: profile first with the Performance monitor, then look for re-render loops, unbounded arrays, and missing memoization. Open the target file and choose "VOX FIX" with a provider connected.`;
  }
  if (/open (terminal|github|projects|settings|errors)/.test(q)) {
    const target = /github/.test(q) ? 'GitHub Center' : /projects/.test(q) ? 'Projects' : /settings/.test(q) ? 'Settings' : /errors/.test(q) ? 'Error Center' : 'Terminal';
    return `Opening ${target}.`;
  }
  return `I read ${p.projectName} (${p.language}, health ${p.healthScore}/100). This is a DEMO response — connect a provider (Gemini or Groq) in the VOX backend to get real, context-aware answers. For now I can open apps, run scans, and summarize project state.`;
}

export function classifyTask(input: string): string {
  const q = input.toLowerCase();
  if (/(explain|what is|how do)/.test(q)) return 'QUICK EXPLANATION';
  if (/(review|refactor|analy(se|ze)|optimize|improve)/.test(q)) return 'DEEP ANALYSIS';
  if (/(generate|create|write|build|implement|make)/.test(q)) return 'CODE GENERATION';
  if (/(error|fail|bug|crash|fix)/.test(q)) return 'CODE REVIEW';
  if (q.length > 400) return 'LARGE CONTEXT';
  return 'FAST RESPONSE';
}

export function routerEntry(task: string, provider: string, ok: boolean, extra = ''): RouterLogEntry {
  return { id: uid('rlog'), time: Date.now(), text: `TASK: ${task} → ${provider.toUpperCase()} ${extra}`.trim(), ok };
}
