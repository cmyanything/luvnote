import { test, expect, type Page, type FrameLocator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demo, type Story } from '../../src/template-lab/data';

async function configure(
  page: Page,
  id: string,
  story: Story,
): Promise<FrameLocator> {
  await page.goto(`/template-lab/?template=${id}`);
  await page.locator('.studio-json > summary').click();
  await page
    .getByLabel('Story configuration (JSON)')
    .fill(JSON.stringify(story));
  await page.getByRole('button', { name: 'ใช้ข้อมูลนี้กับต้นแบบ' }).click();
  await expect(page.locator('.dataset-picker select')).toHaveValue('custom');
  return page.frameLocator('iframe');
}

test('changing memories recovers from an image error', async ({ page }) => {
  const story = {
    ...demo,
    moments: [
      {
        ...demo.moments[0],
        id: 'broken',
        title: 'รูปที่หาไม่พบ',
        image: '/images/not-an-image.jpg',
      },
      {
        ...demo.moments[1],
        id: 'valid',
        title: 'รูปที่ยังเปิดได้',
        image: '/images/coffee.jpg',
      },
    ],
  };
  const frame = await configure(page, 'stars', story);
  await frame.getByRole('button', { name: 'เปิดดาว 1: รูปที่หาไม่พบ' }).click();
  await expect(frame.locator('.photo-fallback')).toBeVisible();
  await frame
    .getByRole('button', { name: 'เปิดดาว 2: รูปที่ยังเปิดได้' })
    .click();
  await expect(frame.locator('.star-readout img')).toHaveAttribute(
    'src',
    '/images/coffee.jpg',
  );
  await expect
    .poll(() =>
      frame
        .locator('.star-readout img')
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});

test('long Polaroid notes remain scrollable and keyboard accessible', async ({
  page,
}) => {
  const frame = await configure(page, 'polaroid', {
    ...demo,
    moments: [
      {
        ...demo.moments[0],
        note: 'ความทรงจำที่อยากเก็บไว้ '.repeat(60) + 'บรรทัดสุดท้าย',
      },
    ],
  });
  await frame.getByRole('button', { name: 'แกะห่อรูปความทรงจำ' }).click();
  await frame.getByRole('button', { name: 'พลิกอ่านข้อความ' }).click();
  const region = frame.getByRole('region', { name: 'ข้อความหลังรูป' });
  await expect(region).toContainText('บรรทัดสุดท้าย');
  await expect
    .poll(() => region.evaluate((el) => el.scrollHeight > el.clientHeight))
    .toBe(true);
  await region.focus();
  await region.press('End');
  await expect
    .poll(() => region.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await expect(
    frame.getByRole('button', { name: 'กลับมาดูรูป' }),
  ).toBeVisible();
});

test('studio uploads an undated Diary memory with a visible, named index entry', async ({page}) => {
  await page.goto('/template-lab/?template=diary');
  await page.getByLabel('เพิ่มรูปความทรงจำ', {exact:true}).setInputFiles('template-lab/public/images/cabin.jpg');
  await expect(page.locator('.studio-memory')).toHaveCount(5);
  await page.getByRole('textbox', {name:'ชื่อความทรงจำ 5',exact:true}).fill('รูปใหม่ที่ยังไม่ได้ใส่วันที่');
  await page.getByRole('textbox', {name:'เรื่องเล่ารูป 5',exact:true}).fill('วันธรรมดาที่อยากจดจำ');
  await page.getByRole('button',{name:'อัปเดตตัวอย่าง',exact:true}).click();
  const frame=page.frameLocator('iframe');
  const entry=frame.getByRole('button',{name:'อ่านบันทึก 5: รูปใหม่ที่ยังไม่ได้ใส่วันที่',exact:true});
  await expect(entry).toContainText('บันทึก 5');
  await expect(entry.locator('strong')).toHaveText('ไม่ระบุวันที่');
  await entry.click();
  await expect(frame.locator('.diary-entry h2')).toContainText('รูปใหม่ที่ยังไม่ได้ใส่วันที่');
  await expect(frame.locator('.diary-note')).toHaveText('วันธรรมดาที่อยากจดจำ');
  await expect(frame.locator('.diary-entry-date')).toContainText('ความทรงจำที่ 5');
});

test('eight configurable memories remain reachable in the garden and capsule', async ({
  page,
}) => {
  const story = {
    ...demo,
    moments: Array.from({ length: 8 }, (_, i) => ({
      ...demo.moments[i % 4],
      id: `many-${i}`,
      title: `ความทรงจำ ${i + 1}`,
    })),
  };
  const garden = await configure(page, 'garden', story);
  for (const moment of story.moments)
    await garden
      .getByRole('button', { name: `ให้ดอกไม้บาน: ${moment.title}` })
      .click();
  await garden.getByRole('button', { name: 'ผูกเป็นช่อให้เธอ' }).click();
  await expect(garden.getByRole('status')).toHaveText(story.secret);
  const capsule = await configure(page, 'capsule', story);
  await capsule.getByRole('button', { name: 'เปิดกล่องความทรงจำ' }).click();
  for (let i = 0; i < 8; i++)
    await capsule
      .getByRole('button', {
        name: `หยิบของชิ้นที่ ${i + 1}: ${story.moments[i].title}`,
      })
      .click();
  await capsule.getByRole('button', { name: 'เปิดช่องลับใต้กล่อง' }).click();
  await expect(capsule.getByRole('status')).toContainText(story.secret);
});

test('dragging photos, swiping pages and pulling the ribbon', async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  async function drag(x: number, y: number, dx: number, dy: number) {
    if (browserName === 'chromium' && isMobile) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 12; i++)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + (dx * i) / 12, y: y + (dy * i) / 12 }],
        });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await cdp.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y + dy, { steps: 12 });
      await page.mouse.up();
    }
  }
  await page.goto('/template-lab/?play=polaroid');
  await page.getByRole('button', { name: 'แกะห่อรูปความทรงจำ' }).click();
  await page.getByRole('button', { name: 'เปิดภาพทันที' }).click();
  const card = page.locator('.polaroid-drag');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await drag(box.x + box.width / 2, box.y + box.height / 2, -100, 0);
  await expect(page.locator('.print-front')).toContainText(
    demo.moments[1].title,
  );
  await page.goto('/template-lab/?play=scrapbook');
  const image = page.locator('.scrap-image');
  await image.scrollIntoViewIfNeeded();
  const imageBox = (await image.boundingBox())!;
  await drag(
    imageBox.x + imageBox.width / 2,
    imageBox.y + imageBox.height / 2,
    -85,
    0,
  );
  await expect(page.locator('.scrap-right h2')).toContainText(
    demo.moments[1].title,
  );
  await page.goto('/template-lab/?play=surprise');
  const ribbon = page.getByRole('button', { name: 'ลากริบบิ้นลงเพื่อคลายปม' });
  await ribbon.scrollIntoViewIfNeeded();
  const r = (await ribbon.boundingBox())!;
  await drag(r.x + r.width / 2, r.y + 40, 0, 100);
  await expect(
    page.getByRole('button', { name: 'เปิดของขวัญชิ้นนี้' }),
  ).toBeVisible();
});

