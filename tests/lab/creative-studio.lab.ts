import { test, expect } from '@playwright/test';

test('three experiments reveal, replay, and stay within the viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/template-lab/?experiment=creative-studio');
  await page.getByLabel('เลื่อนหาคลื่น 96 MHz').focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByText('NOW PLAYING / FOR YOU')).toBeVisible();
  await page.getByRole('button', { name: 'ปรับคลื่นอีกครั้ง' }).click();
  await expect(page.getByText('NOW PLAYING / FOR YOU')).toHaveCount(0);
  await page.getByRole('button', { name: /The Last Train/ }).click();
  await page.getByRole('button', { name: /^ประทับตั๋ว/ }).click();
  await expect(page.getByText('YOUR STOPS / 01—03')).toBeVisible();
  await page.getByRole('button', { name: 'เริ่มเดินทางอีกครั้ง' }).click();
  await expect(page.getByText('YOUR STOPS / 01—03')).toHaveCount(0);
  await page.getByRole('button', { name: /Paper Theatre/ }).click();
  await page.getByRole('button', { name: 'เปิดม่านชมเรื่องราว' }).click();
  await expect(page.getByText('ในโลกใบใหญ่')).toBeVisible();
  await page.getByRole('button', { name: 'ปิดม่านเพื่อเล่นอีกครั้ง' }).click();
  await expect(page.getByText('ในโลกใบใหญ่')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('reduced motion keeps the reveal available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/template-lab/?experiment=creative-studio');
  await page.getByRole('button', { name: /Paper Theatre/ }).click();
  await page.getByRole('button', { name: 'เปิดม่านชมเรื่องราว' }).click();
  await expect(page.getByText('ในโลกใบใหญ่')).toBeVisible();
  expect(await page.locator('.curtain').first().evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s');
});
