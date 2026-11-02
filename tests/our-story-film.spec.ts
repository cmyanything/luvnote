import { test, expect, type Page } from '@playwright/test';
import { daysTogether } from '../src/lib/dates';

const PIXEL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

function card(
  photos: number,
  letter = 'ขอบคุณที่เดินมาด้วยกัน\nเลือกเธอในทุกวัน ♡',
) {
  return {
    to: 'มิ้นท์',
    from: 'ต้น',
    startDate: '2022-06-14',
    letter,
    secret: 'ความลับ',
    lock: { type: 'seal' },
    effect: 'hearts',
    music: { type: 'demo' },
    endMsg: 'อยากเขียนหน้าต่อไปกับเธอ',
    photos: Array.from({ length: photos }, (_, i) => ({
      src: PIXEL,
      cap: `ความทรงจำที่ ${i + 1}`,
      date: '2023-02-18',
    })),
  };
}

async function openCard(page: Page, data: object) {
  await page.route('https://api.luvnote.fun/v2/cards/abc2345', (route) =>
    route.fulfill({
      json: { theme: 'anniversary-journey', data },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.goto('/themes/anniversary-journey/card.html#abc2345');
}

/** Fast-forwards the film's own timeline so the test does not wait a minute. */
async function fastForward(page: Page) {
  await page
    .locator('.mv-stage')
    .evaluate((el) =>
      (
        el as HTMLElement & { movieTimeline: { timeScale(n: number): void } }
      ).movieTimeline.timeScale(40),
    );
}

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
});

test('the sample card plays as a film and hands back to the journal', async ({
  page,
}) => {
  await page.goto('/themes/anniversary-journey/card.html');
  await page.getByRole('button', { name: /ดูเป็นหนังสั้นของเรา/ }).click();
  const film = page.getByRole('dialog', { name: 'หนังสั้นของเรา' });
  await expect(film).toBeVisible();
  await expect(film.locator('[data-scene^="m"]')).toHaveCount(3);
  await fastForward(page);
  await expect(film.getByRole('button', { name: /ดูอีกครั้ง/ })).toBeVisible({
    timeout: 15000,
  });
  await expect(film.locator('[data-m="count"]')).toHaveText(
    daysTogether('2022-06-14').toLocaleString('en-US'),
  );
  await film.getByRole('button', { name: /อ่านสมุดของเรา/ }).click();
  await expect(film).toHaveCount(0);
  await expect(page.locator('#journey-start')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('a real card films its own photos, letter and names; Escape closes it', async ({
  page,
}) => {
  await openCard(page, card(5));
  await page.getByRole('button', { name: /ดูเป็นหนังสั้นของเรา/ }).click();
  const film = page.getByRole('dialog', { name: 'หนังสั้นของเรา' });
  await expect(film.locator('[data-m="names"]')).toHaveText('มิ้นท์&ต้น');
  await expect(film.locator('[data-scene^="m"] img')).toHaveCount(5);
  await expect(film.locator('[data-m="c4"]')).toHaveCount(1);
  await expect(film.locator('[data-m="letter-text"]')).toContainText(
    'เลือกเธอในทุกวัน',
  );
  await expect(film.locator('[data-m="end-msg"]')).toHaveText(
    'อยากเขียนหน้าต่อไปกับเธอ',
  );
  await film.getByRole('button', { name: 'หยุดชั่วคราว' }).click();
  await expect(film.getByRole('button', { name: 'เล่นต่อ' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(film).toHaveCount(0);
});

test('a card without photos or a letter still plays to the end', async ({
  page,
}) => {
  await openCard(page, card(0, ''));
  await page.getByRole('button', { name: /ดูเป็นหนังสั้นของเรา/ }).click();
  const film = page.getByRole('dialog', { name: 'หนังสั้นของเรา' });
  await expect(film.locator('[data-scene="strip"]')).toHaveCount(0);
  await expect(film.locator('[data-scene="letter"]')).toHaveCount(0);
  await fastForward(page);
  await expect(film.getByRole('button', { name: /ดูอีกครั้ง/ })).toBeVisible({
    timeout: 15000,
  });
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the cover opens, polaroids land and a long letter scrolls while it is written', async ({
    page,
  }) => {
    await openCard(page, card(3, 'บรรทัดยาว ๆ ของจดหมาย '.repeat(30)));
    await page.getByRole('button', { name: /ดูเป็นหนังสั้นของเรา/ }).click();
    const stage = page.locator('.mv-stage');
    await expect(stage.locator('[data-m="names"]')).toBeAttached();
    const at = (seconds: number) =>
      stage.evaluate((el, s) => {
        const tl = (
          el as HTMLElement & {
            movieTimeline: { pause(): void; seek(n: number): void };
          }
        ).movieTimeline;
        tl.pause();
        tl.seek(s);
      }, seconds);
    await at(3.4);
    const lid = await stage
      .locator('[data-m="cover-lid"]')
      .evaluate((el) => getComputedStyle(el).transform);
    expect(lid).not.toBe('none');
    // first polaroid has landed by the middle of its scene
    await at(5 + 4 + 4.4 + 5 + 2.5);
    await expect(stage.locator('[data-scene="m0"]')).toHaveCSS('opacity', '1');
    // the letter: written top to bottom and scrolled because it is long
    const letterStart = 5 + 4 + 4.4 + 5 + 3 * 4.4 + 6;
    await at(letterStart + 6);
    const text = stage.locator('[data-m="letter-text"]');
    const ink = await text.evaluate((el) =>
      parseFloat(getComputedStyle(el).getPropertyValue('--ink')),
    );
    expect(ink).toBeGreaterThan(0);
    expect(ink).toBeLessThan(100);
    const shift = await text.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).m42,
    );
    expect(shift).toBeLessThan(0);
  });
});
