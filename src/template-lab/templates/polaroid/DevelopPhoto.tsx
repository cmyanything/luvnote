import { useEffect, useRef, useState, type PointerEvent } from 'react';

/** Only a local opaque mask. Source photos never enter this canvas. */
export function DevelopPhoto({ onComplete }: { onComplete: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<number | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const covered = useRef(new Set<number>());
  const completed = useRef(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) { ctx.fillStyle = '#d1cbb9'; ctx.fillRect(0, 0, 300, 280); }
  }, []);
  function rub(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current !== event.pointerId || completed.current) return;
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(300, (event.clientX - bounds.left) / bounds.width * 300));
    const y = Math.max(0, Math.min(280, (event.clientY - bounds.top) / bounds.height * 280));
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 76; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(last.current?.x ?? x, last.current?.y ?? y); ctx.lineTo(x + 0.01, y); ctx.stroke();
    const start = last.current ?? { x, y };
    const steps = Math.ceil(Math.hypot(x - start.x, y - start.y) / 12) || 1;
    for (let step = 0; step <= steps; step++) {
      const px = start.x + (x - start.x) * step / steps;
      const py = start.y + (y - start.y) * step / steps;
      for (let gy = 0; gy < 20; gy++) for (let gx = 0; gx < 20; gx++) {
        if (Math.hypot(gx * 15 + 7.5 - px, gy * 14 + 7 - py) < 38) covered.current.add(gy * 20 + gx);
      }
    }
    last.current = { x, y };
    const percent = Math.min(100, Math.round(covered.current.size / 400 / 0.55 * 100));
    setProgress(percent);
    if (percent >= 100) { completed.current = true; onComplete(); }
  }
  return <div className="pm-development" data-development-progress={progress}>
    <canvas ref={canvas} width={300} height={280} aria-hidden="true"
      onPointerDown={(event) => { if (!event.isPrimary) return; event.stopPropagation(); active.current = event.pointerId; last.current = null; event.currentTarget.setPointerCapture(event.pointerId); rub(event); }}
      onPointerMove={rub}
      onPointerUp={(event) => { rub(event); active.current = null; last.current = null; }}
      onPointerCancel={() => { active.current = null; last.current = null; }}
      onLostPointerCapture={() => { active.current = null; last.current = null; }} />
    <span className="pm-rub-hint" aria-hidden="true">{progress ? `ความทรงจำชัดขึ้น ${progress}%` : 'ลองลูบรูปนี้เบา ๆ'}</span>
    <span className="sr-only">ภาพยังถูกปิดอยู่ ใช้นิ้วลูบหรือกดปุ่มเปิดภาพทันที</span>
  </div>;
}
