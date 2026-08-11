import { useEffect, useState } from 'react';
import { useVox } from '../lib/store';
import { Icon } from '../components/ui';
import { fmtClock, fmtDate, fmtBytes } from '../lib/fmt';
import { sfx } from '../lib/sounds';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Night shift';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function PhoneHome() {
  const s = useVox();
  const telemetry = s.telemetry;
  const last = telemetry[telemetry.length - 1];
  const info = s.systemInfo;
  const os = s.os;
  const health = s.health;
  const profile = s.profile;
  const setSection = s.setSection;
  const openApp = s.openApp;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const bat = info.battery;
  const batteryPct = bat != null ? Math.round(bat) : null;
  const cpu = last?.cpu ?? 0;
  const ram = last?.ram ?? 0;

  const quick: { label: string; icon: string; tint: [string, string]; go: () => void }[] = [
    { label: 'VOX AI', icon: 'Sparkles', tint: ['#22d3ee', '#3b82f6'], go: () => openApp('voxai') },
    { label: 'Terminal', icon: 'SquareTerminal', tint: ['#10b981', '#059669'], go: () => openApp('terminal') },
    { label: 'GitHub', icon: 'GitBranch', tint: ['#94a3b8', '#64748b'], go: () => setSection('github') },
    { label: 'Recon Lab', icon: 'Radar', tint: ['#22d3ee', '#8b5cf6'], go: () => setSection('recon') },
    { label: 'Remote', icon: 'Smartphone', tint: ['#3b82f6', '#22d3ee'], go: () => setSection('remote') },
    { label: 'Settings', icon: 'Settings', tint: ['#94a3b8', '#64748b'], go: () => setSection('settings') },
  ];

  const stat = (label: string, value: string, pct: number, color: string) => (
    <div className="glass-inset rounded-2xl px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[9.5px] font-mono tracking-[0.18em] text-vox-dim uppercase">{label}</span>
        <span className="font-mono text-[15px] font-semibold text-vox-text tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-[5px] rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-[560px] mx-auto animate-fade-in space-y-4">
      {/* clock card */}
      <div className="glass rounded-3xl px-5 py-6 relative overflow-hidden">
        <div className="scan-line opacity-40" />
        <div className="flex items-center gap-1.5">
          <span className={`dot ${s.backend === 'online' ? 'dot-online' : s.backend === 'offline' ? 'dot-amber' : 'dot-dim'}`} />
          <span className="font-mono text-[10px] tracking-[0.24em] text-vox-muted uppercase">
            {s.agentState.status === 'connected' ? 'Agent linked' : 'Local shell'}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-vox-dim">
            <Icon name="Cpu" size={12} />
            <span className="font-mono text-[10px] tracking-[0.14em]">{os.name}</span>
          </span>
        </div>
        <div className="mt-3 font-mono text-[52px] font-bold leading-none text-white tabular-nums tracking-tight">
          {fmtClock(now)}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-[13px] text-vox-muted font-medium">{fmtDate(now)}</span>
          <span className="font-display text-[11px] tracking-[0.22em] text-vox-cyan uppercase">
            {greeting()}, {(profile.name || 'developer').split(' ')[0]}
          </span>
        </div>
      </div>

      {/* system stats */}
      <div className="grid grid-cols-2 gap-3">
        {stat('CPU', `${cpu}%`, cpu, '#22d3ee')}
        {stat('RAM', `${ram}%`, ram, '#8b5cf6')}
        <div className="glass-inset rounded-2xl px-3.5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[9.5px] font-mono tracking-[0.18em] text-vox-dim uppercase">Battery</span>
            <span className="flex items-center gap-1.5">
              {info.batteryCharging && <Icon name="Zap" size={12} className="text-amber-300" />}
              <span className="font-mono text-[15px] font-semibold text-vox-text tabular-nums">{batteryPct != null ? `${batteryPct}%` : '—'}</span>
            </span>
          </div>
          <div className="mt-2 h-[5px] rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${batteryPct ?? 0}%`, background: '#34d399', boxShadow: '0 0 8px #34d399' }}
            />
          </div>
        </div>
        <div className="glass-inset rounded-2xl px-3.5 py-3 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <Icon name="Wifi" size={13} className={info.network.connected ? 'text-vox-cyan' : 'text-vox-dim'} />
            <span className="font-mono text-[12px] font-semibold text-vox-text uppercase tracking-wide">
              {info.network.connected ? (info.network.type || 'Wi-Fi') : 'Offline'}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-vox-dim">
            {info.network.rtt != null ? `${info.network.rtt} ms` : '—'} · {info.network.down != null ? fmtBytes(info.network.down) + '/s' : '—'}
          </div>
        </div>
      </div>

      {/* health mini-card */}
      <button
        onClick={() => { sfx.command(); setSection('health'); }}
        className="glass rounded-3xl px-5 py-4 w-full flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: `conic-gradient(#22d3ee ${health.score * 3.6}deg, rgba(148,163,184,0.12) 0deg)`,
            boxShadow: '0 0 18px -4px rgba(34,211,238,0.5)',
          }}
        >
          <div className="w-11 h-11 rounded-full bg-ink-900 flex items-center justify-center">
            <span className="font-mono text-[15px] font-bold text-vox-cyan tabular-nums">{health.score}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-[12px] font-bold tracking-[0.18em] text-vox-text uppercase">System Health</span>
            <Icon name="ChevronRight" size={14} className="text-vox-dim" />
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.14em] text-vox-muted uppercase">
            {health.grade} · {health.lastScan ? 'scan complete' : 'no scan yet'}
          </p>
        </div>
        <Icon name="HeartPulse" size={18} className="text-emerald-300" />
      </button>

      {/* quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {quick.map((a) => (
          <button
            key={a.label}
            onClick={() => { sfx.command(); a.go(); }}
            className="glass rounded-2xl px-2 py-4 flex flex-col items-center gap-2.5 active:scale-95 transition-transform"
          >
            <span
              className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${a.tint[0]}, ${a.tint[1]})`, boxShadow: `0 6px 16px -6px ${a.tint[1]}88` }}
            >
              <Icon name={a.icon} size={19} strokeWidth={1.8} />
            </span>
            <span className="text-[10.5px] font-medium text-vox-muted">{a.label}</span>
          </button>
        ))}
      </div>

      {/* footer */}
      <p className="text-center font-mono text-[9px] tracking-[0.28em] text-vox-dim uppercase pb-1">
        {info.hostname} · up {info.uptime}
      </p>
    </div>
  );
}
