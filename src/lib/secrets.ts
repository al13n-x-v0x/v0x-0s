import type { VNode } from './types';
import { walk } from './vfs';

export interface SecretFinding {
  path: string[];
  line: number;
  type: string;
  match: string; // safe truncated match — never the full secret
}

// Reasonable secret patterns. Detection only; values are never shown in full.
const PATTERNS: { re: RegExp; type: string }[] = [
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

const IGNORE_PATHS = /(^|\/)(node_modules|dist|build|\.git)\//;

export function scanForSecrets(fs: VNode): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const files = walk(fs).filter((f) => f.node.kind === 'file' && !IGNORE_PATHS.test(f.path.join('/')));
  for (const f of files) {
    const content = (f.node as Extract<VNode, { kind: 'file' }>).content;
    if (!content) continue;
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      for (const p of PATTERNS) {
        p.re.lastIndex = 0;
        if (p.re.test(line)) {
          findings.push({
            path: f.path,
            line: i + 1,
            type: p.type,
            match: truncateMatch(line),
          });
          break;
        }
      }
    });
  }
  return findings;
}

// Return a safe, truncated representation of the matched line — never the secret itself.
function truncateMatch(line: string): string {
  const cleaned = line.replace(/=.*$/, '=<redacted>').replace(/:\s*.*$/, ': <redacted>');
  return cleaned.length > 72 ? cleaned.slice(0, 69) + '…' : cleaned;
}
