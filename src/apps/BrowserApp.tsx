import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Icon } from '../components/ui';
import { sfx } from '../lib/sounds';

interface Tab {
  id: string;
  url: string;
  title: string;
  pinned: boolean;
}

const SPEED_DIAL: { name: string; url: string; tint: string }[] = [
  { name: 'GitHub', url: 'https://github.com', tint: 'from-zinc-700 to-zinc-900' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', tint: 'from-amber-500/70 to-orange-700' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org', tint: 'from-slate-500 to-slate-800' },
  { name: 'YouTube', url: 'https://youtube.com', tint: 'from-red-600/80 to-red-900' },
  { name: 'X / Twitter', url: 'https://x.com', tint: 'from-zinc-700 to-black' },
  { name: 'Reddit', url: 'https://reddit.com', tint: 'from-orange-500/70 to-red-800' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', tint: 'from-emerald-500/70 to-teal-800' },
  { name: 'Google', url: 'https://google.com', tint: 'from-cyan-500/70 to-blue-800' },
  { name: 'Vercel', url: 'https://vercel.com', tint: 'from-zinc-700 to-zinc-950' },
  { name: 'npm', url: 'https://npmjs.com', tint: 'from-red-600/80 to-rose-900' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', tint: 'from-orange-600/70 to-amber-900' },
  { name: 'Can I Use', url: 'https://caniuse.com', tint: 'from-blue-600/70 to-indigo-900' },
];

const GAMING_SITES: { name: string; url: string; tint: string }[] = [
  { name: 'Steam', url: 'https://store.steampowered.com', tint: 'from-blue-700/80 to-slate-900' },
  { name: 'Epic Games', url: 'https://store.epicgames.com', tint: 'from-zinc-600 to-zinc-900' },
  { name: 'Roblox', url: 'https://www.roblox.com', tint: 'from-red-500/70 to-zinc-900' },
  { name: 'Twitch', url: 'https://twitch.tv', tint: 'from-purple-600/80 to-violet-900' },
  { name: 'Discord', url: 'https://discord.com', tint: 'from-indigo-500/80 to-indigo-900' },
  { name: 'GeForce NOW', url: 'https://play.geforcenow.com', tint: 'from-green-600/70 to-emerald-900' },
];

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return 'https://www.google.com';
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+/.test(t)) return 'https://' + t;
  return 'https://www.google.com/search?q=' + encodeURIComponent(t);
}

function siteTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

let tabSeq = 1;

