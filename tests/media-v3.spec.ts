import { test, expect } from '@playwright/test';

test.skip(process.env.VITE_R2_MEDIA_ENABLED !== 'true', 'R2 media requires its opt-in build');

test('R2 path uploads binary JPEG media and publishes references rather than Base64', async ({ page, browserName }) => {
  const session = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const asset = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const requestBodies: unknown[] = [];
  let uploadCount = 0;
  let sessionCount = 0;
  await page.route('https://www.youtube.com/**', (route) => route.abort());
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (route) => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: "window.turnstile={render:function(el,opts){el.textContent='verified';opts.callback('test-turnstile-token');return 'test-widget';},remove:function(){}};",
  }));
  await page.route('https://api.luvnote.fun/**', (route) =>
    route.fulfill({ status: 500, json: { error: 'unexpected_request' }, headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.route('https://api.luvnote.fun/v3/upload-sessions', async (route) => {
    sessionCount++;
    const data = route.request().postDataJSON();
    expect(data.turnstileToken).toBe('test-turnstile-token');
    await route.fulfill({
      status: 201,
      json: { sessionId: session, uploadToken: 'c'.repeat(64), expires: Date.now() + 100000 },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.route(/https:\/\/api\.luvnote\.fun\/v3\/upload-sessions\/.+\/media\?kind=photo$/, async (route) => {
    uploadCount++;
    expect(route.request().headers()['content-type']).toBe('image/jpeg');
    expect(route.request().headers().authorization).toBe('Bearer ' + 'c'.repeat(64));
    const bytes = route.request().postDataBuffer();
    // WebKit does not expose intercepted Blob bytes; the HTTP acceptance suite verifies them on the wire.
    if (browserName !== 'webkit') {
      expect(bytes?.[0]).toBe(0xff);
      expect(bytes?.[1]).toBe(0xd8);
    }
    if (uploadCount === 1) {
      await route.fulfill({status:503,json:{error:'server_error'},headers:{'access-control-allow-origin':'*'}});
      return;
    }
    await route.fulfill({
      status: 201, json: { id: asset },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.route('https://api.luvnote.fun/v3/cards', async (route) => {
    const json = route.request().postDataJSON();
    requestBodies.push(json);
    expect(route.request().headers().authorization).toBe('Bearer ' + 'c'.repeat(64));
    await route.fulfill({
      status: 201, json: { id: 'abc2345', expires: Date.now() + 15 * 86400000 },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/themes/pink-coquette/');
  await page.getByLabel('ชื่อผู้รับ').fill('น้องพลอย');
  await page.getByLabel('ชื่อผู้ส่ง').fill('พี่ต้นข้าว');
  await page.locator('#letter').fill('สุขสันต์วันเกิด');
  await page.locator('#secret').fill('เธอคือคนพิเศษ');
  await page.locator('#file').setInputFiles({
    name: 'memory.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=', 'base64'),
  });
  await expect(page.locator('.ph')).toHaveCount(1);
  await expect(page.getByText('verified')).toBeVisible();
  await page.locator('#mkBtn').click();
  await expect(page.locator('#toast')).toHaveText('สร้างลิงก์ไม่สำเร็จ ลองใหม่อีกครั้งนะ');
  await expect(page.locator('#mkBtn')).toBeEnabled();
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  expect(uploadCount).toBe(2);
  expect(sessionCount).toBe(2);
  expect(requestBodies).toHaveLength(1);
  const data = (requestBodies[0] as { data: { photos: { id: string }[] } }).data;
  expect(data.photos).toEqual([{ id: asset, cap: '' }]);
  expect(JSON.stringify(data)).not.toContain('data:image');
});
