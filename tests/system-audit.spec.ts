// Exploratory full-system audit (not part of CI): real Worker in workerd + built frontend + real browser.
import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import jpeg from 'jpeg-js';
import { themes } from '../src/themes';
import { workerdFixture } from './helpers/workerd-env.mjs';

test.skip(process.env.VITE_R2_MEDIA_ENABLED !== 'true' || !process.env.AUDIT, 'audit only');
test.describe.configure({ mode: 'serial' });

const ADMIN = 'audit-admin-key-'.padEnd(40, 'z');
const findings: string[] = [];
const note = (s: string) => { findings.push(s); console.log('FINDING: ' + s); };
const px = (w: number, h: number, c: number[]) => { const d = new Uint8Array(w * h * 4); for (let i = 0; i < d.length; i += 4) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return Buffer.from(jpeg.encode({ width: w, height: h, data: d }, 85).data); };
const fileA = { name: 'a.jpg', mimeType: 'image/jpeg', buffer: px(40, 30, [210, 110, 140]) };
const fileB = { name: 'b.jpg', mimeType: 'image/jpeg', buffer: px(30, 40, [90, 140, 200]) };

let f: Awaited<ReturnType<typeof workerdFixture>>, server: Server, endpoint = '', ip = 1;
test.beforeAll(async () => {
  f = await workerdFixture({ bindings: { ADMIN_KEY: ADMIN } });
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const c of req) chunks.push(Buffer.from(c));
    const body = Buffer.concat(chunks);
    const headers = Object.fromEntries(Object.entries(req.headers).filter((e): e is [string, string] => typeof e[1] === 'string'));
    const r = await f.mf.dispatchFetch(endpoint + req.url, { method: req.method, headers: { ...headers, 'CF-Connecting-IP': '192.0.2.' + ip }, ...(body.length ? { body } : {}) });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  endpoint = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
test.afterAll(async () => { server?.close(); await f?.mf.dispose(); console.log('\n===== AUDIT FINDINGS (' + findings.length + ') =====\n' + findings.join('\n')); });

async function prep(page: Page) {
  ip++;
  const errors: string[] = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|youtube|ERR_FAILED|net::/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
  await page.route('https://www.youtube.com/**', r => r.abort());
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', r => r.fulfill({ contentType: 'text/javascript', body: "window.turnstile={render:(el,o)=>{o.callback('XXXX.DUMMY.TOKEN.XXXX');return 'w';},remove:()=>{},reset:()=>{}};" }));
  // Point every API call (fetch and <img>) at the local Worker.
  await page.route(/^https:\/\/api\.luvnote\.fun\//, async r => {
    const u = new URL(r.request().url());
    const resp = await page.request.fetch(endpoint + u.pathname + u.search, { method: r.request().method(), headers: r.request().headers(), data: r.request().postDataBuffer() ?? undefined, failOnStatusCode: false });
    await r.fulfill({ response: resp });
  });
  return errors;
}
async function fill(page: Page, theme: (typeof themes)[number], to: string) {
  await page.getByLabel('ชื่อผู้รับ').fill(to);
  await page.getByLabel('ชื่อผู้ส่ง').fill('ผู้ส่งทดสอบ');
  if (theme.occasion === 'anniversary') await page.getByLabel('วันที่เราเริ่มคบกัน').fill('2023-02-14');
  await page.locator('#letter').fill('จดหมายฉบับแรก');
  if (!theme.noSecret) await page.locator('#secret').fill('ความลับ');
  await page.locator('#file').setInputFiles([fileA, fileB]);
  await expect(page.locator('.ph')).toHaveCount(2);
  if (theme.coverLabel) await page.locator('#covFile').setInputFiles(fileA);
}
async function mediaLoaded(page: Page) {
  return page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 800));
    return [...document.images].filter(i => i.src.includes('/v3/cards/')).map(i => i.complete && i.naturalWidth > 0);
  });
}

