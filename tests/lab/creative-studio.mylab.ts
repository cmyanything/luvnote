import { test, expect } from '@playwright/test';

test('creative studio and Loy Krathong work under /mylab', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`)});
  await page.goto('/mylab/?experiment=creative-studio&theme=loy-krathong');
  const image = page.locator('.loy-art');
  await expect(image).toHaveAttribute('src', '/mylab/images/loy-krathong-animation-v1.webp');
  await expect.poll(() => image.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'จุดเทียนบนกระทง'}).click();
  await page.getByRole('button',{name:'ความสุข'}).click();
  await page.getByRole('button',{name:'ปล่อยกระทงของเรา'}).click();
  await expect(page.locator('.loy-recipient')).toContainText('ความสุข');
  await page.getByRole('button',{name:'เก็บคำอธิษฐานไว้ด้วยกัน'}).click();
  await expect(page.getByText('UNDER THE SAME MOON')).toBeVisible();
  expect(errors).toEqual([]);
});
