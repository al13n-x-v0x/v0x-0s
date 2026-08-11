import { type ReactNode, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import * as Icons from 'lucide-react';
import { sfx } from '../lib/sounds';

// ---- Icon -------------------------------------------------------------
export function Icon({ name, size = 15, className, strokeWidth = 1.8 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>)[name] ?? Icons.Circle;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
}

// ---- Button -----------------------------------------------------------
type BtnVariant = 'default' | 'cyan' | 'solid' | 'violet' | 'danger' | 'ghost';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  icon?: string;
  size?: 'xs' | 'sm' | 'md';
  silent?: boolean;
}
export function Button({ variant = 'default', icon, size = 'sm', className, children, silent, onClick, ...rest }: BtnProps) {
  return (
    <button
      className={clsx(
        'vox-btn',
        variant === 'cyan' && 'vox-btn-cyan',
        variant === 'solid' && 'vox-btn-solid',
        variant === 'violet' && 'vox-btn-violet',
        variant === 'danger' && 'vox-btn-danger',
        variant === 'ghost' && 'vox-btn-ghost',
        size === 'xs' && '!px-2 !py-1 !text-[10.5px]',
        size === 'md' && '!px-4 !py-2 !text-[12.5px]',
        className,
      )}
      onClick={(e) => {
        if (!silent) sfx.command();
        onClick?.(e);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'xs' ? 11 : 13} />}
      {children}
    </button>
  );
}

export function IconButton({ name, label, onClick, active, className, size = 15 }: { name: string; label: string; onClick?: () => void; active?: boolean; className?: string; size?: number }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => { sfx.command(); onClick?.(); }}
      className={clsx(
        'flex items-center justify-center rounded-md p-1.5 transition-colors',
        active ? 'text-vox-cyan bg-vox-cyan/10' : 'text-vox-muted hover:text-vox-text hover:bg-white/5',
        className,
      )}
    >
      <Icon name={name} size={size} />
    </button>
  );
}

// ---- Panel ------------------------------------------------------------
export function Panel({ title, icon, actions, children, className, bodyClassName, footer, glow }: { title?: string; icon?: string; actions?: ReactNode; children?: ReactNode; className?: string; bodyClassName?: string; footer?: ReactNode; glow?: 'cyan' | 'violet' | 'blue' }) {
  return (
    <section className={clsx('glass hud-border flex flex-col min-w-0', glow === 'cyan' && 'glow-cyan', glow === 'violet' && 'glow-violet', glow === 'blue' && 'glow-blue', className)}>
      {title && (
        <header className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-vox-line shrink-0">
          {icon && <Icon name={icon} size={13} className="text-vox-cyan" />}
          <h2 className="panel-title">{title}</h2>
          <div className="ml-auto flex items-center gap-1.5">{actions}</div>
        </header>
      )}
      <div className={clsx('p-4 flex-1 min-h-0 overflow-auto', bodyClassName)}>{children}</div>
      {footer && <footer className="px-4 py-2.5 border-t border-vox-line text-[11px] text-vox-dim shrink-0 flex items-center gap-2">{footer}</footer>}
    </section>
  );
}

// ---- Badge ------------------------------------------------------------
export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'cyan' | 'green' | 'amber' | 'red' | 'violet' | 'blue' | 'dim'; className?: string }) {
  const tones: Record<string, string> = {
    default: 'bg-white/5 text-vox-muted border-white/10',
    cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/25',
    green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    red: 'bg-red-400/10 text-red-300 border-red-400/25',
    violet: 'bg-violet-400/10 text-violet-300 border-violet-400/25',
    blue: 'bg-blue-400/10 text-blue-300 border-blue-400/25',
    dim: 'bg-white/5 text-vox-dim border-white/10',
  };
  return <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] font-semibold tracking-[0.08em] uppercase', tones[tone], className)}>{children}</span>;
}

export function StatusDot({ tone, pulse }: { tone: 'online' | 'cyan' | 'violet' | 'amber' | 'red' | 'dim'; pulse?: boolean }) {
  return (
    <span className="relative inline-flex">
      <span className={clsx('dot', `dot-${tone}`, pulse && 'dot-pulse')} />
    </span>
  );
}

// ---- Toggle -----------------------------------------------------------
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { sfx.command(); onChange(!checked); }}
      className={clsx(
        'relative w-9 h-5 rounded-full transition-colors shrink-0 border',
        checked ? 'bg-cyan-400/25 border-cyan-400/50' : 'bg-white/5 border-white/10',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span className={clsx('absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full transition-all', checked ? 'left-[18px] bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'left-[3px] bg-vox-dim')} />
    </button>
  );
}

// ---- Slider -----------------------------------------------------------
export function Slider({ value, onChange, min = 0, max = 100, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  return (
    <input
      type="range"
      min={min} max={max} step={step} value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 appearance-none rounded-full bg-white/10 accent-cyan-400 cursor-pointer"
      style={{ accentColor: '#22d3ee' }}
    />
  );
}

// ---- Inputs -----------------------------------------------------------
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx('vox-input', className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx('vox-input vox-select cursor-pointer', className)} {...rest}>{children}</select>;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx('vox-input resize-none', className)} {...rest} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="hud-label block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[10.5px] text-vox-dim">{hint}</span>}
    </label>
  );
}

