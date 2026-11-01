import { test, expect } from '@playwright/test';

const cors = { 'access-control-allow-origin': '*' };
const key = 'a'.repeat(64);

test('owner reissues an edit link from the admin page', async ({ page }) => {
  let sent: { body: unknown; adminKey?: string } | null = null;
  await page.route('https://api.luvnote.fun/v3/admin/edit-key', async (route) => {
    sent = { body: route.request().postDataJSON(), adminKey: route.request().headers()['x-admin-key'] };
    await route.fulfill({ status: 200, headers: cors, json: { cardId: 'abc2345', theme: 'velvet-gift', editKey: key, expires: Date.UTC(2027, 0, 30) } });
  });
  await page.goto('/admin/');
  await page.getByLabel('รหัสผู้ดูแล (ADMIN_KEY ที่ตั้งไว้ใน Cloudflare)').fill('my-admin-secret');
  await page.getByLabel('ลิงก์การ์ด หรือรหัส 7 ตัวท้ายลิงก์').fill('https://luvnote.fun/#vabc2345');
  await page.getByRole('button', { name: 'ออกลิงก์แก้ไขใหม่' }).click();
  await expect(page.locator('#result')).toBeVisible();
  expect(sent).toEqual({ body: { cardId: 'abc2345' }, adminKey: 'my-admin-secret' });
  await expect(page.locator('#editLink')).toHaveText(/\/themes\/velvet-gift\/\?edit=abc2345#key=a{64}$/);
  await expect(page.locator('#info')).toContainText('Velvet');
  await expect(page.locator('#line')).toHaveAttribute('href', /line\.me\/R\/msg\/text/);
  // The admin key is only remembered when the owner opts in.
  expect(await page.evaluate(() => localStorage.getItem('luvnote:admin-key'))).toBeNull();
});

test('admin page explains wrong keys and expired cards', async ({ page }) => {
  let reply = { status: 403, json: { error: 'admin_denied' } };
  await page.route('https://api.luvnote.fun/v3/admin/edit-key', (route) => route.fulfill({ ...reply, headers: cors }));
  await page.goto('/admin/');
  await page.getByLabel('รหัสผู้ดูแล (ADMIN_KEY ที่ตั้งไว้ใน Cloudflare)').fill('wrong');
  await page.getByLabel('ลิงก์การ์ด หรือรหัส 7 ตัวท้ายลิงก์').fill('abc2345');
  await page.getByRole('button', { name: 'ออกลิงก์แก้ไขใหม่' }).click();
  await expect(page.locator('#msg')).toHaveText('รหัสผู้ดูแลไม่ถูกต้อง');
  reply = { status: 410, json: { error: 'expired' } };
  await page.getByRole('button', { name: 'ออกลิงก์แก้ไขใหม่' }).click();
  await expect(page.locator('#msg')).toContainText('หมดอายุแล้ว');
  await expect(page.locator('#result')).toBeHidden();
  await page.getByLabel('ลิงก์การ์ด หรือรหัส 7 ตัวท้ายลิงก์').fill('not a card');
  await page.getByRole('button', { name: 'ออกลิงก์แก้ไขใหม่' }).click();
  await expect(page.locator('#msg')).toContainText('อ่านรหัสการ์ดไม่ได้');
});
