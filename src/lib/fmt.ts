// Formatting + misc helpers

export function timeAgo(ts: number | null | undefined): string {
  if (!ts) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtClock(d: Date = new Date()): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(d: Date = new Date()): string {
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtBytes(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(k)));
  return `${(n / Math.pow(k, i)).toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min ${Math.round(s % 60)}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function pct(n: number, max = 100): number {
  return clamp(Math.round((n / max) * 100), 0, 100);
}

export function maskKey(key: string | null | undefined): string {
  if (!key) return '—';
  const safe = key.trim();
  if (safe.length <= 6) return '••••••••••••••••••';
  const head = safe.slice(0, 4);
  return `${head}••••••••••••••••••`;
}

export function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function deepMerge<T>(base: T, over: Partial<T>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over ?? {})) {
    const b = out[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = deepMerge(b as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
