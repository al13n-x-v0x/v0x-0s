// ============================================================
// VOX-OS backend — optional local server
//   · AI provider proxy (Gemini + Groq) with router + failover
//   · GitHub proxy (token lives here, never in the browser)
//   · API keys are read from server/.env or set via the API
//     Manager; keys are NEVER returned to the frontend.
//
// Run:  node server/index.js   (or: npm run server)
// Frontend talks to /api/* (Vite proxies to :8787 in dev).
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);

// ---- tiny .env loader (no deps) -----------------------------------
function loadEnv(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !m[1].startsWith('#')) {
        const v = m[2].replace(/^["']|["']$/g, '');
        if (process.env[m[1]] === undefined) process.env[m[1]] = v;
      }
    }
  } catch { /* no .env — env vars only */ }
}
loadEnv(path.join(__dirname, '.env'));

// ---- key storage ----------------------------------------------------
// Keys come from env vars (preferred) or the API Manager endpoint.
// Persisted locally in server/.vox-keys.json (gitignored) for dev.
const keysFile = path.join(__dirname, '.vox-keys.json');
function loadKeys() {
  try { return JSON.parse(fs.readFileSync(keysFile, 'utf8')); } catch { return {}; }
}
function saveKeys(keys) {
  try { fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2), { mode: 0o600 }); } catch { /* non-fatal */ }
}
let storedKeys = loadKeys();
function getKey(id) {
  const env = { gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY, github: process.env.GITHUB_TOKEN };
  return storedKeys[id] || env[id] || '';
}
function getGithubToken() {
  return getKey('github');
}
const PROVIDERS = {
  gemini: { label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  groq: { label: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
};

// ---- rate limiting (simple in-memory) --------------------------------
const hits = new Map();
function rateLimit(req, perMin = 30) {
  const ip = req.socket.remoteAddress || 'local';
  const now = Date.now();
  const bucket = hits.get(ip) ?? [];
  const recent = bucket.filter((t) => now - t < 60_000);
  if (recent.length >= perMin) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

// ---- provider adapters ------------------------------------------------
async function geminiComplete(model, systemPrompt, messages, apiKey, maxTokens, temperature) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts = [];
  if (systemPrompt) parts.push({ text: `[system]\n${systemPrompt}` });
  for (const m of messages) {
    if (m.role === 'system') continue;
    parts.push({ text: m.content });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { maxOutputTokens: maxTokens, temperature } }),
  });
  if (!res.ok) {
    let category = 'PROVIDER ERROR';
    if (res.status === 400) category = 'INVALID API KEY';
    if (res.status === 429) category = 'RATE LIMITED';
    if (res.status === 404) category = 'MODEL UNAVAILABLE';
    const body = await res.text().catch(() => '');
    throw new ApiError(category, `Gemini request failed (HTTP ${res.status})${safeDetail(body)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  if (!text) throw new ApiError('PROVIDER ERROR', 'Gemini returned an empty response.');
  return text;
}

async function groqComplete(model, systemPrompt, messages, apiKey, maxTokens, temperature) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  for (const m of messages) {
    if (m.role === 'system') continue;
    msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: msgs, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) {
    let category = 'PROVIDER ERROR';
    if (res.status === 401) category = 'INVALID API KEY';
    if (res.status === 429) category = 'RATE LIMITED';
    if (res.status === 404) category = 'MODEL UNAVAILABLE';
    const body = await res.text().catch(() => '');
    throw new ApiError(category, `Groq request failed (HTTP ${res.status})${safeDetail(body)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new ApiError('PROVIDER ERROR', 'Groq returned an empty response.');
  return text;
}

function classifyTask(text) {
  const q = text.toLowerCase();
  if (/(explain|what is|how do)/.test(q)) return 'QUICK EXPLANATION';
  if (/(review|refactor|analy(se|ze)|optimize|improve)/.test(q)) return 'DEEP ANALYSIS';
  if (/(generate|create|write|build|implement|make)/.test(q)) return 'CODE GENERATION';
  if (/(error|fail|bug|crash|fix)/.test(q)) return 'CODE REVIEW';
  if (text.length > 400) return 'LARGE CONTEXT';
  return 'FAST RESPONSE';
}

function pickProvider(settings, task) {
  if (settings.primaryProvider && settings.primaryProvider !== 'auto') return settings.primaryProvider;
  // smart auto
  const deep = ['DEEP ANALYSIS', 'CODE GENERATION', 'CODE REVIEW', 'LARGE CONTEXT'];
  if (deep.includes(task) && getKey('gemini')) return 'gemini';
  if (getKey('groq')) return 'groq';
  return getKey('gemini') ? 'gemini' : 'groq';
}

async function complete(providerId, model, systemPrompt, messages, apiKey, maxTokens, temperature) {
  if (providerId === 'gemini') return geminiComplete(model, systemPrompt, messages, apiKey, maxTokens, temperature);
  return groqComplete(model, systemPrompt, messages, apiKey, maxTokens, temperature);
}

class ApiError extends Error {
  constructor(category, message) {
    super(message);
    this.category = category;
  }
}

// ---- HTTP server -----------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  const json = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' });
    res.end(JSON.stringify(data));
  };
  if (method === 'OPTIONS') return json(200, { ok: true });

  // health
  if (method === 'GET' && pathname === '/api/health') {
    return json(200, { ok: true, version: '0.1.0', providers: { gemini: !!getKey('gemini'), groq: !!getKey('groq') } });
  }

  // ---- AI chat (SSE streaming) ----
  if (method === 'POST' && pathname === '/api/ai/chat') {
    if (!rateLimit(req)) return json(429, { error: 'Too many requests — slow down.', category: 'RATE LIMITED' });
    let body = '';
    for await (const chunk of req) body += chunk;
    let payload;
    try { payload = JSON.parse(body); } catch { return json(400, { error: 'Invalid JSON body', category: 'CONFIGURATION ERROR' }); }

    const settings = payload.settings ?? {};
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-10) : [];
    const systemPrompt = settings.systemPrompt || '';
    const maxTokens = Number(settings.maxTokens) || 2048;
    const temperature = Number(settings.temperature) ?? 0.7;
    const task = classifyTask(payload.content || '');
    const primary = pickProvider(settings, task);
    const secondary = settings.secondaryProvider === 'gemini' ? 'gemini' : 'groq';

    const started = Date.now();
    const attempt = async (providerId) => {
      const key = getKey(providerId);
      if (!key) throw new ApiError('CONFIGURATION ERROR', `${providerId.toUpperCase()} is not configured. Set ${providerId === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY'} in server/.env.`);
      const model = payload.models?.[providerId] || PROVIDERS[providerId].models[0];
      const text = await complete(providerId, model, systemPrompt, messages, key, maxTokens, temperature);
      return { text, provider: providerId, model, latencyMs: Date.now() - started };
    };

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    let result;
    let dualNote = '';

    // ---- DUAL mode: query both providers together when both are configured ----
    const dual = settings.routingMode === 'dual';
    const deepTasks = ['DEEP ANALYSIS', 'CODE GENERATION', 'CODE REVIEW', 'LARGE CONTEXT'];
    const preferred = deepTasks.includes(task) ? 'gemini' : 'groq';
    const other = preferred === 'gemini' ? 'groq' : 'gemini';
    const both = [preferred, other].filter((p) => getKey(p));

    if (dual && both.length === 2) {
      const settled = await Promise.allSettled([attempt(both[0]), attempt(both[1])]);
      const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      if (ok.length) {
        const pick = ok.find((r) => r.provider === preferred) ?? ok[0];
        result = pick;
        const failures = settled.filter((r) => r.status === 'rejected').length;
        dualNote = failures === 0
          ? `PARALLEL ${both[0].toUpperCase()} + ${both[1].toUpperCase()} — both responded; ${pick.provider.toUpperCase()} selected for ${task} · ${other.toUpperCase()} cross-check ready`
          : `PARALLEL ${both[0].toUpperCase()} + ${both[1].toUpperCase()} — ${pick.provider.toUpperCase()} responded${failures === 2 ? '' : `; ${other.toUpperCase()} failed`}`;
        send({ meta: { note: dualNote } });
      } else {
        settled.forEach((r) => { if (r.status === 'rejected') send({ error: r.reason.message, category: r.reason.category }); });
        send({ error: 'Both providers failed. VOX AI temporarily unavailable.', category: 'PROVIDER ERROR' });
        return res.end();
      }
    } else if (dual) {
      dualNote = `DUAL requested but only ${both[0]?.toUpperCase() ?? 'no provider'} configured — falling back to single provider.`;
      send({ meta: { note: dualNote } });
      try {
        result = await attempt(primary);
      } catch (e1) {
        send({ error: e1.message, category: e1.category });
        return res.end();
      }
    } else {
      try {
        result = await attempt(primary);
      } catch (e1) {
        send({ error: e1.message, category: e1.category });
        if (settings.routingMode !== 'primary' && secondary !== primary) {
          send({ meta: { note: `FAILOVER → ${secondary.toUpperCase()}` } });
          try {
            result = await attempt(secondary);
          } catch (e2) {
            send({ error: e2.message, category: e2.category });
            send({ error: 'Both providers failed. VOX AI temporarily unavailable.', category: 'PROVIDER ERROR' });
            return res.end();
          }
        } else {
          return res.end();
        }
      }
    }

    // stream the real text progressively
    const full = result.text;
    const step = 24;
    for (let i = 0; i < full.length; i += step) {
      send({ delta: full.slice(0, i + step) });
      await new Promise((r) => setTimeout(r, 12));
    }
    send({ meta: { provider: result.provider, model: result.model, latencyMs: result.latencyMs, dual: dualNote } });
    send({ meta: { done: true } });
    return res.end();
  }

  // ---- provider config (save key) ----
  if (method === 'POST' && /^\/api\/ai\/providers\/(gemini|groq)\/config$/.test(pathname)) {
    const id = pathname.split('/')[4];
    let body = '';
    for await (const chunk of req) body += chunk;
    let payload = {};
    try { payload = JSON.parse(body); } catch { return json(400, { error: 'Invalid JSON' }); }
    const key = String(payload.apiKey || '').trim();
    if (!key) return json(400, { error: 'No API key provided', category: 'CONFIGURATION ERROR' });
    if (!/^[A-Za-z0-9_\-]{8,}$/.test(key)) return json(400, { error: 'Key format looks invalid', category: 'CONFIGURATION ERROR' });
    storedKeys[id] = key;
    saveKeys(storedKeys);
    return json(200, { ok: true, masked: key.slice(0, 4) + '••••••••••••••••••' });
  }
  if (method === 'DELETE' && /^\/api\/ai\/providers\/(gemini|groq)\/config$/.test(pathname)) {
    const id = pathname.split('/')[4];
    delete storedKeys[id];
    saveKeys(storedKeys);
    return json(200, { ok: true });
  }

  // ---- provider test ----
  if (method === 'POST' && /^\/api\/ai\/providers\/(gemini|groq)\/test$/.test(pathname)) {
    const id = pathname.split('/')[4];
    const key = getKey(id);
    if (!key) return json(400, { error: `${id.toUpperCase()} is not configured`, category: 'CONFIGURATION ERROR' });
    const started = Date.now();
    try {
      if (id === 'gemini') {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key), { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new ApiError(res.status === 429 ? 'RATE LIMITED' : res.status === 400 ? 'INVALID API KEY' : 'PROVIDER ERROR', `Gemini test failed (HTTP ${res.status})`);
        const data = await res.json();
        const models = (data.models || []).filter((m) => m.name.startsWith('models/gemini')).map((m) => m.name.replace('models/', ''));
        return json(200, { ok: true, latencyMs: Date.now() - started, model: models[0] || 'gemini-2.0-flash', models });
      } else {
        const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) throw new ApiError(res.status === 429 ? 'RATE LIMITED' : res.status === 401 ? 'INVALID API KEY' : 'PROVIDER ERROR', `Groq test failed (HTTP ${res.status})`);
        const data = await res.json();
        return json(200, { ok: true, latencyMs: Date.now() - started, model: data.data?.[0]?.id || 'llama-3.3-70b-versatile' });
      }
    } catch (e) {
      return json(502, { error: e.message || 'Test failed', category: e.category || 'PROVIDER ERROR' });
    }
  }

  // ---- model discovery ----
  if (method === 'GET' && /^\/api\/ai\/providers\/(gemini|groq)\/models$/.test(pathname)) {
    const id = pathname.split('/')[4];
    const key = getKey(id);
    if (!key) return json(400, { error: 'Not configured', category: 'CONFIGURATION ERROR' });
    try {
      const models = [];
      if (id === 'gemini') {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key));
        const data = await res.json();
        (data.models || []).filter((m) => /gemini/.test(m.name)).slice(0, 24).forEach((m) => models.push(m.name.replace('models/', '')));
      } else {
        const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
        const data = await res.json();
        (data.data || []).slice(0, 24).forEach((m) => models.push(m.id));
      }
      return json(200, { models: models.length ? models : PROVIDERS[id].models });
    } catch {
      return json(502, { error: 'Model discovery failed', category: 'PROVIDER ERROR' });
    }
  }

  // ---- Desktop Agent ----
  // The local Desktop Agent (agent/index.js) writes agent/.vox-agent.json
  // with its port + token. The backend brokers the token to the web shell so
  // it can connect directly over WebSocket (loopback only).
  if (method === 'GET' && pathname === '/api/agent/status') {
    try {
      const agentCfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', '.vox-agent.json'), 'utf8'));
      // confirm the daemon actually answers
      const running = await new Promise((resolve) => {
        const req = http.get({ host: '127.0.0.1', port: agentCfg.port, path: '/', timeout: 1500 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });
      if (!running) return json(200, { running: false, configured: true, port: agentCfg.port, error: 'Daemon not running — start it with: node agent/index.js' });
      return json(200, { running: true, configured: true, url: `ws://127.0.0.1:${agentCfg.port}`, token: agentCfg.token, version: agentCfg.version, permissions: agentCfg.permissions });
    } catch {
      return json(200, { running: false, configured: false, error: 'No agent config found. Start the daemon: node agent/index.js (it generates a token on first run).' });
    }
  }

  // ---- GitHub ----
  // Configure a GitHub PAT from the UI — stored server-side (gitignored),
  // never returned to the browser. GITHUB_TOKEN env var also works.
  if (method === 'POST' && pathname === '/api/github/config') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let payload = {};
    try { payload = JSON.parse(body); } catch { return json(400, { error: 'Invalid JSON' }); }
    const token = String(payload.token || '').trim();
    if (!token) return json(400, { error: 'No token provided', category: 'CONFIGURATION ERROR' });
    if (token.length < 10) return json(400, { error: 'Token looks too short to be a valid PAT', category: 'CONFIGURATION ERROR' });
    // validate against GitHub before persisting
    try {
      const res = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'vox-os', Accept: 'application/vnd.github+json' } });
      if (!res.ok) {
        const cat = res.status === 401 ? 'INVALID TOKEN' : res.status === 403 ? 'RATE LIMITED' : 'PROVIDER ERROR';
        return json(401, { error: `GitHub rejected the token (HTTP ${res.status})`, category: cat });
      }
      const data = await res.json();
      storedKeys.github = token;
      saveKeys(storedKeys);
      return json(200, { ok: true, user: data.login, masked: 'ghp_••••••••••••••••••' });
    } catch {
      return json(502, { error: 'GitHub request failed — network error.', category: 'NETWORK ERROR' });
    }
  }
  if (method === 'DELETE' && pathname === '/api/github/config') {
    delete storedKeys.github;
    saveKeys(storedKeys);
    return json(200, { ok: true });
  }
  if (method === 'GET' && pathname === '/api/github/status') {
    const token = getGithubToken();
    if (!token) return json(200, { connected: false });
    try {
      const res = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'vox-os' } });
      if (!res.ok) return json(200, { connected: false });
      const data = await res.json();
      return json(200, { connected: true, user: data.login });
    } catch {
      return json(200, { connected: false });
    }
  }
  if (method === 'GET' && pathname === '/api/github/repos') {
    const token = getGithubToken();
    if (!token) return json(502, { error: 'GitHub requires a token — configure it in API Manager or set GITHUB_TOKEN in server/.env. The frontend never holds credentials.' });
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'vox-os', Accept: 'application/vnd.github+json' } });
      if (!res.ok) return json(502, { error: `GitHub API error (HTTP ${res.status})` });
      const repos = await res.json();
      return json(200, { repos: repos.map((r) => ({ name: r.name, full_name: r.full_name, language: r.language, stargazers_count: r.stargazers_count, forks_count: r.forks_count, pushed_at: r.pushed_at, default_branch: r.default_branch })) });
    } catch {
      return json(502, { error: 'GitHub request failed — network error.' });
    }
  }

  // ---- GitHub secret scan (recent files of a repo) ----
  // Scans files changed in the last N commits for secret patterns.
  // Findings return a redacted line — never the secret value itself.
  if (method === 'GET' && pathname === '/api/github/scan') {
    const token = getGithubToken();
    if (!token) return json(502, { error: 'GitHub requires a token — configure it in API Manager or set GITHUB_TOKEN in server/.env. The frontend never holds credentials.' });
    const repo = String(url.searchParams.get('repo') || '').trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return json(400, { error: 'Provide a repo as owner/name, e.g. ?repo=octocat/hello-world', category: 'CONFIGURATION ERROR' });
    const gh = (p, opts = {}) => fetch(`https://api.github.com${p}`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'vox-os', Accept: 'application/vnd.github+json', ...opts.headers },
    });
    try {
      // 1. repo metadata → default branch
      const repoRes = await gh(`/repos/${repo}`);
      if (repoRes.status === 404) return json(404, { error: `Repo ${repo} not found, or the token cannot see it.` });
      if (!repoRes.ok) return json(502, { error: `GitHub API error (HTTP ${repoRes.status}) while reading repo.` });
      const repoData = await repoRes.json();
      const branch = repoData.default_branch || 'main';

      // 2. recent commits → collect changed file paths (dedup, capped)
      const commitsRes = await gh(`/repos/${repo}/commits?per_page=8`);
      if (!commitsRes.ok) return json(502, { error: `GitHub API error (HTTP ${commitsRes.status}) while listing commits.` });
      const commits = await commitsRes.json();
      const fileSet = new Set();
      for (const c of commits.slice(0, 6)) {
        const detailRes = await gh(`/repos/${repo}/commits/${c.sha}`);
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        for (const f of detail.files || []) {
          const p = String(f.filename || '');
          if (p && fileSet.size < 30) fileSet.add(p);
        }
      }
      const files = [...fileSet];

      // 3. fetch each file (contents API, base64) and scan it
      const SKIP = /(^|\/)(node_modules|dist|build|\.git|vendor)\//;
      const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|tar|woff2?|ttf|eot|exe|dll|so|dylib|bin|class|pyc|lock|map|min\.js|min\.css)$/i;
      const findings = [];
      let filesScanned = 0;
      let filesSkipped = 0;
      for (const fp of files) {
        if (SKIP.test(fp) || BINARY_EXT.test(fp)) { filesSkipped++; continue; }
        try {
          const fRes = await gh(`/repos/${repo}/contents/${encodeURIComponent(fp).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`);
          if (!fRes.ok) { filesSkipped++; continue; }
          const fData = await fRes.json();
          if (!fData.content || fData.encoding !== 'base64') { filesSkipped++; continue; }
          const text = Buffer.from(fData.content, 'base64').toString('utf8');
          if (text.length > 500_000) { filesSkipped++; continue; } // avoid giant generated files
          const lines = text.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const hit = matchSecretLine(lines[i]);
            if (hit) findings.push({ path: fp, line: i + 1, type: hit.type, match: redactLine(lines[i]) });
          }
          filesScanned++;
        } catch { filesSkipped++; }
      }

      return json(200, { ok: true, repo, branch, filesScanned, filesSkipped, findings, scannedAt: Date.now() });
    } catch {
      return json(502, { error: 'GitHub request failed — network error.' });
    }
  }

  return json(404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[VOX] backend online  →  http://localhost:${PORT}`);
  console.log(`[VOX] Gemini: ${getKey('gemini') ? 'configured (env/storage)' : 'NOT configured — set GEMINI_API_KEY'}`);
  console.log(`[VOX] Groq:   ${getKey('groq') ? 'configured (env/storage)' : 'NOT configured — set GROQ_API_KEY'}`);
  console.log(`[VOX] GitHub: ${process.env.GITHUB_TOKEN ? 'token present' : 'no token — GitHub shows NOT CONNECTED'}`);
});

