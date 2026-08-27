import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export const useNotesStore = defineStore('notes', () => {
  const categories = ref([]);
  const notes = ref([]);
  const trashNotes = ref([]);
  const currentNote = ref(null);
  const loading = ref(false);
  const allTags = ref([]);
  const draggingNoteId = ref(null);

  function getHeaders() {
    return useAuthStore().headers;
  }

  // FormData 上传不能复用 getHeaders —— 其 Content-Type 会覆盖浏览器自动生成的 multipart 边界
  function formHeaders() {
    return { Authorization: `Bearer ${useAuthStore().token}` };
  }

  // 上传文件 (jpg/png/gif/webp/pdf/docx), 返回 { url: '/uploads/xx' } 或 null
  async function uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', headers: formHeaders(), body: form });
    if (handleUnauth(res)) return null;
    if (res.ok) return await res.json();
    return null;
  }

  // DOCX 服务端解析 (mammoth), 返回 { title, html } 或 null
  async function importDocx(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/import-docx', { method: 'POST', headers: formHeaders(), body: form });
    if (handleUnauth(res)) return null;
    if (res.ok) return await res.json();
    return null;
  }

  function handleUnauth(res) {
    if (res.status === 401) {
      const auth = useAuthStore();
      auth.logout();
      window.location.href = '/login';
      return true;
    }
    return false;
  }

  async function fetchCategories() {
    const res = await fetch('/api/categories', { headers: getHeaders() });
    if (handleUnauth(res)) return;
    if (res.ok) categories.value = await res.json();
  }

  async function fetchNotes() {
    const res = await fetch('/api/notes', { headers: getHeaders() });
    if (handleUnauth(res)) return;
    if (res.ok) notes.value = await res.json();
  }

  async function fetchNote(id) {
    loading.value = true;
    const res = await fetch(`/api/notes/${id}`, { headers: getHeaders() });
    if (handleUnauth(res)) return;
    if (res.ok) currentNote.value = await res.json();
    loading.value = false;
  }

  async function createNote(data) {
    const res = await fetch('/api/notes', {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data)
    });
    if (handleUnauth(res)) return;
    if (res.ok) {
      const note = await res.json();
      notes.value.push(note);
      return note;
    }
    return null;
  }

  async function updateNote(id, data) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data)
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = notes.value.findIndex(n => n.id === id);
      if (idx >= 0) notes.value[idx] = { ...notes.value[idx], ...updated };
      if (currentNote.value?.id === id) currentNote.value = updated;
    }
  }

  async function deleteNote(id) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.ok) {
      const note = notes.value.find(n => n.id === id);
      notes.value = notes.value.filter(n => n.id !== id);
      if (note) {
        trashNotes.value.unshift({ ...note, deletedAt: new Date().toISOString() });
      }
      if (currentNote.value?.id === id) currentNote.value = null;
    }
  }

  async function reorderNotes(orderedIds) {
    orderedIds.forEach((id, idx) => {
      const note = notes.value.find(n => n.id === id);
      if (note) note.order = idx;
    });
    await Promise.all(orderedIds.map((id, idx) =>
      fetch(`/api/notes/${id}`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ order: idx })
      })
    ));
  }

  async function createCategory(name, icon) {
    const res = await fetch('/api/categories', {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, icon })
    });
    if (res.ok) {
      const cat = await res.json();
      categories.value.push(cat);
      return cat;
    }
  }

  async function updateCategory(id, data) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data)
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = categories.value.findIndex(c => c.id === id);
      if (idx >= 0) categories.value[idx] = { ...categories.value[idx], ...updated };
      return updated;
    }
  }

  async function deleteCategory(id) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.ok) {
      categories.value = categories.value.filter(c => c.id !== id);
      notes.value = notes.value.filter(n => n.categoryId !== id);
    }
  }

  async function fetchTrash() {
    const res = await fetch('/api/trash', { headers: getHeaders() });
    if (handleUnauth(res)) return;
    if (res.ok) trashNotes.value = await res.json();
  }

  async function restoreNote(id) {
    const res = await fetch(`/api/trash/${id}/restore`, {
      method: 'POST', headers: getHeaders()
    });
    if (res.ok) {
      const note = trashNotes.value.find(n => n.id === id);
      trashNotes.value = trashNotes.value.filter(n => n.id !== id);
      if (note) notes.value.push(note);
    }
  }

  async function permanentDelete(id) {
    const res = await fetch(`/api/trash/${id}`, {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.ok) {
      trashNotes.value = trashNotes.value.filter(n => n.id !== id);
    }
  }

  // 丢弃笔记: 物理删除, 不进回收站 (用于取消空白新建)
  async function discardNote(id) {
    const res = await fetch(`/api/trash/${id}`, {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.ok) {
      notes.value = notes.value.filter(n => n.id !== id);
      if (currentNote.value?.id === id) currentNote.value = null;
    }
  }

  async function emptyTrash() {
    const res = await fetch('/api/trash', {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.ok) trashNotes.value = [];
  }

  async function search(q) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
    if (res.ok) return await res.json();
    return [];
  }

  async function fetchTags() {
    const res = await fetch('/api/tags', { headers: getHeaders() });
    if (handleUnauth(res)) return;
    if (res.ok) allTags.value = await res.json();
  }

  return {
    categories, notes, trashNotes, currentNote, loading, allTags, draggingNoteId,
    fetchCategories, fetchNotes, fetchNote,
    createNote, updateNote, deleteNote, discardNote, reorderNotes,
    createCategory, updateCategory, deleteCategory,
    fetchTrash, restoreNote, permanentDelete, emptyTrash, search, fetchTags,
    uploadFile, importDocx
  };
});
