<template>
  <aside class="ai-panel">
    <div class="ai-resize-handle" @mousedown="startResize"></div>
    <div class="ai-panel-header">
        <div class="ai-model-select" ref="modelDropdownRef">
          <button class="model-trigger" @click="modelDropOpen = !modelDropOpen">
            <span class="model-trigger-text">{{ selectedLabel || '选择模型' }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div v-if="modelDropOpen" class="model-drop-menu">
            <div v-for="p in aiStore.providers" :key="p.id" class="model-group">
              <p class="model-group-name">{{ p.name }}</p>
              <button
                v-for="m in p.models"
                :key="`${p.id}::${m}`"
                class="model-option"
                :class="{ active: selectedModel === `${p.id}::${m}` }"
                @click="selectModel(p.id, m)"
              >{{ m }}</button>
            </div>
            <div v-if="aiStore.providers.length === 0" class="model-empty">
              <p>暂无模型</p>
              <button class="model-empty-btn" @click="aiStore.configModalOpen = true; modelDropOpen = false">去配置</button>
            </div>
          </div>
        </div>
        <div class="ai-header-actions">
          <button class="btn-ai-icon" @click="historyOpen = !historyOpen" title="历史记录">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
          <button class="btn-ai-icon" @click="aiStore.configModalOpen = true" title="AI 配置">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
          <button class="btn-ai-icon" @click="clearCurrentChat" title="清空对话">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
          <button class="btn-ai-icon" @click="$emit('close')" title="关闭">✕</button>
        </div>
      </div>

      <Modal
        :visible="confirmClearAll"
        title="清空所有对话历史？"
        message="此操作不可撤销。"
        :danger="true"
        confirm-text="清空"
        @confirm="doClearAllHistory"
        @cancel="confirmClearAll = false"
      />

      <Teleport to="body">
        <div v-if="historyOpen" class="history-overlay" @click="historyOpen = false">
          <div class="history-panel" @click.stop>
            <div class="history-header">
              <h3>对话历史</h3>
              <div class="history-header-actions">
                <button class="btn-clear-all" @click="clearAllHistory" :disabled="historyList.length === 0">清空全部</button>
                <button class="btn-close-history" @click="historyOpen = false">✕</button>
              </div>
            </div>
            <div class="history-body">
              <div v-if="historyList.length === 0" class="history-empty">
                <p>暂无历史记录</p>
              </div>
              <div v-for="item in historyList" :key="item.noteId" class="history-item">
                <div class="history-item-header">
                  <span class="history-note-title">{{ item.noteTitle }}</span>
                  <button class="btn-delete-history" @click="deleteHistory(item.noteId)" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
                <p class="history-summary">{{ item.summary }}</p>
                <p class="history-count">{{ item.messageCount }} 条对话</p>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <div class="ai-panel-body" ref="bodyRef">
        <div v-if="messages.length === 0" class="ai-welcome">
          <p class="ai-welcome-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            AI 助手
          </p>
          <p class="ai-welcome-hint">选中文字使用快捷操作，或直接提问</p>
          <div class="ai-tools">
            <button class="ai-tool-btn" @click="generateSummary" :disabled="aiStore.loading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              生成摘要
            </button>
            <button class="ai-tool-btn" @click="suggestTags" :disabled="aiStore.loading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              推荐标签
            </button>
          </div>
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" class="ai-msg" :class="[msg.role, { error: msg.error }]">
          <div class="ai-msg-content" v-html="msg.role === 'assistant' ? renderMd(msg.content) : escapeHtml(msg.content)"></div>
          <div v-if="msg.role === 'assistant' && msg.done && !msg.error" class="ai-msg-actions">
            <button v-if="isSummaryMessage(idx)" @click="applySummary(msg.content)" class="btn-primary">应用摘要</button>
            <template v-else>
              <button @click="insertToEditor(msg.content)">插入</button>
              <button @click="replaceSelection(msg.content)">替换选中</button>
            </template>
            <button @click="copyText(msg.content)">复制</button>
          </div>
        </div>
        <div v-if="aiStore.loading" class="ai-typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>

      <div class="ai-panel-footer">
        <div v-if="hasSelection" class="ai-quick-actions">
          <button @click="quickAction('润色')">润色</button>
          <button @click="quickAction('翻译为英文')">翻译</button>
          <button @click="quickAction('总结')">总结</button>
          <button @click="quickAction('解释')">解释</button>
          <button @click="quickAction('扩写')">扩写</button>
        </div>
        <div class="ai-input-row">
          <textarea
            v-model="inputText"
            placeholder="输入问题..."
            rows="1"
            @keydown.enter.exact.prevent="send"
            @input="autoGrow"
            ref="inputRef"
          ></textarea>
          <button v-if="aiStore.loading" class="btn-stop" @click="aiStore.stopGeneration()" title="停止生成">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
          <button v-else class="btn-send" @click="send" :disabled="!inputText.trim()">↑</button>
        </div>
      </div>
    </aside>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAiStore } from '../stores/ai';
