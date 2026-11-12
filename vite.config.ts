import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
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

// A new template needs no hand-made editor page: themes/<id>/index.html is created from
// its src/themes.ts entry when missing (existing pages are left exactly as they are).
for (const theme of editorThemes) {
  const page = resolve(root, `themes/${theme.id}/index.html`);
  if (existsSync(page)) continue;
  const fonts = ['Fredoka:wght@400;500;600', 'Mali:wght@600;700', 'Mitr:wght@300;400;500', 'Athiti:wght@500;600']
    .concat(theme.editorFonts ? [theme.editorFonts] : [])
    .map((family) => `family=${family}`)
    .join('&');
  mkdirSync(dirname(page), { recursive: true });
  writeFileSync(
    page,
    `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>สร้างการ์ด ${theme.name} · LuvNote</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/icons/site.webmanifest">
<meta name="apple-mobile-web-app-title" content="LuvNote">
</head>
<body>
  <div id="root" data-theme="${theme.id}"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`,
  );
}

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
          'favicon.ico',
          'icons/favicon.ico',
          'icons/favicon-32.png',
          'icons/apple-touch-icon.png',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/site.webmanifest',
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
