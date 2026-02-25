/**
 * Lightweight Markdown to HTML converter
 * Handles basic headers, bold, lists, and line breaks.
 */
export const parseMarkdown = (text: string): string => {
    if (!text) return '';

    // 1. Detect and convert "Hn: " prefixes (with or without Markdown hashes)
    // Case 1: "H2: Title" -> "## Title"
    // Case 2: "## H2: Title" -> "## Title"
    let processed = text
        .replace(/^(?:H([1-6])[:：]\s?)(.*$)/gim, (match, level, content) => {
            return '#'.repeat(parseInt(level)) + ' ' + content;
        })
        .replace(/^(#{1,6})\s+H[1-6][:：]\s?(.*$)/gim, '$1 $2');

    // 2. Identify and temporarily protect HTML table blocks
    const tableBlocks: string[] = [];
    processed = processed.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
        tableBlocks.push(match);
        return `\n\n__TABLE_BLOCK_${tableBlocks.length - 1}__\n\n`;
    });

    let html = processed
        // Encode HTML special characters to prevent XSS (but we will restore tables later)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 3. Headers (H1-H3)
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');

    // 4. Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5. Simple Lists
    // Unordered lists
    html = html.replace(/^\s*[-*]\s+(.*$)/gm, '<ul><li>$1</li></ul>');
    // Combine adjacent <ul><li> tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // 6. Quotations
    html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br/>');

    // 7. 處理 Mermaid 區塊 (特殊標示與即時渲染支援)
    html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
        return `<div class="mermaid-container">
      <div class="mermaid-header">📊 流程結構圖 (Mermaid)</div>
      <div class="mermaid-visual">
        <pre class="mermaid">${code.trim()}</pre>
      </div>
      <details class="mermaid-source">
        <summary>查看代碼</summary>
        <pre class="mermaid-code"><code>${code.trim()}</code></pre>
      </details>
    </div>`;
    });

    // 8. 處理一般代碼塊
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre class="code-block"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // 8. Handle Line Breaks (non-tag paragraphs)
    // Split by double newline for paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';

        // If it already starts with a tag (h1, h2, h3, ul, pre, blockquote, or our placeholder), don't wrap in <p>
        if (/^<(h1|h2|h3|ul|pre|blockquote|__TABLE_BLOCK)/i.test(trimmed)) {
            return trimmed;
        }
        // Replace single newlines with <br/> and wrap in <p>
        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    }).filter(Boolean).join('\n');

    // 9. Restore Table Blocks (and unescape placeholder markers if needed)
    tableBlocks.forEach((table, i) => {
        // We look for the escaped version of our placeholder
        const placeholder = `__TABLE_BLOCK_${i}__`;
        // Since the placeholder doesn't have < or >, it won't be escaped by &lt; or &gt;
        html = html.replace(placeholder, table);
    });

    return html;
};
