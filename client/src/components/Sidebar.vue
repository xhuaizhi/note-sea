<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <img src="/logo-text.png" alt="Note Sea" class="logo-text" />
    </div>

    <nav class="sidebar-nav">
      <div
        class="nav-item"
        :class="{ active: !activeCategory, 'drop-target': dropTarget === '__all__' }"
        @click="$emit('selectCategory', null)"
        @dragover.prevent="onDragOver($event, '__all__')"
        @dragenter.prevent="onDragEnter('__all__')"
        @dragleave="onDragLeave('__all__')"
        @drop.prevent="onDrop($event, '__all__')"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </span>
        <span>全部笔记</span>
      </div>

      <div
        class="nav-item trash-item"
        :class="{ active: activeCategory === '__trash__', 'drop-target': dropTarget === '__trash__', 'drop-target-danger': dropTarget === '__trash__' }"
        @click="$emit('openTrash')"
        @dragover.prevent="onDragOver($event, '__trash__')"
        @dragenter.prevent="onDragEnter('__trash__')"
        @dragleave="onDragLeave('__trash__')"
        @drop.prevent="onDrop($event, '__trash__')"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </span>
        <span>回收站</span>
        <span v-if="trashCount > 0" class="trash-count">{{ trashCount }}</span>
      </div>

      <div class="nav-section">
        <div class="nav-section-header">
          <span>分类</span>
          <button class="btn-icon" @click="$emit('createCategory')" title="新建分类">+</button>
        </div>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="nav-item"
          :class="{ active: activeCategory === cat.id, 'drop-target': dropTarget === cat.id }"
          @click="$emit('selectCategory', cat.id)"
          @contextmenu.prevent="openMenu(cat, $event)"
          @dragover.prevent="onDragOver($event, cat.id)"
          @dragenter.prevent="onDragEnter(cat.id)"
          @dragleave="onDragLeave(cat.id)"
          @drop.prevent="onDrop($event, cat.id)"
        >
          <span class="nav-icon" @click.stop="startIconEdit(cat)">
            <svg v-if="!cat.icon || cat.icon === '📁' || iconSvgs[cat.icon]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="iconSvgs[cat.icon] || iconSvgs['folder']"/>
            </svg>
            <span v-else class="emoji-icon">{{ cat.icon }}</span>
          </span>
          <span v-if="editingId !== cat.id" class="nav-text">{{ cat.name }}</span>
          <input
            v-else
            ref="renameInput"
            v-model="editingName"
            class="rename-input"
            @blur="finishRename(cat.id)"
            @keydown.enter="finishRename(cat.id)"
            @keydown.escape="cancelRename"
            @click.stop
          />
          <button
            v-if="editingId !== cat.id"
            class="btn-more"
            @click.stop="openMenu(cat, $event)"
            title="更多"
          >···</button>
        </div>
      </div>

      <div class="nav-section" v-if="tags.length > 0">
        <div class="nav-section-header">
          <span>标签</span>
        </div>
        <div class="tags-wrap">
          <button
            v-for="tag in tags"
            :key="tag.name"
            class="sidebar-tag"
            :class="{ active: activeTag === tag.name }"
            @click="$emit('selectTag', activeTag === tag.name ? null : tag.name)"
          >{{ tag.name }} <span class="tag-count">{{ tag.count }}</span></button>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-actions">
        <button class="btn-footer" @click="$emit('toggleTheme')" :title="isDark ? '切换亮色' : '切换暗色'">
          <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        </button>
        <button class="btn-footer" @click="$emit('openSettings')" title="外观设置">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22a10 10 0 100-20 10 10 0 000 20z"/>
            <path d="M7.5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10.5 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM15.5 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
            <path d="M13.5 17.5c.8.7 2 .1 2-1 0-.8-.7-1.5-1.5-1.5h-1.2c-1 0-1.8.8-1.8 1.8 0 .7.5 1.2 1.2 1.2h1.3z"/>
          </svg>
        </button>
        <button class="btn-footer" @click="$emit('openShortcuts')" title="快捷键">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h.01M10 16h.01M14 16h.01M18 16h.01"/>
          </svg>
        </button>
        <button class="btn-footer" @click="$emit('changePassword')" title="修改密码">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </button>
      </div>
      <button class="btn-logout" @click="$emit('logout')">退出登录</button>
    </div>

    <Teleport to="body">
      <div v-if="menuVisible" class="menu-backdrop" @click="closeMenu"></div>
      <div v-if="menuVisible" class="context-menu" ref="contextMenuRef" :style="menuStyle" @click.stop>
        <button @click="startRename">重命名</button>
        <button @click="showIconPicker = true">修改图标</button>
        <button class="danger" @click="handleDelete">删除</button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showIconPicker" class="icon-picker-overlay" @click="showIconPicker = false">
        <div class="icon-picker-panel" @click.stop>
          <p class="icon-picker-title">选择图标</p>
          <div class="icon-grid">
            <button
              v-for="item in emojis"
              :key="item.icon"
              class="icon-item"
              :title="item.label"
              @click="selectIcon(item.icon)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="iconSvgs[item.icon]"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showShortcuts" class="shortcuts-overlay" @click="$emit('closeShortcuts')">
        <div class="shortcuts-panel" @click.stop>
          <div class="shortcuts-header">
            <h3>快捷键</h3>
            <button class="btn-close" @click="$emit('closeShortcuts')">×</button>
          </div>
          <div class="shortcuts-content">
            <div class="shortcuts-section">
              <h4>全局操作</h4>
              <div class="shortcut-item">
                <span class="shortcut-desc">新建笔记</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>N</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">搜索笔记</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>K</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">查看快捷键</span>
                <div class="shortcut-keys">
                  <kbd>?</kbd>
                </div>
              </div>
            </div>

            <div class="shortcuts-section">
              <h4>笔记导航</h4>
              <div class="shortcut-item">
                <span class="shortcut-desc">移动选择</span>
                <div class="shortcut-keys">
                  <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">打开笔记</span>
                <div class="shortcut-keys">
                  <kbd>Enter</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">快速预览</span>
                <div class="shortcut-keys">
                  <kbd>Space</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">删除笔记</span>
                <div class="shortcut-keys">
                  <kbd>Delete</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">翻页</span>
                <div class="shortcut-keys">
                  <kbd>PageUp</kbd><span>/</span><kbd>PageDown</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">首尾页</span>
                <div class="shortcut-keys">
                  <kbd>Home</kbd><span>/</span><kbd>End</kbd>
                </div>
              </div>
            </div>

            <div class="shortcuts-section">
              <h4>编辑器</h4>
              <div class="shortcut-item">
                <span class="shortcut-desc">保存笔记</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>S</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">加粗</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>B</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">斜体</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>I</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">撤销</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>Z</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">重做</span>
                <div class="shortcut-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>Z</kbd>
                </div>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">返回主页</span>
                <div class="shortcut-keys">
                  <kbd>Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, nextTick, toRef } from 'vue';
