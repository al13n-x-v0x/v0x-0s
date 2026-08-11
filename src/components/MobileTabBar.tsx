import { useVox } from '../lib/store';
import { Icon } from './ui';
import { sfx } from '../lib/sounds';

const TABS: { id: 'dashboard' | 'apps' | 'terminal' | 'github' | 'settings'; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: 'House' },
  { id: 'apps', label: 'Apps', icon: 'LayoutGrid' },
  { id: 'terminal', label: 'Terminal', icon: 'SquareTerminal' },
  { id: 'github', label: 'GitHub', icon: 'GitBranch' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export function MobileTabBar() {
  const section = useVox((s) => s.section);
  const setSection = useVox((s) => s.setSection);
  const unread = useVox((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <nav
      aria-label="Phone navigation"
      className="lg:hidden shrink-0 z-40 border-t border-vox-line bg-ink-900/90 backdrop-blur-xl px-1 pb-1 pt-1.5"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      <div className="flex items-stretch justify-around max-w-[560px] mx-auto">
        {TABS.map((tab) => {
          const active =
            tab.id === 'dashboard'
              ? section === 'dashboard'
              : tab.id === 'apps'
                ? section === 'apps'
                : section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { sfx.command(); setSection(tab.id); }}
              className="flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all active:scale-95"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                <Icon
                  name={tab.icon}
                  size={20}
                  strokeWidth={active ? 2.1 : 1.7}
                  className={active ? 'text-vox-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-vox-dim'}
                />
                {tab.id === 'github' && unread > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-cyan-400 text-ink-950 text-[8.5px] font-bold flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </span>
              <span className={`text-[9.5px] font-medium tracking-wide ${active ? 'text-vox-cyan' : 'text-vox-dim'}`}>
                {tab.label}
              </span>
              <span
                className={`h-[3px] w-6 rounded-full transition-all ${active ? 'bg-vox-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
