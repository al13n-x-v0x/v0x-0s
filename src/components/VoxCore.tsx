import clsx from 'clsx';
import { useState, useEffect } from 'react';

export type CoreState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

const STATE_COLOR: Record<CoreState, string> = {
  idle: '#22d3ee',
  listening: '#34d399',
  thinking: '#a78bfa',
  speaking: '#38bdf8',
  error: '#f87171',
};

const STATE_LABEL: Record<CoreState, string> = {
  idle: 'IDLE',
  listening: 'LISTENING',
  thinking: 'THINKING',
  speaking: 'SPEAKING',
  error: 'ERROR',
};

function waveform(state: CoreState): number[] {
  if (state === 'idle') return [4, 8, 12, 16, 12, 8, 4];
  if (state === 'thinking') return [10, 18, 26, 34, 26, 18, 10];
  if (state === 'listening') return [22, 30, 26, 34, 28, 24, 20];
  if (state === 'speaking') return [26, 34, 30, 38, 32, 28, 24];
  return [6, 5, 4, 3, 4, 5, 6];
}

export function VoxCore({ state = 'idle', size = 180, showStatus = true }: { state?: CoreState; size?: number; showStatus?: boolean }) {
  const [bars, setBars] = useState<number[]>(waveform('idle'));
  const color = STATE_COLOR[state];

  useEffect(() => {
    const tick = () => setBars((b) => waveform(state).map((v, i) => v + Math.round(Math.sin(Date.now() / 160 + i * 1.1) * (state === 'idle' ? 2 : 6))));
    const iv = setInterval(tick, 90);
    return () => clearInterval(iv);
  }, [state]);

  const animated = state !== 'idle';

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        {/* outer rotating rings */}
        <svg className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '28s' }} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="none" stroke={color} strokeOpacity="0.14" strokeWidth="1" strokeDasharray="2 6" />
        </svg>
        <svg className="absolute inset-0" style={{ animation: 'spinReverse 22s linear infinite' }} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 14} fill="none" stroke={color} strokeOpacity="0.2" strokeWidth="1" strokeDasharray="26 8" strokeDashoffset="10" />
        </svg>
        <style>{`@keyframes spinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }`}</style>

        {/* pulse rings */}
        {animated && (
          <>
            <span className="absolute inset-0 rounded-full border" style={{ borderColor: `${color}44`, animation: 'pulseRing 2.2s ease-out infinite' }} />
            <span className="absolute inset-0 rounded-full border" style={{ borderColor: `${color}33`, animation: 'pulseRing 2.2s ease-out infinite 0.7s' }} />
          </>
        )}

        {/* core orb */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative rounded-full"
            style={{
              width: size * 0.34,
              height: size * 0.34,
              background: `radial-gradient(circle at 35% 30%, #ffffff66, ${color} 45%, ${color}22 100%)`,
              boxShadow: `0 0 ${size * 0.24}px ${color}55, inset 0 0 18px ${color}44`,
              animation: animated ? 'corePulse 1.6s ease-in-out infinite' : undefined,
            }}
          >
            <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, transparent 60%, rgba(255,255,255,0.18) 100%)' }} />
          </div>
        </div>

        {/* scanning line */}
        <div className="absolute inset-0 overflow-hidden rounded-full opacity-60">
          <div className="scan-line" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        </div>

        {/* waveform */}
        <div className="absolute inset-x-0 bottom-[16%] flex items-end justify-center gap-[4px] h-[26%]">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full"
              style={{
                height: `${h}%`,
                background: `linear-gradient(180deg, ${color}, ${color}22)`,
                boxShadow: `0 0 6px ${color}66`,
                transition: 'height 0.12s ease',
              }}
            />
          ))}
        </div>

        {/* corner ticks */}
        {[0, 90, 180, 270].map((deg, i) => (
          <span key={i} className="absolute w-1 h-1 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}`, top: '50%', left: '50%', transform: `rotate(${deg}deg) translateX(${size / 2 - 6}px) rotate(-${deg}deg)`, opacity: 0.7 }} />
        ))}
      </div>

      {showStatus && (
        <div className="mt-3 flex items-center gap-2">
          <span className="dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color }}>{STATE_LABEL[state]}</span>
        </div>
      )}
    </div>
  );
}

export function useCoreState(): CoreState {
  const aiStatus = useVoxStatus();
  const voice = useVoxVoice();
  if (voice.status === 'listening') return 'listening';
  if (voice.status === 'speaking') return 'speaking';
  if (aiStatus === 'thinking' || aiStatus === 'generating') return 'thinking';
  if (aiStatus === 'error' || voice.status === 'error') return 'error';
  return 'idle';
}

// small hooks to avoid circular imports — inline zustand access
import { useVox } from '../lib/store';
function useVoxStatus() { return useVox((s) => s.aiStatus); }
function useVoxVoice() { return useVox((s) => s.voice); }
