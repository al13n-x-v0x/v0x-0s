# VOX-OS Desktop Agent — WebSocket Protocol (v1)

The Desktop Agent is a local daemon that binds to `127.0.0.1` only and speaks
JSON text frames over WebSocket. Every client must authenticate with the
token printed at daemon start (or read from `agent/.vox-agent.json`).

**Security model**

- Localhost only — connections from any other address are closed.
- Token handshake — the first frame must be `hello` with the correct token.
- Permissions — every capability is gated (`allowed` / `prompt` / `denied`).
  `SYSTEM_STATS` and `NETWORK` are read-only and allowed by default;
  `TERMINAL`, `FILES`, `PROCESS_LIST` and `GPU` prompt on the console first.
  Restart with `--allow TERMINAL,FILES` or `--allow-all` to pre-grant.
- No remote shell is ever exposed: sessions spawn on the user's own machine,
  run as the user, and die when the socket closes.

## Messages (client → agent)

```jsonc
{ "id": 1, "type": "hello", "token": "…" }                    // handshake
{ "id": 2, "type": "stats" }                                   // one snapshot
{ "id": 3, "type": "subscribe", "interval": 2000 }             // push stats events
{ "id": 4, "type": "ping" }
{ "id": 5, "type": "request_permission", "perm": "TERMINAL" }
{ "id": 5b, "type": "allow_all" }                            // grant every capability (same as --allow-all)
{ "id": 6, "type": "processes" }                               // PROCESS_LIST
{ "id": 7, "type": "exec_open", "shell": "powershell|bash|cmd", "cwd": "…", "sid": "term-1" }
{ "id": 8, "type": "exec_input", "sid": "term-1", "data": "git status\n" }
{ "id": 9, "type": "exec_close", "sid": "term-1" }

// Note: `id` is always the request correlation id (echoed back in the reply).
// Shell-session ids travel in a dedicated `sid` field so they never collide.
```

## Messages (agent → client)

```jsonc
{ "id": 1, "ok": true, "hello": { "agent": "vox-desktop-agent", "version": "0.1.0",
  "protocol": 1, "os": { "platform": "win32", "release": "…", "arch": "x64", "hostname": "…" },
  "caps": ["SYSTEM_STATS","NETWORK","PROCESS_LIST","TERMINAL","FILES","GPU"],
  "perms": { "SYSTEM_STATS": "allowed", "TERMINAL": "prompt", … } } }

{ "id": 2, "ok": true, "data": {
  "cpu": 23.4, "mem": { "total": 17179869184, "free": …, "used": …, "pct": 47 },
  "disk": { "total": …, "free": …, "used": …, "pct": 62, "mount": "C:\\" },
  "load": [0.3, 0.4, 0.5], "uptime": 12345, "hostname": "…",
  "platform": "win32", "release": "10.0.22631", "arch": "x64",
  "ifaces": [{ "name": "Ethernet", "address": "192.168.1.5" }] } }

{ "id": 7, "ok": true, "shell": "powershell.exe", "cwd": "C:\\Users\\me", "pid": 4242 }

{ "type": "event", "name": "exec_out",  "id": "term-1", "data": "On branch main…" }
{ "type": "event", "name": "exec_err",  "id": "term-1", "data": "…" }
{ "type": "event", "name": "exec_exit", "id": "term-1", "code": 0 }
{ "type": "event", "name": "stats", "data": { …same shape as stats… } }
```

Errors carry `{ ok: false, reason: "…" }`. Terminal output is streamed as raw
text chunks; the web shell appends them to the session buffer. Closing the
socket kills all spawned sessions.
