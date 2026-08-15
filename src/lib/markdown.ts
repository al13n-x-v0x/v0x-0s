// ============================================================
// Tiny markdown renderer — zero dependencies, XSS-safe.
// HTML is escaped BEFORE any markdown transform, so user text
// can never inject markup. Covers the common cases: headings,
// code fences, inline code, bold/italic, links, lists, hr,
// blockquotes, and paragraph breaks.
// ============================================================

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  let t = esc(text);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return t;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  const blockquote = (line: string): string => (line.trim().startsWith('>') ? `<blockquote>${inline(line.trim().replace(/^>\s?/, ''))}</blockquote>` : '');

  while (i < lines.length) {
    const line = lines[i];

    // fenced code blocks
    if (/^```/.test(line.trim())) {
      const lang = line.trim().replace(/^```/, '').trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(esc(lines[i])); i++; }
      i++; // closing fence
      out.push(`<pre${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${buf.join('\n')}</code></pre>`);
      continue;
    }

    // headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }

    // hr
    if (/^\s*([-*_])\s*\1\s*\1\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

    // blockquote
    if (line.trim().startsWith('>')) { out.push(blockquote(line)); i++; continue; }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`); i++; }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i++; }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // blank → paragraph break
    if (!line.trim()) { i++; continue; }

    // paragraph (collect consecutive non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i].trim()) &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])\s*\1\s*\1\s*$/.test(lines[i]) &&
      !lines[i].trim().startsWith('>')
    ) { buf.push(inline(lines[i])); i++; }
    out.push(`<p>${buf.join('<br />')}</p>`);
  }

  return out.join('\n');
}
