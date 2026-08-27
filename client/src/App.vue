<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useSettingsStore } from './stores/settings.js';

const settingsStore = useSettingsStore();

onMounted(() => {
  if (!settingsStore.loaded) settingsStore.fetchSettings();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  background: var(--ivory);
  color: var(--charcoal);
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
}

:root {
  --sidebar-width: 260px;
  --ivory: #F8F4EF;
  --sand: rgba(140, 122, 107, 0.22);
  --warm-gray: #D4CEC5;
  --sage: #C9D5C6;
  --sage-dark: #A6B5A3;
  --clay: #C58F6D;
  --clay-dark: #A87658;
  --charcoal: #2F2A25;
  --wood: #8C7A6B;
  --primary: #C58F6D;
  --primary-hover: #A87658;
  --bg-hover: rgba(229, 216, 200, 0.4);
  --bg-active: rgba(201, 213, 198, 0.4);
  --border: rgba(140, 122, 107, 0.16);
  --text-secondary: #8C7A6B;
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 0 rgba(255, 255, 255, 0.42) inset, 0 6px 14px rgba(47, 42, 37, 0.05);
  --shadow-md: 0 1px 0 rgba(255, 255, 255, 0.36) inset, 0 10px 24px rgba(47, 42, 37, 0.08);
  --shadow-lg: 0 1px 0 rgba(255, 255, 255, 0.34) inset, 0 16px 42px rgba(47, 42, 37, 0.12);
  --transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  --ui-opacity: 0.75;
  --ui-opacity-strong: 0.9;
  --card-bg: rgb(253 249 243 / var(--ui-opacity));
  --card-bg-hover: rgb(255 252 247 / var(--ui-opacity-strong));
  --surface: rgb(253 249 243 / var(--ui-opacity));
  --input-bg: rgb(253 249 243 / var(--ui-opacity));
  --input-bg-focus: #fffaf4;
  --code-keyword: #a626a4;
  --code-string: #50a14f;
  --code-number: #986801;
  --code-comment: #a0a1a7;
  --code-function: #4078f2;
  --code-builtin: #c18401;
  --code-tag: #e45649;
}

::selection {
  background: rgba(201, 213, 198, 0.5);
}

[data-theme="dark"] {
  --ivory: #1a1a1e;
  --sand: rgba(232, 228, 224, 0.16);
  --warm-gray: rgba(232, 228, 224, 0.22);
  --sage: #2d3a2d;
  --sage-dark: #4a5c4a;
  --clay: #d4a07a;
  --clay-dark: #e0b08a;
  --charcoal: #e8e4e0;
  --wood: #a09080;
  --primary: #d4a07a;
  --primary-hover: #e0b08a;
  --bg-hover: rgba(255, 255, 255, 0.06);
  --bg-active: rgba(201, 213, 198, 0.12);
  --border: rgba(232, 228, 224, 0.12);
  --text-secondary: #a09080;
  --shadow-sm: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 8px 18px rgba(0, 0, 0, 0.18);
  --shadow-md: 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 12px 28px rgba(0, 0, 0, 0.24);
  --shadow-lg: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 18px 48px rgba(0, 0, 0, 0.32);
  --card-bg: rgb(40 40 44 / var(--ui-opacity));
  --card-bg-hover: rgb(50 50 54 / var(--ui-opacity-strong));
  --surface: rgb(35 35 39 / var(--ui-opacity));
  --input-bg: rgb(30 30 34 / var(--ui-opacity));
  --input-bg-focus: rgba(30, 30, 34, 1);
  --code-keyword: #c678dd;
  --code-string: #98c379;
  --code-number: #d19a66;
  --code-comment: #5c6370;
  --code-function: #61afef;
  --code-builtin: #e5c07b;
  --code-tag: #e06c75;
}

[data-theme="dark"] body {
  background: #1a1a1e;
  color: #e8e4e0;
}

@media (max-width: 768px) {
  :root {
    --sidebar-width: 0px;
  }
}
</style>