import { useNotesStore } from '../stores/notes';
import { markdownToHtml } from '../utils/markdown.js';
import { useEscClose } from '../composables/useEscClose';
import Modal from './Modal.vue';

const props = defineProps({
  editor: Object,
  noteId: String,
  noteContent: String
});
const emit = defineEmits(['close', 'saveSummary', 'saveTags']);

const aiStore = useAiStore();
const notesStore = useNotesStore();
const bodyRef = ref(null);
const inputRef = ref(null);
const inputText = ref('');
const selectedModel = ref('');
const modelDropOpen = ref(false);
const modelDropdownRef = ref(null);
const panelWidth = ref(parseInt(localStorage.getItem('ai-panel-width')) || 380);
const historyOpen = ref(false);
const confirmClearAll = ref(false);

useEscClose(historyOpen, () => { historyOpen.value = false; });
useEscClose(modelDropOpen, () => { modelDropOpen.value = false; });

const messages = computed(() => aiStore.getChat(props.noteId));

const hasSelection = computed(() => {
  if (!props.editor) return false;
  return !props.editor.state.selection.empty;
});

const historyList = computed(() => {
  const list = [];
  for (const [noteId, chat] of Object.entries(aiStore.chatHistories)) {
    if (chat.length === 0) continue;
    const userMessages = chat.filter(m => m.role === 'user');
    const summary = userMessages.length > 0 ? userMessages[0].content.slice(0, 50) + '...' : '无内容';
    const note = notesStore.notes.find(n => n.id === noteId);
    list.push({
      noteId,
      noteTitle: note?.title || `笔记 ${noteId.slice(0, 8)}`,
      summary,
      messageCount: chat.length
    });
  }
  return list;
});

const selectedLabel = computed(() => {
  if (!selectedModel.value) return '';
  const [pid, model] = selectedModel.value.split('::');
  const p = aiStore.providers.find(x => x.id === pid);
  if (!p) return model || '';
  return `${p.name} / ${model}`;
});

