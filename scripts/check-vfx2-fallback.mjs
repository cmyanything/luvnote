import { chromium, webkit } from 'playwright';
const url=process.env.FLAGSHIP_URL||'http://127.0.0.1:4325/template-lab/?experiment=flagship';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 for(const mode of ['no-webgl','reduced','context-loss']){
  const browser=await engine.launch();const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='no-webgl')await c.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:old.call(this,type,...args)}});
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url,{waitUntil:'networkidle'});
  await p.getByRole('button',{name:/เริ่มเดินทาง/}).click();
  if(mode==='context-loss'){const portal=p.locator('[data-engine=webgl2-portal]');await portal.waitFor();await p.waitForTimeout(300);const ok=await portal.evaluate(el=>{const gl=el.getContext('webgl2');const ext=gl?.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true});if(!ok)console.log(name,'context loss extension unavailable');}
  await p.getByRole('heading',{name:'ปลุกแสงดวงน้อย'}).waitFor();await p.locator('.fl-transitioning').waitFor({state:'detached'});
  for(let i=0;i<2;i++){await p.getByRole('button',{name:'ตัวเลือก'}).click();await p.getByRole('button',{name:'ข้ามฉากนี้'}).click()}
  await p.getByRole('button',{name:/ดูความทรงจำ/}).first().click();
  if(mode==='context-loss'){const canvas=p.locator('[data-engine=webgl2-memory]');await canvas.waitFor();await p.waitForTimeout(400);await canvas.evaluate(el=>el.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());}
  await p.locator('.fl-memory-world.is-static img').waitFor({state:'visible'});await p.getByRole('button',{name:'หมุนขวา'}).click();
  if(!(await p.locator('.fl-memory-world img').getAttribute('style'))?.includes('rotateY'))throw Error('fallback rotation missing');
  await p.getByRole('button',{name:'หยุดเวลา'}).click();if(await p.getByRole('button',{name:'ให้เวลาเดินต่อ'}).getAttribute('aria-pressed')!=='true')throw Error('fallback freeze missing');
  for(let i=0;i<3;i++){await p.getByRole('button',{name:'ตัวเลือก'}).click();await p.getByRole('button',{name:'ข้ามฉากนี้'}).click()}
  await p.getByRole('button',{name:'ส่งแสงกลับไป'}).click();
  if(mode==='context-loss'){const canvas=p.locator('[data-engine=webgl2-finale]');await canvas.waitFor();await p.waitForTimeout(500);await canvas.evaluate(el=>el.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());}
  await p.getByText(/ในเรื่องนี้แล้ว/).waitFor();if(errors.length)throw Error(errors.join('\n'));console.log(name,mode,'passed');await browser.close();
 }
}
