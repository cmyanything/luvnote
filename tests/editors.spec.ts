import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { themes } from '../src/themes';

const expires = Date.now() + 15 * 864e5;
const photo = {
  name: 'memory.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=',
    'base64',
  ),
};

test.beforeEach(async ({ page }) => {
  // Network services are stubbed; these tests never create production cards.
  await page.route('https://www.youtube.com/**', (route) => route.abort());
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await page.route('https://api.luvnote.fun/**', (route) =>
    route.fulfill({
      status: 500,
      json: { error: 'unexpected_test_request' },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
});

async function fillRequired(page: Page, noSecret = false) {
  await page.getByLabel('ชื่อผู้รับ').fill('น้องพลอย 💗');
  await page.getByLabel('ชื่อผู้ส่ง').fill('พี่ต้นข้าว');
  await page.locator('#letter').fill('สุขสันต์วันเกิดนะ\nรักเธอมาก <3');
  if (noSecret) await expect(page.locator('#secret')).toHaveCount(0);
  else await page.locator('#secret').fill('ของขวัญอยู่ใต้หมอน 🤫');
}

for (const theme of themes) {
  test(`${theme.id}: validate, edit, preview and create a shareable card`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const requests: unknown[] = [];
    await page.route('https://api.luvnote.fun/v2/cards', async (route) => {
      requests.push(route.request().postDataJSON());
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 201,
        json: { id: 'abc2345', expires },
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    await page.goto(`/themes/${theme.id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      theme.name,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('#mkBtn').click();
    await expect(page.getByLabel('ชื่อผู้รับ')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(requests).toHaveLength(0);
    await fillRequired(page, !!theme.noSecret);
    if (theme.occasion === 'anniversary')
      await page.getByLabel('วันที่เราเริ่มคบกัน').fill('2022-06-14');
    else await page.getByLabel('ครบกี่ปี').fill('25');
    await page.locator('#file').setInputFiles(photo);
    await expect(page.locator('#pc')).toHaveText('1');
    await page.getByLabel('คำบรรยายรูปที่ 1').fill('ความทรงจำของเรา');
    if (theme.coverLabel) await page.locator('#covFile').setInputFiles(photo);
    if (!theme.noSecret) {
      await page.locator('#lockSeg button').nth(1).click();
      await page.getByLabel('รหัส 4 หลัก').fill('14ab');
      await expect(page.getByLabel('รหัส 4 หลัก')).toHaveValue('14');
      await page.getByLabel('รหัส 4 หลัก').fill('1402');
      await expect(page.getByLabel('รหัส 4 หลัก')).toHaveValue('1402');
      await page.getByLabel('คำใบ้').fill('วันครบรอบ');
    }
    await page.locator('#endMsg').fill('รักเสมอ ♡');
    await page.locator('#fxs button').last().click();
    await page.locator('#pvBtn').click();
    await expect(
      page.getByRole('dialog', { name: 'พรีวิวการ์ด' }),
    ).toBeVisible();
    const frame = page.frameLocator('#frame');
    await expect(frame.locator('.js-to').first()).toHaveText('น้องพลอย 💗');
    // The real, unchanged card renderer receives the edited data, including image and PIN.
    const previewFrame = page
      .frames()
      .find((f) => f.url().includes('#preview'))!;
    // Our Story is a React viewer; every other theme exposes its CARD global.
    if (theme.id === 'anniversary-journey') {
      await frame
        .getByRole('button', { name: 'เปิดสมุดความทรงจำ', exact: true })
        .click();
      await frame
        .getByRole('button', { name: 'เปิดจดหมาย', exact: true })
        .click();
      await expect(frame.locator('.letter-content p')).toHaveText(
        'สุขสันต์วันเกิดนะ\nรักเธอมาก <3',
      );
      await expect(frame.locator('.story-polaroid img')).toHaveCount(1);
    } else
      await expect
        .poll(() => previewFrame.evaluate('CARD'))
        .toMatchObject({
          to: 'น้องพลอย 💗',
          from: 'พี่ต้นข้าว',
          letter: 'สุขสันต์วันเกิดนะ\nรักเธอมาก <3',
          ...(theme.noSecret
            ? {}
            : { lock: { type: 'code', code: '1402', hint: 'วันครบรอบ' } }),
          endMsg: 'รักเสมอ ♡',
          photos: [{ cap: 'ความทรงจำของเรา' }],
        });
    await page.locator('#closePv').click();
    await expect(page.locator('#ov')).toHaveCount(0);
    await page.locator('#mkBtn').click();
    await expect(page.locator('#mkBtn')).toBeDisabled();
    await expect(
      page.getByRole('dialog', { name: 'การ์ดของคุณพร้อมแล้ว!' }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      theme: theme.id,
      data: {
        to: 'น้องพลอย 💗',
        from: 'พี่ต้นข้าว',
        age: theme.occasion === 'anniversary' ? null : 25,
        ...(theme.occasion === 'anniversary'
          ? { startDate: '2022-06-14' }
          : {}),
        effect: theme.effects.at(-1)!.value,
        photos: [
          {
            src: expect.stringMatching(/^data:image\/jpeg;base64,/),
            cap: 'ความทรงจำของเรา',
          },
        ],
        ...(theme.noSecret ? {} : { lock: { type: 'code', code: '1402' } }),
        music: { type: 'demo' },
        ...(theme.coverLabel
          ? { cover: expect.stringMatching(/^data:image\/jpeg;base64,/) }
          : {}),
        ...(theme.id === 'birthday-chat'
          ? { chat: expect.arrayContaining([{ w: 'stk', s: 'cake' }]) }
          : {}),
      },
    });
    await expect(page.locator('#openBtn')).toHaveAttribute(
      'href',
      `https://luvnote.fun/#${theme.prefix}abc2345`,
    );
    await expect(page.locator('#lineBtn')).toHaveAttribute(
      'href',
      /line\.me\/R\/msg\/text/,
    );
    expect(
      await page
        .locator('#qr canvas')
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    ).toBe(260);
    await page.locator('#again').click();
    await expect(page.getByLabel('ชื่อผู้รับ')).toHaveValue('น้องพลอย 💗');
    expect(errors).toEqual([]);
  });
}

test('rejects very large original photos and covers before decoding', async ({ page }) => {
  await page.goto('/themes/little-memories/');
  const oversized = {
    name: 'oversized.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(15 * 1024 * 1024 + 1),
  };
  await page.locator('#file').setInputFiles(oversized);
  await expect(page.locator('#toast')).toContainText('15 MB');
  await expect(page.locator('#photos .ph')).toHaveCount(0);
  await page.locator('#covFile').setInputFiles(oversized);
  await expect(page.locator('#toast')).toContainText('15 MB');
  await expect(page.locator('#covImg')).toHaveCount(0);
  // Valid photos must remain usable after an oversized attempt.
  await page.locator('#file').setInputFiles(photo);
  await expect(page.locator('#photos .ph')).toHaveCount(1);
});

test('image limit, removal, cover removal and templates remain editable', async ({
  page,
}) => {
  await page.goto('/themes/little-memories/');
  await page.locator('#file').setInputFiles(
    Array.from({ length: 6 }, (_, i) => ({
      ...photo,
      name: `photo-${i}.png`,
    })),
  );
  await expect(page.locator('#photos .ph')).toHaveCount(5);
  await expect(page.locator('#addBtn')).toBeHidden();
  await page.getByLabel('ลบรูปที่ 2', { exact: true }).click();
  await expect(page.locator('#pc')).toHaveText('4');
  await expect(page.locator('#addBtn')).toBeVisible();
  await page.locator('#covFile').setInputFiles(photo);
  await expect(page.locator('#covImg')).toBeVisible();
  await page.getByLabel('ลบรูปโปรไฟล์').click();
  await expect(page.locator('#covImg')).toHaveCount(0);
  await page.locator('#tpls button').first().click();
  await expect(page.locator('#letter')).not.toHaveValue('');
  await expect(page.locator('#lc')).not.toHaveText('0');
});

test('API errors and network failures allow retry without losing form data', async ({
  page,
}) => {
  let calls = 0;
  await page.route('https://api.luvnote.fun/v2/cards', async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        status: 413,
        json: { error: 'too_large' },
        headers: { 'access-control-allow-origin': '*' },
      });
    else if (calls === 2) await route.abort('failed');
    else
      await route.fulfill({
        status: 201,
        json: { id: 'abc2345', expires },
        headers: { 'access-control-allow-origin': '*' },
      });
  });
  await page.goto('/themes/pink-coquette/');
  await fillRequired(page);
  await page.locator('#mkBtn').click();
  await expect(page.locator('#toast')).toHaveText(
    'รูปใหญ่เกินไป ลองลดจำนวนรูปนะ',
  );
  await expect(page.locator('#mkBtn')).toBeEnabled();
  await page.locator('#mkBtn').click();
  await expect(page.locator('#toast')).toHaveText(
    'สร้างลิงก์ไม่สำเร็จ ลองใหม่อีกครั้งนะ',
  );
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  expect(calls).toBe(3);
});

test('Birthday Chat supports editing choices, changing type, reordering and deleting', async ({
  page,
}) => {
  let payload: any;
  await page.route('https://api.luvnote.fun/v2/cards', (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { id: 'abc2345', expires },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/themes/birthday-chat/');
  await page.locator('#ctpls button').nth(1).click();
  await page.getByLabel('แก้ไขข้อความที่ 2', { exact: true }).click();
  await page.getByLabel('คำตอบที่ 1', { exact: true }).fill('ตอบแบบใหม่ 💗');
  await page.locator('#csDone').click();
  await expect(page.locator('#cl .ci').nth(1)).toContainText('ตอบแบบใหม่ 💗');
  await page.locator('#addmsg').click();
  await page.getByLabel('ข้อความแชท', { exact: true }).fill('ข้อความใหม่');
  await page.locator('#csUp').click();
  await page.locator('#csDone').click();
  await expect(page.locator('#cl .ci').nth(10)).toContainText('ข้อความใหม่');
  await page.getByLabel('แก้ไขข้อความที่ 11', { exact: true }).click();
  await page.locator('#csTypes [data-w="stk"]').click();
  await page.getByLabel('สติกเกอร์ hug', { exact: true }).click();
  await page.locator('#csDone').click();
  await fillRequired(page);
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  expect(payload.data.chat[1]).toEqual({
    w: 't',
    o: ['ตอบแบบใหม่ 💗', 'ว่า?', 'ไม่ว่างงง 😑'],
  });
  expect(payload.data.chat[10]).toEqual({ w: 'stk', s: 'hug' });
  await page.locator('#again').click();
  await page.getByLabel('แก้ไขข้อความที่ 11', { exact: true }).click();
  await page.locator('#csDel').click();
  await expect(page.locator('#cl .ci')).toHaveCount(11);
});

test('preview ignores unrelated readiness messages and closes with Escape', async ({
  page,
}) => {
  await page.goto('/themes/coquette-dream/');
  await fillRequired(page);
  await page.locator('#pvBtn').click();
  await expect(page.locator('#ov')).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://unrelated.example',
        source: window,
        data: { type: 'luvnote-ready' },
      }),
    ),
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#ov')).toHaveCount(0);
  await expect(page.locator('#pvBtn')).toBeFocused();
});

