import { watch, onBeforeUnmount } from 'vue';

export function useEscClose(visibleRef, onClose) {
  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }
  const stop = watch(visibleRef, (v) => {
    if (v) {
      window.addEventListener('keydown', onKey);
    } else {
      window.removeEventListener('keydown', onKey);
    }
  }, { immediate: true });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
    stop();
  });
}
