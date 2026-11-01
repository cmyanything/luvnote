import { test, expect } from '@playwright/test';
import { themes } from '../src/themes';
import { workerdFixture } from './helpers/workerd-env.mjs';
import jpeg from 'jpeg-js';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

test.skip(process.env.VITE_R2_MEDIA_ENABLED !== 'true', 'Requires V3 build');
const pixels = new Uint8Array(32*24*4);
for (let i=0;i<pixels.length;i+=4) { pixels[i]=210; pixels[i+1]=110; pixels[i+2]=140; pixels[i+3]=255; }
const image = jpeg.encode({width:32,height:24,data:pixels},80).data;
const exif = Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000','hex');
const file = {name:'synthetic-rotated.jpg',mimeType:'image/jpeg',buffer:Buffer.concat([image.subarray(0,2),exif,image.subarray(2)])};

for (const theme of themes) {
  test(`${theme.id}: local Worker acceptance, edit, preview, publish, share and reload`, async ({page}) => {
    const f=await workerdFixture();
    let losePublishResponse=true, loseUploadResponse=true, publicationCalls=0, uploadCalls=0;
    let endpoint='';
    // Real local HTTP receives binary Blob bodies. WebKit's Playwright interception
    // API does not expose Blob postData; don't replace missing bytes with a fixture.
    const server=createServer(async(req,res)=>{
      try {
        const chunks: Buffer[]=[];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const bytes=Buffer.concat(chunks), path=req.url!;
        if (req.method==='POST' && path.includes('/media?')) {
          uploadCalls++; expect(bytes[0]).toBe(255); expect(bytes[1]).toBe(216);
          await new Promise(resolve=>setTimeout(resolve,150));
        }
        const headers=Object.fromEntries(Object.entries(req.headers).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
        const response=await f.mf.dispatchFetch(endpoint+path,{method:req.method,headers:{...headers,'CF-Connecting-IP':'192.0.2.50'},...(bytes.length?{body:bytes}: {})});
        if (req.method==='POST' && path.includes('/media?') && loseUploadResponse && response.status===201) {
          loseUploadResponse=false; await response.arrayBuffer();
          res.writeHead(201,{...Object.fromEntries(response.headers),'Content-Length':'1024'});
          res.write('{"id":'); setTimeout(()=>res.destroy(),20); return;
        }
        if (req.method==='POST' && path==='/v3/cards') {
          publicationCalls++;
          if (losePublishResponse) {
            losePublishResponse=false; await response.arrayBuffer();
            // Send a partial receipt so a browser cannot transparently retry an unopened socket.
            res.writeHead(201,{...Object.fromEntries(response.headers),'Content-Length':'1024'});
            res.write('{"id":'); setTimeout(()=>res.destroy(),20); return;
          }
        }
        res.writeHead(response.status,Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
      } catch { res.writeHead(500); res.end('local harness failure'); }
    });
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    endpoint='http://127.0.0.1:'+(server.address() as AddressInfo).port;
    try {
      await page.route('https://www.youtube.com/**',r=>r.abort());
      await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
      await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',r=>r.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(el,o)=>{o.callback('XXXX.DUMMY.TOKEN.XXXX');return 'test';},remove:()=>{}};"}));
      await page.addInitScript(({endpoint})=>{
        const original=window.fetch.bind(window);
        window.fetch=(input,init)=>{
          if (typeof input==='string' && input.startsWith('https://api.luvnote.fun/'))
            return original(endpoint+input.slice('https://api.luvnote.fun'.length),init);
          return original(input,init);
        };
      },{endpoint});
      await page.goto(`/themes/${theme.id}/`);
      await page.getByLabel('ชื่อผู้รับ').fill('Synthetic Recipient');
      await page.getByLabel('ชื่อผู้ส่ง').fill('Synthetic Sender');
      await page.locator('#letter').fill('A synthetic memory');
      await page.locator('#secret').fill('Synthetic secret');
      await page.locator('#file').setInputFiles([file,{...file,name:'second.jpg'}]);
      await expect(page.locator('#pc')).toHaveText('2');
      await page.getByLabel('ลบรูปที่ 2',{exact:true}).click();
      await expect(page.locator('#pc')).toHaveText('1');
      if (theme.coverLabel) {
        await page.locator('#covFile').setInputFiles(file);
        await page.locator('#covFile').setInputFiles({...file,name:'replacement.jpg'});
        await expect(page.locator('#covImg')).toBeVisible();
      }
      await page.locator('#pvBtn').click();
      await expect(page.getByRole('dialog',{name:'พรีวิวการ์ด'})).toBeVisible();
      await page.locator('#closePv').click();
      await page.locator('#mkBtn').click();
      await expect(page.locator('#toast')).toHaveText('สร้างลิงก์ไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      await expect(page.locator('#mkBtn')).toBeEnabled();
      await expect(page.getByLabel('ชื่อผู้รับ')).toHaveValue('Synthetic Recipient');
      await page.locator('#mkBtn').click();
      await expect.poll(()=>publicationCalls).toBe(1);
      await expect(page.locator('#mkBtn')).toBeEnabled();
      await page.locator('#mkBtn').click();
      await expect(page.locator('#sheet')).toBeVisible();
      expect(publicationCalls).toBe(2); expect(uploadCalls).toBe(theme.coverLabel?3:2);
      expect((await f.bucket.list()).objects).toHaveLength(theme.coverLabel?2:1);
      const cards=await f.db.prepare('SELECT id FROM theme_cards').all(); expect(cards.results).toHaveLength(1);
      const id=cards.results[0].id;
      await expect(page.locator('#openBtn')).toHaveAttribute('href',`https://luvnote.fun/#${theme.prefix}${id}`);
      await expect(page.locator('#lineBtn')).toHaveAttribute('href',/line\.me\/R\/msg\/text/);
      await page.goto(`/#${theme.prefix}${id}`);
      await expect(page.locator('.js-to').first()).toHaveText('Synthetic Recipient');
      await page.reload();
      await expect(page.locator('.js-to').first()).toHaveText('Synthetic Recipient');
      const card=await page.evaluate<{photos:{src:string}[];cover?:string}>('CARD');
      for (const source of [card.photos[0].src,...card.cover?[card.cover]:[]]) {
        expect(new URL(source).pathname).toMatch(/^\/v3\/cards\//);
        const response=await f.request(new URL(source).pathname); expect(response.status).toBe(200);
        const decoded=jpeg.decode(new Uint8Array(await response.arrayBuffer())); expect(decoded.width).toBe(24); expect(decoded.height).toBe(32);
      }
    } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); await f.mf.dispose(); }
  });
}
