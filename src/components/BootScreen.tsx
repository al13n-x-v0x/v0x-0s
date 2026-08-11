import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { APP_VERSION } from '../lib/constants';
import { Button } from './ui';

const ENGINES = ['AI ENGINE', 'PROJECT ENGINE', 'GITHUB', 'HEALTH ENGINE', 'SECURITY', 'VOICE ENGINE'];

export function BootScreen() {
  const booting = useVox((s) => s.booting);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!booting) return;
    setProgress(0); setReady(0); setShowWelcome(false);
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(iv); return 100; }
        return Math.min(100, p + Math.random() * 9);
      });
    }, 90);
    const iv2 = setInterval(() => {
      setReady((r) => (r >= ENGINES.length ? r : r + 1));
    }, 300);
    const t = setTimeout(() => setShowWelcome(true), 2100);
    return () => { clearInterval(iv); clearInterval(iv2); clearTimeout(t); };
  }, [booting]);

  if (!booting) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-ink-950 vox-stage">
      <div className="vox-grid" />
      <div className="vox-aurora" />
      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-11 h-11 rounded-xl border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center text-vox-cyan animate-float" style={{ boxShadow: '0 0 24px -6px rgba(34,211,238,0.5)' }}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M9 22 L16 8 L23 22" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M12.5 16.5 h7" stroke="#8b5cf6" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-[0.3em] text-white">VOX-OS</h1>
            <p className="text-[9px] tracking-[0.42em] text-vox-violet uppercase mt-1">A Dev's First Choice</p>
          </div>
        </div>

        <div className="w-[360px]">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-[10px] tracking-[0.24em] text-vox-muted">INITIALIZING CORE…</span>
            <span className="font-mono text-[10px] text-cyan-300">{Math.floor(progress)}%</span>
          </div>
          <div className="h-[5px] rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #8b5cf6)', boxShadow: '0 0 12px rgba(34,211,238,0.7)' }} />
          </div>

          <div className="mt-6 space-y-1.5 font-mono text-[10px]">
            {ENGINES.map((e, i) => (
              <div key={e} className="flex items-center gap-2">
                <span className="w-[120px] text-vox-dim tracking-[0.14em]">{e}</span>
                <span className="flex-1 h-px bg-white/5 relative overflow-hidden">
                  {i < ready && <span className="absolute inset-0 bg-cyan-400/40" style={{ animation: 'shimmer 1.4s linear infinite', background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)', backgroundSize: '200% 100%' }} />}
                </span>
                <span className={clsx('w-[52px] text-right tracking-[0.14em]', i < ready ? 'text-emerald-300' : 'text-vox-dim')}>{i < ready ? 'ONLINE' : '·······'}</span>
              </div>
            ))}
          </div>

          {showWelcome && (
            <div className="mt-8 text-center animate-fade-in">
              <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300 text-glow-cyan">SYSTEM READY</p>
              <p className="mt-2 text-[10px] tracking-[0.2em] text-vox-muted">WELCOME BACK, DEVELOPER.</p>
            </div>
          )}
        </div>
        <span className="absolute -bottom-12 font-mono text-[9px] text-vox-dim tracking-widest">v{APP_VERSION} · {navigator.platform}</span>
      </div>
    </div>
  );
}

export function RecoveryScreen() {
  const recovery = useVox((s) => s.recovery);
  const setRecovery = useVox((s) => s.setRecovery);
  const setSafeMode = useVox((s) => s.setSafeMode);
  const resetUI = useVox((s) => s.resetUI);
  const setSection = useVox((s) => s.setSection);
  if (!recovery) return null;
  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center bg-ink-950 vox-stage">
      <div className="glass hud-border w-[460px] p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-amber-400"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg></span>
          <h2 className="font-display text-[15px] font-bold tracking-[0.16em] uppercase">VOX-OS Recovery Mode</h2>
        </div>
        <p className="text-[12.5px] text-vox-muted leading-relaxed mb-5">The shell encountered a problem. Your projects and files are safe — choose how to continue.</p>
        <div className="space-y-2">
          <Button variant="cyan" className="w-full justify-between" onClick={() => { setRecovery(false); window.location.reload(); }}>RELOAD SHELL <span>↻</span></Button>
          <Button className="w-full justify-between" onClick={() => { setSafeMode(true); setRecovery(false); }}>SAFE MODE <span>· minimal UI, no extensions</span></Button>
          <Button className="w-full justify-between" onClick={() => { resetUI(); setRecovery(false); }}>RESET UI STATE <span>· keep data</span></Button>
          <Button variant="ghost" className="w-full justify-between" onClick={() => { setRecovery(false); setSection('eventlog'); }}>VIEW ERROR LOG <span>→</span></Button>
        </div>
      </div>
    </div>
  );
}
