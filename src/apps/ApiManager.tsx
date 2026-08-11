import { useState } from 'react';
import { useVox } from '../lib/store';
import type { ProviderId } from '../lib/types';
import { Badge, Button, Icon, Panel, StatusDot } from '../components/ui';
import { ProviderCard, ProviderConfigModal } from '../components/ai';
import { scanForSecrets } from '../lib/secrets';
import { walk, isSecretPath } from '../lib/vfs';

export function ApiManager() {
  const s = useVox();
  const [configId, setConfigId] = useState<ProviderId | null>(null);
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const findings = active ? scanForSecrets(active.fs) : [];

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div>
        <p className="hud-label mb-1.5">API MANAGER</p>
        <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">SECURE API CENTER</h1>
        <p className="text-[11.5px] text-vox-muted mt-1">Credentials live in the VOX backend. The frontend never sees a complete key.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ProviderCard id="gemini" onConfigure={() => setConfigId('gemini')} onRemove={() => void s.removeProvider('gemini')} onTest={() => void s.testProviderConn('gemini')} onModel={() => void s.refreshModels('gemini')} />
        <ProviderCard id="groq" onConfigure={() => setConfigId('groq')} onRemove={() => void s.removeProvider('groq')} onTest={() => void s.testProviderConn('groq')} onModel={() => void s.refreshModels('groq')} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Security Model" icon="ShieldCheck" glow="violet">
          <div className="space-y-2.5">
            {[
              ['Backend-only key storage', 'GEMINI_API_KEY and GROQ_API_KEY are read from server/.env or set via the backend API. Never from the browser.'],
              ['No keys in frontend', 'Keys are never embedded in React, HTML, client JS, or public files.'],
              ['No keys in logs or errors', 'Errors surface categories (INVALID API KEY, RATE LIMITED, NETWORK ERROR) — never the key.'],
              ['Reveal/hide + masking', 'Saved keys render as a short safe prefix only, e.g. AIza•••••••••••••••••• or gsk_••••••••••••••••••.'],
              ['Rotation support', 'Replace a key only after a successful test of the new value.'],
            ].map(([t, d]) => (
              <div key={t as string} className="flex items-start gap-2.5">
                <Icon name="CheckCircle2" size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-vox-text">{t}</p>
                  <p className="text-[10.5px] text-vox-muted leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Secret Detector" icon="SearchCheck" actions={<Badge tone={findings.length ? 'amber' : 'green'}>{findings.length ? `${findings.length} FINDING(S)` : 'CLEAN'}</Badge>}>
          {active ? (
            findings.length === 0 ? (
              <div className="text-center py-6">
                <Icon name="ShieldCheck" size={22} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-[12px] text-vox-text">No obvious secret patterns detected</p>
                <p className="text-[10.5px] text-vox-muted mt-1">Scanned {walk(active.fs).filter((f) => f.node.kind === 'file').length} files in {active.name}. Detection is pattern-based, not a full security audit.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                {findings.map((f, i) => (
                  <div key={i} className="glass-inset px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusDot tone="amber" />
                      <span className="font-mono text-[11px] text-vox-text truncate">{f.path.join('/')}</span>
                      <span className="ml-auto font-mono text-[9px] text-vox-dim">L{f.line}</span>
                    </div>
                    <p className="text-[10px] text-amber-300/90 mt-1 font-mono">{f.type} — value hidden</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button size="xs" variant="ghost" onClick={() => s.openFile(f.path.join('/'))}>OPEN FILE</Button>
                      <Button size="xs" variant="ghost" onClick={() => s.addError({ source: 'SECURITY', message: `Marked resolved: ${f.path.join('/')}:${f.line}`, detail: f.type, severity: 'warning' })}>IGNORE</Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-[12px] text-vox-dim text-center py-6">Open a project to scan it.</p>
          )}
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">Never displays secret values. IGNORE / REMOVE actions only affect local findings.</p>
        </Panel>
      </div>

      <Panel title="Architecture" icon="GitMerge" bodyClassName="!p-4">
        <div className="grid md:grid-cols-5 gap-2 items-center text-center font-mono text-[10px]">
          {['VOX FRONTEND', 'VOX AI API', 'AI ROUTER', 'PROVIDER ADAPTERS', 'VOX RESPONSE'].map((st, i) => (
            <div key={st} className="flex md:flex-col items-center gap-2">
              <div className="glass-inset px-2 py-1.5 text-vox-muted flex-1">{st}</div>
              {i < 4 && <Icon name="ArrowRight" size={12} className="text-vox-dim rotate-90 md:rotate-0" />}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-vox-dim mt-3 font-mono">Adapter architecture — OpenAI, Anthropic, Mistral, OpenRouter, and local models can be added without rewriting the router.</p>
      </Panel>

      <ProviderConfigModal open={configId != null} onClose={() => setConfigId(null)} providerId={configId ?? 'gemini'} />
    </div>
  );
}
