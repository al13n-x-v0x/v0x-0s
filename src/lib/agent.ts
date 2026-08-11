// ============================================================
// VOX Desktop Agent — browser WebSocket client.
// Connects to ws://127.0.0.1:<port> (brokered by the VOX backend,
// which reads the agent token). JSON messages per agent/protocol.md.
// ============================================================

export interface AgentHello {
  agent: string;
  version: string;
  protocol: number;
  os: { platform: string; release: string; arch: string; hostname: string };
  caps: string[];
  perms: Record<string, string>;
}

export interface AgentStats {
  cpu: number;
  mem: { total: number; free: number; used: number; pct: number };
  disk: { total: number | null; free: number | null; used: number | null; pct: number | null; mount: string | null };
  load: number[];
  uptime: number;
  hostname: string;
  platform: string;
  release: string;
  arch: string;
  ifaces: { name: string; address: string }[];
}

export interface AgentProcess {
  pid: number;
  name: string;
  cpu?: number;
  memMB?: number;
}

type Handler = (data: unknown) => void;

class VoxAgentClient {
  private ws: WebSocket | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private handlers = new Map<string, Handler[]>();
  connected = false;
  hello: AgentHello | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url = '';
  private token = '';

  on(event: string, fn: Handler): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
    return () => {
      const l = this.handlers.get(event) ?? [];
      this.handlers.set(event, l.filter((f) => f !== fn));
    };
  }
  private emit(event: string, data: unknown) {
    for (const fn of this.handlers.get(event) ?? []) fn(data);
  }

  connect(url: string, token: string, timeoutMs = 3000): Promise<AgentHello> {
    this.url = url;
    this.token = token;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => { ws.close(); reject(new Error('Agent connection timed out')); }, timeoutMs);
      ws.onopen = () => {
        clearTimeout(timer);
        // handshake — only after the socket is actually open
        this.request('hello', { token }, 4000).then((data) => {
          const hello = ((data && data.hello) || data) as AgentHello;
          this.connected = true;
          this.hello = hello;
          this.emit('status', true);
          resolve(hello);
        }).catch((e) => { reject(e); });
      };
      ws.onmessage = (ev) => this.onMessage(ev.data as string);
      ws.onerror = () => { clearTimeout(timer); reject(new Error('Agent unreachable')); };
      ws.onclose = () => {
        this.connected = false;
        this.emit('status', false);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.scheduleReconnect();
      };
      ws.onerror = () => { /* onclose follows */ };
      this.ws = ws;
    });
  }

  scheduleReconnect(ms = 5000) {
    if (!this.url || !this.token || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.connected || !this.url) return;
      this.connect(this.url, this.token, 2500).then((h) => this.emit('reconnected', h)).catch(() => this.scheduleReconnect());
    }, ms);
  }

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.url = '';
    this.connected = false;
    this.hello = null;
    try { this.ws?.close(); } catch { /* ignore */ }
    this.ws = null;
    this.pending.forEach((p) => p.reject(new Error('Agent disconnected')));
    this.pending.clear();
    this.emit('status', false);
  }

  private onMessage(raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'event') {
      this.emit(`event:${msg.name}`, msg);
      return;
    }
    if (msg.id != null && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      if (msg.ok) p.resolve(msg); else p.reject(new Error(msg.reason || 'Agent request failed'));
    }
  }

  request(type: string, payload: Record<string, unknown> = {}, timeoutMs = 8000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Agent not connected'));
        return;
      }
      const id = ++this.seq;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Agent request ${type} timed out`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.ws.send(JSON.stringify({ id, type, ...payload }));
    });
  }

  stats(): Promise<AgentStats> { return this.request('stats').then((m) => m.data as AgentStats); }
  subscribe(interval: number) { return this.request('subscribe', { interval }); }
  ping(): Promise<boolean> { return this.request('ping').then(() => true); }
  requestPermission(perm: string): Promise<boolean> { return this.request('request_permission', { perm }).then(() => true); }
  processes(): Promise<AgentProcess[]> { return this.request('processes').then((m) => m.data ?? []); }
  // NOTE: session ids travel in a dedicated `sid` field so they never
  // collide with the request correlation `id` on the wire.
  execOpen(sid: string, shell: string, cwd?: string): Promise<any> { return this.request('exec_open', { sid, shell, cwd }); }
  execInput(sid: string, data: string): Promise<void> { return this.request('exec_input', { sid, data }).then(() => undefined); }
  execClose(sid: string): Promise<void> { return this.request('exec_close', { sid }).then(() => undefined); }
}

export const agentClient = new VoxAgentClient();
