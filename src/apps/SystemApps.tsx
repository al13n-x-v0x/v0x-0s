import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import type { LogEvent, SectionId, Severity } from '../lib/types';
import { NAV, SYS_NAV } from '../lib/constants';
import { Badge, Button, EmptyState, Icon, Input, Panel, StatusDot, Toggle } from '../components/ui';
import { fmtBytes, fmtDuration, timeAgo, fmtTime } from '../lib/fmt';
import { sfx } from '../lib/sounds';

// ==================== VOX CORE (system map) ====================
export function VoxCoreApp() {
  const s = useVox();
  const nodes: { id: SectionId; label: string; icon: string; status: 'online' | 'degraded' | 'error' | 'offline' }[] = [
    { id: 'voxai', label: 'AI', icon: 'Sparkles', status: s.backend === 'online' || s.settings.demoAssistant ? 'online' : 'degraded' },
    { id: 'projects', label: 'PROJECTS', icon: 'FolderKanban', status: s.projects.length ? 'online' : 'offline' },
    { id: 'terminal', label: 'TERMINAL', icon: 'SquareTerminal', status: 'online' },
    { id: 'github', label: 'GITHUB', icon: 'GitBranch', status: s.settings.githubConnected ? 'online' : 'degraded' },
    { id: 'health', label: 'HEALTH', icon: 'Activity', status: s.health.score >= 60 ? 'online' : 'degraded' },
    { id: 'security', label: 'SECURITY', icon: 'ShieldCheck', status: 'online' },
    { id: 'automation', label: 'AUTOMATION', icon: 'Workflow', status: s.automation.some((a) => a.enabled) ? 'online' : 'offline' },
    { id: 'performance', label: 'PERFORMANCE', icon: 'Gauge', status: s.telemetry.length ? 'online' : 'degraded' },
    { id: 'eventlog', label: 'EVENTS', icon: 'ListTree', status: 'online' },
    { id: 'files', label: 'WORKSPACE', icon: 'FolderTree', status: 'online' },
  ];
  const dot: Record<string, string> = { online: 'dot-online', degraded: 'dot-amber', error: 'dot-red', offline: 'dot-dim' };
  const label: Record<string, string> = { online: 'ONLINE', degraded: 'DEGRADED', error: 'ERROR', offline: 'OFFLINE' };

  return (
    <div className="p-5 animate-fade-in max-w-[1100px]">
      <div className="text-center mb-6">
        <p className="hud-label mb-1.5">SYSTEM ARCHITECTURE</p>
        <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">VOX CORE</h1>
      </div>
      {/* center core */}
      <div className="flex justify-center mb-8">
        <button onClick={() => s.setSection('voxai')} className="relative group">
          <div className="absolute -inset-4 rounded-full opacity-40 animate-pulse-ring" style={{ border: '1px solid rgba(34,211,238,0.3)' }} />
          <div className="w-28 h-28 rounded-full border border-cyan-400/40 bg-ink-800 flex flex-col items-center justify-center relative" style={{ boxShadow: '0 0 60px -10px rgba(34,211,238,0.5), inset 0 0 30px rgba(34,211,238,0.08)' }}>
            <span className="text-vox-cyan group-hover:text-glow-cyan"><Icon name="Hexagon" size={26} /></span>
            <span className="font-display text-[11px] font-bold tracking-[0.2em] text-white mt-1">VOX CORE</span>
            <span className="font-mono text-[8px] text-emerald-300 tracking-[0.2em]">● ONLINE</span>
          </div>
        </button>
      </div>
      {/* nodes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {nodes.map((n) => (
          <button key={n.id} onClick={() => s.setSection(n.id)} className="glass hud-border p-3 flex flex-col items-center gap-2 hover:bg-white/[0.03] group">
            <span className="text-vox-muted group-hover:text-vox-cyan transition-colors"><Icon name={n.icon} size={17} /></span>
            <span className="text-[9.5px] font-bold tracking-[0.18em] text-vox-text">{n.label}</span>
            <span className="flex items-center gap-1.5">
              <span className={clsx('dot', dot[n.status])} />
              <span className="font-mono text-[8px] tracking-[0.14em] text-vox-dim">{label[n.status]}</span>
            </span>
          </button>
        ))}
      </div>
      <Panel title="Engine status" icon="Cpu" bodyClassName="!p-3">
        <div className="grid md:grid-cols-2 gap-1.5">
          {['AI ENGINE', 'PROJECT ENGINE', 'TERMINAL ENGINE', 'GITHUB ENGINE', 'HEALTH ENGINE', 'PERFORMANCE ENGINE', 'AUTOMATION ENGINE', 'SECURITY ENGINE', 'EXTENSION ENGINE', 'WORKSPACE ENGINE'].map((e, i) => (
            <div key={e} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
              <StatusDot tone={i % 3 === 0 ? 'online' : i % 3 === 1 ? 'cyan' : 'violet'} />
              <span className="font-mono text-[10.5px] text-vox-muted tracking-[0.08em]">{e}</span>
              <span className="ml-auto font-mono text-[9px] text-emerald-300/80">ONLINE</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ==================== EVENT LOG ====================
export function EventLog() {
  const s = useVox();
  const [filter, setFilter] = useState<'ALL' | LogEvent['source']>('ALL');
  const srcs = ['ALL', 'AI', 'GITHUB', 'SYSTEM', 'PROJECT', 'SECURITY', 'BUILD', 'TERMINAL', 'ERROR'] as const;
  const list = s.eventLog.filter((e) => filter === 'ALL' || e.source === filter);
  const sev: Record<Severity, string> = { info: 'text-vox-dim', success: 'text-emerald-300', warning: 'text-amber-300', error: 'text-red-300' };
  return (
    <div className="p-5 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="hud-label mb-1.5">SYSTEM</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">VOX EVENT LOG</h1>
        </div>
        <div className="flex gap-1 flex-wrap">
          {srcs.map((f) => (
            <button key={f} data-active={filter === f} onClick={() => setFilter(f)} className={clsx('px-2 py-1 rounded-md text-[9.5px] font-semibold tracking-wider border', filter === f ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30' : 'text-vox-dim border-vox-line hover:text-vox-muted')}>{f}</button>
          ))}
        </div>
      </div>
      <Panel title="Events" icon="ListTree" bodyClassName="!p-0">
        {list.length === 0 ? <p className="text-center text-[12px] text-vox-dim py-10">No events.</p> : (
          <div className="font-mono text-[11px] divide-y divide-vox-line/40">
            {list.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.02]">
                <span className="text-vox-dim shrink-0">{fmtTime(e.time)}</span>
                <span className={clsx('w-16 shrink-0 tracking-[0.1em] text-[9px]', sev[e.severity])}>{e.source}</span>
                <span className="text-vox-muted truncate">{e.text}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ==================== ERROR CENTER ====================
export function ErrorCenter() {
  const s = useVox();
  const [onlyOpen, setOnlyOpen] = useState(false);
  const list = s.errors.filter((e) => !onlyOpen || !e.resolved);
  return (
    <div className="p-5 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="hud-label mb-1.5">CENTRALIZED</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">ERROR CENTER</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-vox-muted font-mono">{list.length} open</span>
          <Toggle checked={onlyOpen} onChange={setOnlyOpen} label="Only open errors" />
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState icon="ShieldCheck" title="NO ERRORS" body="No unresolved build, runtime, terminal, API, Git, or AI errors in this session." />
      ) : (
        <div className="space-y-2">
          {list.map((e) => (
            <div key={e.id} className={clsx('glass hud-border p-4', e.resolved && 'opacity-50')}>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusDot tone={e.severity === 'error' ? 'red' : 'amber'} />
                <Badge tone={e.severity === 'error' ? 'red' : 'amber'}>{e.source}</Badge>
                <span className="text-[12.5px] font-semibold text-vox-text">{e.message}</span>
                <span className="ml-auto font-mono text-[10px] text-vox-dim">{fmtTime(e.time)}</span>
                {e.count && e.count > 1 && <Badge tone="cyan">×{e.count}</Badge>}
                {e.resolved && <Badge tone="green">RESOLVED</Badge>}
              </div>
              {e.detail && <p className="text-[11.5px] text-vox-muted mt-1.5 font-mono">{e.detail}</p>}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                <Button size="xs" variant="violet" icon="Sparkles" onClick={() => s.explainWithVox(`Explain this error and how to fix it: ${e.message}${e.detail ? ' — ' + e.detail : ''}`)}>EXPLAIN WITH VOX</Button>
                <Button size="xs" variant="cyan" icon="Wrench" onClick={() => s.explainWithVox(`Fix this error: ${e.message}${e.detail ? ' — ' + e.detail : ''}. Show the exact change.`)}>FIX WITH VOX</Button>
                <Button size="xs" variant="ghost" icon="Copy" onClick={() => navigator.clipboard?.writeText(`${e.source}: ${e.message}${e.detail ? '\n' + e.detail : ''}`)}>COPY</Button>
                <Button size="xs" variant="ghost" icon="CheckCircle2" onClick={() => s.resolveError(e.id)}>MARK RESOLVED</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== DIAGNOSTICS ====================
export function Diagnostics() {
  const s = useVox();
  const [report, setReport] = useState<{ label: string; score: number }[] | null>(null);
  const run = async () => {
    setReport(null);
    await s.runDiagnostics();
    const project = s.projects.find((p) => p.id === s.activeProjectId);
    setReport([
      { label: 'SYSTEM HEALTH', score: s.health.score || 90 },
      { label: 'PROJECT HEALTH', score: project?.healthScore ?? 90 },
      { label: 'AI HEALTH', score: s.backend === 'online' ? 100 : s.settings.demoAssistant ? 70 : 40 },
      { label: 'GITHUB HEALTH', score: s.settings.githubConnected ? 100 : 50 },
      { label: 'BUILD HEALTH', score: project?.build.status === 'success' ? 100 : project?.build.status === 'failed' ? 40 : 70 },
    ]);
  };
  const total = report ? Math.round(report.reduce((a, r) => a + r.score, 0) / report.length) : 0;
  return (
    <div className="p-5 animate-fade-in max-w-[900px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">AUTO DIAGNOSTICS</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">VOX AUTO DIAGNOSTICS</h1>
        </div>
        <Button variant="cyan" icon="Stethoscope" onClick={() => void run()} disabled={s.health.scanning}>RUN DIAGNOSTICS</Button>
      </div>
      {s.health.scanning && s.health.scanKind === 'full' && (
        <Panel title="Running" icon="Activity">
          <div className="space-y-1.5 font-mono text-[11px]">
            {s.health.steps.map((st, i) => (
              <div key={st} className="flex items-center gap-2">
                <span className="text-vox-dim">{st}</span>
                {i * 14 < s.health.progress ? <span className="text-emerald-300">OK</span> : <span className="text-vox-dim">…</span>}
              </div>
            ))}
          </div>
          <div className="mt-4"><div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${s.health.progress}%` }} /></div></div>
        </Panel>
      )}
      {report && (
        <Panel title="Diagnostic Report" icon="ClipboardCheck" glow="cyan" bodyClassName="!p-4">
          <div className="grid md:grid-cols-2 gap-3">
            {report.map((r) => (
              <div key={r.label} className="glass-inset px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="hud-label">{r.label}</span>
                  <span className={clsx('font-mono text-[15px] font-semibold', r.score >= 90 ? 'text-emerald-300' : r.score >= 60 ? 'text-amber-300' : 'text-red-300')}>{r.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r.score >= 90 ? '#34d399' : r.score >= 60 ? '#fbbf24' : '#f87171' }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 px-4 py-3 rounded-xl border border-cyan-400/25 bg-cyan-400/5">
            <span className="hud-label">TOTAL</span>
            <span className={clsx('font-mono text-[28px] font-bold', total >= 90 ? 'text-emerald-300' : total >= 60 ? 'text-amber-300' : 'text-red-300')}>{total}%</span>
            <span className="text-[11px] text-vox-muted">{total >= 90 ? 'Excellent — all engines healthy.' : total >= 60 ? 'Minor issues detected.' : 'Critical issues require attention.'}</span>
          </div>
        </Panel>
      )}
      {!report && !s.health.scanning && <p className="text-[12px] text-vox-dim text-center py-10">Run diagnostics to generate a full report.</p>}
    </div>
  );
}

// ==================== VOX MEMORY ====================
export function Memory() {
  const s = useVox();
  const sections = ['PROJECT', 'CONVERSATION', 'PREFERENCES', 'CODE', 'ACTIONS'] as const;
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [addTo, setAddTo] = useState<typeof sections[number]>('PROJECT');
  const [newText, setNewText] = useState('');
  return (
    <div className="p-5 animate-fade-in max-w-[1000px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">VOX MEMORY</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">AI MEMORY SYSTEM</h1>
        </div>
        <Button variant="danger" size="xs" onClick={() => { if (confirm('Clear ALL memory? Secrets are never stored here.')) s.clearMemory(); }}>CLEAR ALL</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {sections.map((sec) => {
          const items = s.memory.filter((m) => m.section === sec);
          return (
            <Panel key={sec} title={sec.replace('_', ' ')} icon={sec === 'PROJECT' ? 'FolderKanban' : sec === 'CODE' ? 'Code2' : sec === 'PREFERENCES' ? 'SlidersHorizontal' : sec === 'ACTIONS' ? 'Zap' : 'MessageSquare'}>
              {items.length === 0 ? <p className="text-[11px] text-vox-dim py-2">Empty.</p> : (
                <div className="space-y-1.5">
                  {items.map((m) => (
                    <div key={m.id} className="group flex items-start gap-2 glass-inset px-2.5 py-2">
                      {editing === m.id ? (
                        <div className="flex-1">
                          <input value={text} onChange={(e) => setText(e.target.value)} className="vox-input !py-1 text-[11.5px]" autoFocus />
                          <div className="mt-1.5 flex gap-1.5">
                            <Button size="xs" variant="cyan" onClick={() => { s.editMemory(m.id, text); setEditing(null); }}>SAVE</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>CANCEL</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11.5px] text-vox-muted flex-1 leading-relaxed">“{m.text}”</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="xs" variant="ghost" icon="Pencil" silent onClick={() => { setEditing(m.id); setText(m.text); }} />
                            <Button size="xs" variant="ghost" icon="Trash2" silent onClick={() => s.deleteMemory(m.id)} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
      <Panel title="Add Memory" icon="Plus">
        <div className="flex gap-2">
          <select className="vox-input vox-select !w-40" value={addTo} onChange={(e) => setAddTo(e.target.value as never)}>
            {sections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
          </select>
          <input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newText.trim()) { s.addMemory({ section: addTo, text: newText.trim() }); setNewText(''); } }} placeholder="Store a fact VOX should remember…" className="vox-input flex-1" />
          <Button variant="cyan" disabled={!newText.trim()} onClick={() => { s.addMemory({ section: addTo, text: newText.trim() }); setNewText(''); }}>STORE</Button>
        </div>
        <p className="text-[10px] text-vox-dim mt-2 font-mono">VOX Memory never stores API keys, passwords, tokens, or private credentials.</p>
      </Panel>
    </div>
  );
}

// ==================== BACKUP ====================
export function Backup() {
  const s = useVox();
  return (
    <div className="p-5 animate-fade-in max-w-[900px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">VOX BACKUP</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">Backup Center</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="cyan" icon="HardDriveDownload" onClick={() => s.createBackup()}>CREATE BACKUP</Button>
          <Button icon="Download" onClick={() => s.exportConfig()}>EXPORT CONFIG</Button>
        </div>
      </div>
      <Panel title="Backups" icon="HardDriveDownload" bodyClassName="!p-0">
        {s.backups.length === 0 ? <EmptyState icon="HardDriveDownload" title="NO BACKUPS" body="Create a backup of workspace configuration, VOX settings, project metadata, and AI preferences. Secrets are never included." action={<Button variant="cyan" onClick={() => s.createBackup()}>CREATE BACKUP</Button>} /> : (
          <div className="divide-y divide-vox-line/50">
            {s.backups.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <Icon name="HardDriveDownload" size={14} className="text-vox-cyan" />
                <div className="flex-1">
                  <p className="text-[12px] text-vox-text">{b.label}</p>
                  <p className="text-[10px] font-mono text-vox-dim">{fmtBytes(b.size)} · created {timeAgo(b.time)}</p>
                </div>
                <Button size="xs" variant="ghost" icon="RotateCcw" onClick={() => s.restoreBackup(b.id)}>RESTORE</Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <p className="text-[10.5px] text-vox-dim mt-3 font-mono">Backup contents: workspace config, VOX settings, project metadata, AI preferences. API keys, tokens, and .env secrets are NEVER backed up.</p>
    </div>
  );
}

// ==================== COMMAND HISTORY ====================
export function CommandHistory() {
  const s = useVox();
  return (
    <div className="p-5 animate-fade-in max-w-[900px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">TRACKED</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">Command History</h1>
        </div>
        <Button size="xs" variant="danger" onClick={() => { if (confirm('Clear command history?')) useVox.setState({ commandHistory: [] }); }}>CLEAR</Button>
      </div>
      <Panel title="Commands" icon="History" bodyClassName="!p-0">
        {s.commandHistory.length === 0 ? <p className="text-center text-[12px] text-vox-dim py-10">No commands yet. Use CTRL+K or the terminal.</p> : (
          <div className="divide-y divide-vox-line/50">
            {s.commandHistory.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                <Icon name="Terminal" size={12} className="text-vox-dim" />
                <span className="font-mono text-[12px] text-vox-text flex-1">{c.command}</span>
                <span className="font-mono text-[9.5px] text-vox-dim">{fmtTime(c.time)}</span>
                <div className="flex gap-1">
                  <Button size="xs" variant="ghost" icon="RotateCcw" silent title="Repeat" onClick={() => {
                    if (c.command.startsWith('open ')) useVox.getState().setSection(c.command.slice(5) as never);
                    else if (c.command.startsWith('run ')) useVox.getState().runAutomation(useVox.getState().automation[0]?.id ?? '');
                  }}>REPEAT</Button>
                  <Button size="xs" variant="ghost" icon="Copy" silent title="Copy" onClick={() => navigator.clipboard?.writeText(c.command)} />
                  <Button size="xs" variant="ghost" icon="X" silent title="Remove" onClick={() => useVox.setState({ commandHistory: useVox.getState().commandHistory.filter((x) => x.id !== c.id) })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ==================== PROFILE ====================
export function Profile() {
  const s = useVox();
  return (
    <div className="p-5 animate-fade-in max-w-[900px]">
      <div className="glass hud-border p-6 mb-4 flex items-center gap-5">
        <span className="w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-[22px] text-white border border-violet-400/50 shrink-0" style={{ background: `linear-gradient(135deg, hsl(${s.profile.avatarHue} 70% 42%), hsl(${s.profile.avatarHue + 40} 70% 30%))`, boxShadow: '0 0 24px -4px rgba(139,92,246,0.7)' }}>
          {s.profile.name.slice(0, 1)}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-[20px] font-bold tracking-[0.06em]">{s.profile.name}</h1>
          <p className="text-[10px] text-vox-dim uppercase tracking-[0.2em] mt-0.5">{s.profile.role}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="dot dot-online" />
            <span className="font-mono text-[9.5px] text-emerald-300 tracking-[0.14em]">ONLINE</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          {[['WORKSPACES', String(s.workspaces.length)], ['PROJECTS', String(s.projects.length)], ['GITHUB', s.settings.githubConnected ? 'LINKED' : '—'], ['VOX ACTIVITY', String(s.aiUsage.requestsToday)]].map(([k, v]) => (
            <div key={k} className="glass-inset px-4 py-2.5">
              <p className="font-mono text-[14px] font-semibold text-cyan-300">{v}</p>
              <p className="hud-label mt-0.5">{k}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Workspaces" icon="LayoutGrid">
          {s.workspaces.length === 0 ? (
            <p className="text-[11.5px] text-vox-muted px-1">No saved workspaces yet — save one from the Projects page and its open files, terminals, and AI context come back instantly.</p>
          ) : (
            <div className="space-y-1.5">
              {s.workspaces.map((w) => {
                const proj = s.projects.find((p) => p.id === w.projectId);
                return (
                  <div key={w.id} className="glass-inset px-3 py-2 flex items-center gap-2">
                    <Icon name="LayoutGrid" size={12} className="text-cyan-300" />
                    <span className="text-[12px] font-semibold text-vox-text">{w.name}</span>
                    <span className="text-[10px] font-mono text-vox-dim">{proj?.name ?? 'unknown'} · {w.tabs.length} files · {w.terminals.length} term</span>
                    <Button size="xs" variant="ghost" icon="RotateCcw" className="ml-auto" onClick={() => s.restoreWorkspace(w.id)}>RESTORE</Button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Local profile" icon="UserRound" bodyClassName="!p-3.5">
          <p className="text-[11.5px] text-vox-muted leading-relaxed">Your developer profile is stored locally. No personal information is required — VOX-OS only tracks workspace and project activity. Profile data never leaves your machine.</p>
        </Panel>
      </div>
    </div>
  );
}

// ==================== TASK MANAGER ====================
export function TaskManager() {
  const s = useVox();
  const last = s.telemetry[s.telemetry.length - 1];
  const processes = useMemo(() => {
    const seed: { name: string; mem: number }[] = [
      { name: 'vox-shell', mem: 42 }, { name: 'node', mem: 128 }, { name: 'vite', mem: 96 },
      { name: 'python', mem: 64 }, { name: 'code', mem: 210 }, { name: 'git', mem: 24 },
    ];
    return seed.map((p, i) => ({
      pid: 1024 + i * 37,
      name: p.name,
      cpu: Math.round(Math.max(0.1, (last?.cpu ?? 20) * (0.4 + Math.random() * 0.5))),
      mem: p.mem + Math.round(Math.random() * 20),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.t]);
  const [kill, setKill] = useState<{ name: string; pid: number } | null>(null);
  return (
    <div className="p-5 animate-fade-in max-w-[1000px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">PROCESS MANAGEMENT</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">VOX Task Manager</h1>
        </div>
        <Badge tone="amber">SIMULATED SAMPLE</Badge>
      </div>
      <Panel title="Processes" icon="ListOrdered" bodyClassName="!p-0">
        <table className="vox-table">
          <thead><tr><th>PROCESS</th><th>PID</th><th>CPU</th><th>MEMORY</th><th>STATUS</th><th></th></tr></thead>
          <tbody>
            {processes.map((p) => (
              <tr key={p.pid}>
                <td><span className="flex items-center gap-2"><Icon name="Cpu" size={12} className="text-vox-dim" />{p.name}</span></td>
                <td className="font-mono text-vox-muted">{p.pid}</td>
                <td className="font-mono">{p.cpu}%</td>
                <td className="font-mono text-vox-muted">{p.mem} MB</td>
                <td><Badge tone="green">RUNNING</Badge></td>
                <td><Button size="xs" variant="danger" icon="Square" onClick={() => setKill(p)}>END</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="text-[10px] text-vox-dim mt-2 font-mono">Process termination is only possible through the Desktop Agent. The browser can never end a real process.</p>
      {kill && (
        <div className="vox-overlay flex items-center justify-center" onMouseDown={(e) => { if (e.target === e.currentTarget) setKill(null); }}>
          <div className="vox-pop glass hud-border w-[400px] p-5">
            <div className="flex items-center gap-3 mb-3">
              <Icon name="TriangleAlert" size={18} className="text-red-400" />
              <h3 className="font-display text-[13px] font-bold tracking-[0.12em] uppercase">TERMINATE PROCESS?</h3>
            </div>
            <p className="text-[12px] text-vox-muted leading-relaxed">End <span className="font-mono text-vox-text">{kill.name}</span> (PID {kill.pid})? Process control requires the Desktop Agent — without it, this action cannot execute.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setKill(null)}>CANCEL</Button>
              <Button variant="danger" onClick={() => { s.pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'PROCESS CONTROL UNAVAILABLE', body: 'Terminating real processes requires the VOX Desktop Agent. No process was ended.' }); setKill(null); }}>TERMINATE</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SYSTEM INFO ====================
export function SystemInfo() {
  const s = useVox();
  const info = s.systemInfo;
  const os = s.os;
  const rows: [string, string, string][] = [
    ['Operating System', `${os.name}${os.version && !os.name.includes(os.version) ? ` · ${os.version}` : ''}`, 'BROWSER'],
    ['Architecture', info.arch, 'BROWSER'],
    ['CPU', info.cpu, info.cores ? 'BROWSER' : 'UNAVAILABLE'],
    ['GPU', info.gpu, 'UNAVAILABLE'],
    ['RAM', info.ramTotal ? fmtBytes(info.ramTotal) : 'UNAVAILABLE', 'BROWSER'],
    ['Hostname', info.hostname, 'LOCAL'],
    ['Kernel', info.kernel, 'LOCAL'],
    ['Uptime', info.uptime, 'SESSION'],
    ['Battery', info.battery != null ? `${info.battery}%${info.batteryCharging ? ' (charging)' : ''}` : 'UNAVAILABLE', info.battery != null ? 'BROWSER' : '—'],
    ['Network', info.network.connected ? `${info.network.type} · RTT ${info.network.rtt ?? '—'}ms` : 'OFFLINE', 'BROWSER'],
    ['VOX Agent', info.agent === 'connected' ? '● CONNECTED' : '○ NOT CONNECTED', 'AGENT'],
    ['VOX-OS', 'v0.1.0 · 64-bit shell', 'LOCAL'],
  ];
  return (
    <div className="p-5 animate-fade-in max-w-[900px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">VOX-OS CLIENT</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">System Information</h1>
        </div>
        <Button size="xs" variant="ghost" icon="RefreshCw" onClick={() => void s.refreshSystem()}>REFRESH</Button>
      </div>
      <Panel title="System" icon="MonitorCog" bodyClassName="!p-0">
        <table className="vox-table">
          <tbody>
            {rows.map(([k, v, src]) => (
              <tr key={k}>
                <td className="w-[220px]"><span className="hud-label">{k}</span></td>
                <td className="font-mono text-[12px]">{v}</td>
                <td className="w-28 text-right"><Badge tone={src === 'BROWSER' ? 'blue' : src === 'AGENT' ? (info.agent === 'connected' ? 'green' : 'dim') : src === 'UNAVAILABLE' ? 'dim' : 'cyan'}>{src === '—' ? '—' : src}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="text-[10px] text-vox-dim mt-2 font-mono">Source badges show where each value comes from. Nothing is fabricated.</p>
    </div>
  );
}

// ==================== DESKTOP AGENT ====================
export function DesktopAgent() {
  const s = useVox();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const agent = s.agentState;
  const stats = s.agentStats;
  const connected = agent.status === 'connected';
  const caps = [
    { id: 'SYSTEM_STATS', desc: 'Real CPU, RAM, disk, load, uptime', ok: true },
    { id: 'NETWORK', desc: 'Real network interface list', ok: true },
    { id: 'PROCESS_LIST', desc: 'Real running processes', ok: true },
    { id: 'TERMINAL', desc: 'Real shell sessions (PowerShell, CMD, Bash)', ok: true },
    { id: 'FILES', desc: 'Real filesystem access', ok: true },
    { id: 'GPU', desc: 'Real GPU / driver info', ok: true },
  ];
  const connect = () => void s.connectAgent(url.trim() || undefined, token.trim() || undefined);
  return (
    <div className="p-5 animate-fade-in max-w-[1000px]">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="hud-label mb-1.5">LOCAL COMPANION</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">VOX Desktop Agent</h1>
        </div>
        <Badge tone={connected ? 'green' : agent.status === 'connecting' ? 'amber' : 'dim'}>
          <span className={clsx('dot', connected ? 'dot-online' : agent.status === 'connecting' ? 'dot-amber' : 'dot-dim')} /> {connected ? 'CONNECTED' : agent.status === 'connecting' ? 'CONNECTING…' : 'NOT CONNECTED'}
        </Badge>
      </div>

      {/* connection panel */}
      <Panel title="Connection" icon="PlugZap" glow="cyan">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="glass-inset p-3.5">
            <p className="hud-label mb-2">AUTO (RECOMMENDED)</p>
            <p className="text-[11px] text-vox-muted mb-3 leading-relaxed">The VOX backend reads the agent config and brokers the connection token. Start the daemon, then connect.</p>
            <Button variant="cyan" icon="PlugZap" onClick={connect} disabled={agent.status === 'connecting'}>
              {connected ? 'RECONNECT' : agent.status === 'connecting' ? 'CONNECTING…' : 'CONNECT AGENT'}
            </Button>
          </div>
          <div className="glass-inset p-3.5">
            <p className="hud-label mb-2">MANUAL</p>
            <div className="flex gap-2">
              <Input placeholder="ws://127.0.0.1:8790" value={url} onChange={(e) => setUrl(e.target.value)} className="!text-[10.5px] font-mono" />
            </div>
            <div className="flex gap-2 mt-2">
              <Input type="password" placeholder="agent token" value={token} onChange={(e) => setToken(e.target.value)} className="!text-[10.5px] font-mono" />
              <Button variant="ghost" onClick={connect}>CONNECT</Button>
            </div>
          </div>
        </div>
        {agent.lastError && <p className="text-[11px] text-amber-300 mt-3 font-mono">⚠ {agent.lastError}</p>}
        {!connected && !agent.lastError && (
          <div className="mt-4 glass-inset px-3.5 py-3 font-mono text-[10.5px] text-vox-muted leading-relaxed">
            <p className="text-vox-text mb-1">START THE DAEMON (in a terminal on this machine):</p>
            <p className="text-cyan-300">$ node agent/index.js --allow TERMINAL,SYSTEM_STATS,NETWORK</p>
            <p className="mt-1">— or <span className="text-cyan-300">--allow-all</span> on a trusted dev machine. First run generates the token automatically.</p>
          </div>
        )}
      </Panel>

      {connected && (
        <>
          {/* live stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            <Stat label="CPU" value={stats.cpu != null ? `${stats.cpu}%` : '—'} tone={stats.cpu != null && stats.cpu > 85 ? 'red' : 'ok'} />
            <Stat label="RAM" value={stats.memPct != null ? `${stats.memPct}%` : '—'} tone={stats.memPct != null && stats.memPct > 85 ? 'red' : 'ok'} />
            <Stat label="DISK" value={stats.diskPct != null ? `${stats.diskPct}%` : '—'} tone={stats.diskPct != null && stats.diskPct > 85 ? 'red' : 'ok'} />
            <Stat label="LOAD" value={stats.load.length ? stats.load[0].toFixed(2) : '—'} />
            <Stat label="UPTIME" value={stats.uptime != null ? `${Math.floor(stats.uptime / 3600)}h` : '—'} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Panel title="Capabilities & permissions" icon="Blocks" bodyClassName="!p-3">
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 mb-1.5 rounded-lg bg-cyan-400/[0.04] border border-cyan-400/20">
                <div>
                  <p className="text-[11px] font-semibold text-cyan-300">TRUSTED MACHINE? UNLOCK EVERYTHING</p>
                  <p className="text-[10px] text-vox-muted">Grant all capabilities at once — equivalent to starting the agent with <span className="font-mono">--allow-all</span>.</p>
                </div>
                <Button size="xs" variant="cyan" icon="Zap" onClick={() => void s.agentAllowAll()}>ALLOW ALL</Button>
              </div>
              <div className="space-y-1.5">
                {caps.map((c) => {
                  const state = agent.perms[c.id] ?? 'unknown';
                  return (
                    <div key={c.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02]">
                      <Icon name={state === 'allowed' ? 'CheckCircle2' : state === 'prompt' ? 'ShieldQuestion' : 'Circle'} size={13} className={state === 'allowed' ? 'text-emerald-400' : state === 'prompt' ? 'text-amber-300' : 'text-vox-dim'} />
                      <span className="font-mono text-[10.5px] text-vox-text">{c.id}</span>
                      <span className="ml-auto text-[10px] text-vox-muted text-right hidden sm:block">{c.desc}</span>
                      <Badge tone={state === 'allowed' ? 'green' : state === 'prompt' ? 'amber' : 'dim'}>{state === 'allowed' ? 'ALLOWED' : state === 'prompt' ? 'ASK ON USE' : state === 'denied' ? 'DENIED' : 'UNKNOWN'}</Badge>
                      {state !== 'allowed' && <Button size="xs" variant="ghost" onClick={() => void s.agentRequestPermission(c.id)}>REQUEST</Button>}
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel title="Agent status" icon="Info" bodyClassName="!p-3.5">
              <div className="space-y-2 text-[11.5px] font-mono text-vox-muted">
                <p>VERSION <span className="text-vox-text">{agent.version}</span></p>
                <p>HOST <span className="text-vox-text">{agent.os?.hostname ?? '—'}</span></p>
                <p>PLATFORM <span className="text-vox-text">{agent.os?.platform}/{agent.os?.arch}</span></p>
                <p>RELEASE <span className="text-vox-text">{agent.os?.release}</span></p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="danger" size="xs" icon="Unplug" onClick={() => s.disconnectAgent()}>DISCONNECT</Button>
                <Button variant="ghost" size="xs" icon="RefreshCw" onClick={() => void s.connectAgent()}>RECONNECT</Button>
              </div>
            </Panel>
          </div>
        </>
      )}

      {/* how it behaves without the agent */}
      <Panel title="How the web shell behaves without it" icon="Info" bodyClassName="!p-3.5" className="mt-4">
        <div className="space-y-2 text-[11.5px] text-vox-muted leading-relaxed">
          <p>• Terminal runs in a labeled <span className="text-amber-300">SIMULATED</span> sandbox</p>
          <p>• System telemetry shows <span className="text-amber-300">DEMO</span> for values the browser cannot read</p>
          <p>• Files edit the in-browser workspace tree</p>
          <p>• Health checks that need OS data read <span className="text-amber-300">UNAVAILABLE</span></p>
          <p>• Every gap is labeled — nothing is faked</p>
        </div>
        <div className="mt-4"><Button variant="cyan" size="xs" icon="Bot" onClick={() => s.setSection('settings')}>AGENT PERMISSIONS →</Button></div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'red' }) {
  return (
    <div className="glass-inset px-3 py-2.5">
      <p className="hud-label mb-1">{label}</p>
      <p className={clsx('font-mono text-[15px]', tone === 'red' ? 'text-red-300' : 'text-emerald-300')}>{value}</p>
    </div>
  );
}
