// Subtle WebAudio UI sounds — quiet, professional, no game-like effects.

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.18;

export function configureSound(on: boolean, vol: number) {
  enabled = on;
  volume = Math.min(0.6, Math.max(0, vol));
}

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = volume, delay = 0) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  open: () => tone(520, 0.09, 'sine', volume * 0.8),
  close: () => tone(320, 0.08, 'sine', volume * 0.6),
  command: () => tone(660, 0.07, 'triangle', volume * 0.7),
  notify: () => { tone(880, 0.09, 'sine', volume * 0.8); tone(1174, 0.12, 'sine', volume * 0.7, 0.07); },
  error: () => { tone(220, 0.16, 'sawtooth', volume * 0.5); tone(180, 0.2, 'sawtooth', volume * 0.4, 0.05); },
  success: () => { tone(660, 0.09, 'sine', volume * 0.8); tone(990, 0.14, 'sine', volume * 0.7, 0.08); },
  ai: () => { tone(740, 0.12, 'sine', volume * 0.6); tone(1110, 0.16, 'sine', volume * 0.5, 0.09); },
  boot: () => { tone(220, 0.3, 'sine', volume * 0.7); tone(440, 0.4, 'sine', volume * 0.6, 0.15); tone(880, 0.5, 'sine', volume * 0.5, 0.3); },
};
