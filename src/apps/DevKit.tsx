import { useState } from 'react';
import clsx from 'clsx';
import { Badge, Button, Icon, Panel, StatusDot } from '../components/ui';
import { useVox } from '../lib/store';

// ============================================================
// DEV TOOLKIT — the dev CLI stack, preloaded and one tap away.
// freebuff / codebuff / Gemini CLI install + run on the real
// machine through the Desktop Agent's terminal; Code Studio is
// the built-in editor. No CLI is bundled into the app — this
// section wires the real tools with the exact install commands.
// ============================================================

interface DevTool {
  id: string;
  name: string;
  bin: string | null;
  icon: string;
  tint: string;
  blurb: string;
  install?: string;
  runCmd?: string;
  openSection?: string;
}

const TOOLS: DevTool[] = [
  {
    id: 'freebuff',
    name: 'Freebuff',
    bin: 'freebuff',
    icon: 'Bot',
    tint: '#22d3ee',
    blurb: 'The free AI coding agent — the open CLI behind this desktop. Chat with it and it edits your code.',
    install: 'npm install -g freebuff',
    runCmd: 'freebuff',
  },
  {
    id: 'codebuff',
    name: 'Codebuff',
    bin: 'codebuff',
    icon: 'Terminal',
    tint: '#8b5cf6',
    blurb: 'AI coding agent for your terminal — describe a change, it writes the code and runs the tests.',
    install: 'npm install -g codebuff',
    runCmd: 'codebuff',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    bin: 'gemini',
    icon: 'Sparkles',
    tint: '#3b82f6',
    blurb: "Google's agentic coding CLI — build, debug and deploy with Gemini 3 right from the terminal.",
    install: 'npm install -g @google/gemini-cli',
    runCmd: 'gemini',
  },
  {
    id: 'code',
    name: 'Code Studio',
    bin: null,
    icon: 'Code2',
    tint: '#10b981',
    blurb: 'The built-in editor — open files, edit, diff and commit without leaving VOX-OS.',
    openSection: 'code',
  },
];

