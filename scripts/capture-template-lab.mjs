import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

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
    for (const id of ids) {
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
      if (
        ['love-letter', 'polaroid', 'garden', 'capsule', 'surprise'].includes(
          id,
        )
      ) {
        if (id === 'love-letter') {
          await page
            .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
            .click();
          await page.getByRole('button', { name: /ยังมีอีกบรรทัด/ }).click();
        }
        if (id === 'polaroid')
          await page.getByRole('button', { name: 'พลิกอ่านข้อความ' }).click();
        if (id === 'garden') {
          for (const button of await page.locator('.garden-flower').all())
            await button.click();
          await page.getByRole('button', { name: 'ผูกเป็นช่อให้เธอ' }).click();
        }
        if (id === 'capsule')
          await page
            .getByRole('button', { name: 'เปิดกล่องความทรงจำ' })
            .click();
        if (id === 'surprise') {
          await page
            .getByRole('button', { name: 'แตะเพื่อคลายริบบิ้น' })
            .click();
          await page
            .getByRole('button', { name: 'เปิดของขวัญชิ้นนี้' })
            .click();
        }
        const stateFile = `${id}-opened-${device}.jpg`;
        const stateBuffer = await page.screenshot({
          path: `${folder}/${stateFile}`,
          type: 'jpeg',
          quality: 82,
          fullPage: true,
        });
        evidence.push({
          template: id,
          state: 'opened',
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
