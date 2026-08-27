// HTML 文件导入工具
// HTML 笔记原样存储 (type='html'), 预览/查看时通过 iframe sandbox 隔离渲染,
// 不在此处净化 —— 隔离由 iframe 的 sandbox 属性保证:
//   开启 allow-scripts (让原文档自带的目录跳转/交互脚本可运行, 保持原汁原味),
//   但不开 allow-same-origin —— iframe 仍是独立 opaque origin,
//   无法访问父页 cookie / localStorage / 接口, 安全边界保留。

// 纯文本转义: txt 预览时防止内容里的 <>& 被浏览器当标签解析
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 读取 .html / .htm 文件, 提取标题与原始 HTML
export function readHtmlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || '');
      let title = file.name.replace(/\.html?$/i, '');
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const t = doc.querySelector('title')?.textContent?.trim();
        if (t) title = t;
      } catch {
        // 解析失败则回退到文件名
      }
      resolve({ title, html });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function isHtmlFile(file) {
  return /\.html?$/i.test(file.name);
}

// 锚点兜底脚本: 在 srcdoc iframe 里, 目录类 "#xx" 链接的默认跳转常失效
// (srcdoc 的 base 不是真实 URL)。这段脚本拦截站内锚点点击, 用 scrollIntoView
// 平滑滚动到目标。原文档若自带目录脚本也能正常运行 (sandbox 已开 allow-scripts),
// 二者落点一致、互不冲突。无目录的文档不受影响, 原样按其自身布局渲染。
// 注意: 所有注入到预览文档里的节点都带 data-injected="1" 标记,
// 编辑保存时统一剔除, 保证存回库的是干净原文, 不会每次叠一层。
const ANCHOR_SCRIPT = `<script data-injected="1">
(function(){
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var raw = a.getAttribute('href') || '';
    var id = decodeURIComponent(raw.slice(1));
    if (!id) return;
    var el = document.getElementById(id) ||
             document.querySelector('a[name="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }, true);
})();
<\/script>`;

// 滚动条样式: 视觉上隐藏右侧/内部滚动条, 但滚动功能 (滚轮/拖拽/触控/键盘) 全保留。
// 仅作用于预览/查看的 iframe 内, 不影响原文档导出后的样子。
const SCROLLBAR_STYLE = `<style data-injected="1">
  html { scrollbar-width: none; -ms-overflow-style: none; }
  html::-webkit-scrollbar { width: 0; height: 0; }
  *::-webkit-scrollbar { width: 0; height: 0; }
  * { scrollbar-width: none; }
</style>`;

// 编辑桥脚本 (路 B): 常驻但休眠, 只在收到父页 postMessage 指令时动作。
// iframe 是独立 opaque origin (无 allow-same-origin), 父页读不到内部 DOM,
// 故用 postMessage 跨墙取回改动 —— 安全边界不动。
//   kb-edit-enter : body 挂 contenteditable, 进入可改状态
//   kb-edit-cancel: 撤掉 contenteditable (父页随后重载 srcdoc 丢弃改动)
//   kb-edit-save  : 克隆文档 -> 剔除所有注入物 + contenteditable -> 序列化 -> 回传父页
const EDIT_SCRIPT = `<script data-injected="1">
(function(){
  function clean(root){
    root.querySelectorAll('[data-injected]').forEach(function(n){ n.remove(); });
    root.querySelectorAll('[contenteditable]').forEach(function(n){ n.removeAttribute('contenteditable'); });
    root.querySelectorAll('[data-kb-editing]').forEach(function(n){ n.removeAttribute('data-kb-editing'); });
    // 清掉自适配脚本可能写在 <html> 上的 zoom, 不让它混进存回库的原文
    try { root.style && root.style.removeProperty && root.style.removeProperty('zoom'); } catch(_){}
    return root;
  }
  window.addEventListener('message', function(e){
    var msg = e.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'kb-edit-enter') {
      document.body.setAttribute('contenteditable', 'true');
      document.body.setAttribute('data-kb-editing', '1');
      try { document.body.focus(); } catch(_){}
    } else if (msg.type === 'kb-edit-cancel') {
      document.body.removeAttribute('contenteditable');
      document.body.removeAttribute('data-kb-editing');
    } else if (msg.type === 'kb-edit-save') {
      var clone = document.documentElement.cloneNode(true);
      clean(clone);
      var html = '<!DOCTYPE html>\\n' + clone.outerHTML;
      (e.source || parent).postMessage({ type: 'kb-edit-content', html: html }, '*');
    }
  });
})();
<\/script>`;

