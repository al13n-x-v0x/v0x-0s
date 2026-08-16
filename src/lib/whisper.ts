// ============================================================
// VOX-OS local Whisper STT bridge.
// Talks to tools/whisper-service.py (127.0.0.1:5000) for
// OFFLINE speech-to-text, falling back to the browser's Web
// Speech API when the service is unreachable.
// ============================================================

const DEFAULT_URL = 'http://127.0.0.1:5000';

let cachedStatus: { online: boolean; model?: string } | null = null;

export interface WhisperStatus {
  online: boolean;
  model?: string;
}

/** Probe the local Whisper service (cached for 15s). */
export async function checkWhisper(baseUrl = DEFAULT_URL): Promise<WhisperStatus> {
  if (cachedStatus) return cachedStatus;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${baseUrl}/status`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('bad status');
    const data = (await res.json()) as { status?: boolean; model?: string };
    cachedStatus = { online: data.status !== false, model: data.model };
  } catch {
    cachedStatus = { online: false };
  }
  setTimeout(() => { cachedStatus = null; }, 15_000);
  return cachedStatus;
}

/** Record the microphone, resolving with the audio blob (or null on abort/error).
 *  Pass stopRef to end the recording early from another caller (e.g. a STOP button). */
export async function recordWhisperAudio(
  onInterim?: (secs: number) => void,
  maxMs = 20_000,
  stopRef?: { stop: boolean }
): Promise<Blob | null> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder unavailable');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    rec.onerror = () => reject(new Error('MediaRecorder error'));
  });
  rec.start(250);
  const start = Date.now();
  const timer = setInterval(() => onInterim?.((Date.now() - start) / 1000), 500);
  await new Promise<void>((resolve) => {
    const iv = setInterval(() => {
      if (stopRef?.stop || Date.now() - start >= maxMs) { clearInterval(iv); resolve(); }
    }, 250);
  });
  clearInterval(timer);
  if (rec.state !== 'inactive') rec.stop();
  const blob = await stopped;
  stream.getTracks().forEach((t) => t.stop());
  return blob.size ? blob : null;
}

/** Encode mono float samples as a 16-bit PCM WAV (little-endian, 16 kHz).
 *  Pure — no Web Audio needed; the 16 kHz rate is what Whisper expects.
 *  Resamples from `srcRate` by nearest-neighbour picking. */
export function encodeWavPcm(mono: Float32Array, srcRate: number, rate = 16000): ArrayBuffer {
  const len = mono.length;
  const outLen = Math.max(1, Math.round((len / srcRate) * rate));
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = Math.min(len - 1, Math.floor((i / outLen) * len));
    const s = Math.max(-1, Math.min(1, mono[src]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const dataSize = pcm.byteLength;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); // PCM, mono
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, 'data'); view.setUint32(40, dataSize, true);
  new Int16Array(wav, 44).set(pcm);
  return wav;
}

/** Convert any decodable audio blob (webm/ogg/mp4/wav) to 16-bit PCM WAV in-browser.
 *  Lets the local service decode natively — no FFmpeg required on the host. */
async function blobToWav(blob: Blob): Promise<Blob | null> {
  try {
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    await ctx.close();
    const chans = buf.numberOfChannels;
    const len = buf.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < chans; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += d[i] / chans;
    }
    const wav = encodeWavPcm(mono, buf.sampleRate);
    return new Blob([wav], { type: 'audio/wav' });
  } catch {
    return null; // undecodable here — fall back to raw upload
  }
}

/** Transcribe a recorded blob via the local service. */
export async function transcribeViaWhisper(blob: Blob, baseUrl = DEFAULT_URL): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000); // model warm-up can be slow
  try {
    const wav = await blobToWav(blob);
    const res = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': wav ? 'audio/wav' : 'application/octet-stream' },
      body: wav ?? blob,
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`whisper HTTP ${res.status}`);
    const data = (await res.json()) as { transcript?: string };
    return (data.transcript ?? '').trim();
  } catch (e) {
    clearTimeout(t);
    cachedStatus = { online: false };
    throw e;
  }
}
