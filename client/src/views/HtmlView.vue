<template>
  <div class="html-view">
    <header class="hv-header">
      <button class="hv-back" @click="goBack" title="返回">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>返回</span>
      </button>
      <h1 class="hv-title">{{ note?.title || '无标题' }}</h1>

      <template v-if="note && !editing">
        <button v-if="note.type === 'html'" class="hv-action" @click="enterEdit" title="在预览上直接改文字">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>编辑</span>
        </button>
        <button v-if="note.type === 'html'" class="hv-action" @click="exportNote" title="导出为 HTML 文件">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          <span>导出</span>
        </button>
        <!-- pdf/image 的 content 就是 /uploads 文件 URL, 直接下载原文件 -->
        <a
          v-if="note.type === 'pdf' || note.type === 'image'"
          class="hv-action"
          :href="note.content"
          :download="note.title"
          title="下载原文件"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          <span>下载</span>
        </a>
      </template>

      <template v-if="note && editing">
        <button class="hv-action hv-save" :disabled="saving" @click="saveEdit" title="保存改动">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8"/>
          </svg>
          <span>{{ saving ? '保存中…' : '保存' }}</span>
        </button>
        <button class="hv-action" :disabled="saving" @click="cancelEdit" title="放弃改动">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
          <span>取消</span>
        </button>
      </template>

      <span class="hv-badge" :class="{ 'hv-badge-editing': editing }">{{ editing ? '编辑中' : typeLabel }}</span>
    </header>

    <div v-if="loading" class="hv-loading">加载中...</div>
    <div v-else-if="!note" class="hv-empty">笔记不存在或已删除</div>
    <!-- PDF 无法用 srcdoc 嵌入, 直连 /uploads 交给浏览器原生阅读器渲染
         (服务端对 pdf 响应带了 frame-ancestors 'self', 同源嵌入放行) -->
    <iframe
      v-else-if="note.type === 'pdf'"
      class="hv-frame"
      referrerpolicy="no-referrer"
      :src="note.content"
    ></iframe>
    <iframe
      v-else
      ref="frame"
      :key="frameKey"
      class="hv-frame"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerpolicy="no-referrer"
      :srcdoc="srcdoc"
    ></iframe>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotesStore } from '../stores/notes.js';
import { buildPreviewDoc, exportHtmlFile } from '../utils/html.js';
import { useEscClose } from '../composables/useEscClose.js';

const route = useRoute();
const router = useRouter();
const store = useNotesStore();

const note = ref(null);
const loading = ref(true);
const editing = ref(false);
const saving = ref(false);
const frame = ref(null);
const frameKey = ref(0);   // 自增可强制重建 iframe (取消时丢弃未保存改动)

const srcdoc = computed(() =>
  buildPreviewDoc(note.value?.content || '', note.value?.type || 'html')
);

// 徽章文案: 按笔记形态显示
const TYPE_LABELS = { html: 'HTML', pdf: 'PDF', image: '图片', txt: 'TXT' };
const typeLabel = computed(() => TYPE_LABELS[note.value?.type] || 'HTML');

function goBack() {
  if (editing.value) {
    if (!confirm('正在编辑,确定离开并放弃改动?')) return;
  }
  if (window.history.length > 1) router.back();
  else router.push('/');
}

// ESC 返回 (与返回按钮一致, 编辑中会先确认); 视图挂载期间始终启用
useEscClose(computed(() => true), goBack);

function exportNote() {
  if (!note.value) return;
  exportHtmlFile(
    note.value.content || '',
    note.value.title || '无标题',
    note.value.type || 'html'
  );
}

function postToFrame(type) {
  frame.value?.contentWindow?.postMessage({ type }, '*');
}

function enterEdit() {
  editing.value = true;
  postToFrame('kb-edit-enter');
}

function cancelEdit() {
  editing.value = false;
  // 重建 iframe -> 重新加载原 srcdoc, 未保存的改动自然丢弃
  frameKey.value++;
}

function saveEdit() {
  if (saving.value) return;
  saving.value = true;
  // 让 iframe 内脚本序列化并回传; 结果在 onMessage 里处理
  postToFrame('kb-edit-save');
}

async function onMessage(e) {
  // 校验来源: 必须是本页 iframe 发来的 (opaque origin 下 e.origin 为 "null", 故认 source)
  if (!frame.value || e.source !== frame.value.contentWindow) return;
  const msg = e.data;
  if (!msg || msg.type !== 'kb-edit-content') return;
  try {
    await store.updateNote(note.value.id, { content: msg.html });
    note.value = store.currentNote || { ...note.value, content: msg.html };
    editing.value = false;
    frameKey.value++;   // 用保存后的内容重载, 清掉 contenteditable 态
  } catch (err) {
    alert('保存失败,请重试');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  window.addEventListener('message', onMessage);
  await store.fetchNote(route.params.id);
  note.value = store.currentNote;
  loading.value = false;
});

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage);
});
</script>

<style scoped>
.html-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg, #f7f5f0);
}

.hv-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--border, #e5e0d8);
  background: var(--surface, #fff);
  flex-shrink: 0;
}

.hv-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--sand, #e0dace);
  border-radius: 8px;
  background: var(--input-bg, #faf8f4);
  color: var(--wood, #8a7d6a);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition, all .2s);
}

.hv-back:hover {
  color: var(--charcoal, #2c2c2c);
  border-color: var(--charcoal, #2c2c2c);
}

.hv-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 7px 14px;
  border: 1px solid var(--sand, #e0dace);
  border-radius: 8px;
  background: var(--input-bg, #faf8f4);
  color: var(--wood, #8a7d6a);
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  transition: var(--transition, all .2s);
}

.hv-action:hover {
  color: #3b6cff;
  border-color: #3b6cff;
  background: #eef2ff;
}

.hv-action:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.hv-save {
  color: #fff;
  background: #3b6cff;
  border-color: #3b6cff;
}

.hv-save:hover {
  color: #fff;
  background: #2f5ae0;
  border-color: #2f5ae0;
}

.hv-badge-editing {
  background: #fff4e5;
  color: #d98324;
}

.hv-title {
  flex: 1;
  min-width: 0;
  font-size: 19px;
  line-height: 1.35;
  color: var(--charcoal, #2c2c2c);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hv-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .5px;
  padding: 3px 8px;
  border-radius: 5px;
  background: #eef2ff;
  color: #3b6cff;
}

.hv-loading,
.hv-empty {
  padding: 60px;
  text-align: center;
  color: var(--wood, #8a7d6a);
}

.hv-frame {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}

/* 窄屏: 按钮收成纯图标, 标题保留省略, 收紧间距 —— 返回/编辑/导出/下载/徽章一行才放得下 */
@media (max-width: 768px) {
  .hv-header {
    gap: 8px;
    padding: 10px 14px;
  }

  .hv-back,
  .hv-action {
    padding: 7px 9px;
  }

  .hv-back span,
  .hv-action span {
    display: none;
  }

  .hv-title {
    font-size: 16px;
  }

  .hv-badge {
    padding: 3px 6px;
  }
}
</style>
