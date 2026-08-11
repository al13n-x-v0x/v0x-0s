import { useRef, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { APPS, NAV, SYS_NAV } from '../lib/constants';
import { Icon, StatusDot, Toggle, Button } from './ui';
import { timeAgo, fmtClock, fmtDate } from '../lib/fmt';
import { sfx } from '../lib/sounds';

// ==================== NOTIFICATION CENTER ====================
export function NotificationsPanel() {
  const open = useVox((s) => s.notifOpen);
  const setOpen = useVox((s) => s.setNotifOpen);
  const notifications = useVox((s) => s.notifications);
  const markRead = useVox((s) => s.markNotifsRead);
  const dismiss = useVox((s) => s.dismissNotif);
  const clearAll = useVox((s) => s.clearNotifs);
  const setSection = useVox((s) => s.setSection);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div ref={ref} className="fixed top-12 right-16 z-[90] w-[380px] glass hud-border vox-pop flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
      <header className="flex items-center px-4 py-3 border-b border-vox-line">
        <h2 className="panel-title">Notification Center</h2>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={markRead} className="text-[10px] text-vox-dim hover:text-vox-text">MARK READ</button>
          <button onClick={clearAll} className="text-[10px] text-vox-dim hover:text-red-300">CLEAR</button>
        </div>
      </header>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 && <p className="text-center text-[12px] text-vox-dim py-10">No notifications. Everything is quiet.</p>}
        {notifications.map((n) => (
          <div key={n.id} className={clsx('px-4 py-3 border-b border-vox-line/60 hover:bg-white/[0.03]', !n.read && 'bg-cyan-400/[0.04]')}>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5">
                <StatusDot tone={n.severity === 'success' ? 'online' : n.severity === 'warning' ? 'amber' : n.severity === 'error' ? 'red' : 'cyan'} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.14em] text-vox-text">{n.title}</span>
                  <span className="ml-auto text-[9px] font-mono text-vox-dim shrink-0">{timeAgo(n.time)}</span>
                  <button aria-label="Dismiss" onClick={() => dismiss(n.id)} className="text-vox-dim hover:text-vox-text"><Icon name="X" size={11} /></button>
                </div>
                <p className="text-[11.5px] text-vox-muted mt-1 leading-relaxed">{n.body}</p>
                {n.action && (
                  <button onClick={() => { setOpen(false); setSection(n.action!.section); }} className="mt-2 text-[10px] font-semibold tracking-[0.1em] text-cyan-300 hover:text-glow-cyan">
                    {n.action.label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== QUICK SETTINGS ====================
export function QuickSettings() {
  const open = useVox((s) => s.quickOpen);
  const setOpen = useVox((s) => s.setQuickOpen);
  const settings = useVox((s) => s.settings);
  const setSettings = useVox((s) => s.setSettings);
  const systemInfo = useVox((s) => s.systemInfo);
  const backend = useVox((s) => s.backend);
  const setSection = useVox((s) => s.setSection);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  if (!open) return null;
  const tray = [
    { label: 'Network', on: systemInfo.network.connected, icon: 'Wifi', note: systemInfo.network.connected ? systemInfo.network.type : 'OFFLINE', action: () => setSection('performance') },
    { label: 'Dark Mode', on: true, icon: 'Moon', note: settings.theme.toUpperCase(), action: () => setSettings({ theme: settings.theme === 'night' ? 'cyber' : 'night' }) },
    { label: 'VOX Voice', on: settings.voiceEnabled, icon: 'Mic', note: 'SPEECH ENGINE', action: () => setSection('voice') },
    { label: 'Desktop Agent', on: systemInfo.agent === 'connected', icon: 'Bot', note: systemInfo.agent === 'connected' ? 'CONNECTED' : 'NOT CONNECTED', action: () => setSection('agent') },
    { label: 'Sound Effects', on: settings.sound, icon: 'Volume2', note: 'UI AUDIO', action: () => setSettings({ sound: !settings.sound }) },
    { label: 'Backend', on: backend === 'online', icon: 'Server', note: backend.toUpperCase(), action: () => useVox.getState().pingBackendNow() },
  ];

  return (
    <div ref={ref} className="fixed bottom-16 right-3 z-[90] w-[340px] glass hud-border vox-pop overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-vox-line">
        <h2 className="panel-title">Quick Settings</h2>
        <span className="ml-auto font-mono text-[10px] text-vox-dim">{fmtClock()} · {fmtDate().split(',')[0]}</span>
      </header>
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {tray.map((t) => (
          <button key={t.label} onClick={() => { sfx.command(); t.action(); }} className="glass-inset flex flex-col items-start gap-1.5 px-3 py-2.5 hover:bg-white/[0.04] text-left rounded-lg">
            <span className="flex items-center justify-between w-full">
              <Icon name={t.icon} size={14} className={t.on ? 'text-vox-cyan' : 'text-vox-dim'} />
              <span className={clsx('w-1.5 h-1.5 rounded-full', t.on ? 'bg-emerald-400' : 'bg-vox-dim')} />
            </span>
            <span className="text-[11px] font-semibold text-vox-text">{t.label}</span>
            <span className="text-[8.5px] font-mono tracking-wider text-vox-dim uppercase">{t.note}</span>
          </button>
        ))}
      </div>
      <div className="px-4 pb-3 pt-1">
        <Button variant="ghost" size="xs" icon="Settings" className="w-full justify-center" onClick={() => { setOpen(false); setSection('settings'); }}>ALL SETTINGS</Button>
      </div>
    </div>
  );
}

// ==================== START MENU ====================
export function StartMenu() {
  const open = useVox((s) => s.startOpen);
  const setOpen = useVox((s) => s.setStartOpen);
  const openApp = useVox((s) => s.openApp);
  const setSection = useVox((s) => s.setSection);
  const commandHistory = useVox((s) => s.commandHistory);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  if (!open) return null;

  const pinned = ['code', 'terminal', 'voxai', 'github', 'files', 'projects'];
  const sysApps = ['health', 'performance', 'taskmanager', 'systeminfo', 'settings', 'devtools', 'eventlog', 'errors'];

  const filter = (list: { id: string; title: string; icon: string; run: () => void }[]) =>
    list.filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()));

  const render = (list: { id: string; title: string; icon: string; run: () => void }[]) => (
    <div className="grid grid-cols-4 gap-1">
      {filter(list).map((a) => (
        <button key={a.id} onClick={() => { sfx.open(); setOpen(false); a.run(); }} className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl hover:bg-white/5 group">
          <span className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-vox-muted group-hover:text-vox-cyan group-hover:border-cyan-400/30 transition-colors">
            <Icon name={a.icon} size={16} />
          </span>
          <span className="text-[9.5px] text-vox-muted group-hover:text-vox-text">{a.title}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div ref={ref} className="fixed bottom-[60px] left-3 z-[90] w-[520px] max-w-[92vw] glass hud-border vox-pop overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 glass-inset px-3 py-2">
          <Icon name="Search" size={13} className="text-vox-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications…" className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-vox-dim" autoFocus />
        </div>
      </div>
      <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <p className="hud-label pb-1.5">Pinned</p>
          {render(pinned.map((id) => { const app = APPS.find((a) => a.id === id)!; return { id, title: app.title, icon: app.icon, run: () => openApp(id) }; }))}
        </div>
        <div>
          <p className="hud-label pb-1.5">System</p>
          {render(sysApps.map((id) => { const app = APPS.find((a) => a.id === id)!; return { id, title: app.title, icon: app.icon, run: () => setSection(app.section) }; }))}
        </div>
        <div>
          <p className="hud-label pb-1.5">Views</p>
          <div className="grid grid-cols-4 gap-1">
            {[...NAV, ...SYS_NAV].filter((n) => !['dashboard', 'settings'].includes(n.id)).filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase())).map((n) => (
              <button key={n.id} onClick={() => { setOpen(false); setSection(n.id); }} className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl hover:bg-white/5 group">
                <span className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-vox-muted group-hover:text-vox-violet transition-colors"><Icon name={n.icon} size={15} /></span>
                <span className="text-[9.5px] text-vox-muted text-center leading-tight">{n.label}</span>
              </button>
            ))}
          </div>
        </div>
        {commandHistory.length > 0 && (
          <div>
            <p className="hud-label pb-1.5">Recent Commands</p>
            <div className="space-y-0.5">
              {commandHistory.slice(0, 5).map((c) => (
                <button key={c.id} onClick={() => { setOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left">
                  <Icon name="History" size={11} className="text-vox-dim" />
                  <span className="font-mono text-[11.5px] text-vox-muted">{c.command}</span>
                  <span className="ml-auto text-[9px] text-vox-dim">{timeAgo(c.time)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="px-4 py-2 border-t border-vox-line flex items-center gap-2">
        <span className="dot dot-online" />
        <span className="text-[9.5px] font-mono text-vox-dim tracking-wider">VOX-OS · A DEV'S FIRST CHOICE</span>
        <button onClick={() => { setOpen(false); setSection('profile'); }} className="ml-auto flex items-center gap-1.5 text-vox-muted hover:text-vox-text">
          <Icon name="UserRound" size={12} /><span className="text-[10px]">AL13N</span>
        </button>
      </footer>
    </div>
  );
}

// ==================== CONTEXT MENU ====================
export function ContextMenu() {
  const menu = useVox((s) => s.contextMenu);
  const setMenu = useVox((s) => s.setContextMenu);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu, setMenu]);

  if (!menu) return null;
  const { x, y, items } = menu;
  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[200] min-w-[200px] glass hud-border vox-pop p-1"
      style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y, window.innerHeight - items.length * 34 - 20) }}
      role="menu"
    >
      {items.map((it, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={() => { sfx.command(); setMenu(null); it.run(); }}
          className={clsx('w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-[12px]', it.danger ? 'text-red-300 hover:bg-red-400/10' : 'text-vox-text hover:bg-white/5')}
        >
          {it.icon && <Icon name={it.icon} size={13} className={it.danger ? 'text-red-400' : 'text-vox-dim'} />}
          {it.label}
        </button>
      ))}
    </div>
  );
}
