import { useLayoutEffect, useRef } from 'react';

type Props = { from: number; to: number; lantern: string; photo: string; duration: number };
const anchors = ['.fl-portal-handle', '.fl-lantern img', '.fl-compass-ring', '.fl-memory-display', '.fl-glass-pane', '.fl-envelope', '.fl-final-lamp img'];

/** A short-lived, non-interactive shared object, positioned from actual stage geometry. */
export default function SceneBridge({ from, to, lantern, photo, duration }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const old = document.querySelector(`.fl-stage[data-stage="${from}"] ${anchors[from]}`);
    const next = document.querySelector(`.fl-stage[data-stage="${to}"] ${anchors[to]}`);
    if (!node || !old || !next) return;
    const a = old.getBoundingClientRect(), b = next.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const start = { x: a.left + a.width / 2, y: a.top + a.height / 2, w: a.width, h: a.height };
    const end = { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
    const bounds = (p: typeof start, rotate: number, scale = 1) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`;
    node.style.width = `${start.w}px`; node.style.height = `${start.h}px`;
    const sx = end.w / start.w, sy = end.h / start.h;
    const final = `translate(${end.x}px, ${end.y}px) translate(-50%, -50%) rotate(0deg) scale(${sx}, ${sy})`;
    const mid = { ...start, x: start.x * .45 + end.x * .55, y: start.y * .45 + end.y * .55 - Math.min(45, innerHeight * .045) };
    const movements: Record<number, Keyframe[]> = {
      1: [{ transform: bounds(start, 0), opacity: 1 }, { transform: bounds(mid, -7, .88), opacity: 1, offset: .55 }, { transform: final, opacity: 0 }],
      2: [{ transform: bounds(start, 0), opacity: 1, borderRadius: '50%' }, { transform: bounds(mid, 95, .92), borderRadius: '38%', opacity: 1, offset: .55 }, { transform: final, borderRadius: '3%', opacity: 0 }],
      3: [{ transform: bounds(start, 0), opacity: 1, borderRadius: '3%' }, { transform: bounds(mid, -5, .93), opacity: .95, borderRadius: '22%', offset: .55 }, { transform: final, opacity: 0, borderRadius: '50%' }],
      4: [{ transform: bounds(start, 0), opacity: 1, borderRadius: '50%' }, { transform: bounds(mid, 9, .8), opacity: .9, borderRadius: '8%', offset: .5 }, { transform: final, opacity: 0, borderRadius: '2%' }],
      5: [{ transform: bounds(start, 0), opacity: 1 }, { transform: bounds(mid, -10, .65), opacity: 1, offset: .58 }, { transform: final, opacity: 0 }],
      6: [{ transform: bounds(start, 0), opacity: .75 }, { transform: final, opacity: 0 }],
    };
    const animation = node.animate(movements[from] || movements[6], { duration, easing: 'cubic-bezier(.45,0,.17,1)', fill: 'both' });
    return () => animation.cancel();
  }, [from, to, duration]);
  return <div ref={ref} className={`fl-shared fl-shared-${from}`} aria-hidden="true">
    {from === 1 && <img src={lantern} alt=""/>}
    {from === 2 && <><i/><i/><span>✦</span></>}
    {from === 3 && <img src={photo} alt=""/>}
    {from === 4 && <><i/><span>✦</span></>}
    {from === 5 && <><i/><img src={lantern} alt=""/></>}
    {from === 6 && <img src={lantern} alt=""/>}
  </div>;
}
