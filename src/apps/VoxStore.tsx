import { useMemo, useState } from 'react';
import { useVox } from '../lib/store';
import { Badge, Button, Icon } from '../components/ui';
import { sfx } from '../lib/sounds';

type StoreItem = {
  id: string;
  name: string;
  publisher: string;
  icon: string;
  cat: 'dev' | 'game' | 'ai' | 'system';
  rating: number;
  size: string;
  winget?: string;
  desc: string;
  tint: string;
};

const STORE_ITEMS: StoreItem[] = [
  // ---- DEV TOOLS ----
  { id: 'vscode', name: 'VS Code', publisher: 'Microsoft', icon: 'Code2', cat: 'dev', rating: 4.9, size: '~95 MB', winget: 'Microsoft.VisualStudioCode', desc: 'The #1 code editor — extensions, debugger, integrated terminal.', tint: '#3b82f6' },
  { id: 'git', name: 'Git', publisher: 'Git SCM', icon: 'GitBranch', cat: 'dev', rating: 5.0, size: '~60 MB', winget: 'Git.Git', desc: 'Distributed version control — every dev workflow runs on it.', tint: '#f97316' },
  { id: 'node', name: 'Node.js LTS', publisher: 'OpenJS', icon: 'Boxes', cat: 'dev', rating: 4.9, size: '~35 MB', winget: 'OpenJS.NodeJS.LTS', desc: 'JavaScript runtime for servers, CLIs and tooling.', tint: '#22c55e' },
  { id: 'python', name: 'Python 3', publisher: 'Python', icon: 'FileCode2', cat: 'dev', rating: 4.9, size: '~30 MB', winget: 'Python.Python.3.12', desc: 'The scripting + AI language — pip, venv, notebooks.', tint: '#facc15' },
  { id: 'docker', name: 'Docker Desktop', publisher: 'Docker', icon: 'Container', cat: 'dev', rating: 4.7, size: '~500 MB', winget: 'Docker.DockerDesktop', desc: 'Containers, compose, local dev environments.', tint: '#38bdf8' },
  { id: 'postman', name: 'Postman', publisher: 'Postman', icon: 'Send', cat: 'dev', rating: 4.6, size: '~250 MB', winget: 'Postman.Postman', desc: 'API client — test, document and monitor endpoints.', tint: '#fb923c' },
  { id: 'cmder', name: 'Windows Terminal', publisher: 'Microsoft', icon: 'SquareTerminal', cat: 'dev', rating: 4.8, size: '~30 MB', winget: 'Microsoft.WindowsTerminal', desc: 'The modern terminal — tabs, panes, GPU rendering.', tint: '#94a3b8' },
  { id: 'rust', name: 'Rust', publisher: 'Rust', icon: 'Hammer', cat: 'dev', rating: 4.9, size: '~1 GB', winget: 'Rustlang.Rustup', desc: 'Memory-safe systems language with cargo tooling.', tint: '#f97316' },
  { id: 'jetbrains', name: 'IntelliJ IDEA CE', publisher: 'JetBrains', icon: 'Brain', cat: 'dev', rating: 4.7, size: '~1.2 GB', winget: 'JetBrains.IntelliJIDEA.Community', desc: 'Full-featured JVM IDE with deep refactoring.', tint: '#a78bfa' },
  // ---- GAMES ----
  { id: 'steam', name: 'Steam', publisher: 'Valve', icon: 'Gamepad2', cat: 'game', rating: 4.6, size: '~250 MB', winget: 'Valve.Steam', desc: 'The PC gaming platform — library, friends, workshop.', tint: '#60a5fa' },
  { id: 'epic', name: 'Epic Games', publisher: 'Epic', icon: 'Swords', cat: 'game', rating: 4.2, size: '~200 MB', winget: 'EpicGames.EpicGamesLauncher', desc: 'Free weekly games + Fortnite + Unreal projects.', tint: '#a3a3a3' },
  { id: 'roblox', name: 'Roblox Player', publisher: 'Roblox', icon: 'Box', cat: 'game', rating: 4.3, size: '~80 MB', winget: 'Roblox.Roblox', desc: 'Jump into millions of experiences — tuned in Gaming Boost.', tint: '#f87171' },
  { id: 'minecraft', name: 'Minecraft Launcher', publisher: 'Mojang', icon: 'Blocks', cat: 'game', rating: 4.5, size: '~100 MB', winget: 'Mojang.MinecraftLauncher', desc: 'The blocky sandbox — Java + Bedrock launcher.', tint: '#4ade80' },
  { id: 'discord', name: 'Discord', publisher: 'Discord', icon: 'MessagesSquare', cat: 'game', rating: 4.4, size: '~150 MB', winget: 'Discord.Discord', desc: 'Voice + text for gaming squads and dev servers.', tint: '#818cf8' },
  { id: 'gfn', name: 'GeForce NOW', publisher: 'NVIDIA', icon: 'Cloud', cat: 'game', rating: 4.1, size: '~120 MB', winget: 'Nvidia.GeForceNow', desc: 'Cloud-stream AAA games to any rig.', tint: '#22d3ee' },
  // ---- AI ----
  { id: 'ollama', name: 'Ollama', publisher: 'Ollama', icon: 'Sparkles', cat: 'ai', rating: 4.8, size: '~700 MB', winget: 'Ollama.Ollama', desc: 'Run LLMs locally — llama3, gemma, qwen, deepseek.', tint: '#a78bfa' },
  { id: 'lmstudio', name: 'LM Studio', publisher: 'LM Studio', icon: 'FlaskConical', cat: 'ai', rating: 4.6, size: '~400 MB', winget: 'ElementLabs.LMStudio', desc: 'GUI for local models — chat, server, tool calls.', tint: '#f472b6' },
  { id: 'openwebui', name: 'Open WebUI', publisher: 'Open WebUI', icon: 'Bot', cat: 'ai', rating: 4.7, size: '~300 MB', winget: 'OpenAI.OpenWebUI', desc: 'ChatGPT-style frontend for local + cloud LLMs.', tint: '#34d399' },
  // ---- SYSTEM ----
  { id: 'powertoys', name: 'PowerToys', publisher: 'Microsoft', icon: 'Wrench', cat: 'system', rating: 4.8, size: '~150 MB', winget: 'Microsoft.PowerToys', desc: 'Power-user utilities — FancyZones, PowerRename, Run.', tint: '#60a5fa' },
  { id: '7zip', name: '7-Zip', publisher: '7-Zip', icon: 'Archive', cat: 'system', rating: 4.9, size: '~1.5 MB', winget: '7zip.7zip', desc: 'The fastest archive tool — zip, 7z, rar, tar.', tint: '#fbbf24' },
  { id: 'everything', name: 'Everything', publisher: 'voidtools', icon: 'Search', cat: 'system', rating: 4.9, size: '~2 MB', winget: 'voidtools.Everything', desc: 'Instant file search across your whole PC.', tint: '#22d3ee' },
  { id: 'obs', name: 'OBS Studio', publisher: 'OBS', icon: 'Video', cat: 'system', rating: 4.7, size: '~150 MB', winget: 'OBSProject.OBSStudio', desc: 'Screen recording + streaming studio.', tint: '#64748b' },
  { id: 'audacity', name: 'Audacity', publisher: 'Audacity', icon: 'AudioWaveform', cat: 'system', rating: 4.5, size: '~80 MB', winget: 'Audacity.Audacity', desc: 'Free audio editor — record, mix, master.', tint: '#60a5fa' },
  { id: 'vlc', name: 'VLC Media Player', publisher: 'VideoLAN', icon: 'Play', cat: 'system', rating: 4.8, size: '~45 MB', winget: 'VideoLAN.VLC', desc: 'Plays anything — no codecs needed.', tint: '#fb923c' },
  { id: 'krita', name: 'Krita', publisher: 'Krita', icon: 'Brush', cat: 'system', rating: 4.6, size: '~250 MB', winget: 'KDE.Krita', desc: 'Pro digital painting — free and open source.', tint: '#f472b6' },
];

