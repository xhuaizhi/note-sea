<template>
  <div class="layout" :style="layoutBgStyle">
    <div class="sidebar-backdrop" :class="{ visible: sidebarOpen }" @click="sidebarOpen = false"></div>
    <Sidebar
      :class="{ open: sidebarOpen }"
      :categories="store.categories"
      :activeCategory="activeCategory"
      :trashCount="store.trashNotes.length"
      :tags="store.allTags"
      :activeTag="activeTag"
      :isDark="isDark"
      :showShortcuts="showShortcutsModal"
      @select-category="selectCategory"
      @select-tag="selectTag"
      @create-category="handleCreateCategory"
      @update-category="handleUpdateCategory"
      @delete-category="handleDeleteCategory"
      @open-trash="openTrash"
      @logout="handleLogout"
      @toggle-theme="toggleTheme"
      @change-password="showPasswordModal = true"
      @open-settings="showSettingsModal = true"
      @open-shortcuts="showShortcutsModal = true"
      @close-shortcuts="showShortcutsModal = false"
      @drop-note="handleDropNote"
      @trash-note="handleTrashNote"
    />
    <main class="main-content">
      <div class="top-bar" v-if="!isTrashView">
        <button class="btn-menu" @click="sidebarOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <SearchBar ref="searchBarRef" @search="handleSearch" />
        <div class="sort-dropdown" ref="sortDropdownRef">
          <button class="sort-btn" @click="sortOpen = !sortOpen" :class="{ open: sortOpen }">
            {{ sortLabel }}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="sort-menu" v-if="sortOpen">
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
              class="sort-option"
              :class="{ active: sortMode === opt.value }"
              @click="sortMode = opt.value; sortOpen = false"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div class="view-toggle" title="切换显示方式">
          <button
            class="view-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
            title="卡片视图"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </button>
          <button
            class="view-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="列表视图"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 6h13M8 12h13M8 18h13"/>
              <path d="M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
          </button>
        </div>
        <input ref="importInput" type="file" accept=".md,.markdown,.html,.htm,.docx,.pdf,.jpg,.jpeg,.png,.gif,.webp,.txt" multiple style="display:none" @change="handleImport" />
        <button class="btn-import" @click="$refs.importInput.click()" title="导入 Markdown / HTML / Word / PDF / 图片 / TXT">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span class="btn-import-label">导入</span>
        </button>
        <button class="btn-new" @click="handleNewNote">+ 新建笔记</button>
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="page-info">{{ currentPage }}<span class="page-sep">/</span>{{ totalPages }}</span>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div class="top-bar" v-else>
        <button class="btn-menu" @click="sidebarOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <h3 class="trash-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          回收站
        </h3>
        <!-- 返回笔记列表: 不必绕回侧边栏点"全部笔记" -->
        <button class="btn-back-notes" @click="leaveTrash" title="返回笔记列表">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span>返回笔记</span>
        </button>
        <button v-if="store.trashNotes.length > 0" class="btn-empty-trash" @click="handleEmptyTrash">清空回收站</button>
      </div>

      <div v-if="!isTrashView" class="notes-grid-wrap">
        <draggable
          v-if="pagedNotes.length > 0"
          v-model="draggableList"
          item-key="id"
          :class="viewMode === 'list' ? 'notes-list' : 'notes-grid'"
          ref="notesGridRef"
          :animation="180"
          ghost-class="card-drag-ghost"
          chosen-class="card-drag-chosen"
          drag-class="card-dragging"
          :disabled="!canDrag"
          :set-data="onSetDragData"
          @start="onDragStart"
          @end="onDragEnd"
          @update="onDragUpdate"
        >
          <template #item="{ element: note, index: idx }">
            <NoteCard
              :note="note"
              :categories="store.categories"
              :highlight="searchQuery"
              :data-note-id="note.id"
              :class="{ 'is-focused': idx === selectedIndex }"
              @click="openNote(note)"
              @delete="handleDeleteNote(note.id)"
              @move="handleMoveNote"
              @pin="handlePinNote(note)"
              @mouseenter="handleCardHover(note)"
              @mouseleave="handleCardLeave"
            />
          </template>
        </draggable>
        <div v-if="filteredNotes.length === 0" class="empty-state">
          <p>{{ searchQuery ? `没有找到包含 "${searchQuery}" 的笔记` : (activeTag ? `标签 "${activeTag}" 下暂无笔记` : (activeCategory ? '当前分类暂无笔记' : '暂无笔记')) }}</p>
          <button v-if="searchQuery" class="empty-action" @click="clearSearch">清除搜索</button>
          <button v-else-if="activeTag" class="empty-action" @click="activeTag = null">取消标签筛选</button>
          <button v-else @click="handleNewNote">新建笔记</button>
        </div>
      </div>

      <div v-else class="notes-grid">
        <div v-for="note in store.trashNotes" :key="note.id" class="trash-card">
          <div class="trash-card-info">
            <p class="trash-card-title">{{ note.title }}</p>
            <span class="trash-card-time">删除于 {{ formatTime(note.deletedAt) }}</span>
          </div>
          <div class="trash-card-actions">
            <button class="btn-restore" @click="handleRestore(note.id)">恢复</button>
            <button class="btn-perm-delete" @click="handlePermanentDelete(note.id)">永久删除</button>
          </div>
        </div>
        <div v-if="store.trashNotes.length === 0" class="empty-state">
          <p>回收站暂无笔记</p>
        </div>
      </div>
    </main>

    <Modal
      :visible="showCategoryModal"
      title="新建分类"
      type="prompt"
      placeholder="输入分类名称"
      confirmText="创建"
      @confirm="confirmCreateCategory"
      @cancel="showCategoryModal = false"
    />

    <Modal
      :visible="showDeleteCategoryModal"
      title="删除分类"
      :message="deleteCategoryMessage"
      type="confirm"
      confirmText="删除"
      :danger="true"
      @confirm="confirmDeleteCategory"
      @cancel="showDeleteCategoryModal = false"
    />

    <Modal
      :visible="showDeleteNoteModal"
      title="删除笔记"
      message="确定删除这篇笔记？删除后可在回收站恢复。"
      type="confirm"
      confirmText="删除"
      :danger="true"
      @confirm="confirmDeleteNote"
      @cancel="showDeleteNoteModal = false"
    />

    <Modal
      :visible="showEmptyTrashModal"
      title="清空回收站"
      :message="`将永久删除 ${store.trashNotes.length} 篇笔记，此操作不可撤销。`"
      type="confirm"
      confirmText="清空"
      :danger="true"
      @confirm="confirmEmptyTrash"
      @cancel="showEmptyTrashModal = false"
    />

    <Modal
      :visible="showPermDeleteModal"
      title="永久删除"
      message="将永久删除这篇笔记，此操作不可撤销。"
      type="confirm"
      confirmText="永久删除"
      :danger="true"
      @confirm="confirmPermDelete"
      @cancel="showPermDeleteModal = false"
    />

    <Teleport to="body">
      <div v-if="showPreviewModal" class="preview-overlay" @click="closePreview">
        <div class="preview-panel" :style="previewPanelStyle" @click.stop>
          <div class="preview-header">
            <div>
              <p class="preview-kicker">快速预览</p>
              <h3>{{ previewNote?.title || '无标题' }}</h3>
            </div>
            <button class="preview-close" @click="closePreview" title="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div v-if="previewLoading" class="preview-loading">加载中...</div>
          <!-- PDF 无法用 srcdoc 嵌入, 直连 /uploads 让浏览器原生阅读器渲染
               (服务端对 pdf 响应带了 frame-ancestors 'self', 同源嵌入放行) -->
          <iframe
            v-else-if="previewNote?.type === 'pdf'"
            class="preview-frame"
            referrerpolicy="no-referrer"
            :src="previewNote?.content"
          ></iframe>
          <iframe
            v-else
            class="preview-frame"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer"
            :srcdoc="previewSrcdoc"
          ></iframe>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showPasswordModal" class="pwd-overlay" @click="showPasswordModal = false">
        <div class="pwd-panel" @click.stop @keydown.enter="handleChangePassword">
          <h3>修改密码</h3>
          <p v-if="pwdError" class="pwd-error">{{ pwdError }}</p>
          <p v-if="pwdSuccess" class="pwd-success">{{ pwdSuccess }}</p>
          <input ref="oldPwdInput" v-model="oldPassword" type="password" placeholder="当前密码" class="pwd-input" />
          <input v-model="newPassword" type="password" placeholder="新密码（至少8位）" class="pwd-input" />
          <input v-model="confirmPassword" type="password" placeholder="确认新密码" class="pwd-input" />
          <div class="pwd-actions">
            <button class="btn-cancel" @click="showPasswordModal = false">取消</button>
            <button class="btn-confirm" @click="handleChangePassword">确认修改</button>
          </div>
        </div>
      </div>
    </Teleport>

    <AiConfigModal :visible="aiStore.configModalOpen" @close="aiStore.configModalOpen = false" />
    <SettingsModal :visible="showSettingsModal" @close="showSettingsModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useNotesStore } from '../stores/notes.js';
