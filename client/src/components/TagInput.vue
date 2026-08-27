<template>
  <div class="tag-input-wrap">
    <span v-for="(tag, i) in modelValue" :key="tag" class="tag-chip">
      {{ tag }}
      <button @click="remove(i)">&times;</button>
    </span>
    <input
      v-model="input"
      class="tag-field"
      placeholder="添加标签..."
      @keydown.enter.prevent="add"
      @keydown.tab.prevent="add"
      @blur="add"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ modelValue: { type: Array, default: () => [] } });
const emit = defineEmits(['update:modelValue']);
const input = ref('');

function add() {
  const val = input.value.trim();
  if (val && !props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val]);
  }
  input.value = '';
}

function remove(i) {
  const copy = [...props.modelValue];
  copy.splice(i, 1);
  emit('update:modelValue', copy);
}
</script>

<style scoped>
.tag-input-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: var(--bg-active);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--charcoal);
}

.tag-chip button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--wood);
  padding: 0 2px;
  line-height: 1;
}

.tag-chip button:hover {
  color: #c83232;
}

.tag-field {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--charcoal);
  min-width: 80px;
  flex: 1;
}

.tag-field::placeholder {
  color: var(--warm-gray);
}
</style>
