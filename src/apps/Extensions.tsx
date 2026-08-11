import { useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import type { Extension } from '../lib/types';
import { Badge, Button, Icon, Panel, Tabs } from '../components/ui';
import { sfx } from '../lib/sounds';

const CATEGORIES = ['ALL', 'AI', 'Themes', 'Developer Tools', 'Git', 'Minecraft', 'Web', 'Automation'];

export function Extensions({ marketplace = false }: { marketplace?: boolean }) {
  const s = useVox();
  const [cat, setCat] = useState('ALL');
  const [mode, setMode] = useState<'installed' | 'market'>('installed');
  const [permsFor, setPermsFor] = useState<Extension | null>(null);

  const list = s.extensions.filter((e) => (marketplace || mode === 'market' ? cat === 'ALL' || e.category === cat : e.installed));

  const toggle = (e: Extension) => {
    if (!e.installed) {
      setPermsFor(e);
      return;
    }
    sfx.command();
    s.toggleExtension(e.id);
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">{marketplace ? 'MARKETPLACE' : 'EXTENSIONS'}</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">{marketplace ? 'Extension Marketplace' : 'Extension Manager'}</h1>
        </div>
        {!marketplace && (
          <Tabs<'installed' | 'market'> tabs={[{ id: 'installed', label: 'Installed' }, { id: 'market', label: 'Marketplace' }]} active={mode} onChange={setMode} className="!border-0" />
        )}
      </div>

      {!marketplace && mode === 'market' && (
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} data-active={cat === c} onClick={() => setCat(c)} className={clsx('px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider border', cat === c ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30' : 'text-vox-dim border-vox-line hover:text-vox-muted')}>{c}</button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((e) => (
          <div key={e.id} className="glass hud-border p-4 flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg border border-violet-400/25 bg-violet-400/10 flex items-center justify-center text-violet-300 shrink-0">
                <Icon name="Puzzle" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[12.5px] font-semibold text-vox-text truncate">{e.name}</h3>
                <p className="text-[9.5px] text-vox-dim">{e.author} · v{e.version}</p>
              </div>
              <Badge tone={e.installed ? (e.enabled ? 'green' : 'dim') : 'violet'}>{e.installed ? (e.enabled ? 'ENABLED' : 'DISABLED') : 'NOT INSTALLED'}</Badge>
            </div>
            <p className="text-[11px] text-vox-muted leading-relaxed flex-1">{e.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-vox-dim uppercase">{e.category} · {e.permissions.join(', ')}</span>
              {e.installed ? (
                <div className="flex gap-1.5">
                  <Button size="xs" variant="ghost" onClick={() => s.toggleExtension(e.id)}>{e.enabled ? 'DISABLE' : 'ENABLE'}</Button>
                  <Button size="xs" variant="danger" onClick={() => { if (confirm(`Remove ${e.name}?`)) s.removeExtension(e.id); }}>REMOVE</Button>
                </div>
              ) : (
                <Button size="xs" variant="cyan" icon="Download" onClick={() => toggle(e)}>INSTALL</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <Panel title="Extensions" icon="Puzzle"><p className="text-center text-[12px] text-vox-dim py-8">No extensions in this category.</p></Panel>
      )}

      {!marketplace && (
        <Panel title="Plugin API" icon="Blocks" bodyClassName="!p-3.5">
          <pre className="font-mono text-[11px] text-vox-muted overflow-auto glass-inset p-3 leading-relaxed">{`VOX.registerPlugin({
  id: 'my-plugin',
  permissions: ['PROJECT', 'AI'],   // requested at install time
  activate(vox) { vox.on('build:complete', () => vox.notify('Build done')); }
});`}</pre>
          <p className="text-[10px] text-vox-dim mt-2 font-mono">Plugins request permissions before installation. Permissions are never silently granted. Arbitrary code is never executed automatically.</p>
        </Panel>
      )}

      {/* permission modal */}
      {permsFor && (
        <div className="vox-overlay flex items-start justify-center pt-[16vh] px-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPermsFor(null); }}>
          <div className="vox-pop glass hud-border w-[440px] p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-lg border border-violet-400/30 bg-violet-400/10 flex items-center justify-center text-violet-300"><Icon name="ShieldCheck" size={16} /></span>
              <div>
                <h3 className="font-display text-[13px] font-bold tracking-[0.12em] uppercase">Plugin Permissions</h3>
                <p className="text-[10.5px] text-vox-muted">{permsFor.name} v{permsFor.version} requests:</p>
              </div>
            </div>
            <div className="space-y-1.5 mb-5">
              {permsFor.permissions.map((p) => (
                <div key={p} className="glass-inset px-3 py-2 flex items-center gap-2.5">
                  <Icon name={p === 'AI' ? 'Sparkles' : p === 'FILES' ? 'FolderTree' : p === 'GITHUB' ? 'GitBranch' : p === 'NETWORK' ? 'Wifi' : 'FolderKanban'} size={13} className="text-amber-400" />
                  <span className="text-[12px] font-mono text-vox-text">{p}</span>
                  <span className="ml-auto text-[9px] text-vox-dim">READ / ACT</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPermsFor(null)}>DENY</Button>
              <Button variant="solid" onClick={() => { s.installExtension(permsFor.id); setPermsFor(null); }}>ALLOW & INSTALL</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
