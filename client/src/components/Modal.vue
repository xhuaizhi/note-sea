<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-container">
          <h3 class="modal-title">{{ title }}</h3>
          <p v-if="message" class="modal-message">{{ message }}</p>
          <input
            v-if="type === 'prompt'"
            ref="inputRef"
            v-model="inputValue"
            class="modal-input"
            :placeholder="placeholder"
            @keydown.enter="handleConfirm"
          />
          <div class="modal-actions">
            <button class="btn-cancel" @click="handleCancel">取消</button>
            <button class="btn-confirm" :class="{ danger: danger }" @click="handleConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  type: { type: String, default: 'confirm' },
  placeholder: { type: String, default: '' },
  initialValue: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  danger: { type: Boolean, default: false },
  allowEmpty: { type: Boolean, default: false }
});

const emit = defineEmits(['confirm', 'cancel']);

const inputValue = ref('');
const inputRef = ref(null);

watch(() => props.visible, (val) => {
  if (val) {
    inputValue.value = props.initialValue || '';
    if (props.type === 'prompt') {
      nextTick(() => {
        inputRef.value?.focus();
        inputRef.value?.select();
      });
    }
  }
});

function handleConfirm() {
  if (props.type === 'prompt') {
    if (!props.allowEmpty && !inputValue.value.trim()) return;
    emit('confirm', inputValue.value.trim());
  } else {
    emit('confirm');
  }
}

function handleCancel() {
  emit('cancel');
}

function onKeyDown(e) {
  if (!props.visible) return;
  if (e.key === 'Escape') {
    e.stopPropagation();
    handleCancel();
  } else if (e.key === 'Enter' && props.type !== 'prompt') {
    e.preventDefault();
    handleConfirm();
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 42, 37, 0.3);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--surface);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px 36px;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--charcoal);
  margin-bottom: 8px;
}

.modal-message {
  font-size: 14px;
  color: var(--wood);
  margin-bottom: 24px;
  line-height: 1.6;
}

.modal-input {
  width: 100%;
  padding: 11px 18px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  font-size: 14px;
  outline: none;
  background: var(--input-bg);
  transition: var(--transition);
  margin-bottom: 24px;
}

.modal-input:focus {
  border-color: var(--clay);
  box-shadow: 0 0 0 4px rgba(197, 143, 109, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  padding: 9px 22px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.btn-cancel {
  background: transparent;
  border: 1.5px solid var(--sand);
  color: var(--wood);
}

.btn-cancel:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.btn-confirm {
  background: var(--clay);
  border: none;
  color: #fff;
}

.btn-confirm:hover {
  background: var(--clay-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(197, 143, 109, 0.3);
}

.btn-confirm.danger {
  background: #c83232;
}

.btn-confirm.danger:hover {
  background: #a82828;
  box-shadow: 0 4px 14px rgba(200, 50, 50, 0.3);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.94) translateY(12px);
  opacity: 0;
}
</style>
