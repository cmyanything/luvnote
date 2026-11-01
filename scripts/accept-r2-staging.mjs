// Real browser -> real staging API/R2 acceptance. No API or Turnstile responses mocked.
import assert from 'node:assert/strict';
import { chromium, webkit, devices, expect } from '@playwright/test';
import jpeg from 'jpeg-js';
import { stagingTarget, verifyStagingResources, wrangler } from './staging-safety.mjs';

if(process.env.ALLOW_STAGING_WRITE!=='1') throw Error('ALLOW_STAGING_WRITE=1 is required');
const endpoint=stagingTarget(process.env.STAGING_API_URL||'');
const {config}=verifyStagingResources();
const publish=process.env.STAGING_BROWSER_PUBLISH==='1';
const origin='http://127.0.0.1:4173';
const rows=JSON.parse(wrangler(['d1','execute','luvnote-staging','--remote','--config',config,'--json','--command',
  "SELECT id,theme FROM theme_cards WHERE json_extract(data,'$.letter')='Non-customer staging integration' AND expires_at>"+Date.now()+' ORDER BY created_at DESC'])).at(-1).results;
const themes=[['pink-coquette','p'],['coquette-dream','d'],['little-memories','m'],['birthday-chat','c'],['velvet-gift','v']];
for(const [theme] of themes) assert.ok(rows.some(r=>r.theme===theme),'Run smoke-r2-staging.mjs first');
const pixels=new Uint8Array(32*24*4).fill(150);
const image=jpeg.encode({width:32,height:24,data:pixels},80).data;
const exif=Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000','hex');
const file={name:'synthetic-rotated.jpg',mimeType:'image/jpeg',buffer:Buffer.concat([image.subarray(0,2),exif,image.subarray(2)])};
const results=[];
if(process.env.STAGING_READ_ONLY_PREVIEW==='1') {
  // Start Wrangler remote preview with both write/cleanup flags false first.
  const preview='http://127.0.0.1:8788';
  const response=await fetch(preview+'/v2/cards/'+rows[0].id);assert.equal(response.status,200);
  const card=await response.json();
  assert.equal((await fetch(preview+new URL(card.data.photos[0].src).pathname)).status,200);
  assert.equal((await fetch(preview+'/v3/upload-sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  assert.equal((await fetch(preview+'/__scheduled')).status,200);
  results.push({scenario:'real remote preview with writes/cleanup off: V2/V3 reads survive; writes return 503',passed:true});
}
for(const [name,type,device] of [['desktop',chromium,devices['Desktop Chrome']],['Pixel 7',chromium,devices['Pixel 7']],['iPhone 13 WebKit',webkit,devices['iPhone 13']]]) {
  const browser=await type.launch();
  try {
    const page=await browser.newPage({...device,reducedMotion:'reduce'});
    page.setDefaultTimeout(30000);
    // Preserved viewers use the production origin. Rewrite only that origin to the
    // real staging origin; every response and image remains a real network fetch.
    await page.addInitScript(endpoint=>{
      const original=window.fetch.bind(window);
      window.fetch=(input,init)=>typeof input==='string'&&input.startsWith('https://api.luvnote.fun/')
        ? original(endpoint+input.slice('https://api.luvnote.fun'.length),init):original(input,init);
    },endpoint);
    await page.route('https://api.luvnote.fun/**',r=>r.abort());
    await page.route('https://www.youtube.com/**',r=>r.abort());
    for(const [theme,prefix] of themes) {
      const id=rows.find(r=>r.theme===theme).id;
      await page.goto(origin+'/#'+prefix+id);
      await expect(page.locator('.js-to').first()).toHaveText('Synthetic Test');
      await page.reload();
      await expect(page.locator('.js-to').first()).toHaveText('Synthetic Test');
      const card=await page.evaluate('CARD');
      // Smoke fixtures upload one photo and no cover; viewers preserve demo cover fallbacks.
      for(const source of [card.photos[0].src]) {
        assert.equal(new URL(source).origin,endpoint);
        const size=await page.evaluate(async source=>{const img=new Image();img.src=source;await img.decode();return [img.naturalWidth,img.naturalHeight];},source);
        assert.deepEqual(size,[16,12]);
      }
      results.push({browser:name,theme,scenario:'published card, reload, real R2 image decode',passed:true});
    }
    await page.goto(origin+'/themes/little-memories/');
    await page.getByLabel('ชื่อผู้รับ').fill('Synthetic Browser');
    await page.getByLabel('ชื่อผู้ส่ง').fill('LuvNote QA');
    await page.locator('#letter').fill('Synthetic live browser acceptance');
    await page.locator('#secret').fill('Synthetic secret');
    await page.locator('#file').setInputFiles([file,{...file,name:'second.jpg'}]);
    await expect(page.locator('#pc')).toHaveText('2');
    await page.getByLabel('ลบรูปที่ 2',{exact:true}).click();
    await expect(page.locator('#pc')).toHaveText('1');
    await page.locator('#covFile').setInputFiles(file);
    await page.locator('#covFile').setInputFiles({...file,name:'replacement.jpg'});
    await expect(page.locator('#covImg')).toBeVisible();
    await page.locator('#pvBtn').click();
    await expect(page.getByRole('dialog',{name:'พรีวิวการ์ด'})).toBeVisible();
    await page.locator('#closePv').click();
    // Actual Cloudflare test widget, not an injected callback/token.
    await expect.poll(()=>page.locator('input[name="cf-turnstile-response"]').inputValue(),{timeout:60000}).not.toBe('');
    results.push({browser:name,scenario:'multiple/remove/replace cover/preview and real test widget',passed:true});
    if(publish) {
      const receipt=page.waitForResponse(r=>r.url()===endpoint+'/v3/cards'&&r.request().method()==='POST');
      await page.locator('#mkBtn').click();
      const response=await receipt; assert.equal(response.status(),201);
      const card=await response.json();
      await expect(page.locator('#sheet')).toBeVisible();
      await expect(page.locator('#openBtn')).toHaveAttribute('href','https://luvnote.fun/#m'+card.id);
      await expect(page.locator('#lineBtn')).toHaveAttribute('href',/line\.me\/R\/msg\/text/);
      await page.goto(origin+'/#m'+card.id);
      await expect(page.locator('.js-to').first()).toHaveText('Synthetic Browser');
      await page.reload();
      await expect(page.locator('.js-to').first()).toHaveText('Synthetic Browser');
      const data=await page.evaluate('CARD');
      for(const source of [data.photos[0].src,data.cover]) {
        const res=await fetch(source);assert.equal(res.status,200);
        const decoded=jpeg.decode(new Uint8Array(await res.arrayBuffer()));
        assert.equal(decoded.width,24);assert.equal(decoded.height,32);
      }
      results.push({browser:name,scenario:'real publish/open/LINE href/reload/normalized orientation',cardId:card.id,passed:true});
    }
    console.log(JSON.stringify({progress:name,passed:results.length,publish}));
  } finally { await browser.close(); }
}
console.log(JSON.stringify({status:'PASS',environment:'real Cloudflare staging; emulated browser devices',checks:results.length,publish,results},null,2));
