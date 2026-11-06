import {chromium} from 'playwright';import fs from 'node:fs/promises';
const out='evidence/impossible-film'; await fs.mkdir(out,{recursive:true});
for(const kind of ['before','after']){
 const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});const page=await ctx.newPage(),video=page.video();
 await page.goto(kind==='before'?'https://vfx2-experiment.luvnote-flagship-lab.pages.dev/?experiment=flagship':'https://luvnote-impossible-preview.silk-operation.workers.dev/?experiment=impossible',{waitUntil:'networkidle'});
 await page.waitForTimeout(1000);
 if(kind==='before'){
  await page.getByRole('button',{name:/เริ่มเดินทาง/}).click();await page.locator('.fl-transitioning').waitFor({state:'detached'});await page.waitForTimeout(750);const b=await page.locator('.fl-lantern').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(1300);await page.mouse.up();await page.waitForTimeout(3200);
 } else {
  const b=await page.locator('.ip-tab:not(:disabled)').boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();for(let i=1;i<=25;i++){await page.mouse.move(x,y-i*7);await page.waitForTimeout(40)}await page.mouse.up();await page.locator('.ip-beacon').waitFor();await page.waitForTimeout(1700);await page.mouse.move(55,500);await page.mouse.down();await page.mouse.move(135,520,{steps:25});await page.mouse.up();await page.waitForTimeout(900);await page.locator('.ip-beacon').click();await page.waitForTimeout(2300);
 }
 await ctx.close();await fs.copyFile(await video.path(),`${out}/${kind}.webm`);await browser.close();console.log(kind,'done');
}
