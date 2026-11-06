type Quality = 'ultra' | 'high' | 'balanced' | 'lite';
type Tick = (time: number, delta: number) => void;
const qualities: Quality[] = ['lite', 'balanced', 'high', 'ultra'];
const caps: Record<Quality, number> = { lite: .55, balanced: .75, high: 1, ultra: 1.25 };
const requested = new URLSearchParams(location.search).get('quality') as Quality | null;
const fixedQuality = requested && qualities.includes(requested) ? requested : null;
const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
let quality: Quality = fixedQuality || (nav.connection?.saveData || (nav.deviceMemory && nav.deviceMemory <= 2) || navigator.hardwareConcurrency <= 2 ? 'lite' : 'high');
let forcedLite = false;
let id = 0, previous = 0, count = 0, slow = 0, badWindows = 0, goodWindows = 0, qualityCeiling = 3;
const tasks = new Set<Tick>();
function announce() { document.documentElement.dataset.vfxQuality = forcedLite ? 'lite' : quality; }
announce();
function frame(now: number) {
  id = 0;
  if (document.hidden || tasks.size === 0) { previous = 0; return; }
  const delta = previous ? Math.min(100, now - previous) : 0;
  previous = now;
  if (!fixedQuality && delta) {
    count++; if (delta > 28) slow++;
    if (count >= 120) {
      const ratio = slow / count; count = slow = 0;
      badWindows = ratio > .18 ? badWindows + 1 : 0;
      goodWindows = ratio < .025 ? goodWindows + 1 : 0;
      const level = qualities.indexOf(quality);
      if (badWindows >= 2 && level > 0) { quality = qualities[level - 1]; badWindows = goodWindows = 0; announce(); }
      else if (goodWindows >= 5 && level < qualityCeiling) { quality = qualities[level + 1]; badWindows = goodWindows = 0; announce(); }
    }
  }
  for (const task of [...tasks]) task(now, delta);
  if (tasks.size && !id) id = requestAnimationFrame(frame);
}
function visibility() { if (document.hidden) { if (id) cancelAnimationFrame(id); id = 0; previous = 0; } else if (tasks.size && !id) id = requestAnimationFrame(frame); }
export function subscribeFrame(task: Tick) {
  tasks.add(task);
  if (tasks.size === 1) document.addEventListener('visibilitychange', visibility);
  if (!document.hidden && !id) id = requestAnimationFrame(frame);
  return () => { tasks.delete(task); if (!tasks.size) { if (id) cancelAnimationFrame(id); id = 0; previous = 0; document.removeEventListener('visibilitychange', visibility); } };
}
export function setLite(value: boolean) { forcedLite = value; announce(); }
export function assessRenderer(gl: WebGL2RenderingContext) {
  if (fixedQuality) return;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software/i.test(renderer)) { qualityCeiling = 1; if (qualities.indexOf(quality) > qualityCeiling) quality = qualities[qualityCeiling]; announce(); }
}
export function pixelScale() { return Math.min(devicePixelRatio || 1, caps[forcedLite ? 'lite' : quality]); }
export function qualityLevel() { return forcedLite ? 'lite' : quality; }

// A bitmap is reused across scene contexts; GPU textures themselves cannot be shared
// between WebGL contexts. The original image remains unchanged for all DOM artwork.
const textures = new Map<string, Promise<TexImageSource>>();
export function prepareTexture(src: string, maxSide = 640): Promise<TexImageSource> {
  const key = `${maxSide}:${src}`; const cached = textures.get(key); if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('image')); img.src = src; })
    .then(async img => { try { await img.decode(); } catch { /* already decoded or decode unsupported */ }
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      if (typeof createImageBitmap !== 'function' || scale >= 1) return img;
      try { return await createImageBitmap(img, { imageOrientation: 'flipY', resizeWidth: Math.max(1, Math.round(img.naturalWidth * scale)), resizeHeight: Math.max(1, Math.round(img.naturalHeight * scale)), resizeQuality: 'high' }); }
      catch { return img; }
    });
  textures.set(key, pending);
  pending.catch(() => textures.delete(key));
  // No live GPU objects depend on these decoded sources after upload.
  if (textures.size > 8) { const oldest = textures.keys().next().value as string | undefined; if (oldest && oldest !== key) { const item = textures.get(oldest); textures.delete(oldest); item?.then(source => { if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close(); }).catch(() => {}); } }
  return pending;
}
export function warmAssets(sources: string[]) { let cancelled = false; const timer = setTimeout(async () => { for (const src of sources) { if (cancelled) break; try { await prepareTexture(src); } catch { /* each canvas has a fallback */ } } }, 250); return () => { cancelled = true; clearTimeout(timer); }; }
