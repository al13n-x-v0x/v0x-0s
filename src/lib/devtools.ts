// Dev tool engines — pure functions, no fake results.

export function formatJSON(input: string, indent = 2): { ok: boolean; out: string; error?: string } {
  try {
    const parsed = JSON.parse(input);
    return { ok: true, out: JSON.stringify(parsed, null, indent) };
  } catch (e) {
    return { ok: false, out: '', error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

export function validateRegex(pattern: string): { ok: boolean; error?: string } {
  try {
    new RegExp(pattern);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid pattern' };
  }
}

export function regexTest(pattern: string, flags: string, input: string): { matches: string[]; count: number; groups: string[][] } {
  try {
    const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    const matches: string[] = [];
    const groups: string[][] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(input)) !== null && guard < 500) {
      matches.push(m[0]);
      groups.push(m.slice(1));
      if (m[0] === '') re.lastIndex++;
      guard++;
    }
    return { matches, count: matches.length, groups };
  } catch {
    return { matches: [], count: 0, groups: [] };
  }
}

export function decodeJWT(token: string): { ok: boolean; header?: unknown; payload?: unknown; error?: string; sig?: string } {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return { ok: false, error: 'Not a valid JWT — expected 3 dot-separated segments' };
  try {
    const b64 = (s: string) => decodeURIComponent(atob(s.replace(/-/g, '+').replace(/_/g, '/')).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    const header = JSON.parse(b64(parts[0]));
    const payload = JSON.parse(b64(parts[1]));
    return { ok: true, header, payload, sig: parts[2] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to decode token' };
  }
}

export function b64encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}
export function b64decode(input: string): { ok: boolean; out: string; error?: string } {
  try {
    return { ok: true, out: decodeURIComponent(escape(atob(input.trim()))) };
  } catch (e) {
    return { ok: false, out: '', error: e instanceof Error ? e.message : 'Invalid base64' };
  }
}

export function uuidv4(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function uuidShort(): string {
  return uuidv4().split('-')[0];
}

export function timestampConvert(input: string): { ok: boolean; rows?: [string, string][]; error?: string } {
  const s = input.trim();
  if (!s) return { ok: false, error: 'Enter a timestamp' };
  const num = Number(s);
  let d: Date | null = null;
  if (/^\d{10}$/.test(s)) d = new Date(num * 1000);
  else if (/^\d{13}$/.test(s)) d = new Date(num);
  else if (/^\d{16}$/.test(s)) d = new Date(Math.floor(num / 1000));
  else if (!Number.isNaN(num) && s.includes('.')) d = new Date(num * 1000);
  else d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false, error: 'Could not parse timestamp' };
  const iso = d.toISOString();
  return {
    ok: true,
    rows: [
      ['ISO 8601', iso],
      ['Unix (seconds)', String(Math.floor(d.getTime() / 1000))],
      ['Unix (milliseconds)', String(d.getTime())],
      ['Local', d.toLocaleString()],
      ['UTC', d.toUTCString()],
      ['Relative', `in ${Math.round((d.getTime() - Date.now()) / 1000)}s`],
    ],
  };
}

export function diffLines(a: string, b: string): { type: 'same' | 'add' | 'del'; text: string }[] {
  const la = a.split('\n');
  const lb = b.split('\n');
  const out: { type: 'same' | 'add' | 'del'; text: string }[] = [];
  const max = Math.max(la.length, lb.length);
  for (let i = 0; i < max; i++) {
    const A = la[i];
    const B = lb[i];
    if (A === B) out.push({ type: 'same', text: A ?? '' });
    else {
      if (A !== undefined) out.push({ type: 'del', text: A });
      if (B !== undefined) out.push({ type: 'add', text: B });
    }
  }
  return out;
}

export function formatCode(input: string, lang: string): { ok: boolean; out: string; error?: string } {
  // Lightweight, honest formatter: normalize indentation/trailing space.
  try {
    const lines = input.split('\n').map((l) => l.replace(/\s+$/, ''));
    let out = lines.join('\n');
    if (lang === 'json') {
      const r = formatJSON(out);
      if (r.ok) out = r.out;
    }
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: input, error: e instanceof Error ? e.message : 'Format failed' };
  }
}

export async function httpTest(method: string, url: string, headers: [string, string][], body: string): Promise<{ status: number; statusText: string; timeMs: number; body: string; error?: string }> {
  const started = performance.now();
  try {
    const h = new Headers();
    headers.forEach(([k, v]) => k && h.set(k, v));
    const res = await fetch(url, { method, headers: h, body: method === 'GET' || method === 'HEAD' ? undefined : body || undefined });
    const text = await res.text();
    return { status: res.status, statusText: res.statusText, timeMs: Math.round(performance.now() - started), body: text.slice(0, 4000) };
  } catch (e) {
    return { status: 0, statusText: 'FAILED', timeMs: Math.round(performance.now() - started), body: '', error: e instanceof Error ? e.message : 'Network error' };
  }
}
