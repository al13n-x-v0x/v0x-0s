import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Badge, Button, Icon, Panel } from '../components/ui';
import { renderMarkdown } from '../lib/markdown';
import { timeAgo } from '../lib/fmt';
import { sfx } from '../lib/sounds';

// ============================================================
// VOXNOTES — markdown notes with autosave + split preview.
// Concept inspired by santhoshsharuk/Vox-OS's notes editor;
// implemented native to VOX-OS (no Monaco, no new deps).
// Notes persist to localStorage only — they never leave the machine.
// ============================================================

interface VoxNote {
  id: string;
  body: string;
  updated: number;
}

const STORAGE_KEY = 'vox-notes-v1';

function loadNotes(): VoxNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VoxNote[];
    return Array.isArray(parsed) ? parsed.filter((n) => n && typeof n.id === 'string') : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: VoxNote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* storage full / private mode — non-fatal */
  }
}

function noteTitle(n: VoxNote): string {
  const first = n.body.split('\n').find((l) => l.trim() && !/^```/.test(l.trim()));
  const t = (first ?? 'Untitled')
    .replace(/^#{1,4}\s+/, '')
    .replace(/[*_`>#]/g, '')
    .trim()
    .slice(0, 32);
  return t || 'Untitled';
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const WELCOME = `# Welcome to VOXNOTES

Markdown notes that autosave to **your machine**. No account, no cloud, no server — the text never leaves this device.

## Write it your way

- \`inline code\` for commands and flags
- **bold** for emphasis, *italic* for nuance
- [links](https://github.com/al13n-x-v0x/v0x-0s) to anything

### Code sample

\`\`\`js
// fenced code blocks for snippets
console.log('dev mode');
\`\`\`

## Tips

1. Switch between **EDIT / PREVIEW / SPLIT** in the toolbar
2. Everything saves automatically ~1s after you stop typing
3. Use notes for docs, commands, or quick reference sheets

> VOX-OS · A Dev's First Choice
`;

export function Notes() {
  const [notes, setNotes] = useState<VoxNote[]>(() => {
    const existing = loadNotes();
    return existing.length ? existing : [{ id: uid(), body: WELCOME, updated: Date.now() }];
  });
  const [activeId, setActiveId] = useState<string>(() => notes[0]?.id ?? '');
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [query, setQuery] = useState('');
  const saveTimer = useRef<number | null>(null);

  const active = notes.find((n) => n.id === activeId) ?? notes[0];

  // persist on change (debounced 800ms)
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveNotes(notes), 800);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [notes]);

  const updateBody = (body: string) => {
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, body, updated: Date.now() } : n)));
  };

  const createNote = () => {
    sfx.command();
    const n = { id: uid(), body: '# Untitled\n\n', updated: Date.now() };
    setNotes((prev) => [n, ...prev]);
    setActiveId(n.id);
    setMode('edit');
  };

  const removeNote = (id: string) => {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    const next = notes.filter((n) => n.id !== id);
    setNotes(next.length ? next : [{ id: uid(), body: '# Untitled\n\n', updated: Date.now() }]);
    if (activeId === id) setActiveId(next[0]?.id ?? '');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.body.toLowerCase().includes(q) || noteTitle(n).toLowerCase().includes(q));
  }, [notes, query]);

  const words = useMemo(() => (active ? active.body.trim().split(/\s+/).filter(Boolean).length : 0), [active]);

  return (
    <div className="p-5 animate-fade-in h-full flex flex-col">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="hud-label mb-1.5">LOCAL · PRIVATE · AUTOSAVE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">VOXNOTES</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="cyan">{notes.length} NOTE{notes.length === 1 ? '' : 'S'}</Badge>
          <Badge tone="violet">MARKDOWN</Badge>
          <Button variant="cyan" icon="Plus" onClick={createNote}>NEW NOTE</Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* sidebar */}
        <aside className="w-56 shrink-0 flex flex-col gap-2 min-h-0">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes…" className="vox-input !py-1.5 !text-[11px]" />
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filtered.length === 0 && <p className="text-[11px] text-vox-dim text-center py-6">No notes match.</p>}
            {filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => { setActiveId(n.id); sfx.command(); }}
                className={clsx('w-full text-left glass px-3 py-2.5 border transition-colors group', activeId === n.id ? 'border-cyan-400/40 bg-cyan-400/[0.05]' : 'hud-border hover:bg-white/[0.03]')}
              >
                <p className={clsx('text-[11.5px] font-semibold truncate', activeId === n.id ? 'text-cyan-200' : 'text-vox-text')}>{noteTitle(n)}</p>
                <p className="font-mono text-[9px] text-vox-dim mt-0.5">{timeAgo(n.updated)}</p>
              </button>
            ))}
          </div>
          <p className="font-mono text-[9px] text-vox-dim leading-relaxed">Notes live in localStorage on this device only.</p>
        </aside>

        {/* editor */}
        <div className="flex-1 min-w-0 flex flex-col glass hud-border">
          {/* toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-vox-line/50 flex-wrap">
            <Icon name="StickyNote" size={13} className="text-vox-cyan" />
            <span className="text-[11px] font-semibold text-vox-text truncate">{active ? noteTitle(active) : '—'}</span>
            <span className="ml-auto font-mono text-[9.5px] text-vox-dim">{words} words · autosaved</span>
            <div className="flex gap-1">
              {(['edit', 'preview', 'split'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx('px-2 py-1 rounded-md text-[9px] font-bold tracking-wider border uppercase', mode === m ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30' : 'text-vox-dim border-vox-line hover:text-vox-muted')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* body */}
          {active ? (
            <div className="flex flex-1 min-h-0">
              {mode !== 'preview' && (
                <textarea
                  value={active.body}
                  onChange={(e) => updateBody(e.target.value)}
                  spellCheck={false}
                  className={clsx('flex-1 resize-none bg-transparent outline-none p-4 font-mono text-[12.5px] leading-relaxed text-vox-text caret-cyan-300', mode === 'split' && 'border-r border-vox-line/50')}
                />
              )}
              {mode !== 'edit' && (
                <div
                  className={clsx('flex-1 overflow-y-auto p-4 markdown-body', mode === 'split' ? 'w-1/2' : 'w-full')}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[12px] text-vox-dim">Select or create a note.</div>
          )}
        </div>
      </div>
    </div>
  );
}
