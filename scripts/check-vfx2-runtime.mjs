import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const url = process.env.FLAGSHIP_URL || 'http://127.0.0.1:4325/template-lab/?experiment=flagship';
const out = process.env.VFX_OUTPUT || 'evidence/vfx2-check';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--js-flags=--expose-gc','--enable-precise-memory-info']});
const sizes={};
async function skip(page,n){for(let i=0;i<n;i++){await page.getByRole('button',{name:'ตัวเลือก'}).click();await page.getByRole('button',{name:'ข้ามฉากนี้'}).click()}}
for(const quality of ['ultra','high','balanced','lite']){
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await c.newPage();
  await p.goto(url+'&quality='+quality,{waitUntil:'networkidle'});await skip(p,3);await p.getByRole('button',{name:/ดูความทรงจำ/}).first().click();
  await p.waitForFunction(()=>document.querySelector('.fl-memory-world.is-ready canvas')?.width>1);const canvas=p.locator('[data-engine=webgl2-memory]');
  sizes[quality]=await canvas.evaluate(el=>({w:el.width,h:el.height,cssWidth:el.clientWidth,quality:document.documentElement.dataset.vfxQuality}));
  if(sizes[quality].quality!==quality)throw Error('wrong quality '+quality);
  if(quality==='lite'){await p.getByRole('button',{name:'หมุนขวา'}).click();await p.waitForTimeout(400);if(Number(await canvas.getAttribute('data-rotation'))<.05)throw Error('lite rotation failed');}
  await c.close();
}
if(!(sizes.lite.w<sizes.balanced.w&&sizes.balanced.w<sizes.high.w&&sizes.high.w<sizes.ultra.w))throw Error('quality resolution tiers did not differ: '+JSON.stringify(sizes));
const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.addInitScript(()=>{window.__resources={created:0,deleted:0};for(const [name,key] of [['createTexture','created'],['deleteTexture','deleted']]){const p=WebGL2RenderingContext.prototype,fn=p[name];p[name]=function(...args){window.__resources[key]++;return fn.apply(this,args)}}});
const p=await c.newPage();let errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url,{waitUntil:'networkidle'});const cycles=[];
for(let cycle=0;cycle<5;cycle++){
  await p.getByRole('button',{name:/เริ่มเดินทาง/}).click();await p.locator('.fl-transitioning').waitFor({state:'detached'});await skip(p,2);
  await p.getByRole('button',{name:/ดูความทรงจำ/}).first().click();await p.waitForFunction(()=>document.querySelector('.fl-memory-world.is-ready canvas')?.width>1);
  if(cycle===0){const canvas=p.locator('[data-engine=webgl2-memory]');await p.waitForTimeout(1000);const before=Number(await canvas.getAttribute('data-time'));const r=await canvas.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(1200);const during=Number(await canvas.getAttribute('data-time'));await p.mouse.up();await p.waitForTimeout(500);const after=Number(await canvas.getAttribute('data-time'));if(!(during<before&&after>during))throw Error('hold reverse did not restore');}
  await skip(p,3);await p.getByRole('button',{name:'ส่งแสงกลับไป'}).click();await p.getByText(/ในเรื่องนี้แล้ว/).waitFor();await p.getByRole('button',{name:'เริ่มเรื่องอีกครั้ง'}).click();await p.locator('.fl-transitioning').waitFor({state:'detached'});
  if(await p.locator('canvas:not([data-active="false"]),.fl-stage-out,.fl-shared').count())throw Error('orphaned scene resources after replay');
  cycles.push(await p.evaluate(()=>{globalThis.gc?.();return {heap:performance.memory?.usedJSHeapSize,...window.__resources}}));
}
if(errors.length)throw Error(errors.join('\n'));
await c.close();await browser.close();await fs.writeFile(out+'/runtime.json',JSON.stringify({sizes,cycles,errors},null,2));console.log(JSON.stringify({sizes,cycles,errors},null,2));
