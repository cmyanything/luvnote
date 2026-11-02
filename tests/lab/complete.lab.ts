import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demo, defaultChoices, type Story } from '../../src/template-lab/data';
import { templates } from '../../src/template-lab/registry';
import { validateStory, draftKey } from '../../src/template-lab/validation';
import { finishStory } from './journeys';

const personal: Story = {
  ...demo,
  to: 'เมษา ผู้รับ',
  from: 'ตะวัน ผู้ส่ง',
  title: 'ครบรอบสามปีของเรา',
  headline: 'ขอบคุณที่เป็นบ้านให้กัน',
  intro: 'เราเลือกเก็บวันเหล่านี้ไว้ให้เธอ',
  letter:
    'จดหมายส่วนตัวฉบับนี้ต้องอยู่ครบในทุกธีม\n\nแม้วันธรรมดาก็เป็นวันที่พิเศษ เมื่อมีเธออยู่ข้างกัน\nขอให้บรรทัดสุดท้ายนี้ส่งถึงเธอ',
  secret: 'พรุ่งนี้ไปดูพระอาทิตย์ขึ้นด้วยกันนะ',
  closing: 'จะจับมือเธอในทุกฤดู',
  cover: demo.moments[2].image,
  moments: demo.moments
    .slice(0, 3)
    .map((m, i) => ({
      ...m,
      id: `personal-${i}`,
      title: `วันสำคัญที่ ${i + 1}`,
      note: `เรื่องส่วนตัวลำดับ ${i + 1} ที่ต้องอ่านได้จริง`,
      aside: `รายละเอียดที่รู้กันสองคน ${i + 1}`,
    })),
};

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) &&
      !['data:', 'blob:'].includes(url.protocol)
    )
      return route.abort();
    return route.continue();
  });
});

for (const template of templates) {
  test(`${template.id}: personalized complete story, every memory, full letter and replay`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(
      ({ key, story, id }) =>
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, template: id, story }),
        ),
      { key: draftKey(template.id), story: personal, id: template.id },
    );
    await page.goto(`/template-lab/?play=${template.id}&draft=1&still=1`);
    await expect(page.locator('h1').first()).toHaveText(personal.headline!);
    await expect(
      page.locator('main').getByText(personal.intro!).first(),
    ).toBeVisible();
    await finishStory(page, template.id, personal, true);
    const letter = page.locator('[data-letter-content]');
    await expect(letter).toBeVisible();
    for (const line of personal.letter.split('\n').filter(Boolean))
      await expect(letter).toContainText(line);
    await expect(page.locator('main')).toContainText(personal.title);
    await expect(page.locator('main')).toContainText(personal.secret);
    await expect(page.locator('main')).toContainText(personal.closing);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page
      .getByRole('button', { name: 'เริ่มอ่านการ์ดใหม่', exact: true })
      .click();
    await expect(page.locator('h1').first()).toHaveText(personal.headline!);
    if (
      ['love-letter', 'polaroid', 'capsule', 'choose', 'surprise'].includes(
        template.id,
      )
    )
      await expect(page.locator('[data-letter-content]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${template.id}: one and eight memories with long Thai content stay readable`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    for (const count of [1, 8]) {
      const story: Story = {
        ...personal,
        headline:
          'วันธรรมดาที่มีเธออยู่ข้างกัน คือความทรงจำที่อยากเก็บไว้ตลอดไป',
        moments: Array.from({ length: count }, (_, i) => ({
          ...personal.moments[i % 3],
          id: `stress-${i}`,
          title: `ความทรงจำที่ ${i + 1} ในวันธรรมดาที่แสนพิเศษของเรา`,
          note:
            'วันนั้นเราเดินช้า ๆ และตั้งใจฟังเรื่องของกันและกัน '.repeat(8) +
            `จบเรื่องที่ ${i + 1}`,
        })),
      };
      await page.goto('/template-lab/');
      await page.evaluate(
        ({ key, id, story }) =>
          localStorage.setItem(
            key,
            JSON.stringify({ version: 1, template: id, story }),
          ),
        { key: draftKey(template.id), id: template.id, story },
      );
      await page.goto(`/template-lab/?play=${template.id}&draft=1&still=1`);
      await page.locator('main.experience').waitFor();
      await finishStory(page, template.id, story, true);
      await expect(page.locator('[data-letter-content]')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  });
}

