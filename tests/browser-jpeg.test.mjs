import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium, webkit } from 'playwright';
import jpeg from 'jpeg-js';
import { fixture } from './helpers/media-env.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const bundle = await build({ entryPoints: ['src/lib/images.ts'], bundle: true, write: false, format: 'iife', globalName: 'LuvNoteImages' });
const pixels = new Uint8Array(1200 * 800 * 4).fill(180);
const source = 'data:image/jpeg;base64,' + Buffer.from(jpeg.encode({ width: 1200, height: 800, data: pixels }, 80).data).toString('base64');

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  test(`${name}: photo and cover produced by the client pass the real upload validator`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      for (const max of [900, 700]) {
        const dataUrl = await page.evaluate(({ source, max }) => LuvNoteImages.jpeg(source, max, 0.82), { source, max });
        const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
        const decoded = jpeg.decode(bytes);
        assert.equal(decoded.width, max);
        const f = await fixture();
        const response = await f.upload(bytes);
        const result = await response.json();
        if (response.status !== 201) {
          mkdirSync('test-results/jpeg', { recursive: true });
          writeFileSync(`test-results/jpeg/${name}-${process.platform}-${max}.jpg`, bytes);
        }
        // Diagnostics contain only the synthetic image's metadata, never customer data.
        console.log(JSON.stringify({ engine: name, platform: process.platform, max, bytes: bytes.length, status: response.status, result }));
        assert.equal(response.status, 201, `${name} ${max}px: ${JSON.stringify(result)}`);
        assert.equal(f.objects.size, 1);
      }
    } finally { await browser.close(); }
  });
}
