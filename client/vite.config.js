import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/resources': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
});
