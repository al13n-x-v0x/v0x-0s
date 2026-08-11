import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

// Prism doesn't ship a TS type for languages; cast.
const grammars = Prism.languages as Record<string, unknown>;

export function highlight(code: string, lang: string): string {
  const grammar = grammars[lang];
  if (!grammar) {
    return escapeHtml(code);
  }
  try {
    return Prism.highlight(code, grammar as Prism.Grammar, lang);
  } catch {
    return escapeHtml(code);
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function langForFile(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
    py: 'python', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
    cs: 'csharp', html: 'markup', htm: 'markup', vue: 'markup', css: 'css', scss: 'css',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown', markdown: 'markdown',
    sh: 'bash', bash: 'bash', zsh: 'bash',
  };
  return map[ext] ?? 'plain';
}
