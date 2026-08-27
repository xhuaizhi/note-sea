<template>
  <div class="search-bar">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      placeholder="搜索笔记..."
      @input="onInput"
    />
    <button v-if="query" class="btn-clear" @click="clear">×</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['search']);
const query = ref('');
const inputRef = ref(null);
let timer = null;

function onInput() {
  clearTimeout(timer);
  timer = setTimeout(() => emit('search', query.value), 300);
}

function clear() {
  query.value = '';
  emit('search', '');
}

function focus() {
  inputRef.value?.focus();
}

defineExpose({ focus, clear });
</script>

<style scoped>
.search-bar {
  flex: 1;
  position: relative;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--wood);
}

input {
  width: 100%;
  padding: 9px 36px 9px 40px;
  border: 1.5px solid var(--sand);
  border-radius: var(--radius-full);
  font-size: 14px;
  outline: none;
  background: var(--input-bg);
  transition: var(--transition);
  color: var(--charcoal);
}

input::placeholder {
  color: var(--wood);
}

input:focus {
  border-color: var(--clay);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 4px rgba(197, 143, 109, 0.08);
}

.btn-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--wood);
  transition: var(--transition);
}

.btn-clear:hover {
  color: var(--charcoal);
}
</style>
