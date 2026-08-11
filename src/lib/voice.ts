import { sttSupported, ttsSupported } from './telemetry';

export interface VoiceCapabilities {
  stt: boolean;
  tts: boolean;
  recognition: SpeechRecognitionLike | null;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

let recognition: SpeechRecognitionLike | null = null;

export function getRecognition(): SpeechRecognitionLike | null {
  if (recognition) return recognition;
  if (!sttSupported()) return null;
  const Ctor = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike });
  const R = Ctor.SpeechRecognition ?? Ctor.webkitSpeechRecognition;
  if (!R) return null;
  const r = new R();
  r.lang = 'en-US';
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 1;
  recognition = r;
  return r;
}

let voices: SpeechSynthesisVoice[] = [];
export function refreshVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  voices = speechSynthesis.getVoices();
  return voices;
}
if (ttsSupported()) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = () => refreshVoices();
}

export function speak(text: string, opts: { speed?: number; pitch?: number; volume?: number; onEnd?: () => void; onError?: () => void } = {}): boolean {
  if (!ttsSupported()) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const preferred = voices.find((v) => /en[-_]US/i.test(v.lang) && /(google|natural|premium|samantha|zira)/i.test(v.name)) ?? voices.find((v) => /en[-_]US/i.test(v.lang));
    if (preferred) u.voice = preferred;
    u.rate = opts.speed ?? 1;
    u.pitch = opts.pitch ?? 1;
    u.volume = opts.volume ?? 1;
    u.onend = () => opts.onEnd?.();
    u.onerror = () => opts.onError?.();
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (ttsSupported()) speechSynthesis.cancel();
}
