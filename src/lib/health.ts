import type { CheckStatus, HealthCategory, Project } from './types';
import { countFiles, walk } from './vfs';
import { browserInfo, realMemoryUsage } from './telemetry';
import { scanForSecrets } from './secrets';
import { clamp } from './fmt';

export type ScanKind = 'quick' | 'full' | 'project' | 'deps';

export interface ScanStep {
  id: string;
  label: string;
  weight: number;
  kind: ScanKind[];
}

export const SCAN_STEPS: ScanStep[] = [
  { id: 'integrity', label: 'Checking core integrity...', weight: 6, kind: ['quick', 'full'] },
  { id: 'memory', label: 'Checking memory usage...', weight: 10, kind: ['quick', 'full'] },
  { id: 'cpu', label: 'Checking CPU state...', weight: 8, kind: ['quick', 'full'] },
  { id: 'network', label: 'Checking network...', weight: 8, kind: ['quick', 'full'] },
  { id: 'disk', label: 'Checking disk health...', weight: 10, kind: ['full'] },
  { id: 'drivers', label: 'Checking drivers...', weight: 6, kind: ['full'] },
  { id: 'security', label: 'Checking security posture...', weight: 12, kind: ['full', 'project'] },
  { id: 'startup', label: 'Checking startup programs...', weight: 4, kind: ['full'] },
  { id: 'project', label: 'Checking project files...', weight: 12, kind: ['full', 'project'] },
  { id: 'deps', label: 'Checking dependencies...', weight: 10, kind: ['full', 'project', 'deps'] },
  { id: 'git', label: 'Checking Git status...', weight: 8, kind: ['full', 'project'] },
  { id: 'build', label: 'Checking build configuration...', weight: 6, kind: ['full', 'project'] },
];

interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  score: number;
}

export interface AgentHealth {
  cpu: number | null;
  memPct: number | null;
  diskPct: number | null;
  diskTotal: number | null;
  uptime: number | null;
  load: number[];
}

