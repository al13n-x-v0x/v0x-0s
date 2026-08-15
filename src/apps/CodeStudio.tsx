import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { readFile, writeFile, fileExt, isSecretPath } from '../lib/vfs';
import { Editor } from '../components/Editor';
import { FileTree } from '../components/FileTree';
import { Badge, Button, Icon } from '../components/ui';
import { formatCode } from '../lib/devtools';
import { sfx } from '../lib/sounds';

export function CodeStudio() {
  const s = useVox();
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const tabs = s.codeTabs[s.activeProjectId] ?? [];
  const file = s.activeFile;
  const content = useMemo(() => (active && file ? readFile(active.fs, file.split('/')) : null), [active, file, s.projects]);
  const dirty = file ? !!s.dirty[file] : false;
  const [showTree, setShowTree] = useState(true);

  // when the Desktop Agent's real file access is armed, pull the project's
  // files from ~/VOX-OS/projects/<slug> into the in-memory tree (merge)
  useEffect(() => {
    if (active && s.diskFs.ready) void s.syncProjectFromDisk(active.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.diskFs.ready, active?.id]);

  if (!active) return <div className="p-10 text-center text-vox-dim">No project open.</div>;

  const errs = useMemo(() => {
    const out: { line: number; msg: string }[] = [];
    if (file && active.build.status === 'failed' && active.build.output) {
      const re = new RegExp(`(?:${file.replace(/\./g, '\\.').split('/').pop()}):(\\d+)`);
      const m = active.build.output.match(re);
      if (m) out.push({ line: Number(m[1]), msg: active.build.output.split('\n').find((l) => l.includes('error')) ?? 'build error' });
    }
    return out;
  }, [active.build, file]);

  const save = () => {
    if (file && content != null) {
      s.saveFile(file, content);
      sfx.success();
    }
  };

  const selectFile = (path: string) => s.openFile(path);
  const closeTab = (path: string) => s.closeFile(path);
  const tabName = (path: string) => path.split('/').pop() ?? path;

  return (
    <div className="h-full flex flex-col bg-ink-950/60">
      {/* toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-vox-line shrink-0 flex-wrap">
        <Button size="xs" variant="ghost" icon={showTree ? 'PanelLeftClose' : 'PanelLeft'} onClick={() => setShowTree(!showTree)} silent>{showTree ? 'TREE' : 'TREE'}</Button>
        <div className="w-px h-4 bg-vox-line" />
        <Badge tone="cyan">{active.name}</Badge>
        <Badge tone="dim">{active.language}</Badge>
        {s.diskFs.ready && <Badge tone="green">DISK</Badge>}
        {file && <Badge tone={dirty ? 'amber' : 'green'}>{dirty ? '● UNSAVED' : '✓ SAVED'}</Badge>}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="xs" variant="violet" icon="Sparkles" onClick={() => s.explainWithVox(`Explain the file ${file ?? ''} in ${active.name}. Be concise and technical.`)}>VOX EXPLAIN</Button>
          <Button size="xs" variant="violet" icon="Wrench" onClick={() => s.explainWithVox(`Find and fix the problem in ${file ?? ''}. Show the exact change.`)}>VOX FIX</Button>
          <Button size="xs" icon="Paintbrush" onClick={() => {
            if (content != null) {
              const r = formatCode(content, fileExt(file ?? ''));
              if (r.ok) { s.saveFile(file!, r.out); sfx.success(); }
            }
          }}>FORMAT</Button>
          <Button size="xs" variant="cyan" icon="Save" onClick={save} disabled={!dirty}>SAVE</Button>
          <Button size="xs" variant="ghost" icon="Maximize2" silent onClick={() => s.openApp('code')}>EXPAND</Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* file tree */}
        {showTree && (
          <aside className="w-[230px] shrink-0 border-r border-vox-line overflow-y-auto py-2 bg-ink-900/40">
            <p className="hud-label px-3 pb-1.5">EXPLORER</p>
            <FileTree
              node={active.fs}
              selected={file}
              onSelect={selectFile}
              showSecretGuard
              onContext={(path, x, y) => {
                const isDir = readFile(active.fs, path.split('/')) == null && path !== '';
                s.setContextMenu({
                  x, y,
                  items: [
                    { label: 'Open', icon: 'FolderOpen', run: () => selectFile(path) },
                    { label: 'New File', icon: 'FilePlus2', run: () => { const name = prompt('File name:'); if (name) { s.createNode(path.split('/'), name, 'file', ''); } } },
                    { label: 'New Folder', icon: 'FolderPlus', run: () => { const name = prompt('Folder name:'); if (name) { s.createNode(path.split('/'), name, 'dir'); } } },
                    { label: 'Rename', icon: 'Pencil', run: () => { const nn = prompt('New name:', path.split('/').pop()); if (nn) s.renameNodeOp(path.split('/').slice(0, -1), path.split('/').pop()!, nn); } },
                    { label: 'Delete', icon: 'Trash2', danger: true, run: () => { if (confirm(`Delete ${path}? This cannot be undone.`)) s.deleteNode(path.split('/').slice(0, -1), path.split('/').pop()!); } },
                  ],
                });
              }}
            />
          </aside>
        )}

        {/* editor */}
        <div className="flex-1 min-w-0 flex flex-col">
          {tabs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-vox-dim text-[12px]">Select a file from the explorer to begin.</div>
          ) : (
            <>
              <div className="flex items-stretch border-b border-vox-line bg-ink-900/50 overflow-x-auto no-scrollbar shrink-0">
                {tabs.map((t) => {
                  const isSecret = isSecretPath(t.split('/'));
                  const isActive = t === file;
                  return (
                    <div
                      key={t}
                      data-active={isActive}
                      onClick={() => s.setActiveFile(t)}
                      className={clsx('group flex items-center gap-1.5 px-3 py-2 border-r border-vox-line cursor-pointer text-[11.5px] font-mono whitespace-nowrap', isActive ? 'bg-ink-850 text-cyan-200 border-t-2 border-t-cyan-400' : 'text-vox-dim hover:text-vox-text hover:bg-white/[0.03]')}
                    >
                      <Icon name={isSecret ? 'Lock' : 'FileCode2'} size={11} className={isSecret ? 'text-amber-400/80' : 'text-vox-dim'} />
                      {tabName(t)}
                      {s.dirty[t] && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      <button aria-label={`Close ${t}`} onClick={(e) => { e.stopPropagation(); closeTab(t); }} className="opacity-0 group-hover:opacity-100 hover:text-red-300"><Icon name="X" size={11} /></button>
                    </div>
                  );
                })}
              </div>
              {file && content != null ? (
                <Editor
                  value={content}
                  fileName={file}
                  errors={errs}
                  onSave={save}
                  onChange={(v) => {
                    s.setFileDirty(file, true);
                    // live write into the virtual fs so diffs reflect the buffer
                    s.updateProject(s.activeProjectId, { fs: writeFile(active.fs, file.split('/'), v) });
                  }}
                />
              ) : file && isSecretPath(file.split('/')) ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <Icon name="Lock" size={26} className="text-amber-400 mb-3" />
                  <p className="text-[13px] font-semibold text-vox-text">SECRET FILE GUARDED</p>
                  <p className="text-[11.5px] text-vox-muted mt-1.5 max-w-sm leading-relaxed">
                    {file} may contain credentials. VOX-OS never renders secret values. Open the equivalent <span className="font-mono text-vox-text">.env.example</span> to edit safe templates.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="xs" variant="cyan" onClick={() => s.openFile('.env.example')}>OPEN .env.example</Button>
                    <Button size="xs" variant="ghost" onClick={() => s.closeFile(file)}>CLOSE</Button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* status bar */}
          {file && content != null && (
            <div className="flex items-center gap-3 px-3 py-1 border-t border-vox-line bg-ink-900/60 text-[9.5px] font-mono text-vox-dim shrink-0">
              <span className="text-cyan-300/80">{active.name}</span>
              <span>{file}</span>
              <span className="ml-auto">{fileExt(file) || 'plain'}</span>
              <span>{content.split('\n').length} lines · {content.length} chars</span>
              <span>Ln {content.split('\n').length}, Col {content.split('\n').pop()?.length ?? 0}</span>
              <span className="text-vox-dim">UTF-8</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
