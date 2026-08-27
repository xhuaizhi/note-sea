<template>
  <div class="editor-page" ref="pageRef">
    <header class="editor-header">
      <button class="btn-back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回
      </button>
      <div class="header-right">
        <div class="category-dropdown" v-if="store.currentNote" ref="catDropdownRef">
          <button class="cat-btn" @click="catOpen = !catOpen">
            <svg v-if="!categoryIcon || categoryIcon === '📁' || iconSvgs[categoryIcon]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="categoryIcon && iconSvgs[categoryIcon] ? iconSvgs[categoryIcon] : iconSvgs['file-text']"/>
            </svg>
            <span v-else class="cat-emoji">{{ categoryIcon }}</span>
            <span class="cat-name">{{ categoryName }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="cat-menu" v-if="catOpen">
            <button
              class="cat-option"
              :class="{ active: !noteCategory }"
              @click="selectCategory(null)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="iconSvgs['file-text']"/>
              </svg>
              未分类
            </button>
            <button
              v-for="cat in store.categories"
              :key="cat.id"
              class="cat-option"
              :class="{ active: noteCategory === cat.id }"
              @click="selectCategory(cat.id)"
            >
              <svg v-if="!cat.icon || cat.icon === '📁' || iconSvgs[cat.icon]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="iconSvgs[cat.icon] || iconSvgs['folder']"/>
              </svg>
              <span v-else class="cat-emoji">{{ cat.icon }}</span>
              {{ cat.name }}
            </button>
          </div>
        </div>
        <span class="scroll-progress" v-if="scrollPercent > 0">{{ scrollPercent }}%</span>
        <div class="paper-toggle">
          <button
            v-for="paper in paperModes"
            :key="paper.value"
            class="paper-btn"
            :class="{ active: pagePaper === paper.value }"
            :title="paper.label"
            @click="setPagePaper(paper.value)"
          >{{ paper.short }}</button>
        </div>
        <div class="width-toggle">
          <button
            v-for="mode in widthModes"
            :key="mode.value"
            class="width-btn"
            :class="{ active: pageWidth === mode.value }"
            :title="mode.label"
            @click="setPageWidth(mode.value)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect :x="mode.x" y="3" :width="mode.w" height="2" rx="1" fill="currentColor" stroke="none"/>
              <rect :x="mode.x" y="7" :width="mode.w" height="2" rx="1" fill="currentColor" stroke="none"/>
              <rect :x="mode.x" y="11" :width="mode.w" height="2" rx="1" fill="currentColor" stroke="none"/>
            </svg>
          </button>
        </div>
        <button class="btn-export" @click="exportMd" title="导出 Markdown">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
        <button class="btn-ai" @click="aiStore.panelOpen = !aiStore.panelOpen" :class="{ active: aiStore.panelOpen }" title="AI 助手">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </button>
        <span class="save-status" :class="saveStatusClass">{{ saveStatus }}</span>
      </div>
    </header>

    <div v-if="store.loading" class="loading">加载中...</div>
    <div v-else-if="store.currentNote" class="editor-layout" ref="layoutRef">
      <aside class="toc-panel">
        <p class="toc-title">目录</p>
        <nav class="toc-nav" v-if="tocItems.length > 0">
          <a
            v-for="(item, idx) in tocItems"
            :key="idx"
            class="toc-item"
            :class="{ active: activeHeading === idx, ['level-' + item.level]: true }"
            @click="scrollToHeading(idx)"
          >{{ item.text }}</a>
        </nav>
        <p v-else class="toc-empty">暂无标题</p>
      </aside>
      <div class="editor-body" :class="['width-' + pageWidth, 'paper-' + pagePaper]" ref="editorBodyRef" @scroll="onScroll">
        <input
          v-model="title"
          class="title-input"
          placeholder="无标题"
          @blur="saveTitle"
        />
        <TagInput v-model="noteTags" @update:modelValue="saveTags" />
        <div
          class="editor-toolbar"
          :class="{ 'is-dragging': toolbarDragging }"
          :style="toolbarStyle"
          ref="toolbarRef"
          v-if="editor"
        >
          <button class="toolbar-drag-handle" @pointerdown="startToolbarDrag" @dblclick="resetToolbarPosition" title="拖动工具栏">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <button class="toolbar-icon-btn" @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()" title="撤销 (Ctrl+Z)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M9 14L4 9l5-5"/>
              <path d="M4 9h11a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-4"/>
            </svg>
          </button>
          <button class="toolbar-icon-btn" @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()" title="恢复 (Ctrl+Y)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M15 14l5-5-5-5"/>
              <path d="M20 9H9a5 5 0 0 0-5 5 5 5 0 0 0 5 5h4"/>
            </svg>
          </button>
          <span class="tb-sep"></span>
          <button @click="editor.chain().focus().toggleBold().run()" :class="{ active: editor.isActive('bold') }" title="粗体"><b>B</b></button>
          <button @click="editor.chain().focus().toggleItalic().run()" :class="{ active: editor.isActive('italic') }" title="斜体"><i>I</i></button>
          <button @click="editor.chain().focus().toggleUnderline().run()" :class="{ active: editor.isActive('underline') }" title="下划线"><u>U</u></button>
          <button @click="editor.chain().focus().toggleStrike().run()" :class="{ active: editor.isActive('strike') }" title="删除线"><s>S</s></button>
          <span class="tb-sep"></span>
          <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ active: editor.isActive('heading', { level: 1 }) }" title="一级标题">H1</button>
          <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ active: editor.isActive('heading', { level: 2 }) }" title="二级标题">H2</button>
          <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ active: editor.isActive('heading', { level: 3 }) }" title="三级标题">H3</button>
          <span class="tb-sep"></span>
          <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ active: editor.isActive('bulletList') }" title="无序列表">•</button>
          <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ active: editor.isActive('orderedList') }" title="有序列表">1.</button>
          <button @click="editor.chain().focus().toggleTaskList().run()" :class="{ active: editor.isActive('taskList') }" title="任务列表">☐</button>
          <button @click="toggleQuote" :class="{ active: editor.isActive('blockquote') }" title="引用">"</button>
          <span class="tb-sep"></span>
          <button @click="setLink" :class="{ active: editor.isActive('link') }" title="链接">🔗</button>
          <button class="toolbar-icon-btn" @click="triggerImagePicker" title="插入图片">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </button>
          <input ref="imageFileInput" type="file" accept="image/*" multiple class="hidden-file-input" @change="handleImageFiles" />
          <button @click="insertTable" title="插入表格">⊞</button>
          <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ active: editor.isActive('codeBlock') }" title="代码块">&lt;/&gt;</button>
          <button @click="editor.chain().focus().setHorizontalRule().run()" title="分割线">―</button>
          <span class="tb-sep"></span>
          <button class="toolbar-icon-btn toolbar-reset-btn" @click="resetToolbarPosition" title="复原工具栏位置">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 12a9 9 0 019-9 9 9 0 016.36 2.64L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.36-2.64L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </button>
        </div>
        <div class="table-toolbar" v-if="editor && editor.isActive('table')">
          <button @click="editor.chain().focus().addRowBefore().run()" title="上方加行">↑行</button>
          <button @click="editor.chain().focus().addRowAfter().run()" title="下方加行">↓行</button>
          <button @click="editor.chain().focus().addColumnBefore().run()" title="左侧加列">←列</button>
          <button @click="editor.chain().focus().addColumnAfter().run()" title="右侧加列">列→</button>
          <button @click="editor.chain().focus().deleteRow().run()" title="删除行">删行</button>
          <button @click="editor.chain().focus().deleteColumn().run()" title="删除列">删列</button>
          <button @click="editor.chain().focus().deleteTable().run()" title="删除表格">删表</button>
        </div>
        <editor-content :editor="editor" class="editor-content" @contextmenu.prevent="showContextMenu" />
        <div class="editor-statusbar">
          <span>{{ wordCount }} 字</span>
          <span class="status-sep">·</span>
          <span>约 {{ readingTime }} 分钟阅读</span>
        </div>
      </div>
      <AiPanel
        v-if="aiStore.panelOpen"
        :editor="editor"
        :noteId="route.params.id"
        :noteContent="editor?.getHTML()"
        @close="aiStore.panelOpen = false"
        @save-summary="handleSaveSummary"
        @save-tags="handleSaveTags"
      />
    </div>

    <AiConfigModal :visible="aiStore.configModalOpen" @close="aiStore.configModalOpen = false" />

    <Modal
      :visible="linkModalVisible"
      title="输入链接地址"
      type="prompt"
      placeholder="https://"
      :initialValue="linkModalInitial"
      :allowEmpty="true"
      @confirm="handleLinkConfirm"
      @cancel="linkModalVisible = false"
    />

    <Teleport to="body">
      <div v-if="ctxMenu.visible" class="ctx-backdrop" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu"></div>
      <div
        v-if="ctxMenu.visible"
        class="ctx-menu"
        ref="ctxMenuRef"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <template v-if="ctxMenu.inTable">
          <button @click="runCtx(() => editor.chain().focus().addRowBefore().run())">
            <span class="ctx-icon">⬆</span>上方插入行
          </button>
          <button @click="runCtx(() => editor.chain().focus().addRowAfter().run())">
            <span class="ctx-icon">⬇</span>下方插入行
          </button>
          <button @click="runCtx(() => editor.chain().focus().addColumnBefore().run())">
            <span class="ctx-icon">⬅</span>左侧插入列
          </button>
          <button @click="runCtx(() => editor.chain().focus().addColumnAfter().run())">
            <span class="ctx-icon">➡</span>右侧插入列
          </button>
          <div class="ctx-sep"></div>
          <button class="danger" @click="runCtx(() => editor.chain().focus().deleteRow().run())">
            <span class="ctx-icon">✕</span>删除行
          </button>
          <button class="danger" @click="runCtx(() => editor.chain().focus().deleteColumn().run())">
            <span class="ctx-icon">✕</span>删除列
          </button>
          <button class="danger" @click="runCtx(() => editor.chain().focus().deleteTable().run())">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            删除表格
          </button>
        </template>
        <template v-else>
          <button :disabled="!ctxMenu.hasSelection" @click="runCtx(ctxCopy)">
            <span class="ctx-icon">⎘</span>复制
            <span class="ctx-shortcut">Ctrl+C</span>
          </button>
          <button :disabled="!ctxMenu.hasSelection" @click="runCtx(ctxCut)">
            <span class="ctx-icon">✂</span>剪切
            <span class="ctx-shortcut">Ctrl+X</span>
          </button>
          <button @click="runCtx(ctxPaste)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            粘贴
            <span class="ctx-shortcut">Ctrl+V</span>
          </button>
          <div class="ctx-sep"></div>
          <button :disabled="!ctxMenu.hasSelection" class="danger" @click="runCtx(ctxDelete)">
            <span class="ctx-icon">✕</span>删除
          </button>
          <button @click="runCtx(() => editor.chain().focus().selectAll().run())">
            <span class="ctx-icon">▢</span>全选
            <span class="ctx-shortcut">Ctrl+A</span>
          </button>
          <template v-if="ctxMenu.hasSelection">
            <div class="ctx-sep"></div>
            <button @click="runCtx(() => ctxAiAction('润色'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              AI 润色
            </button>
            <button @click="runCtx(() => ctxAiAction('翻译为英文'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              AI 翻译
            </button>
            <button @click="runCtx(() => ctxAiAction('总结'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              AI 总结
            </button>
            <button @click="runCtx(() => ctxAiAction('解释'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              AI 解释
            </button>
            <button @click="runCtx(() => ctxAiAction('扩写'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              AI 扩写
            </button>
          </template>
          <div class="ctx-sep"></div>
          <button @click="runCtx(insertTable)">
            <span class="ctx-icon">⊞</span>插入表格
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotesStore } from '../stores/notes.js';
import { useAuthStore } from '../stores/auth.js';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from '../extensions/resizableImage.js';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { ImageUpload } from '../extensions/imageUpload.js';
import { downloadMarkdown } from '../utils/markdown.js';
import TagInput from '../components/TagInput.vue';
import AiPanel from '../components/AiPanel.vue';
import AiConfigModal from '../components/AiConfigModal.vue';
import Modal from '../components/Modal.vue';
import { useAiStore } from '../stores/ai.js';

