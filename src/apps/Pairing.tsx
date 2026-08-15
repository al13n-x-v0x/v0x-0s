import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Badge, Button, Icon, Panel, StatusDot } from '../components/ui';
import { useVox } from '../lib/store';
import { sfx } from '../lib/sounds';

// ============================================================
// LAN PAIRING — scan once, control the laptop from the phone.
// The QR encodes the laptop's backend URL (+ pairing token), so
// the phone opens VOX-OS pointed at this machine, and the agent
// bridge (server /ws/agent) gives it real control over the LAN.
// ============================================================

interface PairingInfo {
  desktop: boolean;
  port: number;
  lan: { name: string; address: string }[];
  pairToken: string;
  expiresAt?: number;
  revoked?: boolean;
  ttlMs?: number;
  agent: { port: number; hostname: string } | null;
  remote: boolean;
  hostname: string;
}

function fmtRemaining(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m <= 0) return 'expired';
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

async function genQR(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 300,
    errorCorrectionLevel: 'M',
    color: { dark: '#05060a', light: '#ffffff' },
  });
}

export function Pairing() {
  const s = useVox();
  const [info, setInfo] = useState<PairingInfo | null>(null);
  const [error, setError] = useState('');
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pairUrl, setPairUrl] = useState('');
  const [revoked, setRevoked] = useState(false);
  const [expiry, setExpiry] = useState<number | null>(null);
  const [, setTick] = useState(0);

  // refresh the expiry countdown every 30s
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const pairedHost = s.pairHost;
  const pairedToken = s.pairToken;
  const token = info?.pairToken ?? pairedToken ?? '';
  const connected = s.agentState.status === 'connected';

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/pairing');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PairingInfo;
      setInfo(data);
      setRevoked(!!data.revoked);
      setExpiry(data.expiresAt ?? null);
      // QR for the first LAN address (plus whatever the pair token is)
      const t = !data.revoked ? (data.pairToken || pairedToken || '') : '';
      const host = data.lan[0]?.address;
      if (host && t) {
        const base = `http://${host}:${data.port}`;
        setPairUrl(base);
        const web = `${base}/?pair=${encodeURIComponent(t)}`;
        const app = `voxos://pair?url=${encodeURIComponent(base)}&pair=${encodeURIComponent(t)}`;
        const [qWeb, qApp] = await Promise.all([genQR(web), genQR(app)]);
        setQrs({ web: qWeb, app: qApp });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the backend — start it with: node server/index.js');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const rotate = async () => {
    sfx.command();
    setBusy(true);
    try {
      const res = await fetch('/api/pairing/rotate', { method: 'POST' });
      const data = (await res.json()) as { pairToken?: string };
      if (data.pairToken) {
        setRevoked(false);
        setExpiry(Date.now() + (info?.ttlMs ?? 24 * 60 * 60 * 1000));
        setInfo((prev) => (prev ? { ...prev, pairToken: data.pairToken! } : prev));
        const host = info?.lan[0]?.address;
        if (host && info) {
          const base = `http://${host}:${info.port}`;
          const t = data.pairToken;
          const web = `${base}/?pair=${encodeURIComponent(t)}`;
          const app = `voxos://pair?url=${encodeURIComponent(base)}&pair=${encodeURIComponent(t)}`;
          const [qWeb, qApp] = await Promise.all([genQR(web), genQR(app)]);
          setQrs({ web: qWeb, app: qApp });
          setPairUrl(base);
        }
      }
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    s.pushNotification({ category: 'SYSTEM', severity: 'success', title: 'COPIED', body: `${label} copied to clipboard.` });
  };

  const revoke = async () => {
    if (!confirm('Revoke pairing? Every existing QR link and connected phone session will be killed immediately.')) return;
    sfx.command();
    setBusy(true);
    try {
      const res = await fetch('/api/pairing/revoke', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; pairToken?: string };
      if (data.ok) {
        setRevoked(true);
        setExpiry(null);
        setQrs({});
        setPairUrl('');
        s.pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'PAIRING REVOKED', body: 'All existing pairing links and phone sessions are dead.' });
      }
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const connectBridge = async () => {
    if (!pairedToken) return;
    sfx.command();
    await s.connectAgent();
    s.pushNotification({ category: 'SYSTEM', severity: pairedHost ? 'success' : 'warning', title: 'AGENT', body: pairedHost ? `Connecting through ${pairedHost}…` : 'Agent connection requested.' });
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="hud-label mb-1.5">LAN · ONE SCAN · SECURE BRIDGE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">PHONE PAIRING</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={info ? 'green' : 'dim'}>{info ? `BACKEND ONLINE · :${info.port}` : 'BACKEND OFFLINE'}</Badge>
          <Badge tone={connected ? 'green' : 'dim'}>
            <span className={connected ? 'dot dot-online' : 'dot dot-dim'} /> {connected ? 'AGENT LINKED' : 'AGENT —'}
          </Badge>
          <Badge tone={revoked ? 'amber' : expiry ? 'cyan' : 'dim'}>{revoked ? 'PAIRING REVOKED' : expiry ? `TOKEN ${fmtRemaining(expiry - Date.now())}` : 'TOKEN —'}</Badge>
          <Button size="xs" variant="ghost" icon="RefreshCw" onClick={() => void load()} disabled={busy}>REFRESH</Button>
        </div>
      </div>

      {pairedHost && (
        <div className="glass hud-border p-4 flex items-center gap-3 flex-wrap border-violet-400/30">
          <StatusDot tone="online" pulse />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-violet-200">THIS DEVICE IS PAIRED → {pairedHost}</p>
            <p className="text-[10.5px] text-vox-muted font-mono">Agent traffic flows through the pairing bridge — the laptop's agent token never reaches this device.</p>
          </div>
          <Button variant="cyan" icon="PlugZap" onClick={() => void connectBridge()} disabled={connected || s.agentState.status === 'connecting'}>
            {connected ? 'CONNECTED' : s.agentState.status === 'connecting' ? 'CONNECTING…' : 'CONNECT TO PC'}
          </Button>
        </div>
      )}

      {error && (
        <Panel title="Error" icon="TriangleAlert" glow="violet">
          <p className="text-[12px] text-red-300 font-mono">{error}</p>
          <p className="text-[11px] text-vox-muted mt-1.5">The backend serves this screen — run <span className="text-cyan-300 font-mono">node server/index.js</span> on the laptop (the EXE does this automatically).</p>
        </Panel>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* QR panel */}
        <Panel title="Scan to control this laptop" icon="QrCode" glow={revoked ? 'violet' : 'cyan'}>
          {revoked && !qrs.web && (
            <div className="py-8 text-center">
              <Icon name="Unplug" size={26} className="text-amber-400 mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-amber-200">PAIRING REVOKED</p>
              <p className="text-[11.5px] text-vox-muted mt-1.5 max-w-sm mx-auto leading-relaxed">Every existing QR link and connected phone session has been killed. Generate a new token to re-enable remote control — the old token is permanently dead.</p>
              <div className="mt-4">
                <Button size="xs" variant="cyan" icon="KeyRound" onClick={() => void rotate()} disabled={busy}>GENERATE NEW TOKEN</Button>
              </div>
            </div>
          )}
          {!qrs.web && !error && !revoked && (
            <div className="py-8 text-center text-[12px] text-vox-dim font-mono">{busy ? 'GENERATING QR…' : 'Waiting for the backend…'}</div>
          )}
          {qrs.web && (
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="shrink-0">
                <img src={qrs.web} alt="Pair with phone (browser)" width={220} height={220} className="rounded-lg border border-white/10" style={{ imageRendering: 'pixelated' }} />
                <p className="hud-label mt-2 text-center">BROWSER (NO APP NEEDED)</p>
              </div>
              <div className="shrink-0">
                <img src={qrs.app} alt="Pair with phone (VOX-OS app)" width={220} height={220} className="rounded-lg border border-white/10" style={{ imageRendering: 'pixelated' }} />
                <p className="hud-label mt-2 text-center">OPEN IN VOX-OS APP</p>
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="hud-label mb-1.5">CONNECTION URL</p>
                <p className="font-mono text-[11px] text-cyan-200 break-all bg-ink-900/70 border border-vox-line rounded-lg px-3 py-2">{pairUrl}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Button size="xs" variant="cyan" icon="Copy" onClick={() => void copy(`${pairUrl}/?pair=${encodeURIComponent(token)}`, 'Pairing URL')}>COPY URL</Button>
                  <Button size="xs" variant="ghost" icon="RefreshCw" onClick={() => void rotate()} disabled={busy}>NEW TOKEN</Button>
                  <Button size="xs" variant="danger" icon="Unplug" onClick={() => void revoke()} disabled={busy}>REVOKE</Button>
                </div>
                <p className="text-[10.5px] text-vox-muted mt-3 leading-relaxed">Same Wi-Fi required. The phone's camera can scan either QR — browsers and the VOX-OS app both land on the full remote desktop. Tokens expire automatically after {info?.ttlMs ? Math.round(info.ttlMs / 3_600_000) : 24}h — rotate or revoke any time.</p>
              </div>
            </div>
          )}
        </Panel>

        {/* LAN panel */}
        <div className="space-y-4">
          <Panel title="Network targets" icon="Wifi" bodyClassName="!p-2.5">
            {!info && <p className="text-[11px] text-vox-dim p-2">No LAN info yet.</p>}
            {info && info.lan.length === 0 && <p className="text-[11px] text-vox-muted p-2">No non-loopback IPv4 interfaces detected. Connect to Wi-Fi / Ethernet, then refresh.</p>}
            {info && info.lan.map((i) => (
              <button key={i.address} onClick={() => { const base = `http://${i.address}:${info.port}`; void copy(`${base}/?pair=${encodeURIComponent(token)}`, i.address); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] text-left transition-colors group">
                <Icon name="Network" size={14} className="text-cyan-300" />
                <div className="flex-1">
                  <p className="font-mono text-[12px] text-vox-text">{i.address}<span className="text-vox-dim">:{info.port}</span></p>
                  <p className="text-[9.5px] font-mono text-vox-dim">{i.name}</p>
                </div>
                <span className="text-[9px] text-vox-dim group-hover:text-cyan-300 font-mono">COPY ⇗</span>
              </button>
            ))}
          </Panel>
          <Panel title="Host info" icon="MonitorCog" bodyClassName="!p-3.5">
            <div className="grid grid-cols-2 gap-2 text-[11.5px] font-mono">
              <p className="text-vox-dim">HOST <span className="text-vox-text">{info?.hostname ?? '—'}</span></p>
              <p className="text-vox-dim">MODE <span className="text-vox-text">{info?.desktop ? 'EXE DESKTOP' : info?.remote ? 'REMOTE' : 'WEB'}</span></p>
              <p className="text-vox-dim">AGENT <span className="text-vox-text">{info?.agent ? `ws://127.0.0.1:${info.agent.port}` : 'OFFLINE'}</span></p>
              <p className="text-vox-dim">TOKEN <span className="text-cyan-300">{token ? token.slice(0, 8) + '…' : '—'}</span></p>
            </div>
            <p className="text-[10px] text-vox-dim mt-3 leading-relaxed">Security: the pairing token only unlocks the agent bridge. The real agent token is stored on the laptop and never sent to the phone. Rotate the token any time from here.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
