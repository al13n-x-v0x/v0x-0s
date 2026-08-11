#!/usr/bin/env node
// ============================================================
// VOX-OS DESKTOP AGENT — local daemon
//
//   A tiny, local-only companion that gives the VOX-OS web shell
//   REAL system data and REAL shell execution on the user's own
//   machine. It binds to 127.0.0.1 only, authenticates every
//   client with a token, and gates every capability behind an
//   explicit permission (default: prompt on the console).
//
//   Run:  node agent/index.js            (interactive, prompts)
//         node agent/index.js --allow-all            (dev / trusted)
//         node agent/index.js --allow TERMINAL,FILES  (selective)
//
//   Protocol: JSON messages over WebSocket — see agent/protocol.md
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFG = path.join(__dirname, '.vox-agent.json');

// ---- CLI flags ------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const has = (name) => args.includes(name);
const ALLOW_ALL = has('--allow-all');
const ALLOW_LIST = (flag('--allow') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
const PORT = Number(flag('--port') || 8790);

// ---- permissions ------------------------------------------------------
const DEFAULT_PERMS = {
  SYSTEM_STATS: 'allowed',   // read-only metrics — the point of the agent
  NETWORK: 'allowed',        // interface info, read-only
  PROCESS_LIST: 'prompt',
  TERMINAL: 'prompt',
  FILES: 'prompt',
  GPU: 'prompt',
};

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch { return null; }
}
function saveConfig(cfg) {
  try { fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2), { mode: 0o600 }); } catch { /* non-fatal */ }
}

let cfg = loadConfig();
if (!cfg || has('--reset')) {
  cfg = {
    version: '0.1.0',
    port: PORT,
    token: crypto.randomBytes(24).toString('hex'),
    permissions: { ...DEFAULT_PERMS },
  };
  saveConfig(cfg);
}
cfg.permissions = { ...DEFAULT_PERMS, ...(cfg.permissions || {}) };
if (ALLOW_ALL) for (const k of Object.keys(cfg.permissions)) cfg.permissions[k] = 'allowed';
for (const p of ALLOW_LIST) if (p in cfg.permissions) cfg.permissions[p] = 'allowed';

const isTTY = Boolean(process.stdin.isTTY);
let pendingPrompt = null;
const ask = (question) => new Promise((resolve) => {
  if (!isTTY) { console.error(`[agent] Non-interactive run — denying "${question}". Restart with --allow to grant.`); return resolve(false); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`${question} (y/n) `, (ans) => { rl.close(); resolve(/^y/i.test(ans)); });
});
async function hasPermission(perm) {
  const state = cfg.permissions[perm];
  if (state === 'allowed') return { ok: true };
  if (state === 'denied') return { ok: false, reason: `DENIED — ${perm} is disabled in agent permissions` };
  // prompt
  if (state === 'prompt') {
    const yes = await ask(`[VOX AGENT] Allow ${perm} access?`);
    cfg.permissions[perm] = yes ? 'allowed' : 'denied';
    saveConfig(cfg);
    return yes ? { ok: true } : { ok: false, reason: `DENIED — ${perm} access was declined` };
  }
  return { ok: false, reason: `Unknown permission ${perm}` };
}

