import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { VNode } from '../lib/types';
import { fileExt, isSecretPath } from '../lib/vfs';
import { Icon } from './ui';
import { sfx } from '../lib/sounds';

const EXT_ICON: Record<string, string> = {
  ts: 'FileCode2', tsx: 'FileCode2', js: 'FileCode2', jsx: 'FileCode2', py: 'FileCode2',
  json: 'Braces', html: 'FileCode2', css: 'FileCode2', md: 'FileText', yaml: 'Braces',
  log: 'ScrollText', txt: 'FileText', java: 'FileCode2', cpp: 'FileCode2', cs: 'FileCode2',
};

interface Props {
  node: VNode;
  base?: string[];
  selected?: string | null;
  onSelect?: (path: string) => void;
  onContext?: (path: string, x: number, y: number) => void;
  expanded?: Set<string>;
  onToggle?: (path: string) => void;
  showSecretGuard?: boolean;
}

export function FileTree({ node, base = [], selected, onSelect, onContext, expanded, onToggle, showSecretGuard }: Props) {
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set(['src']));
  const expandedSet = expanded ?? localExpanded;
  const toggle = onToggle ?? ((p: string) => {
    const next = new Set(localExpanded);
    if (next.has(p)) next.delete(p); else next.add(p);
    setLocalExpanded(next);
  });

  const render = (n: VNode, path: string[], depth: number): React.ReactNode => {
    const pathStr = path.join('/');
    const secret = showSecretGuard && isSecretPath(path);
    if (n.kind === 'dir') {
      const isOpen = expandedSet.has(pathStr);
      return (
        <div key={pathStr}>
          <button
            className="w-full flex items-center gap-1.5 px-2 py-[3px] rounded-md hover:bg-white/5 text-left group"
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => { sfx.command(); toggle(pathStr); }}
            onContextMenu={(e) => { e.preventDefault(); onContext?.(pathStr, e.clientX, e.clientY); }}
          >
            <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={11} className="text-vox-dim shrink-0" />
            <Icon name="Folder" size={13} className={isOpen ? 'text-cyan-400' : 'text-vox-dim'} />
            <span className="text-[12px] text-vox-text truncate">{n.name}</span>
          </button>
          {isOpen && <div>{n.children.map((c) => render(c, [...path, c.name], depth + 1))}</div>}
        </div>
      );
    }
    const isSel = selected === pathStr;
    const ext = fileExt(n.name);
    const icon = EXT_ICON[ext] ?? (secret ? 'Lock' : 'File');
    return (
      <button
        key={pathStr}
        data-path={pathStr}
        onClick={() => { sfx.command(); onSelect?.(pathStr); }}
        onContextMenu={(e) => { e.preventDefault(); onContext?.(pathStr, e.clientX, e.clientY); }}
        className={clsx('w-full flex items-center gap-1.5 px-2 py-[3px] rounded-md text-left', isSel ? 'bg-cyan-400/10 text-cyan-200' : 'hover:bg-white/5 text-vox-text')}
        style={{ paddingLeft: 8 + depth * 12 + 14 }}
      >
        <Icon name={icon} size={13} className={isSel ? 'text-cyan-400' : secret ? 'text-amber-400/80' : 'text-vox-dim'} />
        <span className="text-[12px] truncate">{n.name}</span>
        {secret && <span className="ml-auto hud-label !text-[8px] text-amber-400/80 border border-amber-400/20 rounded px-1 py-px shrink-0">GUARDED</span>}
      </button>
    );
  };

  return <div className="py-1">{render(node, base, 0)}</div>;
}

export function useTreeStats(node: VNode): { files: number; dirs: number } {
  return useMemo(() => {
    let files = 0, dirs = 0;
    const walk = (n: VNode) => {
      if (n.kind === 'file') files++;
      else { dirs++; n.children.forEach(walk); }
    };
    walk(node);
    return { files, dirs };
  }, [node]);
}
