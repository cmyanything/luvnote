import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const url = process.env.FLAGSHIP_URL || 'https://transition-overhaul.luvnote-flagship-lab.pages.dev/?experiment=flagship';
const output = process.env.VFX_OUTPUT || 'evidence/vfx2-before';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await context.addInitScript(() => {
  const stats = window.__vfxProbe = { gl: [], raf: { requested: 0, fired: 0, cancelled: 0, pending: 0, maxPending: 0 }, resources: { timeouts: 0, timeoutClears: 0, timeoutFires: 0, intervals: 0, intervalClears: 0, listenersAdded: 0, listenersRemoved: 0 }, frames: [], longTasks: [], samples: [] };
  const nativeTimeout=window.setTimeout.bind(window), nativeClearTimeout=window.clearTimeout.bind(window), nativeInterval=window.setInterval.bind(window), nativeClearInterval=window.clearInterval.bind(window);
  window.setTimeout=(fn,delay,...args)=>{stats.resources.timeouts++;return nativeTimeout((...a)=>{stats.resources.timeoutFires++;if(typeof fn==='function')fn(...a)},delay,...args)};
  window.clearTimeout=id=>{stats.resources.timeoutClears++;return nativeClearTimeout(id)};
  window.setInterval=(fn,delay,...args)=>{stats.resources.intervals++;return nativeInterval(fn,delay,...args)};
  window.clearInterval=id=>{stats.resources.intervalClears++;return nativeClearInterval(id)};
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener=function(...args){stats.resources.listenersAdded++;return add.apply(this,args)};
  EventTarget.prototype.removeEventListener=function(...args){stats.resources.listenersRemoved++;return remove.apply(this,args)};
  const originalRAF = window.requestAnimationFrame.bind(window), originalCancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set();
  window.requestAnimationFrame = cb => { let id; id = originalRAF(t => { pending.delete(id); stats.raf.pending = pending.size; stats.raf.fired++; cb(t); }); pending.add(id); stats.raf.requested++; stats.raf.pending = pending.size; stats.raf.maxPending = Math.max(stats.raf.maxPending, pending.size); return id; };
  window.cancelAnimationFrame = id => { if (pending.delete(id)) stats.raf.cancelled++; stats.raf.pending = pending.size; originalCancel(id); };
  const proto = WebGL2RenderingContext.prototype;
  for (const name of ['compileShader','linkProgram','texImage2D','drawArrays','deleteTexture','deleteProgram','deleteBuffer','viewport']) {
    const fn = proto[name]; proto[name] = function(...args) { const t = performance.now(); try { return fn.apply(this, args); } finally { if (name !== 'drawArrays' || stats.gl.length < 20000) stats.gl.push({ name, at: t, ms: performance.now() - t, canvas: this.canvas?.dataset?.engine || '', width: this.canvas?.width, height: this.canvas?.height }); } };
  }
  new PerformanceObserver(list => list.getEntries().forEach(e => stats.longTasks.push({ at: e.startTime, ms: e.duration }))).observe({ type: 'longtask', buffered: true });
  let last = 0; const frame = t => { if (last) stats.frames.push({ at: t, ms: t - last }); last = t; originalRAF(frame); }; originalRAF(frame);
  setInterval(() => { const app = document.querySelector('.fl-app'); stats.samples.push({ at: performance.now(), scene: document.querySelector('.fl-stage:not(.fl-stage-out)')?.dataset.stage, transition: !!app?.classList.contains('fl-transitioning'), stages: document.querySelectorAll('.fl-stage').length, canvases: [...document.querySelectorAll('canvas')].map(c => ({ engine: c.dataset.engine, w: c.width, h: c.height })), heap: performance.memory?.usedJSHeapSize, pendingRAF: pending.size }); }, 200);
});
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,v8,gpu' });
await page.goto(url, { waitUntil: 'networkidle' });
const marker = label => page.evaluate(x => performance.mark('vfx:' + x), label);
const wait = ms => page.waitForTimeout(ms);
await marker('opening'); await wait(1000);
async function transit(label, button) { await marker('transition-' + label); await button.click({ force: true }); await page.locator('.fl-transitioning').waitFor({ state: 'detached' }); await marker('settled-' + label); await wait(550); }
await transit('0-1', page.getByRole('button', { name: /เริ่มเดินทาง/ }));
await marker('lantern'); for (let i=0;i<3;i++){ await page.getByRole('button', { name: /ปลุกตะเกียง/ }).click({ force:true }); await wait(300); }
await transit('1-2', page.getByRole('button', { name: /พาแสงไปด้วยกัน/ }));
await marker('compass'); await page.getByRole('button', { name: 'ช่วยฉันหาทิศทาง' }).click();
await transit('2-3', page.getByRole('button', { name: /ตามแสงไป/ }));
await marker('memory'); await page.getByRole('button', { name: /ดูความทรงจำ/ }).first().click(); await wait(1700);
await transit('3-4', page.getByRole('button', { name: /เก็บไว้ในแสงนี้/ }));
await marker('window'); for (let i=0;i<3;i++) await page.locator('.fl-glass-pane').click({force:true});
await transit('4-5', page.getByRole('button', { name: /มีจดหมายอีกฉบับ/ }));
await marker('letter'); await page.getByRole('button', { name: 'เปิดจดหมาย' }).click(); await wait(700);
await transit('5-6', page.getByRole('button', { name: /เหลืออีกหนึ่งอย่าง/ }));
await marker('finale'); await page.getByRole('button', { name: 'ส่งแสงกลับไป' }).click(); await wait(4800); await marker('complete');
const probe = await page.evaluate(() => ({...window.__vfxProbe, marks: performance.getEntriesByType('mark').filter(x=>x.name.startsWith('vfx:')).map(x=>({name:x.name,at:x.startTime})), navigation: performance.getEntriesByType('navigation').map(x=>({duration:x.duration,domContentLoaded:x.domContentLoadedEventEnd,transferSize:x.transferSize})), renderer:(()=>{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return null;const d=gl.getExtension('WEBGL_debug_renderer_info');return d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):'unavailable'})()}));
const traceComplete = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve)); await cdp.send('Tracing.end'); const {stream} = await traceComplete;
let trace=''; while (true) { const {data,eof} = await cdp.send('IO.read',{handle:stream}); trace += data; if(eof) break; } await cdp.send('IO.close',{handle:stream});
await fs.writeFile(`${output}/chrome-trace.json`, trace); await fs.writeFile(`${output}/probe.json`, JSON.stringify({url, errors, ...probe}, null, 2));
const events=JSON.parse(trace).traceEvents;const names=['RunTask','FunctionCall','EvaluateScript','Layout','UpdateLayoutTree','Paint','CompositeLayers','RasterTask','GPUTask'];const summary={};for(const name of names){const items=events.filter(e=>e.name===name&&e.ph==='X');summary[name]={count:items.length,totalMs:items.reduce((s,e)=>s+(e.dur||0),0)/1000,maxMs:Math.max(0,...items.map(e=>e.dur||0))/1000};}
const regions=[];for(let i=0;i<probe.marks.length-1;i++){const a=probe.marks[i],b=probe.marks[i+1];const values=probe.frames.filter(f=>f.at>=a.at&&f.at<b.at).map(f=>f.ms).sort((x,y)=>x-y);if(values.length)regions.push({region:a.name,count:values.length,median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],over33:values.filter(v=>v>33.4).length});}
const gl={};for(const e of probe.gl){(gl[e.name]??={count:0,totalMs:0,maxMs:0}).count++;gl[e.name].totalMs+=e.ms;gl[e.name].maxMs=Math.max(gl[e.name].maxMs,e.ms);}
const result={renderer:probe.renderer,errors,regions,gl,raf:probe.raf,resources:probe.resources,longTasks:probe.longTasks,trace:summary,peakStages:Math.max(...probe.samples.map(x=>x.stages)),samples:probe.samples.filter((_,i)=>i%10===0)};
await fs.writeFile(`${output}/summary.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
