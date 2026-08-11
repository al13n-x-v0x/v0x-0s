# VOX-OS Desktop Agent

A tiny local daemon that gives the VOX-OS web shell **real** system data and
**real** shell execution on your machine. It binds to `127.0.0.1` only,
authenticates clients with a token, and gates every capability behind an
explicit permission.

## Run

```bash
node agent/index.js                # interactive — prompts before granting
node agent/index.js --allow-all    # trusted/dev machine — grant everything
node agent/index.js --allow TERMINAL,FILES   # grant specific capabilities
node agent/index.js --port 8791    # custom port
node agent/index.js --reset        # new token + default permissions
```

On first run it generates a token and writes `agent/.vox-agent.json`
(gitignored, `0600`). Keep that file secret — it is the key to your machine.

## What unlocks

| Capability     | Web shell effect                                        | Default |
| -------------- | ------------------------------------------------------- | ------- |
| `SYSTEM_STATS` | Real CPU / RAM / disk / load / uptime in Health Scanner, Performance, System Info | allowed |
| `NETWORK`      | Real interface list                                      | allowed |
| `PROCESS_LIST` | Real running processes in Task Manager                   | prompt  |
| `TERMINAL`     | Real shell execution in the Terminal app                 | prompt  |
| `FILES`        | Real filesystem browsing in File Manager                 | prompt  |
| `GPU`          | Real GPU / driver info                                   | prompt  |

`SYSTEM_STATS` and `NETWORK` are read-only and safe by default. Everything
else prompts on the agent's console the first time the web shell asks, or can
be pre-granted with `--allow`.

## Protocol

See [protocol.md](protocol.md). JSON messages over WebSocket on
`ws://127.0.0.1:8790`; the backend exposes `GET /api/agent/status` so the web
shell can auto-connect with the right token.

## Security notes

- Binds to loopback only; foreign addresses are rejected.
- No credentials are stored by the web shell — the token lives in the agent
  config and is handed to the browser by your local backend.
- Sessions spawn as the current user, and die when the socket closes.
- Stop the daemon (Ctrl+C) to revoke everything instantly.
