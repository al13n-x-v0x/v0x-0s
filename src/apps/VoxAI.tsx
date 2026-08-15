import { useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import type { ProviderId } from '../lib/types';
import { PROVIDERS } from '../lib/constants';
import { Badge, Button, Icon, Panel, StatusDot, useAutoScroll } from '../components/ui';
import { VoxCore, useCoreState } from '../components/VoxCore';
import { timeAgo, fmtDuration } from '../lib/fmt';

const QUICK = [
  { label: 'ANALYZE PROJECT', prompt: 'Review my project and produce a project intelligence report.' },
  { label: 'FIX ERROR', prompt: 'Look at the recent errors in the Error Center and explain the most likely fix.' },
  { label: 'EXPLAIN CODE', prompt: 'Explain the active file in Code Studio.' },
  { label: 'WHY IS MY BUILD FAILING?', prompt: 'Why is my build failing?' },
  { label: 'OPTIMIZE', prompt: 'Optimize this function for performance.' },
];

export function VoxAI() {
  const s = useVox();
  const core = useCoreState();
  const [input, setInput] = useState('');
  const scrollRef = useAutoScroll<HTMLDivElement>([s.aiMessages.length, s.aiThinking]);
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const lastMsg = s.aiMessages[s.aiMessages.length - 1];

  const send = (text: string) => {
    if (!text.trim() || s.aiThinking) return;
    setInput('');
    void s.sendMessage(text.trim());
  };

  return (
    <div className="h-full flex">
      {/* chat */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h1 className="font-display text-[16px] font-bold tracking-[0.14em] uppercase">VOX AI CORE</h1>
            <p className="text-[10px] text-vox-muted font-mono tracking-[0.18em] mt-0.5">MULTI-MODEL INTELLIGENCE SYSTEM</p>
          </div>
          <div className="flex items-center gap-3">
            {PROVIDERS.some((p) => s.providers[p.id]?.configured) ? (
              <Badge tone="green"><span className="dot dot-online" /> ONLINE</Badge>
            ) : s.settings.demoAssistant ? (
              <Badge tone="amber">DEMO ASSISTANT{s.backend === 'offline' ? ' · BACKEND OFFLINE' : ''}</Badge>
            ) : (
              <Badge tone="red">AI NOT CONFIGURED</Badge>
            )}
            <Badge tone="cyan">{s.providers[s.settings.primaryProvider === 'auto' ? 'gemini' : (s.settings.primaryProvider as ProviderId)].model}</Badge>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {s.aiMessages.map((m, i) => (
            <div key={i} className={clsx('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
              <span className={clsx('w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border', m.role === 'user' ? 'border-white/10 bg-white/5 text-vox-muted' : 'border-violet-400/30 bg-violet-400/10 text-violet-300')}>
                <Icon name={m.role === 'user' ? 'UserRound' : 'Sparkles'} size={13} />
              </span>
              <div className={clsx('max-w-[78%] min-w-0', m.role === 'user' && 'text-right')}>
                {m.role === 'user' ? (
                  <div className="inline-block text-left glass-inset px-3.5 py-2.5 text-[12.5px] text-vox-text rounded-xl">{m.content}</div>
                ) : (
                  <div className="text-left">
                    {m.content ? (
                      <div className="inline-block text-left glass-inset px-3.5 py-2.5 text-[12.5px] text-vox-text rounded-xl whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 glass-inset px-3.5 py-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                        <span className="ml-1 font-mono text-[10px] tracking-[0.2em] text-vox-dim">{s.aiStatus === 'thinking' ? 'THINKING' : 'GENERATING'}</span>
                      </div>
                    )}
                    {m.content && (
                      <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] text-vox-dim">
                        <span className="text-violet-300/80">VOX</span>
                        {m.demo ? <Badge tone="violet">DEMO</Badge> : <Badge tone="cyan">{m.provider?.toUpperCase()}</Badge>}
                        <span>{timeAgo(m.time)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {s.aiStatus === 'error' && (
            <div className="glass-inset border-red-400/20 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusDot tone="red" />
                <span className="text-[10px] font-bold tracking-[0.16em] text-red-300">{s.aiErrorCategory ?? 'AI ERROR'}</span>
              </div>
              <p className="text-[12px] text-vox-muted leading-relaxed">{s.aiError}</p>
              <div className="mt-3 flex gap-2">
                <Button size="xs" variant="cyan" onClick={() => send(input || 'Continue')}>RETRY</Button>
                <Button size="xs" onClick={() => s.setSection('aiengine')}>OPEN AI SETTINGS</Button>
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <div className="px-5 pb-4 pt-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK.map((q) => (
              <button key={q.label} onClick={() => send(q.prompt)} className="px-2 py-1 rounded-md border border-vox-line text-[9.5px] font-semibold tracking-[0.1em] text-vox-muted hover:text-cyan-300 hover:border-cyan-400/40 transition-colors">
                {q.label}
              </button>
            ))}
          </div>
          <div className="glass-inset flex items-center gap-2 px-3 py-2.5">
            <Icon name="Sparkles" size={14} className="text-violet-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
              placeholder={s.backend === 'online' ? 'Ask VOX anything about your project…' : 'AI backend offline — demo assistant active (DEMO responses)…'}
              className="flex-1 bg-transparent outline-none text-[12.5px] text-vox-text placeholder:text-vox-dim"
            />
            {s.aiThinking ? (
              <Button size="xs" variant="danger" onClick={() => s.stopGeneration()}>STOP</Button>
            ) : (
              <Button size="xs" variant="solid" icon="Send" onClick={() => send(input)} disabled={!input.trim()}>SEND</Button>
            )}
          </div>
          <p className="mt-1.5 text-[9px] font-mono text-vox-dim">
            {s.backend === 'online'
              ? `ROUTER: ${s.settings.routingMode.toUpperCase()} · PRIMARY ${s.settings.primaryProvider.toUpperCase()} · LAST ${lastMsg?.provider ? lastMsg.provider.toUpperCase() + ' · ' + (s.aiUsage.avgLatencyMs ? fmtDuration(s.aiUsage.avgLatencyMs) : '') : '—'}`
              : 'NO PROVIDER CONFIGURED — responses are DEMO only. Configure keys in the VOX backend (server/.env).'}
          </p>
        </div>
      </div>

      {/* context panel */}
      <aside className="w-[250px] shrink-0 border-l border-vox-line bg-ink-900/50 overflow-y-auto hidden md:block">
        <Panel title="VOX Context" icon="PanelsTopLeft" className="!border-0 !bg-transparent !backdrop-blur-none !rounded-none" bodyClassName="!p-3">
          <div className="flex items-center justify-between mb-2">
            <Badge tone="cyan">CONTEXT</Badge>
            <button onClick={() => s.setSection('memory')} className="text-[9px] text-vox-dim hover:text-vox-text">MEMORY →</button>
          </div>
          {active && (
            <div className="space-y-1.5">
              <ContextRow icon="FolderKanban" label="PROJECT" value={active.name} />
              <ContextRow icon="FileCode2" label="CURRENT FILE" value={s.activeFile ?? '—'} />
              <ContextRow icon="Files" label="OPEN FILES" value={`${(s.codeTabs[s.activeProjectId] ?? []).length} tabs`} />
              <ContextRow icon="SquareTerminal" label="TERMINAL" value={`${s.terminalSessions.length} session(s) · ${s.terminalSessions[0]?.shell ?? ''}`} />
              <ContextRow icon="GitBranch" label="GIT" value={`${active.git.branch} · ${active.git.changes.length} change(s)`} />
              <ContextRow icon="Activity" label="HEALTH" value={s.health.lastScan ? `${s.health.score}/100` : 'not scanned'} />
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-vox-line">
            <p className="hud-label mb-2">VOX MEMORY</p>
            <div className="space-y-1.5">
              {s.memory.slice(0, 4).map((m) => (
                <p key={m.id} className="text-[10.5px] text-vox-muted leading-relaxed">“{m.text}”</p>
              ))}
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function ContextRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-white/[0.03]">
      <Icon name={icon} size={12} className="text-cyan-400/80 shrink-0" />
      <div className="min-w-0">
        <p className="text-[8px] font-bold tracking-[0.12em] text-vox-dim">{label}</p>
        <p className="text-[11px] text-vox-text truncate">{value}</p>
      </div>
    </div>
  );
}
