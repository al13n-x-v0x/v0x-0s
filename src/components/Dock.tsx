import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { APPS } from '../lib/constants';
import { Icon } from './ui';
import { fmtClock, fmtDate } from '../lib/fmt';
import { sfx } from '../lib/sounds';

const PINNED = ['voxai', 'terminal', 'code', 'github', 'files', 'projects', 'health', 'settings'];

export function Dock() {
  const windows = useVox((s) => s.windows);
  const activeWindowId = useVox((s) => s.activeWindowId);
  const openApp = useVox((s) => s.openApp);
  const focusWindow = useVox((s) => s.focusWindow);
  const setStartOpen = useVox((s) => s.setStartOpen);
  const startOpen = useVox((s) => s.startOpen);
  const setQuickOpen = useVox((s) => s.setQuickOpen);
  const setNotifOpen = useVox((s) => s.setNotifOpen);
  const voice = useVox((s) => s.voice);
  const battery = useVox((s) => s.systemInfo.battery);
  const batteryCharging = useVox((s) => s.systemInfo.batteryCharging);
  const network = useVox((s) => s.systemInfo.network);
  const notifications = useVox((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const running = windows.filter((w) => !w.minimized);

  return (
    <footer className="h-[52px] shrink-0 relative z-40 px-3 pb-2.5 pointer-events-none">
      <div className="h-full max-w-[1100px] mx-auto flex items-center gap-1.5 glass !rounded-2xl px-2 pointer-events-auto" style={{ boxShadow: '0 12px 40px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(148,163,184,0.08)' }}>
        {/* start */}
        <button
          aria-label="VOX Start"
          onClick={() => { sfx.command(); setStartOpen(!startOpen); }}
          className={clsx('flex items-center gap-1.5 px-2.5 h-9 rounded-xl transition-all', startOpen ? 'bg-cyan-400/15 text-cyan-300' : 'hover:bg-white/5 text-vox-text')}
        >
          <Icon name="Hexagon" size={17} className={startOpen ? 'text-vox-cyan' : 'text-vox-violet'} />
          <span className="font-display text-[11px] font-bold tracking-[0.18em] hidden sm:block">VOX</span>
        </button>

        <div className="w-px h-6 bg-vox-line mx-1" />

        {/* pinned + running */}
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {PINNED.map((appId) => {
            const app = APPS.find((a) => a.id === appId)!;
            const win = windows.find((w) => w.app === appId);
            const isActive = win && activeWindowId === win.id;
            return (
              <button
                key={appId}
                aria-label={app.title}
                title={app.title}
                onClick={() => { sfx.command(); win ? focusWindow(win.id) : openApp(appId); }}
                className={clsx(
                  'relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                  isActive ? 'bg-cyan-400/15 text-cyan-300' : 'text-vox-muted hover:text-vox-text hover:bg-white/5',
                )}
              >
                <Icon name={app.icon} size={16} />
                {win && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #22d3ee' }} />}
                {isActive && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-300" style={{ boxShadow: '0 0 6px #22d3ee' }} />}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {/* tray */}
          <button aria-label="Network" title={`Network: ${network.connected ? network.type : 'offline'}`} onClick={() => setQuickOpen(true)} className="p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5">
            <Icon name={network.connected ? 'Wifi' : 'WifiOff'} size={14} className={network.connected ? 'text-emerald-300' : 'text-vox-dim'} />
          </button>
          <button aria-label="Notifications" onClick={() => { setNotifOpen(true); }} className="relative p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5">
            <Icon name="Bell" size={14} />
            {unread > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px #22d3ee' }} />}
          </button>
          <button aria-label="Voice engine" title={`VOX Voice: ${voice.status.toUpperCase()}`} onClick={() => useVox.getState().setSection('voice')} className="p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5">
            <Icon name={voice.status === 'listening' ? 'Mic' : 'MicOff'} size={14} className={voice.status === 'listening' ? 'text-red-400' : ''} />
          </button>
          {battery != null && (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-vox-muted" title={`Battery ${battery}%${batteryCharging ? ' (charging)' : ''}`}>
              <Icon name={batteryCharging ? 'BatteryCharging' : battery > 50 ? 'BatteryFull' : battery > 20 ? 'BatteryMedium' : 'BatteryLow'} size={15} className={battery < 20 ? 'text-amber-400' : ''} />
              <span className="font-mono text-[9.5px]">{battery}%</span>
            </div>
          )}
          <button aria-label="Clock" onClick={() => setQuickOpen(true)} className="px-2 py-1 rounded-lg text-right hover:bg-white/5 leading-tight">
            <span className="block font-mono text-[11.5px] text-vox-text tabular-nums">{fmtClock(now)}</span>
            <span className="block text-[8.5px] text-vox-dim">{fmtDate(now).split(',')[0]}</span>
          </button>
          <div className="w-px h-6 bg-vox-line mx-0.5" />
          <button aria-label="Quick settings" onClick={() => { sfx.command(); setQuickOpen(true); }} className="p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5">
            <Icon name="Power" size={14} />
          </button>
        </div>
      </div>
      {/* running indicator */}
      {running.length > 0 && (
        <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
          {running.map((w) => (
            <span key={w.id} className="w-8 h-[3px] rounded-full" style={{ background: w.id === activeWindowId ? '#22d3ee' : 'rgba(148,163,184,0.25)', boxShadow: w.id === activeWindowId ? '0 0 6px #22d3ee' : undefined }} />
          ))}
        </div>
      )}
    </footer>
  );
}
