import { describe, expect, it } from 'vitest';
import { scanForSecrets } from '../secrets';
import type { VNode } from '../types';

function tree(files: Record<string, string>): VNode {
  const root: VNode = { kind: 'dir', name: 'root', children: [] };
  for (const [p, content] of Object.entries(files)) {
    const parts = p.split('/');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      let child = cur.children.find((c) => c.kind === 'dir' && c.name === parts[i]) as Extract<VNode, { kind: 'dir' }> | undefined;
      if (!child) {
        child = { kind: 'dir', name: parts[i], children: [] };
        cur.children.push(child);
      }
      cur = child;
    }
    cur.children.push({ kind: 'file', name: parts[parts.length - 1], content });
  }
  return root;
}

describe('scanForSecrets', () => {
  it('finds a GitHub PAT and an AWS key', () => {
    const fs = tree({ 'config/env.ts': 'const token = "ghp_0123456789abcdefghijklmnopqrstuvwx";' });
    const hits = scanForSecrets(fs);
    const gh = hits.find((h) => h.type === 'GitHub personal access token');
    expect(gh).toBeTruthy();
    expect(gh!.match).not.toContain('ghp_0123456789abcdefghijklmnopqrstuvwx'); // redacted
  });

  it('flags private keys and JWTs', () => {
    const fs = tree({
      'keys.pem': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAA==\n',
      'auth.ts': 'const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";',
    });
    const hits = scanForSecrets(fs);
    expect(hits.some((h) => h.type.includes('Private key'))).toBe(true);
    expect(hits.some((h) => h.type.includes('JWT'))).toBe(true);
  });

  it('ignores node_modules and dist', () => {
    const fs = tree({
      'node_modules/pkg/index.js': 'const t = "ghp_0123456789abcdefghijklmnopqrstuvwx";',
      'dist/bundle.js': 'const t = "ghp_0123456789abcdefghijklmnopqrstuvwx";',
      'src/app.ts': 'const t = "ghp_0123456789abcdefghijklmnopqrstuvwx";',
    });
    const hits = scanForSecrets(fs);
    expect(hits.length).toBe(1);
    expect(hits[0].path.join('/')).toBe('src/app.ts');
  });

  it('catches credential assignments like API_KEY=...', () => {
    const fs = tree({ '.env': 'OPENAI_API_KEY=sk-proj-1234567890abcdef' });
    const hits = scanForSecrets(fs);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('does not flag clean files', () => {
    const fs = tree({ 'src/main.ts': 'export const x = 1;' });
    expect(scanForSecrets(fs).length).toBe(0);
  });
});
