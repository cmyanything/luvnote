import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.LAB_BASE_PATH || '/';
if (!['/', '/mylab/'].includes(base)) throw new Error('Unsupported Lab base path');

// Build separately; only the explicit Pages packaging step adds /mylab to the website.
export default defineConfig({
  publicDir: 'template-lab/public',
  plugins: [react()],
  base,
  server: { host: '127.0.0.1', port: 4317, strictPort: true },
  preview: { host: '127.0.0.1', port: 4318, strictPort: true },
  build: {
    outDir: 'dist-lab',
    emptyOutDir: true,
    rollupOptions: { input: 'template-lab/index.html' },
  },
});
