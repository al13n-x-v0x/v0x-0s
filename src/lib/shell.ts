import type { Project, TerminalSession, VNode } from './types';
import { findNode, listDir, readFile } from './vfs';

export interface ShellCtx {
  project: Project;
  runBuild: () => { output: string; exitCode: number; durationMs: number };
  runTest: () => { output: string; exitCode: number };
  runScan: () => { output: string; exitCode: number };
  openSection: (id: string) => void;
  history: string[];
}

export interface ShellResult {
  output: string[];
  exitCode: number;
  cwd?: string[];
  prompt?: string;
}

const SHELL_PROMPTS: Record<string, (cwd: string) => string> = {
  powershell: (cwd) => `PS ${cwd}>`,
  bash: (cwd) => `${cwd}$`,
  cmd: (cwd) => `${cwd}>`,
};

function tree(dir: VNode, prefix = '', isLast = true): string[] {
  const lines: string[] = [];
  if (dir.kind !== 'dir') return lines;
  const sorted = [...dir.children].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  sorted.forEach((child, i) => {
    const last = i === sorted.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${child.name}${child.kind === 'dir' ? '/' : ''}`);
    if (child.kind === 'dir') lines.push(...tree(child, prefix + (isLast ? '    ' : '│   '), last));
  });
  return lines;
}

export function runCommand(session: TerminalSession, raw: string, ctx: ShellCtx): ShellResult {
  const input = raw.trim();
  if (!input) return { output: [], exitCode: 0 };

  // split respecting quotes
  const args = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((a) => a.replace(/^["']|["']$/g, '')) ?? [];
  const cmd = args[0].toLowerCase();
  const rest = args.slice(1);
  const fsRoot: VNode = ctx.project.fs;
  let cwd = session.cwd;

  const resolvePath = (p: string): string[] => {
    const parts = p.split(/[\\/]/).filter(Boolean);
    if (p.startsWith('/') || p.startsWith('\\')) return parts;
    if (p.startsWith('~')) return parts.slice(1);
    return [...cwd, ...parts];
  };

  switch (cmd) {
    case 'clear':
    case 'cls':
      return { output: ['__CLEAR__'], exitCode: 0 };

    case 'help':
      return {
        output: [
          'VOX-OS SIMULATED SHELL',
          'Commands:',
          '  help                     show this help',
          '  clear / cls              clear the screen',
          '  pwd                      print working directory',
          '  ls [path]                list directory contents',
          '  tree                     show directory tree',
          '  cd <path>                change directory',
          '  cat <file>               print file contents',
          '  echo <text>              print text',
          '  whoami                   current user',
          '  date                     current date/time',
          '  uname                    system information',
          '  git status|log|branch    simulated git commands',
          '  npm run build|dev|test   project scripts',
          '  node -v                  node version',
          '  python --version         python version',
          '  vox build|test|scan      VOX engine commands',
          '  mkdir <name>  touch <file>  rm <path>',
          '  history                  command history',
          '  exit                     close this session',
          '',
          'NOTE: This is a SIMULATED terminal. Real execution requires the VOX Desktop Agent.',
        ],
        exitCode: 0,
      };

    case 'pwd':
      return { output: [cwd.join('/') || '/'], exitCode: 0 };

    case 'ls': {
      const target = rest[0] ? findNode(fsRoot, resolvePath(rest[0])) : findNode(fsRoot, cwd);
      if (!target) return { output: [`ls: cannot access '${rest[0]}': No such file or directory`], exitCode: 1 };
      if (target.kind === 'file') return { output: [target.name], exitCode: 0 };
      const entries = listDir(fsRoot, cwd);
      if (rest[0]) {
        const t = findNode(fsRoot, resolvePath(rest[0]));
        if (t?.kind === 'dir') {
          return { output: [...t.children.map((c) => (c.kind === 'dir' ? `${c.name}/` : c.name)).sort()], exitCode: 0 };
        }
      }
      return { output: [...entries.map((c) => (c.kind === 'dir' ? `${c.name}/` : c.name)).sort()], exitCode: 0 };
    }

    case 'tree': {
      const target = rest[0] ? findNode(fsRoot, resolvePath(rest[0])) : findNode(fsRoot, cwd);
      if (!target || target.kind === 'file') return { output: ['tree: directory not found'], exitCode: 1 };
      const name = rest[0]?.split('/').pop() || target.name;
      return { output: [name + '/', ...tree(target)], exitCode: 0 };
    }

    case 'cd': {
      if (!rest[0] || rest[0] === '~') {
        return { output: [], exitCode: 0, cwd: [] };
      }
      if (rest[0] === '..') {
        return { output: [], exitCode: 0, cwd: cwd.slice(0, -1) };
      }
      if (rest[0] === '.') return { output: [], exitCode: 0 };
      const target = findNode(fsRoot, resolvePath(rest[0]));
      if (target?.kind === 'dir') return { output: [], exitCode: 0, cwd: resolvePath(rest[0]) };
      return { output: [`cd: no such file or directory: ${rest[0]}`], exitCode: 1 };
    }

    case 'cat': {
      if (!rest[0]) return { output: ['cat: missing operand'], exitCode: 1 };
      const content = readFile(fsRoot, resolvePath(rest[0]));
      if (content == null) return { output: [`cat: ${rest[0]}: No such file or directory`], exitCode: 1 };
      return { output: content.split('\n'), exitCode: 0 };
    }

    case 'echo':
      return { output: [rest.join(' ')], exitCode: 0 };

    case 'whoami':
      return { output: ['AL13N'], exitCode: 0 };

    case 'date':
      return { output: [new Date().toString()], exitCode: 0 };

    case 'uname':
      return { output: [`VOX-OS ${ctx.project.packageManager} ${'v0.1.0'} — browser sandbox (simulated)`], exitCode: 0 };

    case 'node':
      if (rest[0] === '-v' || rest[0] === '--version') return { output: ['v20.12.2'], exitCode: 0 };
      return { output: ['node: interactive REPL requires the Desktop Agent'], exitCode: 1 };

    case 'python':
      if (rest[0] === '--version' || rest[0] === '-V') return { output: ['Python 3.12.4'], exitCode: 0 };
      return { output: ['python: interactive shell requires the Desktop Agent'], exitCode: 1 };

    case 'git': {
      const sub = rest[0];
      if (sub === 'status') {
        const g = ctx.project.git;
        const lines = [
          `On branch ${g.branch}`,
          g.ahead ? `Your branch is ahead of 'origin/${g.branch}' by ${g.ahead} commit(s).` : `Your branch is up to date with 'origin/${g.branch}'.`,
        ];
        if (g.changes.length === 0) {
          lines.push('nothing to commit, working tree clean');
        } else {
          lines.push('Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)');
          for (const c of g.changes) lines.push(`\t${c.state === 'deleted' ? 'deleted:' : c.state === 'added' ? 'new file:' : 'modified:'}   ${c.path}`);
        }
        return { output: lines, exitCode: 0 };
      }
      if (sub === 'log') {
        const logs = [
          `commit 9f2c41a (HEAD -> ${ctx.project.git.branch})`,
          `Author: AL13N <al13n@vox-os.dev>`,
          `Date:   ${new Date(ctx.project.lastModified).toString().slice(0, 24)}`,
          '',
          `    ${ctx.project.git.lastCommit}`,
        ];
        return { output: logs, exitCode: 0 };
      }
      if (sub === 'branch') {
        return { output: [`* ${ctx.project.git.branch}`], exitCode: 0 };
      }
      if (sub === 'diff') {
        if (ctx.project.git.changes.length === 0) return { output: ['(no changes to diff)'], exitCode: 0 };
        return {
          output: [
            'diff --git a/src/lib/store.ts b/src/lib/store.ts',
            'index a1b2c3d..e4f5a6b 100644',
            '--- a/src/lib/store.ts',
            '+++ b/src/lib/store.ts',
            '@@ -120,7 +120,7 @@ export const useVox = create<VoxState>()(',
            '   async sendMessage(content) {',
            '-    const key = "hardcoded-secret"',
            '+    const key = process.env.GEMINI_API_KEY',
            '     const res = await fetch("/api/ai/chat", { method: "POST", body: JSON.stringify({ content }) })',
          ],
          exitCode: 0,
        };
      }
      return { output: [`git: '${sub || ''}' is not a git command in the simulated shell`], exitCode: 1 };
    }

    case 'npm': {
      const script = rest[1] ?? rest[0];
      if (rest[0] === '-v' || rest[0] === '--version') return { output: ['10.8.1'], exitCode: 0 };
      if (script === 'run' && rest[2] === 'build') {
        const r = ctx.runBuild();
        return { output: ['> ' + ctx.project.name + '@0.1.0 build', '> vite build', '', ...r.output.split('\n')], exitCode: r.exitCode };
      }
      if (script === 'run' && rest[2] === 'test') {
        const r = ctx.runTest();
        return { output: ['> ' + ctx.project.name + '@0.1.0 test', '> vitest run', '', ...r.output.split('\n')], exitCode: r.exitCode };
      }
      if (script === 'run' && rest[2] === 'dev') {
        return { output: ['> ' + ctx.project.name + '@0.1.0 dev', '> vite', '', '  VITE v5.4.3  ready in 312 ms', '  ➜  Local:   http://localhost:5173/', '  ➜  Network: use --host to expose'], exitCode: 0 };
      }
      if (rest[0] === 'install') {
        return { output: ['added 144 packages in 12s', '42 packages are looking for funding', 'run `npm fund` for details'], exitCode: 0 };
      }
      return { output: [`npm: unknown command '${rest.join(' ')}'`], exitCode: 1 };
    }

    case 'vox': {
      const sub = rest[0];
      if (sub === 'build') {
        const r = ctx.runBuild();
        return { output: ['[VOX-OS] Building project...', ...r.output.split('\n')], exitCode: r.exitCode };
      }
      if (sub === 'test') {
        const r = ctx.runTest();
        return { output: ['[VOX-OS] Running tests...', ...r.output.split('\n')], exitCode: r.exitCode };
      }
      if (sub === 'scan') {
        const r = ctx.runScan();
        return { output: ['[VOX-OS] Health scan...', ...r.output.split('\n')], exitCode: r.exitCode };
      }
      if (sub === 'open') {
        const sec = (rest[1] || '').toLowerCase();
        ctx.openSection(sec);
        return { output: [`[VOX] opening ${sec}`], exitCode: 0 };
      }
      return { output: ['vox commands: build, test, scan, open <section>'], exitCode: 1 };
    }

    case 'mkdir':
    case 'touch':
      return { output: [`${cmd}: filesystem writes require the Desktop Agent`], exitCode: 1 };

    case 'rm':
      return { output: ['rm: destructive filesystem operations require the Desktop Agent'], exitCode: 1 };

    case 'history':
      return { output: ctx.history.map((h, i) => `  ${String(i + 1).padStart(4)}  ${h}`), exitCode: 0 };

    case 'exit':
      return { output: ['__EXIT__'], exitCode: 0 };

    default:
      return { output: [`${cmd}: command not found (simulated shell)`, `Try 'help' for a list of available commands.`], exitCode: 127 };
  }
}

export function makePrompt(shell: string, cwd: string[]): string {
  const c = cwd.join('/') || '~';
  return SHELL_PROMPTS[shell]?.(c) ?? `${c}$`;
}

export function sessionPrompt(session: TerminalSession): string {
  return makePrompt(session.shell, session.cwd);
}