const lowlight = createLowlight(common);

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

const route = useRoute();
const router = useRouter();
const store = useNotesStore();
const auth = useAuthStore();
const aiStore = useAiStore();

const title = ref('');
const noteCategory = ref(null);
const noteTags = ref([]);
const saveStatus = ref('');
const tocItems = ref([]);
const activeHeading = ref(0);
const scrollPercent = ref(0);
const pageRef = ref(null);
const editorBodyRef = ref(null);
const layoutRef = ref(null);
const toolbarRef = ref(null);
const pageWidth = ref(localStorage.getItem('editor-width') || 'normal');
const pagePaper = ref(localStorage.getItem('editor-paper') || 'plain');
const savedToolbarOffset = readToolbarOffset();
const toolbarOffset = ref({
  x: Number.isFinite(savedToolbarOffset.x) ? savedToolbarOffset.x : 0,
  y: Number.isFinite(savedToolbarOffset.y) ? savedToolbarOffset.y : 0
});
const toolbarDragging = ref(false);
const catOpen = ref(false);
const catDropdownRef = ref(null);
const ctxMenu = ref({ visible: false, x: 0, y: 0, inTable: false, hasSelection: false });
const ctxMenuRef = ref(null);
const imageFileInput = ref(null);
const linkModalVisible = ref(false);
const linkModalInitial = ref('https://');
let savedLinkRange = null;
let savedImageRange = null;
let saveTimer = null;
let lastEscTime = 0;