import { useEscClose } from '../composables/useEscClose';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  activeCategory: { type: String, default: null },
  trashCount: { type: Number, default: 0 },
  tags: { type: Array, default: () => [] },
  activeTag: { type: String, default: null },
  isDark: { type: Boolean, default: false },
  showShortcuts: { type: Boolean, default: false }
});

const emit = defineEmits(['selectCategory', 'createCategory', 'deleteCategory', 'updateCategory', 'logout', 'openTrash', 'selectTag', 'toggleTheme', 'changePassword', 'openSettings', 'openShortcuts', 'closeShortcuts', 'dropNote', 'trashNote']);

const editingId = ref(null);
const editingName = ref('');
const renameInput = ref(null);
const menuVisible = ref(false);
const menuStyle = ref({});
const menuCat = ref(null);
const contextMenuRef = ref(null);
const showIconPicker = ref(false);
const dropTarget = ref(null);
let leaveTimer = null;

useEscClose(menuVisible, closeMenu);
useEscClose(showIconPicker, () => { showIconPicker.value = false; });

function getDragNoteId(e) {
  const dt = e.dataTransfer;
  return dt?.getData('application/x-note-id') || dt?.getData('text/plain') || '';
}

function onDragOver(e, target) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = target === '__trash__' ? 'move' : 'move';
}

function onDragEnter(target) {
  clearTimeout(leaveTimer);
  dropTarget.value = target;
}

function onDragLeave(target) {
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    if (dropTarget.value === target) dropTarget.value = null;
  }, 60);
}

function onDrop(e, target) {
  dropTarget.value = null;
  const id = getDragNoteId(e);
  if (!id) return;
  if (target === '__trash__') {
    emit('trashNote', id);
  } else if (target === '__all__') {
    emit('dropNote', id, null);
  } else {
    emit('dropNote', id, target);
  }
}

