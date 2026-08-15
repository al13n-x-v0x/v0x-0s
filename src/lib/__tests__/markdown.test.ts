import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
  it('renders headings, bold, italic and paragraphs', () => {
    const html = renderMarkdown('# Title\n\n**bold** and *italic* text');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<p>');
  });

  it('renders fenced code blocks with language', () => {
    const html = renderMarkdown('```js\nconst x = 1;\n```');
    expect(html).toContain('<pre data-lang="js"><code>const x = 1;</code></pre>');
  });

  it('renders lists, links and blockquotes', () => {
    const html = renderMarkdown('- a\n- b\n\n> quote\n\n[repo](https://github.com/al13n-x-v0x/v0x-0s)');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<blockquote>quote</blockquote>');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  });

  it('escapes raw HTML (XSS-safe)', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('does not let javascript: links through', () => {
    const html = renderMarkdown('[x](javascript:alert(1))');
    // the inline link regex only matches https?:// — so no anchor is emitted
    expect(html).not.toContain('href="javascript:');
  });

  it('renders hr and ordered lists', () => {
    const html = renderMarkdown('---\n\n1. one\n2. two');
    expect(html).toContain('<hr />');
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
  });

  it('keeps a closing fence from swallowing the rest of the document', () => {
    const src = '```js\ncode\n```\n\n> still here';
    const html = renderMarkdown(src);
    expect(html).toContain('<blockquote>still here</blockquote>');
  });
});
