import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { highlight, langForFile } from '../lib/syntax';
import { Icon } from './ui';
import { clamp } from '../lib/fmt';

const LINE_H = 20.6;
const CHAR_W = 7.52;

function findMatches(text: string, query: string): { start: number; end: number }[] {
  if (!query) return [];
  const out: { start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(query, i);
    if (idx === -1) break;
    out.push({ start: idx, end: idx + query.length });
    i = idx + query.length;
  }
  return out;
}

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  fileName: string;
  onSave?: () => void;
  readOnly?: boolean;
  errors?: { line: number; msg: string }[];
  warnings?: { line: number; msg: string }[];
}

export function Editor({ value, onChange, fileName, onSave, readOnly, errors = [], warnings = [] }: EditorProps) {
  const lang = langForFile(fileName);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutRef = useRef<HTMLDivElement | null>(null);
  const miniRef = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [line, setLine] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replace, setReplace] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const html = useMemo(() => highlight(value, lang), [value, lang]);
  const lines = useMemo(() => value.split('\n').length, [value]);
  const matches = useMemo(() => findMatches(value, query), [value, query]);
  const curMatch = matches[clamp(matchIdx, 0, Math.max(0, matches.length - 1))];

  const onScroll = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const top = ta.scrollTop;
    const left = ta.scrollLeft;
    setScroll({ top, left });
    if (preRef.current) preRef.current.style.transform = `translate(${-left}px, ${-top}px)`;
    if (gutRef.current) gutRef.current.style.transform = `translateY(${-top}px)`;
    if (miniRef.current) miniRef.current.style.transform = `translateY(${-top}px)`;
    const l = ta.value.slice(0, ta.selectionStart).split('\n').length;
    setLine(l);
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave?.();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setSearchOpen(true);
    }
    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart, selectionEnd } = ta;
      const next = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = selectionStart + 2;
      });
    }
  };

  const errLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors]);
  const warnLines = useMemo(() => new Set(warnings.map((e) => e.line)), [warnings]);

  const miniHeight = lines * 3.2;
  const viewRatio = clamp((LINE_H * lines) / Math.max(1, taRef.current?.clientHeight ?? 400), 0.15, 1);

  return (
    <div className="flex-1 min-h-0 relative flex">
      {/* main editor area */}
      <div className="relative flex-1 min-w-0 overflow-hidden bg-[#07080d]">
        {/* highlighted backdrop */}
        <div className="absolute inset-0 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden
            className="editor-code absolute top-0 left-0 p-0 pl-[52px] pr-6 pt-2.5 pb-6 will-change-transform"
            style={{ font: '12.5px/1.65 "JetBrains Mono", monospace', whiteSpace: 'pre' }}
            dangerouslySetInnerHTML={{ __html: html + '\n' }}
          />
        </div>
        {/* gutter */}
        <div className="absolute top-0 left-0 bottom-0 w-[44px] overflow-hidden will-change-transform" style={{ paddingTop: 10 }}>
          <div ref={gutRef} className="editor-gutter !w-auto" style={{ paddingRight: 10 }}>
            {Array.from({ length: lines }, (_, i) => {
              const ln = i + 1;
              const isErr = errLines.has(ln);
              const isWarn = warnLines.has(ln);
              return (
                <div key={ln} className="relative" style={{ height: LINE_H, fontSize: 12, lineHeight: `${LINE_H}px` }}>
                  <span className={ln === line ? 'text-vox-cyan' : isErr ? 'text-red-400' : 'text-[#3d4457]'}>{ln}</span>
                  {isErr && <span title={errors.find((e) => e.line === ln)?.msg} className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400" style={{ boxShadow: '0 0 6px #f87171' }} />}
                  {isWarn && !isErr && <span title={warnings.find((e) => e.line === ln)?.msg} className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </div>
              );
            })}
          </div>
        </div>
        {/* textarea */}
        <textarea
          ref={taRef}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          onScroll={onScroll}
          onKeyDown={handleKey}
          onClick={onScroll}
          onKeyUp={onScroll}
          spellCheck={false}
          wrap="off"
          aria-label={`Editor: ${fileName}`}
          className="absolute inset-0 bg-transparent outline-none resize-none p-0 pl-[52px] pr-6 pt-2.5 pb-6 whitespace-pre overflow-auto"
          style={{ font: '12.5px/1.65 "JetBrains Mono", monospace', color: 'transparent', caretColor: '#a5f3fc', WebkitTextFillColor: 'transparent' }}
        />

        {/* search highlights */}
        {query && (
          <div className="absolute inset-0 pointer-events-none">
            {matches.map((m, i) => {
              const before = value.slice(0, m.start);
              const l = before.split('\n').length - 1;
              const col = before.length - before.lastIndexOf('\n') - 1;
              const active = i === clamp(matchIdx, 0, Math.max(0, matches.length - 1));
              return (
                <span
                  key={i}
                  className="absolute rounded-[2px]"
                  style={{
                    top: l * LINE_H + 1,
                    left: 52 + col * CHAR_W,
                    width: (m.end - m.start) * CHAR_W,
                    height: LINE_H - 3,
                    background: active ? 'rgba(251,191,36,0.35)' : 'rgba(251,191,36,0.16)',
                    outline: active ? '1px solid rgba(251,191,36,0.7)' : undefined,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* search bar */}
        {searchOpen && (
          <div className="absolute top-2 right-2 z-10 glass-inset flex items-center gap-1.5 px-2 py-1.5 !rounded-lg shadow-lg">
            <Icon name="Search" size={12} className="text-vox-dim" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setMatchIdx(0); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); setMatchIdx((i) => (i + 1) % Math.max(1, matches.length)); }
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Find…"
              className="bg-transparent outline-none text-[12px] font-mono w-32 text-vox-text placeholder:text-vox-dim"
            />
            <span className="font-mono text-[10px] text-vox-dim">{matches.length ? `${clamp(matchIdx, 0, matches.length - 1) + 1}/${matches.length}` : '0/0'}</span>
            <button aria-label="Previous match" onClick={() => setMatchIdx((i) => (i - 1 + Math.max(1, matches.length)) % Math.max(1, matches.length))} className="p-1 rounded hover:bg-white/10 text-vox-muted"><Icon name="ChevronUp" size={11} /></button>
            <button aria-label="Next match" onClick={() => setMatchIdx((i) => (i + 1) % Math.max(1, matches.length))} className="p-1 rounded hover:bg-white/10 text-vox-muted"><Icon name="ChevronDown" size={11} /></button>
            <button aria-label="Replace" onClick={() => setReplaceOpen((v) => !v)} className="p-1 rounded hover:bg-white/10 text-vox-muted"><Icon name="Replace" size={11} /></button>
            <button aria-label="Close search" onClick={() => setSearchOpen(false)} className="p-1 rounded hover:bg-white/10 text-vox-muted"><Icon name="X" size={11} /></button>
          </div>
        )}
        {searchOpen && replaceOpen && (
          <div className="absolute top-[42px] right-2 z-10 glass-inset flex items-center gap-1.5 px-2 py-1.5 !rounded-lg shadow-lg">
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onChange(value.split(query).join(replace));
                  setQuery('');
                }
                if (e.key === 'Escape') setReplaceOpen(false);
              }}
              placeholder="Replace with…"
              className="bg-transparent outline-none text-[12px] font-mono w-32 text-vox-text placeholder:text-vox-dim"
            />
            <button onClick={() => { onChange(value.split(query).join(replace)); setQuery(''); }} className="vox-btn vox-btn-cyan !px-2 !py-1 !text-[10px]">ALL</button>
          </div>
        )}
      </div>

      {/* minimap */}
      <div className="w-[64px] shrink-0 border-l border-vox-line bg-[#05060a]/60 relative overflow-hidden hidden lg:block" aria-hidden>
        <div ref={miniRef} className="will-change-transform" style={{ padding: '8px 6px' }}>
          <div style={{ height: miniHeight, overflow: 'hidden', transform: 'scale(0.38)', transformOrigin: 'top left', width: 140 }}>
            <pre className="editor-code" style={{ font: '12.5px/1.65 "JetBrains Mono", monospace', fontSize: 12.5 }} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
        <div className="absolute left-0 right-0 border border-cyan-400/30 bg-cyan-400/5" style={{ top: scroll.top * 0.36, height: Math.max(24, (1 - viewRatio) * 200), pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

export function statusBarFor(value: string): { lines: number; chars: number; cursor: { line: number; col: number } } {
  const lines = value.split('\n').length;
  return { lines, chars: value.length, cursor: { line: 1, col: 0 } };
}
