import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { Badge, Button, Field, Icon, Input, Panel, Select, Textarea } from '../components/ui';
import { formatJSON, validateRegex, regexTest, decodeJWT, b64encode, b64decode, uuidv4, uuidShort, timestampConvert, diffLines, formatCode, httpTest } from '../lib/devtools';
import { highlight } from '../lib/syntax';
import { DiffView } from '../components/DiffView';

const TOOLS = [
  { id: 'json', label: 'JSON Formatter', icon: 'Braces' },
  { id: 'regex', label: 'Regex Tester', icon: 'Regex' },
  { id: 'jwt', label: 'JWT Decoder', icon: 'KeyRound' },
  { id: 'base64', label: 'Base64', icon: 'Binary' },
  { id: 'uuid', label: 'UUID Generator', icon: 'Fingerprint' },
  { id: 'time', label: 'Timestamp', icon: 'Clock' },
  { id: 'http', label: 'HTTP Tester', icon: 'Globe' },
  { id: 'color', label: 'Color Picker', icon: 'Palette' },
  { id: 'markdown', label: 'Markdown Preview', icon: 'FileText' },
  { id: 'diff', label: 'Diff Viewer', icon: 'GitCompare' },
  { id: 'format', label: 'Code Formatter', icon: 'Paintbrush' },
];