import { useAuthStore } from '../stores/auth.js';
import Sidebar from '../components/Sidebar.vue';
import SearchBar from '../components/SearchBar.vue';
import NoteCard from '../components/NoteCard.vue';
import Modal from '../components/Modal.vue';
import AiConfigModal from '../components/AiConfigModal.vue';
import SettingsModal from '../components/SettingsModal.vue';
import draggable from 'vuedraggable';
import { useAiStore } from '../stores/ai.js';
import { readMarkdownFile } from '../utils/markdown.js';
import { readHtmlFile, buildPreviewDoc } from '../utils/html.js';
import { useEscClose } from '../composables/useEscClose.js';
import { useSettingsStore } from '../stores/settings.js';

const router = useRouter();
const store = useNotesStore();
const auth = useAuthStore();
const aiStore = useAiStore();
const settingsStore = useSettingsStore();

const activeCategory = ref(null);
const searchQuery = ref('');
const searchResults = ref(null);
const currentPage = ref(1);
const pageSize = 35;
const isTrashView = ref(false);
const sortMode = ref(localStorage.getItem('notes-sort') || 'updatedDesc');
const viewMode = ref(localStorage.getItem('notes-view-mode') || 'card');
const sidebarOpen = ref(false);
const activeTag = ref(null);
const searchBarRef = ref(null);
const sortOpen = ref(false);
const sortDropdownRef = ref(null);
const notesGridRef = ref(null);
const selectedIndex = ref(0);

