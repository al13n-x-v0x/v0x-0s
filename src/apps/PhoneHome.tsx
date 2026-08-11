import { useEffect, useRef, useState } from 'react';
import { useVox } from '../lib/store';
import { LAUNCHER } from '../lib/constants';
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

const byId = (id: string) => LAUNCHER.find((a) => a.id === id);

const DEFAULT_QUICK = ['voxai', 'terminal', 'github', 'recon', 'remote', 'settings'];
const quickOf = (list: unknown): string[] =>
  Array.isArray(list) ? (list.filter((x) => typeof x === 'string') as string[]) : DEFAULT_QUICK;

export function PhoneHome() {
  const s = useVox();
  const telemetry = s.telemetry;
  const last = telemetry[telemetry.length - 1];
  const info = s.systemInfo;
  const os = s.os;
  const health = s.health;
  const profile = s.profile;
  const setSection = s.setSection;
  const setSettings = s.setSettings;
  const [now, setNow] = useState(new Date());

  // ---- quick actions: persisted order, editable ----------
  const [order, setOrder] = useState<string[]>(() => quickOf(s.settings.phoneQuick));
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<{ mode: 'add' | 'swap'; id?: string } | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; w: number } | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const dragInfo = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const longPressFired = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!editing) setOrder(quickOf(s.settings.phoneQuick));
  }, [s.settings.phoneQuick, editing]);

  const clearPress = () => {
    if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStart.current = null;
  };

  const commitOrder = () => {
    if (dragInfo.current?.moved) setSettings({ phoneQuick: [...order] });
    dragInfo.current = null;
    setDrag(null);
  };

  const beginDrag = (id: string, e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragInfo.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
    setDrag({ id, x: rect.left, y: rect.top, w: rect.width });
  };

  const onTilePointerDown = (id: string, e: React.PointerEvent) => {
    if (editing) { beginDrag(id, e); return; }
    pressStart.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressFired.current = true;
      setEditing(true);
      if (navigator.vibrate) navigator.vibrate(14);
      beginDrag(id, e);
    }, 420);
  };

  const onTilePointerMove = (e: React.PointerEvent) => {
    // cancel long-press if the user is scrolling
    if (!editing && pressTimer.current != null && pressStart.current) {
      const dx = e.clientX - pressStart.current.x;
      const dy = e.clientY - pressStart.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 10) clearPress();
      return;
    }
    const d = dragInfo.current;
    if (!d || !drag) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 8) d.moved = true;
    if (!d.moved) return;
    setDrag({ ...drag, x: e.clientX - drag.w / 2, y: e.clientY - drag.w * 0.85 });
    // Find the tile under the pointer by rect containment (robust even when
    // the bottom tab bar overlaps the last row — elementFromPoint would hit it).
    const targets = Array.from(document.querySelectorAll('[data-qid]'));
    const target = targets.find((el) => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    const tid = target?.getAttribute('data-qid');
    if (tid && tid !== d.id) {
      setOrder((prev) => {
        const a = [...prev];
        const i = a.indexOf(d.id);
        const j = a.indexOf(tid);
        if (i < 0 || j < 0) return prev;
        [a[i], a[j]] = [a[j], a[i]];
        return a;
      });
    }
  };

  const onTilePointerUp = (id: string) => {
    if (pressTimer.current != null) { clearPress(); return; } // quick tap (not edit) — no-op
    if (dragInfo.current) {
      const moved = dragInfo.current.moved;
      const viaLongPress = longPressFired.current;
      longPressFired.current = false;
      commitOrder();
      if (!moved && editing && !viaLongPress) setPicker({ mode: 'swap', id }); // tap in edit mode → swap
      return;
    }
    if (editing) setPicker({ mode: 'swap', id });
  };

  const remove = (id: string) => {
    sfx.command();
    setOrder((prev) => prev.filter((x) => x !== id));
    setSettings({ phoneQuick: order.filter((x) => x !== id) });
  };

  const quick = order.map((id) => byId(id)).filter(Boolean) as (typeof LAUNCHER[number])[];
  const bat = info.battery;
  const batteryPct = bat != null ? Math.round(bat) : null;
  const cpu = last?.cpu ?? 0;
  const ram = last?.ram ?? 0;

  const available = picker
    ? LAUNCHER.filter((a) => (picker.mode === 'add' ? !order.includes(a.id) : a.id !== picker.id))
    : [];

  const stat = (label: string, value: string, pct: number, color: string) => (
    <div className="glass-inset rounded-2xl px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[9.5px] font-mono tracking-[0.18em] text-vox-dim uppercase">{label}</span>
        <span className="font-mono text-[15px] font-semibold text-vox-text tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-[5px] rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
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
        <div className="mt-3 font-mono text-[52px] font-bold leading-none text-white tabular-nums tracking-tight">{fmtClock(now)}</div>
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
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${batteryPct ?? 0}%`, background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
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
          style={{ background: `conic-gradient(#22d3ee ${health.score * 3.6}deg, rgba(148,163,184,0.12) 0deg)`, boxShadow: '0 0 18px -4px rgba(34,211,238,0.5)' }}
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
      <div>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="font-mono text-[9.5px] tracking-[0.26em] text-vox-dim uppercase">Quick Actions</span>
          {editing ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9.5px] tracking-[0.14em] text-vox-cyan uppercase">Drag · Tap to swap · ✕ to remove</span>
              <button
                onClick={() => { sfx.command(); setEditing(false); setSettings({ phoneQuick: order }); }}
                className="px-3 py-1 rounded-lg bg-cyan-400/15 border border-vox-cyan/40 text-vox-cyan text-[10px] font-bold tracking-[0.14em]"
              >
                DONE
              </button>
            </div>
          ) : (
            <span className="font-mono text-[8.5px] tracking-[0.18em] text-vox-dim uppercase">hold a tile to edit</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3" onPointerMove={onTilePointerMove}>
          {quick.map((a) => {
            const isDragging = drag?.id === a.id;
            return (
              <div key={a.id} data-qid={a.id} className="relative">
                <button
                  onPointerDown={(e) => onTilePointerDown(a.id, e)}
                  onPointerUp={() => onTilePointerUp(a.id)}
                  onPointerCancel={() => { clearPress(); if (dragInfo.current) commitOrder(); }}
                  className={`glass rounded-2xl px-2 py-4 flex flex-col items-center gap-2.5 transition-transform ${editing && !isDragging ? 'vox-wiggle' : ''} ${isDragging ? 'opacity-25' : ''} ${editing ? '' : 'active:scale-95'}`}
                  aria-label={a.label}
                >
                  <span
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${a.tint[0]}, ${a.tint[1]})`, boxShadow: `0 6px 16px -6px ${a.tint[1]}88` }}
                  >
                    <Icon name={a.icon} size={19} strokeWidth={1.8} />
                  </span>
                  <span className="text-[10.5px] font-medium text-vox-muted">{a.label}</span>
                </button>
                {editing && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => remove(a.id)}
                    aria-label={`Remove ${a.label}`}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-ink-950 border border-vox-red/60 text-vox-red flex items-center justify-center shadow-lg z-10"
                  >
                    <Icon name="X" size={12} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            );
          })}
          {editing && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { sfx.command(); setPicker({ mode: 'add' }); }}
              className="glass rounded-2xl px-2 py-4 flex flex-col items-center gap-2.5 border-dashed !border-vox-line-strong"
              aria-label="Add quick action"
            >
              <span className="w-11 h-11 rounded-[14px] flex items-center justify-center text-vox-dim bg-white/5">
                <Icon name="Plus" size={19} />
              </span>
              <span className="text-[10.5px] font-medium text-vox-dim">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* footer */}
      <p className="text-center font-mono text-[9px] tracking-[0.28em] text-vox-dim uppercase pb-1">
        {info.hostname} · up {info.uptime}
      </p>
      {/* keep the last tile row clear of the bottom tab bar */}
      <div className="h-2" />

      {/* floating dragged clone */}
      {drag && (
        <div
          className="fixed z-[120] pointer-events-none"
          style={{ left: drag.x, top: drag.y, width: drag.w }}
        >
          {(() => {
            const a = byId(drag.id);
            if (!a) return null;
            return (
              <div className="glass rounded-2xl px-2 py-4 flex flex-col items-center gap-2.5 opacity-90 shadow-2xl" style={{ boxShadow: `0 20px 50px -12px ${a.tint[1]}aa` }}>
                <span
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${a.tint[0]}, ${a.tint[1]})` }}
                >
                  <Icon name={a.icon} size={19} strokeWidth={1.8} />
                </span>
                <span className="text-[10.5px] font-medium text-vox-text">{a.label}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* add / swap picker */}
      {picker && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPicker(null)}>
          <div
            className="glass hud-border rounded-t-3xl w-full max-w-[560px] max-h-[65vh] flex flex-col vox-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-vox-line">
              <span className="font-display text-[12px] font-bold tracking-[0.2em] text-vox-text uppercase">
                {picker.mode === 'swap' ? `Replace ${byId(picker.id!)?.label ?? ''}` : 'Add quick action'}
              </span>
              <button onClick={() => setPicker(null)} aria-label="Close picker" className="p-2 rounded-lg text-vox-muted hover:text-vox-text">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {available.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    sfx.command();
                    if (picker.mode === 'swap' && picker.id) {
                      const next = order.map((x) => (x === picker.id ? a.id : x));
                      setOrder(next);
                      setSettings({ phoneQuick: next });
                    } else {
                      const next = [...order, a.id];
                      setOrder(next);
                      setSettings({ phoneQuick: next });
                    }
                    setPicker(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-left"
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${a.tint[0]}, ${a.tint[1]})` }}
                  >
                    <Icon name={a.icon} size={16} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium text-vox-text">{a.label}</span>
                    <span className="block text-[10.5px] text-vox-dim">{a.blurb}</span>
                  </span>
                  <Icon name="Plus" size={15} className="text-vox-cyan" />
                </button>
              ))}
              {available.length === 0 && (
                <p className="py-8 text-center font-mono text-[10.5px] tracking-[0.2em] text-vox-dim uppercase">All apps already added</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
