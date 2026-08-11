import { useMemo, useState } from 'react';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel, StatusDot } from '../components/ui';

const QUICK_CMDS: { label: string; desc: string; icon: string; cmd: string }[] = [
  { label: 'SYSTEM INFO', desc: 'OS, hostname, uptime', icon: 'MonitorCog', cmd: 'systeminfo | Select-Object -First 12' },
  { label: 'PROCESSES', desc: 'Top 12 running processes', icon: 'ListOrdered', cmd: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 12 Name, Id, CPU, WS' },
  { label: 'NETWORK', desc: 'Network interfaces + IPs', icon: 'Wifi', cmd: 'ipconfig' },
  { label: 'DISK', desc: 'Volume usage', icon: 'HardDrive', cmd: 'Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free' },
];

export function MobileRemote() {
  const s = useVox();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const connected = s.agentState.status === 'connected';
  const stats = s.agentStats;
  const host = s.agentState.os?.hostname ?? stats.hostname ?? '—';

  const remoteSession = useMemo(() => {
    const terms = s.terminalSessions.filter((t) => t.agentMode);
    return terms[terms.length - 1];
  }, [s.terminalSessions]);

  const lastOutput = useMemo(() => {
    if (!remoteSession) return null;
    return remoteSession.history.slice(-14).filter((h) => h.kind !== 'sys');
  }, [remoteSession]);

  const run = async (label: string, cmd: string) => {
    if (s.agentState.status !== 'connected') {
      setMsg('AGENT NOT CONNECTED — start the Desktop Agent on the host machine first.');
      return;
    }
    setBusy(label);
    setMsg('');
    // fresh session so the remote output panel stays clean
    s.newTerminal(s.settings.defaultShell);
    const sid = useVox.getState().terminalActive;
    const t = useVox.getState().terminalSessions.find((x) => x.id === sid);
    if (t && !t.agentSessionId) await useVox.getState().agentOpenSession(sid).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 250));
    useVox.getState().agentSessionInput(sid, cmd);
    setMsg(`Command dispatched to ${host}: ${cmd}`);
    setTimeout(() => setBusy(null), 1200);
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">REMOTE CONTROL</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">MOBILE REMOTE</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot tone={connected ? 'online' : 'dim'} pulse={connected} />
          <Badge tone={connected ? 'green' : 'dim'}>{connected ? `LINKED · ${host}` : 'AGENT OFFLINE'}</Badge>
        </div>
      </div>

      {!connected && (
        <div className="glass hud-border rounded-xl p-4 flex items-start gap-3">
          <Icon name="Wifi" size={16} className="text-amber-300 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-semibold text-vox-text">This page controls your machine over your local network (WiFi)</p>
            <p className="text-[11px] text-vox-muted mt-1 leading-relaxed">Open VOX-OS on your phone and connect it to the same WiFi as this PC. The web shell auto-discovers the Desktop Agent on the LAN — start it with <span className="font-mono text-cyan-300">node agent/index.js</span> on this machine, then reload this page.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Panel title="Quick actions" icon="Zap" bodyClassName="!p-3">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_CMDS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => void run(q.label, q.cmd)}
                  disabled={!connected || busy !== null}
                  className="glass-inset rounded-xl p-3 text-left hover:border-cyan-400/40 transition-colors disabled:opacity-40"
                >
                  <Icon name={q.icon} size={16} className="text-cyan-300 mb-1.5" />
                  <p className="text-[11.5px] font-semibold text-vox-text">{q.label}</p>
                  <p className="text-[9.5px] text-vox-muted mt-0.5">{q.desc}</p>
                </button>
              ))}
            </div>
            {msg && <p className="text-[10px] font-mono text-cyan-300 mt-2.5 px-1">{msg}</p>}
          </Panel>

          <Panel title="Live host telemetry" icon="Activity" bodyClassName="!p-3.5">
            {connected && stats.cpu !== null ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['CPU', `${Math.round(stats.cpu)}%`, 'text-cyan-300'],
                  ['MEMORY', `${Math.round(stats.memPct ?? 0)}%`, 'text-violet-300'],
                  ['DISK', `${Math.round(stats.diskPct ?? 0)}%`, 'text-blue-300'],
                  ['UPTIME', stats.uptime ? `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m` : '—', 'text-amber-300'],
                ].map(([k, v, c]) => (
                  <div key={k} className="glass-inset rounded-xl p-3">
                    <p className="font-display text-[17px] font-semibold text-vox-text">{v}</p>
                    <p className={`hud-label mt-0.5 ${c}`}>{k}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-vox-muted">Telemetry streams from the Desktop Agent — connect to see live CPU, memory, disk, and uptime from {host}.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Command output" icon="SquareTerminal" bodyClassName="!p-3">
            {lastOutput && lastOutput.length > 0 ? (
              <div className="space-y-1 font-mono text-[10.5px] leading-relaxed max-h-[300px] overflow-y-auto">
                {lastOutput.map((h, i) => (
                  <p key={i} className={h.kind === 'err' ? 'text-red-400' : h.kind === 'in' ? 'text-cyan-300' : 'text-vox-muted whitespace-pre-wrap break-all'}>{h.kind === 'in' ? `> ${h.input}` : h.output}</p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-vox-muted">Real command output from the host shell appears here. Commands run through the same Desktop Agent sessions as the Terminal app.</p>
            )}
          </Panel>

          <Panel title="Bluetooth · USB · APK" icon="Smartphone" bodyClassName="!p-3.5">
            <div className="space-y-2 text-[11px] text-vox-muted leading-relaxed">
              <p><span className="text-vox-text font-semibold">WiFi (this page):</span> fully supported — VOX-OS is a PWA, so install it on your phone from the browser menu and it behaves like an app. Add it to your home screen for a full-screen, offline-capable remote.</p>
              <p><span className="text-vox-text font-semibold">Bluetooth / USB:</span> a browser page cannot pair with Bluetooth or USB devices, so direct BT/USB control isn't possible from the web shell. The Desktop Agent is the correct bridge — run it on the host and drive it over the network.</p>
              <p><span className="text-vox-text font-semibold">Real APK:</span> wrap VOX-OS with Capacitor to produce an installable Android APK (the agent's WebSocket client and PWA assets port over as-is). Requires the Android SDK, which isn't present in this environment — but the web app is already fully functional as an installable PWA.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