const emojis = [
  { icon: 'folder', label: '文件夹' },
  { icon: 'folder-open', label: '打开文件夹' },
  { icon: 'file', label: '文件' },
  { icon: 'file-text', label: '文档' },
  { icon: 'bookmark', label: '书签' },
  { icon: 'tag', label: '标签' },
  { icon: 'star', label: '星标' },
  { icon: 'heart', label: '喜欢' },
  { icon: 'lightbulb', label: '想法' },
  { icon: 'target', label: '目标' },
  { icon: 'rocket', label: '项目' },
  { icon: 'code', label: '代码' },
  { icon: 'terminal', label: '终端' },
  { icon: 'database', label: '数据库' },
  { icon: 'server', label: '服务器' },
  { icon: 'cloud', label: '云' },
  { icon: 'lock', label: '安全' },
  { icon: 'key', label: '密钥' },
  { icon: 'shield', label: '防护' },
  { icon: 'globe', label: '网络' },
  { icon: 'mail', label: '邮件' },
  { icon: 'message', label: '消息' },
  { icon: 'bell', label: '通知' },
  { icon: 'calendar', label: '日历' },
  { icon: 'clock', label: '时间' },
  { icon: 'chart', label: '图表' },
  { icon: 'trending', label: '趋势' },
  { icon: 'activity', label: '活动' },
  { icon: 'briefcase', label: '工作' },
  { icon: 'home', label: '主页' },
  { icon: 'user', label: '用户' },
  { icon: 'users', label: '团队' },
  { icon: 'book', label: '书籍' },
  { icon: 'graduation', label: '学习' },
  { icon: 'microscope', label: '研究' },
  { icon: 'palette', label: '设计' },
  { icon: 'music', label: '音乐' },
  { icon: 'camera', label: '照片' },
  { icon: 'gift', label: '礼物' }
];

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

function openMenu(cat, e) {
  menuCat.value = cat;
  menuStyle.value = { top: e.clientY + 'px', left: e.clientX + 'px' };
  menuVisible.value = true;
  nextTick(() => {
    const el = contextMenuRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let x = e.clientX;
    let y = e.clientY;
    if (x + rect.width + pad > window.innerWidth) {
      x = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (y + rect.height + pad > window.innerHeight) {
      y = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    menuStyle.value = { top: y + 'px', left: x + 'px' };
  });
}

function closeMenu() {
  menuVisible.value = false;
  menuCat.value = null;
}

function startRename() {
  editingId.value = menuCat.value.id;
  editingName.value = menuCat.value.name;
  closeMenu();
  nextTick(() => renameInput.value?.focus());
}

function finishRename(id) {
  if (editingId.value !== id) return;
  editingId.value = null;
  const cat = props.categories.find(c => c.id === id);
  const newName = editingName.value.trim();
  if (newName && newName !== cat?.name) {
    emit('updateCategory', id, { name: newName });
  }
}

function cancelRename() {
  editingId.value = null;
}

function startIconEdit(cat) {
  menuCat.value = cat;
  showIconPicker.value = true;
}

function selectIcon(iconKey) {
  emit('updateCategory', menuCat.value.id, { icon: iconKey });
  showIconPicker.value = false;
  menuCat.value = null;
}

function handleDelete() {
  const id = menuCat.value.id;
  closeMenu();
  emit('deleteCategory', id);
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--surface);
  backdrop-filter: blur(16px);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 24px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.logo-text {
  width: 160px;
  height: 50px;
  object-fit: contain;
}

.sidebar-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--charcoal);
  font-family: 'Poppins', sans-serif;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  flex: 1;
  padding: 0 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  color: var(--charcoal);
  transition: var(--transition);
  position: relative;
}

.nav-item:hover {
  background: var(--bg-hover);
}

.nav-item.active {
  background: var(--bg-active);
  font-weight: 600;
}

.nav-item.drop-target {
  background: rgba(197, 143, 109, 0.18);
  box-shadow: inset 0 0 0 2px var(--clay);
  transform: scale(1.02);
}

.nav-item.drop-target.drop-target-danger {
  background: rgba(200, 50, 50, 0.12);
  box-shadow: inset 0 0 0 2px #c83232;
}

.nav-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px;
  color: var(--wood);
}

.nav-icon:hover {
  background: var(--bg-active);
}

.nav-item.active .nav-icon {
  color: var(--clay);
}

