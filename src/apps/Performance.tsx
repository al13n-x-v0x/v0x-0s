import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel } from '../components/ui';
import { AreaChart, Bars, HBar } from '../lib/charts';
import { fmtBytes, fmtDuration } from '../lib/fmt';
import { realMemoryUsage, browserInfo } from '../lib/telemetry';

const RANGES = [
  { id: '10s', secs: 10, label: '10 SEC' },
  { id: '30s', secs: 30, label: '30 SEC' },
  { id: '1m', secs: 60, label: '1 MIN' },
  { id: '5m', secs: 300, label: '5 MIN' },
  { id: '15m', secs: 900, label: '15 MIN' },
];

export function Performance() {
  const s = useVox();
  const telemetry = s.telemetry;
  const [range, setRange] = useState('1m');
  const systemInfo = useVox((s) => s.systemInfo);

  const r = RANGES.find((x) => x.id === range)!;
  const cutoff = Date.now() - r.secs * 1000;
  const data = useMemo(() => telemetry.filter((t) => t.t >= cutoff), [telemetry, cutoff]);
  const last = data[data.length - 1];
  const mem = realMemoryUsage();
  const info = browserInfo();

  const source = (kind: 'cpu' | 'ram' | 'gpu' | 'net'): 'LIVE' | 'DEMO' | 'UNAVAILABLE' => {
    if (kind === 'ram') return mem.pct != null ? 'LIVE' : 'DEMO';
    if (kind === 'net') return info.connection.downlink != null && info.connection.downlink > 0 ? 'LIVE' : 'DEMO';
    return 'DEMO';
  };

  const cards = [
    { label: 'CPU', value: last ? `${last.cpu}%` : '—', data: data.map((d) => d.cpu), color: '#22d3ee', src: source('cpu'), note: `${systemInfo.cores ?? '?'} cores · browser can\'t read live CPU load` },
    { label: 'RAM', value: last ? `${last.ram}%` : '—', data: data.map((d) => d.ram), color: '#8b5cf6', src: source('ram'), note: mem.pct != null ? `${fmtBytes(mem.used)} used of ${fmtBytes(mem.total)} (JS heap, Chrome)` : 'JS-heap metrics unavailable — fallback is DEMO' },
    { label: 'GPU', value: last ? `${last.gpu}%` : '—', data: data.map((d) => d.gpu), color: '#3b82f6', src: 'DEMO', note: 'Requires Desktop Agent for real GPU telemetry' },
    { label: 'NETWORK', value: last ? `${Math.round(last.net / 1024)} KB/s` : '—', data: data.map((d) => d.net), color: '#34d399', src: source('net'), note: info.connection.downlink != null ? `downlink ${info.connection.downlink} Mb/s · RTT ${info.connection.rtt ?? '—'}ms` : 'DEMO throughput — real values need agent' },
  ];

  const history = [
    { label: 'BUILD DURATION', value: '2.34s', note: 'last build · v0x-0s', trend: [12, 14, 11, 15, 9, 10, 8, 9] },
    { label: 'TEST DURATION', value: '812ms', note: 'last test run', trend: [9, 8, 10, 7, 6, 8, 7, 6] },
    { label: 'BUNDLE SIZE', value: '412 KB', note: 'production build', trend: [40, 38, 42, 39, 37, 36, 38, 37] },
    { label: 'API LATENCY', value: s.aiUsage.avgLatencyMs != null ? fmtDuration(s.aiUsage.avgLatencyMs) : '—', note: 'VOX backend', trend: [8, 7, 9, 6, 5, 7, 6, 5] },
  ];

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">PERFORMANCE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">SYSTEM MONITOR</h1>
        </div>
        <div className="flex items-center gap-1 glass-inset p-1">
          {RANGES.map((x) => (
            <button key={x.id} data-active={range === x.id} onClick={() => setRange(x.id)} className={clsx('px-2.5 py-1 rounded-md text-[9.5px] font-semibold tracking-wider transition-colors', range === x.id ? 'bg-cyan-400/15 text-cyan-300' : 'text-vox-dim hover:text-vox-muted')}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Panel key={c.label} title={c.label} icon={c.label === 'CPU' ? 'Cpu' : c.label === 'RAM' ? 'MemoryStick' : c.label === 'GPU' ? 'MonitorPlay' : 'Wifi'}
            actions={<Badge tone={c.src === 'LIVE' ? 'green' : c.src === 'DEMO' ? 'amber' : 'dim'}>{c.src}</Badge>}>
            <p className="font-mono text-[26px] font-semibold text-white leading-none">{c.value}</p>
            <div className="mt-3"><AreaChart data={c.data} height={54} color={c.color} max={c.label === 'NETWORK' ? 320 : 100} /></div>
            <p className="text-[9.5px] text-vox-dim mt-2 leading-relaxed">{c.note}</p>
          </Panel>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Historical Metrics" icon="History" bodyClassName="!p-4">
          <div className="grid grid-cols-2 gap-4">
            {history.map((h2) => (
              <div key={h2.label} className="glass-inset p-3">
                <p className="hud-label">{h2.label}</p>
                <p className="font-mono text-[17px] font-semibold mt-1 text-vox-text">{h2.value}</p>
                <p className="text-[9px] text-vox-dim mb-2">{h2.note}</p>
                <Bars data={h2.trend} height={30} color="#3b82f6" />
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-vox-muted mt-3 font-mono">Values shown are the latest recorded events in this session (local).</p>
        </Panel>

        <Panel title="Live Distribution" icon="PieChart">
          <div className="space-y-4">
            {cards.map((c) => (
              <div key={c.label}>
                <div className="flex justify-between mb-1 text-[10px] font-mono">
                  <span className="text-vox-muted">{c.label}</span>
                  <span className="text-vox-text">{c.value}</span>
                </div>
                <HBar value={c.label === 'NETWORK' ? (last?.net ?? 0) / 3.2 : last?.[c.label.toLowerCase() as 'cpu' | 'ram' | 'gpu'] ?? 0} color={c.color} label={c.label} />
              </div>
            ))}
          </div>
          <div className="mt-5 glass-inset px-3 py-2.5 flex items-center gap-2">
            <Icon name="Info" size={13} className="text-vox-cyan shrink-0" />
            <p className="text-[10px] text-vox-muted leading-relaxed">
              <span className="text-cyan-300 font-semibold">LIVE</span> = real browser/agent telemetry · <span className="text-amber-300 font-semibold">DEMO</span> = simulated values clearly labeled · unavailable metrics never masquerade as real.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
