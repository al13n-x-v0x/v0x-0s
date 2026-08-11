import { useState } from 'react';
import { useVox } from '../lib/store';
import type { Project } from '../lib/types';
import { Badge, Button, EmptyState, Field, Icon, Input, Modal, Panel, StatusDot } from '../components/ui';
import { timeAgo, uid } from '../lib/fmt';
import { sfx } from '../lib/sounds';

export function Projects() {
  const s = useVox();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [lang, setLang] = useState('TypeScript');
  const [framework, setFramework] = useState('React');

  const create = () => {
    if (!name.trim()) return;
    const p: Project = {
      id: uid('p'),
      name: name.trim(),
      repo: `AL13N/${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      language: lang,
      framework,
      packageManager: 'npm',
      description: 'Newly created project.',
      fs: { kind: 'dir', name: name.trim(), children: [
        { kind: 'dir', name: 'src', children: [{ kind: 'file', name: 'index.ts', content: `// ${name.trim()}\nexport const hello = 'world';\n` }] },
        { kind: 'file', name: 'package.json', content: JSON.stringify({ name: name.trim().toLowerCase(), version: '0.1.0', scripts: { build: 'vite build', test: 'vitest run', dev: 'vite' } }, null, 2) },
        { kind: 'file', name: 'README.md', content: `# ${name.trim()}\n` },
      ] },
      dependencies: [],
      git: { branch: 'main', ahead: 0, behind: 0, changes: [{ path: 'src/index.ts', state: 'added' }], lastCommit: 'init: project scaffold', clean: false },
      build: { status: 'none' },
      lastModified: Date.now(),
      lastOpened: Date.now(),
      workspace: 'VOX-OS',
      healthScore: 88,
      color: '#22d3ee',
    };
    useVox.setState({ projects: [...useVox.getState().projects, p] });
    setCreateOpen(false);
    setName('');
    s.openProject(p.id);
    s.pushNotification({ category: 'PROJECT', severity: 'success', title: 'PROJECT CREATED', body: `${p.name} scaffolded with ${framework}.` });
    sfx.success();
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">PROJECTS</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">MULTI-PROJECT WORKSPACE</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="cyan" icon="Plus" onClick={() => setCreateOpen(true)}>NEW PROJECT</Button>
          <Button icon="FolderGit2" onClick={() => s.setSection('github')}>CLONE REPOSITORY</Button>
        </div>
      </div>

      {s.projects.length === 0 ? (
        <EmptyState icon="FolderKanban" title="NO PROJECTS" body="Create your first workspace to begin. VOX will index its structure, Git state, and health automatically." action={<Button variant="cyan" onClick={() => setCreateOpen(true)}>CREATE PROJECT</Button>} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {s.projects.map((p) => (
            <ProjectCard key={p.id} p={p} active={p.id === s.activeProjectId} />
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" icon="FolderPlus" width={460}>
        <div className="space-y-3.5">
          <Field label="Project Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-project" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language">
              <select className="vox-input vox-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                {['TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'C#'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Framework">
              <select className="vox-input vox-select" value={framework} onChange={(e) => setFramework(e.target.value)}>
                {['React', 'Node', 'Vite', 'Next.js', 'Python', 'None'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-[10.5px] text-vox-dim">Creates a scaffold with src/, package.json and README.md in the workspace tree.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>CANCEL</Button>
          <Button variant="solid" icon="Plus" disabled={!name.trim()} onClick={create}>CREATE</Button>
        </div>
      </Modal>
    </div>
  );
}

function ProjectCard({ p, active }: { p: Project; active: boolean }) {
  const s = useVox();
  const outdated = p.dependencies.filter((d) => d.version !== d.latest).length;
  const buildOk = p.build.status === 'success';
  return (
    <div className={`glass hud-border p-4 flex flex-col gap-3 ${active ? 'glow-cyan' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0" style={{ borderColor: `${p.color}44`, background: `${p.color}11` }}>
          <Icon name="FolderKanban" size={17} className="text-vox-text" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[14px] font-bold tracking-wide truncate">{p.name}</h3>
            {active && <Badge tone="cyan">ACTIVE</Badge>}
          </div>
          <p className="text-[10px] font-mono text-vox-dim truncate">{p.repo}</p>
          <p className="text-[10px] text-vox-dim mt-0.5">{p.language} · {p.framework} · {p.packageManager}</p>
        </div>
        <span className="font-mono text-[15px] font-semibold shrink-0" style={{ color: p.healthScore ? (p.healthScore >= 90 ? '#34d399' : p.healthScore >= 60 ? '#fbbf24' : '#f87171') : '#64748b' }}>
          {p.healthScore ?? '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
        <div className="glass-inset px-2 py-1.5 flex items-center gap-1.5">
          <StatusDot tone={p.git.clean ? 'online' : 'amber'} />
          <span className="text-vox-muted truncate">git {p.git.branch}</span>
          <span className="ml-auto text-vox-dim">{p.git.changes.length} chg</span>
        </div>
        <div className="glass-inset px-2 py-1.5 flex items-center gap-1.5">
          <StatusDot tone={buildOk ? 'online' : p.build.status === 'failed' ? 'red' : 'dim'} />
          <span className="text-vox-muted">{buildOk ? 'BUILD PASS' : p.build.status === 'failed' ? 'BUILD FAIL' : 'NOT BUILT'}</span>
        </div>
        <div className="glass-inset px-2 py-1.5 col-span-2 flex items-center gap-1.5">
          <Icon name="Boxes" size={11} className="text-vox-dim" />
          <span className="text-vox-muted">{p.dependencies.length} deps</span>
          {outdated > 0 && <Badge tone="amber">{outdated} UPDATE</Badge>}
          <span className="ml-auto text-vox-dim">edited {timeAgo(p.lastModified)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-auto">
        <Button size="xs" variant="cyan" icon="FolderOpen" onClick={() => { s.openProject(p.id); s.setSection('dashboard'); }}>OPEN</Button>
        <Button size="xs" icon="Play" onClick={() => s.pushNotification({ category: 'PROJECT', severity: 'info', title: 'RUN', body: `${p.name}: dev server requires the Desktop Agent to bind a local port.` })}>RUN</Button>
        <Button size="xs" icon="Hammer" onClick={() => void s.buildProject(p.id)}>BUILD</Button>
        <Button size="xs" icon="FlaskConical" onClick={() => void s.testProject(p.id)}>TEST</Button>
        <Button size="xs" variant="violet" icon="Microscope" onClick={() => s.explainWithVox(`Analyze the ${p.name} project and give me an intelligence report: structure, health, risks, and next steps.`)}>ANALYZE</Button>
        <Button size="xs" variant="ghost" icon="Github" onClick={() => s.setSection('github')}>GITHUB</Button>
      </div>
    </div>
  );
}
