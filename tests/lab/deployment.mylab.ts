import { test, expect } from '@playwright/test';
import { templates } from '../../src/template-lab/registry';

test.beforeEach(async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4319' || !url.pathname.startsWith('/mylab/')) {
      failures.push(`Request escaped /mylab/: ${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  test.info().annotations.push({ type: 'browser-emulation', description: 'Static Pages packaging acceptance; no physical device or customer API calls.' });
  (page as typeof page & { failures: string[] }).failures = failures;
});

test.afterEach(async ({ page }) => {
  expect((page as typeof page & { failures: string[] }).failures).toEqual([]);
});

for (const template of templates) {
  test(`${template.id}: nested route, images and fonts`, async ({ page }) => {
    await page.goto(`/mylab/?play=${template.id}`);
    await expect(page.locator('main.experience')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const img of await page.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await img.getAttribute('src')).toMatch(/^\/mylab\/images\//);
    }
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
  });
}

test('catalogue links, screenshots and comparison remain under /mylab', async ({ page }) => {
  await page.goto('/mylab/');
  await expect(page.locator('.template-tile')).toHaveCount(12);
  for (const img of await page.locator('.template-tile img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole('checkbox', { name: 'เปรียบเทียบ The Love Letter' }).check();
  await page.getByRole('checkbox', { name: 'เปรียบเทียบ Polaroid Memories' }).check();
  await page.getByRole('link', { name: /เปิดดูคู่กัน/ }).click();
  await expect(page.locator('iframe')).toHaveCount(2);
  await expect(page.frameLocator('iframe').nth(0).getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })).toBeVisible();
  await page.locator('.lab-back').click();
  await expect(page).toHaveURL(/\/mylab\/#catalog$/);
  await expect(page.locator('.template-tile')).toHaveCount(12);
});

test('embedded interaction, reset, configuration and back link', async ({ page }) => {
  await page.goto('/mylab/?template=love-letter');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'เปิดซองจดหมาย', exact: true }).click();
  await expect(frame.getByRole('article')).toBeVisible();
  await page.getByRole('button', { name: 'Reset interaction' }).click();
  await expect(frame.getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })).toBeVisible();
  await page.locator('.config-editor summary').click();
  const input = page.getByLabel('Story configuration (JSON)');
  const story = JSON.parse(await input.inputValue());
  story.letter = 'Subdirectory configuration acceptance';
  await input.fill(JSON.stringify(story));
  await page.getByRole('button', { name: 'ใช้ข้อมูลนี้กับต้นแบบ' }).click();
  await frame.getByRole('button', { name: 'เปิดซองจดหมาย', exact: true }).click();
  await expect(frame.getByRole('article')).toContainText(story.letter);
  await expect(page.locator('.lab-brand')).toHaveAttribute('href', '/mylab/');
});