export function DevTools() {
  const [tool, setTool] = useState('json');
  return (
    <div className="h-full flex">
      <aside className="w-[200px] shrink-0 border-r border-vox-line overflow-y-auto py-3 px-2 bg-ink-900/40">
        <p className="hud-label px-2 pb-2">DEV TOOLS</p>
        <div className="space-y-0.5">
          {TOOLS.map((t) => (
            <button key={t.id} data-active={tool === t.id} onClick={() => setTool(t.id)} className={clsx('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors', tool === t.id ? 'bg-cyan-400/10 text-cyan-200' : 'text-vox-muted hover:text-vox-text hover:bg-white/[0.04]')}>
              <Icon name={t.icon} size={14} className={tool === t.id ? 'text-vox-cyan' : 'text-vox-dim'} />
              <span className="text-[11.5px]">{t.label}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto p-5">
        {tool === 'json' && <JSONTool />}
        {tool === 'regex' && <RegexTool />}
        {tool === 'jwt' && <JWTTool />}
        {tool === 'base64' && <Base64Tool />}
        {tool === 'uuid' && <UUIDTool />}
        {tool === 'time' && <TimeTool />}
        {tool === 'http' && <HTTPTool />}
        {tool === 'color' && <ColorTool />}
        {tool === 'markdown' && <MarkdownTool />}
        {tool === 'diff' && <DiffTool />}
        {tool === 'format' && <FormatTool />}
      </div>
    </div>
  );
}

function ToolShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-[15px] font-semibold tracking-[0.1em] uppercase mb-4">{title}</h2>
      {children}
    </div>
  );
}

function JSONTool() {
  const [input, setInput] = useState('{"name":"VOX-OS","modules":["ai","terminal"],"health":96}');
  const [indent, setIndent] = useState(2);
  const r = useMemo(() => formatJSON(input, indent), [input, indent]);
  return (
    <ToolShell title="JSON Formatter">
      <div className="grid lg:grid-cols-2 gap-4">
        <Field label="Input JSON"><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={16} className="font-mono !text-[12px]" /></Field>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Field label="Indent" className="!w-24"><Select value={String(indent)} onChange={(e) => setIndent(Number(e.target.value))}>{[2, 4].map((i) => <option key={i} value={i}>{i} spaces</option>)}</Select></Field>
            <Badge tone={r.ok ? 'green' : 'red'} className="self-end mb-1">{r.ok ? 'VALID' : 'INVALID'}</Badge>
          </div>
          <pre className="glass-inset p-3 font-mono text-[12px] leading-relaxed overflow-auto max-h-[360px] whitespace-pre-wrap text-vox-muted">{r.ok ? r.out : r.error}</pre>
        </div>
      </div>
    </ToolShell>
  );
}

function RegexTool() {
  const [pattern, setPattern] = useState('\\b(vox|dev)\\b');
  const [flags, setFlags] = useState('gi');
  const [input, setInput] = useState('VOX-OS is a dev OS. Built for developers. vox vox vox');
  const valid = useMemo(() => validateRegex(pattern), [pattern]);
  const res = useMemo(() => valid.ok ? regexTest(pattern, flags, input) : { matches: [], count: 0, groups: [] }, [pattern, flags, input, valid.ok]);
  return (
    <ToolShell title="Regex Tester">
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Pattern"><Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono" /></Field>
          <Field label="Flags"><Input value={flags} onChange={(e) => setFlags(e.target.value)} className="font-mono" /></Field>
        </div>
        <Field label="Test Input"><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={6} className="font-mono" /></Field>
        {!valid.ok && <p className="text-[11.5px] text-red-300 font-mono">{valid.error}</p>}
        <div className="flex items-center gap-3">
          <Badge tone={valid.ok ? 'green' : 'red'}>{valid.ok ? 'VALID PATTERN' : 'INVALID'}</Badge>
          <span className="font-mono text-[11px] text-vox-muted">{res.count} match(es)</span>
        </div>
        {res.matches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {res.matches.slice(0, 30).map((m, i) => <code key={i} className="px-2 py-1 rounded bg-cyan-400/10 text-cyan-200 text-[11px] font-mono border border-cyan-400/20">{m}</code>)}
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function JWTTool() {
  const [token, setToken] = useState('');
  const [sample, setSample] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFMMTNOIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  const r = useMemo(() => decodeJWT(token || sample), [token, sample]);
  return (
    <ToolShell title="JWT Decoder">
      <div className="space-y-3">
        <Field label="JWT Token"><Textarea value={token || sample} onChange={(e) => setToken(e.target.value)} rows={3} className="font-mono" placeholder="eyJhbGciOi..." /></Field>
        {!r.ok && <p className="text-[11.5px] text-red-300 font-mono">{r.error}</p>}
        {r.ok && (
          <div className="grid gap-3">
            <div><p className="hud-label mb-1.5">HEADER</p><pre className="glass-inset p-3 font-mono text-[12px] overflow-auto">{JSON.stringify(r.header, null, 2)}</pre></div>
            <div><p className="hud-label mb-1.5">PAYLOAD</p><pre className="glass-inset p-3 font-mono text-[12px] overflow-auto">{JSON.stringify(r.payload, null, 2)}</pre></div>
            <div className="flex items-center gap-2"><span className="hud-label">SIGNATURE</span><span className="font-mono text-[11px] text-vox-dim truncate">{r.sig}</span></div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('VOX-OS — A Dev\'s First Choice');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const out = mode === 'encode' ? b64encode(input) : (b64decode(input).ok ? b64decode(input).out : b64decode(input).error);
  return (
    <ToolShell title="Base64 Encoder / Decoder">
      <div className="grid gap-3">
        <Field label="Input"><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} className="font-mono" /></Field>
        <div className="flex gap-2">
          <Button size="xs" variant={mode === 'encode' ? 'cyan' : 'default'} onClick={() => setMode('encode')}>ENCODE</Button>
          <Button size="xs" variant={mode === 'decode' ? 'cyan' : 'default'} onClick={() => setMode('decode')}>DECODE</Button>
        </div>
        <Field label="Output"><pre className="glass-inset p-3 font-mono text-[12px] overflow-auto whitespace-pre-wrap break-all">{out}</pre></Field>
      </div>
    </ToolShell>
  );
}

function UUIDTool() {
  const [list, setList] = useState<string[]>([uuidv4()]);
  const gen = (count: number) => setList(Array.from({ length: count }, () => uuidv4()));
  return (
    <ToolShell title="UUID Generator">
      <div className="flex gap-2 mb-4">
        <Button size="xs" variant="cyan" icon="RefreshCw" onClick={() => gen(1)}>GENERATE</Button>
        <Button size="xs" icon="Layers" onClick={() => gen(5)}>GENERATE 5</Button>
        <Button size="xs" variant="ghost" icon="Copy" onClick={() => navigator.clipboard?.writeText(list.join('\n'))}>COPY ALL</Button>
      </div>
      <div className="space-y-1.5">
        {list.map((u, i) => (
          <div key={i} className="glass-inset px-3 py-2 flex items-center gap-3">
            <code className="font-mono text-[12px] text-cyan-200">{u}</code>
            <span className="text-[9px] text-vox-dim">{i === 0 ? 'v4' : `v4 · ${uuidShort()}`}</span>
            <Button size="xs" variant="ghost" className="ml-auto" icon="Copy" silent onClick={() => navigator.clipboard?.writeText(u)}>COPY</Button>
          </div>
        ))}
      </div>
    </ToolShell>
  );
}

function TimeTool() {
  const [input, setInput] = useState(String(Math.floor(Date.now() / 1000)));
  const r = useMemo(() => timestampConvert(input), [input]);
  return (
    <ToolShell title="Timestamp Converter">
      <Field label="Timestamp (unix s/ms, ISO, or date string)"><Input value={input} onChange={(e) => setInput(e.target.value)} className="font-mono" /></Field>
      {!r.ok ? <p className="text-[11.5px] text-red-300 font-mono mt-3">{r.error}</p> : (
        <div className="mt-3 space-y-1.5">
          {r.rows!.map(([k, v]) => (
            <div key={k} className="glass-inset px-3 py-2 flex items-center gap-3">
              <span className="hud-label w-36">{k}</span>
              <code className="font-mono text-[12px] text-vox-text flex-1 break-all">{v}</code>
              <Button size="xs" variant="ghost" icon="Copy" silent onClick={() => navigator.clipboard?.writeText(v)}>COPY</Button>
            </div>
          ))}
        </div>
      )}
    </ToolShell>
  );
}

function HTTPTool() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://api.github.com/zen');
  const [headers, setHeaders] = useState<[string, string][]>([['Accept', 'application/json']]);
  const [body, setBody] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof httpTest>> | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const r = await httpTest(method, url, headers, body);
    setResult(r);
    setBusy(false);
  };
  return (
    <ToolShell title="HTTP Request Tester">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Select value={method} onChange={(e) => setMethod(e.target.value)} className="!w-28">{[ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD' ].map((m) => <option key={m}>{m}</option>)}</Select>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="flex-1 font-mono" />
          <Button variant="cyan" icon="Send" onClick={() => void run()} disabled={busy}>{busy ? 'SENDING…' : 'SEND'}</Button>
        </div>
        <Field label="Headers"><div className="space-y-1.5">{headers.map((h, i) => (
          <div key={i} className="flex gap-2">
            <Input value={h[0]} onChange={(e) => setHeaders(headers.map((x, j) => j === i ? [e.target.value, x[1]] : x))} placeholder="Header" className="!w-40 font-mono" />
            <Input value={h[1]} onChange={(e) => setHeaders(headers.map((x, j) => j === i ? [x[0], e.target.value] : x))} placeholder="Value" className="flex-1 font-mono" />
            <Button size="xs" variant="ghost" icon="X" onClick={() => setHeaders(headers.filter((_, j) => j !== i))} />
          </div>
        ))}
          <Button size="xs" variant="ghost" icon="Plus" onClick={() => setHeaders([...headers, ['', '']])}>ADD HEADER</Button>
        </div></Field>
        {method !== 'GET' && method !== 'HEAD' && <Field label="Request Body"><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="font-mono" /></Field>}
        {result && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge tone={result.status < 400 ? 'green' : 'red'}>{result.status} {result.statusText}</Badge>
              <span className="font-mono text-[11px] text-vox-muted">{result.timeMs}ms</span>
              {result.error && <span className="text-[11px] text-red-300 font-mono">{result.error}</span>}
            </div>
            <pre className="glass-inset p-3 font-mono text-[11.5px] overflow-auto max-h-[280px] whitespace-pre-wrap text-vox-muted">{result.body || result.error}</pre>
            <p className="text-[9.5px] text-vox-dim mt-1.5 font-mono">Browsers block cross-origin requests without CORS — errors here are real network behavior, not simulated.</p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function ColorTool() {
  const [hex, setHex] = useState('#22d3ee');
  const [hue, setHue] = useState(187);
  const [sat, setSat] = useState(85);
  const [light, setLight] = useState(53);
  const updateFromHsl = (h: number, s: number, l: number) => {
    const hslToHex = (hh: number, ss: number, ll: number) => {
      ss /= 100; ll /= 100;
      const k = (n: number) => (n + hh / 30) % 12;
      const a = ss * Math.min(ll, 1 - ll);
      const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
      return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
    };
    setHex(hslToHex(h, s, l));
  };
  const textColor = light > 60 ? '#0a0c13' : '#f0f4ff';
  return (
    <ToolShell title="Color Picker">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <div className="w-full h-32 rounded-xl border border-white/10 flex items-center justify-center font-mono text-[15px] mb-4" style={{ background: hex, color: textColor }}>
            {hex}
          </div>
          <div className="space-y-4">
            <Field label="Hue"><input type="range" min={0} max={360} value={hue} onChange={(e) => { const h = Number(e.target.value); setHue(h); updateFromHsl(h, sat, light); }} className="w-full accent-cyan-400" /></Field>
            <Field label="Saturation %"><input type="range" min={0} max={100} value={sat} onChange={(e) => { const v = Number(e.target.value); setSat(v); updateFromHsl(hue, v, light); }} className="w-full accent-cyan-400" /></Field>
            <Field label="Lightness %"><input type="range" min={0} max={100} value={light} onChange={(e) => { const v = Number(e.target.value); setLight(v); updateFromHsl(hue, sat, v); }} className="w-full accent-cyan-400" /></Field>
          </div>
        </div>
        <div>
          <p className="hud-label mb-2">VOX PALETTE</p>
          <div className="grid grid-cols-2 gap-2">
            {['#05060a', '#0d1019', '#22d3ee', '#3b82f6', '#8b5cf6', '#34d399', '#fbbf24', '#f87171'].map((c) => (
              <button key={c} onClick={() => setHex(c)} className="flex items-center gap-2 glass-inset px-2.5 py-2 hover:bg-white/5 text-left">
                <span className="w-6 h-6 rounded border border-white/10" style={{ background: c }} />
                <code className="font-mono text-[10.5px] text-vox-muted">{c}</code>
              </button>
            ))}
          </div>
          <Button className="mt-4" size="xs" icon="Copy" onClick={() => navigator.clipboard?.writeText(hex)}>COPY HEX</Button>
        </div>
      </div>
    </ToolShell>
  );
}

function MarkdownTool() {
  const [md, setMd] = useState('# VOX-OS\n\nA developer operating environment.\n\n- **Build**\n- **Debug**\n- **Deploy**\n\n```ts\nconst vox = "ready";\n```\n\n> Your code. Your system. Your AI.');
  const html = useMemo(() => {
    let out = md
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
    const codeBlocks: string[] = [];
    out = out.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      codeBlocks.push(highlight(code, lang || 'plain'));
      return `\u0000${codeBlocks.length - 1}\u0000`;
    });
    out = out.replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)(?=\s*<li>|$)/g, '<ul>$1</ul>');
    out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<pre class="editor-code !text-[11px] p-3 overflow-auto">${codeBlocks[Number(i)]}</pre>`);
    out = out.replace(/^(?!<[a-z]|$)(.*)$/gm, '<p>$1</p>');
    return out;
  }, [md]);
  return (
    <ToolShell title="Markdown Preview">
      <div className="grid lg:grid-cols-2 gap-4">
        <Field label="Markdown"><Textarea value={md} onChange={(e) => setMd(e.target.value)} rows={18} className="font-mono" /></Field>
        <div>
          <p className="hud-label mb-1.5">Preview</p>
          <div className="glass-inset p-4 overflow-auto max-h-[420px] markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </ToolShell>
  );
}

function DiffTool() {
  const [a, setA] = useState('const x = 1;\nconst y = 2;\nconsole.log(x);');
  const [b, setB] = useState('const x = 1;\nconst y = 3;\nconsole.log(x, y);');
  const lines = useMemo(() => diffLines(a, b), [a, b]);
  return (
    <ToolShell title="Diff Viewer">
      <div className="grid gap-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Original"><Textarea value={a} onChange={(e) => setA(e.target.value)} rows={8} className="font-mono" /></Field>
          <Field label="Modified"><Textarea value={b} onChange={(e) => setB(e.target.value)} rows={8} className="font-mono" /></Field>
        </div>
        <DiffView lines={lines} />
      </div>
    </ToolShell>
  );
}

function FormatTool() {
  const [input, setInput] = useState('{"key"  :   "value","nested":{"a":[1,2,3]}}');
  const [lang, setLang] = useState('json');
  const out = useMemo(() => formatCode(input, lang), [input, lang]);
  return (
    <ToolShell title="Code Formatter">
      <div className="grid lg:grid-cols-2 gap-4">
        <Field label="Code"><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={14} className="font-mono" /></Field>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Select value={lang} onChange={(e) => setLang(e.target.value)} className="!w-32">{['json', 'javascript', 'typescript', 'python', 'css'].map((l) => <option key={l} value={l}>{l}</option>)}</Select>
            <Badge tone={out.ok ? 'green' : 'amber'}>{out.ok ? 'FORMATTED' : out.error ?? '—'}</Badge>
            <Button size="xs" className="ml-auto" variant="ghost" icon="Copy" silent onClick={() => navigator.clipboard?.writeText(out.out)}>COPY</Button>
          </div>
          <pre className="glass-inset p-3 font-mono text-[12px] leading-relaxed overflow-auto max-h-[360px] whitespace-pre-wrap text-vox-muted">{out.out}</pre>
        </div>
      </div>
    </ToolShell>
  );
}
