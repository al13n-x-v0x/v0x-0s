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

/** Transcribe a recorded blob via the local service. */
export async function transcribeViaWhisper(blob: Blob, baseUrl = DEFAULT_URL): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000); // model warm-up can be slow
  try {
    const res = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob,
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