test('optional Paper Shader mounts on request and has a static fallback', async ({
  page,
}) => {
  await page.goto('/template-lab/?play=stars');
  const toggle = page.getByRole('button', { name: 'เปิดแสงเหนือ' });
  await expect(toggle).toBeVisible();
  await expect(page.locator('.aurora')).toHaveCount(0);
  const supported = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  });
  test.skip(
    !supported,
    'No WebGL2 in this browser; static default checked, GPU branch unverified.',
  );
  await toggle.click();
  await expect(page.locator('.aurora canvas')).toBeVisible();
  await page.getByRole('button', { name: 'ปิดแสงเหนือ' }).click();
  await expect(page.locator('.aurora')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toHaveCount(0);
});

test('touch taps and reduced-motion mode preserve the surprise journey', async ({
  page,
  isMobile,
}) => {
  await page.goto('/template-lab/?play=surprise&still=1');
  const untie = page.getByRole('button', { name: 'แตะเพื่อคลายริบบิ้น' });
  if (isMobile) await untie.tap();
  else await untie.click();
  const open = page.getByRole('button', { name: 'เปิดของขวัญชิ้นนี้' });
  if (isMobile) await open.tap();
  else await open.click();
  await expect(page.getByRole('status')).toHaveText(demo.secret);
  await expect(page.locator('.surprise-confetti')).toHaveCount(0);
  await expect(page.locator('.curtain').first()).toBeHidden();
});

test('scrapbook pages preserve text contrast throughout the page turn', async ({ page }) => {
  await page.goto('/template-lab/?play=scrapbook');
  await page.locator('.scrapbook-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Pin the animation rather than letting faster/slower CI machines miss its start.
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'หน้าถัดไป', exact: true }).click();
    for (const time of [0, 190, 380]) {
      await page.locator('.scrapbook-page').evaluate((el, time) => {
        for (const animation of el.getAnimations()) {
          animation.pause();
          animation.currentTime = time;
        }
      }, time);
      await expect(page.locator('.scrapbook-page')).toHaveCSS('opacity', '1');
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
    }
  }
});