onMounted(() => {
  aiStore.fetchConfig().then(() => {
    syncSelectedModel();
  });
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

watch(() => aiStore.providers, () => {
  syncSelectedModel();
}, { deep: true });

function syncSelectedModel() {
  if (aiStore.activeProviderId && aiStore.activeModel) {
    selectedModel.value = `${aiStore.activeProviderId}::${aiStore.activeModel}`;
  } else if (aiStore.providers.length > 0 && aiStore.providers[0].models.length > 0) {
    const p = aiStore.providers[0];
    selectedModel.value = `${p.id}::${p.models[0]}`;
    aiStore.setActive(p.id, p.models[0]);
  }
}

function selectModel(providerId, model) {
  selectedModel.value = `${providerId}::${model}`;
  modelDropOpen.value = false;
  aiStore.setActive(providerId, model);
}

function handleOutsideClick(e) {
  if (modelDropdownRef.value && !modelDropdownRef.value.contains(e.target)) {
    modelDropOpen.value = false;
  }
}

function startResize(e) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = panelWidth.value;

  function onMove(ev) {
    const dx = startX - ev.clientX;
    const newWidth = Math.max(300, Math.min(800, startWidth + dx));
    panelWidth.value = newWidth;
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('ai-panel-width', panelWidth.value);
  }

  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

watch(() => aiStore.panelOpen, (v) => {
  if (v) nextTick(() => inputRef.value?.focus());
});

function getSelectedText() {
  if (!props.editor) return '';
  const { from, to } = props.editor.state.selection;
  return props.editor.state.doc.textBetween(from, to, '\n');
}

function quickAction(action) {
  const text = getSelectedText();
  if (!text) return;
  const userMsg = `请对以下文字进行${action}：\n\n${text}`;
  doSend(userMsg);
}

function send() {
  if (!inputText.value.trim() || aiStore.loading) return;
  doSend(inputText.value.trim());
  inputText.value = '';
  nextTick(() => {
    if (inputRef.value) inputRef.value.style.height = 'auto';
  });
}

function doSend(userContent) {
  const chat = aiStore.getChat(props.noteId);
  chat.push({ role: 'user', content: userContent, done: true });

  const systemMsg = props.noteContent
    ? `你是一个知识库 AI 助手。以下是当前笔记内容供参考：\n\n${stripHtml(props.noteContent)}`
    : '你是一个知识库 AI 助手。';

  const apiMessages = [
    { role: 'system', content: systemMsg },
    ...chat.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
  ];

  chat.push({ role: 'assistant', content: '', done: false });
  const assistantIdx = chat.length - 1;
  scrollToBottom();

  aiStore.sendMessage(props.noteId, apiMessages, (chunk, done, isError) => {
    if (done) {
      chat[assistantIdx].done = true;
      if (isError) {
        chat[assistantIdx].error = true;
        chat[assistantIdx].content = chunk || chat[assistantIdx].content || '请求失败';
      } else if (chunk && !chat[assistantIdx].content) {
        chat[assistantIdx].content = chunk;
      }
    } else {
      chat[assistantIdx].content += chunk;
    }
    scrollToBottom();
  });
}

function generateSummary() {
  if (!props.noteContent) return;
  const text = stripHtml(props.noteContent);
  if (!text.trim()) return;
  const userContent = `请用一句话（不超过50字）总结以下内容的核心要点：\n\n${text}`;
  const chat = aiStore.getChat(props.noteId);
  chat.push({ role: 'user', content: '生成笔记摘要', done: true });
  chat.push({ role: 'assistant', content: '', done: false });
  const assistantIdx = chat.length - 1;
  scrollToBottom();

  const apiMessages = [
    { role: 'system', content: '你是一个摘要生成助手。只输出摘要内容，不要加任何前缀或解释。' },
    { role: 'user', content: userContent }
  ];

  aiStore.sendMessage(props.noteId, apiMessages, (chunk, done, isError) => {
    if (done) {
      chat[assistantIdx].done = true;
      if (isError) {
        chat[assistantIdx].error = true;
        chat[assistantIdx].content = chunk || '请求失败';
      }
    } else {
      chat[assistantIdx].content += chunk;
    }
    scrollToBottom();
  });
}

function suggestTags() {
  if (!props.noteContent) return;
  const text = stripHtml(props.noteContent);
  if (!text.trim()) return;
  const userContent = `根据以下内容，推荐3-5个简短的中文标签（每个标签2-4个字），用逗号分隔，只输出标签：\n\n${text}`;
  const chat = aiStore.getChat(props.noteId);
  chat.push({ role: 'user', content: '推荐标签', done: true });
  chat.push({ role: 'assistant', content: '', done: false });
  const assistantIdx = chat.length - 1;
  scrollToBottom();

  const apiMessages = [
    { role: 'system', content: '你是一个标签推荐助手。只输出逗号分隔的标签，不要加任何前缀或解释。' },
    { role: 'user', content: userContent }
  ];

  aiStore.sendMessage(props.noteId, apiMessages, (chunk, done, isError) => {
    if (done) {
      chat[assistantIdx].done = true;
      if (isError) {
        chat[assistantIdx].error = true;
        chat[assistantIdx].content = chunk || '请求失败';
      } else {
        const tagsStr = chat[assistantIdx].content.trim();
        if (tagsStr) {
          const tags = tagsStr.split(/[,，、]/).map(t => t.trim()).filter(Boolean);
          emit('saveTags', tags);
        }
      }
    } else {
      chat[assistantIdx].content += chunk;
    }
    scrollToBottom();
  });
}

function clearCurrentChat() {
  aiStore.clearChat(props.noteId);
}

function deleteHistory(noteId) {
  aiStore.clearChat(noteId);
}

function clearAllHistory() {
  if (historyList.value.length === 0) return;
  confirmClearAll.value = true;
}

function doClearAllHistory() {
  for (const noteId in aiStore.chatHistories) {
    aiStore.clearChat(noteId);
  }
  confirmClearAll.value = false;
  historyOpen.value = false;
}

function isSummaryMessage(idx) {
  const chat = aiStore.getChat(props.noteId);
  if (idx > 0 && chat[idx - 1]?.role === 'user') {
    return chat[idx - 1].content === '生成笔记摘要';
  }
  return false;
}

function applySummary(summary) {
  const trimmed = summary.trim();
  if (trimmed) {
    emit('saveSummary', trimmed);
  }
}

function insertToEditor(text) {
  if (!props.editor) return;
  const html = markdownToHtml(text);
  props.editor.chain().focus().insertContent(html).run();
}

function replaceSelection(text) {
  if (!props.editor) return;
  const html = markdownToHtml(text);
  props.editor.chain().focus().deleteSelection().insertContent(html).run();
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
  });
}

