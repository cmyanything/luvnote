import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A separate entry, public directory and output. The production build never includes the lab.
export default defineConfig({
  publicDir: 'template-lab/public',
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 4317, strictPort: true },
  preview: { host: '127.0.0.1', port: 4318, strictPort: true },
  build: {
    outDir: 'dist-lab',
    emptyOutDir: true,
    rollupOptions: { input: 'template-lab/index.html' },
  },
});
