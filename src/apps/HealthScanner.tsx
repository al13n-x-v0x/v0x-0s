import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel, StatusDot } from '../components/ui';
import { Gauge } from '../lib/charts';
import { timeAgo } from '../lib/fmt';
import clsx from 'clsx';

export function HealthScanner() {
  const s = useVox();
  const h = s.health;

  const scanBtn = (label: string, kind: 'quick' | 'full' | 'project' | 'deps', icon: string) => (
    <Button size="xs" variant={h.scanning ? 'ghost' : 'cyan'} icon={icon} disabled={h.scanning} onClick={() => void s.runHealthScan(kind)}>
      {label}
    </Button>
  );

  const statusMeta: Record<string, { tone: 'online' | 'amber' | 'red' | 'dim'; label: string; color: string }> = {
    pass: { tone: 'online', label: 'PASS', color: 'text-emerald-300' },
    warn: { tone: 'amber', label: 'WARNING', color: 'text-amber-300' },
    error: { tone: 'red', label: 'ERROR', color: 'text-red-300' },
    unavailable: { tone: 'dim', label: 'UNAVAILABLE', color: 'text-vox-dim' },
    pending: { tone: 'dim', label: 'PENDING', color: 'text-vox-dim' },
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">HEALTH SCANNER</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">SYSTEM DIAGNOSTICS</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {scanBtn('QUICK SCAN', 'quick', 'Zap')}
          {scanBtn('FULL SCAN', 'full', 'ScanLine')}
          {scanBtn('SCAN PROJECT', 'project', 'FolderSearch')}
          {scanBtn('SCAN DEPENDENCIES', 'deps', 'Boxes')}
        </div>
      </div>

      {/* main scan area */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <Panel title="Health Score" icon="HeartPulse" glow="cyan" bodyClassName="flex flex-col items-center justify-center py-8">
          {h.scanning ? (
            <>
              <div className="relative w-40 h-40">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="7" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#22d3ee" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(h.progress / 100) * 264} 264`} style={{ filter: 'drop-shadow(0 0 8px #22d3ee)', transition: 'stroke-dasharray 0.3s' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[26px] text-cyan-300">{h.progress}%</span>
              </div>
              <p className="font-mono text-[10.5px] tracking-[0.16em] text-vox-muted mt-4 text-center">{h.progressMsg}</p>
              <Button size="xs" variant="ghost" className="mt-3" onClick={() => s.cancelScan()}>CANCEL</Button>
            </>
          ) : h.lastScan ? (
            <>
              <Gauge value={h.score} size={160} stroke={9} color={h.score >= 90 ? '#34d399' : h.score >= 60 ? '#fbbf24' : '#f87171'} label={String(h.score)} sublabel="/ 100" />
              <Badge tone={h.score >= 90 ? 'green' : h.score >= 60 ? 'amber' : 'red'} className="mt-3">{h.grade}</Badge>
              <p className="text-[10px] text-vox-dim mt-3 font-mono">LAST SCAN {timeAgo(h.lastScan)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="xs" variant="cyan" icon="RefreshCw" onClick={() => void s.runHealthScan('quick')}>RESCAN</Button>
                <Button size="xs" variant="ghost" icon="Stethoscope" onClick={() => void s.runDiagnostics()}>AUTO DIAGNOSTICS</Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-[12px] text-vox-muted">No scan has run yet.</p>
              <Button className="mt-3" variant="cyan" icon="ScanLine" onClick={() => void s.runHealthScan('quick')}>RUN QUICK SCAN</Button>
            </div>
          )}
        </Panel>

        {/* categories */}
        <Panel title="Scan Results" icon="ListChecks" bodyClassName="!p-0">
          {h.categories.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-vox-dim">Scan results appear here. Unavailable checks are labeled, never fabricated.</div>
          ) : (
            <div className="divide-y divide-vox-line/50">
              {h.categories.map((c) => {
                const m = statusMeta[c.status];
                return (
                  <div key={c.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                    <span className="mt-1"><StatusDot tone={m.tone} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-vox-text">{c.label}</span>
                        <span className={clsx('font-mono text-[9px] tracking-[0.12em]', m.color)}>{m.label}</span>
                        {c.status === 'unavailable' && <Badge tone="dim">REQUIRES DESKTOP AGENT</Badge>}
                      </div>
                      <p className="text-[10.5px] text-vox-muted mt-0.5 leading-relaxed">{c.detail}</p>
                    </div>
                    <div className="w-[90px] shrink-0 mt-1">
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.status === 'error' ? '#f87171' : c.status === 'warn' ? '#fbbf24' : c.status === 'pass' ? '#34d399' : 'rgba(148,163,184,0.2)' }} />
                      </div>
                      <p className="text-right font-mono text-[9px] text-vox-dim mt-0.5">{c.status === 'unavailable' ? '—' : c.score}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="About this scanner" icon="Info" bodyClassName="!p-3.5">
        <p className="text-[11.5px] text-vox-muted leading-relaxed">
          VOX-OS computes scores from what it can actually observe in the browser: network state (<span className="font-mono text-vox-text">navigator.connection</span>), JS-heap memory (Chrome), project structure, dependency metadata, Git state, and build results. System-level checks (disk, drivers, CPU temperature, startup) are marked <span className="text-vox-dim font-semibold">UNAVAILABLE / REQUIRES DESKTOP AGENT</span> — VOX-OS never claims to scan hardware it cannot reach. <span className="text-vox-dim">No malware scanning is performed.</span>
        </p>
      </Panel>
    </div>
  );
}
