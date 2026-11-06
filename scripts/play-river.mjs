// Plays The River Remembers on a mobile viewport with real pointer input, records video + screenshots + console errors.
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path';
const url = process.env.RIVER_URL || 'http://127.0.0.1:4317/template-lab/?experiment=river&to=%E0%B8%A1%E0%B8%B4%E0%B8%99&msg=%E0%B8%82%E0%B8%AD%E0%B8%9A%E0%B8%84%E0%B8%B8%E0%B8%93%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%81%E0%B8%B1%E0%B8%99';
const out = process.env.RIVER_OUT || 'evidence/river'; const reduced = process.env.REDUCED === '1';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: reduced ? 'reduce' : 'no-preference', recordVideo: { dir: out, size: { width: 390, height: 780 } } });
const page = await ctx.newPage(); const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const t0 = Date.now(); const log = []; const mark = s => { log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`); console.log(log.at(-1)); };
const shot = n => page.screenshot({ path: path.join(out, `${reduced ? 'rm-' : ''}${n}.png`) });
const audioProbe = () => page.evaluate(() => ({ calls: window.__riverAudioCalls || {} }));
const act = () => page.evaluate(() => window.__river?.act);
const wait = ms => page.waitForTimeout(ms);
await page.goto(url); await wait(2500); await shot('00-intro');
await page.getByRole('button', { name: 'ลงสู่สายน้ำ' }).click(); await wait(800);
const lv = { max: 0, samples: [], state: '' }; const poll = setInterval(async () => { try { const r = await page.evaluate(() => ({ l: window.__riverAudio?.level?.(), s: window.__riverAudio?.state?.() })); lv.state = r.s; lv.samples.push(+r.l.toFixed(4)); lv.max = Math.max(lv.max, r.l); } catch {} }, 700);
// Act 1
mark('act1'); for (let i = 0; i < 9; i++) { await page.touchscreen.tap(60 + i * 38, 150 + (i % 3) * 120 + (i > 4 ? 200 : 0)); await wait(900); if (i === 4) await shot('01-whispering'); }
await wait(2500); mark('act now ' + await act());
// Act 2
await shot('02-petals'); const st = await page.evaluate(() => ({ p: window.__river.petals.map(q => ({ x: q.x, y: q.y })), k: [window.__river.kx, window.__river.ky] }));
const cdp = await ctx.newCDPSession(page);
async function drag(x0, y0, x1, y1, steps = 14, ms = 18) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] }); for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }] }); await wait(ms); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
for (let i = 0; i < 6; i++) { const p = await page.evaluate(i => { const q = window.__river.petals[i]; return { x: q.x, y: q.y }; }, i); await drag(p.x, p.y, st.k[0] + (i - 3) * 6, st.k[1], 12, 20); await wait(500); if (i === 3) await shot('03-assembling'); }
await wait(3200); mark('act now ' + await act()); await shot('04-krathong-done');
// Act 3: hold to light
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 560 }] }); await wait(1000); await shot('05-lighting'); await wait(1500);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(2500); await shot('06-living-flame-name'); await wait(5000); await shot('07-message'); await wait(3000); mark('act now ' + await act());
// Act 4: draw on water
for (let s = 0; s < 4; s++) { const y = 420 + s * 70; await drag(40, y, 350, y + (s % 2 ? 40 : -40), 26, 18); await wait(250); if (s === 1) await shot('08-echo-trails'); }
await wait(2500); await shot('09-echo-forming'); await wait(4500); await shot('10-echo-name'); await wait(3500); mark('act now ' + await act());
// Act 5: drag up
await shot('11-impossible-start'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 650 }] });
for (let i = 1; i <= 30; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 + Math.sin(i / 4) * 25, y: 650 - i * 14 }] }); await wait(40); if (i === 12) await shot('12-impossible-mid'); }
await shot('13-impossible-swapped'); await wait(4200); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(1500); mark('act now ' + await act());
// Act 6: wish + swipe
await shot('14-wish'); await page.getByRole('button', { name: 'ขอบคุณที่อยู่ข้างกัน' }).click(); await wait(800); await shot('15-ready-release');
await drag(195, 600, 250, 380, 8, 12); await wait(2500); await shot('16-sailing'); await wait(2500); await shot('16b-sailing-far'); await wait(4500); mark('act now ' + await act());
// Act 7
await wait(4000); await shot('17-finale'); await wait(6000); await shot('18-finale-later'); mark('final act ' + await act());
clearInterval(poll); const calls = (await audioProbe()).calls; console.log('audio', lv.state, 'maxRMS', lv.max.toFixed(4), calls);
fs.writeFileSync(path.join(out, `${reduced ? 'rm-' : ''}run-log.json`), JSON.stringify({ log, errors, audio: { state: lv.state, maxRMS: lv.max, samples: lv.samples, calls }, total: (Date.now() - t0) / 1000 }, null, 1));
await ctx.close(); await browser.close(); console.log('errors:', errors.length, errors.slice(0, 5));
