import { useState } from 'react';
import { useVox } from '../lib/store';
import type { AutomationRule } from '../lib/types';
import { Badge, Button, Field, Icon, Input, Modal, Panel, Toggle } from '../components/ui';
import { timeAgo, uid } from '../lib/fmt';

export function Automation() {
  const s = useVox();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('On project open');
  const [action, setAction] = useState('Run health scan');

  const add = () => {
    if (!name.trim()) return;
    const rule: AutomationRule = { id: uid('auto'), name: name.trim(), trigger, action, enabled: true };
    useVox.setState({ automation: [...useVox.getState().automation, rule] });
    setOpen(false); setName('');
    s.logEvent('SYSTEM', `Automation rule created: ${rule.name}`, 'info');
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">AUTOMATION</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">WORKFLOW RULES</h1>
        </div>
        <Button variant="cyan" icon="Plus" onClick={() => setOpen(true)}>NEW RULE</Button>
      </div>

      <Panel title="Active Rules" icon="Workflow" bodyClassName="!p-0">
        {s.automation.length === 0 ? (
          <p className="text-center text-[12px] text-vox-dim py-10">No rules yet. Create one to automate scans, syncs, or builds.</p>
        ) : (
          <div className="divide-y divide-vox-line/50">
            {s.automation.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center border ${r.enabled ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/5 text-vox-dim'}`}>
                  <Icon name="Zap" size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-vox-text">{r.name}</span>
                    <Badge tone={r.enabled ? 'green' : 'dim'}>{r.enabled ? 'ENABLED' : 'DISABLED'}</Badge>
                  </div>
                  <p className="text-[10.5px] text-vox-muted font-mono mt-0.5">{r.trigger} → {r.action}{r.lastRun ? ` · ran ${timeAgo(r.lastRun)}` : ''}</p>
                </div>
                <Button size="xs" variant="cyan" icon="Play" onClick={() => s.runAutomation(r.id)}>RUN</Button>
                <Toggle checked={r.enabled} onChange={() => s.toggleAutomation(r.id)} label={`Toggle ${r.name}`} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Automation notes" icon="Info" bodyClassName="!p-3.5">
        <p className="text-[11.5px] text-vox-muted leading-relaxed">
          Automation rules execute real VOX actions (health scans, GitHub syncs, builds, diagnostics). Long-running tasks never block the UI. Scheduled triggers currently fire on demand — timer-based scheduling can be enabled in the Desktop Agent.
        </p>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="New Automation Rule" icon="Workflow" width={460}>
        <div className="space-y-3.5">
          <Field label="Rule Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scan on boot" autoFocus /></Field>
          <Field label="Trigger">
            <select className="vox-input vox-select" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {['Every day at 09:00', 'On project open', 'On file saved', 'Weekly Monday 08:00', 'On startup'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Action">
            <select className="vox-input vox-select" value={action} onChange={(e) => setAction(e.target.value)}>
              {['Run health scan', 'Sync GitHub repositories', 'Run build', 'Run diagnostics', 'Open terminal', 'Create backup'].map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>CANCEL</Button>
          <Button variant="solid" disabled={!name.trim()} onClick={add}>CREATE</Button>
        </div>
      </Modal>
    </div>
  );
}