export function BrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 't1', url: 'about:blank', title: 'New Tab', pinned: false },
  ]);
  const [activeId, setActiveId] = useState('t1');
  const [urlInput, setUrlInput] = useState('');
  const [history, setHistory] = useState<string[]>(['https://www.google.com']);
  const [hIdx, setHIdx] = useState(0);
  const [incognito, setIncognito] = useState(false);
  const [adblock, setAdblock] = useState(true);
  const [boost, setBoost] = useState(false);
  const [gamingMode, setGamingMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const active = useMemo(() => tabs.find((t) => t.id === activeId) ?? tabs[0], [tabs, activeId]);

  const goTo = (raw: string, opts?: { push?: boolean }) => {
    const url = normalizeUrl(raw);
    sfx.command();
    setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, url, title: siteTitle(url) } : t)));
    setUrlInput(url);
    if (opts?.push !== false) {
      setHistory((h) => [...h.slice(0, hIdx + 1), url]);
      setHIdx((i) => i + 1);
    }
  };

  const openTab = (url?: string, opts?: { activate?: boolean }) => {
    sfx.open();
    const u = url ? normalizeUrl(url) : 'about:blank';
    const id = 't' + ++tabSeq;
    setTabs((ts) => [
      ...ts,
      { id, url: u, title: u === 'about:blank' ? 'New Tab' : siteTitle(u), pinned: false },
    ]);
    if (opts?.activate !== false) setActiveId(id);
    setUrlInput(u === 'about:blank' ? '' : u);
  };

  const closeTab = (id: string) => {
    sfx.command();
    setTabs((ts) => {
      const idx = ts.findIndex((t) => t.id === id);
      const next = ts.filter((t) => t.id !== id);
      if (!next.length) {
        const nid = 't' + ++tabSeq;
        setActiveId(nid);
        setUrlInput('');
        return [{ id: nid, url: 'about:blank', title: 'New Tab', pinned: false }];
      }
      if (activeId === id) {
        const a = next[Math.max(0, Math.min(idx, next.length - 1))];
        setActiveId(a.id);
        setUrlInput(a.url === 'about:blank' ? '' : a.url);
      }
      return next;
    });
  };

  const back = () => {
    if (hIdx > 0) {
      const i = hIdx - 1;
      setHIdx(i);
      const u = history[i];
      setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, url: u, title: siteTitle(u) } : t)));
      setUrlInput(u);
    }
  };
  const forward = () => {
    if (hIdx < history.length - 1) {
      const i = hIdx + 1;
      setHIdx(i);
      const u = history[i];
      setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, url: u, title: siteTitle(u) } : t)));
      setUrlInput(u);
    }
  };
  const reload = () => {
    sfx.command();
    if (frameRef.current && active) frameRef.current.src = active.url;
  };

  const showStart = !active || active.url === 'about:blank';

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  return (
    <div className={`${expanded ? 'p-3 sm:p-4' : 'p-3 sm:p-4 max-w-[1200px] mx-auto'} animate-fade-in flex flex-col h-full min-h-0`}>
      {/* ---- Opera GX style chrome: red accents, gaming HUD ---- */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#fa1e4e] to-[#a4002a] flex items-center justify-center shadow-[0_0_14px_rgba(250,30,78,0.45)]">
            <Icon name="Globe" size={15} className="text-white" />
          </span>
          <div className="leading-none">
            <p className="font-display text-[12px] font-bold tracking-[0.14em] uppercase text-[#ff6b8a]">VOX Browser</p>
            <p className="font-mono text-[8px] tracking-[0.24em] text-vox-dim uppercase">GX EDITION · RENDERER v1</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-1">
          <Badge tone={adblock ? 'green' : 'dim'}>ADBLOCK {adblock ? 'ON' : 'OFF'}</Badge>
          <Badge tone={boost ? 'violet' : 'dim'}>BOOST {boost ? 'MAX' : 'OFF'}</Badge>
          <Badge tone={gamingMode ? 'red' : 'dim'}>GX MODE {gamingMode ? '⚡' : ''}</Badge>
          {incognito && <Badge tone="red">INCOGNITO</Badge>}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => { sfx.command(); setGamingMode((v) => !v); }} title="GX gaming mode"
            className="px-2.5 py-1.5 rounded-lg bg-[#fa1e4e]/10 border border-[#fa1e4e]/30 text-[#ff6b8a] text-[10px] font-bold tracking-[0.14em] uppercase hover:bg-[#fa1e4e]/20">
            <Icon name="Gamepad2" size={12} className="inline -mt-0.5 mr-1" />GX Mode
          </button>
          <button onClick={() => { sfx.command(); setBoost((v) => !v); }} title="GX boost (drops heavy media)"
            className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-400/30 text-violet-300 text-[10px] font-bold tracking-[0.14em] uppercase hover:bg-violet-500/20">
            <Icon name="Zap" size={12} className="inline -mt-0.5 mr-1" />Boost
          </button>
          <button onClick={() => { sfx.command(); setExpanded((v) => !v); }} title={expanded ? 'Collapse to content width' : 'Expand to full window'}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-vox-muted hover:text-cyan-300 hover:border-cyan-400/30 transition-colors">
            <Icon name={expanded ? 'Minimize2' : 'Maximize2'} size={13} />
          </button>
          <button onClick={() => { sfx.command(); fullscreen(); }} title="Fullscreen (F11)"
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-vox-muted hover:text-cyan-300 hover:border-cyan-400/30 transition-colors">
            <Icon name="Fullscreen" size={13} />
          </button>
        </div>
      </div>

      {/* ---- tabs strip ---- */}
      <div className="flex items-end gap-1 overflow-x-auto pb-1 mb-2 no-scrollbar">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => { setActiveId(t.id); setUrlInput(t.url === 'about:blank' ? '' : t.url); }}
            className={`group flex items-center gap-2 pl-3 pr-1.5 h-8 rounded-t-lg border-b-2 cursor-pointer select-none transition-colors min-w-[130px] max-w-[190px] flex-shrink-0 ${
              t.id === activeId
                ? 'bg-[#fa1e4e]/10 border-[#fa1e4e] text-vox-text'
                : 'bg-white/[0.02] border-transparent text-vox-dim hover:text-vox-text'
            }`}
          >
            <Icon name={t.url === 'about:blank' ? 'Plus' : 'Globe'} size={11} className={t.id === activeId ? 'text-[#ff6b8a]' : 'text-vox-dim'} />
            <span className="text-[11px] font-medium truncate flex-1">{t.url === 'about:blank' ? 'New Tab' : t.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
              className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 text-vox-dim hover:text-vox-text"
            >
              <Icon name="X" size={11} />
            </button>
          </div>
        ))}
        <button
          onClick={() => openTab()}
          className="flex items-center justify-center w-8 h-8 rounded-t-lg border-b-2 border-transparent text-vox-dim hover:text-[#ff6b8a] hover:border-[#fa1e4e] hover:bg-[#fa1e4e]/10 transition-colors flex-shrink-0"
          title="New tab"
        >
          <Icon name="Plus" size={14} />
        </button>
      </div>

      {/* ---- address bar ---- */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <button onClick={back} disabled={hIdx <= 0} className="icon-btn" title="Back"><Icon name="ChevronLeft" size={15} /></button>
        <button onClick={forward} disabled={hIdx >= history.length - 1} className="icon-btn" title="Forward"><Icon name="ChevronRight" size={15} /></button>
        <button onClick={reload} className="icon-btn" title="Reload"><Icon name="RotateCw" size={14} /></button>
        <div className="flex items-center gap-2 flex-1 glass-inset h-9 px-3 rounded-xl border border-vox-line focus-within:border-[#fa1e4e]/50">
          {showStart ? <Icon name="Compass" size={13} className="text-vox-dim" /> : <Icon name="Lock" size={12} className="text-emerald-400" />}
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') goTo(urlInput); }}
            placeholder="Search or enter address…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-vox-text placeholder:text-vox-dim font-mono"
            aria-label="Address bar"
          />
          {boost && (
            <span className="text-[9px] font-bold tracking-[0.18em] text-violet-300 uppercase flex items-center gap-1">
              <Icon name="Zap" size={10} /><span className="hidden sm:inline">RAM FREE</span>
            </span>
          )}
        </div>
        <button onClick={() => { sfx.command(); setAdblock((v) => !v); }} title="Toggle adblock"
          className={`icon-btn ${adblock ? 'text-emerald-400' : 'text-vox-dim'}`}>
          <Icon name="ShieldCheck" size={15} />
        </button>
        <button onClick={() => { sfx.command(); setIncognito((v) => !v); }} title="Incognito"
          className={`icon-btn ${incognito ? 'text-[#ff6b8a]' : 'text-vox-dim'}`}>
          <Icon name="EyeOff" size={15} />
        </button>
        <button onClick={() => openTab()} className="icon-btn" title="New tab"><Icon name="Plus" size={15} /></button>
      </div>

      {/* ---- content ---- */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-vox-line bg-[#08090d] relative">
        {showStart ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-2 font-display text-[20px] font-bold tracking-[0.1em] text-[#ff6b8a] uppercase">
                <Icon name="Globe" size={20} /> VOX Speed Dial
              </span>
              <p className="mt-1 font-mono text-[10px] tracking-[0.22em] text-vox-dim uppercase">
                {gamingMode ? 'GX MODE — gaming sites loaded for speed' : 'Pick a site or type an address'}
              </p>
            </div>

            {gamingMode && (
              <div className="mb-5">
                <p className="hud-label mb-2 flex items-center gap-1.5"><Icon name="Gamepad2" size={12} className="text-[#ff6b8a]" /> GX GAMING DOCK</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {GAMING_SITES.map((s) => (
                    <button key={s.url} onClick={() => { sfx.open(); openTab(s.url); }}
                      className={`group bg-gradient-to-br ${s.tint} rounded-xl border border-white/10 p-3 text-left hover:border-[#fa1e4e]/50 hover:scale-[1.02] transition-all`}>
                      <Icon name="Gamepad2" size={16} className="text-white/90" />
                      <p className="mt-2 text-[11px] font-bold text-white truncate">{s.name}</p>
                      <p className="font-mono text-[8px] text-white/50 truncate">{s.url.replace('https://', '')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {SPEED_DIAL.map((s) => (
                <button key={s.url} onClick={() => { sfx.command(); openTab(s.url); }}
                  className={`group bg-gradient-to-br ${s.tint} rounded-xl border border-white/10 p-3 text-left hover:border-[#fa1e4e]/50 hover:scale-[1.02] transition-all`}>
                  <span className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center text-white text-[13px] font-display font-bold">
                    {s.name.slice(0, 1)}
                  </span>
                  <p className="mt-2 text-[11px] font-bold text-white truncate">{s.name}</p>
                  <p className="font-mono text-[8px] text-white/50 truncate">{s.url.replace('https://', '')}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 glass rounded-xl p-4 border border-vox-line">
              <p className="hud-label mb-2">RECENT SESSIONS</p>
              <div className="space-y-1">
                {history.slice(-5).reverse().map((h, i) => (
                  <button key={i} onClick={() => { sfx.open(); openTab(h); }}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-[12px] text-vox-muted font-mono truncate">
                    <Icon name="History" size={12} className="text-vox-dim" />
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : active ? (
          <iframe
            key={active.id + active.url}
            ref={frameRef}
            src={active.url}
            title={active.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-presentation"
            className="w-full h-full bg-white"
            referrerPolicy="no-referrer"
          />
        ) : null}

        {/* GX mode frame glow */}
        {gamingMode && !showStart && (
          <div className="pointer-events-none absolute inset-0 border border-[#fa1e4e]/30 shadow-[inset_0_0_60px_rgba(250,30,78,0.06)]" />
        )}
      </div>

      {/* ---- status bar ---- */}
      <div className="flex items-center justify-between mt-2 px-1 font-mono text-[9px] tracking-[0.18em] text-vox-dim uppercase">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${boost ? 'bg-violet-400 animate-pulse' : 'bg-emerald-400'}`} />
          {boost ? 'GX BOOST ACTIVE — heavy media offloaded' : 'RENDERER READY'}
        </span>
        <span className="flex items-center gap-1.5">
          {active && !showStart && <>{active.title} · </>}
          {tabs.length} TAB{tabs.length === 1 ? '' : 'S'} · VOX GX 1.0
        </span>
      </div>
    </div>
  );
}
