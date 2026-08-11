import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { APPS, NAV, SYS_NAV } from '../lib/constants';
import { walk, isSecretPath, fileSize } from '../lib/vfs';
import { Icon, Kbd } from './ui';
import { fmtBytes } from '../lib/fmt';
import { sfx } from '../lib/sounds';

interface Result {
  id: string;
  label: string;
  hint: string;
  icon: string;
  group: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useVox((s) => s.paletteOpen);
  const mode = useVox((s) => s.paletteMode);
  const setPalette = useVox((s) => s.setPalette);
  const openApp = useVox((s) => s.openApp);
  const setSection = useVox((s) => s.setSection);
  const projects = useVox((s) => s.projects);
  const activeProjectId = useVox((s) => s.activeProjectId);
  const openProject = useVox((s) => s.openProject);
  const saveWorkspace = useVox((s) => s.saveWorkspace);
  const restoreWorkspace = useVox((s) => s.restoreWorkspace);
  const workspaces = useVox((s) => s.workspaces);
  const openFile = useVox((s) => s.openFile);
  const recordCommand = useVox((s) => s.recordCommand);
  const runHealthScan = useVox((s) => s.runHealthScan);
  const buildProject = useVox((s) => s.buildProject);
  const testProject = useVox((s) => s.testProject);
  const runDiagnostics = useVox((s) => s.runDiagnostics);
  const createBackup = useVox((s) => s.createBackup);
  const exportAIConfig = useVox((s) => s.exportAIConfig);
  const syncGithub = useVox((s) => s.syncGithub);
  const sendMessage = useVox((s) => s.sendMessage);
  const setSettings = useVox((s) => s.setSettings);
  const githubRepos = useVox((s) => s.githubRepos);
  const openAppVox = useVox((s) => s.openApp);
  const section = useVox((s) => s.section);
  const windows = useVox((s) => s.windows);

  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Result[] = [];
    const seen = new Set<string>();

    const add = (r: Result) => {
      if (seen.has(r.id)) return;
      if (q && !r.label.toLowerCase().includes(q) && !r.hint.toLowerCase().includes(q)) return;
      seen.add(r.id);
      out.push(r);
    };

    // VOX natural-language actions
    if (q) {
      const nl: [RegExp, string, () => void][] = [
        [/scan my project|health scan/, 'Run a health scan', () => void runHealthScan('project')],
        [/open github/, 'Open GitHub', () => setSection('github')],
        [/build errors|show errors/, 'Open the Error Center', () => setSection('errors')],
        [/switch to (groq|gemini)/, 'Switch the AI provider', () => setSettings({ primaryProvider: q.includes('groq') ? 'groq' : 'gemini' })],
        [/run (the )?tests/, 'Run the test suite', () => void testProject()],
        [/run (the )?build|build this/, 'Run a build', () => void buildProject()],
        [/run diagnostics/, 'Run auto diagnostics', () => void runDiagnostics()],
        [/create backup|back up/, 'Create a backup', () => createBackup()],
        [/export config/, 'Export AI configuration', () => exportAIConfig()],
        [/sync github/, 'Sync GitHub repositories', () => void syncGithub()],
        [/scan.*secret|secret.*scan|security/, 'Open the Security Center', () => setSection('security')],
      ];
      for (const [re, label, run] of nl) {
        if (re.test(q)) add({ id: `nl_${label}`, label, hint: 'VOX ACTION', icon: 'Sparkles', group: 'VOX', run });
      }
    }

    // commands
    const cmds: [string, string, () => void][] = [
      ['Open Project', 'Open the Projects page', () => setSection('projects')],
      ['Open Terminal', 'Launch a terminal window', () => openApp('terminal')],
      ['Open Code Studio', 'Open the code editor', () => openApp('code')],
      ['Run Health Scan', 'Start a project scan', () => void runHealthScan('project')],
      ['Ask VOX', 'Open the VOX AI assistant', () => openAppVox('voxai')],
      ['Run Build', 'Build the active project', () => void buildProject()],
      ['Run Tests', 'Test the active project', () => void testProject()],
      ['Open Settings', 'Open system settings', () => setSection('settings')],
      ['View Errors', 'Open the Error Center', () => setSection('errors')],
      ['Scan for Secrets', 'Open the Security Center', () => setSection('security')],
      ['View Event Log', 'Open the event log', () => setSection('eventlog')],
      ['Create Backup', 'Back up configuration', () => createBackup()],
      ['Run Diagnostics', 'Full auto diagnostics', () => void runDiagnostics()],
      ['Save Workspace', 'Snapshot files, terminals, AI context', () => saveWorkspace('')],
      ['Manage Workspaces', 'Open the workspace manager', () => setSection('projects')],
      ['Switch AI Provider', 'Open the AI Engine', () => setSection('aiengine')],
      ['Analyze Project', 'Ask VOX to analyze', () => void sendMessage('Review my project and give me an intelligence report.')],
      ['Explain this file', 'Ask VOX about the active file', () => void sendMessage('Explain the active file to me.')],
    ];
    if (mode === 'command' || mode === 'vox') {
      cmds.forEach(([label, hint, run]) => add({ id: `cmd_${label}`, label, hint, icon: 'Command', group: 'COMMANDS', run }));
    }

    // apps
    APPS.forEach((a) => add({ id: `app_${a.id}`, label: a.title, hint: 'APP', icon: a.icon, group: 'APPS', run: () => openApp(a.id) }));

