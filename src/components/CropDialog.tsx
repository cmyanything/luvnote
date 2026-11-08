import { useEffect, useRef, useState } from 'react';
import { jpeg } from '../lib/images';

const VIEW = 280; // on-screen crop window (px)
const OUT = 640; // saved image size (px)
const MAX_ZOOM = 4;

type Pt = { x: number; y: number };

/**
 * Lets the customer zoom (pinch or slider) and drag a photo inside a round window,
 * then saves exactly that part as a square JPEG (the card shows it in a circle).
 */
export function CropDialog({
  src,
  title,
  onDone,
  onCancel,
}: {
  src: string;
  title: string;
  onDone: (cropped: string) => void;
  onCancel: () => void;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ dist: number; zoom: number } | null>(null);
  const image = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      image.current = img;
      setSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = onCancel;
    img.src = src;
  }, [src, onCancel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onCancel]);

  const base = size ? Math.max(VIEW / size.w, VIEW / size.h) : 1;
  const scale = base * zoom;
  const dw = size ? size.w * scale : VIEW;
  const dh = size ? size.h * scale : VIEW;
  // Keep the window covered: the image edge never moves inside the circle.
  const clamp = (p: Pt, w = dw, h = dh): Pt => ({
    x: Math.min(0, Math.max(VIEW - w, p.x)),
    y: Math.min(0, Math.max(VIEW - h, p.y)),
  });

  // Centre the photo once its size is known.
  useEffect(() => {
    if (!size) return;
    const s = Math.max(VIEW / size.w, VIEW / size.h);
    setZoom(1);
    setPos({ x: (VIEW - size.w * s) / 2, y: (VIEW - size.h * s) / 2 });
  }, [size]);

  // Zoom around the middle of the window.
  function zoomTo(next: number) {
    if (!size) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const ratio = z / zoom;
    const c = VIEW / 2;
    const w = size.w * base * z;
    const h = size.h * base * z;
    setPos((p) => clamp({ x: c - (c - p.x) * ratio, y: c - (c - p.y) * ratio }, w, h));
    setZoom(z);
  }

  function down(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.dist > 0) zoomTo((gesture.current.zoom * dist) / gesture.current.dist);
      return;
    }
    setPos((p) => clamp({ x: p.x + now.x - last.x, y: p.y + now.y - last.y }));
  }
  function up(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  }

  async function save() {
    const img = image.current;
    if (!img || !size || saving) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUT;
      canvas.height = OUT;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas_unavailable');
      const sx = -pos.x / scale;
      const sy = -pos.y / scale;
      const sw = VIEW / scale;
      context.drawImage(img, sx, sy, sw, sw, 0, 0, OUT, OUT);
      // Re-encode through the shared helper so metadata is stripped like every other photo.
      onDone(await jpeg(canvas.toDataURL('image/jpeg', 0.88), OUT, 0.86));
    } catch {
      onCancel();
    }
  }

  return (
    <div className="crop-bg" role="dialog" aria-modal="true" aria-label={title}>
      <div className="crop-card">
        <h3>{title}</h3>
        <p className="crop-help">ลากเพื่อเลื่อนรูป · ถ่างสองนิ้วหรือใช้แถบด้านล่างเพื่อซูม</p>
        <div
          className="crop-view"
          id="cropView"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={(event) => zoomTo(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {size && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{ width: dw, height: dh, transform: `translate(${pos.x}px,${pos.y}px)` }}
            />
          )}
          <i className="crop-ring" aria-hidden="true" />
        </div>
        <div className="crop-zoom">
          <span aria-hidden="true">－</span>
          <input
            type="range"
            id="cropZoom"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="ขนาดรูป"
            onChange={(event) => zoomTo(Number(event.target.value))}
          />
          <span aria-hidden="true">＋</span>
        </div>
        <div className="crop-act">
          <button type="button" className="crop-cancel" onClick={onCancel}>
            ยกเลิก
          </button>
          <button type="button" className="crop-ok" id="cropOk" disabled={!size || saving} onClick={() => void save()}>
            {saving ? 'กำลังบันทึก…' : 'ใช้รูปนี้ ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
