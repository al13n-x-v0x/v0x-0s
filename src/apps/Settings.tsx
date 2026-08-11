import { useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import type { ThemeId } from '../lib/types';
import { APP_VERSION } from '../lib/constants';
import { Badge, Button, Field, Icon, Input, Select, Slider, Toggle } from '../components/ui';
import { sfx } from '../lib/sounds';
import { speak } from '../lib/voice';

const CATS = [
  { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  { id: 'terminal', label: 'Terminal', icon: 'SquareTerminal' },
  { id: 'ai', label: 'AI Engine', icon: 'Cpu' },
  { id: 'providers', label: 'API Providers', icon: 'KeyRound' },
  { id: 'github', label: 'GitHub', icon: 'Github' },
  { id: 'voice', label: 'Voice & Mic', icon: 'Mic' },
  { id: 'agent', label: 'Desktop Agent', icon: 'Bot' },
  { id: 'gaming', label: 'Gaming & Boost', icon: 'Gamepad2' },
  { id: 'keys', label: 'Keyboard Shortcuts', icon: 'Keyboard' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck' },
  { id: 'data', label: 'Data & Backup', icon: 'HardDriveDownload' },
  { id: 'about', label: 'About VOX-OS', icon: 'Info' },
] as const;

type Cat = (typeof CATS)[number]['id'];

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'night', label: 'VOX NIGHT', swatch: '#0d1019' },
  { id: 'cyber', label: 'VOX CYBER', swatch: '#22d3ee' },
  { id: 'midnight', label: 'VOX MIDNIGHT', swatch: '#1e293b' },
  { id: 'graphite', label: 'VOX GRAPHITE', swatch: '#94a3b8' },
];

export function Settings() {
  const [cat, setCat] = useState<Cat>('appearance');
  return (
    <div className="h-full flex">
      <aside className="w-[200px] shrink-0 border-r border-vox-line overflow-y-auto py-3 px-2 bg-ink-900/40">
        <p className="hud-label px-2 pb-2">SETTINGS</p>
        <div className="space-y-0.5">
          {CATS.map((c) => (
            <button key={c.id} data-active={cat === c.id} onClick={() => setCat(c.id)} className={clsx('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors', cat === c.id ? 'bg-cyan-400/10 text-cyan-200' : 'text-vox-muted hover:text-vox-text hover:bg-white/[0.04]')}>
              <Icon name={c.icon} size={14} className={cat === c.id ? 'text-vox-cyan' : 'text-vox-dim'} />
              <span className="text-[11.5px]">{c.label}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {cat === 'appearance' && <Appearance />}
        {cat === 'terminal' && <TerminalCfg />}
        {cat === 'ai' && <AICfg />}
        {cat === 'providers' && <ProvidersCfg />}
        {cat === 'github' && <GitHubCfg />}
        {cat === 'voice' && <VoiceCfg />}
        {cat === 'agent' && <AgentCfg />}
        {cat === 'gaming' && <GamingCfg />}
        {cat === 'keys' && <KeysCfg />}
        {cat === 'notifications' && <NotifCfg />}
        {cat === 'security' && <SecurityCfg />}
        {cat === 'data' && <DataCfg />}
        {cat === 'about' && <AboutCfg />}
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-vox-line/60">
      <div>
        <p className="text-[12.5px] font-medium text-vox-text">{label}</p>
        {hint && <p className="text-[10.5px] text-vox-muted mt-0.5 leading-relaxed max-w-[420px]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[13px] font-bold tracking-[0.14em] uppercase text-vox-text mb-2 mt-6 first:mt-0">{children}</h2>;
}

function Appearance() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Theme</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => (
          <button key={t.id} data-active={s.settings.theme === t.id} onClick={() => { s.setTheme(t.id); }} className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-colors', s.settings.theme === t.id ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-vox-line hover:bg-white/[0.03]')}>
            <span className="w-8 h-8 rounded-lg border border-white/15" style={{ background: `linear-gradient(135deg, ${t.swatch}, #05060a)` }} />
            <span className="text-[11.5px] font-semibold text-vox-text">{t.label}</span>
            {s.settings.theme === t.id && <Icon name="CheckCircle2" size={15} className="ml-auto text-cyan-300" />}
          </button>
        ))}
      </div>
      <SectionTitle>Interface</SectionTitle>
      <Row label="Boot animation" hint="Shows the VOX core initialization sequence on launch.">
        <Toggle checked={s.settings.bootAnimation} onChange={(v) => s.setSettings({ bootAnimation: v })} label="Boot animation" />
      </Row>
      <Row label="Reduced motion" hint="Disables most animations and transitions. Follows the OS preference by default.">
        <Toggle checked={s.settings.reducedMotion} onChange={(v) => s.setSettings({ reducedMotion: v })} label="Reduced motion" />
      </Row>
      <Row label="High contrast" hint="Strengthens borders and text contrast for readability.">
        <Toggle checked={s.settings.highContrast} onChange={(v) => s.setSettings({ highContrast: v })} label="High contrast" />
      </Row>
      <Row label="UI sound effects" hint="Subtle WebAudio feedback for windows, commands, and notifications.">
        <Toggle checked={s.settings.sound} onChange={(v) => s.setSettings({ sound: v })} label="Sound effects" />
      </Row>
      <Row label="Sound volume" hint={`${Math.round(s.settings.soundVolume * 100)}%`}>
        <div className="w-40"><Slider value={s.settings.soundVolume} min={0} max={0.6} step={0.05} onChange={(v) => { s.setSettings({ soundVolume: v }); sfx.open(); }} label="Sound volume" /></div>
      </Row>
      <Row label="Interface scale" hint={`${Math.round(s.settings.fontSize * 100)}% — affects all text`}>
        <div className="w-40"><Slider value={s.settings.fontSize} min={0.9} max={1.2} step={0.05} onChange={(v) => s.setSettings({ fontSize: v })} label="Interface scale" /></div>
      </Row>
      <Row label="Simulated labels" hint="Show SIMULATED / DEMO badges wherever browser limits apply.">
        <Toggle checked={s.settings.showSimulatedLabels} onChange={(v) => s.setSettings({ showSimulatedLabels: v })} label="Simulated labels" />
      </Row>
    </div>
  );
}

function TerminalCfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Terminal</SectionTitle>
      <Row label="Default shell" hint="Used for new terminal sessions.">
        <Select value={s.settings.defaultShell} onChange={(e) => s.setSettings({ defaultShell: e.target.value as never })} className="!w-44">
          <option value="powershell">PowerShell</option>
          <option value="bash">Bash</option>
          <option value="cmd">CMD</option>
        </Select>
      </Row>
      <Row label="Simulated terminal" hint="Browser sandbox interprets commands safely. Real execution requires the Desktop Agent.">
        <Badge tone="amber">SANDBOXED</Badge>
      </Row>
      <Row label="Confirm destructive commands" hint="Require confirmation before file deletions and process termination.">
        <Toggle checked={s.settings.confirmDestructive} onChange={(v) => s.setSettings({ confirmDestructive: v })} label="Confirm destructive" />
      </Row>
    </div>
  );
}

function AICfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Routing</SectionTitle>
      <Row label="Primary provider" hint="Preferred provider for AI requests.">
        <Select value={s.settings.primaryProvider} onChange={(e) => s.setSettings({ primaryProvider: e.target.value as never })} className="!w-44">
          <option value="auto">AUTO (smart)</option>
          <option value="gemini">Gemini</option>
          <option value="groq">Groq</option>
        </Select>
      </Row>
      <Row label="Secondary provider" hint="Used for failover when the primary provider fails.">
        <Select value={s.settings.secondaryProvider} onChange={(e) => s.setSettings({ secondaryProvider: e.target.value as 'gemini' | 'groq' })} className="!w-44">
          <option value="gemini">Gemini</option>
          <option value="groq">Groq</option>
        </Select>
      </Row>
      <Row label="Routing mode" hint="AUTO routes by task, PRIMARY ONLY pins one provider, FAILOVER retries the secondary, DUAL uses both providers in parallel.">
        <Select value={s.settings.routingMode} onChange={(e) => s.setSettings({ routingMode: e.target.value as never })} className="!w-44">
          <option value="auto">SMART AUTO</option>
          <option value="primary">PRIMARY ONLY</option>
          <option value="failover">FAILOVER</option>
          <option value="dual">DUAL (BOTH)</option>
        </Select>
      </Row>
      <SectionTitle>Generation</SectionTitle>
      <Row label="Temperature" hint={`${s.settings.temperature}`}>
        <div className="w-40"><Slider value={s.settings.temperature} min={0} max={1.5} step={0.1} onChange={(v) => s.setSettings({ temperature: v })} label="Temperature" /></div>
      </Row>
      <Row label="Max output tokens">
        <Select value={String(s.settings.maxTokens)} onChange={(e) => s.setSettings({ maxTokens: Number(e.target.value) })} className="!w-44">
          {[512, 1024, 2048, 4096, 8192].map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Row>
      <Row label="Demo assistant" hint="When no provider is configured and the backend is offline, VOX replies with clearly-labeled DEMO responses.">
        <Toggle checked={s.settings.demoAssistant} onChange={(v) => s.setSettings({ demoAssistant: v })} label="Demo assistant" />
      </Row>
      <div className="mt-5"><Button variant="cyan" icon="Settings2" onClick={() => s.setSection('aiengine')}>OPEN AI ENGINE →</Button></div>
    </div>
  );
}

function ProvidersCfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>API Providers</SectionTitle>
      <Row label="Gemini" hint={s.providers.gemini.configured ? `Connected · ${s.providers.gemini.model}` : 'NOT CONFIGURED — set GEMINI_API_KEY in server/.env or configure via the API Manager.'}>
        <Badge tone={s.providers.gemini.configured ? 'green' : 'dim'}>{s.providers.gemini.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}</Badge>
      </Row>
      <Row label="Groq" hint={s.providers.groq.configured ? `Connected · ${s.providers.groq.model}` : 'NOT CONFIGURED — set GROQ_API_KEY in server/.env or configure via the API Manager.'}>
        <Badge tone={s.providers.groq.configured ? 'green' : 'dim'}>{s.providers.groq.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}</Badge>
      </Row>
      <div className="mt-5"><Button variant="cyan" icon="KeyRound" onClick={() => s.setSection('apimanager')}>OPEN API MANAGER →</Button></div>
    </div>
  );
}

function GitHubCfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>GitHub</SectionTitle>
      <Row label="Connection" hint={s.settings.githubConnected ? `Connected${s.githubUser ? ` as ${s.githubUser}` : ''}` : 'Not connected. The VOX backend holds credentials — the frontend never sees tokens.'}>
        {s.settings.githubConnected ? <Badge tone="green">CONNECTED</Badge> : <Badge tone="dim">NOT CONNECTED</Badge>}
      </Row>
      <div className="mt-5 flex gap-2">
        <Button variant="cyan" icon="Github" onClick={() => void s.connectGithub()}>{s.settings.githubConnected ? 'RECONNECT' : 'CONNECT'}</Button>
        <Button variant="danger" onClick={() => s.setSettings({ githubConnected: false })} disabled={!s.settings.githubConnected}>DISCONNECT</Button>
      </div>
    </div>
  );
}

function VoiceCfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Voice Engine</SectionTitle>
      <Row label="VOX Voice" hint="Enables speech-to-text and text-to-speech where the browser supports them.">
        <Toggle checked={s.settings.voiceEnabled} onChange={(v) => s.setSettings({ voiceEnabled: v })} label="Voice enabled" />
      </Row>
      <Row label="Auto speak responses" hint="VOX reads responses aloud with TTS when enabled.">
        <Toggle checked={s.settings.voiceAutoSpeak} onChange={(v) => s.setSettings({ voiceAutoSpeak: v })} label="Auto speak" />
      </Row>
      <Row label="Wake word (future)" hint="'Hey VOX' continuous listening is architecturally supported but not active — the microphone is never silently recorded.">
        <Toggle checked={s.settings.wakeWord} onChange={(v) => s.setSettings({ wakeWord: v })} label="Wake word" />
      </Row>
      <SectionTitle>Speech</SectionTitle>
      <Row label="Speed" hint={`${s.settings.voiceSpeed}x`}><div className="w-40"><Slider value={s.settings.voiceSpeed} min={0.5} max={2} step={0.1} onChange={(v) => s.setSettings({ voiceSpeed: v })} label="Speed" /></div></Row>
      <Row label="Pitch" hint={`${s.settings.voicePitch}`}><div className="w-40"><Slider value={s.settings.voicePitch} min={0.5} max={1.5} step={0.1} onChange={(v) => s.setSettings({ voicePitch: v })} label="Pitch" /></div></Row>
      <Row label="Volume" hint={`${Math.round(s.settings.voiceVolume * 100)}%`}><div className="w-40"><Slider value={s.settings.voiceVolume} min={0} max={1} step={0.05} onChange={(v) => s.setSettings({ voiceVolume: v })} label="Volume" /></div></Row>
      <div className="mt-5 flex gap-2">
        <Button variant="cyan" icon="Volume2" onClick={() => speak('VOX voice engine test. System health is excellent.', { speed: s.settings.voiceSpeed, pitch: s.settings.voicePitch, volume: s.settings.voiceVolume })}>TEST VOICE</Button>
        <Button variant="ghost" icon="Mic" onClick={() => s.setSection('voice')}>VOICE ENGINE →</Button>
      </div>
    </div>
  );
}

function AgentCfg() {
  const s = useVox();
  const perms = Object.entries(s.settings.agentPermission) as [string, 'allowed' | 'denied' | 'requested'][];
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Desktop Agent</SectionTitle>
      <Row label="Status" hint="The Desktop Agent is an optional local companion for hardware telemetry, real terminal, and filesystem access. The web shell works fully without it.">
        <Badge tone={s.systemInfo.agent === 'connected' ? 'green' : 'dim'}>{s.systemInfo.agent === 'connected' ? 'CONNECTED' : 'NOT CONNECTED'}</Badge>
      </Row>
      <SectionTitle>Permissions</SectionTitle>
      {perms.map(([k, v]) => (
        <Row key={k} label={k[0].toUpperCase() + k.slice(1)}>
          <select className="vox-input vox-select !w-32" value={v} onChange={(e) => s.setSettings({ agentPermission: { ...s.settings.agentPermission, [k]: e.target.value as 'allowed' | 'denied' | 'requested' } })}>
            <option value="allowed">✓ ALLOWED</option>
            <option value="denied">○ DENIED</option>
            <option value="requested">⚠ REQUESTED</option>
          </select>
        </Row>
      ))}
      <p className="text-[10.5px] text-vox-muted mt-3 leading-relaxed">The agent exposes controlled capabilities (SYSTEM_STATS, PROCESS_LIST, FILES, TERMINAL, GIT, VOICE) with explicit per-request permissions. No unrestricted remote shell is ever exposed.</p>
    </div>
  );
}