// ---- secret pattern matching (kept in sync with src/lib/secrets.ts) ----
const SECRET_PATTERNS = [
  { re: /AIza[0-9A-Za-z_-]{20,}/g, type: 'Google API credential' },
  { re: /gsk_[0-9A-Za-z]{20,}/g, type: 'Groq API credential' },
  { re: /sk-[0-9A-Za-z]{20,}/g, type: 'Possible API credential' },
  { re: /sk-ant-[0-9A-Za-z_-]{20,}/g, type: 'Anthropic API credential' },
  { re: /ghp_[0-9A-Za-z]{20,}/g, type: 'GitHub personal access token' },
  { re: /github_pat_[0-9A-Za-z_]{20,}/g, type: 'GitHub fine-grained token' },
  { re: /xox[baprs]-[0-9A-Za-z-]{10,}/g, type: 'Slack token' },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g, type: 'Private key' },
  { re: /AKIA[0-9A-Z]{16}/g, type: 'AWS access key' },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, type: 'Possible JWT credential' },
  { re: /(?:password|passwd|secret|token|api[_-]?key|credential)\s*[:=]\s*["']?[^"'\s,;]{6,}/gi, type: 'Possible credential assignment' },
];
function matchSecretLine(line) {
  for (const p of SECRET_PATTERNS) {
    p.re.lastIndex = 0;
    if (p.re.test(line)) return p;
  }
  return null;
}
function redactLine(line) {
  const cleaned = line.replace(/=.*$/, '=<redacted>').replace(/:\s*.*$/, ': <redacted>');
  return cleaned.length > 72 ? cleaned.slice(0, 69) + '…' : cleaned;
}

// helper: never include secrets in error details
function safeDetail(body) {
  try {
    const parsed = JSON.parse(body);
    const m = parsed?.error?.message;
    if (m) return ` — ${String(m).slice(0, 160)}`;
  } catch { /* ignore */ }
  return '';
}
