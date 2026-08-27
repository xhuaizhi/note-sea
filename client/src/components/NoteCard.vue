<template>
  <div class="note-card" :class="{ 'is-pinned': note.pinned }" @click="$emit('click')" :title="note.aiSummary || ''">
    <div class="card-header">
      <h3>
        <span v-if="typeBadge" class="html-badge" :title="typeBadge.title">{{ typeBadge.label }}</span>
        <span v-html="highlightedTitle"></span>
      </h3>
      <div class="card-actions">
        <button class="btn-pin" :class="{ pinned: note.pinned }" @click.stop="$emit('pin')" :title="note.pinned ? '取消置顶' : '置顶'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 17v5M5 17h14l-1.5-6.5L15 9V4h-1V2H10v2H9v5l-2.5 1.5L5 17z"/>
          </svg>
        </button>
        <button class="btn-move" @click.stop="toggleMoveMenu" ref="moveBtn" title="移动分类">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
        </button>
        <button class="btn-delete" @click.stop="$emit('delete')" title="删除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    <p v-if="note.snippet && highlight" class="card-snippet" v-html="highlightedSnippet"></p>
    <p class="card-meta">
      <span v-if="categoryName" class="card-category">{{ categoryName }}</span>
      <span v-for="tag in (note.tags || []).slice(0, 3)" :key="tag" class="card-tag" :data-tooltip="tag">{{ tag }}</span>
      <span class="card-time">{{ formatTime(note.updatedAt) }}</span>
    </p>
    <Teleport to="body">
      <div v-if="showMoveMenu" class="move-overlay" @click="showMoveMenu = false">
        <div class="move-menu" :style="moveMenuStyle" @click.stop>
          <p class="move-title">移动到</p>
          <div class="move-list">
            <button
              class="move-item"
              :class="{ active: !note.categoryId }"
              @click="moveTo(null)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              未分类
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="move-item"
              :class="{ active: note.categoryId === cat.id }"
              @click="moveTo(cat.id)"
            >
              <svg v-if="!cat.icon || cat.icon === '📁' || iconSvgs[cat.icon]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="iconSvgs[cat.icon] || iconSvgs['folder']"/>
              </svg>
              <span v-else>{{ cat.icon }}</span>
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useEscClose } from '../composables/useEscClose';

const props = defineProps({
  note: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  highlight: { type: String, default: '' }
});
const emit = defineEmits(['click', 'delete', 'move', 'pin']);

const showMoveMenu = ref(false);
const moveMenuStyle = ref({});
const moveBtn = ref(null);

useEscClose(showMoveMenu, () => { showMoveMenu.value = false; });

const iconSvgs = {
  'folder': 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
  'folder-open': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  'file': 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2v7h7',
  'file-text': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'bookmark': 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z',
  'tag': 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'heart': 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  'lightbulb': 'M9 18h6M10 22h4M15 8a3 3 0 10-6 0c0 2 3 3 3 5M12 2v1',
  'target': 'M22 12h-4m-2 0a4 4 0 11-8 0 4 4 0 018 0zm0 0a8 8 0 11-16 0 8 8 0 0116 0zM2 12h4',
  'rocket': 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0 M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
  'code': 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  'terminal': 'M4 17l6-6-6-6M12 19h8',
  'database': 'M21 5c0 1.66-4.03 3-9 3S3 6.66 3 5m18 0c0-1.66-4.03-3-9-3S3 3.34 3 5m18 0v14c0 1.66-4.03 3-9 3s-9-1.34-9-3V5m18 7c0 1.66-4.03 3-9 3s-9-1.34-9-3',
  'server': 'M20 6H4a2 2 0 00-2 2v4a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zM6 10h.01M6 18h.01M20 14H4a2 2 0 00-2 2v4a2 2 0 002 2h16a2 2 0 002-2v-4a2 2 0 00-2-2z',
  'cloud': 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z',
  'lock': 'M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zM7 11V7a5 5 0 0110 0v4',
  'key': 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  'shield': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'globe': 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v20M2 12h20M12 2C9.5 2 7 6.5 7 12s2.5 10 5 10M12 2c2.5 0 5 4.5 5 10s-2.5 10-5 10',
  'mail': 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  'message': 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  'bell': 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  'calendar': 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18',
  'clock': 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2',
  'chart': 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  'trending': 'M23 6l-9.5 9.5-5-5L1 18M23 6h-7M23 6v7',
  'activity': 'M22 12h-4l-3 9L9 3l-3 9H2',
  'briefcase': 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
  'home': 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  'user': 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z',
  'users': 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  'book': 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5z',
  'graduation': 'M22 10l-10 5-10-5 10-5 10 5zM2 10v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6',
  'microscope': 'M6 18h8M3 22h18M14 22a7 7 0 100-14h-1M9 14h.01M9 18h.01M10 6L8 8l2 2',
  'palette': 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2zM7.5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
  'music': 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z',
  'camera': 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 8a5 5 0 100 10 5 5 0 000-10z',
  'gift': 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z'
};