test('studio: real fields, image upload/reorder/replace/remove, exact saved recipient draft and reload', async ({
  page,
  context,
}) => {
  await page.goto('/template-lab/?template=love-letter');
  await page.getByLabel('ชื่อผู้รับ', { exact: true }).fill(personal.to);
  await page.getByLabel('ชื่อผู้ส่ง', { exact: true }).fill(personal.from);
  await page
    .getByRole('textbox', { name: 'จดหมายฉบับเต็ม', exact: true })
    .fill(personal.letter);
  await page
    .getByRole('textbox', { name: 'ข้อความเซอร์ไพรส์', exact: true })
    .fill(personal.secret);
  await page
    .getByLabel('ชื่อเรื่อง / โอกาสพิเศษ', { exact: true })
    .fill(personal.title);
  await page
    .getByLabel('เพิ่มรูปความทรงจำ', { exact: true })
    .setInputFiles([
      'template-lab/public/images/coffee.jpg',
      'template-lab/public/images/cabin.jpg',
    ]);
  await expect(page.locator('.studio-memory')).toHaveCount(6);
  await page
    .getByRole('button', { name: 'เลื่อนรูป 6 ขึ้น', exact: true })
    .click();
  await expect(page.getByLabel('ชื่อความทรงจำ 5', { exact: true })).toHaveValue(
    'cabin',
  );
  await page
    .getByLabel('เปลี่ยนรูปที่ 5', { exact: true })
    .setInputFiles('template-lab/public/images/landscape.jpg');
  await expect(
    page.locator('.studio-memory').nth(4).locator('img'),
  ).toHaveAttribute('src', /^data:image\/jpeg/);
  await page
    .getByLabel('เลือกรูปปก', { exact: true })
    .setInputFiles('template-lab/public/images/coffee.jpg');
  await expect(page.locator('.studio-cover img')).toHaveAttribute(
    'src',
    /^data:image\/jpeg/,
  );
  await page.getByRole('button', { name: 'ลบรูป 6', exact: true }).click();
  await expect(page.locator('.studio-memory')).toHaveCount(5);
  await page
    .getByRole('button', { name: 'อัปเดตตัวอย่าง', exact: true })
    .click();
  const frame = page.frameLocator('iframe');
  await frame
    .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
    .click();
  await expect(frame.locator('[data-letter-content]')).toHaveText(
    personal.letter,
  );
  await page
    .getByRole('button', { name: 'บันทึกร่างในเครื่อง', exact: true })
    .click();
  const [preview] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'เปิดร่างในแท็บใหม่', exact: true }).click(),
  ]);
  await preview
    .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
    .click();
  await expect(preview.locator('[data-letter-content]')).toHaveText(
    personal.letter,
  );
  await preview.reload();
  await preview
    .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
    .click();
  await expect(preview.getByRole('article')).toContainText(personal.to);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'ดาวน์โหลดไฟล์ร่าง' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('luvnote-love-letter-draft.json');
  await page
    .getByRole('button', { name: 'ลบร่างที่บันทึก', exact: true })
    .click();
  await preview.reload();
  await expect(
    preview.getByRole('heading', { name: 'ไม่พบฉบับร่างในเครื่องนี้' }),
  ).toBeVisible();
});

test('studio: imported choices drive four endings; invalid and mismatched drafts remain recoverable', async ({
  page,
}) => {
  await page.goto('/template-lab/?template=choose');
  const story = { ...personal, choices: structuredClone(defaultChoices) };
  story.choices.questions = ['จะไปไหนในวันครบรอบ', 'อยากทำอะไรเมื่อไปถึง'];
  story.choices.options = [
    ['ทะเล', 'ภูเขา'],
    ['พักผ่อน', 'ผจญภัย'],
  ];
  story.choices.endings = story.choices.endings.map((e, i) => ({
    title: `บทสรุปส่วนตัว ${i + 1}`,
    text: `ข้อความสาขา ${i + 1}`,
  }));
  const upload = (template: string, story: unknown) => ({
    name: 'draft.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, template, story })),
  });
  await page
    .getByLabel('นำเข้าไฟล์ร่าง', { exact: true })
    .setInputFiles(upload('garden', story));
  await expect(page.getByRole('alert')).toContainText('ไฟล์ร่างไม่ถูกต้อง');
  await page
    .getByLabel('นำเข้าไฟล์ร่าง', { exact: true })
    .setInputFiles(upload('choose', story));
  const frame = page.frameLocator('iframe');
  for (let i = 0; i < 4; i++) {
    await frame
      .locator('.choice-option')
      .nth(Math.floor(i / 2))
      .click();
    await frame
      .locator('.choice-option')
      .nth(i % 2)
      .click();
    await expect(frame.locator('.choice-ending h1')).toHaveText(
      `บทสรุปส่วนตัว ${i + 1}`,
    );
    await frame
      .getByRole('button', { name: 'เลือกเส้นทางใหม่', exact: true })
      .click();
  }
  await page.getByLabel('ชื่อผู้รับ', { exact: true }).fill('');
  await page
    .getByRole('button', { name: 'อัปเดตตัวอย่าง', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('ตรวจชื่อผู้ส่ง');
  await expect(
    frame.getByText(story.choices.questions[0], { exact: true }),
  ).toBeVisible();
});

test('validator rejects malformed dates, unsafe images, broken choices and oversized drafts', () => {
  expect(validateStory(personal)).toBe(true);
  for (const bad of [
    { ...personal, date: '2026-02-30' },
    { ...personal, cover: 'javascript:alert(1)' },
    { ...personal, choices: {} },
    { ...personal, moments: [personal.moments[0], personal.moments[0]] },
    { ...personal, music: { type: 'youtube', id: 'bad', start: 0 } },
    { ...personal, cover: 'data:image/jpeg;base64,' + 'A'.repeat(750_000) },
  ])
    expect(validateStory(bad)).toBe(false);
});

test('recipient music is opt-in and replay stops playback; provider loads only after a tap', async ({
  page,
}) => {
  await page.goto('/template-lab/?play=love-letter');
  await expect(
    page.getByRole('button', { name: 'เปิดเพลงประกอบ', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page
    .getByRole('button', { name: 'เปิดเพลงประกอบ', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'ปิดเพลงประกอบ', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'เริ่มอ่านการ์ดใหม่', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'เปิดเพลงประกอบ', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  const story = {
    ...personal,
    music: { type: 'youtube', id: 'dQw4w9WgXcQ', start: 12 },
  };
  await page.evaluate(
    ({ key, story }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, template: 'love-letter', story }),
      ),
    { key: draftKey('love-letter'), story },
  );
  await page.goto('/template-lab/?play=love-letter&draft=1');
  await expect(page.locator('.recipient-youtube iframe')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'เปิดเพลงประกอบ', exact: true })
    .click();
  await expect(page.locator('.recipient-youtube iframe')).toHaveAttribute(
    'src',
    /start=12/,
  );
  await page
    .getByRole('button', { name: 'ปิดเพลงประกอบ', exact: true })
    .click();
  await expect(page.locator('.recipient-youtube iframe')).toHaveCount(0);
});
