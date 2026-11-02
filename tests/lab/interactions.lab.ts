import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { templates } from '../../src/template-lab/registry';
import { alternate, demo, fromCardData } from '../../src/template-lab/data';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) &&
      !['data:', 'blob:'].includes(url.protocol)
    ) {
      errors.push(`Unexpected external request: ${url.origin}`);
      return route.abort();
    }
    return route.continue();
  });
  test.info().annotations.push({
    type: 'browser-emulation',
    description:
      'These runs do not certify a physical iPhone or Android device.',
  });
  (page as Page & { labErrors: string[] }).labErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { labErrors: string[] }).labErrors).toEqual([]);
});

async function open(page: Page, id: string, query = '') {
  await page.goto(`/template-lab/?play=${id}${query}`);
  await page.locator('main.experience').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

for (const template of templates) {
  test(`${template.id}: real interaction and final content`, async ({
    page,
  }) => {
    await open(page, template.id);
    if (template.id === 'love-letter') {
      await page
        .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
        .click();
      await expect(page.getByRole('article')).toContainText(
        demo.letter.split('\n')[0],
      );
      await page.getByRole('button', { name: /ยังมีอีกบรรทัด/ }).click();
      await expect(page.getByRole('status')).toContainText(demo.secret);
    } else if (template.id === 'polaroid') {
      await page.getByRole('button', { name: 'พลิกอ่านข้อความ' }).click();
      await expect(page.locator('.print-back')).toContainText(
        demo.moments[0].note,
      );
      await page.getByRole('button', { name: 'กลับมาดูรูป' }).click();
      await page.getByRole('button', { name: 'ขยายรูปภาพ' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'รูปถัดไป' }).click();
      await expect(page.locator('.print-front')).toContainText(
        demo.moments[1].title,
      );
      await page.getByRole('button', { name: 'รูปก่อนหน้า' }).click();
      await expect(page.locator('.print-front')).toContainText(
        demo.moments[0].title,
      );
    } else if (template.id === 'cinema') {
      await page.getByRole('link', { name: /ฉาก 3:/ }).click();
      await expect(
        page.locator(`#scene-${demo.moments[2].id}`),
      ).toBeInViewport();
      await page.getByRole('button', { name: 'เปิดฉากต่อไปของเรา' }).click();
      await expect(page.getByRole('status')).toHaveText(demo.secret);
      await page.getByRole('link', { name: /ฉาก 1:/ }).click();
      await expect(
        page.locator(`#scene-${demo.moments[0].id}`),
      ).toBeInViewport();
    } else if (template.id === 'stars') {
      await expect(
        page.getByRole('button', { name: 'อ่านข้อความในกลุ่มดาว' }),
      ).toBeDisabled();
      for (let i = 0; i < demo.moments.length; i++) {
        await page
          .getByRole('button', {
            name: `เปิดดาว ${i + 1}: ${demo.moments[i].title}`,
          })
          .click();
        await expect(page.locator('.star-readout')).toContainText(
          demo.moments[i].note,
        );
      }
      await page.getByRole('button', { name: 'อ่านข้อความในกลุ่มดาว' }).click();
      await expect(page.locator('.star-secret')).toHaveText(demo.secret);
    } else if (template.id === 'garden') {
      await expect(
        page.getByRole('button', { name: 'ผูกเป็นช่อให้เธอ' }),
      ).toBeDisabled();
      for (const m of demo.moments)
        await page
          .getByRole('button', { name: `ให้ดอกไม้บาน: ${m.title}` })
          .click();
      await expect(page.locator('.flower.bloom')).toHaveCount(4);
      await page.getByRole('button', { name: 'ผูกเป็นช่อให้เธอ' }).click();
      await expect(page.getByRole('status')).toHaveText(demo.secret);
    } else if (template.id === 'capsule') {
      await page.getByRole('button', { name: 'เปิดกล่องความทรงจำ' }).click();
      for (let i = 0; i < demo.moments.length; i++)
        await page
          .getByRole('button', {
            name: `หยิบของชิ้นที่ ${i + 1}: ${demo.moments[i].title}`,
          })
          .click();
      await page.getByRole('button', { name: 'เปิดช่องลับใต้กล่อง' }).click();
      await expect(page.getByRole('status')).toContainText(demo.secret);
    } else if (template.id === 'scrapbook') {
      await expect(
        page.getByRole('button', { name: 'หน้าก่อน' }),
      ).toBeDisabled();
      await page.getByRole('button', { name: 'ลอกเทป เปิดรูปนี้' }).click();
      await expect(page.locator('.scrap-mask')).toHaveClass(/peeled/);
      for (let i = 1; i < demo.moments.length; i++)
        await page.getByRole('button', { name: 'หน้าถัดไป' }).click();
      await expect(page.getByRole('status')).toHaveText(demo.secret);
      await expect(
        page.getByRole('button', { name: 'หน้าถัดไป' }),
      ).toBeDisabled();
      await page.getByRole('button', { name: 'หน้าก่อน' }).click();
      await expect(page.locator('.scrap-right h2')).toContainText(
        demo.moments[2].title,
      );
    } else if (template.id === 'world') {
      await page
        .getByRole('button', { name: `ไปที่ ${demo.moments[2].title}` })
        .click();
      await expect(
        page.locator(`#place-${demo.moments[2].id}`),
      ).toBeInViewport();
      for (const m of demo.moments)
        await page.locator(`#place-${m.id}`).getByRole('button').click();
      await expect(page.getByRole('status')).toHaveText(demo.secret);
    } else if (template.id === 'choose') {
      await page.locator('.choice-option').nth(0).click();
      await page.locator('.choice-option').nth(1).click();
      await expect(page.locator('.choice-ending h1')).toHaveText(
        'หลงทางไปใต้ดวงดาว',
      );
      await expect(page.getByRole('status')).toHaveText(demo.secret);
      await page.getByRole('button', { name: 'ย้อนคำตอบ' }).click();
      await page.locator('.choice-option').nth(0).click();
      await expect(page.locator('.choice-ending h1')).toHaveText(
        'เช้าวันใหม่ บนถนนเส้นใหม่',
      );
      await page.getByRole('button', { name: 'เลือกเส้นทางใหม่' }).click();
      await page.locator('.choice-option').nth(1).click();
      await page.locator('.choice-option').nth(0).click();
      await expect(page.locator('.choice-ending h1')).toHaveText(
        'กาแฟช้า ๆ ที่บ้านของเรา',
      );
      await page.getByRole('button', { name: 'ย้อนคำตอบ' }).click();
      await page.locator('.choice-option').nth(1).click();
      await expect(page.locator('.choice-ending h1')).toHaveText(
        'คืนธรรมดา ที่พิเศษที่สุด',
      );
    } else if (template.id === 'diary') {
      await page.locator('.diary-index button').last().click();
      await expect(page.locator('.diary-entry h2')).toContainText(
        demo.moments[3].title,
      );
      await page
        .getByRole('button', { name: 'เปิดกระดาษโน้ตที่พับไว้' })
        .click();
      await expect(page.getByRole('status')).toHaveText(demo.secret);
      await page.locator('.diary-index button').first().click();
      await expect(page.locator('.diary-entry h2')).toContainText(
        demo.moments[0].title,
      );
    } else if (template.id === 'constellation') {
      const slider = page.getByRole('slider');
      await slider.focus();
      await slider.press('End');
      await expect(slider).toHaveValue('3');
      await expect(page.getByRole('status')).toContainText(demo.secret);
      await page.getByRole('button', { name: 'เปิดความทรงจำนี้' }).click();
      await expect(page.getByRole('dialog')).toContainText(
        demo.moments[3].note,
      );
      await page.getByRole('button', { name: 'ปิดรายละเอียด' }).click();
      await slider.focus();
      await slider.press('Home');
      await page.getByRole('button', { name: /ไปยังช่วงเวลาถัดไป/ }).click();
      await expect(slider).toHaveValue('1');
    } else if (template.id === 'surprise') {
      await page.getByRole('button', { name: 'แตะเพื่อคลายริบบิ้น' }).click();
      await page.getByRole('button', { name: 'เปิดของขวัญชิ้นนี้' }).click();
      await expect(page.getByRole('status')).toHaveText(demo.secret);
      await page
        .getByRole('button', { name: 'ผูกริบบิ้น เล่นอีกครั้ง' })
        .click();
      await expect(
        page.getByRole('button', { name: 'แตะเพื่อคลายริบบิ้น' }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const finalAudit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      finalAudit.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });

  test(`${template.id}: alternate data, reduced motion, accessibility`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, template.id, '&dataset=alternate');
    await expect(page.locator('h1')).toBeVisible();
    // Each template must actually consume the alternate content, including its interaction states.
    if (template.id === 'love-letter')
      await page
        .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
        .click();
    if (template.id === 'capsule')
      await page.getByRole('button', { name: 'เปิดกล่องความทรงจำ' }).click();
    if (template.id === 'polaroid')
      await expect(page.locator('.print-front')).toContainText(
        alternate.moments[0].title,
      );
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const moving = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' &&
              (a.effect?.getTiming().iterations || 0) === Infinity,
          ).length,
    );
    expect(moving).toBe(0);
  });
}

