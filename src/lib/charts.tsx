import { useMemo } from 'react';

const C = {
  cyan: '#22d3ee',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  grid: 'rgba(148,163,184,0.08)',
};

export function smoothPath(points: [number, number][], pad = 0): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

interface AreaChartProps {
  data: number[];
  height?: number;
  color?: string;
  max?: number;
  min?: number;
  fill?: boolean;
  showGrid?: boolean;
  strokeWidth?: number;
  label?: string;
}

export function AreaChart({ data, height = 64, color = C.cyan, max = 100, min = 0, fill = true, showGrid = true, strokeWidth = 1.5 }: AreaChartProps) {
  const { path, area, gridLines } = useMemo(() => {
    const w = 100;
    const h = 100;
    const span = Math.max(1, max - min);
    const pts: [number, number][] = data.map((v, i) => {
      const x = data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w;
      const y = h - ((Math.min(max, Math.max(min, v)) - min) / span) * h;
      return [x, y];
    });
    const p = smoothPath(pts);
    const areaPath = pts.length ? `${p} L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z` : '';
    const gl = [25, 50, 75].map((g) => ({ y: g, key: `g${g}` }));
    return { path: p, area: areaPath, gridLines: gl };
  }, [data, max, min]);

  const gid = useMemo(() => `g${Math.random().toString(36).slice(2, 8)}`, []);
  const last = data[data.length - 1] ?? 0;
  const pct = Math.round(((last - min) / Math.max(1, max - min)) * 100);

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid && gridLines.map((g) => <line key={g.key} x1="0" x2="100" y1={g.y} y2={g.y} stroke={C.grid} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
      {fill && area && <path d={area} fill={`url(#${gid})`} />}
      {path && <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color}55)` }} />}
      {data.length > 1 && (
        <circle cx={100} cy={100 - pct} r="2.2" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      )}
    </svg>
  );
}

interface GaugeProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function Gauge({ value, max = 100, size = 128, stroke = 8, color = C.cyan, label, sublabel }: GaugeProps) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold text-white">{label ?? Math.round(value)}</span>
        {sublabel && <span className="hud-label mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}

interface BarsProps {
  data: number[];
  height?: number;
  color?: string;
  max?: number;
}

export function Bars({ data, height = 56, color = C.cyan, max = 100 }: BarsProps) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((v, i) => {
        const h = Math.max(6, (Math.min(max, Math.max(0, v)) / max) * 100);
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${h}%`, background: `linear-gradient(180deg, ${color}cc, ${color}22)`, boxShadow: i === data.length - 1 ? `0 0 6px ${color}66` : undefined }}
          />
        );
      })}
    </div>
  );
}

export function MiniSparkline({ data, color = C.cyan, width = 80, height = 22 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const pts: [number, number][] = data.map((v, i) => [ (i / (data.length - 1)) * width, height - ((v - min) / Math.max(1, max - min)) * height ]);
    return smoothPath(pts);
  }, [data, width, height]);
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {path && <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function HBar({ value, max = 100, color = C.cyan, height = 5, label }: { value: number; max?: number; color?: string; height?: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full" role="progressbar" aria-valuenow={pct} aria-label={label}>
      <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'rgba(148,163,184,0.1)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}55`, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}
