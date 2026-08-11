import { useEffect } from 'react';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel, StatusDot } from '../components/ui';
import { VoxCore } from '../components/VoxCore';
import { AreaChart, Gauge, HBar, MiniSparkline } from '../lib/charts';
import { timeAgo, fmtBytes } from '../lib/fmt';
import { sessionPrompt } from '../lib/shell';

export function Dashboard() {
  const s = useVox();
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const sessionUptime = Math.floor(performance.now() / 1000);
  const term = s.terminalSessions.find((t) => t.id === s.terminalActive) ?? s.terminalSessions[0];
  const lastTelemetry = s.telemetry.slice(-40);
  const cpuSeries = lastTelemetry.map((t) => t.cpu);
  const ramSeries = lastTelemetry.map((t) => t.ram);
  const netSeries = lastTelemetry.map((t) => t.net);

  useEffect(() => {
    // auto-run a real quick scan once so dashboard health is computed, not static
    if (!s.health.lastScan && !s.health.scanning && s.booted) {
      const t = setTimeout(() => void s.runHealthScan('quick'), 900);
      return () => clearTimeout(t);
    }
  }, [s.booted, s.health.lastScan, s.health.scanning]);

  const stats = [
    { label: 'Projects', value: String(s.projects.length), sub: 'Active', icon: 'FolderKanban', color: 'text-cyan-300' },
    { label: 'Commits', value: String(s.aiUsage.requestsToday + s.commandHistory.length), sub: 'This Session', icon: 'GitCommitHorizontal', color: 'text-violet-300' },
    { label: 'Build Status', value: active?.build.status === 'success' ? 'SUCCESS' : active?.build.status === 'failed' ? 'FAILED' : '—', sub: active ? `${active.name} · last ${timeAgo(active.build.lastRun)}` : 'No project', icon: 'Zap', color: active?.build.status === 'success' ? 'text-emerald-300' : active?.build.status === 'failed' ? 'text-red-300' : 'text-vox-muted' },
    { label: 'Uptime', value: `${Math.floor(sessionUptime / 3600)}h ${Math.floor((sessionUptime % 3600) / 60)}m`, sub: 'VOX-OS Session', icon: 'Clock', color: 'text-blue-300' },
  ];

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* welcome */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="min-w-[280px]">
          <p className="hud-label mb-1">VOX CORE · SYSTEM OVERVIEW</p>
          <h1 className="font-display text-[26px] font-bold tracking-[0.04em] leading-tight">
            WELCOME BACK,<br /><span className="gradient-text text-glow-cyan">DEVELOPER_</span>
          </h1>
          <p className="font-mono text-[10.5px] tracking-[0.28em] text-vox-muted mt-2">BUILD • DEBUG • DEPLOY • REPEAT</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="dot dot-online" />
          <span className="font-mono text-[10px] tracking-[0.14em] text-emerald-300">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((st) => (
          <div key={st.label} className="glass hud-border p-3.5">
            <div className="flex items-center gap-2">
              <Icon name={st.icon} size={14} className={st.color} />
              <span className="hud-label">{st.label}</span>
            </div>
            <p className={`font-mono text-[22px] font-semibold mt-2 ${st.color}`}>{st.value}</p>
            <p className="text-[10px] text-vox-dim mt-0.5">{st.sub}</p>
          </div>
        ))}
      </div>

      {/* main row */}
      <div className="grid grid-cols-12 gap-4">
        {/* health */}
        <Panel title="Health Scanner" icon="Activity" className="col-span-12 lg:col-span-4" glow="cyan"
          actions={<>
            <Button size="xs" variant="cyan" onClick={() => void s.runHealthScan('full')} disabled={s.health.scanning}>FULL SCAN</Button>
          </>}>
          {s.health.scanning ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-28 h-28 mb-4">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(s.health.progress / 100) * 264} 264`} style={{ filter: 'drop-shadow(0 0 6px #22d3ee)' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[18px] text-cyan-300">{s.health.progress}%</span>
              </div>
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-vox-muted">{s.health.progressMsg}</p>
              <Button size="xs" variant="ghost" className="mt-3" onClick={() => s.cancelScan()}>CANCEL</Button>
            </div>
          ) : s.health.lastScan ? (
            <>
              <div className="flex items-center gap-4">
                <Gauge value={s.health.score} size={110} color={s.health.score >= 90 ? '#34d399' : s.health.score >= 60 ? '#fbbf24' : '#f87171'} sublabel="HEALTH SCORE" />
                <div className="space-y-1.5 flex-1">
                  <Badge tone={s.health.score >= 90 ? 'green' : s.health.score >= 60 ? 'amber' : 'red'}>{s.health.grade}</Badge>
                  <p className="text-[10.5px] text-vox-dim leading-relaxed">{s.health.categories.length} checks · last scan {timeAgo(s.health.lastScan)}</p>
                  <Button size="xs" variant="cyan" icon="RefreshCw" onClick={() => void s.runHealthScan('quick')}>QUICK SCAN</Button>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                {s.health.categories.slice(0, 7).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 py-1 border-b border-vox-line/50 last:border-0">
                    <StatusDot tone={c.status === 'pass' ? 'online' : c.status === 'warn' ? 'amber' : c.status === 'error' ? 'red' : 'dim'} />
                    <span className="text-[11px] text-vox-text flex-1">{c.label}</span>
                    <span className={`font-mono text-[9px] ${c.status === 'pass' ? 'text-emerald-300' : c.status === 'warn' ? 'text-amber-300' : c.status === 'error' ? 'text-red-300' : 'text-vox-dim'}`}>
                      {c.status === 'pass' ? 'PASS' : c.status === 'warn' ? 'WARN' : c.status === 'error' ? 'ERROR' : 'UNAVAILABLE'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[12px] text-vox-muted">No scan yet.</p>
              <Button className="mt-3" variant="cyan" onClick={() => void s.runHealthScan('quick')}>RUN SCAN</Button>
            </div>
          )}
        </Panel>

        {/* terminal */}
        <Panel title="Terminal" icon="SquareTerminal" className="col-span-12 lg:col-span-4"
          actions={<>
            {term.agentMode ? <Badge tone="green">● REAL SHELL</Badge> : <Badge tone="amber">SIMULATED</Badge>}
            <Button size="xs" icon="ExternalLink" onClick={() => s.openApp('terminal')}>OPEN</Button>
          </>}>
          <div className="glass-inset p-3 font-mono text-[11px] leading-[1.7] h-[240px] overflow-y-auto bg-ink-950/70">
            {term.history.slice(-14).map((h, i) => (
              <div key={i} className="term-line">
                {h.kind === 'in' ? <><span className="text-cyan-300">{sessionPrompt(term)}</span> <span className="text-vox-text">{h.input}</span></> : h.kind === 'err' ? <span className="text-red-300">{h.output}</span> : h.kind === 'sys' ? <span className="text-vox-dim italic">{h.output}</span> : <span className="text-vox-muted">{h.output}</span>}
              </div>
            ))}
            <div><span className="text-cyan-300">{sessionPrompt(term)}</span> <span className="term-cursor" /></div>
          </div>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">Shell: {term.shell} · {term.agentMode ? 'real execution via Desktop Agent' : 'real execution requires Desktop Agent'}</p>
        </Panel>

        {/* VOX AI */}
        <Panel title="VOX AI Core" icon="Sparkles" className="col-span-12 lg:col-span-4" glow="violet"
          actions={
            s.providers.gemini.configured || s.providers.groq.configured ? (
              <Badge tone="green"><span className="dot dot-online" /> ONLINE</Badge>
            ) : s.settings.demoAssistant ? (
              <Badge tone="amber">DEMO ASSISTANT</Badge>
            ) : (
              <Badge tone="dim">NOT CONFIGURED</Badge>
            )
          }>
          <div className="flex flex-col items-center py-3">
            <VoxCore state={s.aiStatus === 'thinking' || s.aiStatus === 'generating' ? 'thinking' : 'idle'} size={150} showStatus={false} />
            <p className="mt-3 text-[12px] text-vox-muted text-center max-w-[260px] leading-relaxed">
              {s.aiThinking ? 'Analyzing your workspace…' : 'Good afternoon, developer. All systems are operational.'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="solid" icon="Sparkles" onClick={() => s.openApp('voxai')}>ASK VOX</Button>
              <Button variant="violet" icon="Microscope" onClick={() => void s.sendMessage('Review my project and produce an intelligence report.')}>ANALYZE PROJECT</Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* bottom row */}
      <div className="grid grid-cols-12 gap-4">
        {/* GitHub */}
        <Panel title="GitHub Repositories" icon="GitBranch" className="col-span-12 lg:col-span-4"
          actions={<Button size="xs" icon="RefreshCw" onClick={() => void s.syncGithub()}>SYNC</Button>}>
          {s.githubLoading ? (
            <div className="py-6 text-center font-mono text-[11px] text-vox-dim">LOADING REPOSITORIES…</div>
          ) : s.githubRepos.length > 0 ? (
            <div className="space-y-1">
              {s.githubRepos.slice(0, 6).map((r) => (
                <div key={r.full_name} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04]">
                  <Icon name="Github" size={14} className="text-vox-dim" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-vox-text truncate">{r.full_name}</p>
                    <p className="text-[9.5px] text-vox-dim">{r.language ?? '—'} · ★ {r.stargazers_count} · ⑂ {r.forks_count}</p>
                  </div>
                  <span className="text-[9px] font-mono text-vox-dim">{r.pushed_at ? timeAgo(new Date(r.pushed_at).getTime()) : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="text-[11.5px] text-vox-muted">{s.githubError ?? 'GitHub not connected.'}</p>
              <Button className="mt-3" size="xs" variant="cyan" onClick={() => void s.connectGithub()}>CONNECT GITHUB</Button>
            </div>
          )}
        </Panel>

        {/* Git activity */}
        <Panel title="Git Activity" icon="GitCommitHorizontal" className="col-span-12 lg:col-span-4">
          {active ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone="cyan">{active.git.branch}</Badge>
                <span className="font-mono text-[10px] text-vox-muted">↑ {active.git.ahead} · ↓ {active.git.behind}</span>
                <span className="ml-auto font-mono text-[10px] text-vox-dim">{timeAgo(active.lastModified)}</span>
              </div>
              <p className="text-[11.5px] text-vox-text">“{active.git.lastCommit}”</p>
              {active.git.changes.length > 0 ? (
                <div className="space-y-1 mt-2">
                  {active.git.changes.slice(0, 5).map((c) => (
                    <div key={c.path} className="flex items-center gap-2 font-mono text-[10px]">
                      <span className={c.state === 'added' ? 'text-emerald-300' : c.state === 'deleted' ? 'text-red-300' : 'text-amber-300'}>{c.state === 'added' ? 'A' : c.state === 'deleted' ? 'D' : 'M'}</span>
                      <span className="text-vox-muted truncate">{c.path}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[11px] text-emerald-300/80 font-mono mt-1">✓ working tree clean</p>}
            </div>
          ) : <p className="py-6 text-center text-[11.5px] text-vox-dim">No active project.</p>}
        </Panel>

        {/* performance + system */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Performance Monitor" icon="Gauge" className="!p-0" bodyClassName="!p-0"
            actions={<Badge tone={s.telemetry.length > 0 ? 'cyan' : 'dim'}>{s.telemetry.length > 0 ? 'LIVE' : '—'}</Badge>}>
            <div className="p-4 space-y-3">
              {[
                { label: 'CPU', v: lastTelemetry[lastTelemetry.length - 1]?.cpu ?? 0, data: cpuSeries, color: '#22d3ee', src: 'DEMO' },
                { label: 'RAM', v: lastTelemetry[lastTelemetry.length - 1]?.ram ?? 0, data: ramSeries, color: '#8b5cf6', src: s.telemetryReal.ram ? 'LIVE' : 'DEMO' },
                { label: 'NETWORK', v: Math.round((lastTelemetry[lastTelemetry.length - 1]?.net ?? 0) / 1024), data: netSeries, color: '#3b82f6', src: s.telemetryReal.net ? 'LIVE' : 'DEMO' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="hud-label">{m.label}</span>
                    <span className="font-mono text-[10.5px] text-vox-text">{m.label === 'NETWORK' ? `${m.v} KB/s` : `${m.v}%`}<span className="text-vox-dim ml-1.5 text-[8.5px]">{m.src}</span></span>
                  </div>
                  <AreaChart data={m.data} height={28} color={m.color} max={m.label === 'NETWORK' ? 320 : 100} fill={false} showGrid={false} strokeWidth={1.2} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="System Information" icon="MonitorCog" bodyClassName="!p-3">
            <div className="space-y-1.5">
              {[
                ['OS', s.systemInfo.os],
                ['CPU', s.systemInfo.cpu],
                ['RAM', s.systemInfo.ramTotal ? fmtBytes(s.systemInfo.ramTotal) : 'UNAVAILABLE'],
                ['SHELL', term.shell],
                ['NODE', 'v20.12.2'],
                ['VOX-OS', `v${'0.1.0'}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[11px]">
                  <span className="hud-label">{k}</span>
                  <span className="font-mono text-vox-muted truncate ml-3">{v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
