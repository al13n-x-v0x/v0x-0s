import { describe, expect, it } from 'vitest';
import { addNode, countFiles, findNode, listDir, readFile, removeNode, renameNode, walk, writeFile } from '../vfs';
import type { VNode } from '../types';

const empty: VNode = { kind: 'dir', name: 'root', children: [] };

describe('vfs', () => {
  it('writes and reads files through paths', () => {
    let fs = writeFile(empty, ['src', 'main.ts'], 'console.log(1)');
    expect(readFile(fs, ['src', 'main.ts'])).toBe('console.log(1)');
    expect(findNode(fs, ['src'])).toMatchObject({ kind: 'dir', name: 'src' });
    expect(findNode(fs, ['nope'])).toBeNull();
  });

  it('adds dirs and files', () => {
    let fs = addNode(empty, [], 'src', 'dir');
    fs = addNode(fs, ['src'], 'index.ts', 'file', 'x');
    expect(listDir(fs, ['src']).map((c) => c.name)).toEqual(['index.ts']);
    expect(countFiles(fs)).toBe(1);
  });

  it('removes and renames', () => {
    let fs = addNode(empty, [], 'a.txt', 'file', '');
    fs = addNode(fs, [], 'b.txt', 'file', '');
    fs = removeNode(fs, [], 'a.txt');
    expect(listDir(fs, []).map((c) => c.name)).toEqual(['b.txt']);
    fs = renameNode(fs, [], 'b.txt', 'c.txt');
    expect(findNode(fs, ['c.txt'])).not.toBeNull();
    expect(findNode(fs, ['b.txt'])).toBeNull();
  });

  it('walk visits every node with paths', () => {
    let fs = addNode(empty, [], 'src', 'dir');
    fs = addNode(fs, ['src'], 'a.ts', 'file', '');
    fs = addNode(fs, [], 'README.md', 'file', '');
    const entries = walk(fs);
    const paths = entries.map((e) => e.path.join('/'));
    expect(paths).toContain('src');
    expect(paths).toContain('src/a.ts');
    expect(paths).toContain('README.md');
  });
});
