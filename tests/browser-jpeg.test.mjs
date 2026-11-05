import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium, webkit } from 'playwright';
import jpeg from 'jpeg-js';
import { fixture } from './helpers/media-env.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { validateJpeg } from '../worker/jpeg.js';

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

  test(`${name}: Apple's rejected JPEG becomes uploadable without changing pixels`, async () => {
    const appleBytes = readFileSync(new URL('./fixtures/apple-canvas-900.jpg', import.meta.url));
    assert.equal(validateJpeg(appleBytes), null, 'fixture must reproduce the original rejection');
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      // Replay the actual macOS encoder output, so Windows/Linux also guard this bug.
      const dataUrl = await page.evaluate(async ({ source, encoded }) => {
        HTMLCanvasElement.prototype.toDataURL = () => encoded;
        return LuvNoteImages.jpeg(source, 900, 0.82);
      }, { source, encoded: 'data:image/jpeg;base64,' + appleBytes.toString('base64') });
      const clean = Buffer.from(dataUrl.split(',')[1], 'base64');
      assert.deepEqual(jpeg.decode(clean).data, jpeg.decode(appleBytes).data);
      const f = await fixture();
      const response = await f.upload(clean);
      assert.equal(response.status, 201);
      const { id } = await response.json();
      const publication = await f.publish([{ id, cap: 'Synthetic Apple image' }]);
      assert.equal(publication.status, 201);
      const { id: cardId } = await publication.json();
      const reopened = await f.request(`/v3/cards/${cardId}/media/${id}`);
      assert.equal(reopened.status, 200);
      assert.deepEqual(jpeg.decode(new Uint8Array(await reopened.arrayBuffer())).data, jpeg.decode(appleBytes).data);
    } finally { await browser.close(); }
  });
}
