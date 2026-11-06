import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.goto(process.env.FLAGSHIP_URL || 'http://127.0.0.1:4324/template-lab/?experiment=flagship', { waitUntil: 'networkidle' });
const measurements = [];
async function transition(label, button) {
  await page.evaluate(() => { window.__transitionFrames = []; let last; window.__measureFrame = true; const f = t => { if (!window.__measureFrame) return; if (last !== undefined) window.__transitionFrames.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await button.click();
  await page.locator('.fl-transitioning').waitFor({ state: 'detached' });
  const frames = await page.evaluate(() => { window.__measureFrame = false; return window.__transitionFrames; });
  frames.sort((a, b) => a - b);
  measurements.push({ transition: label, intervals: frames.length, medianMs: frames[Math.floor(frames.length * .5)], p95Ms: frames[Math.floor(frames.length * .95)], over33ms: frames.filter(x => x > 33.4).length });
}
await transition('opening-lantern', page.getByRole('button', { name: /เริ่มเดินทาง/ }));
for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /ปลุกตะเกียง/ }).click({ force: true }); await page.waitForTimeout(300); }
await transition('lantern-compass', page.getByRole('button', { name: /พาแสงไปด้วยกัน/ }));
await page.getByRole('button', { name: 'ช่วยฉันหาทิศทาง' }).click();
await transition('compass-memory', page.getByRole('button', { name: /ตามแสงไป/ }));
await page.getByRole('button', { name: /ดูความทรงจำ/ }).first().click();
await transition('memory-window', page.getByRole('button', { name: /เก็บไว้ในแสงนี้/ }));
for (let i = 0; i < 3; i++) await page.locator('.fl-glass-pane').click();
await transition('window-letter', page.getByRole('button', { name: /มีจดหมายอีกฉบับ/ }));
await page.getByRole('button', { name: 'เปิดจดหมาย' }).click();
await transition('letter-finale', page.getByRole('button', { name: /เหลืออีกหนึ่งอย่าง/ }));
await fs.mkdir('evidence/transition-after', { recursive: true });
await fs.writeFile('evidence/transition-after/performance.json', JSON.stringify({ environment: 'Chromium 390x844, SwiftShader, 4x CPU throttle; requestAnimationFrame intervals, not physical device FPS', measurements }, null, 2));
console.log(JSON.stringify(measurements, null, 2));
await browser.close();
