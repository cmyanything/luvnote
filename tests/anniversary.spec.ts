import { test, expect } from '@playwright/test';
import { daysTogether, validDate } from '../src/lib/dates';

const data = {
  to: 'คนโปรดของเรา',
  from: 'คนข้าง ๆ',
  startDate: '2022-06-14',
  letter: 'ขอบคุณที่เดินมาด้วยกัน\nเลือกเธอในทุกวัน ♡',
  secret: 'ปีหน้าไปทะเลด้วยกันนะ',
  lock: { type: 'code', code: '1402', hint: 'วันของเรา' },
  effect: 'hearts',
  music: { type: 'demo' },
  endMsg: 'อยากเขียนหน้าต่อไปกับเธอ',
  photos: [],
};

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await page.route('https://www.youtube.com/**', (route) => route.abort());
});

test('anniversary date math handles leap days and timezone boundaries', () => {
  expect(validDate('2024-02-29')).toBe(true);
  expect(validDate('2025-02-29')).toBe(false);
  expect(validDate('2024-13-01')).toBe(false);
  expect(daysTogether('2024-02-28', '2024-03-01')).toBe(2);
  expect(daysTogether('2024-03-10', '2024-03-11')).toBe(1);
  expect(daysTogether('2024-01-01', '2024-01-01')).toBe(0);
});

test('the anniversary editor requires the start date and preserves dated photo order', async ({
  page,
}) => {
  let payload: any;
  await page.route('https://api.luvnote.fun/v2/cards', (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { id: 'abc2345', expires: Date.now() + 864e5 },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/themes/anniversary-journey/');
  await expect(
    page.getByRole('heading', { name: 'Our Story', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('ครบกี่ปี')).toHaveCount(0);
  await page.getByLabel('ชื่อผู้รับ').fill(data.to);
  await page.getByLabel('ชื่อผู้ส่ง').fill(data.from);
  await page.locator('#letter').fill(data.letter);
  await page.locator('#secret').fill(data.secret);
  await page.locator('#mkBtn').click();
  await expect(page.getByLabel('วันที่เราเริ่มคบกัน')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(payload).toBeUndefined();
  await page.getByLabel('วันที่เราเริ่มคบกัน').fill('2022-06-14');
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=',
    'base64',
  );
  await page.locator('#file').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: image },
    { name: 'two.png', mimeType: 'image/png', buffer: image },
  ]);
  await expect(page.locator('#pc')).toHaveText('2');
  await page.getByLabel('คำบรรยายรูปที่ 1').fill('วันแรกของเรา');
  await page.getByLabel('วันที่ของรูปที่ 1').fill('2022-06-14');
  await page.getByLabel('คำบรรยายรูปที่ 2').fill('ทริปแรกด้วยกัน');
  await page.getByLabel('วันที่ของรูปที่ 2').fill('2023-02-18');
  await page.getByLabel('ย้ายรูปที่ 2 ขึ้น').click();
  await expect(page.getByLabel('คำบรรยายรูปที่ 1')).toHaveValue(
    'ทริปแรกด้วยกัน',
  );
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  expect(payload.data.startDate).toBe('2022-06-14');
  expect(
    payload.data.photos.map((photo: any) => [photo.cap, photo.date]),
  ).toEqual([
    ['ทริปแรกด้วยกัน', '2023-02-18'],
    ['วันแรกของเรา', '2022-06-14'],
  ]);
  await expect(page.locator('#openBtn')).toHaveAttribute(
    'href',
    'https://luvnote.fun/#aabc2345',
  );
});

test('a saved journal opens, shows the correct day count and unlocks its secret', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://api.luvnote.fun/v2/cards/abc2345', (route) =>
    route.fulfill({
      status: 200,
      json: { theme: 'anniversary-journey', data, expires: Date.now() + 864e5 },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.goto('/#aabc2345');
  await expect(page).toHaveURL(/anniversary-journey\/card.html\?v=1#abc2345$/);
  await expect(page.locator('.js-to').first()).toHaveText(data.to);
  await page
    .getByRole('button', { name: 'เปิดสมุดความทรงจำ', exact: true })
    .click();
  await expect(page.getByTestId('days-together')).toHaveText(
    daysTogether(data.startDate).toLocaleString('en-US'),
  );
  await expect(page.locator('.moments')).toHaveCount(0);
  await page.getByRole('button', { name: 'เปิดจดหมาย', exact: true }).click();
  await expect(page.locator('.letter-content p')).toHaveText(data.letter);
  await page
    .getByRole('button', { name: 'เปิดข้อความลับ', exact: true })
    .click();
  await page.getByLabel('รหัสลับของเรา 4 หลัก').fill('0000');
  await page
    .getByRole('button', { name: 'เปิดอ่านข้อความ ♡', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('ยังไม่ใช่รหัส');
  await expect(page.getByTestId('secret-note')).toHaveCount(0);
  await page.getByLabel('รหัสลับของเรา 4 หลัก').fill('1402');
  await page
    .getByRole('button', { name: 'เปิดอ่านข้อความ ♡', exact: true })
    .click();
  await expect(page.getByTestId('secret-note')).toContainText(data.secret);
  await page.getByRole('button', { name: 'กลับไปอ่านตั้งแต่หน้าแรก' }).click();
  await expect(
    page.getByRole('button', { name: 'เปิดสมุดความทรงจำ', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the sample journal has a dated timeline, full-size photos and no birthday text', async ({
  page,
}) => {
  await page.goto('/themes/anniversary-journey/card.html');
  await page
    .getByRole('button', { name: 'เปิดสมุดความทรงจำ', exact: true })
    .click();
  await expect(page.locator('.story-polaroid')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'ดูรูปความทรงจำที่ 1', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'รูปความทรงจำ' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('วันเกิด');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
});

for (const [status, title] of [
  [404, 'ยังหาสมุดเล่มนี้ไม่เจอ'],
  [410, 'สมุดเล่มนี้หมดอายุแล้ว'],
  [503, 'เปิดสมุดไม่สำเร็จ'],
] as const) {
  test(`journal handles API ${status} without displaying demo data`, async ({
    page,
  }) => {
    await page.route('https://api.luvnote.fun/v2/cards/abc2345', (route) =>
      route.fulfill({
        status,
        json: { error: 'test' },
        headers: { 'access-control-allow-origin': '*' },
      }),
    );
    await page.goto('/themes/anniversary-journey/card.html#abc2345');
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.cover-book')).toHaveCount(0);
  });
}

test('the anniversary catalog opens the new demo and links to its editor', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('[data-id="story"]').click();
  await expect(page.locator('#pv iframe.demo')).toHaveAttribute(
    'src',
    'themes/anniversary-journey/card.html?v=1#demo',
  );
  const create = page.getByRole('link', { name: 'สร้างการ์ดนี้', exact: true });
  await expect(create).toHaveAttribute(
    'href',
    'themes/anniversary-journey/?v=1',
  );
  await create.click();
  await expect(
    page.getByRole('heading', { name: 'Our Story', exact: true }),
  ).toBeVisible();
});
