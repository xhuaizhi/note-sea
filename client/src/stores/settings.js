import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const loginBg = ref(null);
  const homeBg = ref(null);
  const uiOpacity = ref(0.75);
  const loaded = ref(false);

  function applyUiOpacity(value) {
    const opacity = Math.min(0.95, Math.max(0.35, Number(value) || 0.75));
    document.documentElement.style.setProperty('--ui-opacity', opacity.toFixed(2));
    document.documentElement.style.setProperty('--ui-opacity-strong', Math.min(0.98, opacity + 0.15).toFixed(2));
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        loginBg.value = data.loginBg || null;
        homeBg.value = data.homeBg || null;
        uiOpacity.value = data.uiOpacity ?? 0.75;
        applyUiOpacity(uiOpacity.value);
      }
    } catch {}
    loaded.value = true;
  }

  async function updateSettings(data, headers) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const result = await res.json();
      loginBg.value = result.loginBg || null;
      homeBg.value = result.homeBg || null;
      uiOpacity.value = result.uiOpacity ?? 0.75;
      applyUiOpacity(uiOpacity.value);
      return true;
    }
    return false;
  }

  applyUiOpacity(uiOpacity.value);

  return { loginBg, homeBg, uiOpacity, loaded, fetchSettings, updateSettings };
});
