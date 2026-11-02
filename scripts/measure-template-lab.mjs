import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Diagnostic browser samples, not physical-device or sustained 60-fps certification.
const ids = [
  'love-letter',
  'polaroid',
  'cinema',
  'stars',
  'garden',
  'capsule',
  'scrapbook',
  'world',
  'choose',
  'diary',
  'constellation',
  'surprise',
];
const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  window.__labPerf = { shifts: [], tasks: [], lcp: 0, frames: [] };
  new PerformanceObserver((list) =>
    list.getEntries().forEach((e) => {
      if (!e.hadRecentInput) window.__labPerf.shifts.push(e.value);
    }),
  ).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) =>
    list
      .getEntries()
      .forEach((e) =>
        window.__labPerf.tasks.push({
          start: e.startTime,
          duration: e.duration,
        }),
      ),
  ).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((list) => {
    window.__labPerf.lcp = list.getEntries().at(-1)?.startTime || 0;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
});
const results = [];
try {
  for (const id of ids) {
    await page.goto(`http://127.0.0.1:4318/template-lab/?play=${id}`, {
      waitUntil: 'networkidle',
    });
    await page.locator('main.experience').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const start = await page.evaluate(() => performance.now());
    const frames = page.evaluate(
      () =>
        new Promise((resolve) => {
          const stamps = [];
          const end = performance.now() + 900;
          const tick = (t) => {
            stamps.push(t);
            if (performance.now() < end) requestAnimationFrame(tick);
            else resolve(stamps.slice(1).map((t, i) => t - stamps[i]));
          };
          requestAnimationFrame(tick);
        }),
    );
    if (id === 'love-letter')
      await page
        .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
        .click();
    if (id === 'polaroid')
      await page.getByRole('button', { name: 'พลิกอ่านข้อความ' }).click();
    if (id === 'cinema')
      await page.locator('.cinema-scene').nth(1).scrollIntoViewIfNeeded();
    if (id === 'stars') await page.locator('.memory-star').first().click();
    if (id === 'garden') await page.locator('.garden-flower').first().click();
    if (id === 'capsule')
      await page.getByRole('button', { name: 'เปิดกล่องความทรงจำ' }).click();
    if (id === 'scrapbook')
      await page.getByRole('button', { name: 'หน้าถัดไป' }).click();
    if (id === 'world') await page.locator('.world-pin').nth(1).click();
    if (id === 'choose') await page.locator('.choice-option').first().click();
    if (id === 'diary')
      await page.locator('.diary-index button').nth(1).click();
    if (id === 'constellation')
      await page.getByRole('button', { name: /ไปยังช่วงเวลาถัดไป/ }).click();
    if (id === 'surprise')
      await page.getByRole('button', { name: 'แตะเพื่อคลายริบบิ้น' }).click();
    const intervals = await frames;
    const stats = await page.evaluate((start) => {
      const p = window.__labPerf;
      return {
        cls: p.shifts.reduce((a, b) => a + b, 0),
        lcpMs: p.lcp,
        loadLongTasks: p.tasks.filter((t) => t.start < start),
        interactionLongTasks: p.tasks.filter((t) => t.start >= start),
        runningInfiniteAnimations: document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' &&
              a.effect?.getTiming().iterations === Infinity,
          ).length,
      };
    }, start);
    intervals.sort((a, b) => a - b);
    const p95 = intervals[Math.max(0, Math.ceil(intervals.length * 0.95) - 1)];
    results.push({
      id,
      ...stats,
      frameSamples: intervals.length,
      frameIntervalP95Ms: p95,
      framesOver34ms: intervals.filter((n) => n > 34).length,
    });
    console.log(
      `${id}: CLS ${stats.cls.toFixed(4)}, ${stats.interactionLongTasks.length} interaction long tasks, frame p95 ${p95.toFixed(1)} ms (${intervals.length} frames)`,
    );
  }
} finally {
  await browser.close();
}
await mkdir('docs/evidence', { recursive: true });
await writeFile(
  'docs/evidence/creative-lab-performance.json',
  JSON.stringify(
    {
      date: new Date().toISOString(),
      configuration:
        'Chromium Pixel 7 browser emulation, 390x844, 4x CPU throttle, local built preview; sequential samples with warm cache after first page, approximately 900ms frame windows. Default SVG/CSS paths; optional GPU shader measured separately. No claim of physical mobile performance.',
      results,
    },
    null,
    2,
  ),
);
