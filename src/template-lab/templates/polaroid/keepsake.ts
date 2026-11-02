import type { Moment, Story } from '../../data';
import { shortDate } from '../../data';

function lines(ctx: CanvasRenderingContext2D, value: string, width: number) {
  const rows: string[] = [];
  let text = '';
  for (const part of new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(value)) {
    if (part.segment === '\n' || ctx.measureText(text + part.segment).width > width) {
      rows.push(text);
      text = '';
    }
    if (part.segment !== '\n') text += part.segment;
  }
  rows.push(text);
  return rows;
}
function wrap(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, line: number, limit: number) {
  lines(ctx, value, width).slice(0, limit).forEach((text, i) => ctx.fillText(text, x, y + i * line));
}
async function image(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = window.setTimeout(() => { img.src = ''; reject(new Error('Image load timeout')); }, 12_000);
    img.onload = () => { clearTimeout(timeout); resolve(img); };
    img.onerror = () => { clearTimeout(timeout); reject(new Error('Image unavailable')); };
    img.src = source;
  });
}

/** A downloadable local keepsake, without an upload or a rendering dependency. */
export async function saveKeepsake(story: Story, moments: Moment[], reply: string, sticker: number) {
  if (!moments.length || moments.length > 3) throw new Error('Choose one to three photos');
  const images = await Promise.all(moments.map((m) => image(m.image)));
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.font = '30px Mali, sans-serif';
  const replyLines = lines(ctx, reply || 'ยังมีอีกหลายวันที่อยากเก็บไว้ด้วยกัน', 960);
  const postcardHeight = Math.max(520, 160 + replyLines.length * 46);
  canvas.height = 810 + postcardHeight + 170;
  ctx.fillStyle = '#c1cfc0'; ctx.fillRect(0, 0, 1200, canvas.height);
  ctx.fillStyle = '#304c3e'; ctx.font = '46px Mali, sans-serif';
  wrap(ctx, `มุมเล็ก ๆ ของ ${story.to}`, 90, 100, 1020, 65, 3);
  const w = moments.length === 1 ? 460 : moments.length === 2 ? 420 : 310;
  const gap = 35, start = (1200 - (w * moments.length + gap * (moments.length - 1))) / 2;
  images.forEach((img, i) => {
    const h = w * 1.25;
    ctx.save(); ctx.translate(start + i * (w + gap) + w / 2, 430 + (i % 2) * 40); ctx.rotate((i % 2 ? 4 : -3) * Math.PI / 180);
    ctx.fillStyle = '#fffaf0'; ctx.shadowColor = '#304c3e40'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 12;
    ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
    const size = w - 28, scale = Math.max(size / img.naturalWidth, size / img.naturalHeight), crop = size / scale;
    ctx.drawImage(img, (img.naturalWidth - crop) / 2, (img.naturalHeight - crop) / 2, crop, crop, -w / 2 + 14, -h / 2 + 14, size, size);
    ctx.fillStyle = '#304c3e'; ctx.font = '22px Mali, sans-serif';
    wrap(ctx, moments[i].title, -w / 2 + 20, h / 2 - 42, w - 40, 29, 2);
    if (sticker === 0) { ctx.fillStyle = '#c3af70'; ctx.fillRect(-47, -h / 2 - 10, 94, 25); }
    if (sticker === 1) { ctx.strokeStyle = '#8a493f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -h / 2 + 8); ctx.bezierCurveTo(-48, -h / 2 - 18, -24, -h / 2 - 52, 0, -h / 2 - 30); ctx.bezierCurveTo(24, -h / 2 - 52, 48, -h / 2 - 18, 0, -h / 2 + 8); ctx.stroke(); }
    if (sticker === 2) {
      ctx.font = '20px Mali, sans-serif';
      const date = shortDate(moments[i].date) || 'วันของเรา';
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(-w / 2 + 14, -h / 2 + 14, Math.min(w - 28, ctx.measureText(date).width + 16), 34);
      ctx.fillStyle = '#51483b';
      ctx.fillText(date, -w / 2 + 22, -h / 2 + 38);
    }
    ctx.restore();
  });
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(80, 810, 1040, postcardHeight);
  ctx.fillStyle = '#304c3e'; ctx.font = '34px Mali, sans-serif'; ctx.fillText('คราวหน้าของเรา', 120, 880);
  ctx.font = '30px Mali, sans-serif';
  replyLines.forEach((text, i) => ctx.fillText(text, 120, 950 + i * 46));
  ctx.font = '24px Mali, sans-serif'; wrap(ctx, `รูปจาก ${story.from} · จัดเก็บด้วยใจโดย ${story.to}`, 90, 810 + postcardHeight + 70, 1020, 34, 2);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((v) => v ? resolve(v) : reject(new Error('Export failed')), 'image/png'));
  const url = URL.createObjectURL(blob);
  try { const link = document.createElement('a'); link.href = url; link.download = 'luvnote-polaroid-keepsake.png'; link.click(); }
  finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
