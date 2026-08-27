import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('kb_token') || '');

  const isLoggedIn = computed(() => !!token.value);

  const headers = computed(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.value}`
  }));

  function setToken(t) {
    token.value = t;
    localStorage.setItem('kb_token', t);
  }

  function logout() {
    token.value = '';
    localStorage.removeItem('kb_token');
  }

  return { token, isLoggedIn, headers, setToken, logout };
});
