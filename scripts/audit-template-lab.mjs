import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

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
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const results = [];
try {
  for (const id of ids) {
    await page.goto(
      `http://127.0.0.1:4317/template-lab/?play=${id}&dataset=alternate`,
    );
    await page.locator('main.experience').waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (id === 'love-letter')
      await page
        .getByRole('button', { name: 'เปิดซองจดหมาย', exact: true })
        .click();
    if (id === 'capsule')
      await page
        .getByRole('button', { name: 'เปิดกล่องความทรงจำ', exact: true })
        .click();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const violations = audit.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    }));
    results.push({ id, violations });
    console.log(JSON.stringify({ id, violations }));
  }
} finally {
  await browser.close();
}
await mkdir('docs/evidence', { recursive: true });
await writeFile(
  'docs/evidence/creative-lab-initial-a11y.json',
  JSON.stringify(results, null, 2),
);
