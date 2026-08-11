import { useEffect, useState } from 'react';
import { useVox } from '../lib/store';
import { APP_VERSION } from '../lib/constants';
import { Icon, Kbd } from './ui';
import { fmtClock, fmtDate } from '../lib/fmt';
import { sfx } from '../lib/sounds';

export function TitleBar({ onOpenNav }: { onOpenNav?: () => void }) {
  const setPalette = useVox((s) => s.setPalette);
  const setNotifOpen = useVox((s) => s.setNotifOpen);
  const notifOpen = useVox((s) => s.notifOpen);
  const setSection = useVox((s) => s.setSection);
  const notifications = useVox((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const backend = useVox((s) => s.backend);
  const settings = useVox((s) => s.settings);
  const setSettings = useVox((s) => s.setSettings);
  const setDesktopMode = useVox((s) => s.setDesktopMode);
  const desktopMode = useVox((s) => s.desktopMode);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-vox-line bg-ink-900/80 backdrop-blur-xl z-40">
      {/* brand */}
      <button
        className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-white/5 group"
        onClick={() => { sfx.command(); setSection('dashboard'); }}
        aria-label="VOX-OS home"
      >
        <span className="w-7 h-7 rounded-lg border border-vox-cyan/30 bg-cyan-400/10 flex items-center justify-center">
          <span className="text-vox-cyan group-hover:text-glow-cyan"><Icon name="Hexagon" size={15} /></span>
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display font-bold text-[14px] tracking-[0.14em] text-white">
            VOX-OS<span className="align-super text-[8px] text-vox-dim ml-0.5">®</span>
          </span>
          <span className="hidden sm:block text-[8px] tracking-[0.3em] text-vox-violet uppercase mt-0.5">A Dev's First Choice</span>
        </span>
        <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[9px] text-vox-dim">v{APP_VERSION}</span>
      </button>

      {/* mobile nav toggle — sidebar is off-canvas below lg */}
      {onOpenNav && (
        <button
          onClick={onOpenNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5"
        >
          <Icon name="Menu" size={16} />
        </button>
      )}

      {/* command bar — full bar on desktop, compact icon on phones */}
      <button
        onClick={() => { sfx.open(); setPalette(true, 'command'); }}
        className="hidden sm:flex flex-1 max-w-[480px] h-8 mx-2 items-center gap-2.5 px-3 rounded-lg border border-vox-line bg-ink-850/80 hover:border-vox-cyan/40 hover:bg-ink-800 transition-colors group"
        aria-label="Open command palette (Ctrl+K)"
      >
        <Icon name="Terminal" size={13} className="text-vox-dim group-hover:text-vox-cyan" />
        <span className="font-mono text-[11.5px] text-vox-dim group-hover:text-vox-muted">Run command or search…</span>
        <span className="ml-auto flex items-center gap-1"><Kbd>CTRL</Kbd><Kbd>K</Kbd></span>
      </button>
      <button
        onClick={() => { sfx.open(); setPalette(true, 'command'); }}
        aria-label="Search"
        className="sm:hidden p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5 ml-auto"
      >
        <Icon name="Search" size={16} />
      </button>

      <div className="ml-auto flex items-center gap-1">
        <span className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md border border-vox-line mr-1">
          <span className={`dot ${backend === 'online' ? 'dot-online' : backend === 'offline' ? 'dot-amber' : 'dot-dim'}`} />
          <span className="font-mono text-[9.5px] tracking-[0.12em] text-vox-muted uppercase">{backend === 'online' ? 'Backend Online' : backend === 'offline' ? 'Backend Offline' : 'Detecting'}</span>
        </span>
        <button aria-label="Command palette" onClick={() => setPalette(true, 'command')} className="hidden sm:block p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5"><Icon name="Command" size={15} /></button>
        <button
          aria-label="Notifications"
          onClick={() => { sfx.command(); setNotifOpen(!notifOpen); }}
          className="relative p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5"
        >
          <Icon name="Bell" size={15} />
          {unread > 0 && <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-cyan-400 text-ink-950 text-[9px] font-bold flex items-center justify-center" style={{ boxShadow: '0 0 8px rgba(34,211,238,0.7)' }}>{unread}</span>}
        </button>
        <button aria-label="Settings" onClick={() => { sfx.command(); setSection('settings'); }} className="p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5"><Icon name="Settings" size={15} /></button>
        <button
          aria-label={desktopMode ? 'Switch to hub view' : 'Switch to desktop view'}
          title={desktopMode ? 'Hub view' : 'Desktop view'}
          onClick={() => { sfx.command(); setDesktopMode(!desktopMode); }}
          className={`hidden sm:block p-2 rounded-lg ${desktopMode ? 'text-vox-cyan bg-cyan-400/10' : 'text-vox-muted hover:text-vox-text hover:bg-white/5'}`}
        >
          <Icon name={desktopMode ? 'PanelsTopLeft' : 'Monitor'} size={15} />
        </button>
        <button
          aria-label="Toggle theme"
          onClick={() => { sfx.command(); setSettings({ theme: settings.theme === 'night' ? 'cyber' : 'night' }); }}
          className="p-2 rounded-lg text-vox-muted hover:text-vox-text hover:bg-white/5"
        >
          <Icon name={settings.theme === 'night' ? 'Sun' : 'Moon'} size={15} />
        </button>
        <div className="hidden sm:block w-px h-5 bg-vox-line mx-1" />
        <div className="hidden sm:block px-2 text-right leading-tight select-none">
          <div className="font-mono text-[12px] text-vox-text tabular-nums">{fmtClock(now)}</div>
          <div className="text-[9px] text-vox-dim">{fmtDate(now).split(',')[0]}</div>
        </div>
      </div>
    </header>
  );
}
