import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel, StatusDot, Toggle } from '../components/ui';
import { suggestProfile } from '../lib/os';

// Real, honest gaming center: OS/GPU/browser detection, Roblox compatibility
// checks from actual browser capabilities, boost profiles with real effects,
// a live FPS meter, and Game Mode. Nothing here pretends to overclock the
// machine — the Desktop Agent is required for native integration.

const PROFILES = [
  {
    id: 'balanced' as const,
    label: 'BALANCED',
    icon: 'Scale',
    desc: 'Default. Balanced power and responsiveness for everyday use and light gaming.',
    tone: 'cyan' as const,
  },
  {
    id: 'boost' as const,
    label: 'BOOST',
    icon: 'Zap',
    desc: 'Prioritizes the active session: tighter telemetry, performance mode, reduced background work.',
    tone: 'violet' as const,
  },
  {
    id: 'ultra' as const,
    label: 'ULTRA FPS',
    icon: 'Rocket',
    desc: 'Maximum frame focus. Performance mode, minimal VOX-OS background activity, strongest boost.',
    tone: 'red' as const,
  },
];

export function Gaming() {
  const s = useVox();
  const os = s.os;
  const roblox = s.roblox;
  const gpu = s.gpu;
  const suggested = suggestProfile({ cores: s.systemInfo.cores, ramGB: roblox.ramGB, mobile: os.mobile });
  const [fps, setFps] = useState<number | null>(null);
  const [fpsLive, setFpsLive] = useState(true);
  const frames = useRef<number[]>([]);

  // real FPS meter via rAF
  useEffect(() => {
    if (!fpsLive) { setFps(null); return; }
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      if (dt > 0) {
        frames.current.push(1000 / dt);
        if (frames.current.length > 30) frames.current.shift();
        const avg = frames.current.reduce((a, b) => a + b, 0) / frames.current.length;
        setFps(Math.round(avg));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fpsLive]);

  const statusOf = (ok: boolean | null) => (ok === null ? <Badge tone="dim">UNAVAILABLE</Badge> : ok ? <Badge tone="green">PASS</Badge> : <Badge tone="red">FAIL</Badge>);

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">GAME BOOST ENGINE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">GAMING & COMPATIBILITY</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={os.supported ? 'green' : 'red'}><span className="dot dot-online" /> {os.name} · {os.arch}</Badge>
          <Badge tone="violet">DETECTED OS</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* System & hardware — real browser facts */}
        <Panel title="Detected Platform" icon="MonitorCog" glow="blue" className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
            <KV k="Operating system" v={`${os.name}${os.version ? ` · ${os.version}` : ''}`} />
            <KV k="Architecture" v={os.arch} />
            <KV k="Browser" v={`${roblox.browser.name}${roblox.browser.version ? ` ${roblox.browser.version}` : ''}`} />
            <KV k="Logical cores" v={roblox.cores != null ? String(roblox.cores) : 'UNAVAILABLE'} />
            <KV k="Device memory" v={roblox.ramGB != null ? `${roblox.ramGB} GB` : 'UNAVAILABLE'} />
            <KV k="Network" v={roblox.online ? 'ONLINE' : 'OFFLINE'} tone={roblox.online ? 'ok' : 'bad'} />
            <KV k="GPU (WebGL)" v={gpu.renderer ? String(gpu.renderer).slice(0, 64) : 'Hidden by browser'} tone={gpu.renderer ? 'ok' : 'dim'} />
            <KV k="Graphics API" v={roblox.webgl2 ? 'WebGL 2' : roblox.webgl2 === false ? 'WebGL 1 only' : 'UNAVAILABLE'} />
          </div>
          <div className="mt-3 glass-inset px-3 py-2.5">
            <p className="hud-label mb-1">OS GAMING NOTE</p>
            <p className="text-[11.5px] text-vox-muted leading-relaxed">{os.gaming.tip}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-mono text-vox-dim">
              {os.gaming.directX && <span>DX: {os.gaming.directX}</span>}
              {os.gaming.vulkan && <span>VULKAN: {os.gaming.vulkan}</span>}
              {os.gaming.openGL && <span>GL: {os.gaming.openGL}</span>}
            </div>
          </div>
          <p className="text-[9.5px] text-vox-dim font-mono mt-2">Real browser detection · OS-level access requires the Desktop Agent.</p>
        </Panel>

        {/* FPS meter */}
        <Panel title="Frame Meter" icon="Activity">
          <div className="text-center py-4">
            <div className={clsx('font-display text-[44px] font-bold leading-none tabular-nums', fps == null ? 'text-vox-dim' : fps >= 55 ? 'text-emerald-300' : fps >= 30 ? 'text-amber-300' : 'text-red-300')}>
              {fps ?? '—'}
            </div>
            <p className="hud-label mt-1.5">FPS · {fpsLive ? 'LIVE' : 'PAUSED'}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button size="xs" variant={fpsLive ? 'cyan' : 'ghost'} icon={fpsLive ? 'Pause' : 'Play'} onClick={() => setFpsLive(!fpsLive)}>{fpsLive ? 'PAUSE' : 'RESUME'}</Button>
              <Badge tone="dim">BROWSER RENDER FPS</Badge>
            </div>
          </div>
          <p className="text-[10px] text-vox-dim font-mono text-center">Measures how fast VOX-OS itself renders — a proxy for system smoothness.</p>
        </Panel>
      </div>

      {/* Roblox compatibility — real checks only */}
      <Panel title="Roblox Compatibility" icon="Gamepad2" glow="violet"
        actions={<Badge tone={roblox.grade === 'EXCELLENT' ? 'green' : roblox.grade === 'GOOD' ? 'cyan' : 'amber'}>{roblox.grade}</Badge>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11.5px]">
          <CheckRow label="WebGL 2 rendering" ok={roblox.webgl2 ? true : roblox.webgl2 === false ? false : null} detail="Required to render Roblox experiences in the browser" />
          <CheckRow label="GPU detected" ok={gpu.renderer ? true : null} detail={gpu.renderer ? String(gpu.renderer).slice(0, 48) : 'Hidden by browser'} />
          <CheckRow label="Memory (≥ 4 GB)" ok={roblox.ramGB != null ? roblox.ramGB >= 4 : null} detail={roblox.ramGB != null ? `${roblox.ramGB} GB device memory` : 'deviceMemory hidden'} />
          <CheckRow label="Multi-core CPU" ok={roblox.cores != null ? roblox.cores >= 2 : null} detail={roblox.cores != null ? `${roblox.cores} logical cores` : 'unavailable'} />
          <CheckRow label="Network online" ok={roblox.online} detail={roblox.online ? 'Connected' : 'Offline'} />
          <CheckRow label="Supported OS" ok={os.supported} detail={os.name} />
          <CheckRow label="Roblox Player" ok={false} detail="REQUIRES DESKTOP AGENT" special="agent" />
          <CheckRow label="Game Boost" ok={s.settings.gameMode} detail={s.settings.gameMode ? 'ACTIVE' : 'Inactive'} special="boost" />
        </div>
        {roblox.issues.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {roblox.issues.map((i, idx) => (
              <p key={idx} className="text-[11px] text-amber-300/90 flex items-start gap-1.5"><Icon name="TriangleAlert" size={12} className="mt-0.5 shrink-0" />{i}</p>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Button variant="cyan" icon="RefreshCw" onClick={() => s.refreshSystem()}>RE-CHECK SYSTEM</Button>
          <Button variant="ghost" icon="Rocket" onClick={() => s.setGameProfile(suggested)}>APPLY RECOMMENDED ({suggested.toUpperCase()})</Button>
          <span className="text-[10px] text-vox-dim font-mono">Recommended from real hardware: {suggested.toUpperCase()}</span>
        </div>
        <p className="text-[9.5px] text-vox-dim font-mono mt-3">All checks are live browser capabilities. Roblox Player and OS-level drivers are only reachable through the Desktop Agent — never claimed otherwise.</p>
      </Panel>

      {/* Boost profiles */}
      <div className="grid md:grid-cols-3 gap-4">
        {PROFILES.map((p) => {
          const active = s.settings.gameProfile === p.id;
          return (
            <button
              key={p.id}
              onClick={() => s.setGameProfile(p.id)}
              className={clsx('glass hud-border rounded-xl p-4 text-left transition-colors', active ? 'border-cyan-400/50 bg-cyan-400/[0.06]' : 'hover:bg-white/[0.03]')}
            >
              <div className="flex items-center gap-2.5">
                <span className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center', active ? 'border-cyan-400/40 text-vox-cyan bg-cyan-400/10' : 'border-white/10 text-vox-dim')}>
                  <Icon name={p.icon} size={16} />
                </span>
                <span className="font-display text-[13px] font-bold tracking-[0.14em]">{p.label}</span>
                {active && <Badge tone="cyan">ACTIVE</Badge>}
              </div>
              <p className="text-[11px] text-vox-muted mt-2.5 leading-relaxed">{p.desc}</p>
              <p className="text-[9.5px] font-mono text-vox-dim mt-2">
                {p.id === 'balanced' ? '· default power profile' : p.id === 'boost' ? '· performance mode · focused telemetry' : '· performance mode · max background reduction'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Game Mode */}
      <Panel title="Game Mode" icon="Gamepad2" glow="cyan"
        actions={<Toggle checked={s.settings.gameMode} onChange={(v) => s.setGameMode(v)} label="Game Mode" />}>
        <div className="grid sm:grid-cols-3 gap-3">
          <Effect icon="BellOff" title="Quiet notifications" body="Only errors and security alerts break through while Game Mode is on." done={s.settings.gameMode} />
          <Effect icon="Gauge" title="Performance mode" body="VOX-OS prefers responsiveness for the active session over background smoothness." done={s.settings.gameMode && s.settings.performanceMode === 'performance'} />
          <Effect icon="Radio" title="Focused telemetry" body="Non-essential chatter is reduced so the shell stays out of the way." done={s.settings.gameMode} />
        </div>
        <p className="text-[9.5px] text-vox-dim font-mono mt-3">Game Mode tunes VOX-OS’s own behavior — it cannot overclock hardware. Real GPU/driver control requires the Desktop Agent.</p>
      </Panel>
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: 'ok' | 'bad' | 'dim' }) {
  return (
    <div className="glass-inset px-3 py-2">
      <p className="hud-label mb-1">{k}</p>
      <p className={clsx('font-mono text-[12px] break-words', tone === 'ok' ? 'text-emerald-300' : tone === 'bad' ? 'text-red-300' : tone === 'dim' ? 'text-vox-dim' : 'text-vox-text')}>{v}</p>
    </div>
  );
}

function CheckRow({ label, ok, detail, special }: { label: string; ok: boolean | null; detail?: string; special?: 'agent' | 'boost' }) {
  return (
    <div className="glass-inset px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-vox-text">{label}</p>
        {special === 'agent' ? <Badge tone="amber">REQUIRES AGENT</Badge>
          : special === 'boost' ? (ok ? <Badge tone="green">ACTIVE</Badge> : <Badge tone="dim">OFF</Badge>)
          : ok === null ? <Badge tone="dim">UNAVAILABLE</Badge> : ok ? <Badge tone="green">PASS</Badge> : <Badge tone="red">FAIL</Badge>}
      </div>
      {detail && <p className="text-[9.5px] font-mono text-vox-dim mt-1 break-words">{detail}</p>}
    </div>
  );
}

function Effect({ icon, title, body, done }: { icon: string; title: string; body: string; done: boolean }) {
  return (
    <div className={clsx('glass-inset px-3 py-2.5', done && 'border-emerald-400/25')}>
      <div className="flex items-center gap-2">
        <Icon name={icon} size={13} className={done ? 'text-emerald-300' : 'text-vox-dim'} />
        <p className="text-[11.5px] font-semibold text-vox-text">{title}</p>
      </div>
      <p className="text-[10.5px] text-vox-muted mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