function GamingCfg() {
  const s = useVox();
  const os = s.os;
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Detected Platform</SectionTitle>
      <Row label="Operating system" hint="Detected live from the browser. VOX-OS targets Windows, Linux, Android, BSD, Solaris and Web — macOS is not supported.">
        <Badge tone={os.supported ? 'green' : 'red'}>{os.name}{os.arch !== 'unknown' ? ` · ${os.arch}` : ''}</Badge>
      </Row>
      <Row label="GPU (browser)" hint={s.gpu.renderer ? String(s.gpu.renderer) : 'Hidden by this browser — the Desktop Agent can report the real GPU.'}>
        <Badge tone={s.gpu.renderer ? 'blue' : 'dim'}>{s.gpu.renderer ? 'DETECTED' : 'UNAVAILABLE'}</Badge>
      </Row>
      <SectionTitle>Boost</SectionTitle>
      <Row label="Boost profile" hint="BOOST and ULTRA switch VOX-OS to performance mode and reduce background work. Real GPU/driver tuning requires the Desktop Agent.">
        <select className="vox-input vox-select !w-40" value={s.settings.gameProfile} onChange={(e) => s.setGameProfile(e.target.value as 'balanced' | 'boost' | 'ultra')}>
          <option value="balanced">BALANCED</option>
          <option value="boost">BOOST</option>
          <option value="ultra">ULTRA FPS</option>
        </select>
      </Row>
      <Row label="Game Mode" hint="Suppresses non-critical notifications (errors and security alerts still come through) and focuses the shell on the active session.">
        <Toggle checked={s.settings.gameMode} onChange={(v) => s.setGameMode(v)} />
      </Row>
      <p className="text-[10.5px] text-vox-muted mt-3 leading-relaxed">Compatibility checks (WebGL, memory, cores, network) are real browser capabilities. Roblox Player and OS-level driver control require the Desktop Agent — VOX-OS never claims them without it.</p>
    </div>
  );
}

