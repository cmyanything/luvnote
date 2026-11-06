import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:4326/template-lab/?experiment=impossible';
await fs.mkdir('evidence/impossible-validation/video',{recursive:true});
const report={url:base, runs:[]};
for(const setup of [{name:'mobile',width:390,height:844,mobile:true,slow:1},{name:'desktop',width:1280,height:900,mobile:false,slow:1},{name:'mobile-cpu4',width:390,height:844,mobile:true,slow:4},{name:'small-reduced',width:320,height:640,mobile:true,slow:1,reduced:true}]){
 const browser=await chromium.launch(); const context=await browser.newContext({viewport:{width:setup.width,height:setup.height},isMobile:setup.mobile,hasTouch:setup.mobile,reducedMotion:setup.reduced?'reduce':'no-preference',recordVideo:{dir:'evidence/impossible-validation/video',size:{width:setup.width,height:setup.height}}});
 const p=await context.newPage(); const video=p.video(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__frames=[];window.__long=[];let last=0;const tick=t=>{if(last)window.__frames.push(t-last);last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);try{new PerformanceObserver(list=>window.__long.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true})}catch{}});
 if(setup.slow>1){const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:setup.slow});}
 await p.goto(base,{waitUntil:'networkidle'}); await p.locator('.ip-tab:not(:disabled)').waitFor(); await p.waitForTimeout(800);
 await p.screenshot({path:`evidence/impossible-validation/${setup.name}-start.png`});
 const tab=p.locator('.ip-tab'), box=await tab.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-100,{steps:20});await p.waitForTimeout(350);const progressMid=Number(await p.locator('.ip').evaluate(e=>e.style.getPropertyValue('--opening')));await p.screenshot({path:`evidence/impossible-validation/${setup.name}-fold.png`});await p.mouse.move(x,y-30,{steps:10});const progressReverse=Number(await p.locator('.ip').evaluate(e=>e.style.getPropertyValue('--opening')));await p.mouse.up();await p.waitForTimeout(850);const rollback=Number(await p.locator('.ip').evaluate(e=>e.style.getPropertyValue('--opening')));
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-180,{steps:30});await p.mouse.up();await p.locator('.ip-beacon').waitFor();await p.waitForTimeout(1200);await p.screenshot({path:`evidence/impossible-validation/${setup.name}-world.png`});
 await p.mouse.move(60,450);await p.mouse.down();await p.mouse.move(140,470,{steps:10});await p.mouse.up();
 await p.locator('.ip-beacon').click();await p.waitForTimeout(1100);await p.screenshot({path:`evidence/impossible-validation/${setup.name}-message.png`}); const messageVisible=await p.getByRole('dialog').isVisible();await p.keyboard.press('Escape');const escapeClosed=await p.getByRole('dialog').count()===0;
 await p.getByRole('button',{name:'ปรับข้อความ'}).click();await p.getByLabel('ถึง',{exact:true}).fill('คนสำคัญ');await p.getByLabel('จาก',{exact:true}).fill('ฉัน');await p.locator('.ip-editor textarea').fill('คิดถึงเธอ '.repeat(60));await p.getByRole('button',{name:'เสร็จแล้ว'}).click();await p.locator('.ip-beacon').click();const personalized=(await p.getByRole('dialog').innerText()).includes('คนสำคัญ');await p.getByRole('button',{name:'ปิดข้อความ'}).click();
 const accessibility=await new AxeBuilder({page:p}).analyze();
 for(let i=0;i<5;i++){await p.getByRole('button',{name:'พับกลับและเล่นอีกครั้ง'}).click();await p.waitForTimeout(800);await p.locator('.ip-tab').click();await p.locator('.ip-beacon').waitFor();}
 const state=await p.evaluate(()=>({frames:window.__frames,long:window.__long,scrollWidth:document.documentElement.scrollWidth,innerWidth,bodyHeight:document.documentElement.scrollHeight,innerHeight,progress:document.querySelector('.ip').style.getPropertyValue('--opening')}));
 state.frames.sort((a,b)=>a-b);const stats={count:state.frames.length,p50:state.frames[Math.floor(state.frames.length*.5)],p95:state.frames[Math.floor(state.frames.length*.95)],over33:state.frames.filter(n=>n>33.34).length,longTasks:state.long.length,maxLongTask:Math.max(0,...state.long)};
 const result={...setup,progressMid,progressReverse,rollback,messageVisible,escapeClosed,personalized,replays:5,overflowX:state.scrollWidth>state.innerWidth,overflowY:state.bodyHeight>state.innerHeight,errors,axeViolations:accessibility.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length})),frameStats:stats};report.runs.push(result);console.log(JSON.stringify(result));
 await context.close();await fs.copyFile(await video.path(),`evidence/impossible-validation/${setup.name}-full.webm`);await browser.close();
}
await fs.writeFile('evidence/impossible-validation/report.json',JSON.stringify(report,null,2));

