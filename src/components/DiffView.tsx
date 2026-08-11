import clsx from 'clsx';

interface DiffLine {
  type: 'same' | 'add' | 'del';
  text: string;
}

export function DiffView({ lines, maxHeight = 280 }: { lines: DiffLine[]; maxHeight?: number }) {
  const adds = lines.filter((l) => l.type === 'add').length;
  const dels = lines.filter((l) => l.type === 'del').length;
  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-[10px] font-mono">
        <span className="text-emerald-300">+ {adds} added</span>
        <span className="text-red-300">− {dels} removed</span>
        <span className="text-vox-dim">{lines.length - adds - dels} unchanged</span>
      </div>
      <div className="glass-inset overflow-auto font-mono text-[11.5px] leading-[1.7]" style={{ maxHeight }}>
        {lines.map((l, i) => (
          <div key={i} className={clsx('flex px-3', l.type === 'add' ? 'bg-emerald-400/[0.08] text-emerald-200' : l.type === 'del' ? 'bg-red-400/[0.08] text-red-200 line-through decoration-red-400/40' : 'text-vox-muted')}>
            <span className="w-6 shrink-0 select-none text-vox-dim/60">{l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' '}</span>
            <span className="whitespace-pre-wrap break-all">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
