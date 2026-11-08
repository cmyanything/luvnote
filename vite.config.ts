import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes as editorThemes } from './src/themes.ts';

const root = dirname(fileURLToPath(import.meta.url));
// Every template except the React "Our Story" viewer ships a plain card.html runtime,
// so a new theme only needs its entry in src/themes.ts (no list to update here).
const themes = editorThemes.map((theme) => theme.id).filter((id) => id !== 'anniversary-journey');
// Images/sounds a card loads from its own folder (e.g. Loy Together's krathong) are copied too.
const ASSET = /\.(webp|png|jpe?g|gif|svg|mp3|m4a|json)$/i;
const themeAssets = themes.flatMap((id) =>
  readdirSync(resolve(root, 'themes', id))
    .filter((name) => ASSET.test(name))
    .map((name) => `themes/${id}/${name}`),
);

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
          ...themeAssets,
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
