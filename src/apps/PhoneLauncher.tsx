import { useMemo, useState } from 'react';
import { useVox } from '../lib/store';
import { LAUNCHER } from '../lib/constants';
import { Icon } from '../components/ui';
import { sfx } from '../lib/sounds';

export function PhoneLauncher() {
  const setSection = useVox((s) => s.setSection);
  const section = useVox((s) => s.section);
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return LAUNCHER;
    return LAUNCHER.filter(
      (a) => a.label.toLowerCase().includes(query) || a.blurb.toLowerCase().includes(query),
    );
  }, [q]);

  const rows = useMemo(() => {
    const out: (typeof LAUNCHER[number])[][] = [];
    for (let i = 0; i < items.length; i += 4) out.push(items.slice(i, i + 4));
    return out;
  }, [items]);

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto animate-fade-in">
      {/* search */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-ink-950/70 backdrop-blur-xl">
        <div className="glass-inset flex items-center gap-2.5 px-3.5 h-11 rounded-2xl border border-vox-line focus-within:border-vox-cyan/50 transition-colors">
          <Icon name="Search" size={16} className="text-vox-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search apps…"
            className="flex-1 bg-transparent outline-none text-[14px] text-vox-text placeholder:text-vox-dim"
            aria-label="Search apps"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="p-1 rounded-md text-vox-dim hover:text-vox-text">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* launcher grid — 4 columns, phone-launcher style */}
      <div className="mt-2 space-y-5">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-4 gap-y-5">
            {row.map((app) => {
              const active = section === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => { sfx.command(); setSection(app.id); }}
                  className="flex flex-col items-center gap-2 group px-1"
                  aria-label={app.label}
                >
                  <span
                    className="w-[52px] h-[52px] rounded-[18px] flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${app.tint[0]}, ${app.tint[1]})`,
                      boxShadow: active
                        ? `0 8px 24px -8px ${app.tint[1]}, 0 0 0 2px rgba(34,211,238,0.6)`
                        : `0 8px 20px -10px ${app.tint[1]}66`,
                    }}
                  >
                    <Icon name={app.icon} size={22} strokeWidth={1.7} />
                  </span>
                  <span className="text-[10.5px] font-medium text-vox-muted group-hover:text-vox-text text-center leading-tight">
                    {app.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-16 text-center">
            <Icon name="SearchX" size={28} className="text-vox-dim mx-auto" />
            <p className="mt-3 font-mono text-[11px] tracking-[0.2em] text-vox-dim uppercase">No apps match “{q}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