function readToolbarOffset() {
  try {
    return JSON.parse(localStorage.getItem('editor-toolbar-offset') || '{"x":0,"y":0}');
  } catch {
    return { x: 0, y: 0 };
  }
}

const categoryName = computed(() => {
  if (!noteCategory.value) return '未分类';
  const cat = store.categories.find(c => c.id === noteCategory.value);
  return cat ? cat.name : '未分类';
});

const categoryIcon = computed(() => {
  if (!noteCategory.value) return null;
  const cat = store.categories.find(c => c.id === noteCategory.value);
  return cat ? cat.icon : null;
});

const toolbarStyle = computed(() => ({
  transform: `translate3d(${toolbarOffset.value.x}px, ${toolbarOffset.value.y}px, 0)`
}));

function selectCategory(id) {
  noteCategory.value = id;
  catOpen.value = false;
  saveCategory();
}

const widthModes = [
  { value: 'normal', label: '正常', x: 4, w: 8 },
  { value: 'wider', label: '较宽', x: 3, w: 10 },
  { value: 'full', label: '全屏', x: 1, w: 14 }
];

const paperModes = [
  { value: 'plain', label: '素白纸', short: '白' },
  { value: 'warm', label: '横线暖纸', short: '暖' },
  { value: 'grid', label: '设计网格', short: '格' },
  { value: 'dot', label: '点阵笔记', short: '点' },
  { value: 'manuscript', label: '中文稿纸', short: '稿' }
];

function setPageWidth(mode) {
  pageWidth.value = mode;
  localStorage.setItem('editor-width', mode);
}

function setPagePaper(mode) {
  pagePaper.value = mode;
  localStorage.setItem('editor-paper', mode);
}

function startToolbarDrag(e) {
  if (!toolbarRef.value || !editorBodyRef.value) return;
  e.preventDefault();
  e.stopPropagation();

  toolbarDragging.value = true;
  const startX = e.clientX;
  const startY = e.clientY;
  const startOffset = { ...toolbarOffset.value };
  const bodyRect = editorBodyRef.value.getBoundingClientRect();
  const toolbarRect = toolbarRef.value.getBoundingClientRect();
  const originLeft = toolbarRect.left - startOffset.x;
  const originTop = toolbarRect.top - startOffset.y;
  const minX = bodyRect.left + 8 - originLeft;
  const maxX = bodyRect.right - toolbarRect.width - 8 - originLeft;
  const minY = bodyRect.top + 8 - originTop;
  const maxY = bodyRect.bottom - toolbarRect.height - 8 - originTop;

  const clamp = (value, min, max) => {
    if (max < min) return min;
    return Math.min(max, Math.max(min, value));
  };

  const onMove = (moveEvent) => {
    toolbarOffset.value = {
      x: clamp(startOffset.x + moveEvent.clientX - startX, minX, maxX),
      y: clamp(startOffset.y + moveEvent.clientY - startY, minY, maxY)
    };
  };

  const onUp = () => {
    toolbarDragging.value = false;
    localStorage.setItem('editor-toolbar-offset', JSON.stringify(toolbarOffset.value));
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp, { once: true });
}