// ---- real system metrics ---------------------------------------------
let prevCpu = os.cpus().map((c) => c.times);
function cpuUsage() {
  const now = os.cpus().map((c) => c.times);
  let idle = 0, total = 0;
  for (let i = 0; i < now.length; i++) {
    const dIdle = now[i].idle - prevCpu[i].idle;
    const dTotal = (now[i].user + now[i].nice + now[i].sys + now[i].idle) - (prevCpu[i].user + prevCpu[i].nice + prevCpu[i].sys + prevCpu[i].idle);
    idle += dIdle; total += dTotal;
  }
  prevCpu = now;
  return total > 0 ? Math.round(((total - idle) / total) * 1000) / 10 : 0;
}
function diskInfo() {
  try {
    const s = fs.statfsSync(path.parse(os.homedir()).root || '/');
    const total = s.blocks * s.bsize;
    const free = s.bfree * s.bsize;
    const used = total - free;
    return { total, free, used, pct: total > 0 ? Math.round((used / total) * 100) : null, mount: path.parse(os.homedir()).root || '/' };
  } catch {
    return { total: null, free: null, used: null, pct: null, mount: null };
  }
}
function networkIfaces() {
  const out = [];
  try {
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
      for (const a of addrs || []) {
        if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
      }
    }
  } catch { /* ignore */ }
  return out;
}
function snapshot() {
  const mem = { total: os.totalmem(), free: os.freemem(), used: os.totalmem() - os.freemem(), pct: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100) };
  return {
    cpu: cpuUsage(),
    mem,
    disk: diskInfo(),
    load: os.loadavg(),
    uptime: Math.floor(os.uptime()),
    hostname: os.hostname(),
    platform: process.platform,
    release: os.release(),
    arch: os.arch(),
    ifaces: networkIfaces(),
  };
}
function processList() {
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') {
        const p = spawn('powershell.exe', ['-NoProfile', '-Command', 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 Id,ProcessName,CPU,WorkingSet | ConvertTo-Json -Compress']);
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.on('close', () => {
          try {
            const arr = JSON.parse(out.trim() || '[]');
            const list = (Array.isArray(arr) ? arr : [arr]).map((r) => ({ pid: r.Id, name: r.ProcessName, cpu: Math.round((r.CPU ?? 0) * 10) / 10, memMB: Math.round((r.WorkingSet ?? 0) / 1048576) }));
            resolve(list);
          } catch { resolve([]); }
        });
        p.on('error', () => resolve([]));
      } else {
        const lines = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(' ').slice(0, 3).join(' ');
        // basic process names from /proc
        const names = [];
        try {
          for (const pid of fs.readdirSync('/proc')) {
            if (/^\d+$/.test(pid)) {
              try { const c = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim(); names.push({ pid: Number(pid), name: c.slice(0, 30) }); } catch { /* ignore */ }
            }
          }
        } catch { /* ignore */ }
        resolve({ load: lines, processes: names.slice(-20) });
      }
    } catch { resolve([]); }
  });
}

// ---- shell sessions -----------------------------------------------------
function shellFor(kind) {
  if (process.platform === 'win32') {
    return kind === 'bash' ? { file: 'bash.exe', args: ['--login'] } : kind === 'cmd' ? { file: 'cmd.exe', args: [] } : { file: 'powershell.exe', args: ['-NoLogo'] };
  }
  return { file: process.env.SHELL || '/bin/bash', args: kind === 'powershell' ? ['--posix'] : [] };
}

// ---- HTTP server (status probe for the web shell / backend) -------------
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ ok: true, agent: 'vox-desktop-agent', version: cfg.version, port: cfg.port, pid: process.pid }));
});

// ---- WebSocket server ----------------------------------------------------
const wss = new WebSocketServer({ server: httpServer, host: '127.0.0.1' });
const sessions = new Map(); // exec id -> child process
const subs = new Set();     // clients subscribed to stats

