# VOX-OS — Roadmap

> AL13N Industries · v0x-0s · Priorities: real > pretty, verified > claimed.

## Shipped (v1.0 → v1.3.2)

- OS shell: windows, dock, sidebar, title bar, command palette, notifications, onboarding, boot screen
- 31+ apps: VoxAI (multi-provider), Terminal, File Manager, Code Studio, Projects, GitHub Center,
  Security Center + Recon Lab, Health Scanner, Performance, Gaming, Automation, Extensions,
  Dev Tools, **System Tools** (real Windows panels: Disk Mgmt, Task Manager, Device Manager…),
  **V0X-ST0RE** (winget installs), **My Apps** (real installed apps via agent), **Dev Kit**
  (freebuff / codebuff / Gemini CLI / Code Studio), **Phone Pairing** (QR + `voxos://`),
  Phone Home/Launcher (mobile-first), Notes, Voice Engine, Settings, API Manager, …
- Desktop Agent: real telemetry + real shell + **real disk files** (`~/VOX-OS`, path-traversal-guarded)
- AI: Groq, Gemini, OpenAI, Anthropic + routing/failover + ChatGPT-style voice chat (STT→AI→TTS)
- **Local Whisper STT** verified end-to-end on-device (FFmpeg-free: native WAV decode + in-browser webm→WAV)
- Themes (night/cyber/midnight/graphite) + **8 accent presets** (Settings → Appearance)
- **Pairing security**: 24h session expiry + one-tap revocation + EXE first-run auto-open
- **CI**: GitHub Actions — typecheck + vitest + build on push (web + agent syntax jobs)
- **Copyright & hardening**: VOX-OS Source License, obfuscated builds + banners, source maps stripped
- **Distributions**: Windows EXE, Android APK (debug + signed), web zip (portable bundle with
  server + agent + ws), bootable ISO repo, **Raspberry Pi image** (baked kiosk appliance)
- Tests: vitest suite (26 tests), typecheck, production build all green

## P1 — in progress / next

- [ ] Fine-grained permission UI — per-command approval dialogs (agent `request_permission` currently probes only)
- [ ] Terminal: multiple sessions, tab completion, Ctrl+C wiring through the agent bridge
- [ ] More unit tests: `ai` routing, `agent` protocol, `whisper` client
- [ ] Voice: voice selection + interruption; whisper model swap (tiny/base/small)
- [ ] LAN bridge extras: clipboard + file transfer between phone and laptop

## P2 — roadmap

- Agent architecture: PLAN → INSPECT → ASK PERMISSION → EXECUTE → OBSERVE → VERIFY → REPORT
- AI tools with schemas (read_file, write_file, run_command, git_*, …) + audit logging
- App registry / plugin system with per-app permissions
- Notifications + remote media controls over the LAN bridge
- Keyboard-first navigation everywhere; polish the remaining reduced-motion edges
- Bootable ISO maturity: installer polish, dual-boot safety, hardware support matrix;
  Pi image first-boot hardening (default-password rotation prompt)

## P3 — stretch

- Cloud sync, advanced automation, marketplace for extensions
- Kernel-adjacent experiments only after the desktop is mature (do not fake a kernel)

## Principles (from the master directive)

1. No fake buttons — if a button exists it does something, or it is labeled experimental.
2. Never claim success without verification (typecheck → tests → build → live check).
3. Small number of excellent features over 50 half-baked ones.
4. Simple surface, powerful core.