function resetToolbarPosition() {
  toolbarOffset.value = { x: 0, y: 0 };
  localStorage.removeItem('editor-toolbar-offset');
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    ResizableImage,
    Placeholder.configure({ placeholder: '开始写点什么...' }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    CodeBlockLowlight.configure({ lowlight }),
    ImageUpload.configure({ getHeaders: () => auth.headers })
  ],
  editorProps: {
    handleClick(view, pos, event) {
      if (!(event.ctrlKey || event.metaKey)) return false;
      let el = event.target;
      while (el && el !== view.dom) {
        if (el.tagName === 'A' && el.getAttribute('href')) {
          window.open(el.getAttribute('href'), '_blank', 'noopener,noreferrer');
          event.preventDefault();
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }
  },
  onUpdate({ editor: e }) {
    autoSave(e.getHTML());
    updateToc();
  }
});

function setLink() {
  if (!editor.value) return;
  const previous = editor.value?.getAttributes('link').href;
  const { from, to } = editor.value.state.selection;
  savedLinkRange = { from, to };
  linkModalInitial.value = previous || 'https://';
  linkModalVisible.value = true;
}

function isSafeUrl(url) {
  // 协议白名单: 拒 javascript:/data: 等 (防点击执行脚本)
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
  if (!m) return true; // 相对/锚点链接, 安全
  return ['http', 'https', 'mailto'].includes(m[1].toLowerCase());
}

function handleLinkConfirm(url) {
  linkModalVisible.value = false;
  if (!editor.value) return;
  if (savedLinkRange) {
    editor.value.commands.setTextSelection(savedLinkRange);
  }
  if (url === '' || url === 'https://') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
    savedLinkRange = null;
    return;
  }
  if (!isSafeUrl(url)) {
    savedLinkRange = null;
    alert('仅支持 http / https / mailto 链接');
    return;
  }
  const range = savedLinkRange;
  if (range && range.from === range.to) {
    editor.value.chain().focus().insertContent(`<a href="${escapeAttr(url)}">${escapeHtml(url)}</a>`).run();
  } else {
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
  savedLinkRange = null;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function insertTable() {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

function toggleQuote() {
  if (!editor.value) return;
  const ed = editor.value;
  if (ed.isActive('blockquote')) {
    ed.chain().focus().toggleBlockquote().run();
    return;
  }

  if (ed.isActive('bulletList')) {
    ed.chain().focus().toggleBulletList().run();
  } else if (ed.isActive('orderedList')) {
    ed.chain().focus().toggleOrderedList().run();
  } else if (ed.isActive('taskList')) {
    ed.chain().focus().toggleTaskList().run();
  } else if (ed.isActive('codeBlock')) {
    ed.chain().focus().setParagraph().run();
  }

  ed.chain().focus().toggleBlockquote().run();
}

function triggerImagePicker() {
  if (editor.value) {
    const { from, to } = editor.value.state.selection;
    savedImageRange = { from, to };
  }
  imageFileInput.value?.click();
}

async function handleImageFiles(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length || !editor.value) {
    e.target.value = '';
    return;
  }
  try {
    if (savedImageRange) {
      editor.value.commands.setTextSelection(savedImageRange);
    }
    saveStatus.value = '上传图片...';
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = await uploadEditorImage(file);
      insertImageWithFallback(url);
    }
    saveStatus.value = '图片已插入';
  } catch (err) {
    saveStatus.value = err.message || '图片上传失败';
  } finally {
    savedImageRange = null;
    e.target.value = '';
    setTimeout(() => { saveStatus.value = ''; }, 3500);
  }
}

async function uploadEditorImage(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
    body: form
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '图片上传失败');
  }
  const data = await res.json();
  if (!data.url) throw new Error('图片上传失败');
  return data.url;
}

function insertImageWithFallback(url) {
  if (!editor.value) return;
  const node = { type: 'image', attrs: { src: url } };
  const inserted = editor.value.chain().focus().insertContent(node).run();
  if (inserted) return;
  const endPos = editor.value.state.doc.content.size;
  editor.value.chain().focus().setTextSelection(endPos).insertContent([{ type: 'paragraph' }, node]).run();
}

function showContextMenu(e) {
  if (!editor.value) return;
  const inTable = editor.value.isActive('table');
  const { empty } = editor.value.state.selection;
  ctxMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    inTable,
    hasSelection: !empty
  };
  nextTick(() => {
    const el = ctxMenuRef.value;
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
    ctxMenu.value.x = x;
    ctxMenu.value.y = y;
  });
}

function closeCtxMenu() {
  ctxMenu.value.visible = false;
}

function runCtx(fn) {
  fn();
  closeCtxMenu();
}

function ctxCopy() {
  document.execCommand('copy');
}

function ctxCut() {
  document.execCommand('cut');
}

async function ctxPaste() {
  try {
    const text = await navigator.clipboard.readText();
    editor.value?.chain().focus().insertContent(text).run();
  } catch {
    document.execCommand('paste');
  }
}

function ctxDelete() {
  editor.value?.chain().focus().deleteSelection().run();
}