export function DevKit() {
  const s = useVox();
  const agentOnline = s.agentState.status === 'connected';
  const [detecting, setDetecting] = useState(false);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const [lastDetect, setLastDetect] = useState('');

  const openTerminal = async (cmd: string): Promise<boolean> => {
    if (s.agentState.status !== 'connected') {
      s.pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'AGENT OFFLINE', body: 'Start the Desktop Agent so real commands can run on this machine.' });
      return false;
    }
    s.newTerminal(s.settings.defaultShell);
    const sid = useVox.getState().terminalActive;
    const t = useVox.getState().terminalSessions.find((x) => x.id === sid);
    if (t && !t.agentSessionId) await useVox.getState().agentOpenSession(sid).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 300));
    useVox.getState().agentSessionInput(sid, cmd);
    return true;
  };

  const detectAll = async () => {
    if (s.agentState.status !== 'connected') {
      s.pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'AGENT OFFLINE', body: 'Detection runs real commands — connect the Desktop Agent first.' });
      return;
    }
    setDetecting(true);
    setLastDetect('Running `where.exe freebuff codebuff gemini` on the host…');
    s.newTerminal(s.settings.defaultShell);
    const sid = useVox.getState().terminalActive;
    const t = useVox.getState().terminalSessions.find((x) => x.id === sid);
    if (t && !t.agentSessionId) await useVox.getState().agentOpenSession(sid).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 300));
    useVox.getState().agentSessionInput(sid, 'where.exe freebuff codebuff gemini 2>$null; echo __VOX_DETECT_DONE__');
    // poll the session history for the marker (first PowerShell run can be slow)
    const started = Date.now();
    const found: Record<string, boolean> = {};
    const iv = setInterval(() => {
      const sess = useVox.getState().terminalSessions.find((x) => x.id === sid);
      const out = sess ? sess.history.filter((h) => h.kind === 'out').map((h) => h.output ?? '').join('\n') : '';
      for (const tool of TOOLS) {
        const bin = tool.bin;
        if (bin && out.split('\n').some((l) => /\.(cmd|exe|bat|ps1)$/i.test(l.trim()) && l.toLowerCase().includes(bin.toLowerCase()))) {
          found[bin] = true;
        }
      }
      if (out.includes('__VOX_DETECT_DONE__') || Date.now() - started > 20_000) {
        clearInterval(iv);
        setInstalled(found);
        setDetecting(false);
        const list = TOOLS.filter((t) => t.bin && found[t.bin]).map((t) => t.name).join(', ');
        setLastDetect(list ? `Found: ${list}` : 'None of the dev CLIs are installed yet — hit INSTALL on any card.');
        if (!list) s.pushNotification({ category: 'SYSTEM', severity: 'info', title: 'DEV KIT', body: 'No dev CLIs detected — the INSTALL button runs the exact command.' });
      }
    }, 600);
  };

  const installAll = () => void openTerminal('npm install -g freebuff codebuff @google/gemini-cli');

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="hud-label mb-1.5">PRELOADED FOR DEVS</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">DEV TOOLKIT</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusDot tone={agentOnline ? 'online' : 'dim'} pulse={agentOnline} />
          <Badge tone={agentOnline ? 'green' : 'dim'}>{agentOnline ? 'AGENT LINKED · REAL TERMINAL' : 'AGENT OFFLINE'}</Badge>
          <Button size="xs" variant="cyan" icon="ScanSearch" onClick={() => void detectAll()} disabled={detecting || !agentOnline}>
            {detecting ? 'DETECTING…' : 'DETECT INSTALLED'}
          </Button>
          <Button size="xs" variant="violet" icon="PackagePlus" onClick={() => void installAll()} disabled={!agentOnline}>INSTALL ALL</Button>
        </div>
      </div>

      {lastDetect && <p className="text-[11px] font-mono text-vox-muted">▸ {lastDetect}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {TOOLS.map((tool) => {
          const isInstalled = tool.bin ? !!installed[tool.bin] : undefined;
          return (
            <div key={tool.id} className="glass hud-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${tool.tint}33, ${tool.tint}11)`, border: `1px solid ${tool.tint}55` }}>
                  <Icon name={tool.icon} size={18} className="" />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-vox-text tracking-[0.04em]">{tool.name.toUpperCase()}</p>
                  <p className="text-[10.5px] text-vox-muted leading-relaxed">{tool.blurb}</p>
                </div>
                {tool.bin ? (
                  isInstalled === undefined ? <Badge tone="dim">UNKNOWN</Badge>
                  : isInstalled ? <Badge tone="green">INSTALLED</Badge>
                  : <Badge tone="amber">NOT FOUND</Badge>
                ) : <Badge tone="cyan">BUILT-IN</Badge>}
              </div>

              {tool.install && (
                <div className="flex items-center gap-2 bg-ink-900/70 border border-vox-line rounded-lg px-3 py-2">
                  <span className="font-mono text-[10.5px] text-cyan-200 truncate flex-1">{tool.install}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(tool.install!).catch(() => undefined); s.pushNotification({ category: 'SYSTEM', severity: 'success', title: 'COPIED', body: 'Install command copied.' }); }} className="text-vox-dim hover:text-cyan-300 transition-colors" title="Copy"><Icon name="Copy" size={13} /></button>
                </div>
              )}

              <div className="flex gap-1.5 mt-auto flex-wrap">
                {tool.openSection ? (
                  <Button variant="cyan" icon="FolderOpen" onClick={() => { s.setSection(tool.openSection as never); }}>OPEN EDITOR</Button>
                ) : (
                  <>
                    <Button variant="cyan" icon="Play" onClick={() => void openTerminal(tool.runCmd!)} disabled={!agentOnline}>RUN</Button>
                    <Button variant="ghost" icon="PackagePlus" onClick={() => void openTerminal(tool.install!)} disabled={!agentOnline}>INSTALL</Button>
                    <Button variant="ghost" icon="Terminal" onClick={() => void openTerminal(`${tool.bin} --version`)} disabled={!agentOnline}>VERSION</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Panel title="How it works" icon="Info" bodyClassName="!p-3.5">
        <ul className="space-y-1.5 text-[11.5px] text-vox-muted leading-relaxed">
          <li>• <span className="text-vox-text">RUN / INSTALL / VERSION</span> execute on the real machine through the Desktop Agent terminal — nothing is simulated.</li>
          <li>• Detection runs <span className="font-mono text-cyan-200">where.exe</span> on the host and marks each CLI as installed or missing.</li>
          <li>• No CLI is bundled in the app — the exact npm command is shown on every card, so installs stay transparent.</li>
          <li>• The built-in <span className="text-vox-text">Code Studio</span> editor needs no install — open it straight from here.</li>
        </ul>
      </Panel>
    </div>
  );
}
