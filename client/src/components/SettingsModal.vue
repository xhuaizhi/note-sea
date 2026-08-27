<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="settings-overlay" @click.self="$emit('close')">
        <div class="settings-modal">
          <div class="settings-header">
            <h3>外观设置</h3>
            <button class="btn-close" @click="$emit('close')">✕</button>
          </div>
          <div class="settings-body">
            <p v-if="errorMsg" class="settings-error">{{ errorMsg }}</p>
            <div class="bg-section">
              <label>登录页背景</label>
              <div class="bg-preview-row">
                <div class="bg-preview" :class="{ empty: !form.loginBg }">
                  <img v-if="form.loginBg" :src="form.loginBg" alt="登录背景" />
                  <span v-else class="bg-placeholder">暂无背景图</span>
                </div>
                <div class="bg-actions">
                  <button class="btn-upload" @click="pickFile('login')" :disabled="uploading">{{ uploading === 'login' ? '上传中...' : '上传图片' }}</button>
                  <button v-if="form.loginBg" class="btn-clear" @click="form.loginBg = null">清除</button>
                </div>
              </div>
            </div>
            <div class="bg-section">
              <label>主页背景</label>
              <div class="bg-preview-row">
                <div class="bg-preview" :class="{ empty: !form.homeBg }">
                  <img v-if="form.homeBg" :src="form.homeBg" alt="主页背景" />
                  <span v-else class="bg-placeholder">暂无背景图</span>
                </div>
                <div class="bg-actions">
                  <button class="btn-upload" @click="pickFile('home')" :disabled="uploading">{{ uploading === 'home' ? '上传中...' : '上传图片' }}</button>
                  <button v-if="form.homeBg" class="btn-clear" @click="form.homeBg = null">清除</button>
                </div>
              </div>
            </div>
            <div class="bg-section">
              <label>界面透明度</label>
              <div class="opacity-row">
                <input v-model.number="form.uiOpacity" type="range" min="0.35" max="0.95" step="0.05" />
                <span>{{ Math.round((form.uiOpacity ?? 0.75) * 100) }}%</span>
              </div>
            </div>
            <div class="bg-section">
              <label>数据备份</label>
              <p class="backup-hint">导出全部笔记、分类、标签与上传文件为 zip 压缩包（不含密码与 API 密钥）。建议定期导出留档。</p>
              <div class="backup-actions">
                <button class="btn-upload" :disabled="exporting || importing" @click="exportBackup">
                  {{ exporting ? '导出中...' : '导出备份 (zip)' }}
                </button>
                <button class="btn-upload" :disabled="exporting || importing" @click="pickBackupFile">
                  {{ importing ? '导入中...' : '导入备份' }}
                </button>
              </div>
              <p v-if="importResult" class="backup-result">{{ importResult }}</p>
            </div>
          </div>
          <div class="settings-footer">
            <button class="btn-cancel" @click="$emit('close')">取消</button>
            <button class="btn-save" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFile" />
          <input ref="backupInput" type="file" accept=".zip" style="display:none" @change="handleBackupFile" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { useAuthStore } from '../stores/auth';
import { useEscClose } from '../composables/useEscClose';

const props = defineProps({ visible: Boolean });
const emit = defineEmits(['close']);
const { visible } = toRefs(props);

const settingsStore = useSettingsStore();
const auth = useAuthStore();

const form = ref({ loginBg: null, homeBg: null, uiOpacity: 0.75 });
const saving = ref(false);
const uploading = ref(null);
const errorMsg = ref('');
const fileInput = ref(null);
let uploadTarget = 'login';

useEscClose(visible, () => emit('close'));

watch(visible, (v) => {
  if (v) {
    form.value = {
      loginBg: settingsStore.loginBg,
      homeBg: settingsStore.homeBg,
      uiOpacity: settingsStore.uiOpacity
    };
    errorMsg.value = '';
  }
});

function pickFile(target) {
  uploadTarget = target;
  errorMsg.value = '';
  fileInput.value?.click();
}

