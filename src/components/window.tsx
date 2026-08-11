import { type ReactNode, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { APPS } from '../lib/constants';
import { Icon } from './ui';
import { sfx } from '../lib/sounds';

interface Props {
  id: string;
  appId: string;
  title: string;
  children: ReactNode;
}

export function WindowFrame({ id, appId, title, children }: Props) {
  const win = useVox((s) => s.windows.find((w) => w.id === id));
  const active = useVox((s) => s.activeWindowId === id);
  const closeWindow = useVox((s) => s.closeWindow);
  const minimizeWindow = useVox((s) => s.minimizeWindow);
  const maximizeWindow = useVox((s) => s.maximizeWindow);
  const focusWindow = useVox((s) => s.focusWindow);
  const moveWindow = useVox((s) => s.moveWindow);
  const resizeWindow = useVox((s) => s.resizeWindow);
  const reduced = useVox((s) => s.settings.reducedMotion);

  const [closing, setClosing] = useState(false);
  const [mining, setMining] = useState(false);
  const drag = useRef<{ kind: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; dir?: string } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, kind: 'move' | 'resize', dir?: string) => {
      if (e.button !== 0) return;
      e.preventDefault();
      focusWindow(id);
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      drag.current = { kind, startX: e.clientX, startY: e.clientY, origX: win?.x ?? 0, origY: win?.y ?? 0, origW: win?.w ?? 600, origH: win?.h ?? 400, dir };
      const onMove = (ev: PointerEvent) => {
        const d = drag.current;
        if (!d || !win) return;
        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;
        if (d.kind === 'move') {
          moveWindow(id, Math.max(-d.origW + 140, d.origX + dx), Math.max(0, d.origY + dy));
        } else if (d.dir) {
          let { origW, origH, origX, origY } = d;
          let w = origW, h = origH, x = origX, y = origY;
          if (d.dir.includes('e')) w = Math.max(360, origW + dx);
          if (d.dir.includes('s')) h = Math.max(240, origH + dy);
          if (d.dir.includes('w')) { w = Math.max(360, origW - dx); x = origX + (origW - w); }
          if (d.dir.includes('n')) { h = Math.max(240, origH - dy); y = origY + (origH - h); }
          resizeWindow(id, w, h);
          if (x !== origX || y !== origY) moveWindow(id, x, y);
        }
      };
      const onUp = () => {
        drag.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [win, id, focusWindow, moveWindow, resizeWindow],
  );

  if (!win) return null;
  const app = APPS.find((a) => a.id === appId);
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const style = win.maximized
    ? { left: 0, top: 0, width: maxW, height: maxH }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  const handleClose = () => {
    setClosing(true);
    sfx.close();
    setTimeout(() => closeWindow(id), 150);
  };
  const handleMin = () => {
    setMining(true);
    setTimeout(() => { minimizeWindow(id); setMining(false); }, 180);
  };

  if (win.minimized) return null;

  return (
    <section
      role="dialog"
      aria-label={title}
      aria-modal="false"
      data-focused={active}
      onPointerDown={() => focusWindow(id)}
      className={clsx(
        'absolute flex flex-col rounded-xl overflow-hidden border transition-[box-shadow,opacity,transform] duration-150',
        closing && 'win-exit',
        mining && 'win-min',
        active ? 'border-white/15 shadow-panel' : 'border-white/[0.06] opacity-80',
        !active && 'brightness-[0.82]',
      )}
      style={{ ...style, zIndex: win.z, background: 'rgba(10,12,19,0.92)', backdropFilter: 'blur(18px)', boxShadow: active ? '0 24px 70px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(34,211,238,0.08)' : '0 18px 50px -20px rgba(0,0,0,0.7)' }}
    >
      {/* title bar */}
      <header
        className="h-9 flex items-center gap-2 px-3 border-b border-vox-line shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ background: 'linear-gradient(180deg, rgba(148,163,184,0.06), transparent)' }}
        onPointerDown={(e) => onPointerDown(e, 'move')}
        onDoubleClick={() => { sfx.command(); maximizeWindow(id); }}
      >
        {app && <span className="text-vox-cyan"><Icon name={app.icon} size={13} /></span>}
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-vox-muted truncate">{title}</span>
        <span className={clsx('ml-1 hud-label !text-[8px] px-1 py-px rounded border', active ? 'text-cyan-300 border-cyan-400/30 bg-cyan-400/5' : 'text-vox-dim border-white/10')}>
          {active ? 'FOCUSED' : 'BACKGROUND'}
        </span>
        <div className="ml-auto flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
          <button aria-label="Minimize" title="Minimize" onClick={handleMin} className="p-1.5 rounded hover:bg-white/10 text-vox-muted hover:text-vox-text"><Icon name="Minus" size={13} /></button>
          <button aria-label="Maximize" title="Maximize" onClick={() => { sfx.command(); maximizeWindow(id); }} className="p-1.5 rounded hover:bg-white/10 text-vox-muted hover:text-vox-text"><Icon name={win.maximized ? 'Copy' : 'Square'} size={11} /></button>
          <button aria-label="Close" title="Close" onClick={handleClose} className="p-1.5 rounded hover:bg-red-500/80 hover:text-white text-vox-muted"><Icon name="X" size={13} /></button>
        </div>
      </header>

      {/* body */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {children}
        {/* resize handles */}
        {!win.maximized && (
          <>
            <span data-resize="n" onPointerDown={(e) => onPointerDown(e, 'resize', 'n')} className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" />
            <span data-resize="s" onPointerDown={(e) => onPointerDown(e, 'resize', 's')} className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" />
            <span data-resize="e" onPointerDown={(e) => onPointerDown(e, 'resize', 'e')} className="absolute top-2 bottom-2 right-0 w-1 cursor-e-resize" />
            <span data-resize="w" onPointerDown={(e) => onPointerDown(e, 'resize', 'w')} className="absolute top-2 bottom-2 left-0 w-1 cursor-w-resize" />
            <span data-resize="se" onPointerDown={(e) => onPointerDown(e, 'resize', 'se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />
            <span data-resize="sw" onPointerDown={(e) => onPointerDown(e, 'resize', 'sw')} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" />
            <span data-resize="ne" onPointerDown={(e) => onPointerDown(e, 'resize', 'ne')} className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" />
            <span data-resize="nw" onPointerDown={(e) => onPointerDown(e, 'resize', 'nw')} className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" />
          </>
        )}
      </div>
    </section>
  );
}