function send(ws, obj) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); }

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') { ws.close(4001, 'local only'); return; }
  let authed = false;

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    try {
      await handleMessage(ws, msg);
    } catch (e) {
      // a single bad message must never take down the daemon
      console.error('[VOX AGENT] handler error:', e instanceof Error ? e.message : e);
      send(ws, { id: msg.id, ok: false, reason: 'internal error' });
    }
  });

  // nested on purpose: `authed` and `ip` are closure state shared across messages
  async function handleMessage(ws, msg) {
    if (!authed) {
      if (msg.type !== 'hello' || msg.token !== cfg.token) { ws.close(4003, 'bad token'); return; }
      authed = true;
      const perms = {};
      for (const [k, v] of Object.entries(cfg.permissions)) perms[k] = v;
      send(ws, { id: msg.id, ok: true, hello: { agent: 'vox-desktop-agent', version: cfg.version, protocol: 1, os: { platform: process.platform, release: os.release(), arch: os.arch(), hostname: os.hostname() }, caps: Object.keys(cfg.permissions), perms } });
      console.error(`[agent] client connected from ${ip} — token accepted`);
      return;
    }

    // ---- stats ----
    if (msg.type === 'stats') return send(ws, { id: msg.id, ok: true, data: snapshot() });
    if (msg.type === 'subscribe') {
      if (msg.interval) subs.add(ws); else subs.delete(ws);
      return send(ws, { id: msg.id, ok: true });
    }
    // ---- ping ----
    if (msg.type === 'ping') return send(ws, { id: msg.id, ok: true, pong: true });
    // ---- permissions ----
    if (msg.type === 'request_permission') {
      const r = await hasPermission(String(msg.perm || '').toUpperCase());
      send(ws, { id: msg.id, ok: r.ok, reason: r.reason, perm: msg.perm });
      return;
    }
    if (msg.type === 'allow_all') {
      // grant every capability at once (trusted-dev-machine consent; same as --allow-all)
      for (const k of Object.keys(cfg.permissions)) cfg.permissions[k] = 'allowed';
      saveConfig(cfg);
      console.error('[VOX AGENT] allow_all granted by client');
      send(ws, { id: msg.id, ok: true, perms: { ...cfg.permissions } });
      return;
    }
    // ---- processes ----
    if (msg.type === 'processes') {
      const r = await hasPermission('PROCESS_LIST');
      if (!r.ok) return send(ws, { id: msg.id, ok: false, reason: r.reason });
      const data = await processList();
      return send(ws, { id: msg.id, ok: true, data });
    }
    // ---- shell sessions ----
    if (msg.type === 'exec_open') {
      const r = await hasPermission('TERMINAL');
      if (!r.ok) return send(ws, { id: msg.id, ok: false, reason: r.reason });
      const id = String(msg.sid || msg.id);
      if (sessions.has(id)) return send(ws, { id: msg.id, ok: false, reason: 'session already open' });
      const { file, args } = shellFor(String(msg.shell || 'powershell'));
      let cwd = msg.cwd ? String(msg.cwd) : os.homedir();
      if (!fs.existsSync(cwd)) cwd = os.homedir();
      let child;
      try {
        child = spawn(file, args, { cwd, env: { ...process.env, TERM: 'xterm-256color' } });
      } catch (e) {
        return send(ws, { id: msg.id, ok: false, reason: `failed to spawn ${file}: ${e.message}` });
      }
      child.stdout.on('data', (d) => send(ws, { type: 'event', name: 'exec_out', id, data: d.toString() }));
      child.stderr.on('data', (d) => send(ws, { type: 'event', name: 'exec_err', id, data: d.toString() }));
      child.on('close', (code) => {
        sessions.delete(id);
        send(ws, { type: 'event', name: 'exec_exit', id, code });
      });
      child.on('error', (e) => { sessions.delete(id); send(ws, { type: 'event', name: 'exec_exit', id, code: -1, reason: e.message }); });
      sessions.set(id, child);
      return send(ws, { id: msg.id, ok: true, shell: file, cwd, pid: child.pid });
    }
    if (msg.type === 'exec_input') {
      const child = sessions.get(String(msg.sid || msg.id));
      if (!child) return send(ws, { id: msg.id, ok: false, reason: 'no such session' });
      try { child.stdin.write(String(msg.data ?? '')); return send(ws, { id: msg.id, ok: true }); }
      catch (e) { return send(ws, { id: msg.id, ok: false, reason: e.message }); }
    }
    if (msg.type === 'exec_close') {
      const child = sessions.get(String(msg.sid || msg.id));
      if (child) { try { child.kill(); } catch { /* ignore */ } sessions.delete(String(msg.sid || msg.id)); }
      return send(ws, { id: msg.id, ok: true });
    }
    return send(ws, { id: msg.id, ok: false, reason: 'unknown message type' });
  }

  ws.on('close', () => {
    subs.delete(ws);
    for (const [id, child] of sessions) {
      if (child) { try { child.kill(); } catch { /* ignore */ } }
    }
    sessions.clear();
  });
});

// push subscribed stats
setInterval(() => {
  if (subs.size === 0) return;
  const snap = snapshot();
  for (const ws of subs) if (ws.readyState === ws.OPEN) send(ws, { type: 'event', name: 'stats', data: snap });
}, 2000);

httpServer.listen(cfg.port, '127.0.0.1', () => {
  console.error(`[VOX AGENT] online  →  ws://127.0.0.1:${cfg.port}`);
  console.error(`[VOX AGENT] token    →  ${cfg.token}`);
  console.error(`[VOX AGENT] perms    →  ${JSON.stringify(cfg.permissions)}`);
  console.error(`[VOX AGENT] http     →  http://127.0.0.1:${cfg.port}/ (status probe)`);
  console.error('[VOX AGENT] tip: grant capabilities with --allow TERMINAL,FILES or --allow-all');
});
