# VOX-OS — Known Issues

> Honest list of what is broken, partial, or untested. Updated each audit pass.

## Fixed recently

- **Portable web bundle was site-only** — `vox-os-web.zip` shipped only `dist/`, so the ISO kiosk
  and Pi image booted a shell with no backend/agent. Fixed in v1.3.2: the zip now carries
  `dist/ + server/ + agent/ + node_modules/ws + type:module package.json`, built by
  `scripts/make-web-zip.cjs` and verified by `scripts/check-asar.cjs`-style listing checks.
- **`pi-image` workflow YAML** — a multi-line `--notes` string ended the block scalar, so
  continuation lines parsed as top-level mapping keys and GitHub rejected the file.
  Single-line notes now; file is validated with `js-yaml` before pushing.
- **RAM / main-thread pegging** — `SystemTools` had a `useEffect` depending on the whole
  store; every telemetry tick re-fired `loadSysTools()` → `set` → re-render → loop. Fixed by
  depending on the stable `loadSysTools` action.
- **Agent bridge** dropped the client `hello` while its agent socket was still connecting;
  added a flush-on-open queue. Wrong pairing token gets a hard 401.
- **Whisper on Windows** — the `▚` banner crashed on cp1252 stdout (forced UTF-8); FFmpeg was
  required for everything (added native WAV decode + resampler); the browser sends webm, not
  WAV (added `blobToWav` in `whisper.ts`). Verified E2E on this machine.
- **`writeFile` (vfs)** silently dropped writes to non-existent paths; now auto-creates
  intermediate directories. `deepMerge` was shallow; now recursive. `fmtDuration` stopped at
  seconds; now formats min/h/d.

## Known issues

- **Backend port conflicts** — `server/index.js` picks up an ambient `PORT` env var; when
  starting manually always pin `PORT=8787`. The EXE handles this internally.
- **Vite IPv6** — the dev server binds `::1` on some Windows boxes; the preview bridge needs
  `--host 0.0.0.0` or a matching loopback. Cosmetically annoying, not a runtime bug.
- **Agent permissions** — `request_permission` only probes; grants land via the `allow_all`
  flag / per-capability grants. UI for fine-grained per-command approval is a P1 item.
- **Voice** — Web Speech API availability varies by browser/OS; local Whisper service is
  optional (needs the `.venv-vox` install) and its model is downloaded on first run.
- **Pi image first boot** — the `vox` user is created from `userconf.txt` on first boot; the
  kiosk autologin is therefore effective from the first boot onward in the standard flow, but
  a slow SD card can push the desktop session ahead of user creation — if you see a login
  screen instead of the kiosk, log in as `vox`/`voxos` once and it self-corrects.
- **Pi default credentials** — `vox`/`voxos` ships with the image; the user must rotate it
  (`passwd`). A forced-rotation prompt on first kiosk boot is on the P2 list.
- **GitHub Center** — repo *creation* works only with a token that has `repo` scope (classic PAT).
- **EXE packaging** — electron-builder NSIS compression is slow (minutes); the app is inside
  an asar, verified programmatically before each release.

## Not tested yet (candidate tests)

- Automated tests for `ai` routing/failover, the `agent` protocol, and the `whisper` client
- The Pi image boot on real hardware (built via CI; needs a physical flash + smoke test)
- Multi-session terminal through the agent bridge
- Voice interruption + voice selection UI

## Principles (from the master directive)

1. No fake buttons — if a button exists it does something, or it is labeled experimental.
2. Never claim success without verification (typecheck → tests → build → live check).
3. Small number of excellent features over 50 half-baked ones.
4. Simple surface, powerful core.