function ctxAiAction(action) {
  if (!editor.value) return;
  const { from, to } = editor.value.state.selection;
  const selectedText = editor.value.state.doc.textBetween(from, to, '\n');
  if (!selectedText) return;

  aiStore.panelOpen = true;

  const userMsg = `请对以下文字进行${action}：\n\n${selectedText}`;
  const chat = aiStore.getChat(route.params.id);
  chat.push({ role: 'user', content: userMsg, done: true });

  const systemMsg = store.currentNote?.content
    ? `你是一个知识库 AI 助手。以下是当前笔记内容供参考：\n\n${stripHtmlContent(store.currentNote.content)}`
    : '你是一个知识库 AI 助手。';

  const apiMessages = [
    { role: 'system', content: systemMsg },
    ...chat.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
  ];

  chat.push({ role: 'assistant', content: '', done: false });
  const assistantIdx = chat.length - 1;

  aiStore.sendMessage(route.params.id, apiMessages, (chunk, done, isError) => {
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
  });
}

function stripHtmlContent(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

onMounted(async () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
  await store.fetchCategories();
  await store.fetchNote(route.params.id);
  // html 类型笔记只读, 不进 Tiptap (否则自动保存会覆盖原始 HTML)
  if (store.currentNote && store.currentNote.type === 'html') {
    router.replace(`/view/${route.params.id}`);
    return;
  }
  if (store.currentNote) {
    title.value = store.currentNote.title;
    noteCategory.value = store.currentNote.categoryId || null;
    noteTags.value = store.currentNote.tags || [];
    editor.value?.commands.setContent(store.currentNote.content || '');
    updateToc();
  }
});

onBeforeUnmount(() => {
  clearTimeout(saveTimer);
  // 空白新建自动取消: 本次新建 (?new=1) 且标题空/默认 且正文为空 → 物理删除, 不留空壳
  const isNew = route.query.new === '1';
  const titleEmpty = !title.value.trim() || title.value.trim() === '无标题';
  const contentEmpty = !editor.value || editor.value.isEmpty;
  if (isNew && titleEmpty && contentEmpty && noteTags.value.length === 0) {
    store.discardNote(route.params.id);
  }
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
  editor.value?.destroy();
});

function handleClickOutside(e) {
  if (catDropdownRef.value && !catDropdownRef.value.contains(e.target)) {
    catOpen.value = false;
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    manualSave();
  }
  if (e.key === 'Escape') {
    if (ctxMenu.value.visible) {
      e.preventDefault();
      e.stopPropagation();
      ctxMenu.value.visible = false;
      return;
    }
    if (catOpen.value) {
      e.preventDefault();
      catOpen.value = false;
      return;
    }
    const now = Date.now();
    if (now - lastEscTime < 400) {
      router.push('/');
    }
    lastEscTime = now;
  }
}

async function manualSave() {
  if (!editor.value) return;
  clearTimeout(saveTimer);
  saveStatus.value = '保存中...';
  await store.updateNote(route.params.id, {
    title: title.value,
    content: editor.value.getHTML()
  });
  saveStatus.value = '已保存';
  setTimeout(() => { saveStatus.value = ''; }, 3500);
}

function updateToc() {
  if (!editor.value) return;
  const items = [];
  editor.value.state.doc.descendants((node) => {
    if (node.type.name === 'heading') {
      items.push({ level: node.attrs.level, text: node.textContent });
    }
  });
  tocItems.value = items;
}

function scrollToHeading(idx) {
  if (!editor.value || !editorBodyRef.value) return;
  activeHeading.value = idx;
  const editorEl = editor.value.view.dom;
  const headings = editorEl.querySelectorAll('h1, h2, h3');
  if (headings[idx]) {
    const container = editorBodyRef.value;
    const top = headings[idx].getBoundingClientRect().top + container.scrollTop - container.getBoundingClientRect().top - 20;
    container.scrollTo({ top, behavior: 'smooth' });
  }
}

function onScroll() {
  if (!editorBodyRef.value) return;
  const el = editorBodyRef.value;
  const scrollable = el.scrollHeight - el.clientHeight;
  scrollPercent.value = scrollable > 0 ? Math.round((el.scrollTop / scrollable) * 100) : 0;

  if (!editor.value) return;
  const headings = editor.value.view.dom.querySelectorAll('h1, h2, h3');
  if (!headings.length) return;
  const containerTop = el.getBoundingClientRect().top;
  let current = 0;
  headings.forEach((h, i) => {
    const rect = h.getBoundingClientRect();
    if (rect.top - containerTop <= 40) current = i;
  });
  activeHeading.value = current;
}

function autoSave(content) {
  saveStatus.value = '编辑中...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await store.updateNote(route.params.id, { content });
    saveStatus.value = '已保存';
    setTimeout(() => { saveStatus.value = ''; }, 3500);
  }, 1000);
}

async function saveTitle() {
  if (title.value !== store.currentNote?.title) {
    await store.updateNote(route.params.id, { title: title.value });
  }
}

async function saveCategory() {
  await store.updateNote(route.params.id, { categoryId: noteCategory.value });
}

async function saveTags(tags) {
  noteTags.value = tags;
  await store.updateNote(route.params.id, { tags });
}

async function handleSaveSummary(summary) {
  await store.updateNote(route.params.id, { aiSummary: summary });
}

async function handleSaveTags(tags) {
  const merged = [...new Set([...noteTags.value, ...tags])];
  noteTags.value = merged;
  await store.updateNote(route.params.id, { tags: merged });
}

function goBack() {
  router.push('/');
}

function exportMd() {
  if (!editor.value) return;
  downloadMarkdown(title.value, editor.value.getHTML());
}