function toggleMoveMenu(event) {
  showMoveMenu.value = !showMoveMenu.value;
  if (showMoveMenu.value && moveBtn.value) {
    const rect = moveBtn.value.getBoundingClientRect();
    const menuWidth = 240; // max-width of menu
    let left = rect.left;

    // Check if menu would overflow right edge
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 16; // 16px padding from edge
    }

    moveMenuStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 8}px`,
      left: `${left}px`
    };
  }
}

const categoryName = computed(() => {
  if (!props.note.categoryId) return '';
  const cat = props.categories.find(c => c.id === props.note.categoryId);
  if (!cat) return '';
  const icon = (!cat.icon || cat.icon === '📁') ? '' : cat.icon + ' ';
  return icon + cat.name;
});

const highlightedTitle = computed(() => {
  if (!props.highlight) return escapeHtml(props.note.title);
  return markText(props.note.title, props.highlight);
});

// 只读形态徽章: html/pdf/image/txt 显示对应标记, rich 不显示
const TYPE_BADGES = {
  html: { label: 'HTML', title: 'HTML 网页 (只读预览)' },
  pdf: { label: 'PDF', title: 'PDF 文档 (只读查看)' },
  image: { label: '图片', title: '图片笔记' },
  txt: { label: 'TXT', title: '纯文本笔记' }
};
const typeBadge = computed(() => TYPE_BADGES[props.note.type] || null);

const highlightedSnippet = computed(() => {
  if (!props.highlight || !props.note.snippet) return '';
  return markText(props.note.snippet, props.highlight);
});

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markText(text, query) {
  const escaped = escapeHtml(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${q})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function moveTo(categoryId) {
  showMoveMenu.value = false;
  if (categoryId !== props.note.categoryId) {
    emit('move', props.note.id, categoryId);
  }
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.note-card {
  background: var(--card-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  border-left: 3px solid transparent;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.note-card.is-pinned {
  border-left-color: var(--clay);
}

.note-card:hover {
  border-left-color: var(--clay);
  border-color: rgba(140, 122, 107, 0.22);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  background: var(--card-bg-hover);
}

:global(:root:not([data-theme="dark"])) .note-card {
  border-color: rgba(140, 122, 107, 0.14);
}

:global([data-theme="dark"]) .note-card {
  border-color: rgba(232, 228, 224, 0.11);
  box-shadow: var(--shadow-sm);
}

:global([data-theme="dark"]) .note-card:hover {
  border-color: rgba(232, 228, 224, 0.18);
  border-left-color: var(--clay);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--charcoal);
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

h3 > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.html-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1;
  padding: 3px 5px;
  border-radius: 4px;
  background: rgba(59, 108, 255, 0.12);
  color: #3b6cff;
}

:global([data-theme="dark"]) .html-badge {
  background: rgba(99, 140, 255, 0.22);
  color: #8fb0ff;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.card-actions button {
  opacity: 0.4;
  transition: opacity 0.18s;
}

.note-card:hover .card-actions button,
.card-actions button:focus,
.btn-pin.pinned {
  opacity: 1;
}

.btn-move, .btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--wood);
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.btn-move:hover {
  color: var(--clay);
  background: rgba(197, 143, 109, 0.08);
}

.btn-pin {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--wood);
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.btn-pin:hover {
  color: var(--clay);
  background: rgba(197, 143, 109, 0.08);
}

.btn-pin.pinned {
  color: var(--clay);
}

.btn-pin.pinned svg {
  transform: rotate(45deg);
}

.btn-delete:hover {
  color: #c83232;
  background: rgba(200, 50, 50, 0.08);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  min-width: 0;
  flex-wrap: nowrap;
  overflow: visible;
}

.card-category {
  font-size: 11px;
  color: #6f5d4d;
  background: rgba(229, 216, 200, 0.58);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex: 0 1 auto;
  min-width: 0;
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-tag {
  position: relative;
  font-size: 11px;
  color: #53694f;
  background: rgba(201, 213, 198, 0.62);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(83, 105, 79, 0.12);
  font-weight: 600;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-tag::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  z-index: 30;
  max-width: 220px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card-bg-hover);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow-md);
  color: var(--charcoal);
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.card-tag:hover {
  overflow: visible;
}

.card-tag:hover::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

:global([data-theme="dark"]) .card-category {
  color: #c8b9a8;
  background: rgba(140, 122, 107, 0.26);
}

:global([data-theme="dark"]) .card-tag {
  color: #b8d0b2;
  background: rgba(74, 92, 74, 0.42);
  border-color: rgba(184, 208, 178, 0.16);
}

.card-time {
  font-size: 12px;
  color: var(--wood);
  flex-shrink: 0;
}

.card-snippet {
  font-size: 12px;
  color: var(--wood);
  margin-top: 6px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-snippet :deep(mark),
h3 :deep(mark) {
  background: rgba(197, 143, 109, 0.2);
  color: var(--charcoal);
  border-radius: 2px;
  padding: 0 1px;
}

.move-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(4px);
}

.move-menu {
  position: fixed;
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  max-width: 240px;
}

.move-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--wood);
  margin-bottom: 8px;
  padding: 0 8px;
}

.move-list {
  max-height: 280px;
  overflow-y: auto;
  scrollbar-width: none;
}

.move-list::-webkit-scrollbar {
  width: 0;
  display: none;
}

.move-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--charcoal);
  transition: background 0.15s;
}

.move-item:hover {
  background: var(--bg-hover);
}

.move-item.active {
  background: rgba(197, 143, 109, 0.12);
  color: var(--clay);
  font-weight: 500;
}

</style>
