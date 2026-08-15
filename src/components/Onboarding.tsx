import { useState } from 'react';
import { useVox } from '../lib/store';
import { Button, Field, Input } from './ui';
import { StatusDot } from './ui';
import { sfx } from '../lib/sounds';

const STEPS = [
  { id: 'welcome', title: 'WELCOME TO VOX-OS', icon: 'Hexagon' },
  { id: 'workspace', title: 'CHOOSE WORKSPACE', icon: 'LayoutGrid' },
  { id: 'ai', title: 'CONNECT AI', icon: 'Sparkles' },
  { id: 'github', title: 'CONNECT GITHUB', icon: 'Github' },
  { id: 'agent', title: 'OPTIONAL DESKTOP AGENT', icon: 'Bot' },
  { id: 'check', title: 'SYSTEM CHECK', icon: 'Stethoscope' },
  { id: 'ready', title: 'VOX-OS READY', icon: 'CheckCircle2' },
];

export function Onboarding() {
  const done = useVox((s) => s.onboardingDone);
  const setDone = useVox((s) => s.setOnboardingDone);
  const s = useVox();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('AL13N');
  const [workspace, setWorkspace] = useState('VOX-OS');

  if (done) return null;
  const cur = STEPS[step];

  const finish = () => {
    sfx.success();
    if (name.trim()) useVox.setState({ profile: { ...useVox.getState().profile, name: name.trim() } });
    setDone();
    s.pushNotification({ category: 'SYSTEM', severity: 'success', title: 'VOX-OS READY', body: 'Welcome, developer. Your system is online.' });
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-ink-950 vox-stage">
      <div className="vox-grid" />
      <div className="relative w-[520px] max-w-[92vw] glass hud-border p-6">
        {/* progress */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((st, i) => (
            <div key={st.id} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-cyan-400' : 'bg-white/8'}`} />
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="w-9 h-9 rounded-lg border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center text-vox-cyan">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><path d="M9 22 L16 8 L23 22" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-[0.16em] uppercase">{cur.title}</h2>
            <p className="text-[10px] text-vox-dim font-mono">STEP {step + 1} / {STEPS.length}</p>
          </div>
        </div>

        <div className="min-h-[190px]">
          {step === 0 && (
            <div className="text-center py-6">
              <p className="font-display text-[26px] font-bold tracking-[0.3em] text-white">VOX-OS</p>
              <p className="text-[10px] tracking-[0.4em] text-vox-violet uppercase mt-2">A Dev's First Choice</p>
              <p className="text-[12.5px] text-vox-muted mt-5 leading-relaxed">A futuristic developer operating environment. Code, terminal, AI, GitHub, and system health — in one shell.</p>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3 py-3">
              <Field label="Developer name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Primary workspace">
                <select className="vox-input vox-select" value={workspace} onChange={(e) => setWorkspace(e.target.value)}>
                  {['VOX-OS', 'AI Projects', 'Web Development', 'Gaming', 'Minecraft'].map((w) => <option key={w}>{w}</option>)}
                </select>
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="py-3">
              <p className="text-[12px] text-vox-muted mb-4">Connect an AI provider with your own credentials. This is optional — VOX-OS works without AI.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'gemini', label: 'GEMINI', env: 'GEMINI_API_KEY', color: '#3b82f6' },
                  { id: 'groq', label: 'GROQ', env: 'GROQ_API_KEY', color: '#f97316' },
                  { id: 'openai', label: 'OPENAI', env: 'OPENAI_API_KEY', color: '#10a37f' },
                  { id: 'anthropic', label: 'CLAUDE', env: 'ANTHROPIC_API_KEY', color: '#d97757' },
                ].map((p) => (
                  <button key={p.id} onClick={() => { s.setSection('apimanager'); setDone(); }} className="glass-inset p-3.5 text-left hover:bg-white/[0.04] transition-colors">
                    <span className="w-2.5 h-2.5 rounded-full mb-2" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                    <p className="text-[12px] font-bold tracking-wider text-vox-text">{p.label}</p>
                    <p className="font-mono text-[9.5px] text-vox-dim mt-1">{p.env}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => { s.setSettings({ demoAssistant: true }); setStep((i) => Math.min(STEPS.length - 1, i + 1)); }} className="mt-3 text-[11px] text-vox-dim hover:text-cyan-300 font-mono">→ SKIP — continue without AI</button>
            </div>
          )}
          {step === 3 && (
            <div className="py-3">
              <p className="text-[12px] text-vox-muted mb-4">Connect GitHub to load real repositories. Credentials live in the VOX backend — the browser never sees them.</p>
              <div className="flex gap-2">
                <Button variant="cyan" icon="Github" onClick={() => { void s.connectGithub(); setDone(); }}>CONNECT GITHUB</Button>
                <Button variant="ghost" onClick={() => setDone()}>SKIP</Button>
              </div>
              <p className="text-[10px] text-vox-dim mt-3 font-mono">Requires the VOX server with GITHUB_TOKEN or OAuth configured.</p>
            </div>
          )}
          {step === 4 && (
            <div className="py-3">
              <p className="text-[12px] text-vox-muted mb-4">The optional Desktop Agent unlocks real hardware telemetry, real terminal sessions, and filesystem access. The web shell works without it — unavailable features are labeled clearly.</p>
              <div className="flex gap-2">
                <Button variant="cyan" icon="Bot" onClick={() => { s.setSection('agent'); setDone(); }}>LEARN MORE</Button>
                <Button variant="ghost" onClick={() => setDone()}>CONTINUE WITHOUT</Button>
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="py-3 space-y-2.5 font-mono text-[11px]">
              {[
                ['AI', s.backend === 'online' || s.settings.demoAssistant ? 'READY' : 'NOT CONFIGURED', s.backend === 'online' ? 'online' : 'dim'],
                ['VOICE', s.voice.sttSupported ? 'READY' : 'UNAVAILABLE', s.voice.sttSupported ? 'online' : 'dim'],
                ['AGENT', 'NOT CONNECTED', 'dim'],
                ['NETWORK', navigator.onLine ? 'ONLINE' : 'OFFLINE', navigator.onLine ? 'online' : 'red'],
              ].map(([k, v, tone]) => (
                <div key={k} className="flex items-center gap-3 glass-inset px-3.5 py-2.5">
                  <StatusDot tone={tone as 'online' | 'dim' | 'red'} />
                  <span className="text-vox-text tracking-[0.14em] w-24">{k}</span>
                  <span className="ml-auto text-vox-muted">{v}</span>
                </div>
              ))}
            </div>
          )}
          {step === 6 && (
            <div className="text-center py-8">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 mb-4" style={{ boxShadow: '0 0 24px -6px rgba(52,211,153,0.6)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <p className="font-display text-[18px] font-bold tracking-[0.2em] text-white">WELCOME, DEVELOPER.</p>
              <p className="text-[10px] tracking-[0.3em] text-vox-violet uppercase mt-2">BUILD · DEBUG · DEPLOY · REPEAT</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button variant="ghost" onClick={() => setStep((i) => Math.max(0, i - 1))} disabled={step === 0}>BACK</Button>
          <div className="flex gap-2">
            {step === 6 ? (
              <Button variant="solid" onClick={finish}>ENTER VOX-OS</Button>
            ) : (
              <Button variant="cyan" onClick={() => setStep((i) => Math.min(STEPS.length - 1, i + 1))}>CONTINUE →</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