// 自适配脚本 (仅快速预览注入): 两向联动, 优先加宽窗口保住字号, 窗口到顶才横向滚。
//   1. 量内容天然宽度 w, 通过 postMessage 报给父页 —— 父页据"zoom 下限 0.9"按需加宽预览窗口。
//   2. 当前窗口下先做 zoom 兜底缩放 (超宽则缩, 但不低于 0.9 —— 钉住下限保字号);
//      父页加宽后 resize 再触发本函数, vw 变大, zoom 回升到 1。窗口到 92vw 仍塞不下时,
//      zoom 停在 0.9, 多出来的宽度走横向滚动, 不再继续缩字。
// zoom 写在 <html> 上, 编辑保存时 clean() 会剔除, 不污染存回库的原文。
// 监听 load/resize, 并补两拍 setTimeout 兜底动态内容 (图片/字体/脚本撑开后再量一次)。
const FIT_SCRIPT = `<script data-injected="1">
(function(){
  var lastSent = -1;
  function fit(){
    try {
      var el = document.documentElement;
      el.style.zoom = '';
      var vw = el.clientWidth || window.innerWidth || 0;
      if (!vw) return;
      var w = Math.max(
        document.body ? document.body.scrollWidth : 0,
        el.scrollWidth || 0
      );
      // 上报内容天然宽度给父页 (加 24px 容差去抖, 滤掉图片/字体加载引起的亚像素微变,
      // 避免父页反复微调窗口宽 —— 这是"逐步加大+停顿感"的根源之一)。
      if (Math.abs(w - lastSent) > 24) {
        lastSent = w;
        try { parent.postMessage({ type: 'kb-fit-natural', width: w }, '*'); } catch(_){}
      }
      // 缩放: zoom 下限钉 0.9, 保住字号。
      //   z≥1  内容放得下, 不缩;
      //   0.9≤z<1  缩到刚好放下;
      //   z<0.9  (窗口已到顶仍塞不下) 钉在 0.9, 内容横向滚动, 不再缩字。
      var z = vw / w;
      if (z >= 1) {
        el.style.zoom = '';
      } else {
        el.style.zoom = (z < 0.9 ? 0.9 : z).toFixed(4);
      }
    } catch(_){}
  }
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  if (document.readyState !== 'loading') fit();
  else document.addEventListener('DOMContentLoaded', fit);
  setTimeout(fit, 120);
  setTimeout(fit, 400);
})();
<\/script>`;

// 把注入物 (滚动条样式 + 锚点脚本 + 编辑桥脚本 + 可选自适配脚本) 注入文档:
// 优先放在 </body> 前, 否则追加到末尾。fit 仅在快速预览开启。
function injectAnchorScript(doc, fit) {
  const inject = SCROLLBAR_STYLE + ANCHOR_SCRIPT + EDIT_SCRIPT + (fit ? FIT_SCRIPT : '');
  const idx = doc.toLowerCase().lastIndexOf('</body>');
  if (idx !== -1) return doc.slice(0, idx) + inject + doc.slice(idx);
  return doc + inject;
}

