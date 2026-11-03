import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { polaroidDemo } from '../../src/template-lab/polaroid-sample';

test.beforeEach(async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
    return route.continue();
  });
  (page as Page & { polaroidErrors: string[] }).polaroidErrors = errors;
});
test.afterEach(async ({page}) => {
  expect((page as Page & { polaroidErrors: string[] }).polaroidErrors).toEqual([]);
});
async function open(page: Page) {
  await page.goto('/template-lab/?play=polaroid');
  await page.getByRole('button', {name:'แกะห่อรูปความทรงจำ',exact:true}).click();
  await expect(page.locator('.pm-development')).toBeVisible();
}

test('polaroid: real rub gesture, folded note, favorite and revisiting retain discoveries', async ({page,browserName,isMobile}) => {
  await open(page);
  const canvas=page.locator('.pm-development canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds=(await canvas.boundingBox())!;
  const points=Array.from({length:5},(_,row)=>Array.from({length:6},(_,col)=>({x:bounds.x+15+(bounds.width-30)*(row%2?5-col:col)/5,y:bounds.y+25+(bounds.height-50)*row/4}))).flat();
  if(isMobile&&browserName==='chromium'){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await expect(page.locator('.pm-development')).toHaveCount(1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});
    for(const point of points) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
  }else{
    await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
    for(const point of points)await page.mouse.move(point.x,point.y);
    await page.mouse.up();
  }
  await expect(page.locator('.pm-development')).toHaveCount(0);
  await page.getByRole('button',{name:'พลิกอ่านข้อความ',exact:true}).click();
  await expect(page.locator('.back-note')).toContainText(polaroidDemo.moments[0].note);
  await page.getByRole('button',{name:'แง้มโน้ตเล็ก ๆ',exact:true}).click();
  await expect(page.locator('.pm-folded-note')).toContainText(polaroidDemo.moments[0].aside!);
  await page.getByRole('button',{name:'เก็บรูปนี้ไว้ในมุมโปรด',exact:true}).click();
  await page.getByRole('button',{name:'รูปถัดไป',exact:true}).click();
  await expect(page.locator('.pm-development')).toHaveCount(1);
  await page.getByRole('button',{name:'รูปก่อนหน้า',exact:true}).click();
  await expect(page.locator('.pm-development')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'เก็บเป็นรูปโปรดแล้ว',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'พลิกอ่านข้อความ',exact:true}).click();
  await expect(page.getByRole('button',{name:'พับโน้ตกลับ',exact:true})).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('.pm-next-chapter')).toContainText('1 / 4');
});

test('polaroid: curation, reorder, real PNG download, reply and final surprise', async ({page}, info) => {
  test.setTimeout(60_000);
  await page.goto('/template-lab/?play=polaroid&still=1');
  await page.getByRole('navigation',{name:'ช่วงของอัลบั้ม'}).getByRole('button').nth(2).click();
  await expect(page.getByRole('button',{name:'บันทึกมุมโปรดเป็นภาพ',exact:true})).toBeDisabled();
  const options=page.locator('.pm-picker button');
  for(let i=0;i<3;i++)await options.nth(i).click();
  await options.nth(3).click();
  await expect(page.locator('.pm-wall-item')).toHaveCount(3);
  await expect(page.getByRole('status')).toContainText('เลือกเก็บได้ 3 รูป');
  await options.nth(0).click();await options.nth(3).click();
  await page.getByRole('button',{name:'เลื่อนรูปโปรด 3 ไปก่อนหน้า',exact:true}).click();
  await expect(page.locator('.pm-wall-print').nth(1)).toContainText(polaroidDemo.moments[3].title);
  const print=page.locator('.pm-wall-print').first();
  await print.scrollIntoViewIfNeeded();const b=(await print.boundingBox())!;
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2+90,b.y+b.height/2,{steps:12});await page.mouse.up();
  await expect(page.locator('.pm-wall-print').first()).toContainText(polaroidDemo.moments[3].title);
  await page.getByRole('button',{name:'ประทับหัวใจ',exact:true}).click();
  await expect(page.locator('.pm-memory-wall')).toHaveClass(/pm-sticker-1/);
  const reply='อยากกลับไปร้านกาแฟเดิม แล้วถ่ายรูปใหม่ด้วยกัน';
  await page.getByLabel('คราวหน้า อยากทำอะไรด้วยกัน?',{exact:true}).fill(reply);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'บันทึกมุมโปรดเป็นภาพ',exact:true}).click()]);
  expect(download.suggestedFilename()).toBe('luvnote-polaroid-keepsake.png');
  const path=info.outputPath('real-keepsake.png');await download.saveAs(path);
  const bytes=await readFile(path);
  expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1200);expect(bytes.readUInt32BE(20)).toBe(1500);
  expect(bytes.length).toBeGreaterThan(30_000);
  const colors=await page.evaluate(async(base64)=>{
    const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
    const c=document.createElement('canvas');c.width=120;c.height=150;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0,120,150);
    const p=ctx.getImageData(0,0,120,150).data;const colors=new Set<string>();for(let i=0;i<p.length;i+=40)colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);return colors.size;
  },bytes.toString('base64'));
  expect(colors).toBeGreaterThan(30);
  await page.getByRole('button',{name:'เปิดจดหมายถึงเธอ',exact:true}).click();
  await expect(page.locator('[data-letter-content] .letter-paragraph')).toHaveText(polaroidDemo.letter.split(/\n\s*\n/).filter(Boolean));
  await expect(page.locator('.pm-ending-reply')).toContainText(reply);
  await page.getByRole('button',{name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await expect(page.locator('.pm-future-print [role=status]')).toHaveText(polaroidDemo.secret);
  await page.getByRole('button',{name:'กลับไปจัดมุมโปรด',exact:true}).click();
  await expect(page.getByLabel('คราวหน้า อยากทำอะไรด้วยกัน?',{exact:true})).toHaveValue(reply);
  await expect(page.locator('.pm-wall-item')).toHaveCount(3);
});

