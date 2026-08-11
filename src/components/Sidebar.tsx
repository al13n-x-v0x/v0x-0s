import clsx from 'clsx';
import { useVox } from '../lib/store';
import { NAV, SYS_NAV } from '../lib/constants';
import { Icon } from './ui';
import { sfx } from '../lib/sounds';

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const section = useVox((s) => s.section);
  const setSection = useVox((s) => s.setSection);
  const desktopMode = useVox((s) => s.desktopMode);
  const health = useVox((s) => s.health);
  const profile = useVox((s) => s.profile);
  const backend = useVox((s) => s.backend);
  const os = useVox((s) => s.os);
  const telemetry = useVox((s) => s.telemetry);
  const last = telemetry[telemetry.length - 1];

  const item = (id: (typeof NAV)[number]['id'], label: string, icon: string, badge?: string) => (
    <button
      key={id}
      data-active={section === id && !desktopMode}
      onClick={() => { sfx.command(); setSection(id); onCloseMobile(); }}
      className={clsx(
        'vox-nav-btn group w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-left transition-all',
        section === id && !desktopMode
          ? 'bg-cyan-400/10 text-cyan-200 border-l-2 border-cyan-400 shadow-[inset_0_0_18px_-8px_rgba(34,211,238,0.4)]'
          : 'text-vox-muted hover:text-vox-text hover:bg-white/[0.04] border-l-2 border-transparent',
      )}
    >
      <Icon name={icon} size={15} className={section === id && !desktopMode ? 'text-vox-cyan' : 'text-vox-dim group-hover:text-vox-muted'} />
      <span className="text-[12px] font-medium tracking-[0.02em]">{label}</span>
      {badge && <span className="ml-auto px-1.5 py-0.5 rounded bg-violet-400/15 text-violet-300 border border-violet-400/30 text-[8.5px] font-bold tracking-wider">{badge}</span>}
    </button>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onCloseMobile} aria-hidden />}
      <aside
        className={clsx(
          'w-[212px] shrink-0 flex flex-col border-r border-vox-line bg-ink-900/85 backdrop-blur-xl z-50 lg:z-30',
          mobileOpen ? 'drawer-in translate-x-0' : '-translate-x-full lg:translate-x-0',
          'vox-drawer lg:static lg:top-auto lg:bottom-auto lg:h-auto',
        )}
        aria-label="Navigation"
      >
        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <p className="hud-label px-3 pb-1.5">Workspace</p>
          <nav className="space-y-0.5">{NAV.map((n) => item(n.id, n.label, n.icon, n.badge))}</nav>
          <p className="hud-label px-3 pt-5 pb-1.5">System</p>
          <nav className="space-y-0.5">{SYS_NAV.map((n) => item(n.id, n.label, n.icon, n.badge))}</nav>
        </div>

        {/* VOX core status */}
        <div className="px-3 pb-3 pt-2 border-t border-vox-line">
          <div className="glass-inset px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-vox-cyan"><Icon name="Orbit" size={13} /></span>
              <span className="font-display text-[10px] font-bold tracking-[0.2em] text-vox-text">VOX-OS CORE</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="dot dot-online" />
              <span className="text-[9.5px] font-mono tracking-[0.14em] text-emerald-300">SYSTEM ONLINE</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Icon name="Monitor" size={11} className="text-vox-dim" />
              <span className="text-[8.5px] font-mono tracking-[0.1em] text-vox-dim truncate">{os.name}{os.arch !== 'unknown' ? ` · ${os.arch.toUpperCase()}` : ''}</span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div>
                <div className="flex justify-between text-[8.5px] font-mono text-vox-dim mb-0.5"><span>CPU</span><span>{last ? `${last.cpu}%` : '—'}</span></div>
                <div className="h-[3px] rounded-full bg-white/8 overflow-hidden"><div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${last?.cpu ?? 0}%`, boxShadow: '0 0 6px rgba(34,211,238,0.6)' }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-[8.5px] font-mono text-vox-dim mb-0.5"><span>RAM</span><span>{last ? `${last.ram}%` : '—'}</span></div>
                <div className="h-[3px] rounded-full bg-white/8 overflow-hidden"><div className="h-full rounded-full bg-violet-400/80" style={{ width: `${last?.ram ?? 0}%`, boxShadow: '0 0 6px rgba(139,92,246,0.6)' }} /></div>
              </div>
            </div>
          </div>

          {/* profile */}
          <button
            onClick={() => { sfx.command(); setSection('profile'); }}
            className="mt-2.5 w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5 text-left"
          >
            <span className="relative shrink-0">
              <span className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[13px] text-white border border-violet-400/50"
                style={{ background: `linear-gradient(135deg, hsl(${profile.avatarHue} 70% 42%), hsl(${profile.avatarHue + 40} 70% 30%))`, boxShadow: '0 0 12px -2px rgba(139,92,246,0.6)' }}>
                {profile.name.slice(0, 1)}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-ink-900" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11.5px] font-semibold text-vox-text truncate">{profile.name}</span>
              <span className="block text-[9px] text-vox-dim tracking-wide uppercase">{profile.role}</span>
            </span>
            <Icon name="ChevronRight" size={12} className="ml-auto text-vox-dim" />
          </button>

          {backend === 'offline' && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-400/5 border border-amber-400/20">
              <Icon name="WifiOff" size={11} className="text-amber-400" />
              <span className="text-[9px] text-amber-300/90">Backend offline — AI/GitHub require the VOX server</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
