import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export function htmlToMarkdown(html) {
  return turndown.turndown(html || '');
}

// marked 默认不转义 raw HTML, 经 DOMPurify 净化后再输出,
// 消除 markdown 内嵌 <script>/onerror 等 XSS (AI 回复等出口走此函数)。
export function markdownToHtml(md) {
  const raw = marked.parse(md || '', { async: false });
  return DOMPurify.sanitize(raw);
}

export function downloadMarkdown(title, html) {
  const md = `# ${title}\n\n${htmlToMarkdown(html)}`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || '未命名'}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readMarkdownFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const lines = text.split('\n');
      let title = file.name.replace(/\.md$/i, '');
      let contentStart = 0;
      if (lines[0]?.startsWith('# ')) {
        title = lines[0].slice(2).trim();
        contentStart = 1;
        while (contentStart < lines.length && lines[contentStart].trim() === '') contentStart++;
      }
      const body = lines.slice(contentStart).join('\n');
      const html = markdownToHtml(body);
      resolve({ title, html });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