const CATS: { id: StoreItem['cat'] | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'FOR YOU', icon: 'Sparkles' },
  { id: 'dev', label: 'DEV TOOLS', icon: 'Code2' },
  { id: 'game', label: 'GAMES', icon: 'Gamepad2' },
  { id: 'ai', label: 'AI', icon: 'Bot' },
  { id: 'system', label: 'SYSTEM', icon: 'Wrench' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="Star" size={9} className={i <= Math.round(rating) ? 'text-amber-400' : 'text-white/15'} />
      ))}
    </span>
  );
}

export function VoxStore() {
  const s = useVox();
  const [cat, setCat] = useState<StoreItem['cat'] | 'all'>('all');
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return STORE_ITEMS.filter((i) => (cat === 'all' || i.cat === cat) && (!needle || i.name.toLowerCase().includes(needle) || i.publisher.toLowerCase().includes(needle)));
  }, [cat, q]);

  const featured = STORE_ITEMS.filter((i) => ['vscode', 'roblox', 'ollama', 'powertoys'].includes(i.id));

  const get = (item: StoreItem) => {
    sfx.command();
    if (item.winget) void s.storeInstall(item.winget, item.name);
    else s.pushNotification({ category: 'STORE', severity: 'info', title: 'AVAILABLE IN WINDOWS', body: `${item.name} is part of the OS — open it from My Apps.` });
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label mb-1.5">APP STORE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">V0X-ST0RE</h1>
          <p className="text-[11.5px] text-vox-muted mt-1">Curated for devs, gamers and power users. GET installs via winget through the VOX Terminal — the agent executes it on your real machine.</p>
        </div>
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vox-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the store…"
            className="bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-vox-text placeholder:text-vox-dim outline-none focus:border-cyan-400/40 w-56"
          />
        </div>
      </div>

      {/* category bar */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => { sfx.command(); setCat(c.id); }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider flex items-center gap-1.5 transition-all border ${
              cat === c.id ? 'bg-cyan-400/10 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]' : 'bg-white/[0.03] border-white/10 text-vox-muted hover:text-vox-text'
            }`}
          >
            <Icon name={c.icon} size={12} /> {c.label}
          </button>
        ))}
        <Badge tone="cyan" className="ml-auto">{items.length} APPS</Badge>
      </div>

      {/* featured rail */}
      {cat === 'all' && !q && (
        <div className="grid md:grid-cols-4 gap-4">
          {featured.map((f) => (
            <div key={f.id} className="relative rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4 overflow-hidden">
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-bl-lg bg-cyan-400/15 border border-cyan-400/30 text-[9px] font-bold tracking-widest text-cyan-300">FEATURED</span>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${f.tint}33, transparent)` }}>
                <span style={{ color: f.tint }}><Icon name={f.icon} size={22} /></span>
              </div>
              <p className="text-[13px] font-bold text-vox-text">{f.name}</p>
              <p className="text-[10px] text-vox-dim font-mono mt-0.5">{f.publisher}</p>
              <div className="mt-2 flex items-center gap-1.5"><Stars rating={f.rating} /><span className="text-[9.5px] text-vox-dim">{f.rating.toFixed(1)}</span></div>
              <Button size="xs" variant="cyan" className="mt-3 w-full" icon="Download" onClick={() => get(f)}>GET</Button>
            </div>
          ))}
        </div>
      )}

      {/* listing */}
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.id} className="glass-inset p-3.5 flex items-center gap-3.5 hover:bg-white/[0.04] hover:border-cyan-400/25 transition-all">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/10" style={{ background: `linear-gradient(135deg, ${item.tint}2e, transparent)`, color: item.tint }}>
              <Icon name={item.icon} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-vox-text truncate">{item.name}</p>
                <Badge tone="dim" className="!px-1.5 !py-0">{item.size}</Badge>
              </div>
              <p className="text-[10px] font-mono text-vox-dim">{item.publisher}</p>
              <div className="mt-1 flex items-center gap-1.5"><Stars rating={item.rating} /><span className="text-[9.5px] text-vox-dim">{item.rating.toFixed(1)}</span></div>
              <p className="text-[10.5px] text-vox-muted mt-1 leading-snug line-clamp-2">{item.desc}</p>
            </div>
            <Button size="xs" variant={item.winget ? 'cyan' : 'ghost'} icon="Download" onClick={() => get(item)} disabled={!item.winget}>GET</Button>
          </div>
        ))}
      </div>

      {!items.length && (
        <div className="glass-inset py-10 text-center">
          <Icon name="PackageX" size={26} className="text-vox-dim mx-auto mb-2" />
          <p className="text-[12px] text-vox-muted">No apps match — try a different search.</p>
        </div>
      )}

      <p className="text-[9.5px] font-mono text-vox-dim leading-relaxed">
        INSTALLS RUN AS REAL WINGET COMMANDS THROUGH THE VOX TERMINAL WITH THE DESKTOP AGENT — YOU STAY IN CONTROL. RATINGS ARE EDITORIAL. ALL APPS ARE FREE / OPEN SOURCE OR FREEWARE.
      </p>
    </div>
  );
}