const sortOptions = [
  { value: 'updatedDesc', label: '最近编辑' },
  { value: 'createdDesc', label: '最近创建' },
  { value: 'titleAsc', label: '标题 A-Z' },
  { value: 'titleDesc', label: '标题 Z-A' },
  { value: 'custom', label: '自定义顺序' }
];

const sortLabel = computed(() => {
  return sortOptions.find(o => o.value === sortMode.value)?.label || '排序';
});

const showCategoryModal = ref(false);
const showDeleteCategoryModal = ref(false);
const showDeleteNoteModal = ref(false);
const showEmptyTrashModal = ref(false);
const showPermDeleteModal = ref(false);
const showPreviewModal = ref(false);
const previewLoading = ref(false);
const previewNote = ref(null);
const previewSrcdoc = computed(() =>
  buildPreviewDoc(
    previewNote.value?.content || '',
    previewNote.value?.type || 'rich',
    { fit: true, dark: isDark.value }
  )
);
// 悬停预览: 鼠标停在文件卡片上 0.2s 锁定该文件为预览目标 (hoveredNote),
// 随后按住空格弹出预览、松开空格关闭。划过时不立即触发, 0.2s 去抖避免连闪。
const hoveredNote = ref(null);
let hoverTimer = null;

function handleCardHover(note) {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    hoveredNote.value = note;
  }, 200);
}

function handleCardLeave() {
  clearTimeout(hoverTimer);
  hoverTimer = null;
  hoveredNote.value = null;
}

// 预览窗口自适宽: iframe 报来内容天然宽 w 后, 按"zoom 下限 0.9"反推所需窗口宽,
// 夹在 [900px, 92vw] 之间 —— 优先加宽窗口保住字号, 窗口到顶 (92vw) 仍塞不下则横向滚动。
// null 表示窄内容, 退回 CSS 默认 min(900px, 92vw)。
const PREVIEW_BASE_WIDTH = 900;   // 基准宽 (窄内容保持此宽, 字原大)
const PREVIEW_MIN_ZOOM = 0.9;     // 字号可读下限对应的缩放下限
const PREVIEW_VW_MAX = 0.92;      // 窗口加宽上限 92vw
const PREVIEW_WIDTH_TOLERANCE = 24;  // 目标宽变化不足此值不调整, 消除反复微调的台阶感
const panelWidth = ref(null);
let panelWidthLatch = 0;   // 本次预览已锁存的最大宽 (只增不减, 防响应式重排横跳); openPreview 时归零

const previewPanelStyle = computed(() =>
  panelWidth.value ? { width: panelWidth.value + 'px' } : {}
);

function handleFitMessage(e) {
  const msg = e.data;
  if (!msg || msg.type !== 'kb-fit-natural' || !showPreviewModal.value) return;
  const w = Number(msg.width) || 0;
  if (!w) return;
  const maxW = Math.round(window.innerWidth * PREVIEW_VW_MAX);
  // 为保 zoom≥0.9, 窗口至少 w×0.9; 夹在 [900, 92vw] 内
  const raw = Math.min(Math.max(PREVIEW_BASE_WIDTH, Math.round(w * PREVIEW_MIN_ZOOM)), maxW);
  // 单向锁存: 预览内 iframe 内容是响应式的 (目录"顶/左"随宽切换), 加宽会让内容重排、
  // 天然宽变小 → 若允许回缩就会"加宽→重排→变窄→再加宽"反复横跳。故宽度只增不减:
  // 仅当所需宽比已锁存的更大 (且超出容差) 时才增长, 撑过断点后锁住不回退。
  if (raw <= (panelWidthLatch + PREVIEW_WIDTH_TOLERANCE)) return;
  panelWidthLatch = raw;
  panelWidth.value = raw <= PREVIEW_BASE_WIDTH ? null : raw;
}

const pendingDeleteCategoryId = ref(null);
const pendingDeleteNoteId = ref(null);
const pendingPermDeleteId = ref(null);

const deleteCategoryMessage = computed(() => {
  if (!pendingDeleteCategoryId.value) return '';
  const count = store.notes.filter(n => n.categoryId === pendingDeleteCategoryId.value).length;
  return count > 0
    ? `该分类下有 ${count} 篇笔记，删除后将一同移入回收站。`
    : '该分类下没有笔记，确认删除？';
});

const isDark = ref(localStorage.getItem('theme') === 'dark');
const showPasswordModal = ref(false);
const showSettingsModal = ref(false);
const showShortcutsModal = ref(false);
const oldPwdInput = ref(null);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const pwdError = ref('');
const pwdSuccess = ref('');

useEscClose(showPasswordModal, () => { showPasswordModal.value = false; });
useEscClose(showShortcutsModal, () => { showShortcutsModal.value = false; });
useEscClose(showPreviewModal, closePreview);

watch(showPasswordModal, (v) => {
  if (v) {
    pwdError.value = '';
    pwdSuccess.value = '';
    nextTick(() => oldPwdInput.value?.focus());
  }
});

if (isDark.value) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

function toggleTheme() {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  }
}

async function handleChangePassword() {
  pwdError.value = '';
  pwdSuccess.value = '';
  if (!oldPassword.value) { pwdError.value = '请输入当前密码'; return; }
  if (!newPassword.value || newPassword.value.length < 8) { pwdError.value = '新密码至少8位'; return; }
  if (newPassword.value !== confirmPassword.value) { pwdError.value = '两次密码不一致'; return; }
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    });
    const data = await res.json();
    if (!res.ok) { pwdError.value = data.error || '修改失败'; return; }
    // 后端改密后轮换了 secret 并返回新 token, 必须更新否则下次请求 401
    if (data.token) auth.setToken(data.token);
    pwdSuccess.value = '密码修改成功';
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    setTimeout(() => { showPasswordModal.value = false; pwdSuccess.value = ''; }, 1500);
  } catch { pwdError.value = '网络错误'; }
}

