import { useEffect } from 'react';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel } from '../components/ui';

export function SystemTools() {
  const s = useVox();
  const agentOnline = s.agentState.status === 'connected';
  const load = s.loadSysTools;

  useEffect(() => {
    if (agentOnline) void load();
  }, [agentOnline, load]);

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label mb-1.5">SYSTEM APPS</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">WINDOWS SYSTEM TOOLS</h1>
          <p className="text-[11.5px] text-vox-muted mt-1">Open the OS's built-in control panels — Disk Management, Task Manager, Device Manager and more — straight from VOX-OS.</p>
        </div>
        <div className="flex items-center gap-2">
          {agentOnline ? <Badge tone="green"><span className="dot dot-online" /> AGENT LINKED</Badge> : <Badge tone="red">AGENT OFFLINE</Badge>}
          <Button size="xs" variant="ghost" icon="RefreshCw" onClick={() => void s.loadSysTools()}>REFRESH</Button>
        </div>
      </div>

      {!agentOnline && (
        <div className="glass-inset border-amber-400/20 px-4 py-3.5 flex flex-wrap items-center gap-3">
          <Icon name="Link2Off" size={16} className="text-amber-400" />
          <div className="flex-1 min-w-[220px]">
            <p className="text-[12px] font-semibold text-vox-text">DESKTOP AGENT OFFLINE</p>
            <p className="text-[11px] text-vox-muted mt-0.5">Start `node agent/index.js` (or the VOX-OS desktop app) to open real Windows system tools. The list below shows what's available when connected.</p>
          </div>
        </div>
      )}

      {s.sysToolsError && (
        <div className="glass-inset border-red-400/20 px-4 py-3">
          <p className="text-[11.5px] font-mono text-red-300">{s.sysToolsError}</p>
        </div>
      )}

      {s.sysToolsLoading && !s.sysTools.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-inset h-[92px] animate-pulse bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {s.sysTools.map((t) => (
            <button
              key={t.id}
              onClick={() => void s.openSysTool(t.id)}
              disabled={!agentOnline}
              className="glass-inset p-4 text-left hover:bg-white/[0.04] hover:border-cyan-400/30 transition-all group disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.25)] transition-shadow">
                  <Icon name={t.icon} size={17} className="text-cyan-300" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-vox-text leading-tight">{t.label}</p>
                  <p className="font-mono text-[9.5px] text-vox-dim mt-0.5 uppercase tracking-wider">{t.id}</p>
                </div>
              </div>
              <p className="text-[10.5px] text-vox-muted mt-2.5 leading-snug">{t.desc}</p>
            </button>
          ))}
        </div>
      )}

      {!s.sysToolsLoading && !s.sysTools.length && agentOnline && (
        <Panel title="No Tools" icon="Info">
          <p className="text-[12px] text-vox-muted">Run REFRESH — the agent should return Windows built-in tools.</p>
        </Panel>
      )}
    </div>
  );
}