const wordCount = computed(() => {
  if (!editor.value) return 0;
  const text = editor.value.state.doc.textContent || '';
  return text.replace(/\s/g, '').length;
});

const readingTime = computed(() => {
  return Math.max(1, Math.ceil(wordCount.value / 400));
});

const saveStatusClass = computed(() => {
  if (saveStatus.value === '已保存') return 'saved';
  if (saveStatus.value === '保存中...') return 'saving';
  if (saveStatus.value === '编辑中...') return 'editing';
  return '';
});
</script>

<style scoped>
.editor-page {
  height: 100vh;
  overflow: hidden;
  background: var(--ivory);
  display: flex;
  flex-direction: column;
}

.editor-header {
  position: sticky;
  top: 0;
  background: var(--surface);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1.5px solid var(--sand);
  font-size: 14px;
  cursor: pointer;
  color: var(--wood);
  padding: 7px 16px;
  border-radius: var(--radius-full);
  transition: var(--transition);
}

.btn-back:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
  background: var(--bg-hover);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.scroll-progress {
  font-size: 12px;
  color: var(--wood);
  font-weight: 500;
  min-width: 32px;
  text-align: right;
}

.category-dropdown {
  position: relative;
}

.cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--input-bg);
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  padding: 5px 12px;
  font-size: 12px;
  color: var(--charcoal);
  cursor: pointer;
  transition: var(--transition);
}

.cat-btn:hover {
  border-color: var(--clay);
}

.cat-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-emoji {
  font-size: 14px;
}

.cat-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--card-bg-hover);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px;
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: none;
  z-index: 100;
}

.cat-menu::-webkit-scrollbar {
  width: 0;
  display: none;
}

.cat-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 7px 12px;
  border: none;
  background: none;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  color: var(--charcoal);
  transition: background 0.15s;
}

.cat-option:hover {
  background: var(--bg-hover);
}

.cat-option.active {
  background: rgba(197, 143, 109, 0.12);
  color: var(--clay);
  font-weight: 500;
}

.width-toggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
}

.paper-toggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
}

.paper-btn {
  min-width: 28px;
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-full);
  background: none;
  color: var(--wood);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
}

.paper-btn:hover {
  color: var(--charcoal);
}

.paper-btn.active {
  background: var(--card-bg-hover);
  color: var(--clay);
  box-shadow: 0 1px 3px rgba(47, 42, 37, 0.08);
}

.width-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  background: none;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
  padding: 0;
}

.width-btn:hover {
  color: var(--charcoal);
}

.width-btn.active {
  background: var(--card-bg-hover);
  color: var(--clay);
  box-shadow: 0 1px 3px rgba(47, 42, 37, 0.08);
}

.save-status {
  font-size: 12px;
  color: var(--wood);
  transition: color 0.3s, opacity 0.3s;
  min-width: 60px;
  text-align: right;
  opacity: 1;
}

.save-status:empty {
  opacity: 0;
}

.save-status.saved {
  color: var(--sage-dark);
}

.save-status.saving {
  color: var(--clay);
}

.save-status.editing {
  color: var(--wood);
  opacity: 0.7;
}

.btn-export {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
  padding: 0;
}

.btn-export:hover {
  border-color: var(--clay);
  color: var(--clay);
  background: var(--bg-hover);
}

.btn-ai {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
  padding: 0;
}

.btn-ai:hover {
  border-color: var(--clay);
  color: var(--clay);
  background: var(--bg-hover);
}

.btn-ai.active {
  border-color: var(--clay);
  color: var(--clay);
  background: rgba(197, 143, 109, 0.1);
}

.loading {
  text-align: center;
  padding: 80px;
  color: var(--wood);
}

.editor-layout {
  display: flex;
  align-items: stretch;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.toc-panel {
  width: 220px;
  flex-shrink: 0;
  padding: 28px 16px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  height: 100%;
  overflow-y: auto;
}

.toc-panel::-webkit-scrollbar {
  width: 0;
  display: none;
}

.toc-panel {
  scrollbar-width: none;
}

.toc-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--charcoal);
  margin-bottom: 16px;
  padding-left: 10px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toc-empty {
  font-size: 12px;
  color: var(--warm-gray);
  padding-left: 10px;
}

