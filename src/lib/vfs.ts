import type { VNode } from './types';

// Virtual file system helpers (in-memory workspace tree)

export function findNode(node: VNode, path: string[]): VNode | null {
  if (path.length === 0) return node;
  if (node.kind !== 'dir') return null;
  const [head, ...rest] = path;
  const child = node.children.find((c) => c.name === head);
  return child ? findNode(child, rest) : null;
}

export function listDir(node: VNode, path: string[]): VNode[] {
  const dir = findNode(node, path);
  return dir && dir.kind === 'dir' ? dir.children : [];
}

export function readFile(node: VNode, path: string[]): string | null {
  const f = findNode(node, path);
  return f && f.kind === 'file' ? f.content : null;
}

export function writeFile(node: VNode, path: string[], content: string): VNode {
  if (path.length === 0 || node.kind !== 'dir') return node;
  const dir = node as Extract<VNode, { kind: 'dir' }>;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    // leaf: create or overwrite the file
    const children = [...dir.children];
    const idx = children.findIndex((c) => c.name === head);
    if (idx === -1) children.push({ kind: 'file', name: head, content });
    else children[idx] = { kind: 'file', name: head, content };
    return { ...dir, children };
  }
  // intermediate dirs are created on the way down
  const idx = dir.children.findIndex((c) => c.name === head);
  if (idx === -1) {
    const created = writeFile({ kind: 'dir', name: head, children: [] }, rest, content);
    return { ...dir, children: [...dir.children, created] };
  }
  const children = [...dir.children];
  children[idx] = writeFile(dir.children[idx], rest, content);
  return { ...dir, children };
}

type DirNode = Extract<VNode, { kind: 'dir' }>;

export function addNode(node: VNode, path: string[], name: string, kind: 'file' | 'dir', content = ''): VNode {
  const root = node as DirNode;
  const dir = path.length === 0 ? root : findNode(node, path);
  if (!dir || dir.kind !== 'dir') return node;
  if (dir.children.some((c) => c.name === name)) return node;
  const newChild: VNode = kind === 'dir' ? { kind: 'dir', name, children: [] } : { kind: 'file', name, content };
  if (path.length === 0) {
    return { ...root, children: [...root.children, newChild] };
  }
  return mapAt(node, path, (d) => ({ ...d, children: [...d.children, newChild] }));
}

export function removeNode(node: VNode, path: string[], name: string): VNode {
  return mapAt(node, path, (d) => ({ ...d, children: d.children.filter((c) => c.name !== name) }));
}

export function renameNode(node: VNode, path: string[], oldName: string, newName: string): VNode {
  return mapAt(node, path, (d) => ({
    ...d,
    children: d.children.map((c) => (c.name === oldName ? { ...c, name: newName } : c)),
  }));
}

function mapAt(node: VNode, path: string[], fn: (d: Extract<VNode, { kind: 'dir' }>) => VNode): VNode {
  if (path.length === 0) return fn(node as Extract<VNode, { kind: 'dir' }>);
  if (node.kind !== 'dir') return node;
  const [head, ...rest] = path;
  const idx = node.children.findIndex((c) => c.name === head);
  if (idx === -1) return node;
  const children = [...node.children];
  children[idx] = mapAt(children[idx], rest, fn);
  return { ...node, children };
}

export function walk(node: VNode, base: string[] = []): { path: string[]; node: VNode }[] {
  const out: { path: string[]; node: VNode }[] = [{ path: base, node }];
  if (node.kind === 'dir') {
    for (const child of node.children) out.push(...walk(child, [...base, child.name]));
  }
  return out;
}

export function countFiles(node: VNode): number {
  if (node.kind === 'file') return 1;
  return node.children.reduce((acc, c) => acc + countFiles(c), 0);
}

export function isSecretPath(path: string[]): boolean {
  return path.some((p) => /^\.env/.test(p) || /secret|credential|token|api[-_]?key/i.test(p));
}

// file size estimate
export function fileSize(content: string): number {
  return new Blob([content]).size;
}

export function fileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}