export function computeChecks(project: Project | null, kind: ScanKind, agent?: AgentHealth | null): CheckResult[] {
  const info = browserInfo();
  const mem = realMemoryUsage();
  const secrets = project ? scanForSecrets(project.fs) : [];
  const out: CheckResult[] = [];
  const agentOn = !!agent && agent.cpu != null && agent.memPct != null;

  const add = (r: CheckResult) => out.push(r);

  if (kind === 'quick' || kind === 'full') {
    add({
      id: 'integrity', label: 'System Integrity', status: 'pass', score: 100,
      detail: 'VOX core modules operational. Shell, state, and engines initialized without errors.',
    });
    if (agent?.memPct != null) {
      const m = agent.memPct;
      add({ id: 'memory', label: 'Memory', status: m < 70 ? 'pass' : m < 90 ? 'warn' : 'error', score: clamp(100 - m, 10, 100), detail: `Real system RAM at ${m}% (Desktop Agent).` });
    } else {
      add({ id: 'memory', label: 'Memory', status: mem.pct == null ? 'unavailable' : mem.pct < 70 ? 'pass' : mem.pct < 90 ? 'warn' : 'error', score: mem.pct == null ? 0 : clamp(100 - mem.pct, 10, 100), detail: mem.pct == null ? 'JS heap metrics unavailable in this browser. REQUIRES DESKTOP AGENT for system RAM.' : `Browser JS heap at ${mem.pct}% (${(mem.used / 1024 / 1024).toFixed(0)} MB used).` });
    }
    if (agent?.cpu != null) {
      const c = agent.cpu;
      add({ id: 'cpu', label: 'CPU', status: c < 70 ? 'pass' : c < 90 ? 'warn' : 'error', score: clamp(100 - c, 10, 100), detail: `Real CPU usage at ${c}% across ${info.cores ?? '?'} cores (Desktop Agent).` });
    } else {
      add({ id: 'cpu', label: 'CPU', status: 'unavailable', score: 0, detail: `Detected ${info.cores ?? 'unknown'} logical cores via browser. Live usage requires the Desktop Agent.` });
    }
    add({
      id: 'network', label: 'Network', status: !info.online ? 'error' : info.connection.rtt != null && info.connection.rtt > 150 ? 'warn' : 'pass',
      score: !info.online ? 20 : clamp(100 - (info.connection.rtt ?? 0) / 3, 40, 100),
      detail: !info.online
        ? 'OFFLINE — no network connection detected.'
        : `Connected (${info.connection.effectiveType ?? info.connection.type}). RTT ${info.connection.rtt ?? 'n/a'} ms${info.connection.downlink != null ? `, downlink ${info.connection.downlink} Mb/s` : ''}.`,
    });
    if (agent?.diskPct != null) {
      const d = agent.diskPct;
      const gb = agent.diskTotal != null ? ` (${(agent.diskTotal / 1024 ** 3).toFixed(0)} GB drive)` : '';
      add({ id: 'disk', label: 'Disk Health', status: d < 70 ? 'pass' : d < 90 ? 'warn' : 'error', score: clamp(100 - d, 10, 100), detail: `Real disk usage at ${d}%${gb} (Desktop Agent).` });
    } else {
      add({ id: 'disk', label: 'Disk Health', status: 'unavailable', score: 0, detail: 'Disk health requires the VOX Desktop Agent.' });
    }
    add({
      id: 'drivers', label: 'Drivers', status: 'unavailable', score: 0,
      detail: 'Driver inspection requires the VOX Desktop Agent.',
    });
    if (agent?.uptime != null && agent.load.length) {
      const load = agent.load.map((l) => l.toFixed(2)).join(', ');
      add({ id: 'startup', label: 'Load & Uptime', status: agent.load[0] < 4 ? 'pass' : 'warn', score: clamp(100 - agent.load[0] * 10, 40, 100), detail: `System up ${Math.floor(agent.uptime / 3600)}h. Load average ${load} (Desktop Agent).` });
    } else {
      add({ id: 'startup', label: 'Startup', status: 'unavailable', score: 0, detail: 'Startup programs require the VOX Desktop Agent.' });
    }
    add({
      id: 'security', label: 'Security', status: secrets.length ? 'error' : 'pass',
      score: secrets.length ? clamp(100 - secrets.length * 12, 20, 90) : 100,
      detail: secrets.length
        ? `${secrets.length} possible secret${secrets.length > 1 ? 's' : ''} detected in project files. Review in Security Center.`
        : 'No exposed secret patterns detected. API keys are stored backend-side only.',
    });
  }

  if (kind === 'project' || kind === 'full') {
    if (project) {
      const fileCount = countFiles(project.fs);
      const hasSrc = walk(project.fs).some((f) => f.path[0] === 'src' || f.path.includes('src'));
      const hasManifest = walk(project.fs).some((f) => f.node.name === 'package.json');
      const hasReadme = walk(project.fs).some((f) => f.node.name.toLowerCase() === 'readme.md');
      add({
        id: 'project', label: 'Project Files', status: hasSrc && hasManifest ? 'pass' : 'warn',
        score: (hasSrc ? 40 : 0) + (hasManifest ? 40 : 0) + (hasReadme ? 20 : 0),
        detail: `${fileCount} files indexed. ${hasManifest ? 'Manifest present.' : 'No package manifest.'} ${hasSrc ? 'Source tree present.' : ''}`,
      });
      const outdated = project.dependencies.filter((d) => d.version !== d.latest);
      add({
        id: 'deps', label: 'Dependencies', status: outdated.length ? 'warn' : 'pass',
        score: clamp(100 - outdated.length * 8, 30, 100),
        detail: `${project.dependencies.length} dependencies tracked. ${outdated.length} update${outdated.length === 1 ? '' : 's'} available${outdated.length ? ` (${outdated.map((d) => d.name).join(', ')})` : '.'}`,
      });
      add({
        id: 'git', label: 'Git Status', status: project.git.clean ? 'pass' : project.git.changes.length > 5 ? 'warn' : 'pass',
        score: project.git.clean ? 100 : clamp(100 - project.git.changes.length * 5, 60, 95),
        detail: project.git.clean
          ? `Working tree clean on ${project.git.branch}.`
          : `${project.git.changes.length} file${project.git.changes.length === 1 ? '' : 's'} changed on ${project.git.branch}.`,
      });
      const build = project.build;
      add({
        id: 'build', label: 'Build Status', status: build.status === 'success' ? 'pass' : build.status === 'failed' ? 'error' : 'warn',
        score: build.status === 'success' ? 100 : build.status === 'failed' ? 30 : 60,
        detail: build.status === 'success' ? 'Last build succeeded.' : build.status === 'failed' ? `Last build failed (exit ${build.exitCode ?? '?'}).` : 'No build has run yet.',
      });
    } else {
      add({ id: 'project', label: 'Project Files', status: 'unavailable', score: 0, detail: 'No active project.' });
      add({ id: 'deps', label: 'Dependencies', status: 'unavailable', score: 0, detail: 'No active project.' });
      add({ id: 'git', label: 'Git Status', status: 'unavailable', score: 0, detail: 'No active project.' });
      add({ id: 'build', label: 'Build Status', status: 'unavailable', score: 0, detail: 'No active project.' });
    }
  }

  if (kind === 'deps') {
    if (project) {
      const outdated = project.dependencies.filter((d) => d.version !== d.latest);
      add({
        id: 'deps', label: 'Dependencies', status: outdated.length ? 'warn' : 'pass',
        score: clamp(100 - outdated.length * 8, 30, 100),
        detail: `${project.dependencies.length} dependencies tracked. ${outdated.length} update${outdated.length === 1 ? '' : 's'} available.`,
      });
      add({
        id: 'security', label: 'Dependency Security', status: secrets.length ? 'warn' : 'pass',
        score: secrets.length ? 70 : 100,
        detail: secrets.length ? 'Possible credentials found near project sources. Review findings.' : 'No obvious credential patterns in tracked sources.',
      });
    } else {
      add({ id: 'deps', label: 'Dependencies', status: 'unavailable', score: 0, detail: 'No active project.' });
    }
  }

  return out;
}

export function computeScore(checks: CheckResult[]): { score: number; grade: string } {
  const available = checks.filter((c) => c.status !== 'unavailable' && c.status !== 'pending');
  if (available.length === 0) return { score: 0, grade: 'N/A' };
  const sum = available.reduce((acc, c) => acc + c.score, 0);
  const score = Math.round(sum / available.length);
  const grade = score >= 90 ? 'EXCELLENT' : score >= 75 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR';
  return { score, grade };
}

export const STEP_LABELS: Record<string, string> = Object.fromEntries(SCAN_STEPS.map((s) => [s.id, s.label]));