.emoji-icon {
  font-size: 16px;
}

.nav-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename-input {
  flex: 1;
  border: 1.5px solid var(--clay);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 13px;
  outline: none;
  background: var(--input-bg-focus);
  color: var(--charcoal);
}

.nav-section {
  margin-top: 20px;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 14px;
}

.sidebar-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(201, 213, 198, 0.2);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--wood);
  cursor: pointer;
  transition: var(--transition);
}

.sidebar-tag:hover {
  background: rgba(201, 213, 198, 0.4);
  color: var(--charcoal);
}

.sidebar-tag.active {
  background: var(--bg-active);
  border-color: var(--sage-dark);
  color: var(--charcoal);
  font-weight: 500;
}

.tag-count {
  font-size: 10px;
  opacity: 0.6;
}

.nav-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 14px;
  font-size: 11px;
  color: var(--wood);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--wood);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  transition: var(--transition);
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--clay);
}

.btn-more {
  display: none;
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: var(--wood);
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: -1px;
}

.nav-item:hover .btn-more {
  display: block;
}

.btn-more:hover {
  background: var(--bg-active);
  color: var(--charcoal);
}

.sidebar-footer {
  padding: 14px 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trash-item {
  color: var(--wood);
}

.trash-count {
  margin-left: auto;
  font-size: 11px;
  background: var(--sand);
  color: var(--wood);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-weight: 600;
}

.btn-logout {
  width: 100%;
  padding: 8px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 13px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.btn-logout:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
  background: var(--bg-hover);
}

.footer-actions {
  display: flex;
  gap: 6px;
  padding: 0 4px;
}

.btn-footer {
  flex: 1;
  padding: 7px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
}

.btn-footer:hover {
  background: var(--bg-hover);
  border-color: var(--clay);
}

.icon-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.icon-picker-panel {
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
}

.icon-picker-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--charcoal);
  margin-bottom: 16px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 8px;
  max-width: 480px;
}

.icon-item {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--wood);
}

.icon-item:hover {
  background: var(--bg-hover);
  border-color: var(--clay);
  color: var(--clay);
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    z-index: 100;
    width: 260px;
  }

  .sidebar.open {
    transform: translateX(0);
  }
}
</style>

<style>
.context-menu {
  position: fixed;
  background: var(--card-bg-hover);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px;
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  min-width: 120px;
}

.context-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 14px;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  color: var(--charcoal);
  transition: background 0.15s;
}

.context-menu button:hover {
  background: var(--bg-hover);
}

.context-menu button.danger {
  color: #c83232;
}

.context-menu button.danger:hover {
  background: rgba(200, 50, 50, 0.08);
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.shortcuts-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.shortcuts-panel {
  background: var(--card-bg-hover);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  width: min(860px, calc(100vw - 48px));
  max-height: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px 12px;
  border-bottom: 1px solid var(--border);
}

.shortcuts-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--charcoal);
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: var(--wood);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.btn-close:hover {
  background: var(--bg-hover);
  color: var(--charcoal);
}

.shortcuts-content {
  padding: 14px 18px 18px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 0.9fr 1.12fr 1fr;
  gap: 12px;
}

.shortcuts-section {
  min-width: 0;
  padding: 10px 11px;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.shortcuts-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--wood);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 6px 0;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 29px;
  padding: 4px 0;
  gap: 8px;
  border-top: 1px solid rgba(47, 42, 37, 0.05);
}

.shortcut-item:first-of-type {
  border-top: 0;
}

.shortcut-desc {
  font-size: 12px;
  color: var(--charcoal);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.shortcut-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 23px;
  height: 23px;
  padding: 0 6px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--charcoal);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 4px rgba(47, 42, 37, 0.06);
}

.shortcut-keys span {
  font-size: 12px;
  color: var(--wood);
  font-weight: 500;
}

@media (max-width: 768px) {
  .shortcuts-panel {
    width: calc(100vw - 24px);
  }

  .shortcuts-header {
    padding: 14px 16px 10px;
  }

  .shortcuts-content {
    padding: 12px;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .shortcuts-section {
    padding: 9px 10px;
  }

  .shortcut-item {
    min-height: 28px;
    padding: 3px 0;
  }

  .shortcut-desc {
    font-size: 12px;
  }

  .shortcut-keys kbd {
    height: 22px;
    min-width: 22px;
    padding: 0 6px;
    font-size: 10px;
  }
}

</style>