// 包一层基础样式外壳, 让 rich 片段导出后是一个可独立打开的完整 HTML 文档。
function wrapRichDoc(content, title) {
  const safeTitle = String(title || '无标题')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
         line-height: 1.7; color: #2c2c2c; max-width: 800px; margin: 40px auto;
         padding: 0 20px; word-wrap: break-word; }
  img { max-width: 100%; height: auto; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { background: #f0f0f0; padding: 2px 5px; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ddd; padding: 6px 10px; }
  blockquote { border-left: 3px solid #ddd; margin: 0; padding-left: 14px; color: #666; }
  a { color: #3b6cff; }
</style></head><body>${content || '<p>暂无内容</p>'}</body></html>`;
}

// 导出笔记为 .html 文件。
// - html 类型: 原样导出原始 HTML 文档 (不含预览注入的脚本/样式)。
// - rich 类型: 把 Tiptap 片段包成完整文档再导出。
// title 用作文件名。
export function exportHtmlFile(content, title, type = 'html') {
  const html = type === 'html'
    ? (content || '<!DOCTYPE html><html><body></body></html>')
    : wrapRichDoc(content, title);
  const safeName = (title || 'note')
    .replace(/[\\/:*?"<>|]/g, '_')   // 去掉文件名非法字符
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'note';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 释放对象 URL, 留点时间给下载触发
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 构建用于 iframe srcdoc 的文档字符串。
// - html 类型: 已是完整文档, 原样返回 (注入锚点兜底脚本; 快速预览再加自适配缩放)。
// - rich 类型: 是 Tiptap 片段, 包一层主题化样式外壳, 内容居中可读。
// - image 类型: content 是 /uploads URL, 居中显示大图。
// - txt 类型: content 是纯文本, <pre> 保留原始排版。
// opts:
//   fit  —— 仅快速预览传 true, 超宽文档自动缩放到视口内, 修复横向撕裂/截断。
//   dark —— 暗色主题, rich/MD 预览改用与整体一致的深色不透明背景与浅色文字。
export function buildPreviewDoc(content, type, opts = {}) {
  const { fit = false, dark = false } = opts;
  const body = content || '<p>暂无内容</p>';
  if (type === 'html') return injectAnchorScript(body, fit);
  if (type === 'image') return injectAnchorScript(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { background: transparent !important; margin: 0; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; box-sizing: border-box; }
  img { max-width: 100%; max-height: calc(100vh - 48px); object-fit: contain; border-radius: 6px; }
</style></head><body><img src="${body}" alt="" referrerpolicy="no-referrer"></body></html>`, false);
  if (type === 'txt') return injectAnchorScript(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { background: transparent !important; margin: 0; }
  body { font-family: "Cascadia Code", Consolas, "Courier New", monospace;
         font-size: 13.5px; line-height: 1.7; color: ${dark ? '#e8e4e0' : '#2c2c2c'};
         white-space: pre-wrap; word-break: break-word; padding: 28px 30px; }
</style></head><body>${escapeHtml(body)}</body></html>`, fit);

  // rich/MD 预览: html/body 背景透明 —— 让外层面板的毛玻璃 (半透明 + backdrop-blur)
  // 透过 iframe 显出来, 复刻"暖色半透明毛玻璃"观感。文字/代码块等用主题色保证可读,
  // 内容居中 (max-width + auto margin), 留出舒适内边距。
  const t = dark
    ? { fg: '#e8e4e0', pre: 'rgba(255,255,255,0.06)', code: 'rgba(255,255,255,0.08)',
        border: 'rgba(232,228,224,0.18)', quote: 'rgba(232,228,224,0.3)', muted: '#a09080', link: '#8fb0ff' }
    : { fg: '#2c2c2c', pre: 'rgba(140,122,107,0.1)', code: 'rgba(140,122,107,0.14)',
        border: 'rgba(140,122,107,0.22)', quote: 'rgba(140,122,107,0.3)', muted: '#6f5d4d', link: '#3b6cff' };

  // 暗色主题: 自带整套样式的导出类文档常带 body{color:#32373F} (深灰字),
  // 压在透出的深色毛玻璃上会看不清。用 !important 把正文统一刷成浅色 ——
  // :where() 零权重但 !important 仍压过内容里非 important 的深色文字。
  // 链接 / 行内代码 / 代码块单独保留主题色, 不被一起刷掉。
  const forceDarkText = dark ? `
  body,
  .kb-doc :where(p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,figcaption,caption,span,div,strong,em,b,i,small,label,dt,dd) {
    color: ${t.fg} !important;
  }
  .kb-doc :where(a) { color: ${t.link} !important; }
  .kb-doc :where(pre, pre *) { color: ${t.fg} !important; }
` : '';

  return injectAnchorScript(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  /* 用 !important 压过内容自带 <style> 里的 body{background:#fff} (导出类文档常见),
     无视先后顺序, 让面板毛玻璃透上来 —— 纯 Markdown 与自带样式的文档都能统一透光。 */
  html, body { background: transparent !important; }
  body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
         line-height: 1.75; color: ${t.fg}; margin: 0;
         padding: 32px 28px 40px; word-wrap: break-word; }
  .kb-doc { max-width: 760px; margin: 0 auto; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  pre { background: ${t.pre}; padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
  code { background: ${t.code}; padding: 2px 5px; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid ${t.border}; padding: 8px 10px; }
  blockquote { border-left: 3px solid ${t.quote}; margin: 0; padding-left: 14px; color: ${t.muted}; }
  a { color: ${t.link}; }
  h1,h2,h3,h4 { line-height: 1.3; }
  ${forceDarkText}
</style></head><body><div class="kb-doc">${body}</div></body></html>`, fit);
}