test('lab: actual previews, filter, comparison, device sizes and reset', async ({
  page,
}) => {
  await page.goto('/template-lab/');
  await expect(page.locator('.template-tile')).toHaveCount(12);
  await page
    .getByRole('button', { name: 'Immersive worlds', exact: true })
    .click();
  await expect(page.locator('.template-tile')).toHaveCount(3);
  await page.getByRole('button', { name: 'ทั้งหมด', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'เปรียบเทียบ The Love Letter', exact: true })
    .check();
  await page
    .getByRole('checkbox', {
      name: 'เปรียบเทียบ Polaroid Memories',
      exact: true,
    })
    .check();
  await page.getByRole('link', { name: /เปิดดูคู่กัน/ }).click();
  await expect(page.locator('iframe')).toHaveCount(2);
  const first = page.frameLocator('iframe').nth(0);
  await first
    .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
    .click();
  await expect(first.getByRole('article')).toBeVisible();
  await page.getByRole('button', { name: 'Reset interaction' }).click();
  await expect(
    first.getByRole('button', { name: 'เปิดซองจดหมาย', exact: true }),
  ).toBeVisible();
  for (const [device, width] of [
    ['tablet', 768],
    ['desktop', 1280],
    ['mobile', 390],
  ] as const) {
    await page.locator(`input[value=${device}]`).check();
    await expect
      .poll(() =>
        page
          .locator('iframe')
          .first()
          .evaluate(
            (el) => (el as HTMLIFrameElement).contentWindow?.innerWidth,
          ),
      )
      .toBe(width);
  }
  await page.getByRole('link', { name: 'กลับไปดูทั้งหมด' }).click();
  await expect(page.locator('.template-tile')).toHaveCount(12);
});