// ---- Tabs -------------------------------------------------------------
export function Tabs<T extends string>({ tabs, active, onChange, className, size = 'sm' }: { tabs: { id: T; label: string; icon?: string }[]; active: T; onChange: (t: T) => void; className?: string; size?: 'sm' | 'xs' }) {
  return (
    <div className={clsx('flex items-center gap-0.5 border-b border-vox-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          data-active={active === t.id}
          onClick={() => { sfx.command(); onChange(t.id); }}
          className={clsx('vox-tab', size === 'xs' && '!text-[10px] !px-2.5 !py-1.5', 'flex items-center gap-1.5')}
        >
          {t.icon && <Icon name={t.icon} size={11} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---- Modal ------------------------------------------------------------
export function Modal({ open, onClose, title, subtitle, children, footer, width = 520, icon }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: number; icon?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="vox-overlay flex items-start justify-center pt-[12vh] px-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="vox-pop glass hud-border w-full flex flex-col max-h-[80vh]" style={{ maxWidth: width }}>
        <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-vox-line">
          {icon && <span className="mt-0.5 text-vox-cyan"><Icon name={icon} size={18} /></span>}
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-[13px] tracking-[0.12em] uppercase">{title}</h2>
            {subtitle && <p className="text-[11px] text-vox-muted mt-0.5">{subtitle}</p>}
          </div>
          <button aria-label="Close" onClick={() => { sfx.close(); onClose(); }} className="ml-auto p-1 rounded-md text-vox-muted hover:text-vox-text hover:bg-white/5">
            <Icon name="X" size={16} />
          </button>
        </header>
        <div className="px-5 py-4 overflow-auto flex-1">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-vox-line flex items-center justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  );
}

// ---- Confirm dialog -----------------------------------------------------
export function ConfirmDialog({ open, title, body, confirmLabel = 'CONFIRM', danger, onConfirm, onCancel }: { open: boolean; title: string; body: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width={400} icon={danger ? 'TriangleAlert' : 'Info'}>
      <p className="text-[12.5px] text-vox-muted leading-relaxed">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>CANCEL</Button>
        <Button variant={danger ? 'danger' : 'cyan'} onClick={() => { onConfirm(); onCancel(); }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ---- Status / empty / error states ---------------------------------------
export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full border border-vox-line flex items-center justify-center text-vox-dim mb-4">
        <Icon name={icon} size={20} />
      </div>
      <h3 className="font-display text-[12px] font-semibold tracking-[0.16em] uppercase text-vox-text">{title}</h3>
      <p className="text-[12px] text-vox-muted mt-2 max-w-sm leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry, actions }: { title: string; body: string; onRetry?: () => void; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full border border-red-400/30 bg-red-400/5 flex items-center justify-center text-red-300 mb-4">
        <Icon name="TriangleAlert" size={20} />
      </div>
      <h3 className="font-display text-[12px] font-semibold tracking-[0.16em] uppercase text-red-300">{title}</h3>
      <p className="text-[12px] text-vox-muted mt-2 max-w-md leading-relaxed">{body}</p>
      {(onRetry || actions) && (
        <div className="mt-5 flex items-center gap-2">
          {onRetry && <Button variant="cyan" icon="RefreshCw" onClick={onRetry}>RETRY</Button>}
          {actions}
        </div>
      )}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3" role="status">
      <span className="relative inline-flex w-4 h-4">
        <span className="absolute inset-0 rounded-full border-2 border-vox-cyan/20 border-t-vox-cyan animate-spin" />
      </span>
      {label && <span className="hud-label">{label}</span>}
    </div>
  );
}

// ---- Section header -------------------------------------------------------
export function SectionHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && <p className="hud-label mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase leading-none">{title}</h1>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-[10px] font-mono text-vox-muted">{children}</kbd>;
}

// ---- Progress bar -----------------------------------------------------------
export function Progress({ value, color = '#22d3ee', label }: { value: number; color?: string; label?: string }) {
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-[10px] font-mono text-vox-dim mb-1"><span>{label}</span><span>{Math.round(value)}%</span></div>}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, value)}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: `0 0 8px ${color}44` }} />
      </div>
    </div>
  );
}

// ---- Auto-scroll hook ---------------------------------------------------------
export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
