# VOX-OS — Architecture

> AL13N Industries · v0x-0s · "Powerful under the hood. Simple on the surface."

This document maps how VOX-OS is built today — honestly. It is a **web-based operating
environment** (React + Vite) that talks to a **local Node backend**, an optional
**desktop agent daemon** (real hardware telemetry + real shell), and ships as a
**Windows EXE**, **Android APK**, and **web zip** (for a bootable Linux ISO).

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT TIERS                             │
│  Desktop web shell (React)   ·   Android APK (Capacitor)       │
│  Phone browser over LAN (pairing)                               │
├────────────────────────────────────────────────────────────────┤
│                     src/  (Vite + React 19 + TS)                │
│  apps/  31 apps  ·  components/  shell + UI primitives          │
│  lib/   store (zustand), ai, agent, vfs, health, secrets,      │
│         shell, voice/whisper, fmt, markdown, telemetry, etc.   │
├────────────────────────────────────────────────────────────────┤
│                     server/index.js  (Node, zero deps)          │
│  /api/*  AI routing (Groq/Gemini/OpenAI/Anthropic), GitHub,    │
│          pairing, agent status   ·  serves dist/ statics        │
│  /ws/agent  WebSocket bridge → desktop agent (token-gated)     │
├────────────────────────────────────────────────────────────────┤
│              agent/index.js  (local daemon, WebSocket)          │
│  Real CPU/RAM/disk/uptime + real shell (exec) with a           │
│  permission gate; sys tools (Disk Mgmt, Task Manager, etc.)    │
├────────────────────────────────────────────────────────────────┤
│   electron/main.js (EXE)  ·  android/ (APK)  ·  tools/ (whisper)│
└────────────────────────────────────────────────────────────────┘
```

## Repo layout

| Path | Purpose |
|---|---|
| `src/apps/` | One folder per application (VoxAI, Terminal, File Manager, GitHub, Security Center, V0X-ST0RE, DevKit, Pairing, Phone Home/Launcher, …) |
| `src/components/` | OS shell: TitleBar, Sidebar, Dock, windows, CommandPalette, Onboarding, BootScreen + UI primitives (`ui.tsx`, `window.tsx`, `ai.tsx`) |
| `src/lib/store.ts` | Single zustand store: settings, providers, projects (virtual FS), agent state, voice, pairing, telemetry, notifications |
| `src/lib/` | Pure-logic modules: `vfs.ts`, `health.ts`, `secrets.ts`, `fmt.ts`, `markdown.ts`, `shell.ts`, `voice.ts`/`whisper.ts`, `ai.ts` (provider clients), `agent.ts` |
| `server/index.js` | Zero-dependency Node backend: AI routing + failover, GitHub proxy, pairing token + WS agent bridge, static file serving |
| `agent/index.js` | Local daemon speaking WebSocket; real `exec`, telemetry, system apps. Correlates by message `id`; permission-gated |
| `electron/main.js` | EXE shell (electron-builder). Spawns backend + agent, computes LAN IPs |
| `android/` | Capacitor Android project (deep links `voxos://`, intent filters) |
| `tools/whisper-service.py` | Optional local Whisper STT (stdlib-only, `/status` + `/transcribe`) |
| `scripts/` | `make-release.cjs` (GitHub Release + assets), `gen-icon.cjs` |
| `docs/` | This architecture doc, roadmap, known issues |

## Key flows

### AI chat (VoxAI)
1. UI calls `sendMessage` in the store.
2. The store picks a provider by `routingMode` (auto → Groq for speed, Gemini for depth) or a fixed provider.
3. `server/index.js` proxies to the provider REST API with the server-side key; streams tokens back.
4. If `voiceChat` is on, the spoken reply is read aloud (TTS); `voiceAutoSpeak` controls it.

### Real hardware + shell (Desktop Agent)
1. Agent daemon listens on `ws://127.0.0.1:8790`, authed by a token in `agent/.vox-agent.json`.
2. `server/index.js` exposes `/api/agent/status` and the `/ws/agent` bridge; the bridge
   injects the agent token server-side so **phones never see it** (pairing token gates the bridge).
3. Requests carry an `id`; the agent replies with the matching `id`. Every exec is
   checked against the permission gate (`allow_all` / per-capability grants).

### Phone pairing
1. EXE shows the Pairing app: LAN IPs + QR codes (`http://ip:8787/?pair=…` and `voxos://pair?url=…`).
2. The phone app/URL reads `?pair=` → stores the laptop base URL → all API + agent traffic routes there.

### Files (Code Studio / File Manager)
- In-memory virtual FS (`VNode` trees) persisted in the store; `vfs.ts` is pure and unit-tested.
- `writeFile` auto-creates intermediate directories; `scanForSecrets` scans trees
  (skips `node_modules`/`dist`, redacts matches) feeding the Security Center.

## Conventions
- **State**: single zustand store; actions are stable references (avoid `useEffect` deps
  on whole-store selectors — that caused a render loop, now fixed in SystemTools).
- **Tests**: `vitest run` (26 tests) over pure modules: `markdown`, `secrets`, `fmt`, `vfs`, `health`.
- **Checks**: `npm run typecheck` (`tsc --noEmit`), `npm run build`, `npm test`.

## Build matrix
| Target | Command | Output |
|---|---|---|
| Web | `npm run build` | `dist/` |
| EXE | `npm run exe:build` | `release/VOX-OS-*.exe` |
| APK | `npm run apk:build` / `apk:release` | `android/app/build/outputs/apk/…` |
| Web zip | `tar -a -c -f vox-os-web.zip dist server agent` | release asset for ISO |
| ISO | separate repo `al13n-x-v0x/v0x-0s-iso` | `iso/vox-os.iso` |

## Honest limits
- The web shell is not a kernel: it cannot boot hardware. "Replace Windows" is delivered
  as the **ISO path** (Debian + kiosk) and **EXE control path**, not a kernel fork.
- Terminal/agent execs are real but permission-gated; AI never has unlimited machine access.
- Voice STT defaults to the Web Speech API; local Whisper is optional and offline-capable.