test('YouTube music keeps its start time and falls back when embedding is rejected', async ({
  page,
}) => {
  const payloads: any[] = [];
  await page.route('https://api.luvnote.fun/v2/cards', (route) => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      json: { id: 'abc2345', expires },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.addInitScript(() => {
    window.YT = {
      Player: class {
        frame: HTMLIFrameElement;
        constructor(
          element: HTMLElement,
          options: {
            videoId: string;
            events: { onReady(): void; onError(event: { data: number }): void };
          },
        ) {
          this.frame = document.createElement('iframe');
          this.frame.title = 'ตัวอย่างเพลง';
          element.replaceWith(this.frame);
          setTimeout(
            () =>
              options.videoId === 'blocked1234'
                ? options.events.onError({ data: 150 })
                : options.events.onReady(),
            0,
          );
        }
        destroy() {
          this.frame.remove();
        }
      },
    };
  });
  await page.goto('/themes/coquette-dream/');
  await fillRequired(page);
  await page
    .getByLabel('ลิงก์เพลงจาก YouTube')
    .fill('https://youtu.be/dQw4w9WgXcQ?t=1m23s');
  await expect(page.locator('#ytStart')).toHaveValue('1:23');
  await expect(page.locator('#ytS')).toHaveClass('yt ok');
  await page.locator('#ytStart').fill('0:45');
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  expect(payloads[0].data.music).toEqual({
    type: 'youtube',
    id: 'dQw4w9WgXcQ',
    start: 45,
  });
  await page.locator('#again').click();
  await page
    .getByLabel('ลิงก์เพลงจาก YouTube')
    .fill('https://youtu.be/blocked1234');
  await expect(page.locator('#ytS')).toHaveClass('yt bad');
  await page.locator('#mkBtn').click();
  await expect(page.locator('#sheet')).toBeVisible();
  expect(payloads[1].data.music).toEqual({ type: 'demo' });
});

test('build preserves standalone pages and old shared-card URLs', async ({
  page,
  request,
}) => {
  for (const path of [
    'index.html',
    'intro-preview.html',
    'app/index.html',
    'CNAME',
    ...themes
      .filter((theme) => theme.occasion !== 'anniversary')
      .map((theme) => `themes/${theme.id}/card.html`),
  ]) {
    expect(await readFile(`dist/${path}`, 'utf8')).toBe(
      await readFile(path, 'utf8'),
    );
  }
  for (const theme of themes) {
    await page.route('https://api.luvnote.fun/v2/cards/abc2345', (route) =>
      route.fulfill({
        status: 200,
        json: {
          theme: theme.id,
          data: {
            to: 'ผู้รับลิงก์เดิม',
            from: 'ผู้ส่ง',
            letter: 'วันเกิดแสนสุข',
            photos: [],
            secret: 'รักเสมอ',
            ...(theme.occasion === 'anniversary'
              ? { startDate: '2022-06-14' }
              : {}),
          },
          expires,
        },
        headers: { 'access-control-allow-origin': '*' },
      }),
    );
    await page.goto(`/#${theme.prefix}abc2345`);
    await expect(page).toHaveURL(
      new RegExp(`/themes/${theme.id}/card.html\\?v=${theme.version}#abc2345$`),
    );
    await expect(page.locator('.js-to').first()).toHaveText('ผู้รับลิงก์เดิม');
  }
  const legacy = await request.get('/app/');
  expect(legacy.status()).toBe(200);
  expect(await legacy.text()).toContain('function route()');
});
