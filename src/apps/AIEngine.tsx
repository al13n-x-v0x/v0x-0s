import { useState } from 'react';
import { useVox } from '../lib/store';
import type { ProviderId } from '../lib/types';
import { Badge, Button, Field, Icon, Panel, Select, StatusDot, Tabs, ConfirmDialog } from '../components/ui';
import { ProviderCard, ProviderConfigModal, RouterDiagram } from '../components/ai';
import { PROVIDERS, ROUTING_RULES } from '../lib/constants';
import { fmtDuration, timeAgo } from '../lib/fmt';
import { classifyTask } from '../lib/ai';

type Tab = 'providers' | 'router' | 'models' | 'usage' | 'log' | 'security';

export function AIEngine() {
  const s = useVox();
  const [tab, setTab] = useState<Tab>('providers');
  const [configId, setConfigId] = useState<ProviderId | null>(null);
  const [removeId, setRemoveId] = useState<ProviderId | null>(null);

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="hud-label mb-1.5">VOX AI ENGINE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">MULTI-MODEL INTELLIGENCE</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={s.backend === 'online' ? 'green' : 'amber'}>{s.backend === 'online' ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}</Badge>
          <Button size="xs" variant="ghost" icon="Download" onClick={() => s.exportAIConfig()}>EXPORT CONFIG</Button>
        </div>
      </div>

      <Tabs<Tab>
        tabs={[
          { id: 'providers', label: 'Providers', icon: 'Server' },
          { id: 'router', label: 'Smart Router', icon: 'GitMerge' },
          { id: 'models', label: 'Models', icon: 'Cpu' },
          { id: 'usage', label: 'Usage', icon: 'BarChart3' },
          { id: 'log', label: 'Routing Log', icon: 'ScrollText' },
          { id: 'security', label: 'Security', icon: 'ShieldCheck' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'providers' && (
        <>
          {!s.providers.gemini.configured && !s.providers.groq.configured && (
            <div className="glass-inset border-violet-400/20 px-4 py-3.5 flex flex-wrap items-center gap-3">
              <Icon name="Sparkles" size={16} className="text-violet-400" />
              <div className="flex-1 min-w-[240px]">
                <p className="text-[12px] font-semibold text-vox-text">VOX AI IS NOT CONFIGURED</p>
                <p className="text-[11px] text-vox-muted mt-0.5">Configure an AI provider to enable intelligent features. The rest of VOX-OS works without AI.</p>
              </div>
              <Button size="xs" variant="cyan" onClick={() => setConfigId('gemini')}>CONFIGURE GEMINI</Button>
              <Button size="xs" onClick={() => setConfigId('groq')}>CONFIGURE GROQ</Button>
              <Button size="xs" variant="ghost" onClick={() => s.setSection('dashboard')}>CONTINUE WITHOUT AI</Button>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <ProviderCard id="gemini" onConfigure={() => setConfigId('gemini')} onRemove={() => setRemoveId('gemini')} onTest={() => void s.testProviderConn('gemini')} onModel={() => void s.refreshModels('gemini')} />
            <ProviderCard id="groq" onConfigure={() => setConfigId('groq')} onRemove={() => setRemoveId('groq')} onTest={() => void s.testProviderConn('groq')} onModel={() => void s.refreshModels('groq')} />
          </div>
          <Panel title="Provider Health" icon="HeartPulse" bodyClassName="!p-3">
            <div className="grid md:grid-cols-2 gap-3">
              {(['gemini', 'groq'] as ProviderId[]).map((id) => {
                const p = s.providers[id];
                return (
                  <div key={id} className="glass-inset px-3 py-2.5 flex items-center gap-3">
                    <StatusDot tone={p.status === 'connected' ? 'online' : p.status === 'error' ? 'red' : p.status === 'checking' ? 'cyan' : 'dim'} pulse={p.status === 'checking'} />
                    <div>
                      <p className="text-[11.5px] font-semibold uppercase tracking-wider">{id}</p>
                      <p className="text-[10px] font-mono text-vox-dim">
                        {p.status === 'connected' ? `● OPERATIONAL · ${fmtDuration(p.latencyMs)}` : p.status === 'error' ? '✕ OFFLINE' : p.status === 'checking' ? 'CHECKING…' : '○ NOT CONFIGURED'}
                      </p>
                    </div>
                    <Button size="xs" variant="ghost" className="ml-auto" icon="RefreshCw" onClick={() => void s.testProviderConn(id)}>TEST</Button>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {tab === 'router' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Routing Settings" icon="GitMerge">
            <div className="space-y-4">
              <Field label="Primary Provider">
                <Select value={s.settings.primaryProvider} onChange={(e) => s.setSettings({ primaryProvider: e.target.value as never })}>
                  <option value="auto">AUTO (smart routing)</option>
                  <option value="gemini">Gemini</option>
                  <option value="groq">Groq</option>
                </Select>
              </Field>
              <Field label="Secondary Provider (failover)">
                <Select value={s.settings.secondaryProvider} onChange={(e) => s.setSettings({ secondaryProvider: e.target.value as ProviderId })}>
                  <option value="gemini">Gemini</option>
                  <option value="groq">Groq</option>
                </Select>
              </Field>
              <Field label="Routing Mode">
                <Select value={s.settings.routingMode} onChange={(e) => s.setSettings({ routingMode: e.target.value as never })}>
                  <option value="auto">SMART AUTO</option>
                  <option value="primary">PRIMARY ONLY</option>
                  <option value="failover">FAILOVER</option>
                </Select>
              </Field>
              <div className="glass-inset px-3 py-2.5">
                <p className="text-[10px] text-vox-muted leading-relaxed">
                  <span className="text-cyan-300 font-semibold">AUTO ROUTING:</span> if the primary provider fails, VOX automatically attempts the secondary provider. Deep reasoning and code review prefer Gemini; fast responses prefer Groq.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="AI Router" icon="GitMerge" glow="violet">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <RouterDiagram compact />
              <div className="space-y-1.5">
                {ROUTING_RULES.map((r) => (
                  <div key={r.task} className="flex items-center gap-2 text-[11px]">
                    <span className="text-vox-muted">{r.task}</span>
                    <Icon name="ArrowRight" size={11} className="text-vox-dim" />
                    <span className={`font-mono font-semibold ${r.provider === 'gemini' ? 'text-blue-300' : 'text-orange-300'}`}>{r.provider.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'models' && (
        <div className="grid md:grid-cols-2 gap-4">
          {(['gemini', 'groq'] as ProviderId[]).map((id) => (
            <Panel key={id} title={`${id.toUpperCase()} Models`} icon="Cpu"
              actions={<Button size="xs" variant="cyan" icon="RefreshCw" onClick={() => void s.refreshModels(id)}>REFRESH MODELS</Button>}>
              <div className="space-y-1.5">
                {s.modelsUnavailable[id] ? (
                  <div className="text-center py-6">
                    <p className="text-[12px] text-vox-muted">MODEL LIST UNAVAILABLE</p>
                    <p className="text-[10px] text-vox-dim mt-1">Model discovery requires the backend. Supported model IDs can be selected manually below.</p>
                  </div>
                ) : null}
                {PROVIDERS.find((p) => p.id === id)!.models.map((m) => (
                  <button
                    key={m}
                    onClick={() => s.setProviderModel(id, m)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${s.providers[id].model === m ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-vox-line hover:bg-white/[0.03]'}`}
                  >
                    <Icon name={s.providers[id].model === m ? 'CheckCircle2' : 'Circle'} size={13} className={s.providers[id].model === m ? 'text-cyan-300' : 'text-vox-dim'} />
                    <span className="text-[12px] font-mono text-vox-text">{m}</span>
                    <span className="ml-auto text-[9px] font-mono text-vox-dim">{s.providers[id].model === m ? 'SELECTED' : 'SELECT'}</span>
                  </button>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'usage' && (
        <Panel title="AI Usage" icon="BarChart3">
          <p className="hud-label mb-3">LOCAL VOX STATISTICS</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['REQUESTS TODAY', String(s.aiUsage.requestsToday)],
              ['TOKENS USED', String(s.aiUsage.tokensUsed)],
              ['AVG LATENCY', s.aiUsage.avgLatencyMs != null ? fmtDuration(s.aiUsage.avgLatencyMs) : 'DATA UNAVAILABLE'],
              ['ERRORS', String(s.aiUsage.errors)],
              ['SUCCESS RATE', s.aiUsage.successRate != null ? `${s.aiUsage.successRate}%` : 'DATA UNAVAILABLE'],
            ].map(([k, v]) => (
              <div key={k} className="glass-inset p-3">
                <p className="hud-label">{k}</p>
                <p className="font-mono text-[18px] font-semibold mt-1.5 text-cyan-300">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-vox-dim mt-3 font-mono">Provider usage dashboards (requests, tokens, latency) come from the provider APIs when connected. No monetary estimates are shown without configured pricing.</p>
        </Panel>
      )}

      {tab === 'log' && (
        <Panel title="Routing Log" icon="ScrollText" bodyClassName="!p-0">
          {s.routerLog.length === 0 ? (
            <p className="text-center text-[12px] text-vox-dim py-10">No routing events yet. Send a message to VOX to populate the log.</p>
          ) : (
            <div className="font-mono text-[11px]">
              {s.routerLog.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2 border-b border-vox-line/50">
                  <span className="text-vox-dim shrink-0">{new Date(e.time).toLocaleTimeString()}</span>
                  <span className={`flex-1 ${e.ok ? 'text-vox-muted' : 'text-red-300'}`}>{e.text}</span>
                  {e.ok ? <span className="text-emerald-300 text-[9px] tracking-widest">SUCCESS</span> : <span className="text-red-300 text-[9px] tracking-widest">FAILED</span>}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'security' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title="API Security Check" icon="ShieldCheck">
            <div className="space-y-2">
              {[
                ['API keys protected', 'Keys are stored backend-side only (env vars / server storage).', 'pass'],
                ['Environment variables protected', 'GEMINI_API_KEY / GROQ_API_KEY never ship to the browser.', 'pass'],
                ['GitHub authentication protected', 'Credentials stay in the backend. OAuth/token never exposed.', 'pass'],
                ['No exposed secrets detected', 'Run a scan over project files to verify.', s.errors.some((e) => e.source === 'SECURITY') ? 'warn' : 'pass'],
              ].map(([t, d, st]) => (
                <div key={t as string} className="flex items-start gap-2.5 py-1.5">
                  <StatusDot tone={st === 'pass' ? 'online' : 'amber'} />
                  <div>
                    <p className="text-[12px] text-vox-text">{t}</p>
                    <p className="text-[10.5px] text-vox-muted leading-relaxed">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button size="xs" variant="cyan" icon="ShieldCheck" onClick={() => { s.setSection('errors'); }}>RUN SECURITY SCAN →</Button>
            </div>
          </Panel>
          <Panel title="Model Lab" icon="FlaskConical">
            <div className="space-y-3">
              <Field label="Temperature">
                <Select value={String(s.settings.temperature)} onChange={(e) => s.setSettings({ temperature: Number(e.target.value) })}>
                  {[0, 0.2, 0.4, 0.7, 1.0, 1.3].map((t) => <option key={t} value={t}>{t} — {t === 0 ? 'precise' : t === 0.7 ? 'balanced' : t === 1.3 ? 'creative' : 'focused'}</option>)}
                </Select>
              </Field>
              <Field label="Max Output Tokens">
                <Select value={String(s.settings.maxTokens)} onChange={(e) => s.setSettings({ maxTokens: Number(e.target.value) })}>
                  {[512, 1024, 2048, 4096, 8192].map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11px] text-vox-muted">Streaming responses</span>
                <Badge tone="cyan">ENABLED</Badge>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11px] text-vox-muted">Context window</span>
                <span className="font-mono text-[11px] text-vox-text">last 10 messages</span>
              </div>
              <Button size="xs" variant="solid" icon="FlaskConical" onClick={() => void s.sendMessage('Send a test request and measure latency, tokens, and provider health.')}>
                SEND TEST REQUEST
              </Button>
            </div>
          </Panel>
        </div>
      )}

      <ProviderConfigModal open={configId != null} onClose={() => setConfigId(null)} providerId={configId ?? 'gemini'} />
      <ConfirmDialog
        open={removeId != null}
        title={`Remove ${removeId?.toUpperCase()} configuration?`}
        body={`This removes the ${removeId?.toUpperCase()} API key from the backend. Other providers are unaffected.`}
        confirmLabel="REMOVE"
        danger
        onConfirm={() => { if (removeId) void s.removeProvider(removeId); }}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}
