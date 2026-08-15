import { describe, expect, it } from 'vitest';
import { clamp, dedupe, deepMerge, fmtBytes, fmtDuration, maskKey, pct, timeAgo } from '../fmt';

describe('fmt', () => {
  it('fmtBytes', () => {
    expect(fmtBytes(0)).toContain('B');
    expect(fmtBytes(1024)).toContain('KB');
    expect(fmtBytes(5 * 1024 * 1024)).toContain('MB');
    expect(fmtBytes(3 * 1024 ** 3)).toContain('GB');
    expect(fmtBytes(null)).toBe('—');
  });

  it('fmtDuration', () => {
    expect(fmtDuration(999)).toContain('ms');
    expect(fmtDuration(65_000)).toContain('min');
    expect(fmtDuration(3_700_000)).toContain('h');
    expect(fmtDuration(null)).toBe('—');
  });

  it('timeAgo', () => {
    expect(timeAgo(Date.now() - 30_000)).toContain('s ago');
    expect(timeAgo(Date.now() - 5 * 60_000)).toContain('m ago');
    expect(timeAgo(Date.now() - 3 * 3600_000)).toContain('h ago');
    expect(timeAgo(null)).toBe('never');
  });

  it('clamp and pct', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
    expect(pct(25, 50)).toBe(50);
  });

  it('maskKey never leaks the full key', () => {
    const k = 'sk-abcdef1234567890';
    const masked = maskKey(k);
    expect(masked).not.toContain(k.slice(4));
    expect(masked).toContain('••');
    expect(maskKey(null)).toBe('—');
  });

  it('dedupe and deepMerge', () => {
    expect(dedupe([1, 2, 2, 3])).toEqual([1, 2, 3]);
    const base = { a: 1, nested: { x: 1 } } as Record<string, unknown>;
    expect(deepMerge(base, { nested: { y: 2 } })).toEqual({ a: 1, nested: { x: 1, y: 2 } });
  });
});
