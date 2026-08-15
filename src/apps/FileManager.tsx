import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import type { VNode } from '../lib/types';
import { findNode, fileSize, isSecretPath, fileExt } from '../lib/vfs';
import { agentClient, type DiskEntry } from '../lib/agent';
import { Badge, Button, Icon, Input, Panel } from '../components/ui';
import { Editor } from '../components/Editor';
import { fmtBytes } from '../lib/fmt';
import { sfx } from '../lib/sounds';

export function FileManager() {
  const s = useVox();
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const [path, setPath] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  // ---- disk mode: real files through the Desktop Agent (~/VOX-OS) ----
  const [mode, setMode] = useState<'sandbox' | 'disk'>('sandbox');
  const [diskPath, setDiskPath] = useState<string[]>([]);
  const [diskItems, setDiskItems] = useState<DiskEntry[] | null>(null);
  const [diskError, setDiskError] = useState('');
  const [diskBusy, setDiskBusy] = useState(false);
  const [diskPreview, setDiskPreview] = useState<{ path: string; content: string; saved: boolean } | null>(null);
  const diskReady = s.diskFs.ready && s.agentState.status === 'connected';

  const loadDisk = async (p: string[]) => {
    if (!diskReady) return;
    setDiskBusy(true); setDiskError('');
    try {
      const entries = await agentClient.fsList(p.join('/'));
      setDiskItems(entries); setDiskPreview(null);
    } catch (e) {
      setDiskError(e instanceof Error ? e.message : 'Failed to list files');
    } finally { setDiskBusy(false); }
  };

  useEffect(() => {
    if (mode === 'disk' && !diskReady) setMode('sandbox');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, diskReady]);

  const diskRel = (name: string) => [...diskPath, name].join('/');
  const diskOpen = async (name: string, isDir: boolean) => {
    sfx.command();
    if (isDir) { setDiskPath([...diskPath, name]); void loadDisk([...diskPath, name]); return; }
    try {
      const content = await agentClient.fsRead(diskRel(name));
      setDiskPreview({ path: diskRel(name), content, saved: true });
    } catch (e) { setDiskError(e instanceof Error ? e.message : 'Failed to read file'); }
  };
  const diskWrite = async () => {
    if (!diskPreview) return;
    try {
      await agentClient.fsWrite(diskPreview.path, diskPreview.content);
      const active = s.projects.find((p) => p.id === s.activeProjectId);
      if (active) {
        const slug = active.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
        if (diskPreview.path.startsWith(`projects/${slug}/`)) {
          s.saveFile(diskPreview.path.slice(`projects/${slug}/`.length), diskPreview.content);
        }
      }
      setDiskPreview({ ...diskPreview, saved: true });
      sfx.success();
      s.pushNotification({ category: 'SYSTEM', severity: 'success', title: 'FILE SAVED', body: `${diskPreview.path} written to disk.` });
    } catch (e) { setDiskError(e instanceof Error ? e.message : 'Write failed'); }
  };
  const diskNew = (kind: 'file' | 'dir') => {
    const name = prompt(`${kind === 'dir' ? 'Folder' : 'File'} name:`);
    if (!name) return;
    const full = diskRel(name);
    void (kind === 'dir' ? agentClient.fsMkdir(full) : agentClient.fsWrite(full, ''))
      .then(() => { void loadDisk(diskPath); sfx.success(); })
      .catch((e: Error) => setDiskError(e.message));
  };
  const diskRename = (name: string) => {
    const nn = prompt('New name:', name);
    if (!nn || nn === name) return;
    void agentClient.fsRename(diskRel(name), diskRel(nn))
      .then(() => void loadDisk(diskPath))
      .catch((e: Error) => setDiskError(e.message));
  };
  const diskDelete = (name: string) => {
    if (!confirm(`Delete ${name} from disk? This cannot be undone.`)) return;
    void agentClient.fsDelete(diskRel(name))
      .then(() => void loadDisk(diskPath))
      .catch((e: Error) => setDiskError(e.message));
  };

  const dir = useMemo(() => (active ? (findNode(active.fs, path) ?? active.fs) : null), [active, path, s.projects]);
  const items = useMemo(() => {
    if (!dir || dir.kind !== 'dir') return [];
    let list = dir.children;
    if (q) {
      const walk = (n: VNode, base: string[]): { node: VNode; path: string[] }[] => {
        const out: { node: VNode; path: string[] }[] = [];
        if (n.kind === 'dir') n.children.forEach((c) => out.push(...walk(c, [...base, c.name])));
        else out.push({ node: n, path: base });
        return out;
      };
      list = walk(dir, path).filter((f) => f.node.name.toLowerCase().includes(q.toLowerCase())).map((f) => f.node);
    }
    return [...list].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  }, [dir, q, path]);

  const previewNode = useMemo(() => {
    if (!active || !preview) return null;
    const n = findNode(active.fs, preview.split('/'));
    return n && n.kind === 'file' ? n : null;
  }, [preview, active, s.projects]);

  if (!active) return <div className="p-10 text-center text-vox-dim">Open a project first.</div>;

  const open = (name: string, kind: string) => {
    if (kind === 'dir') setPath([...path, name]);
    else setPreview([...path, name].join('/'));
    sfx.command();
  };

  const isPreviewSecret = preview ? isSecretPath(preview.split('/')) : false;

  return (
    <div className="h-full flex flex-col bg-ink-950/50">
      {/* toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-vox-line shrink-0 flex-wrap">
        <Badge tone="cyan">{active.name}</Badge>
        {/* breadcrumbs */}
        <div className="flex items-center gap-1 font-mono text-[11px] text-vox-muted overflow-x-auto no-scrollbar">
          <button onClick={() => setPath([])} className="hover:text-cyan-300">~</button>
          {path.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              <Icon name="ChevronRight" size={10} className="text-vox-dim" />
              <button onClick={() => setPath(path.slice(0, i + 1))} className="hover:text-cyan-300">{p}</button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-0.5 border border-vox-line rounded-lg overflow-hidden shrink-0">
          <button onClick={() => setMode('sandbox')} className={clsx('px-2.5 py-1 text-[10px] font-mono tracking-wide transition-colors', mode === 'sandbox' ? 'bg-cyan-500/15 text-cyan-300' : 'text-vox-dim hover:text-vox-text')}>SANDBOX</button>
          <button onClick={() => { if (diskReady) { setMode('disk'); void loadDisk([]); } else { s.pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'AGENT FS OFFLINE', body: 'Start the Desktop Agent with FILES access to browse real disk files.' }); } }} className={clsx('px-2.5 py-1 text-[10px] font-mono tracking-wide transition-colors', mode === 'disk' ? 'bg-cyan-500/15 text-cyan-300' : 'text-vox-dim hover:text-vox-text')}>DISK</button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="ghost" icon="ArrowUp" disabled={path.length === 0} onClick={() => setPath(path.slice(0, -1))}>UP</Button>
          <Button size="xs" icon="FolderPlus" onClick={() => { const n = prompt('Folder name:'); if (n) s.createNode(path, n, 'dir'); }}>NEW FOLDER</Button>
          <Button size="xs" icon="FilePlus2" onClick={() => { const n = prompt('File name:'); if (n) s.createNode(path, n, 'file', ''); }}>NEW FILE</Button>
          <div className="relative">
            <Icon name="Search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vox-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" className="!pl-7 !w-44" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {mode === 'disk' ? (
          /* ---- real disk explorer (via Desktop Agent) ---- */
          <div className="flex-1 min-w-0 overflow-y-auto">
            {diskError && <p className="text-[11px] text-red-300 font-mono px-3 py-2">{diskError}</p>}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-vox-line font-mono text-[11px] text-vox-muted flex-wrap">
              <Icon name="HardDrive" size={12} className="text-cyan-300" />
              <span className="text-cyan-200">{s.diskFs.root ?? '~/VOX-OS'}</span>
              {diskPath.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  <Icon name="ChevronRight" size={10} className="text-vox-dim" />
                  <button onClick={() => { const np = diskPath.slice(0, i + 1); setDiskPath(np); void loadDisk(np); }} className="hover:text-cyan-300">{p}</button>
                </span>
              ))}
              <div className="ml-auto flex gap-1 flex-wrap">
                <Button size="xs" variant="ghost" icon="ArrowUp" disabled={diskPath.length === 0} onClick={() => { const np = diskPath.slice(0, -1); setDiskPath(np); void loadDisk(np); }}>UP</Button>
                <Button size="xs" icon="FolderPlus" onClick={() => diskNew('dir')} disabled={diskBusy}>NEW FOLDER</Button>
                <Button size="xs" icon="FilePlus2" onClick={() => diskNew('file')} disabled={diskBusy}>NEW FILE</Button>
              </div>
            </div>
            <table className="vox-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="w-28">Modified</th>
                  <th className="w-20">Size</th>
                </tr>
              </thead>
              <tbody>
                {!diskItems && <tr><td colSpan={3} className="text-[11px] text-vox-dim">{diskBusy ? 'LISTING…' : 'OPENING…'}</td></tr>}
                {(diskItems ?? []).map((it) => (
                  <tr key={it.name} data-clickable onClick={() => void diskOpen(it.name, it.isDir)} onContextMenu={(e) => {
                    e.preventDefault();
                    s.setContextMenu({
                      x: e.clientX, y: e.clientY,
                      items: [
                        { label: it.isDir ? 'Open' : 'View', icon: 'FolderOpen', run: () => void diskOpen(it.name, it.isDir) },
                        { label: 'Rename', icon: 'Pencil', run: () => diskRename(it.name) },
                        { label: 'Delete', icon: 'Trash2', danger: true, run: () => diskDelete(it.name) },
                      ],
                    });
                  }}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon name={it.isDir ? 'Folder' : 'File'} size={13} className={it.isDir ? 'text-cyan-400/80' : 'text-vox-dim'} />
                        <span className="text-[12px]">{it.name}</span>
                      </div>
                    </td>
                    <td className="text-[11px] text-vox-dim">{it.mtime ? new Date(it.mtime).toLocaleDateString() : '—'}</td>
                    <td className="font-mono text-[11px] text-vox-dim">{it.isDir ? '—' : fmtBytes(it.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        /* file list */
        <div className="flex-1 min-w-0 overflow-y-auto">
          <table className="vox-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="w-28">Modified</th>
                <th className="w-20">Size</th>
                <th className="w-24">Type</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const isSecret = it.kind === 'file' && isSecretPath([...path, it.name]);
                return (
                  <tr key={it.name + i} data-clickable onClick={() => open(it.name, it.kind)} onContextMenu={(e) => {
                    e.preventDefault();
                    s.setContextMenu({
                      x: e.clientX, y: e.clientY,
                      items: [
                        { label: 'Open', icon: 'FolderOpen', run: () => open(it.name, it.kind) },
                        { label: 'Open in Code Studio', icon: 'Code2', run: () => { s.openFile([...path, it.name].join('/')); s.openApp('code'); } },
                        { label: 'Rename', icon: 'Pencil', run: () => { const nn = prompt('New name:', it.name); if (nn) s.renameNodeOp(path, it.name, nn); } },
                        { label: 'Delete', icon: 'Trash2', danger: true, run: () => { if (confirm(`Delete ${it.name}? This cannot be undone.`)) s.deleteNode(path, it.name); } },
                        { label: 'Properties', icon: 'Info', run: () => s.pushNotification({ category: 'SYSTEM', severity: 'info', title: 'FILE PROPERTIES', body: `${it.name} · ${it.kind === 'dir' ? 'folder' : fmtBytes(fileSize(it.kind === 'file' ? it.content : ''))} · data from workspace metadata` }) },
                      ],
                    });
                  }}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon name={it.kind === 'dir' ? 'Folder' : isSecret ? 'Lock' : it.kind === 'file' && fileExt(it.name) === 'json' ? 'Braces' : 'File'} size={13} className={it.kind === 'dir' ? 'text-cyan-400/80' : isSecret ? 'text-amber-400/80' : 'text-vox-dim'} />
                        <span className="text-[12px]">{it.name}</span>
                        {isSecret && <Badge tone="amber">GUARDED</Badge>}
                      </div>
                    </td>
                    <td className="text-[11px] text-vox-dim">{active.lastModified ? new Date(active.lastModified).toLocaleDateString() : '—'}</td>
                    <td className="font-mono text-[11px] text-vox-dim">{it.kind === 'dir' ? '—' : fmtBytes(fileSize(it.content))}</td>
                    <td className="text-[11px] text-vox-dim uppercase">{it.kind === 'dir' ? 'Folder' : fileExt(it.name) || 'file'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* preview */}
        {mode === 'sandbox' && preview && (
          <div className="w-[46%] min-w-[320px] border-l border-vox-line flex flex-col bg-ink-950/70">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-vox-line">
              <Icon name={isPreviewSecret ? 'Lock' : 'FileCode2'} size={12} className={isPreviewSecret ? 'text-amber-400' : 'text-vox-dim'} />
              <span className="font-mono text-[11px] text-vox-text truncate">{preview}</span>
              {isPreviewSecret && <Badge tone="amber">SECRET GUARDED</Badge>}
              <div className="ml-auto flex gap-1">
                {previewNode && !isPreviewSecret && (
                  <>
                    <Button size="xs" variant="violet" silent icon="Sparkles" onClick={() => s.explainWithVox(`Explain this file: ${preview}`)}>EXPLAIN</Button>
                    <Button size="xs" variant="cyan" silent icon="ExternalLink" onClick={() => { s.openFile(preview); s.openApp('code'); }}>OPEN IN STUDIO</Button>
                  </>
                )}
                <Button size="xs" variant="ghost" silent icon="X" onClick={() => setPreview(null)}>CLOSE</Button>
              </div>
            </div>
            {isPreviewSecret ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <Icon name="Lock" size={24} className="text-amber-400 mb-2" />
                <p className="text-[12px] text-vox-muted">Secret values are never displayed.</p>
              </div>
            ) : previewNode ? (
              <Editor value={previewNode.content} fileName={preview} readOnly onChange={() => undefined} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-vox-dim text-[12px]">Preview unavailable</div>
            )}
          </div>
        )}

        {/* disk preview (editable, writes to real disk via agent) */}
        {mode === 'disk' && diskPreview && (
          <div className="w-[46%] min-w-[320px] border-l border-vox-line flex flex-col bg-ink-950/70">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-vox-line">
              <Icon name="FileCode2" size={12} className="text-vox-dim" />
              <span className="font-mono text-[11px] text-vox-text truncate">{diskPreview.path}</span>
              <Badge tone="green">DISK</Badge>
              <div className="ml-auto flex gap-1">
                <Button size="xs" variant="cyan" silent icon="Save" onClick={() => void diskWrite()} disabled={diskPreview.saved}>SAVE</Button>
                <Button size="xs" variant="ghost" silent icon="X" onClick={() => setDiskPreview(null)}>CLOSE</Button>
              </div>
            </div>
            <Editor value={diskPreview.content} fileName={diskPreview.path.split('/').pop() ?? ''} onChange={(v) => setDiskPreview({ ...diskPreview, content: v, saved: false })} onSave={() => void diskWrite()} />
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-vox-line text-[9.5px] font-mono text-vox-dim flex items-center gap-3 shrink-0">
        <span>{mode === 'disk' ? `${diskItems?.length ?? 0} item(s) · real disk` : `${items.length} item(s)`}</span>
        <span className="ml-auto">{mode === 'disk' ? (diskReady ? `agent FS armed → ${s.diskFs.root}` : 'agent FS offline') : 'virtual workspace tree · sandboxed'}</span>
      </div>
    </div>
  );
}