test('polaroid: all chapters keyboard accessible, reduced motion and full replay',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/template-lab/?play=polaroid');
  await page.evaluate(()=>document.fonts.ready);
  for(let i=0;i<4;i++){
    const button=page.getByRole('navigation',{name:'ช่วงของอัลบั้ม'}).getByRole('button').nth(i);
    await button.focus();await button.press('Enter');
    await expect(button).toHaveAttribute('aria-current','step');
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.getByRole('button',{name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await page.getByRole('button',{name:'เริ่มอ่านการ์ดใหม่',exact:true}).click();
  await expect(page.getByRole('button',{name:'แกะห่อรูปความทรงจำ',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'ช่วงของอัลบั้ม'}).getByRole('button').nth(2).click();
  await expect(page.locator('.pm-wall-item')).toHaveCount(0);
  await expect(page.getByLabel('คราวหน้า อยากทำอะไรด้วยกัน?',{exact:true})).toHaveValue('');
});

test('polaroid: no canvas support keeps the entire story reachable',async({page})=>{
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
  await open(page);
  await page.getByRole('button',{name:'เปิดภาพทันที',exact:true}).click();
  await expect(page.locator('.pm-development')).toHaveCount(0);
  await page.getByRole('button',{name:'พลิกอ่านข้อความ',exact:true}).click();
  await expect(page.locator('.back-note')).toContainText(polaroidDemo.moments[0].note);
  await page.getByRole('button',{name:'ยังมีรูปใบสุดท้ายถึงเธอ',exact:true}).click();
  await page.getByRole('button',{name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await expect(page.locator('.pm-future-print [role=status]')).toHaveText(polaroidDemo.secret);
});

test('polaroid: failed export remains recoverable with another local photo',async({page})=>{
  await page.goto('/template-lab/?template=polaroid');
  const story=JSON.parse(await page.getByLabel('Story configuration (JSON)').inputValue());
  story.moments[0].image='/images/missing-synthetic-image.jpg';
  await page.evaluate((story)=>localStorage.setItem('luvnote:creative-draft:v1:polaroid',JSON.stringify({version:1,template:'polaroid',story})),story);
  await page.goto('/template-lab/?play=polaroid&draft=1&still=1');
  await page.getByRole('navigation',{name:'ช่วงของอัลบั้ม'}).getByRole('button').nth(2).click();
  const options=page.locator('.pm-picker button');await options.nth(0).click();
  await page.getByRole('button',{name:'บันทึกมุมโปรดเป็นภาพ',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('บันทึกภาพไม่ได้');
  await expect(page.getByRole('button',{name:'บันทึกมุมโปรดเป็นภาพ',exact:true})).toBeEnabled();
  await options.nth(0).click();await options.nth(1).click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'บันทึกมุมโปรดเป็นภาพ',exact:true}).click()]);
  expect(await download.failure()).toBeNull();
});

test('polaroid: find sender keepsakes, revisit, reveal and reset', async ({page}) => {
  await open(page);
  const pocket=page.getByRole('button',{name:/มีอะไรแอบอยู่ตรงนี้นะ/});
  await expect(pocket).toHaveAttribute('aria-expanded','false');
  await pocket.click();
  await expect(page.locator('.pm-treasure-paper')).toContainText(polaroidDemo.moments[0].keepsake!);
  await page.getByRole('button',{name:/เจอของชิ้นเล็กแล้ว/}).click();
  await expect(page.locator('.pm-treasure-paper')).toHaveCount(0);
  await page.getByRole('button',{name:/เจอของชิ้นเล็กแล้ว/}).click();
  await page.getByRole('button',{name:'รูปถัดไป',exact:true}).click();
  const secondPocket=page.getByRole('button',{name:/มีอะไรแอบอยู่ตรงนี้นะ/});
  await secondPocket.scrollIntoViewIfNeeded();
  const pocketBounds=(await secondPocket.boundingBox())!;
  await page.mouse.move(pocketBounds.x+pocketBounds.width/2,pocketBounds.y+pocketBounds.height/2);
  await page.mouse.down();await page.mouse.move(pocketBounds.x+pocketBounds.width/2,pocketBounds.y+pocketBounds.height/2-65,{steps:8});await page.mouse.up();
  await expect(page.locator('.pm-treasure-paper')).toContainText(polaroidDemo.moments[1].keepsake!);
  await page.getByRole('button',{name:'รูปก่อนหน้า',exact:true}).click();
  await expect(page.locator('.pm-treasure-paper')).toContainText(polaroidDemo.moments[0].keepsake!);
  await page.getByRole('button',{name:'ยังมีรูปใบสุดท้ายถึงเธอ',exact:true}).click();
  await expect(page.locator('.pm-found-treasures')).toHaveCount(0);
  await page.getByRole('button',{name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await expect(page.locator('.pm-found-treasures li')).toHaveCount(2);
  await expect(page.locator('.pm-found-treasures')).toContainText(polaroidDemo.moments[0].keepsake!);
  await expect(page.locator('.pm-future-print [role=status]')).toHaveText(polaroidDemo.secret);
  await page.getByRole('button',{name:'เริ่มอ่านการ์ดใหม่',exact:true}).click();
  await page.getByRole('button',{name:'แกะห่อรูปความทรงจำ',exact:true}).click();
  await expect(page.getByRole('button',{name:/มีอะไรแอบอยู่ตรงนี้นะ/})).toHaveAttribute('aria-expanded','false');
});

test('polaroid: sender can edit hidden keepsake and surprise in Studio', async ({page}) => {
  await page.goto('/template-lab/?template=polaroid');
  await page.getByLabel('ชื่อของที่ระลึก 1', {exact:true}).fill('ตั๋วหนังใบแรกของเรา');
  await page.getByRole('combobox', {name:'ชนิดของที่ระลึก 1',exact:true}).selectOption('ticket');
  await page.getByRole('textbox', {name:'ข้อความเซอร์ไพรส์',exact:true}).fill('เจอกันร้านโปรดเย็นวันเสาร์นะ');
  await page.getByRole('button', {name:'บันทึกร่างในเครื่อง',exact:true}).click();
  await page.goto('/template-lab/?play=polaroid&draft=1&still=1');
  await page.getByRole('button', {name:'แกะห่อรูปความทรงจำ',exact:true}).click();
  await page.getByRole('button', {name:/มีอะไรแอบอยู่ตรงนี้นะ/}).click();
  await expect(page.locator('.pm-treasure-paper')).toContainText('ตั๋วหนังใบแรกของเรา');
  await expect(page.locator('.pm-treasure-paper')).toHaveClass(/pm-treasure-ticket/);
  await page.getByRole('button', {name:'ยังมีรูปใบสุดท้ายถึงเธอ',exact:true}).click();
  await expect(page.locator('.pm-future-print')).toHaveCount(0);
  await page.getByRole('button', {name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await expect(page.locator('.pm-future-print [role=status]')).toHaveText('เจอกันร้านโปรดเย็นวันเสาร์นะ');
});

test('polaroid: remembered feelings return with their own photos, can change, and reset', async ({page}) => {
  await open(page);
  const first = 'ขออยู่ตรงนั้นนานอีกหน่อย';
  await page.getByText('อยากเก็บความรู้สึกวันนี้ไว้ด้วยไหม?', {exact:true}).click();
  await page.getByRole('button', {name:first, exact:true}).click();
  await expect(page.locator('.pm-development')).toHaveCount(0);
  await page.getByRole('button', {name:'อยากกอดคนข้าง ๆ', exact:true}).click();
  await page.getByRole('button', {name:'รูปถัดไป', exact:true}).click();
  await page.getByRole('button', {name:'เสียงหัวเราะของเรา', exact:true}).click();
  await page.getByRole('button', {name:'ยังมีรูปใบสุดท้ายถึงเธอ', exact:true}).click();
  await expect(page.locator('.pm-returned-memories')).toHaveCount(0);
  await page.getByRole('button', {name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await expect(page.locator('.pm-echo-line figure')).toHaveCount(2);
  await expect(page.locator('.pm-echo-line figure').first()).toContainText(polaroidDemo.moments[0].title);
  await expect(page.locator('.pm-echo-line figure').first()).toContainText('อยากกอดคนข้าง ๆ');
  await expect(page.locator('.pm-echo-line')).not.toContainText(first);
  await expect(page.locator('.pm-echo-line figure').nth(1)).toContainText('เสียงหัวเราะของเรา');
  for (const figure of await page.locator('.pm-echo-line figure').all()) {
    const box = (await figure.boundingBox())!;
    const caption = (await figure.locator('figcaption').boundingBox())!;
    expect(caption.y + caption.height).toBeLessThanOrEqual(box.y + box.height + 1);
  }
  const audit = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(audit.violations.map(v=>v.id)).toEqual([]);
  await page.getByRole('button', {name:'เริ่มอ่านการ์ดใหม่', exact:true}).click();
  await page.getByRole('navigation', {name:'ช่วงของอัลบั้ม'}).getByRole('button').nth(3).click();
  await page.getByRole('button', {name:/ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย/}).click();
  await expect(page.locator('.pm-echo-line figure')).toHaveCount(4);
  await expect(page.locator('.pm-echo-line')).not.toContainText('อยากกอดคนข้าง ๆ');
});

test('polaroid: memory screening shows every original paragraph, aside and closes with Escape', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name:/กลับไปอยู่ในวันนั้น/}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', {name:'ย้อนกลับ', exact:true})).toBeDisabled();
  await expect(dialog.locator('.pm-replay-words p')).toHaveText(polaroidDemo.moments[0].place);
  for (const paragraph of polaroidDemo.moments[0].note.split(/\n\s*\n/).filter(Boolean)) {
    await dialog.getByRole('button', {name:'แล้ววันนั้น…', exact:true}).click();
    await expect(dialog.locator('.pm-replay-words p')).toHaveText(paragraph);
  }
  await dialog.getByRole('button', {name:'แล้ววันนั้น…', exact:true}).click();
  await expect(dialog.locator('.pm-replay-words p')).toHaveText(polaroidDemo.moments[0].aside!);
  const audit = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await dialog.getByRole('button', {name:'เก็บวันนี้ไว้ในใจ', exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.pm-next-chapter')).toContainText('1 / 4');
  await page.getByRole('button', {name:/กลับไปอยู่ในวันนั้น/}).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('polaroid: accepted eighth reply line changes the actual PNG and grows its paper', async ({page}, info) => {
  await page.goto('/template-lab/?play=polaroid&still=1');
  await page.getByRole('navigation',{name:'ช่วงของอัลบั้ม'}).getByRole('button').nth(2).click();
  await page.locator('.pm-picker button').first().click();
  const outputs: Buffer[] = [];
  for (const end of ['ปลายทาง A', 'ปลายทาง B']) {
    const reply=Array.from({length:7},(_,i)=>'ความทรงจำบรรทัด '+(i+1)).join('\n')+'\n'+end;
    await page.getByLabel('คราวหน้า อยากทำอะไรด้วยกัน?',{exact:true}).fill(reply);
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'บันทึกมุมโปรดเป็นภาพ',exact:true}).click()]);
    const path=info.outputPath(`multiline-${outputs.length}.png`);
    await download.saveAs(path);
    const bytes=await readFile(path);
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(1500);
    outputs.push(bytes);
  }
  // The same first seven lines and photos must not hide changes in line eight.
  expect(outputs[0].equals(outputs[1])).toBe(false);
});