onMounted(async () => {
  await Promise.all([store.fetchCategories(), store.fetchNotes(), store.fetchTrash(), store.fetchTags(), settingsStore.fetchSettings()]);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('keyup', handleKeyup);
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('message', handleFitMessage);
});

const layoutBgStyle = computed(() => {
  if (!settingsStore.homeBg) return {};
  return {
    backgroundImage: `url("${settingsStore.homeBg}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('keyup', handleKeyup);
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('message', handleFitMessage);
  clearTimeout(hoverTimer);
});

function getGridColumns() {
  if (viewMode.value === 'list') return 1;
  const grid = getGridElement();
  if (!grid) return 1;
  const styles = window.getComputedStyle(grid);
  const cols = styles.gridTemplateColumns.split(' ').filter(Boolean).length;
  return Math.max(1, cols);
}

function getGridElement() {
  const refValue = notesGridRef.value;
  if (!refValue) return null;
  return refValue.$el || refValue;
}

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function handleKeydown(e) {
  if ((e.key === ' ' || e.code === 'Space') && showPreviewModal.value) {
    e.preventDefault();
    return;
  }

  // 全局快捷键（Ctrl/Cmd + 字母）- 在任何情况下都生效
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      handleNewNote();
      return;
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      searchBarRef.value?.focus();
      return;
    }
  }

  if (hasActiveDialog()) return;

  // ? 键打开快捷键弹窗（不在可编辑元素中时）
  if (e.key === '?' && !isEditableTarget(e.target)) {
    e.preventDefault();
    showShortcutsModal.value = true;
    return;
  }

  // 如果焦点在可编辑元素中，不处理导航快捷键
  if (isEditableTarget(e.target)) return;

  // 回收站视图不支持导航快捷键
  if (isTrashView.value) return;

  const list = pagedNotes.value;
  const len = list.length;
  if (!len) return;

  // 导航快捷键
  switch (e.key) {
    case 'ArrowDown': {
      e.preventDefault();
      const cols = getGridColumns();
      const next = selectedIndex.value + cols;
      if (next < len) {
        selectedIndex.value = next;
      } else if (currentPage.value < totalPages.value) {
        currentPage.value++;
        selectedIndex.value = 0;
      }
      break;
    }
    case 'ArrowUp': {
      e.preventDefault();
      const cols = getGridColumns();
      const next = selectedIndex.value - cols;
      if (next >= 0) {
        selectedIndex.value = next;
      } else if (currentPage.value > 1) {
        currentPage.value--;
        const prevPageLen = Math.min(pageSize, filteredNotes.value.length - (currentPage.value - 2) * pageSize);
        selectedIndex.value = Math.max(0, prevPageLen - cols);
      }
      break;
    }
    case 'ArrowRight': {
      e.preventDefault();
      if (selectedIndex.value < len - 1) {
        selectedIndex.value++;
      } else if (currentPage.value < totalPages.value) {
        currentPage.value++;
        selectedIndex.value = 0;
      }
      break;
    }
    case 'ArrowLeft': {
      e.preventDefault();
      if (selectedIndex.value > 0) {
        selectedIndex.value--;
      } else if (currentPage.value > 1) {
        currentPage.value--;
        const prevPageLen = Math.min(pageSize, filteredNotes.value.length - (currentPage.value - 2) * pageSize);
        selectedIndex.value = Math.max(0, prevPageLen - 1);
      }
      break;
    }
    case 'Enter': {
      e.preventDefault();
      const note = list[selectedIndex.value];
      if (note) openNote(note);
      break;
    }
    case 'Delete': {
      e.preventDefault();
      const note = list[selectedIndex.value];
      if (note) handleDeleteNote(note.id);
      break;
    }
    case ' ': {
      e.preventDefault();
      if (e.repeat) return;
      // 优先预览鼠标悬停锁定的文件; 没有悬停目标时回退到键盘选中项
      const note = hoveredNote.value || list[selectedIndex.value];
      if (note) openPreview(note);
      break;
    }
    case 'PageDown': {
      e.preventDefault();
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
        selectedIndex.value = 0;
      }
      break;
    }
    case 'PageUp': {
      e.preventDefault();
      if (currentPage.value > 1) {
        currentPage.value--;
        selectedIndex.value = 0;
      }
      break;
    }
    case 'Home': {
      e.preventDefault();
      selectedIndex.value = 0;
      currentPage.value = 1;
      break;
    }
    case 'End': {
      e.preventDefault();
      currentPage.value = totalPages.value;
      nextTick(() => {
        selectedIndex.value = Math.max(0, pagedNotes.value.length - 1);
      });
      break;
    }
  }
}

function handleKeyup(e) {
  if ((e.key === ' ' || e.code === 'Space') && showPreviewModal.value) {
    e.preventDefault();
    closePreview();
  }
}

function hasActiveDialog() {
  return showCategoryModal.value ||
    showDeleteCategoryModal.value ||
    showDeleteNoteModal.value ||
    showEmptyTrashModal.value ||
    showPermDeleteModal.value ||
    showPreviewModal.value ||
    showPasswordModal.value ||
    showSettingsModal.value ||
    showShortcutsModal.value ||
    aiStore.configModalOpen;
}

function handleClickOutside(e) {
  if (sortOpen.value && sortDropdownRef.value && !sortDropdownRef.value.contains(e.target)) {
    sortOpen.value = false;
  }
}

const filteredNotes = computed(() => {
  let list = searchResults.value
    ? searchResults.value
    : activeCategory.value
      ? store.notes.filter(n => n.categoryId === activeCategory.value)
      : store.notes;

  if (activeTag.value) {
    list = list.filter(n => (n.tags || []).includes(activeTag.value));
  }

  const sorted = [...list];
  switch (sortMode.value) {
    case 'updatedDesc':
      sorted.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      break;
    case 'createdDesc':
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    case 'titleAsc':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh'));
      break;
    case 'titleDesc':
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'zh'));
      break;
    case 'custom':
      sorted.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
      break;
  }
  sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return sorted;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredNotes.value.length / pageSize)));

const pagedNotes = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredNotes.value.slice(start, start + pageSize);
});

const draggableList = ref([]);
watch(pagedNotes, (list) => {
  draggableList.value = [...list];
}, { immediate: true });

const canDrag = computed(() => !searchQuery.value && !activeTag.value);

function onSetDragData(dataTransfer, dragEl) {
  const id = dragEl?.dataset?.noteId || draggableList.value[0]?.id;
  if (!id) return;
  try {
    dataTransfer.setData('application/x-note-id', id);
    dataTransfer.setData('text/plain', id);
  } catch {}
  dataTransfer.effectAllowed = 'move';
}

function onDragStart(e) {
  const note = draggableList.value[e.oldIndex];
  if (note) {
    store.draggingNoteId = note.id;
  }
  document.body.classList.add('is-dragging-note');
}

function onDragEnd() {
  store.draggingNoteId = null;
  document.body.classList.remove('is-dragging-note');
}

async function onDragUpdate(e) {
  if (e.oldIndex === e.newIndex) return;
  if (sortMode.value !== 'custom') sortMode.value = 'custom';
  const baseIdx = (currentPage.value - 1) * pageSize;
  const allIds = filteredNotes.value.map(n => n.id);
  const newPageIds = draggableList.value.map(n => n.id);
  allIds.splice(baseIdx, newPageIds.length, ...newPageIds);
  await store.reorderNotes(allIds);
}

watch(filteredNotes, () => { currentPage.value = 1; selectedIndex.value = 0; });
watch(currentPage, () => { selectedIndex.value = 0; });
watch(pagedNotes, (list) => {
  if (selectedIndex.value >= list.length) selectedIndex.value = Math.max(0, list.length - 1);
});
watch(selectedIndex, () => {
  nextTick(() => {
    const grid = getGridElement();
    if (!grid) return;
    const cards = grid.querySelectorAll('.note-card');
    const el = cards[selectedIndex.value];
    if (el) {
      el.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
        inline: 'nearest'
      });
    }
  });
});
watch(sortMode, (v) => { localStorage.setItem('notes-sort', v); });
watch(viewMode, (v) => { localStorage.setItem('notes-view-mode', v); });

function selectCategory(id) {
  activeCategory.value = id;
  searchResults.value = null;
  searchQuery.value = '';
  isTrashView.value = false;
  activeTag.value = null;
  sidebarOpen.value = false;
}

function selectTag(tag) {
  activeTag.value = tag;
  isTrashView.value = false;
  sidebarOpen.value = false;
}

async function handleSearch(q) {
  searchQuery.value = q;
  if (!q) { searchResults.value = null; return; }
  searchResults.value = await store.search(q);
}

function clearSearch() {
  searchQuery.value = '';
  searchResults.value = null;
  searchBarRef.value?.clear?.();
}

async function handleNewNote() {
  try {
    const note = await store.createNote({
      title: '无标题',
      content: '',
      categoryId: activeCategory.value
    });
    if (note) router.push(`/note/${note.id}?new=1`);
  } catch (e) {
    auth.logout();
    router.replace('/login');
  }
}

function openNote(note) {
  // 只读类型 (html/pdf/image/txt) 进查看器, rich 进编辑器
  if (note && VIEW_TYPES.includes(note.type)) {
    router.push(`/view/${note.id}`);
  } else {
    router.push(`/note/${note.id ?? note}`);
  }
}

async function handleMoveNote(id, categoryId) {
  await store.updateNote(id, { categoryId });
}

async function handleDropNote(id, categoryId) {
  const note = store.notes.find(n => n.id === id);
  if (!note || note.categoryId === categoryId) return;
  await store.updateNote(id, { categoryId });
}

async function handleTrashNote(id) {
  await store.deleteNote(id);
}

async function handlePinNote(note) {
  await store.updateNote(note.id, { pinned: !note.pinned });
}

// 只读嵌入类型: html/pdf/image/txt 都进 /view/:id 查看, 其余进编辑器
const VIEW_TYPES = ['html', 'pdf', 'image', 'txt'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function fileExt(name) {
  return String(name || '').split('.').pop().toLowerCase();
}

function titleFromFile(name) {
  return String(name || '').replace(/\.[^.]+$/, '') || '无标题';
}

// 单文件导入: 按扩展名分流到不同的笔记形态
async function importOneFile(file) {
  const ext = fileExt(file.name);
  if (ext === 'docx') {
    // Word: 服务端 mammoth 转 HTML, 存为 html 只读笔记
    const data = await store.importDocx(file);
    if (!data?.html) throw new Error('DOCX 解析失败');
    return store.createNote({
      title: data.title || titleFromFile(file.name),
      content: data.html,
      type: 'html',
      categoryId: activeCategory.value
    });
  }
  if (ext === 'pdf' || IMAGE_EXTS.includes(ext)) {
    // PDF/图片: 先上传拿 URL, content 存 URL, type 标记形态 (查看器按类型渲染)
    const data = await store.uploadFile(file);
    if (!data?.url) throw new Error('上传失败');
    return store.createNote({
      title: titleFromFile(file.name),
      content: data.url,
      type: ext === 'pdf' ? 'pdf' : 'image',
      categoryId: activeCategory.value
    });
  }
  if (ext === 'txt') {
    const text = await file.text();
    return store.createNote({
      title: titleFromFile(file.name),
      content: text,
      type: 'txt',
      categoryId: activeCategory.value
    });
  }
  if (/\.html?$/i.test(file.name)) {
    const { title, html } = await readHtmlFile(file);
    return store.createNote({
      title,
      content: html,
      type: 'html',
      categoryId: activeCategory.value
    });
  }
  // 默认按 Markdown 处理, 转 HTML 存富文本笔记
  const { title, html } = await readMarkdownFile(file);
  return store.createNote({
    title,
    content: html,
    categoryId: activeCategory.value
  });
}

async function handleImport(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  let lastNote = null;
  let failed = 0;
  for (const file of files) {
    try {
      lastNote = await importOneFile(file);
    } catch (err) {
      failed++;
      console.error('导入失败:', file.name, err);
    }
  }
  e.target.value = '';
  if (failed) alert(`${failed} 个文件导入失败`);
  // 单文件导入后跳转: 只读类型进查看器, rich 进编辑器
  if (lastNote && files.length === 1) {
    openNote(lastNote);
  }
}

async function handleDeleteNote(id) {
  pendingDeleteNoteId.value = id;
  showDeleteNoteModal.value = true;
}

async function confirmDeleteNote() {
  showDeleteNoteModal.value = false;
  await store.deleteNote(pendingDeleteNoteId.value);
  pendingDeleteNoteId.value = null;
}

async function openPreview(note) {
  showPreviewModal.value = true;
  previewLoading.value = true;
  panelWidth.value = null;   // 每次打开先回基准宽, 等 iframe 报来天然宽再按需加宽
  panelWidthLatch = 0;       // 锁存归零, 新笔记重新按需加宽 (否则会沿用上一篇的宽)
  previewNote.value = { ...note, content: note.content || '' };
  try {
    const res = await fetch(`/api/notes/${note.id}`, { headers: auth.headers });
    if (res.status === 401) {
      auth.logout();
      router.replace('/login');
      return;
    }
    if (res.ok) {
      previewNote.value = await res.json();
    }
  } finally {
    previewLoading.value = false;
  }
}

function closePreview() {
  showPreviewModal.value = false;
  previewNote.value = null;
  previewLoading.value = false;
}

function handleCreateCategory() {
  showCategoryModal.value = true;
}

async function confirmCreateCategory(name) {
  showCategoryModal.value = false;
  await store.createCategory(name, '');
}

async function handleUpdateCategory(id, data) {
  await store.updateCategory(id, data);
}

function handleDeleteCategory(id) {
  pendingDeleteCategoryId.value = id;
  showDeleteCategoryModal.value = true;
}

async function confirmDeleteCategory() {
  showDeleteCategoryModal.value = false;
  const id = pendingDeleteCategoryId.value;
  await store.deleteCategory(id);
  if (activeCategory.value === id) activeCategory.value = null;
  pendingDeleteCategoryId.value = null;
}

function handleLogout() {
  auth.logout();
  router.replace('/login');
}

function openTrash() {
  isTrashView.value = true;
  activeCategory.value = '__trash__';
  searchResults.value = null;
  searchQuery.value = '';
  sidebarOpen.value = false;
}

function leaveTrash() {
  isTrashView.value = false;
  selectCategory(null);
}

async function handleRestore(id) {
  await store.restoreNote(id);
}

async function handlePermanentDelete(id) {
  pendingPermDeleteId.value = id;
  showPermDeleteModal.value = true;
}

async function confirmPermDelete() {
  showPermDeleteModal.value = false;
  await store.permanentDelete(pendingPermDeleteId.value);
  pendingPermDeleteId.value = null;
}

async function handleEmptyTrash() {
  if (store.trashNotes.length === 0) return;
  showEmptyTrashModal.value = true;
}

async function confirmEmptyTrash() {
  showEmptyTrashModal.value = false;
  await store.emptyTrash();
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--ivory);
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  flex-shrink: 0;
}

.btn-new {
  padding: 7px 16px;
  background: var(--clay);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: var(--transition);
}

.btn-new:hover {
  background: var(--clay-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(197, 143, 109, 0.25);
}

.btn-new:active {
  transform: translateY(0);
}

.sort-dropdown {
  position: relative;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--input-bg);
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--charcoal);
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.sort-btn:hover {
  border-color: var(--clay);
  background: var(--input-bg-focus);
}

.sort-btn svg {
  color: var(--wood);
  transition: transform 0.2s;
}

.sort-btn.open svg {
  transform: rotate(180deg);
}

.sort-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--card-bg-hover);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px;
  box-shadow: var(--shadow-md);
  z-index: 50;
  min-width: 130px;
}

.sort-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--charcoal);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.sort-option:hover {
  background: var(--bg-hover);
}

.sort-option.active {
  color: var(--clay);
  font-weight: 600;
  background: var(--bg-active);
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 3px;
  background: var(--input-bg);
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.view-btn {
  width: 26px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--wood);
  cursor: pointer;
  transition: var(--transition);
  padding: 0;
}

.view-btn:hover {
  color: var(--clay);
  background: var(--bg-hover);
}

.view-btn.active {
  color: var(--clay);
  background: var(--card-bg-hover);
  box-shadow: 0 1px 4px rgba(47, 42, 37, 0.08);
}

.btn-import {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 32px;
  height: 32px;
  background: var(--input-bg);
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
  padding: 0;
}

/* 宽屏: 展开"导入"文字提升可发现性 (现已支持 6 种文件类型);
   窄屏回退纯图标圆形, 不挤压顶栏 */
.btn-import-label {
  display: none;
}

@media (min-width: 769px) {
  .btn-import {
    width: auto;
    height: 32px;
    padding: 0 14px;
  }

  .btn-import-label {
    display: inline;
    font-size: 13px;
    font-weight: 500;
  }
}

.btn-import:hover {
  border-color: var(--clay);
  color: var(--clay);
  background: var(--input-bg-focus);
}

.notes-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  align-content: start;
  overflow-y: auto;
  scrollbar-width: none;
  padding-top: 6px;
  margin-top: -6px;
}

.notes-list {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-content: start;
  overflow-y: auto;
  scrollbar-width: none;
  padding-top: 6px;
  margin-top: -6px;
}

.notes-grid-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.notes-grid::-webkit-scrollbar,
.notes-list::-webkit-scrollbar {
  width: 0;
  display: none;
}

.card-drag-ghost {
  opacity: 0.35;
  background: var(--bg-hover) !important;
  border: 2px dashed var(--clay) !important;
}

.card-drag-chosen {
  cursor: grabbing;
}

.card-dragging {
  opacity: 0.85;
  transform: rotate(1.5deg);
  box-shadow: 0 12px 36px rgba(47, 42, 37, 0.18);
}

:global(body.is-dragging-note) {
  cursor: grabbing;
}

.notes-grid :deep(.note-card.is-focused) {
  border-left-color: var(--clay);
  border-left-width: 3px;
  background: var(--card-bg-hover);
  box-shadow: 0 0 0 3px rgba(197, 143, 109, 0.25), var(--shadow-lg);
  transform: translateY(-3px) scale(1.02);
  z-index: 10;
  position: relative;
}

.notes-list :deep(.note-card) {
  min-height: 46px;
  padding: 9px 14px;
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(280px, 1fr) auto;
  align-items: center;
  column-gap: 18px;
}

.notes-list :deep(.note-card:hover) {
  transform: translateY(-1px);
}

.notes-list :deep(.note-card.is-focused) {
  border-left-color: var(--clay);
  border-left-width: 3px;
  background: var(--card-bg-hover);
  box-shadow: 0 0 0 3px rgba(197, 143, 109, 0.2), var(--shadow-md);
  transform: translateY(-1px);
  z-index: 10;
  position: relative;
}

.notes-list :deep(.card-header) {
  display: contents;
}

.notes-list :deep(h3) {
  font-size: 14px;
  min-width: 0;
  grid-column: 1;
  grid-row: 1;
}

.notes-list :deep(.card-meta) {
  grid-column: 2;
  grid-row: 1;
  margin: 0;
  min-width: 0;
  overflow: visible;
  justify-content: flex-start;
}

.notes-list :deep(.card-actions) {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}

.notes-list :deep(.card-snippet) {
  grid-column: 1 / 3;
  margin-top: 0;
  max-width: none;
  display: none;
}

.notes-list :deep(.card-tag),
.notes-list :deep(.card-category) {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: var(--wood);
}

.empty-state button {
  margin-top: 16px;
  padding: 10px 24px;
  background: var(--clay);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-weight: 600;
  transition: var(--transition);
}

.empty-state button:hover {
  background: var(--clay-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(197, 143, 109, 0.25);
}

.empty-state .empty-action {
  background: none;
  border: 1.5px solid var(--sand);
  color: var(--wood);
}

.empty-state .empty-action:hover {
  background: var(--bg-hover);
  border-color: var(--clay);
  color: var(--clay);
  box-shadow: none;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  background: var(--input-bg);
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  padding: 4px 6px;
}

.page-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: var(--transition);
  color: var(--clay);
  padding: 0;
}

.page-btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.page-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  color: var(--wood);
}

.page-info {
  font-size: 13px;
  color: var(--charcoal);
  font-weight: 500;
  white-space: nowrap;
  padding: 0 6px;
}

.page-sep {
  color: var(--sand);
  margin: 0 2px;
}

.trash-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--charcoal);
}

.btn-empty-trash {
  padding: 7px 16px;
  background: none;
  border: 1.5px solid #c83232;
  color: #c83232;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-back-notes {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 7px 16px;
  background: none;
  border: 1.5px solid var(--sand, #e0dace);
  color: var(--wood, #8a7d6a);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-back-notes:hover {
  color: var(--charcoal, #2c2c2c);
  border-color: var(--charcoal, #2c2c2c);
}

.btn-empty-trash:hover {
  background: rgba(200, 50, 50, 0.06);
}

.trash-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.trash-card:hover {
  background: var(--card-bg-hover);
  box-shadow: var(--shadow-sm);
}

.trash-card-info {
  flex: 1;
  min-width: 0;
}

.trash-card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--charcoal);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-card-time {
  font-size: 12px;
  color: var(--wood);
}

.trash-card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-restore {
  padding: 5px 14px;
  background: none;
  border: 1.5px solid var(--sage-dark);
  color: var(--sage-dark);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.btn-restore:hover {
  background: rgba(166, 181, 163, 0.1);
}

.btn-perm-delete {
  padding: 5px 14px;
  background: none;
  border: 1.5px solid #c83232;
  color: #c83232;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.btn-perm-delete:hover {
  background: rgba(200, 50, 50, 0.06);
}

.btn-menu {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--charcoal);
  padding: 6px;
  border-radius: var(--radius-sm);
}

.btn-menu:hover {
  background: var(--bg-hover);
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(47, 42, 37, 0.36);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.preview-panel {
  width: min(900px, 92vw);
  /* 显式 height (而非仅 max-height): flex 列容器高度为 auto 时, 子 iframe 的 flex:1
     无"剩余空间"可分配, 会停在自身 min-height(360px), 面板永远长不到设定高度 ——
     这是"改了 max-height 却没变高"的根因。给定高度后 iframe 才真正撑满。
     短笔记的留白处透出的是面板毛玻璃 (iframe 透明), 不会出现白块。 */
  height: min(912px, 92vh);
  display: flex;
  flex-direction: column;
  /* 半透明毛玻璃: 暖色面板透出身后模糊的内容, backdrop-filter 做磨砂。
     rich/MD 的 iframe 文档透明, 让这层毛玻璃透上来; HTML 文档自带背景则盖住。 */
  background: var(--surface);
  backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 26px 16px;
  border-bottom: 1px solid var(--border);
}

.preview-kicker {
  font-size: 12px;
  color: var(--wood);
  margin-bottom: 4px;
}

.preview-header h3 {
  font-size: 20px;
  line-height: 1.35;
  color: var(--charcoal);
}

.preview-close {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--sand);
  border-radius: 50%;
  background: var(--input-bg);
  color: var(--wood);
  cursor: pointer;
  transition: var(--transition);
}

.preview-close:hover {
  color: var(--charcoal);
  border-color: var(--charcoal);
}

.preview-loading {
  padding: 48px;
  color: var(--wood);
  text-align: center;
}

.preview-frame {
  flex: 1;
  width: 100%;
  min-height: 360px;
  border: 0;
  /* iframe 透明: rich/MD 文档 html/body 已设透明, 让面板毛玻璃透上来;
     HTML 文档自带背景则照常盖住。不能铺白底, 否则毛玻璃失效。 */
  background: transparent;
}

.preview-content {
  padding: 24px 28px 34px;
  overflow: auto;
  color: var(--charcoal);
  line-height: 1.75;
  scrollbar-width: none;
}

.preview-content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.preview-content :deep(img) {
  max-width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.preview-content :deep(p),
.preview-content :deep(ul),
.preview-content :deep(ol),
.preview-content :deep(blockquote),
.preview-content :deep(pre),
.preview-content :deep(table) {
  margin-bottom: 1em;
}

.preview-content :deep(pre) {
  overflow: auto;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
}

.preview-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.preview-content :deep(td),
.preview-content :deep(th) {
  border: 1px solid var(--sand);
  padding: 8px 10px;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 16px;
  }

  .btn-menu {
    display: flex;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(47, 42, 37, 0.3);
    backdrop-filter: blur(4px);
    z-index: 99;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  .sidebar-backdrop.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .notes-grid {
    grid-template-columns: 1fr;
  }

  .notes-list :deep(.note-card) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .notes-list :deep(.card-meta) {
    grid-column: 1 / -1;
    margin-top: 4px;
  }

  .notes-list :deep(.card-actions) {
    grid-column: 2;
  }

  .top-bar {
    flex-wrap: wrap;
    gap: 10px;
  }

  .trash-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .preview-overlay {
    padding: 12px;
  }

  .preview-panel {
    width: 100%;
    height: 90vh;
  }

  .preview-header {
    padding: 18px 18px 12px;
  }

  .preview-content {
    padding: 18px;
  }
}

.pwd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.pwd-panel {
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-lg);
  width: 340px;
}

.pwd-panel h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--charcoal);
  margin-bottom: 20px;
}

.pwd-input {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  background: var(--input-bg);
  color: var(--charcoal);
  margin-bottom: 12px;
  transition: var(--transition);
}

.pwd-input:focus {
  border-color: var(--clay);
  background: var(--input-bg-focus);
}

.pwd-error {
  color: #c83232;
  font-size: 13px;
  margin-bottom: 12px;
}

.pwd-success {
  color: var(--sage-dark);
  font-size: 13px;
  margin-bottom: 12px;
}

.pwd-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.pwd-actions .btn-cancel {
  flex: 1;
  padding: 9px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 13px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.pwd-actions .btn-cancel:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.pwd-actions .btn-confirm {
  flex: 1;
  padding: 9px;
  background: var(--clay);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.pwd-actions .btn-confirm:hover {
  background: var(--clay-dark);
}
</style>
