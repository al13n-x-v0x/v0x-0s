#!/usr/bin/env python3
# ============================================================
# VOX-OS LOCAL WHISPER STT SERVICE
#
#   Local, offline speech-to-text for the VOX-OS voice engine.
#   Browser Web-Speech needs the internet; this needs nothing.
#
#   Idea/endpoints adapted from santhoshsharuk/Vox-OS
#   (whisper-service.py) — rewritten here stdlib-only so it
#   runs anywhere with `pip install openai-whisper`.
#   No Flask, no web framework.
#
#   Audio decoding:
#     · WAV  -> decoded natively (stdlib `wave` + numpy),
#               so FFmpeg is NOT required for WAV uploads.
#     · other formats (webm/mp3/ogg/…) -> FFmpeg on PATH.
#
#   Run:   python3 tools/whisper-service.py
#          (first run downloads the "base" model ~140 MB)
#
#   Endpoints (CORS-enabled for the VOX-OS web shell):
#     GET  /status      -> {"status": true, "model": "base"}
#     POST /transcribe  -> multipart form field "audio" OR
#                          raw audio body (wav/webm/mp3/ogg)
#                          -> {"status": "success", "transcript": "..."}
# ============================================================
import json
import os
import re
import struct
import sys
import tempfile
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("WHISPER_PORT", "5000"))
MODEL = os.environ.get("WHISPER_MODEL", "base")
ALLOWED_EXT = {".webm", ".wav", ".mp3", ".ogg", ".m4a", ".flac"}
MAX_BODY = 64 * 1024 * 1024  # 64 MB upload cap

model = None


def load_model():
    """Load the Whisper model lazily (keeps /status fast)."""
    global model
    if model is not None:
        return model
    import whisper

    print(f"[whisper] loading model '{MODEL}' (first run downloads it)…", flush=True)
    model = whisper.load_model(MODEL)
    print(f"[whisper] model '{MODEL}' ready", flush=True)
    return model


def decode_audio(path: str):
    """Decode an audio file to a 16 kHz mono float32 numpy array.

    WAV is decoded natively (stdlib `wave` + numpy) so FFmpeg is not
    needed for the most common upload. Every other format falls back
    to whisper.load_audio(), which requires FFmpeg on PATH.
    """
    import numpy as np

    try:
        with open(path, "rb") as fh:
            magic = fh.read(12)
    except OSError:
        magic = b""

    is_wav = magic.startswith(b"RIFF") and magic[8:12] == b"WAVE"
    if is_wav:
        with wave.open(path, "rb") as w:
            nch, sw, rate, nframes = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
            raw = w.readframes(nframes)
        if sw == 2:  # 16-bit PCM
            audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        elif sw == 4:  # 32-bit float (IEEE)
            audio = np.frombuffer(raw, dtype=np.float32)
        elif sw == 1:  # 8-bit unsigned PCM
            audio = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
        else:
            raise ValueError(f"unsupported WAV sample width: {sw} bytes")
        if nch > 1:  # downmix to mono
            audio = audio.reshape(-1, nch).mean(axis=1)
        if rate != 16000:  # resample to what Whisper expects
            audio = _resample(audio, rate, 16000)
        return audio

    import whisper

    return whisper.load_audio(path)  # needs FFmpeg


def _resample(audio, src_rate: int, dst_rate: int):
    """Minimal linear-interpolation resampler (stdlib + numpy only)."""
    import numpy as np

    if src_rate == dst_rate:
        return audio
    duration = len(audio) / src_rate
    n_out = max(1, int(round(duration * dst_rate)))
    x_old = np.linspace(0.0, duration, num=len(audio), endpoint=False)
    x_new = np.linspace(0.0, duration, num=n_out, endpoint=False)
    return np.interp(x_new, x_old, audio).astype(np.float32)


def parse_multipart(boundary: bytes, body: bytes):
    """Minimal multipart/form-data parser — returns field -> bytes."""
    fields = {}
    if not boundary:
        return fields
    delim = b"--" + boundary
    parts = body.split(delim)
    for part in parts:
        part = part.strip(b"\r\n")
        if not part or part == b"--":
            continue
        header, _, content = part.partition(b"\r\n\r\n")
        if not header:
            continue
        disp = re.search(rb'name="([^"]+)"', header)
        if not disp:
            continue
        fields[disp.group(1).decode()] = content.rstrip(b"\r\n")
    return fields


class Handler(BaseHTTPRequestHandler):
    server_version = "VOXOS-Whisper/1.0"

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write("[whisper] " + (fmt % args) + "\n")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0].rstrip("/") == "/status":
            ok = model is not None
            self._json(200, {"status": ok, "model": MODEL, "loaded": ok})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path.split("?")[0].rstrip("/") != "/transcribe":
            self._json(404, {"error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._json(413, {"error": "bad Content-Length (max 64 MB)"})
            return

        body = self.rfile.read(length)
        ctype = self.headers.get("Content-Type", "")
        audio = body  # default: raw audio bytes
        lang = self.headers.get("X-Whisper-Lang", "en")

        if "multipart/form-data" in ctype:
            m = re.search(r"boundary=(?:\"([^\"]+)\"|([^;]+))", ctype, re.I)
            boundary = (m.group(1) or m.group(2)).encode() if m else None
            fields = parse_multipart(boundary, body)
            audio = fields.get("audio", b"")
            if not audio:
                self._json(400, {"error": "no 'audio' field in multipart body"})
                return

        if not audio:
            self._json(400, {"error": "empty audio body"})
            return

        # write to a temp file, decode, transcribe, clean up
        fd, path = tempfile.mkstemp(suffix=".upload")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(audio)
            try:
                decoded = decode_audio(path)
                result = load_model().transcribe(decoded, fp16=False, language=lang, task="transcribe")
                transcript = (result.get("text") or "").strip()
            except Exception as exc:  # noqa: BLE001
                self._json(500, {"error": f"transcription failed: {exc}"})
                return
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

        self._json(200, {"status": "success", "transcript": transcript})


def main():
    if sys.version_info < (3, 8):
        sys.exit("Python 3.8+ required")
    # Windows console defaults to cp1252 — force UTF-8 so the
    # box-drawing banner and log lines never crash the service.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    try:
        import whisper  # noqa: F401  (probe import)
    except ImportError:
        sys.exit(
            "openai-whisper is not installed.\n"
            "  pip install openai-whisper\n"
            "  (also needs FFmpeg on PATH:  winget install ffmpeg  or  apt install ffmpeg)"
        )
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"▚ VOX-OS Whisper STT listening on http://127.0.0.1:{PORT} (model: {MODEL})")
    print("  · GET  /status        — health check")
    print("  · POST /transcribe    — audio in, text out")
    print("  · first transcription loads the model (~1-2 min on CPU)")
    # warm the model in the background so the first request is fast
    threading.Thread(target=load_model, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[whisper] stopped")


if __name__ == "__main__":
    main()
