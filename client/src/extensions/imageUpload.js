import { Plugin } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';

async function uploadImage(file, headers) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: headers.Authorization },
    body: form
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url;
}

function handleFiles(files, view, pos, headers) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    uploadImage(file, headers).then(url => {
      if (!url) return;
      const { schema } = view.state;
      const node = schema.nodes.image.create({ src: url });
      const tr = view.state.tr.insert(pos, node);
      view.dispatch(tr);
    });
  }
}

export const ImageUpload = Extension.create({
  name: 'imageUpload',

  addOptions() {
    return { getHeaders: () => ({}) };
  },

  addProseMirrorPlugins() {
    const { getHeaders } = this.options;
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;
            const images = [];
            for (const item of items) {
              if (item.type.startsWith('image/')) {
                images.push(item.getAsFile());
              }
            }
            if (images.length === 0) return false;
            event.preventDefault();
            handleFiles(images, view, view.state.selection.from, getHeaders());
            return true;
          },
          handleDrop(view, event) {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;
            const images = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (images.length === 0) return false;
            event.preventDefault();
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos || view.state.selection.from;
            handleFiles(images, view, pos, getHeaders());
            return true;
          }
        }
      })
    ];
  }
});
