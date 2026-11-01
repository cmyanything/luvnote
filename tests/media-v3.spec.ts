import { test, expect } from '@playwright/test';

test.skip(process.env.VITE_R2_MEDIA_ENABLED !== 'true', 'R2 media requires its opt-in build');

test('R2 path uploads binary JPEG media and publishes references rather than Base64', async ({ page, browserName }) => {
  const session = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const asset = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const requestBodies: unknown[] = [];
  let uploadCount = 0;
  let sessionCount = 0;
  // The picker normalizes JPEG once. Publishing/retrying should never encode it again.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toDataURL;
    const stats = window as Window & { __jpegEncodeCount?: number };
    stats.__jpegEncodeCount = 0;
    HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: number) {
      if (type === 'image/jpeg') stats.__jpegEncodeCount = (stats.__jpegEncodeCount || 0) + 1;
      return original.call(this, type, quality);
    };
  });
  const encodes = () => page.evaluate(() => (window as Window & { __jpegEncodeCount?: number }).__jpegEncodeCount);
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
  await expect.poll(encodes).toBe(1);
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
  expect(await encodes()).toBe(1);
});

test('share sheet gives the owner an edit link and the renewal offer', async ({ page }) => {
  const key = 'c'.repeat(64);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (route) => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: "window.turnstile={render:function(el,opts){el.textContent='verified';opts.callback('t');return 'w';},remove:function(){}};",
  }));
  const cors = { 'access-control-allow-origin': '*' };
  await page.route('https://api.luvnote.fun/v3/upload-sessions', (route) => route.fulfill({
    status: 201, json: { sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', uploadToken: key, expires: Date.now() + 100000 }, headers: cors,
  }));
  await page.route('https://api.luvnote.fun/v3/cards', (route) => route.fulfill({
    status: 201, json: { id: 'abc2345', expires: Date.now() + 90 * 86400000 }, headers: cors,
  }));
  await page.goto('/themes/pink-coquette/');
  await page.getByLabel('ชื่อผู้รับ').fill('น้องพลอย');
  await page.getByLabel('ชื่อผู้ส่ง').fill('พี่ต้นข้าว');
  await page.locator('#letter').fill('สุขสันต์วันเกิด');
  await page.locator('#secret').fill('เธอคือคนพิเศษ');
  await expect(page.getByText('verified')).toBeVisible();
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  await expect(page.locator('#editLnk')).toHaveText(`luvnote.fun/themes/pink-coquette/?edit=abc2345#key=${key}`);
  await expect(page.locator('#renew')).toContainText('ปีละ 29 บาท');
});

test('owner edit link loads the card, re-uploads photos and saves over the same link', async ({ page }) => {
  const key = 'd'.repeat(64);
  const asset = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const cors = { 'access-control-allow-origin': '*' };
  const jpegBytes = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z', 'base64');
  let edited: Record<string, unknown> | null = null;
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.route('https://www.youtube.com/**', (route) => route.abort());
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (route) => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: "window.turnstile={render:function(el,opts){el.textContent='verified';opts.callback('t');return 'w';},remove:function(){}};",
  }));
  await page.route('https://api.luvnote.fun/v2/cards/abc2345', (route) => route.fulfill({
    status: 200, headers: cors, json: {
      theme: 'pink-coquette', expires: Date.now() + 80 * 86400000,
      data: {
        to: 'เดิม', from: 'คนส่ง', age: 21, letter: 'จดหมายเดิม', secret: 'ความลับ', endMsg: 'ปิดท้าย',
        effect: 'bows', lock: { type: 'code', code: '1402', hint: 'วันเกิด' }, music: { type: 'demo' },
        photos: [{ src: 'https://api.luvnote.fun/v3/cards/abc2345/media/' + asset, cap: 'รูปเก่า' }],
      },
    },
  }));
  await page.route('https://api.luvnote.fun/v3/cards/abc2345/media/' + asset, (route) => route.fulfill({
    status: 200, contentType: 'image/jpeg', body: jpegBytes, headers: cors,
  }));
  await page.route('https://api.luvnote.fun/v3/upload-sessions', (route) => route.fulfill({
    status: 201, headers: cors, json: { sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', uploadToken: 'e'.repeat(64), expires: Date.now() + 100000 },
  }));
  await page.route(/https:\/\/api\.luvnote\.fun\/v3\/upload-sessions\/.+\/media\?kind=photo$/, (route) => route.fulfill({
    status: 201, json: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }, headers: cors,
  }));
  await page.route('https://api.luvnote.fun/v3/cards/abc2345/edit', async (route) => {
    edited = route.request().postDataJSON();
    expect(route.request().headers().authorization).toBe('Bearer ' + 'e'.repeat(64));
    await route.fulfill({ status: 200, headers: cors, json: { id: 'abc2345', expires: Date.now() + 80 * 86400000 } });
  });
  await page.goto(`/themes/pink-coquette/?edit=abc2345#key=${key}`);
  await expect(page.locator('#editBanner')).toContainText('กำลังแก้ไขการ์ดเดิม');
  await expect(page.getByLabel('ชื่อผู้รับ')).toHaveValue('เดิม');
  await expect(page.locator('#letter')).toHaveValue('จดหมายเดิม');
  await expect(page.locator('#code')).toHaveValue('1402');
  await expect(page.locator('.ph')).toHaveCount(1);
  await page.locator('#letter').fill('จดหมายใหม่');
  await expect(page.getByText('verified')).toBeVisible();
  await expect(page.locator('#mkBtn')).toHaveText('บันทึกการแก้ไข ♡');
  await page.locator('#mkBtn').click();
  await expect(page.locator('#share-title')).toHaveText('บันทึกการแก้ไขแล้ว!');
  expect(edited).not.toBeNull();
  const body = edited as unknown as { editKey: string; theme: string; data: { letter: string; photos: { id: string; cap: string }[] } };
  expect(body.editKey).toBe(key);
  expect(body.theme).toBe('pink-coquette');
  expect(body.data.letter).toBe('จดหมายใหม่');
  expect(body.data.photos).toEqual([{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', cap: 'รูปเก่า' }]);
  await expect(page.locator('#editLnk')).toContainText(`?edit=abc2345#key=${key}`);
});

test('an invalid or expired edit link explains the problem and blocks saving', async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.route('https://api.luvnote.fun/v2/cards/abc2345', (route) => route.fulfill({
    status: 410, json: { error: 'expired' }, headers: { 'access-control-allow-origin': '*' },
  }));
  await page.goto(`/themes/pink-coquette/?edit=abc2345#key=${'d'.repeat(64)}`);
  await expect(page.locator('#editBanner')).toContainText('เปิดการ์ดเพื่อแก้ไขไม่ได้');
  await expect(page.locator('#mkBtn')).toBeDisabled();
});
