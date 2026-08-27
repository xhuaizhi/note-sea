import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useAuthStore } from './auth';

const HISTORY_KEY = 'ai-chat-histories';

function loadHistories() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const useAiStore = defineStore('ai', () => {
  const auth = useAuthStore();
  const providers = ref([]);
  const activeProviderId = ref(null);
  const activeModel = ref(null);
  const systemPrompt = ref('');
  const panelOpen = ref(false);
  const configModalOpen = ref(false);
  const chatHistories = ref(loadHistories());
  const loading = ref(false);
  let currentAbort = null;

  let saveTimer = null;
  watch(chatHistories, (v) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(v));
      } catch {}
    }, 300);
  }, { deep: true });

  async function fetchConfig() {
    const res = await fetch('/api/ai/config', { headers: auth.headers });
    if (res.ok) {
      const data = await res.json();
      providers.value = data.providers;
      activeProviderId.value = data.activeProviderId;
      activeModel.value = data.activeModel;
      systemPrompt.value = data.systemPrompt || '';
    }
  }

  // 保存自定义指令 (每次对话注入的 system 消息)
  async function saveSystemPrompt(prompt) {
    try {
      const res = await fetch('/api/ai/system-prompt', {
        method: 'PUT',
        headers: auth.headers,
        body: JSON.stringify({ prompt })
      });
      if (res.ok) {
        const data = await res.json();
        systemPrompt.value = data.systemPrompt || '';
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function addProvider(data) {
    try {
      const res = await fetch('/api/ai/config/providers', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchConfig();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function updateProvider(id, data) {
    try {
      const res = await fetch(`/api/ai/config/providers/${id}`, {
        method: 'PUT',
        headers: auth.headers,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchConfig();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function deleteProvider(id) {
    const res = await fetch(`/api/ai/config/providers/${id}`, {
      method: 'DELETE',
      headers: auth.headers
    });
    if (res.ok) await fetchConfig();
  }

  async function setActive(providerId, model) {
    const res = await fetch('/api/ai/config/active', {
      method: 'PUT',
      headers: auth.headers,
      body: JSON.stringify({ providerId, model })
    });
    if (res.ok) {
      activeProviderId.value = providerId;
      activeModel.value = model;
    }
  }

  function getChat(noteId) {
    if (!chatHistories.value[noteId]) {
      chatHistories.value[noteId] = [];
    }
    return chatHistories.value[noteId];
  }

  function clearChat(noteId) {
    chatHistories.value[noteId] = [];
  }

  async function sendMessage(noteId, messages, onChunk) {
    loading.value = true;
    const controller = new AbortController();
    currentAbort = controller;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ messages }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        onChunk(err.error || '请求失败', true, true);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) {
              onChunk(parsed.error, true, true);
              return;
            }
            if (parsed.done) {
              onChunk('', true, false);
              return;
            }
            if (parsed.content) {
              onChunk(parsed.content, false, false);
            }
          } catch {}
        }
      }
      onChunk('', true, false);
    } catch (err) {
      if (err.name === 'AbortError') {
        onChunk('', true, false);
      } else {
        onChunk(err.message || '网络错误', true, true);
      }
    } finally {
      loading.value = false;
      currentAbort = null;
    }
  }

  function stopGeneration() {
    if (currentAbort) currentAbort.abort();
  }

  return {
    providers, activeProviderId, activeModel,
    panelOpen, configModalOpen, chatHistories, loading,
    fetchConfig, addProvider, updateProvider, deleteProvider, saveSystemPrompt,
    setActive, getChat, clearChat, sendMessage, stopGeneration
  };
});