async function handleFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploading.value = uploadTarget;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: auth.headers.Authorization },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      if (uploadTarget === 'login') form.value.loginBg = data.url;
      else form.value.homeBg = data.url;
    } else {
      errorMsg.value = data.error || `上传失败 (HTTP ${res.status})`;
    }
  } catch (err) {
    errorMsg.value = '上传失败：' + (err.message || '网络错误');
  } finally {
    uploading.value = null;
    e.target.value = '';
  }
}

async function save() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const ok = await settingsStore.updateSettings(form.value, auth.headers);
    if (ok) {
      emit('close');
    } else {
      errorMsg.value = '保存失败，请检查后端服务是否运行最新代码';
    }
  } catch (err) {
    errorMsg.value = '保存失败：' + (err.message || '未知错误');
  } finally {
    saving.value = false;
  }
}

// 全量备份导出: 服务端打包 zip (data.json + uploads), 前端转 blob 下载
const exporting = ref(false);
async function exportBackup() {
  if (exporting.value) return;
  exporting.value = true;
  errorMsg.value = '';
  try {
    const res = await fetch('/api/export', { headers: auth.headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `note-sea-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (err) {
    errorMsg.value = '导出失败：' + (err.message || '网络错误');
  } finally {
    exporting.value = false;
  }
}

// 备份导入 (合并恢复): 已存在的笔记/分类/文件按 id 跳过, 不覆盖不删除现有数据
const importing = ref(false);
const importResult = ref('');
const backupInput = ref(null);
function pickBackupFile() {
  importResult.value = '';
  backupInput.value?.click();
}
async function handleBackupFile(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (!confirm(`导入备份 "${file.name}"？\n\n将合并恢复备份中的笔记、分类与上传文件；已存在的条目会跳过，不会覆盖或删除现有数据。`)) return;
  importing.value = true;
  importResult.value = '';
  errorMsg.value = '';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/import-backup', {
      method: 'POST',
      headers: { Authorization: auth.headers.Authorization },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    importResult.value = `导入完成：新增笔记 ${data.notesImported} 篇（跳过 ${data.notesSkipped}）、分类 ${data.categoriesImported} 个（跳过 ${data.categoriesSkipped}）、文件 ${data.uploadsImported} 个。页面即将刷新…`;
    setTimeout(() => window.location.reload(), 1800);
  } catch (err) {
    errorMsg.value = '导入失败：' + (err.message || '网络错误');
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.settings-modal {
  background: var(--card-bg-hover);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 16px;
  border-bottom: 1px solid var(--border);
}

.settings-header h3 {
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

.settings-body {
  padding: 20px 28px;
}

.settings-error {
  background: rgba(200, 50, 50, 0.08);
  border: 1px solid rgba(200, 50, 50, 0.3);
  color: #c83232;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bg-section {
  margin-bottom: 24px;
}

.bg-section:last-child {
  margin-bottom: 0;
}

.bg-section label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--wood);
  margin-bottom: 10px;
}

.bg-preview-row {
  display: flex;
  gap: 14px;
  align-items: center;
}

.bg-preview {
  width: 160px;
  height: 90px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bg-preview.empty {
  background: var(--bg-hover);
}

.bg-placeholder {
  font-size: 12px;
  color: var(--wood);
}

.bg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opacity-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.opacity-row input {
  flex: 1;
  accent-color: var(--clay);
}

.opacity-row span {
  width: 42px;
  text-align: right;
  font-size: 12px;
  color: var(--wood);
  font-weight: 600;
}

.btn-upload {
  padding: 7px 16px;
  background: var(--clay);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.btn-upload:hover {
  background: var(--clay-dark);
}

.btn-clear {
  padding: 6px 14px;
  background: none;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--wood);
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.btn-clear:hover {
  border-color: #c83232;
  color: #c83232;
}

.backup-hint {
  margin: 6px 0 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--wood, #8a7d6a);
}

.backup-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.backup-result {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #2e7d43;
}

.settings-footer {
  display: flex;
  gap: 10px;
  padding: 16px 28px 24px;
  border-top: 1px solid var(--border);
}

.settings-footer .btn-cancel {
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

.settings-footer .btn-cancel:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.settings-footer .btn-save {
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

.settings-footer .btn-save:hover {
  background: var(--clay-dark);
}

.settings-footer .btn-save:disabled {
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