function autoGrow(e) {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function renderMd(text) {
  return markdownToHtml(text || '');
}
</script>

<style scoped>
.ai-panel {
  position: relative;
  width: v-bind('panelWidth + "px"');
  min-width: 300px;
  max-width: 800px;
  background: var(--surface);
  backdrop-filter: blur(16px);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}

.ai-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.ai-resize-handle:hover {
  background: var(--clay);
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.ai-model-select {
  position: relative;
}

.model-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--input-bg);
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--charcoal);
  cursor: pointer;
  transition: var(--transition);
  max-width: 200px;
}

.model-trigger:hover {
  border-color: var(--clay);
  background: var(--input-bg-focus);
}

.model-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-trigger svg {
  flex-shrink: 0;
  color: var(--wood);
}

.model-drop-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px;
  box-shadow: var(--shadow-lg);
  z-index: 50;
  min-width: 200px;
  max-height: 280px;
  overflow-y: auto;
}

.model-group {
  margin-bottom: 8px;
}

.model-group:last-child {
  margin-bottom: 0;
}

.model-group-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--wood);
  padding: 4px 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 12px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--charcoal);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.model-option:hover {
  background: var(--bg-hover);
}

.model-option.active {
  background: var(--bg-active);
  color: var(--clay);
  font-weight: 600;
}

.model-empty {
  text-align: center;
  padding: 12px;
  color: var(--wood);
  font-size: 13px;
}

.model-empty-btn {
  margin-top: 8px;
  padding: 5px 14px;
  background: var(--clay);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
}

.model-empty-btn:hover {
  background: var(--clay-dark);
}

.ai-header-actions {
  display: flex;
  gap: 4px;
}

.btn-ai-icon {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.btn-ai-icon:hover {
  background: var(--bg-hover);
}

.ai-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: none;
}

.ai-panel-body::-webkit-scrollbar {
  width: 0;
  display: none;
}

