import { useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import type { ProviderId } from '../lib/types';
import { PROVIDERS } from '../lib/constants';
import { Badge, Button, Field, Icon, Input, Modal, Select, StatusDot } from './ui';
import { fmtDuration } from '../lib/fmt';

// ---------- Provider configuration modal ----------
export function ProviderConfigModal({ open, onClose, providerId }: { open: boolean; onClose: () => void; providerId: ProviderId }) {
  const s = useVox();
  const prov = s.providers[providerId];
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'testing' | 'saving'>('idle');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [model, setModel] = useState(prov.model);

  const test = async () => {
    setBusy('testing');
    setMsg(null);
    if (key.trim()) {
      const res = await s.connectProvider(providerId, key.trim());
      setMsg(res.ok ? { ok: true, text: 'Key accepted by backend. Connection test running…' } : { ok: false, text: res.error ?? 'Failed to save key' });
    } else {
      await s.testProviderConn(providerId);
      const p = useVox.getState().providers[providerId];
      setMsg(p.status === 'connected' ? { ok: true, text: `Connection successful · ${fmtDuration(p.latencyMs)}` } : { ok: false, text: 'Connection failed — check the provider status above.' });
    }
    setBusy('idle');
  };

  const save = async () => {
    if (!key.trim()) return;
    setBusy('saving');
    const res = await s.connectProvider(providerId, key.trim());
    if (res.ok) {
      s.setProviderModel(providerId, model);
      setMsg({ ok: true, text: 'Configuration saved securely (backend-side). Key is never stored in the browser.' });
      setKey('');
      onClose();
    } else {
      setMsg({ ok: false, text: res.error ?? 'Failed to save' });
    }
    setBusy('idle');
  };

  const meta = PROVIDERS.find((p) => p.id === providerId)!;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configure AI Provider"
      subtitle={`${meta.label} · credentials are handled by the VOX backend only`}
      icon="KeyRound"
      width={520}
    >
      <div className="space-y-4">
        <Field label="Provider">
          <div className="flex items-center gap-2 glass-inset px-3 py-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
            <span className="text-[12.5px] font-semibold">{meta.label}</span>
            <span className="ml-auto font-mono text-[10px] text-vox-dim">{meta.envVar}</span>
          </div>
        </Field>
        <Field label="API Key" hint={`Set ${meta.envVar} in server/.env, or paste the key below — it is sent to the backend once and never returned to this page.`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={prov.configured ? '••••••••••••••••••' : `Enter ${meta.envVar}`}
                autoComplete="off"
              />
              <button aria-label={show ? 'Hide key' : 'Show key'} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-vox-dim hover:text-vox-text">
                <Icon name={show ? 'EyeOff' : 'Eye'} size={14} />
              </button>
            </div>
            <Button variant="ghost" onClick={() => setShow(!show)} silent>{show ? 'HIDE' : 'SHOW'}</Button>
          </div>
        </Field>
        <Field label="Model">
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            {meta.models.map((m) => <option key={m} value={m}>{m}</option>)}
            {!meta.models.includes(model) && <option value={model}>{model}</option>}
          </Select>
        </Field>
        <div className="glass-inset px-3 py-2.5 flex items-start gap-2 border-amber-400/20">
          <Icon name="ShieldAlert" size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-vox-muted leading-relaxed">Your API key is sensitive. Never share it publicly. VOX-OS never displays, logs, or sends it to the frontend.</p>
        </div>
        {msg && (
          <p className={clsx('text-[11.5px] font-mono', msg.ok ? 'text-emerald-300' : 'text-red-300')}>{msg.text}</p>
        )}
      </div>
      <div className="mt-5 flex items-center gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>CANCEL</Button>
        <Button variant="cyan" icon="PlugZap" disabled={busy !== 'idle'} onClick={() => void test()}>
          {busy === 'testing' ? 'TESTING CONNECTION…' : 'TEST CONNECTION'}
        </Button>
        <Button variant="solid" icon="Save" disabled={busy !== 'idle' || !key.trim()} onClick={() => void save()}>
          {busy === 'saving' ? 'SAVING…' : 'SAVE'}
        </Button>
      </div>
    </Modal>
  );
}

// ---------- Router pipeline diagram ----------
export function RouterDiagram({ compact }: { compact?: boolean }) {
  const steps = ['REQUEST', 'TASK ANALYZER', 'MODEL ROUTER', 'GEMINI / GROQ', 'VOX RESPONSE'];
  return (
    <div className="flex flex-col items-center gap-1">
      {steps.map((st, i) => (
        <div key={st} className="flex flex-col items-center gap-1 w-full">
          <div className={clsx('glass-inset px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-center', i === 3 ? 'text-violet-300 border-violet-400/25' : i === 0 ? 'text-cyan-300 border-cyan-400/25' : 'text-vox-muted')}>
            {st}
          </div>
          {i < steps.length - 1 && <Icon name="ChevronDown" size={12} className="text-vox-dim" />}
        </div>
      ))}
    </div>
  );
}

// ---------- Provider status card ----------
export function ProviderCard({ id, onConfigure, onRemove, onTest, onModel }: { id: ProviderId; onConfigure: () => void; onRemove: () => void; onTest: () => void; onModel: () => void }) {
  const prov = useVox((s) => s.providers[id]);
  const meta = PROVIDERS.find((p) => p.id === id)!;
  return (
    <div className="glass hud-border p-4">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg border flex items-center justify-center" style={{ borderColor: `${meta.color}44`, background: `${meta.color}11` }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[13px] font-bold tracking-[0.08em]">{meta.label}</h3>
          <p className="text-[10px] font-mono text-vox-dim">{meta.envVar}</p>
        </div>
        <div className="ml-auto">
          {prov.status === 'connected' ? (
            <Badge tone="green"><span className="dot dot-online" /> CONNECTED</Badge>
          ) : prov.status === 'checking' ? (
            <Badge tone="cyan">TESTING…</Badge>
          ) : prov.status === 'error' ? (
            <Badge tone="red">ERROR</Badge>
          ) : (
            <Badge tone="dim">NOT CONFIGURED</Badge>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-[11px]">
        <Row k="Model" v={prov.model} />
        <Row k="API Key" v={prov.configured ? (prov.maskedKey ?? '••••••••••••••••••') : '—'} mono />
        <Row k="Latency" v={prov.latencyMs != null ? fmtDuration(prov.latencyMs) : '—'} />
        <Row k="Last Check" v={prov.lastCheck ? new Date(prov.lastCheck).toLocaleTimeString() : '—'} />
      </div>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {!prov.configured ? (
          <Button size="xs" variant="cyan" icon="KeyRound" onClick={onConfigure}>CONFIGURE</Button>
        ) : (
          <>
            <Button size="xs" icon="KeyRound" onClick={onConfigure}>CHANGE KEY</Button>
            <Button size="xs" icon="Cpu" onClick={onModel}>MODEL</Button>
            <Button size="xs" variant="cyan" icon="PlugZap" onClick={onTest}>TEST</Button>
            <Button size="xs" variant="danger" icon="Trash2" onClick={onRemove}>REMOVE</Button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="hud-label">{k}</span>
      <span className={clsx('text-vox-muted truncate', mono && 'font-mono tracking-widest')}>{v}</span>
    </div>
  );
}