    // nav sections
    [...NAV, ...SYS_NAV].forEach((n) => add({ id: `nav_${n.id}`, label: n.label, hint: 'VIEW', icon: n.icon, group: 'VIEWS', run: () => setSection(n.id) }));

    // files
    if (mode === 'file' || mode === 'command') {
      const active = projects.find((p) => p.id === activeProjectId);
      if (active) {
        walk(active.fs)
          .filter((f) => f.node.kind === 'file' && !isSecretPath(f.path))
          .forEach((f) => {
            const path = f.path.join('/');
            add({ id: `file_${path}`, label: path, hint: 'FILE', icon: 'FileCode2', group: 'FILES', run: () => { openFile(path); openApp('code'); } });
          });
      }
    }

    // projects
    projects.forEach((p) => add({ id: `proj_${p.id}`, label: p.name, hint: `${p.language} · ${p.framework}`, icon: 'FolderKanban', group: 'PROJECTS', run: () => openProject(p.id) }));

    // workspaces
    workspaces.forEach((w) => {
      const proj = projects.find((p) => p.id === w.projectId);
      add({ id: `ws_${w.id}`, label: w.name, hint: `RESTORE · ${proj?.name ?? 'unknown'} · ${w.tabs.length} files · ${w.terminals.length} terms`, icon: 'LayoutGrid', group: 'WORKSPACES', run: () => restoreWorkspace(w.id) });
    });

    // github
    githubRepos.forEach((r) => add({ id: `gh_${r.full_name}`, label: r.full_name, hint: `★ ${r.stargazers_count} · ${r.language ?? '—'}`, icon: 'GitBranch', group: 'GITHUB', run: () => setSection('github') }));

    // settings
    const settings: [string, () => void][] = [
      ['Appearance settings', () => setSection('settings')],
      ['AI Engine settings', () => setSection('aiengine')],
      ['API providers', () => setSection('apimanager')],
      ['Voice settings', () => setSection('voice')],
      ['Desktop Agent', () => setSection('agent')],
      ['Security Center', () => setSection('security')],
    ];
    settings.forEach(([label, run]) => add({ id: `set_${label}`, label, hint: 'SETTINGS', icon: 'Settings', group: 'SETTINGS', run }));

    return out.slice(0, 60);
  }, [query, mode, projects, activeProjectId, githubRepos, section, windows, openApp, setSection, openProject, openFile, runHealthScan, buildProject, testProject, runDiagnostics, createBackup, exportAIConfig, syncGithub, sendMessage, setSettings, openAppVox, workspaces, saveWorkspace, restoreWorkspace]);

  const groups = useMemo(() => {
    const g: string[] = [];
    results.forEach((r) => { if (!g.includes(r.group)) g.push(r.group); });
    return g;
  }, [results]);

  if (!open) return null;
  const cur = results[Math.min(idx, Math.max(0, results.length - 1))];

  const runResult = (r: Result) => {
    recordCommand(r.label);
    sfx.command();
    setPalette(false);
    r.run();
  };

  return (
    <div className="vox-overlay flex items-start justify-center pt-[14vh] px-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPalette(false); }}>
      <div role="dialog" aria-label="Command palette" className="vox-pop w-full max-w-[620px] glass hud-border overflow-hidden flex flex-col" style={{ maxHeight: '62vh' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-vox-line">
          <span className="text-vox-cyan"><Icon name="Command" size={16} /></span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter' && cur) runResult(cur);
              if (e.key === 'Escape') setPalette(false);
            }}
            placeholder="Run command or search…"
            className="flex-1 bg-transparent outline-none font-mono text-[13px] text-vox-text placeholder:text-vox-dim"
            aria-label="Search commands"
          />
          <Kbd>ESC</Kbd>
        </div>

        <div ref={listRef} className="overflow-y-auto py-2 px-2">
          {results.length === 0 && (
            <div className="text-center py-8">
              <p className="font-mono text-[12px] text-vox-dim">No results for “{query}”</p>
              <p className="text-[11px] text-vox-dim mt-1">Try a natural command like “scan my project” or “run tests”.</p>
            </div>
          )}
          {groups.map((g) => (
            <div key={g}>
              <p className="hud-label px-2.5 pt-2 pb-1">{g}</p>
              {results.filter((r) => r.group === g).map((r, i) => {
                const globalIdx = results.indexOf(r);
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setIdx(globalIdx)}
                    onClick={() => runResult(r)}
                    data-active={globalIdx === idx}
                    className={clsx(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left',
                      globalIdx === idx ? 'bg-cyan-400/10 text-cyan-200' : 'text-vox-muted hover:text-vox-text',
                    )}
                  >
                    <Icon name={r.icon} size={14} className={globalIdx === idx ? 'text-vox-cyan' : 'text-vox-dim'} />
                    <span className="text-[12.5px] truncate">{r.label}</span>
                    <span className="ml-auto text-[10px] font-mono text-vox-dim truncate max-w-[200px]">{r.hint}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <footer className="flex items-center gap-3 px-4 py-2 border-t border-vox-line text-[10px] text-vox-dim">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>ENTER</Kbd> run</span>
          <span className="flex items-center gap-1"><Kbd>ESC</Kbd> close</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>CTRL</Kbd><Kbd>K</Kbd> commands</span>
          <span className="flex items-center gap-1"><Kbd>CTRL</Kbd><Kbd>P</Kbd> files</span>
        </footer>
      </div>
    </div>
  );
}
