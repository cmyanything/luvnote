import { expect, type Page } from '@playwright/test';
import type { Story } from '../../src/template-lab/data';

/** Recipient actions shared by acceptance tests and real screenshot capture. */
export async function finishStory(
  page: Page,
  id: string,
  story: Story,
  inspect = false,
) {
  const check = async (i: number) => {
    if (inspect)
      await expect(
        page.getByText(story.moments[i].note, { exact: true }).first(),
      ).toBeVisible();
  };
  if (id === 'love-letter') {
    await page
      .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
      .click();
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('navigation', { name: 'เลือกรูปที่แนบมา' })
        .getByRole('button')
        .nth(i)
        .click();
      await check(i);
    }
    await page.getByRole('button', { name: /ยังมีอีกบรรทัด/ }).click();
  } else if (id === 'polaroid') {
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('button', {
          name: `เลือกรูป ${i + 1}: ${story.moments[i].title}`,
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'พลิกอ่านข้อความ', exact: true })
        .click();
      await check(i);
    }
    await page
      .getByRole('button', { name: 'ยังมีรูปใบสุดท้ายถึงเธอ', exact: true })
      .click();
  } else if (id === 'cinema') {
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('link', {
          name: `ฉาก ${i + 1}: ${story.moments[i].title}`,
          exact: true,
        })
        .click();
      await check(i);
    }
    await page.getByRole('button', { name: 'อ่านบันทึกหลังเลนส์' }).click();
    await page.getByRole('button', { name: 'เปิดฉากต่อไปของเรา' }).click();
  } else if (id === 'stars') {
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('button', {
          name: `เปิดดาว ${i + 1}: ${story.moments[i].title}`,
          exact: true,
        })
        .click();
      await check(i);
    }
    await page.getByRole('button', { name: 'อ่านข้อความในกลุ่มดาว' }).click();
  } else if (id === 'garden') {
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('button', {
          name: `ให้ดอกไม้บาน: ${story.moments[i].title}`,
          exact: true,
        })
        .click();
      await check(i);
    }
    await page.getByRole('button', { name: 'ผูกเป็นช่อให้เธอ' }).click();
    await page.getByRole('button', { name: 'แกะป้ายที่ผูกไว้กับช่อ' }).click();
  } else if (id === 'capsule') {
    await page.getByRole('button', { name: 'เปิดกล่องความทรงจำ' }).click();
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('button', {
          name: `หยิบของชิ้นที่ ${i + 1}: ${story.moments[i].title}`,
          exact: true,
        })
        .click();
      await check(i);
    }
    await page.getByRole('button', { name: 'เปิดช่องลับใต้กล่อง' }).click();
  } else if (id === 'scrapbook') {
    for (let i = 0; i < story.moments.length; i++) {
      if (i)
        await page
          .getByRole('button', { name: 'หน้าถัดไป', exact: true })
          .click();
      await page.getByRole('button', { name: 'ลอกเทป เปิดรูปนี้' }).click();
      await check(i);
    }
  } else if (id === 'world') {
    for (let i = 0; i < story.moments.length; i++) {
      const place = page.locator(`#place-${story.moments[i].id}`);
      await place
        .getByRole('button', { name: 'เก็บสถานที่นี้ไว้', exact: true })
        .click();
      await check(i);
    }
    await page
      .getByRole('button', { name: 'เปิดจดหมายที่รออยู่ที่บ้าน' })
      .click();
  } else if (id === 'choose') {
    await page.locator('.choice-option').first().click();
    await page.locator('.choice-option').first().click();
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('navigation', { name: 'ความทรงจำในเส้นเรื่อง' })
        .getByRole('button')
        .nth(i)
        .click();
      await check(i);
    }
    await page.getByRole('button', { name: 'อ่านจดหมายของเส้นทางนี้' }).click();
  } else if (id === 'diary') {
    for (let i = 0; i < story.moments.length; i++) {
      await page.locator('.diary-index button').nth(i).click();
      await check(i);
      if (inspect) {
        const image = await page.locator('.diary-photo').boundingBox();
        const note = await page.locator('.diary-note').boundingBox();
        expect(note!.y).toBeGreaterThanOrEqual(image!.y + image!.height - 1);
      }
    }
    await page.getByRole('button', { name: 'เปิดกระดาษโน้ตที่พับไว้' }).click();
    await page.getByRole('button', { name: 'อ่านหน้าสุดท้ายของสมุด' }).click();
  } else if (id === 'constellation') {
    const slider = page.getByRole('slider');
    for (let i = 0; i < story.moments.length; i++) {
      await slider.focus();
      await slider.press(i ? 'ArrowRight' : 'Home');
      await check(i);
    }
    await page
      .getByRole('button', { name: 'อ่านข้อความที่จุดหมายของเรา' })
      .click();
  } else if (id === 'surprise') {
    await page.getByRole('button', { name: 'แตะเพื่อคลายริบบิ้น' }).click();
    await page.getByRole('button', { name: 'เปิดของขวัญชิ้นนี้' }).click();
    for (let i = 0; i < story.moments.length; i++) {
      await page
        .getByRole('navigation', { name: 'รูปในของขวัญ' })
        .getByRole('button')
        .nth(i)
        .click();
      await check(i);
    }
    await page
      .getByRole('button', { name: 'จดหมายที่ใส่ไว้ในของขวัญ' })
      .click();
  }
}
