# VOX-OS — Roadmap

> AL13N Industries · v0x-0s · Priorities: real > pretty, verified > claimed.

## Shipped (v1.0 → v1.2)

- OS shell: windows, dock, sidebar, title bar, command palette, notifications, onboarding, boot screen
- 31 apps: VoxAI (multi-provider), Terminal, File Manager, Code Studio, Projects, GitHub Center,
  Security Center + Recon Lab, Health Scanner, Performance, Gaming, Automation, Extensions,
  Dev Tools, **System Tools** (real Windows panels: Disk Mgmt, Task Manager, Device Manager…),
  **V0X-ST0RE** (winget installs), **My Apps** (real installed apps via agent), **Dev Kit**
  (freebuff / codebuff / Gemini CLI / Code Studio), **Phone Pairing** (QR + `voxos://`),
  Phone Home/Launcher (mobile-first), Notes, Voice Engine, Settings, API Manager, …
- Desktop Agent: real telemetry + real shell with a permission gate
- AI: Groq, Gemini, OpenAI, Anthropic + routing/failover + ChatGPT-style voice chat (STT→AI→TTS)
- Themes (night/cyber/midnight/graphite) + **8 accent presets** (Settings → Appearance)
- Distributions: Windows EXE, Android APK (debug + signed), web zip, ISO repo, GitHub Releases
- Tests: vitest suite (26 tests), typecheck, production build all green

## P1 — in progress / next

- [ ] Pairing: session expiry + revocation UI; auto-open pairing on first EXE launch
- [ ] Voice: real Whisper pipeline E2E test on-device; voice interruption; voice selection
- [ ] Settings: persist accent/voice into a real settings surface (currently partial)
- [ ] Terminal: multiple sessions, tab completion, Ctrl+C wiring through the agent bridge
- [ ] Code Studio: real project-on-disk sync (agent FS) instead of in-memory VFS only
- [ ] File Manager: real disk browsing via agent (create/rename/delete on disk)
- [ ] More unit tests: `shell`, `ai` routing, `agent` protocol, `whisper` client
- [ ] CI: typecheck + tests + build on push (GitHub Actions)

## P2 — roadmap

- Agent architecture: PLAN → INSPECT → ASK PERMISSION → EXECUTE → OBSERVE → VERIFY → REPORT
- AI tools with schemas (read_file, write_file, run_command, git_*, …) + audit logging
- App registry / plugin system with per-app permissions
- Notifications, clipboard + file transfer over the LAN bridge
- Reduced-motion polish pass, keyboard-first navigation everywhere
- Bootable ISO maturity: installer polish, dual-boot safety, hardware support matrix

## P3 — stretch

- Cloud sync, advanced automation, marketplace for extensions
- Kernel-adjacent experiments only after the desktop is mature (do not fake a kernel)

## Principles (from the master directive)

1. No fake buttons — if a button exists it does something, or it is labeled experimental.
2. Never claim success without verification (typecheck → tests → build → live check).
3. Small number of excellent features over 50 half-baked ones.
4. Simple surface, powerful core.