.toc-item {
  display: block;
  padding: 5px 10px;
  font-size: 13px;
  color: var(--wood);
  text-decoration: none;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-item:hover {
  background: var(--bg-hover);
  color: var(--charcoal);
}

.toc-item.active {
  background: var(--bg-active);
  color: var(--charcoal);
  font-weight: 500;
}

.toc-item.level-2 {
  padding-left: 22px;
}

.toc-item.level-3 {
  padding-left: 34px;
  font-size: 12px;
}

.editor-body {
  flex: 1;
  min-width: 0;
  padding: 40px 48px 80px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
  height: 100%;
  transition: max-width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  scrollbar-width: none;
  isolation: isolate;
}

.editor-body::-webkit-scrollbar {
  width: 0;
  display: none;
}

.editor-body.width-normal {
  max-width: 800px;
}

.editor-body.width-wider {
  max-width: 1100px;
}

.editor-body.width-full {
  max-width: none;
}

.editor-body.paper-plain {
  background: transparent;
}

.editor-body.paper-warm {
  background:
    repeating-linear-gradient(0deg, transparent 0 31px, rgba(140, 122, 107, 0.16) 31px 32px),
    linear-gradient(#fff7ea, #fff2df);
  background-size: 100% 32px, 100% 100%;
}

.editor-body.paper-grid {
  background:
    linear-gradient(rgba(47, 42, 37, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47, 42, 37, 0.12) 1px, transparent 1px),
    linear-gradient(rgba(47, 42, 37, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47, 42, 37, 0.045) 1px, transparent 1px),
    rgba(252, 249, 243, 0.74);
  background-size: 96px 96px, 96px 96px, 24px 24px, 24px 24px, 100% 100%;
}

.editor-body.paper-dot {
  background:
    radial-gradient(circle, rgba(47, 42, 37, 0.2) 1.2px, transparent 1.6px),
    radial-gradient(circle, rgba(197, 143, 109, 0.22) 1.2px, transparent 1.7px),
    linear-gradient(#fbfaf6, #f5efe6);
  background-position: 0 0, 12px 12px, 0 0;
  background-size: 24px 24px, 96px 96px, 100% 100%;
}

.editor-body.paper-manuscript {
  background:
    linear-gradient(rgba(200, 50, 50, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200, 50, 50, 0.16) 1px, transparent 1px),
    linear-gradient(rgba(200, 50, 50, 0.06) 50%, transparent 50%),
    linear-gradient(90deg, rgba(200, 50, 50, 0.06) 50%, transparent 50%),
    #fff8f1;
  background-size: 32px 32px, 32px 32px, 32px 32px, 32px 32px, 100% 100%;
}

[data-theme="dark"] .editor-body.paper-warm {
  background:
    repeating-linear-gradient(0deg, transparent 0 31px, rgba(232, 228, 224, 0.13) 31px 32px),
    linear-gradient(rgba(31, 27, 25, 0.94), rgba(24, 22, 22, 0.94));
  background-size: 100% 32px, 100% 100%;
}

[data-theme="dark"] .editor-body.paper-grid {
  background:
    linear-gradient(rgba(232, 228, 224, 0.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 224, 0.13) 1px, transparent 1px),
    linear-gradient(rgba(232, 228, 224, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 224, 0.045) 1px, transparent 1px),
    rgba(28, 28, 32, 0.86);
  background-size: 96px 96px, 96px 96px, 24px 24px, 24px 24px, 100% 100%;
}

[data-theme="dark"] .editor-body.paper-dot {
  background:
    radial-gradient(circle, rgba(232, 228, 224, 0.2) 1.2px, transparent 1.6px),
    radial-gradient(circle, rgba(212, 160, 122, 0.2) 1.2px, transparent 1.7px),
    rgba(26, 26, 30, 0.9);
  background-position: 0 0, 12px 12px, 0 0;
  background-size: 24px 24px, 96px 96px, 100% 100%;
}

[data-theme="dark"] .editor-body.paper-manuscript {
  background:
    linear-gradient(rgba(212, 160, 122, 0.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212, 160, 122, 0.13) 1px, transparent 1px),
    linear-gradient(rgba(212, 160, 122, 0.045) 50%, transparent 50%),
    linear-gradient(90deg, rgba(212, 160, 122, 0.045) 50%, transparent 50%),
    rgba(30, 27, 26, 0.9);
  background-size: 32px 32px, 32px 32px, 32px 32px, 32px 32px, 100% 100%;
}

.title-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--charcoal);
  background: transparent;
}

.title-input::placeholder {
  color: var(--warm-gray);
}

.editor-toolbar {
  position: sticky;
  top: 10px;
  z-index: 120;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: calc(100% - 8px);
  flex-wrap: wrap;
  gap: 3px;
  padding: 6px 8px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  margin: 0 0 18px;
  background: var(--input-bg);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  box-shadow: 0 8px 24px rgba(47, 42, 37, 0.08);
  will-change: transform;
}

.editor-toolbar.is-dragging {
  user-select: none;
  transition: none;
}

.hidden-file-input {
  display: none;
}

.tb-sep {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 3px;
  align-self: center;
}

.editor-toolbar .toolbar-drag-handle {
  width: 20px;
  min-width: 20px;
  padding: 0;
  gap: 2px;
  cursor: grab;
  opacity: 0.58;
}

.editor-toolbar .toolbar-drag-handle:active {
  cursor: grabbing;
}

.toolbar-drag-handle span {
  display: block;
  width: 2px;
  height: 12px;
  border-radius: 2px;
  background: currentColor;
}

.editor-toolbar button {
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 9px;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  color: var(--wood);
  transition: var(--transition);
}

.editor-toolbar .toolbar-icon-btn {
  width: 28px;
  padding: 0;
}

.editor-toolbar .toolbar-icon-btn svg {
  display: block;
  width: 14px;
  height: 14px;
}

.editor-toolbar .toolbar-reset-btn {
  color: var(--wood);
}

.editor-toolbar .toolbar-reset-btn:hover {
  color: var(--clay);
}

.editor-toolbar button:hover:not(:disabled) {
  background: var(--card-bg-hover);
  color: var(--charcoal);
}

/* 撤销/恢复无可用历史时置灰禁用 */
.editor-toolbar button:disabled {
  opacity: 0.35;
  cursor: default;
}

.editor-toolbar button.active {
  background: var(--bg-active);
  color: var(--charcoal);
}

.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 0;
  margin-bottom: 12px;
}

.table-toolbar button {
  padding: 3px 8px;
  background: var(--bg-active);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  color: var(--wood);
  transition: var(--transition);
}

.table-toolbar button:hover {
  background: var(--bg-hover);
  color: var(--charcoal);
}

.editor-content {
  min-height: 400px;
}

.editor-content :deep(.tiptap) {
  outline: none;
  font-size: 15px;
  line-height: 1.8;
  color: var(--charcoal);
}

