import { describe, expect, it } from 'vitest';
import { computeScore, STEP_LABELS, type CheckResult } from '../health';

describe('computeScore', () => {
  it('returns N/A when nothing is available', () => {
    const r = computeScore([]);
    expect(r.score).toBe(0);
    expect(r.grade).toBe('N/A');
  });

  it('averages available checks and ignores unavailable', () => {
    const checks: CheckResult[] = [
      { id: 'a', label: 'A', status: 'pass', detail: '', score: 100 },
      { id: 'b', label: 'B', status: 'warn', detail: '', score: 60 },
      { id: 'c', label: 'C', status: 'unavailable', detail: '', score: 0 },
    ];
    const r = computeScore(checks);
    expect(r.score).toBe(80); // (100+60)/2
    expect(r.grade).toBe('GOOD');
  });

  it('grades EXCELLENT at 90+ and POOR below 50', () => {
    expect(computeScore([{ id: 'a', label: 'A', status: 'pass', detail: '', score: 95 }]).grade).toBe('EXCELLENT');
    expect(computeScore([{ id: 'a', label: 'A', status: 'error', detail: '', score: 30 }]).grade).toBe('POOR');
  });

  it('STEP_LABELS covers every scan step id', () => {
    for (const step of ['integrity', 'memory', 'cpu', 'network', 'disk', 'drivers', 'security', 'startup', 'project', 'deps', 'git', 'build']) {
      expect(STEP_LABELS[step]).toBeTruthy();
    }
  });
});