test('lab: configuration applies, invalid data stays recoverable', async ({
  page,
}) => {
  await page.goto('/template-lab/?template=love-letter');
  await page.getByText('แก้ไขข้อมูลตัวอย่าง', { exact: true }).click();
  const editor = page.getByLabel('Story configuration (JSON)');
  await editor.fill('{bad json');
  await page.getByRole('button', { name: 'ใช้ข้อมูลนี้กับต้นแบบ' }).click();
  await expect(page.locator('#config-error')).toContainText('ตรวจ JSON');
  await editor.fill(
    JSON.stringify({
      ...alternate,
      to: 'ผู้รับจาก Configuration',
      secret: 'เปลี่ยนข้อมูลได้จริง',
    }),
  );
  await page.getByRole('button', { name: 'ใช้ข้อมูลนี้กับต้นแบบ' }).click();
  const frame = page.frameLocator('iframe');
  await frame
    .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
    .click();
  await expect(frame.getByRole('article')).toContainText(
    'ผู้รับจาก Configuration',
  );
  await frame.getByRole('button', { name: /ยังมีอีกบรรทัด/ }).click();
  await expect(frame.getByRole('status')).toHaveText(/เปลี่ยนข้อมูลได้จริง/);
});

test('legacy data adapter supports no photos and rejects active URL schemes', () => {
  const card = {
    to: 'ทดสอบ',
    from: 'ผู้ส่ง',
    age: null,
    letter: 'จดหมาย',
    secret: 'ลับ',
    lock: { type: 'seal' as const, code: '', hint: '' },
    endMsg: 'สุดท้าย',
    effect: 'none',
    music: { type: 'demo' as const },
    photos: [],
  };
  expect(fromCardData(card).moments).toHaveLength(1);
  expect(
    fromCardData({
      ...card,
      photos: [{ src: 'javascript:alert(1)', cap: 'ภาพ' }],
    }).moments[0].image,
  ).toBe('/images/coffee.jpg');
});

test('lab: keyboard navigation and semantic accessibility', async ({
  page,
}) => {
  await page.goto('/template-lab/?template=polaroid');
  const result = await new AxeBuilder({ page })
    .exclude('iframe')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'ข้ามไปเนื้อหา' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#lab-main$/);
});
