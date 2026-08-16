import { describe, it, expect } from 'vitest';
import { encodeWavPcm } from '../whisper';

describe('encodeWavPcm', () => {
  const HEADER = 44;

  function readWav(buf: ArrayBuffer) {
    const v = new DataView(buf);
    const str = (off: number, n: number) => {
      let s = '';
      for (let i = 0; i < n; i++) s += String.fromCharCode(v.getUint8(off + i));
      return s;
    };
    return {
      riff: str(0, 4),
      wave: str(8, 4),
      fmt: str(12, 4),
      audioFormat: v.getUint16(20, true),
      channels: v.getUint16(22, true),
      sampleRate: v.getUint32(24, true),
      byteRate: v.getUint32(28, true),
      blockAlign: v.getUint16(32, true),
      bitsPerSample: v.getUint16(34, true),
      dataMagic: str(36, 4),
      dataSize: v.getUint32(40, true),
      pcm: new Int16Array(buf, HEADER),
    };
  }

  it('emits a well-formed 16 kHz mono PCM WAV header', () => {
    const wav = encodeWavPcm(new Float32Array(16000), 16000);
    const h = readWav(wav);
    expect(h.riff).toBe('RIFF');
    expect(h.wave).toBe('WAVE');
    expect(h.fmt).toBe('fmt ');
    expect(h.audioFormat).toBe(1); // PCM
    expect(h.channels).toBe(1);
    expect(h.sampleRate).toBe(16000);
    expect(h.byteRate).toBe(16000 * 2);
    expect(h.bitsPerSample).toBe(16);
    expect(h.dataMagic).toBe('data');
    expect(h.dataSize).toBe(16000 * 2);
    expect(wav.byteLength).toBe(HEADER + 16000 * 2);
  });

  it('round-trips a 1-second sine wave (counts non-silent samples)', () => {
    const sr = 16000;
    const s = new Float32Array(sr);
    for (let i = 0; i < sr; i++) s[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.5;
    const h = readWav(encodeWavPcm(s, sr));
    let nonzero = 0;
    for (let i = 0; i < h.pcm.length; i++) if (h.pcm[i] !== 0) nonzero++;
    expect(nonzero).toBeGreaterThan(15000); // ~1s of audio, not silence
    expect(Math.abs(h.pcm[0])).toBeLessThanOrEqual(32767);
  });

  it('resamples 44.1 kHz input down to 16 kHz', () => {
    const wav = encodeWavPcm(new Float32Array(44100), 44100);
    const h = readWav(wav);
    expect(h.sampleRate).toBe(16000);
    expect(h.pcm.length).toBe(16000); // 1 second → 16000 samples
  });

  it('clamps out-of-range samples to full scale', () => {
    const s = new Float32Array([2.0, -2.0, 0]);
    const h = readWav(encodeWavPcm(s, 3, 3));
    expect(h.pcm[0]).toBe(32767);
    expect(h.pcm[1]).toBe(-32768);
    expect(h.pcm[2]).toBe(0);
  });

  it('encodes negative samples as two’s-complement', () => {
    const h = readWav(encodeWavPcm(new Float32Array([-0.5]), 1, 1));
    expect(h.pcm[0]).toBe(-16384);
  });

  it('never emits an empty data chunk for a single sample', () => {
    const h = readWav(encodeWavPcm(new Float32Array([0.25]), 1, 16000));
    expect(h.pcm.length).toBeGreaterThanOrEqual(1);
  });
});
