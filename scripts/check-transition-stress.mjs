import { chromium, webkit } from 'playwright';
const url = process.env.FLAGSHIP_URL || 'http://127.0.0.1:4324/template-lab/?experiment=flagship';
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /เริ่มเดินทาง/ }).dblclick({ delay: 25 }).catch(() => {});
  await page.locator('.fl-transitioning').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'ตัวเลือก' }).click();
  await page.getByRole('button', { name: 'ข้ามฉากนี้' }).click();
  await page.getByRole('heading', { name: 'ปลุกแสงดวงน้อย' }).waitFor();
  await page.waitForTimeout(2600);
  if (await page.locator('.fl-stage').count() !== 1 || await page.locator('.fl-shared,.fl-reality-portal').count()) throw Error('skip left a transition alive');
  await page.getByRole('button', { name: 'ตัวเลือก' }).click();
  await page.getByRole('button', { name: 'ข้ามฉากนี้' }).click();
  await page.getByRole('heading', { name: 'หาทิศทางของหัวใจ' }).waitFor();
  await page.getByRole('button', { name: 'ตัวเลือก' }).click();
  await page.getByRole('button', { name: 'ย้อนฉาก' }).click();
  await page.getByRole('heading', { name: 'ปลุกแสงดวงน้อย' }).waitFor();
  await page.locator('.fl-transitioning').waitFor({ state: 'detached' });
  if (await page.locator('.fl-stage').evaluate(node => getComputedStyle(node).animationName) !== 'none') throw Error('settled stage restarted its generic entrance');
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'ตัวเลือก' }).click();
    await page.getByRole('button', { name: 'ข้ามฉากนี้' }).click();
    await page.waitForFunction(expected => document.querySelector('.fl-stage:not(.fl-stage-out)')?.getAttribute('data-stage') === String(expected), i + 2);
  }
  await page.getByRole('button', { name: 'ส่งแสงกลับไป' }).waitFor();
  await page.getByRole('button', { name: 'ตัวเลือก' }).click();
  await page.getByRole('button', { name: 'ข้ามไปข้อความท้าย' }).click();
  await page.getByRole('button', { name: 'เริ่มเรื่องอีกครั้ง' }).click();
  await page.getByRole('heading', { name: 'มีแสงดวงหนึ่ง รอเธออยู่' }).waitFor();
  await page.waitForTimeout(1500);
  if (await page.locator('.fl-stage').count() !== 1 || await page.locator('.fl-shared').count()) throw Error('replay left a transition alive');
  if (await page.locator('.fl-stage').evaluate(node => getComputedStyle(node).animationName) !== 'none') throw Error('replay restarted its generic entrance');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(`${name}: repeated press, skip during portal, backwards and replay passed`);
  await browser.close();
}