.editor-content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--warm-gray);
  pointer-events: none;
  float: left;
  height: 0;
}

.editor-content :deep(.tiptap h1, .tiptap h2, .tiptap h3) {
  margin-top: 1.2em;
  margin-bottom: 0.4em;
}

.editor-content :deep(.tiptap img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
  display: block;
}

.editor-content :deep(.img-wrapper) {
  margin: 12px 0;
  display: flex;
}

.editor-content :deep(.img-wrapper[data-align="left"]) {
  justify-content: flex-start;
}

.editor-content :deep(.img-wrapper[data-align="center"]) {
  justify-content: center;
}

.editor-content :deep(.img-wrapper[data-align="right"]) {
  justify-content: flex-end;
}

.editor-content :deep(.img-container) {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.editor-content :deep(.img-container:hover .img-toolbar),
.editor-content :deep(.img-container:hover .img-resize-handle) {
  opacity: 1;
}

.editor-content :deep(.img-toolbar) {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  padding: 3px;
  background: rgba(47, 42, 37, 0.85);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-full);
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}

.editor-content :deep(.img-tb-btn) {
  border: none;
  background: none;
  color: #fff;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background 0.15s;
}

.editor-content :deep(.img-tb-btn:hover) {
  background: rgba(255, 255, 255, 0.15);
}

.editor-content :deep(.img-resize-handle) {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--clay);
  border: 2px solid #fff;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(47, 42, 37, 0.2);
}

.editor-content :deep(.tiptap a) {
  color: var(--clay);
  text-decoration: underline;
  cursor: pointer;
}

.editor-content :deep(.tiptap a:hover)::after {
  content: 'Ctrl+点击打开';
  position: absolute;
  background: var(--charcoal);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  margin-left: 6px;
  opacity: 0.85;
  pointer-events: none;
  white-space: nowrap;
}

.editor-content :deep(.tiptap table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.editor-content :deep(.tiptap th),
.editor-content :deep(.tiptap td) {
  border: 1px solid var(--sand);
  padding: 8px 12px;
  text-align: left;
  min-width: 80px;
}

.editor-content :deep(.tiptap th) {
  background: var(--bg-hover);
  font-weight: 600;
}

.editor-content :deep(.tiptap ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0;
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li label) {
  margin-top: 3px;
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li label input[type="checkbox"]) {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--sand);
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li label input[type="checkbox"]:hover) {
  border-color: var(--clay);
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li label input[type="checkbox"]:checked) {
  background: var(--clay);
  border-color: var(--clay);
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li label input[type="checkbox"]:checked)::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li[data-checked="true"] > div > p) {
  text-decoration: line-through;
  color: var(--wood);
}

.editor-content :deep(.tiptap pre) {
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  overflow-x: auto;
}

.editor-content :deep(.tiptap pre code .hljs-keyword) { color: var(--code-keyword); }
.editor-content :deep(.tiptap pre code .hljs-string) { color: var(--code-string); }
.editor-content :deep(.tiptap pre code .hljs-number) { color: var(--code-number); }
.editor-content :deep(.tiptap pre code .hljs-comment) { color: var(--code-comment); font-style: italic; }
.editor-content :deep(.tiptap pre code .hljs-function) { color: var(--code-function); }
.editor-content :deep(.tiptap pre code .hljs-title) { color: var(--code-function); }
.editor-content :deep(.tiptap pre code .hljs-params) { color: var(--charcoal); }
.editor-content :deep(.tiptap pre code .hljs-built_in) { color: var(--code-builtin); }
.editor-content :deep(.tiptap pre code .hljs-attr) { color: var(--code-number); }
.editor-content :deep(.tiptap pre code .hljs-tag) { color: var(--code-tag); }
.editor-content :deep(.tiptap pre code .hljs-name) { color: var(--code-tag); }
.editor-content :deep(.tiptap pre code .hljs-selector-class) { color: var(--code-number); }

.editor-content :deep(.tiptap blockquote) {
  border-left: 3px solid var(--clay);
  padding-left: 16px;
  color: var(--wood);
  margin: 1em 0;
}

.editor-content :deep(.tiptap hr) {
  border: none;
  border-top: 1px solid var(--sand);
  margin: 1.5em 0;
}

.editor-statusbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  margin-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--wood);
}

.status-sep {
  opacity: 0.5;
}

@media (max-width: 768px) {
  .editor-header {
    padding: 12px 16px;
  }

  .toc-panel {
    display: none;
  }

  .editor-body {
    padding: 24px 16px 60px;
  }

  .title-input {
    font-size: 24px;
  }

  .width-toggle {
    display: none;
  }

  .category-select select {
    max-width: 100px;
  }
}
</style>

<style>
.ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.ctx-menu {
  position: fixed;
  background: var(--card-bg-hover);
  backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px;
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  z-index: 1001;
}

.ctx-menu button {
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
  border-radius: 6px;
  color: var(--charcoal);
  transition: background 0.15s;
}

.ctx-menu button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.ctx-menu button:disabled {
  opacity: 0.4;
  cursor: default;
}

.ctx-menu button.danger {
  color: #c83232;
}

.ctx-menu button.danger:hover:not(:disabled) {
  background: rgba(200, 50, 50, 0.08);
}

.ctx-icon {
  width: 18px;
  text-align: center;
  font-size: 14px;
}

.ctx-shortcut {
  margin-left: auto;
  font-size: 11px;
  color: var(--wood);
  opacity: 0.7;
}

.ctx-sep {
  height: 1px;
  background: var(--border);
  margin: 4px 8px;
}
</style>