function KeysCfg() {
  const keys: [string, string][] = [
    ['CTRL + K', 'Command palette'],
    ['CTRL + SHIFT + P', 'VOX commands'],
    ['CTRL + P', 'Quick open (files)'],
    ['CTRL + S', 'Save file'],
    ['CTRL + `', 'Open terminal'],
    ['ALT + TAB', 'Switch windows'],
    ['ESC', 'Close menus / dialogs'],
    ['F1', 'Open VOX AI'],
  ];
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <div className="glass-inset divide-y divide-vox-line/50">
        {keys.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[12px] text-vox-muted">{d}</span>
            <kbd className="px-2 py-1 rounded border border-white/15 bg-white/5 font-mono text-[10.5px] text-vox-text">{k}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotifCfg() {
  const s = useVox();
  const items: [string, keyof typeof s.settings & ('notifyBuild' | 'notifyGitHub' | 'notifyAI' | 'notifySystem' | 'notifySecurity'), string][] = [
    ['Build events', 'notifyBuild', 'Build completions and failures'],
    ['GitHub events', 'notifyGitHub', 'Syncs and connection changes'],
    ['AI events', 'notifyAI', 'Provider status and routing'],
    ['System events', 'notifySystem', 'Health scans and diagnostics'],
    ['Security events', 'notifySecurity', 'Secret findings and key changes'],
  ];
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Notification Categories</SectionTitle>
      {items.map(([label, key, hint]) => (
        <Row key={key} label={label} hint={hint}>
          <Toggle checked={s.settings[key]} onChange={(v) => s.setSettings({ [key]: v } as never)} label={label} />
        </Row>
      ))}
    </div>
  );
}

function SecurityCfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Security</SectionTitle>
      <Row label="Confirm destructive actions" hint="Windows, files, and processes ask before destructive operations.">
        <Toggle checked={s.settings.confirmDestructive} onChange={(v) => s.setSettings({ confirmDestructive: v })} label="Confirm destructive" />
      </Row>
      <Row label="Autosave editor buffers" hint="Writes editor changes into the workspace tree automatically.">
        <Toggle checked={s.settings.autoSave} onChange={(v) => s.setSettings({ autoSave: v })} label="Autosave" />
      </Row>
      <SectionTitle>Guarantees</SectionTitle>
      <div className="space-y-2">
        {['API keys never ship to the frontend', 'GitHub tokens never displayed', '.env values never rendered', 'No fake connections — states are CONNECTED, NOT CONFIGURED, or OFFLINE'].map((g) => (
          <div key={g} className="flex items-center gap-2 text-[12px] text-vox-muted">
            <Icon name="ShieldCheck" size={13} className="text-emerald-400" /> {g}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataCfg() {
  const s = useVox();
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="max-w-[640px]">
      <SectionTitle>Persistence</SectionTitle>
      <p className="text-[11.5px] text-vox-muted leading-relaxed">Settings, window positions, projects, terminal sessions, extensions, and AI configuration persist in this browser. Secrets never do.</p>
      <SectionTitle>Backup</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Button variant="cyan" icon="HardDriveDownload" onClick={() => s.createBackup()}>CREATE BACKUP</Button>
        <Button icon="Download" onClick={() => s.exportConfig()}>EXPORT CONFIG</Button>
        <label className="vox-btn">
          <Icon name="Upload" size={13} /> IMPORT CONFIG
          <input type="file" accept=".json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const text = await f.text();
            const r = s.importAIConfig(text);
            if (!r.ok) s.pushNotification({ category: 'SYSTEM', severity: 'error', title: 'IMPORT FAILED', body: r.error ?? 'Invalid configuration file' });
            e.target.value = '';
          }} />
        </label>
        <Button variant="danger" onClick={() => { if (confirm('Reset UI state? Projects and data are kept, window layout and shell state reset.')) s.resetUI(); }}>RESET UI STATE</Button>
      </div>
      <p className="text-[10px] text-vox-dim mt-3 font-mono">EXPORT never includes API keys. IMPORT never overwrites existing secrets.</p>
      <SectionTitle>Local backups</SectionTitle>
      <div className="space-y-1.5">
        {s.backups.length === 0 ? <p className="text-[12px] text-vox-dim">No backups yet.</p> : s.backups.map((b) => (
          <div key={b.id} className="glass-inset px-3 py-2 flex items-center gap-3">
            <Icon name="HardDriveDownload" size={13} className="text-vox-dim" />
            <span className="text-[11.5px] text-vox-text">{b.label}</span>
            <span className="font-mono text-[9.5px] text-vox-dim">{(b.size / 1024).toFixed(1)} KB</span>
            <Button size="xs" variant="ghost" className="ml-auto" onClick={() => s.restoreBackup(b.id)}>RESTORE</Button>
          </div>
        ))}
      </div>
      {file && <p className="text-[10px] text-vox-muted mt-2">{file.name} selected — use the config import above.</p>}
    </div>
  );
}

function AboutCfg() {
  const s = useVox();
  return (
    <div className="max-w-[640px]">
      <div className="flex items-center gap-4 mb-6">
        <span className="w-14 h-14 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center text-vox-cyan" style={{ boxShadow: '0 0 24px -8px rgba(34,211,238,0.6)' }}>
          <Icon name="Hexagon" size={26} />
        </span>
        <div>
          <h2 className="font-display text-[20px] font-bold tracking-[0.2em] text-white">VOX-OS</h2>
          <p className="text-[10px] tracking-[0.3em] text-vox-violet uppercase mt-0.5">A Dev's First Choice</p>
          <p className="text-[10px] text-vox-dim mt-1 font-mono">v{APP_VERSION} · repo v0x-0s</p>
        </div>
      </div>
      <p className="text-[12.5px] text-vox-muted leading-relaxed">
        VOX-OS is a futuristic developer operating environment: code, terminal, AI, GitHub, health, and automation in one coherent shell. Designed for Windows, Linux, Android, BSD, Solaris, and Web — macOS is not supported.
      </p>
      <div className="grid grid-cols-3 gap-3 mt-5">
        {[['ENGINES', '16+'], ['APPS', '12'], ['PLATFORMS', '6']].map(([k, v]) => (
          <div key={k} className="glass-inset p-3 text-center">
            <p className="font-mono text-[18px] font-semibold text-cyan-300">{v}</p>
            <p className="hud-label mt-1">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="ghost" icon="Stethoscope" onClick={() => void s.runDiagnostics()}>RUN SYSTEM DIAGNOSTICS</Button>
      </div>
    </div>
  );
}