for (const theme of themes) {
  test(`${theme.id}: create → open → edit twice → reopen`, async ({ page }) => {
    const errors = await prep(page);
    await page.goto(`/themes/${theme.id}/`);
    await fill(page, theme, 'ผู้รับ ' + theme.id);
    const t0 = Date.now();
    await page.locator('#mkBtn').click();
    await expect(page.locator('#sheet')).toBeVisible({ timeout: 20000 });
    if (Date.now() - t0 > 8000) note(`${theme.id}: create took ${Date.now() - t0}ms`);
    const cardUrl = await page.locator('#openBtn').getAttribute('href');
    const editText = await page.locator('#editLnk').textContent().catch(() => null);
    if (!editText) { note(`${theme.id}: share sheet has no edit link`); return; }
    const line = await page.locator('#lineBtn').getAttribute('href');
    if (!line || !decodeURIComponent(line).includes(cardUrl!)) note(`${theme.id}: LINE message missing card url`);
    if (decodeURIComponent(line || '').includes('key=')) note(`${theme.id}: LINE share message leaks the edit key`);
    const id = cardUrl!.slice(-7);
    const editUrl = '/' + editText.replace(/^luvnote\.fun\//, '');

    // recipient opens the card
    await page.goto('about:blank'); await page.goto('/' + new URL(cardUrl!).hash);
    await expect(page.locator('.js-to').first()).toContainText('ผู้รับ', { timeout: 15000 });
    if (theme.id === 'anniversary-journey') await page.getByRole('button', { name: 'เปิดสมุดความทรงจำ', exact: true }).click();
    const loaded1 = await mediaLoaded(page);
    if (theme.id === 'anniversary-journey' && loaded1.filter(Boolean).length < 2) note(`${theme.id}: viewer shows ${loaded1.filter(Boolean).length}/2 photos`);

    // owner edits: change letter, remove one photo, add one
    for (const round of [1, 2]) {
      await page.goto('about:blank'); await page.goto(editUrl);
      await expect(page.locator('#editBanner')).toContainText('กำลังแก้ไขการ์ดเดิม', { timeout: 15000 });
      const to = await page.getByLabel('ชื่อผู้รับ').inputValue();
      if (to !== 'ผู้รับ ' + theme.id) note(`${theme.id}: edit round ${round} loaded recipient "${to}"`);
      const photos = await page.locator('.ph').count();
      if (photos !== 2) note(`${theme.id}: edit round ${round} loaded ${photos} photos (expected 2)`);
      const letter = await page.locator('#letter').inputValue();
      if (letter !== (round === 1 ? 'จดหมายฉบับแรก' : 'แก้ครั้งที่ 1')) note(`${theme.id}: edit round ${round} loaded letter "${letter}"`);
      if (theme.occasion === 'anniversary' && await page.getByLabel('วันที่เราเริ่มคบกัน').inputValue() !== '2023-02-14') note(`${theme.id}: start date not restored`);
      await page.locator('#letter').fill('แก้ครั้งที่ ' + round);
      await page.getByLabel('ลบรูปที่ 2', { exact: true }).click();
      await page.locator('#file').setInputFiles([fileB]);
      await expect(page.locator('.ph')).toHaveCount(2);
      await page.locator('#mkBtn').click();
      const ok = await page.locator('#share-title').filter({ hasText: 'บันทึกการแก้ไขแล้ว' }).waitFor({ timeout: 20000 }).then(() => true, () => false);
      if (!ok) { note(`${theme.id}: edit round ${round} did not save (toast: ${await page.locator('#toast').textContent()})`); break; }
      if ((await page.locator('#openBtn').getAttribute('href')) !== cardUrl) note(`${theme.id}: edit changed the card link`);
    }
    const api = await (await f.request('/v2/cards/' + id)).json() as { data: { letter: string; photos: unknown[] } };
    if (api.data.letter !== 'แก้ครั้งที่ 2') note(`${theme.id}: API letter after edits = "${api.data.letter}"`);
    if (api.data.photos.length !== 2) note(`${theme.id}: API photos after edits = ${api.data.photos.length}`);
    const live = (await f.db.prepare("SELECT count(*) n FROM media_assets WHERE card_id=? AND expires_at>0").bind(id).first()) as { n: number };
    const expect_ = 2 + (theme.coverLabel ? 1 : 0);
    if (live.n !== expect_) note(`${theme.id}: ${live.n} live media rows after edits (expected ${expect_})`);
    if (errors.length) note(`${theme.id}: browser errors: ${[...new Set(errors)].join(' | ')}`);
  });
}

test('owner admin page reissues a working edit link; old link stops', async ({ page }) => {
  const errors = await prep(page);
  const theme = themes.find(t => t.id === 'velvet-gift')!;
  await page.goto(`/themes/${theme.id}/`); await fill(page, theme, 'ลูกค้าลืมลิงก์');
  await page.locator('#mkBtn').click(); await expect(page.locator('#sheet')).toBeVisible({ timeout: 20000 });
  const oldEdit = '/' + (await page.locator('#editLnk').textContent())!.replace(/^luvnote\.fun\//, '');
  const cardUrl = (await page.locator('#openBtn').getAttribute('href'))!;
  await page.goto('/admin/');
  await page.getByLabel('รหัสผู้ดูแล (ADMIN_KEY ที่ตั้งไว้ใน Cloudflare)').fill(ADMIN);
  await page.getByLabel('ลิงก์การ์ด หรือรหัส 7 ตัวท้ายลิงก์').fill(cardUrl);
  await page.getByRole('button', { name: 'ออกลิงก์แก้ไขใหม่' }).click();
  const shown = await page.locator('#result.show').waitFor({ timeout: 10000 }).then(() => true, () => false);
  if (!shown) { note(`admin: reissue failed: ${await page.locator('#msg').textContent()}`); return; }
  const newEdit = new URL((await page.locator('#editLink').textContent())!);
  await page.goto(newEdit.pathname + newEdit.search + newEdit.hash);
  await expect(page.locator('#editBanner')).toContainText('กำลังแก้ไขการ์ดเดิม', { timeout: 15000 });
  await page.locator('#letter').fill('แก้ด้วยลิงก์ใหม่'); await page.locator('#mkBtn').click();
  if (!await page.locator('#share-title').filter({ hasText: 'บันทึกการแก้ไขแล้ว' }).waitFor({ timeout: 20000 }).then(() => true, () => false)) note('admin: new edit link could not save');
  await page.goto('about:blank'); await page.goto(oldEdit);
  await page.waitForTimeout(2500);
  const banner = (await page.locator('#editBanner').textContent())?.trim();
  if (!banner?.includes('ลิงก์แก้ไขนี้ใช้ไม่ได้แล้ว')) note(`admin: old edit link banner says "${banner}"`);
  if (!await page.locator('#mkBtn').isDisabled()) note('admin: save button still enabled on a replaced edit link');
  const api = await (await f.request('/v2/cards/' + cardUrl.slice(-7))).json() as { data: { letter: string } };
  if (api.data.letter !== 'แก้ด้วยลิงก์ใหม่') note(`admin: old link changed the card! letter="${api.data.letter}"`);
  if (errors.length) note(`admin: browser errors: ${[...new Set(errors)].join(' | ')}`);
});

test('recipients: expired, missing and legacy Base64 cards in every theme', async ({ page }) => {
  test.setTimeout(120_000); // 6 themes × 3 cases, each given 2.5 s to settle
  await prep(page);
  const b64 = 'data:image/jpeg;base64,' + fileA.buffer.toString('base64');
  for (const theme of themes) {
    const legacy = 'l' + theme.prefix + 'gcy' + '0'.repeat(7 - 4 - theme.prefix.length) ;
    const data = { to: 'ลูกค้าเก่า', from: 'ร้าน', letter: 'การ์ดแบบเดิม', secret: 's', photos: [{ src: b64, cap: 'เก่า' }], ...(theme.occasion === 'anniversary' ? { startDate: '2022-01-01' } : {}) };
    await f.db.prepare('INSERT INTO theme_cards VALUES(?,?,?,?,?)').bind(legacy.slice(0, 7), theme.id, JSON.stringify(data), Date.now(), Date.now() + 864e5).run();
    await f.db.prepare('INSERT INTO theme_cards VALUES(?,?,?,?,?)').bind(('x' + theme.prefix + 'expd00').slice(0, 7), theme.id, JSON.stringify(data), Date.now() - 2e6, Date.now() - 1e6).run();
    const cases: [string, string][] = [['legacy', legacy.slice(0, 7)], ['expired', ('x' + theme.prefix + 'expd00').slice(0, 7)], ['missing', 'zz9zz9z']];
    for (const [kind, id] of cases) {
      const errors: string[] = []; const onErr = (e: Error) => errors.push(e.message); page.on('pageerror', onErr);
      await page.goto('about:blank'); await page.goto(`/#${theme.prefix}${id}`);
      await page.waitForTimeout(2500);
      const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      page.off('pageerror', onErr);
      if (kind === 'legacy' && !text.includes('ลูกค้าเก่า')) note(`${theme.id}: legacy card not shown`);
      if (kind !== 'legacy') {
        const explains = /หมดอายุ|ไม่พบ|ไม่มี|expired|ลิงก์/.test(text);
        if (!explains) note(`${theme.id}: ${kind} card shows no explanation. Text starts: "${text.slice(0, 120)}"`);
        if (text.includes('ลูกค้าเก่า')) note(`${theme.id}: ${kind} card still shows content`);
      }
      if (errors.length) note(`${theme.id}: ${kind} card errors: ${errors.join(' | ')}`);
    }
  }
});

test('catalog: every card opens its editor or LINE order', async ({ page }) => {
  const errors = await prep(page);
  const bad: string[] = [];
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:4173')) bad.push(r.status() + ' ' + r.url()); });
  await page.goto('/'); await page.waitForTimeout(2500);
  const html = await (await page.request.get('/')).text();
  const links = [...html.matchAll(/en:"([^"]+)"[^\n]*?page:"([^"]+)"/g)].map(m => [m[1], m[2]]);
  const lineOnly = [...html.matchAll(/en:"([^"]+)"/g)].length - links.length;
  note(`catalog: ${links.length} cards open an editor, ${lineOnly} are ordered via LINE`);
  if (!links.length) note('catalog: CARDS list not readable');
  for (const [name, href] of links) if (href) { const r = await page.request.get('/' + href); if (r.status() !== 200) note(`catalog: ${name} → /${href} returned ${r.status()}`); }
  for (const p of ['/intro-preview.html', '/app/', '/admin/']) { const r = await page.request.get(p); if (r.status() !== 200) note(`static page ${p} returned ${r.status()}`); }
  if (bad.length) note('catalog: failed requests ' + bad.join(', '));
  if (errors.length) note(`catalog: browser errors: ${[...new Set(errors)].join(' | ')}`);
});