.ai-welcome {
  text-align: center;
  padding: 48px 16px;
}

.ai-welcome-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--charcoal);
  margin-bottom: 8px;
}

.ai-welcome-hint {
  font-size: 13px;
  color: var(--wood);
}

.ai-tools {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  justify-content: center;
}

.ai-tool-btn {
  padding: 8px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 12px;
  cursor: pointer;
  color: var(--charcoal);
  transition: var(--transition);
}

.ai-tool-btn:hover {
  border-color: var(--clay);
  background: var(--bg-hover);
}

.ai-tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-msg {
  margin-bottom: 16px;
}

.ai-msg.user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.ai-msg.user .ai-msg-content {
  background: var(--clay);
  color: #fff;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 14px;
  max-width: 85%;
  font-size: 13px;
  line-height: 1.6;
}

.ai-msg.assistant .ai-msg-content {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px 16px 16px 4px;
  padding: 10px 14px;
  max-width: 90%;
  font-size: 13px;
  line-height: 1.6;
  color: var(--charcoal);
}

.ai-msg.assistant.error .ai-msg-content {
  background: rgba(200, 50, 50, 0.08);
  border-color: rgba(200, 50, 50, 0.3);
  color: #c83232;
}

.ai-msg-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.ai-msg-actions button {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.ai-msg-actions button:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.ai-msg-actions button.btn-primary {
  background: var(--clay);
  color: #fff;
  border-color: var(--clay);
}

.ai-msg-actions button.btn-primary:hover {
  background: var(--clay-dark);
  border-color: var(--clay-dark);
  color: #fff;
}

.ai-typing {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.ai-typing .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wood);
  animation: bounce 1.2s infinite;
}

.ai-typing .dot:nth-child(2) { animation-delay: 0.2s; }
.ai-typing .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

.ai-panel-footer {
  border-top: 1px solid var(--border);
  padding: 12px 16px;
}

.ai-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.ai-quick-actions button {
  padding: 4px 12px;
  background: rgba(201, 213, 198, 0.2);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--wood);
  cursor: pointer;
  transition: var(--transition);
}

.ai-quick-actions button:hover {
  background: var(--bg-active);
  color: var(--charcoal);
  border-color: var(--sage-dark);
}

.ai-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.ai-input-row textarea {
  flex: 1;
  resize: none;
  border: 1.5px solid var(--sand);
  border-radius: 12px;
  padding: 9px 14px;
  font-size: 13px;
  background: var(--input-bg);
  color: var(--charcoal);
  outline: none;
  line-height: 1.5;
  max-height: 120px;
  transition: border-color 0.2s;
}

.ai-input-row textarea:focus {
  border-color: var(--clay);
  background: var(--input-bg-focus);
}

.btn-send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--clay);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
}

.btn-send:hover {
  background: var(--clay-dark);
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-stop {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #c83232;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
}

.btn-stop:hover {
  background: #a82828;
}

.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.history-panel {
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
}

.history-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--charcoal);
}

.history-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-clear-all {
  padding: 5px 12px;
  background: none;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--wood);
  cursor: pointer;
  transition: var(--transition);
}

.btn-clear-all:hover:not(:disabled) {
  border-color: #c83232;
  color: #c83232;
}

.btn-clear-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-close-history {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--wood);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.btn-close-history:hover {
  background: var(--bg-hover);
  color: var(--charcoal);
}

.history-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.history-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--wood);
  font-size: 14px;
}

.history-item {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
  transition: var(--transition);
}

.history-item:hover {
  border-color: var(--clay);
  background: var(--bg-hover);
}

.history-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.history-note-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--charcoal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.btn-delete-history {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.btn-delete-history:hover {
  background: rgba(200, 50, 50, 0.1);
}

.history-summary {
  font-size: 12px;
  color: var(--wood);
  margin-bottom: 4px;
  line-height: 1.5;
}

.history-count {
  font-size: 11px;
  color: var(--sage-dark);
}
</style>
