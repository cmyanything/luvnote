import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { finishStory } from '../tests/lab/journeys.ts';

const ids = [
  'love-letter',
  'polaroid',
  'cinema',
  'stars',
  'garden',
  'capsule',
  'scrapbook',
  'world',
  'choose',
  'diary',
  'constellation',
  'surprise',
];
const base = process.env.LAB_URL || 'http://127.0.0.1:4317';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))
  throw new Error('Captures are restricted to the local lab.');
const folder = 'template-lab/public/previews';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const evidence = [];
try {
  for (const [device, viewport] of Object.entries({
    mobile: { width: 390, height: 844 },
    desktop: { width: 1280, height: 900 },
  })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.goto(`${base}/template-lab/?template=love-letter`);
    for (const id of ids) {
      await page.goto(`${base}/template-lab/?template=${id}`);
      const story = JSON.parse(await page.getByLabel('Story configuration (JSON)').inputValue());
      const errors = [];
      const listener = (error) => errors.push(error.message);
      const responseListener = (response) => {
        if (response.status() >= 400)
          errors.push(`HTTP ${response.status()}: ${response.url()}`);
      };
      page.on('pageerror', listener);
      page.on('response', responseListener);
      await page.goto(`${base}/template-lab/?play=${id}`, {
        waitUntil: 'networkidle',
      });
      await page.locator('main.experience').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const file = `${id}-${device}.jpg`;
      const buffer = await page.screenshot({
        path: `${folder}/${file}`,
        type: 'jpeg',
        quality: 82,
        fullPage: false,
      });
      evidence.push({
        template: id,
        device,
        viewport,
        file,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        errors,
      });
      {
        await finishStory(page, id, story, true);
        // Loading=lazy content below the fold must be loaded before a full-page capture.
        for (const img of await page.locator('main img').all()) {
          await img.scrollIntoViewIfNeeded();
          await img.evaluate((el) => el.complete ? Promise.resolve() : new Promise((r) => { el.addEventListener('load', r, {once:true}); el.addEventListener('error', r, {once:true}); }));
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        const stateFile = `${id}-complete-${device}.jpg`;
        const stateBuffer = await page.screenshot({
          path: `${folder}/${stateFile}`,
          type: 'jpeg',
          quality: 82,
          fullPage: true,
        });
        evidence.push({
          template: id,
          state: 'complete',
          device,
          viewport,
          file: stateFile,
          sha256: createHash('sha256').update(stateBuffer).digest('hex'),
          errors,
        });
      }
      page.off('pageerror', listener);
      page.off('response', responseListener);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${folder}/screenshots.json`,
  JSON.stringify(
    {
      date: new Date().toISOString(),
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      note: 'Working tree captures; compare report for final source commit. Real rendered viewports, no generated mockups.',
      evidence,
    },
    null,
    2,
  ),
);
console.log(
  `Captured ${evidence.length} real template screenshots; ${evidence.filter((e) => e.errors.length).length} pages with errors.`,
);
if (evidence.some((e) => e.errors.length)) process.exitCode = 1;
