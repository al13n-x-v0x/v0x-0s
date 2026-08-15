# VOX-OS — Known Issues

> Honest list of what is broken, partial, or untested. Updated each audit pass.

## Fixed recently

- **RAM / main-thread pegging** — `SystemTools` had a `useEffect` depending on the whole
  store (`[agentOnline, s]`); every telemetry tick re-fired `loadSysTools()` → `set` →
  re-render → loop. Fixed by depending on the stable `loadSysTools` action. (Watch for the
  same pattern in other components.)
- **VoxNotes markdown** — a fenced code block nested inside a list item swallowed the rest
  of the document; fixed the WELCOME note to use a standalone fence.
- **`writeFile` (vfs)** silently dropped writes to non-existent paths; now auto-creates
  intermediate directories.
- **`deepMerge`** was shallow (documented as deep); now recursively merges plain objects.
- **`fmtDuration`** stopped at seconds; now formats min/h/d for uptime displays.
- **Agent bridge** dropped the client `hello` while its agent socket was still connecting;
  added a flush-on-open queue. Wrong pairing token now gets a hard 401.

## Known issues

- **Backend port conflicts** — `server/index.js` picks up an ambient `PORT` env var;
  when starting manually always pin `PORT=8787`. The EXE handles this internally.
- **Vite IPv6** — the dev server binds `::1` on some Windows boxes; the preview bridge
  needs `--host 0.0.0.0` or a matching loopback. Cosmetically annoying, not a runtime bug.
- **Agent permissions** — `request_permission` only probes; grants land via the
  `allow_all` flag / per-capability grants. UI for fine-grained per-command approval
  is a P1 item.
- **Voice** — Web Speech API availability varies by browser/OS; local Whisper service is
  optional (needs `openai-whisper` + FFmpeg) and not E2E-tested on this machine yet.
- **Phone home screen** — widgets reorder via long-press; some quick actions are still
  cosmetic until the corresponding agent capability is granted.
- **GitHub Center** — reads real repos/branches/issues/PRs via API; repo *creation*
  works only with a token that has `repo` scope (user's classic PAT).
- **EXE packaging** — electron-builder NSIS compression is slow (minutes); the app is
  inside an asar, verified programmatically before each release.
- **VFS vs disk** — Code Studio/File Manager operate on the in-memory virtual FS;
  real on-disk sync through the agent is P1.

## Not tested yet (candidate tests)

- `shell.ts` command parsing edge cases
- `ai.ts` provider routing/failover with mocked HTTP
- `agent.ts` client reconnection + backoff
- `whisper.ts` recorder/abort path
- Windows system-app launch through the agent on a clean machine
- ISO build on a real Linux host (Docker required)

## How to report

Open an issue in `al13n-x-v0x/v0x-0s` with: what happened, expected, steps to reproduce,
and the Health Scanner report if possible. No telemetry is collected without consent.
