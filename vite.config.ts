import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes as editorThemes } from './src/themes.ts';

const root = dirname(fileURLToPath(import.meta.url));
const themes = [
  'pink-coquette',
  'coquette-dream',
  'little-memories',
  'birthday-chat',
  'velvet-gift',
];

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'preserve-existing-card-pages',
      apply: 'build',
      closeBundle() {
        // These standalone animation runtimes and legacy links remain byte-for-byte intact.
        for (const path of [
          'index.html',
          'intro-preview.html',
          'app/index.html',
          'admin/index.html',
          'CNAME',
          ...themes.map((t) => `themes/${t}/card.html`),
        ]) {
          const destination = resolve(root, 'dist', path);
          mkdirSync(dirname(destination), { recursive: true });
          copyFileSync(resolve(root, path), destination);
        }
        writeFileSync(resolve(root, 'dist/.nojekyll'), '');
      },
    },
  ],
  base: './',
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ...editorThemes.map((theme) => [
          theme.id,
          resolve(root, `themes/${theme.id}/index.html`),
        ]),
        [
          'anniversary-card',
          resolve(root, 'themes/anniversary-journey/card.html'),
        ],
      ]),
    },
  },
});
