<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="ai-config-overlay" @click.self="$emit('close')">
        <div class="ai-config-modal">
          <div class="ai-config-header">
            <h3>AI 配置</h3>
            <button class="btn-close" @click="$emit('close')">✕</button>
          </div>

          <div class="ai-config-body" v-if="!editing">
            <div v-if="aiStore.providers.length === 0" class="empty-state">
              <p>尚未配置 AI 提供商</p>
              <p class="empty-hint">添加一个 OpenAI 兼容或 Anthropic 接口开始使用</p>
            </div>
            <div v-for="p in aiStore.providers" :key="p.id" class="provider-card">
              <div class="provider-info">
                <span class="provider-name">{{ p.name }}</span>
                <span class="provider-badge" :class="p.type">{{ p.type }}</span>
                <span class="provider-models">{{ p.models.length }} 个模型</span>
              </div>
              <div class="provider-actions">
                <button @click="startEdit(p)">编辑</button>
                <button class="danger" @click="handleDelete(p.id)">删除</button>
              </div>
            </div>
            <button class="btn-add" @click="startAdd">+ 添加提供商</button>

            <div class="system-prompt-section">
              <label>自定义指令</label>
              <textarea
                v-model="promptDraft"
                rows="3"
                maxlength="2000"
                placeholder="如：你是一个简洁的中文技术助手，回答控制在 200 字以内。（每次对话自动注入）"
              ></textarea>
              <button class="btn-save-prompt" :disabled="promptSaving" @click="savePrompt">
                {{ promptSaving ? '保存中...' : '保存指令' }}
              </button>
            </div>
          </div>

          <div class="ai-config-body" v-else @keydown.enter.exact="onFormEnter">
            <div class="form-group">
              <label>名称</label>
              <input v-model="form.name" placeholder="如：DeepSeek、GPT" />
            </div>
            <div class="form-group">
              <label>类型</label>
              <div class="type-toggle">
                <button :class="{ active: form.type === 'openai' }" @click="form.type = 'openai'">OpenAI 兼容</button>
                <button :class="{ active: form.type === 'anthropic' }" @click="form.type = 'anthropic'">Anthropic</button>
              </div>
            </div>
            <div class="form-group">
              <label>API 地址</label>
              <input v-model="form.baseUrl" :placeholder="form.type === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'" />
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input v-model="form.apiKey" type="password" :placeholder="editingId ? '留空保持不变' : 'sk-...'" />
            </div>
            <div class="form-group">
              <label>模型列表</label>
              <div class="models-input-row">
                <input v-model="form.models" placeholder="用逗号分隔，如：gpt-4o, gpt-4o-mini" />
                <button class="btn-fetch-models" @click="fetchModels" :disabled="!form.baseUrl || !form.apiKey || fetchingModels" type="button">
                  {{ fetchingModels ? '获取中...' : '获取模型' }}
                </button>
              </div>
              <p v-if="fetchError" class="fetch-error">{{ fetchError }}</p>
            </div>
            <div class="form-actions">
              <button class="btn-cancel" @click="editing = false">取消</button>
              <button class="btn-save" @click="saveForm" :disabled="!canSave || saving">{{ saving ? '保存中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, toRefs, computed, watch } from 'vue';
import { useAiStore } from '../stores/ai';
import { useAuthStore } from '../stores/auth';
import { useEscClose } from '../composables/useEscClose';

const props = defineProps({ visible: Boolean });
const emit = defineEmits(['close']);
const { visible } = toRefs(props);

const aiStore = useAiStore();
const auth = useAuthStore();
const editing = ref(false);
const editingId = ref(null);
const form = ref({ name: '', type: 'openai', baseUrl: '', apiKey: '', models: '' });
const fetchingModels = ref(false);
const fetchError = ref('');
const saving = ref(false);

const canSave = computed(() => {
  if (!form.value.name || !form.value.baseUrl) return false;
  if (!editingId.value && !form.value.apiKey) return false;
  return true;
});

function onFormEnter(e) {
  if (e.target?.tagName === 'TEXTAREA') return;
  if (canSave.value && !saving.value) saveForm();
}

// 自定义指令: 打开弹窗时同步一次服务端值, 保存独立于 provider 表单
const promptDraft = ref('');
const promptSaving = ref(false);
watch(visible, (v) => {
  if (v) promptDraft.value = aiStore.systemPrompt || '';
});

async function savePrompt() {
  if (promptSaving.value) return;
  promptSaving.value = true;
  const ok = await aiStore.saveSystemPrompt(promptDraft.value.trim());
  promptSaving.value = false;
  if (ok) promptDraft.value = aiStore.systemPrompt;
  else alert('指令保存失败, 请重试');
}

useEscClose(visible, () => {
  if (editing.value) editing.value = false;
  else emit('close');
});

function startAdd() {
  editingId.value = null;
  form.value = { name: '', type: 'openai', baseUrl: '', apiKey: '', models: '' };
  fetchError.value = '';
  editing.value = true;
}

function startEdit(p) {
  editingId.value = p.id;
  form.value = { name: p.name, type: p.type, baseUrl: p.baseUrl, apiKey: '', models: p.models.join(', ') };
  fetchError.value = '';
  editing.value = true;
}

async function fetchModels() {
  if (!form.value.baseUrl || !form.value.apiKey) return;
  fetchingModels.value = true;
  fetchError.value = '';

  try {
    let models = [];
    if (form.value.type === 'openai') {
      const url = form.value.baseUrl.replace(/\/+$/, '') + '/models';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${form.value.apiKey}` }
      });
      if (!res.ok) throw new Error('获取失败: ' + res.status);
      const data = await res.json();
      models = (data.data || []).map(m => m.id).filter(Boolean);
    } else if (form.value.type === 'anthropic') {
      models = [
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022'
      ];
    }

    if (models.length === 0) {
      fetchError.value = '未获取到模型列表';
    } else {
      form.value.models = models.join(', ');
    }
  } catch (err) {
    fetchError.value = err.message || '获取失败';
  } finally {
    fetchingModels.value = false;
  }
}

async function saveForm() {
  const data = {
    name: form.value.name,
    type: form.value.type,
    baseUrl: form.value.baseUrl,
    models: form.value.models
  };

  if (form.value.apiKey) {
    data.apiKey = form.value.apiKey;
  }

  let success = false;
  try {
    if (editingId.value) {
      success = await aiStore.updateProvider(editingId.value, data);
    } else {
      success = await aiStore.addProvider(data);
    }

    if (success) {
      editing.value = false;
      fetchError.value = '';
    } else {
      fetchError.value = '保存失败，请检查网络连接';
    }
  } catch (err) {
    console.error('Save error:', err);
    fetchError.value = err.message || '保存失败';
  }
}

async function handleDelete(id) {
  await aiStore.deleteProvider(id);
}
</script>

<style scoped>
.ai-config-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.ai-config-modal {
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.ai-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 16px;
  border-bottom: 1px solid var(--border);
}

.ai-config-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--charcoal);
}

.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--wood);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.btn-close:hover {
  background: var(--bg-hover);
  color: var(--charcoal);
}

.ai-config-body {
  padding: 20px 28px 28px;
}

.empty-state {
  text-align: center;
  padding: 32px 0;
  color: var(--wood);
}

.empty-hint {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.7;
}

.provider-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.provider-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--charcoal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
}

.provider-badge.openai {
  background: rgba(64, 120, 242, 0.1);
  color: #4078f2;
}

.provider-badge.anthropic {
  background: rgba(197, 143, 109, 0.15);
  color: var(--clay);
}

.provider-models {
  font-size: 12px;
  color: var(--wood);
}

.provider-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.provider-actions button {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  white-space: nowrap;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.provider-actions button:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.provider-actions button.danger:hover {
  border-color: #c83232;
  color: #c83232;
}

.btn-add {
  width: 100%;
  padding: 10px;
  background: none;
  border: 1.5px dashed var(--sand);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
  margin-top: 8px;
}

.btn-add:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.system-prompt-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--sand);
}

.system-prompt-section label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--wood);
  margin-bottom: 8px;
}

.system-prompt-section textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--sand);
  border-radius: var(--radius-sm);
  background: var(--input-bg);
  color: var(--charcoal);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
}

.btn-save-prompt {
  margin-top: 8px;
  padding: 7px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--clay);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition);
}

.btn-save-prompt:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--wood);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 9px 14px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--input-bg);
  color: var(--charcoal);
  outline: none;
  transition: var(--transition);
}

.form-group input:focus {
  border-color: var(--clay);
  background: var(--input-bg-focus);
}

.models-input-row {
  display: flex;
  gap: 8px;
}

.models-input-row input {
  flex: 1;
}

.btn-fetch-models {
  padding: 9px 16px;
  border: 1.5px solid var(--clay);
  border-radius: var(--radius-sm);
  background: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--clay);
  transition: var(--transition);
  white-space: nowrap;
}

.btn-fetch-models:hover:not(:disabled) {
  background: rgba(197, 143, 109, 0.08);
}

.btn-fetch-models:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fetch-error {
  font-size: 12px;
  color: #c83232;
  margin-top: 6px;
}

.type-toggle {
  display: flex;
  gap: 8px;
}

.type-toggle button {
  flex: 1;
  padding: 8px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  background: none;
  font-size: 12px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.type-toggle button.active {
  border-color: var(--clay);
  color: var(--clay);
  background: rgba(197, 143, 109, 0.08);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 9px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  background: none;
  font-size: 13px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.btn-cancel:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.btn-save {
  flex: 1;
  padding: 9px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--clay);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.btn-save:hover {
  background: var(--clay-dark);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
