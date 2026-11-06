import { chromium } from 'playwright';

const url = process.env.FLAGSHIP_URL || 'http://127.0.0.1:4324/template-lab/?experiment=flagship';
const browser = await chromium.launch();
for (const mode of ['no-webgl', 'reduced']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  if (mode === 'no-webgl') await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type === 'webgl2' ? null : original.call(this, type, ...args);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /เริ่มเดินทาง/ }).click();
  await page.getByRole('heading', { name: 'ปลุกแสงดวงน้อย' }).waitFor();
  await page.locator('.fl-transitioning').waitFor({ state: 'detached' });
  for (const heading of ['หาทิศทางของหัวใจ', 'เก็บช่วงเวลาของเรา']) {
    await page.getByRole('button', { name: 'ตัวเลือก' }).click();
    await page.getByRole('button', { name: 'ข้ามฉากนี้' }).click();
    await page.getByRole('heading', { name: heading }).waitFor();
    await page.locator('.fl-transitioning').waitFor({ state: 'detached' });
  }
  await page.getByRole('button', { name: /ดูความทรงจำ/ }).first().click();
  await page.locator('.fl-memory-world img').waitFor({ state: 'visible' });
  if (!(await page.getByRole('button', { name: 'หมุนซ้าย' }).isDisabled())) throw Error(`${mode}: expected static memory`);
  for (const heading of ['เช็ดหน้าต่างรับแสง', 'จดหมายถึงเธอ', null]) {
    await page.getByRole('button', { name: 'ตัวเลือก' }).click();
    await page.getByRole('button', { name: 'ข้ามฉากนี้' }).click();
    if (heading) await page.getByRole('heading', { name: heading }).waitFor();
    else await page.getByRole('button', { name: 'ส่งแสงกลับไป' }).waitFor();
    await page.locator('.fl-transitioning').waitFor({ state: 'detached' });
  }
  await page.getByRole('button', { name: 'ส่งแสงกลับไป' }).click();
  await page.getByText(/ในเรื่องนี้แล้ว/).waitFor();
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log(`${mode}: opening, static memory and finale passed`);
  await context.close();
}
await browser.close();
