import Image from '@tiptap/extension-image';

export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') || el.style.width || null,
        renderHTML: attrs => {
          if (!attrs.width) return {};
          return { width: attrs.width };
        }
      },
      align: {
        default: 'center',
        parseHTML: el => el.getAttribute('data-align') || 'center',
        renderHTML: attrs => ({ 'data-align': attrs.align || 'center' })
      }
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'img-wrapper';
      wrapper.setAttribute('data-align', node.attrs.align || 'center');

      const container = document.createElement('div');
      container.className = 'img-container';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      if (node.attrs.width) img.style.width = typeof node.attrs.width === 'number' ? node.attrs.width + 'px' : node.attrs.width;

      container.appendChild(img);

      const toolbar = document.createElement('div');
      toolbar.className = 'img-toolbar';
      toolbar.contentEditable = 'false';
      const aligns = [
        { v: 'left', label: '左' },
        { v: 'center', label: '中' },
        { v: 'right', label: '右' }
      ];
      aligns.forEach(a => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = a.label;
        btn.className = 'img-tb-btn';
        btn.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            editor.chain().focus().command(({ tr }) => {
              const pos = getPos();
              const current = editor.state.doc.nodeAt(pos);
              if (!current) return false;
              tr.setNodeMarkup(pos, undefined, { ...current.attrs, align: a.v });
              return true;
            }).run();
          }
        });
        toolbar.appendChild(btn);
      });
      container.appendChild(toolbar);

      const handle = document.createElement('span');
      handle.className = 'img-resize-handle';
      handle.contentEditable = 'false';
      container.appendChild(handle);

      let startX = 0;
      let startWidth = 0;
      let dragging = false;

      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        startX = e.clientX;
        startWidth = img.getBoundingClientRect().width;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
          if (!dragging) return;
          const dx = ev.clientX - startX;
          const newWidth = Math.max(80, startWidth + dx);
          img.style.width = newWidth + 'px';
        };

        const onUp = () => {
          if (!dragging) return;
          dragging = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          const finalWidth = Math.round(img.getBoundingClientRect().width);
          if (typeof getPos === 'function') {
            editor.chain().command(({ tr }) => {
              const pos = getPos();
              const current = editor.state.doc.nodeAt(pos);
              if (!current) return false;
              tr.setNodeMarkup(pos, undefined, { ...current.attrs, width: finalWidth });
              return true;
            }).run();
          }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      wrapper.appendChild(container);

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false;
          if (updatedNode.attrs.src !== node.attrs.src) {
            img.src = updatedNode.attrs.src;
          }
          if (updatedNode.attrs.width) {
            img.style.width = typeof updatedNode.attrs.width === 'number'
              ? updatedNode.attrs.width + 'px'
              : updatedNode.attrs.width;
          } else {
            img.style.width = '';
          }
          wrapper.setAttribute('data-align', updatedNode.attrs.align || 'center');
          return true;
        },
        ignoreMutation(mutation) {
          return mutation.target === img || container.contains(mutation.target);
        }
      };
    };
  }
});
