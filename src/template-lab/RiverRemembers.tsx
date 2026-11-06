import { useEffect, useRef, useState } from 'react';
import { labAsset } from './paths';
import { createRiverAudio } from './riverAudio';
import './river.css';

/* LuvNote — The River Remembers. One continuous canvas, seven acts, no page changes.
   Everything the player does is logged (S.log) and replayed back in the finale. Nothing leaves the browser. */

type Pt = { x: number; y: number };
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; hue: number; tx?: number; ty?: number; seek?: number; set?: boolean };
type Ripple = { x: number; y: number; t: number; kind: number; max: number };
type Petal = { kind: number; x: number; y: number; vx: number; vy: number; ph: number; placed: boolean; drag: boolean; fly: number; fx: number; fy: number; rot: number };
type Star = { x: number; y: number; ph: number; b: number; awake: boolean };
type Lantern = { x: number; y: number; v: number; s: number; ph: number };

const ACTS = [
  { title: 'สายน้ำกระซิบ', hint: 'แตะผิวน้ำ เพื่อปลุกแสงและดวงดาว' },
  { title: 'ประกอบกระทง', hint: 'ลากกลีบดอกไม้มาวางบนกระทง' },
  { title: 'เปลวที่มีชีวิต', hint: 'กดค้างเพื่อจุดเทียน' },
  { title: 'เสียงสะท้อนความทรงจำ', hint: 'ลากนิ้ววาดบนผิวน้ำ ให้สายน้ำจำไว้' },
  { title: 'สายน้ำที่เป็นไปไม่ได้', hint: 'ลากขึ้น ให้แสงลอยขึ้นฟ้า ดาวจมลงน้ำ' },
  { title: 'ปล่อยคำอธิษฐาน', hint: 'เขียนพรของเธอ แล้วปัดกระทงออกไป' },
  { title: 'ราตรีของเรา', hint: 'ร่องรอยของเธอกลับมาเป็นท้องฟ้า' },
];
const WISHES = ['ขอให้เรายังอยู่ด้วยกัน', 'ขอให้เธอยิ้มได้ทุกวัน', 'ขอบคุณที่อยู่ข้างกัน'];
const PETAL_NAMES = ['กลีบบัวชมพู', 'กลีบบัวขาว', 'ดาวเรือง', 'กล้วยไม้', 'มะลิ', 'ใบตอง'];
const ASSETS = ['river-night', 'sky-world', 'water-tile', 'krathong-hero', 'petal-sheet', 'lantern', 'glow-sheet', 'flame-sheet'];
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function RiverRemembers() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ release: (w: string) => void; restart: () => void; start: (n: string, m: string) => void; skip: () => void }>({ release() {}, restart() {}, start() {}, skip() {} });
  const qs = new URLSearchParams(location.search);
  const [to, setTo] = useState(qs.get('to') || 'คนสำคัญ');
  const [msg, setMsg] = useState(qs.get('msg') || 'ทุกความทรงจำของเรายังไหลอยู่ในสายน้ำนี้');
  const [started, setStarted] = useState(false);
  const [act, setAct] = useState(0);
  const [prog, setProg] = useState(0);
  const [wish, setWish] = useState('');
  const [stats, setStats] = useState({ touches: 0, lit: 0, strokes: 0, petals: '' });
  const [loaded, setLoaded] = useState(0);
  const [muted, setMuted] = useState(false);
  const audio = useRef(createRiverAudio());

  useEffect(() => {
    const el = canvas.current!, ctx = el.getContext('2d')!;
    const au = new Proxy(audio.current, { get: (t, k: string) => { const v = (t as Record<string, unknown>)[k]; if (typeof v !== 'function') return v; return (...a: unknown[]) => { const w = window as unknown as { __riverAudioCalls?: Record<string, number> }; w.__riverAudioCalls = w.__riverAudioCalls || {}; w.__riverAudioCalls[k] = (w.__riverAudioCalls[k] || 0) + 1; return (v as (...x: unknown[]) => unknown).apply(t, a); }; } });
    let prevLit = 0, hitSwap = false, echoSound = false, lastStroke = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cap = reduced ? 0.35 : 1;
    const imgs: Record<string, HTMLImageElement | null> = {};
    let disposed = false, raf = 0, last = performance.now(), W = 0, H = 0, dpr = 1;
    ASSETS.forEach(n => { imgs[n] = null; const im = new Image(); im.onload = () => { imgs[n] = im; setLoaded(v => v + 1); }; im.onerror = () => { imgs[n] = null; }; im.src = labAsset(`river/${n}.webp`); });

    const S = {
      t: 0, at: 0, act: 0, next: -1, fade: 0, started: false, name: to, msg,
      log: [] as { x: number; y: number; t: number; act: number }[], ripples: [] as Ripple[], parts: [] as P[], lanterns: [] as Lantern[],
      stars: [] as Star[], awake: 0, petals: [] as Petal[], placed: 0, order: [] as number[], lit: 0, litSec: 0, nameT: 0, nameTargets: [] as Pt[], formed: 0, textShown: 0,
      strokes: [] as Pt[][], cur: null as Pt[] | null, strokeLen: 0, upT: 0, echo: -1, echoSrc: [] as Pt[], echoDst: [] as Pt[],
      swap: 0, swapHold: 0, drag: null as null | { id: number; x: number; y: number; px: number; py: number; t: number; vx: number; vy: number; down: number }, petalDrag: null as Petal | null,
      kx: 0, ky: 0, ks: 0, kv: { x: 0, y: 0 }, released: false, relT: 0, wish: '', finT: 0, hold: false, dpr: 1,
      nextT: 0, crisp: 0, nameA: 0, msgA: 0, readT: 0, kr: { x: 0, y: 0, s: 1, rot: 0, a: 0 }, risers: [] as Lantern[], riseT: 0,
    };
    const dbg = (window as unknown as { __river?: unknown });
    dbg.__river = S; (window as unknown as { __riverAudio?: unknown }).__riverAudio = audio.current;

    const layout = () => { S.kx = W / 2; S.ky = H * 0.7; S.ks = Math.min(W * 0.66, H * 0.36); };
    const resize = () => { const r = el.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (!S.released) layout(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    for (let i = 0; i < 70; i++) S.stars.push({ x: Math.random(), y: Math.random() * 0.27, ph: Math.random() * 6.28, b: Math.random() * 0.5 + 0.3, awake: false });

    const cover = (im: HTMLImageElement) => { const s = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; return { x: (W - w) / 2, y: (H - h) / 2, w, h, s }; };
    const glow = (x: number, y: number, r: number, rgb: string, a: number) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    const sheet = (n: string, cols: number, rows: number, i: number, x: number, y: number, size: number, a = 1) => {
      const im = imgs[n]; if (!im) return false; const cw = im.naturalWidth / cols, ch = im.naturalHeight / rows, c = i % cols, r = Math.floor(i / cols);
      ctx.globalAlpha = a; ctx.drawImage(im, c * cw, r * ch, cw, ch, x - size / 2, y - size / 2, size, size * ch / cw); ctx.globalAlpha = 1; return true;
    };
    const maskCanvas = document.createElement('canvas');
    const horizon = () => H * 0.3;
    const newPart = (p: Partial<P> & { x: number; y: number }) => { if (S.parts.length > 900 * cap) S.parts.shift(); S.parts.push({ vx: 0, vy: 0, life: 0, max: 2, size: 3, hue: 40, ...p }); };

    const ripple = (x: number, y: number, kind = 0) => { S.ripples.push({ x, y, t: 0, kind, max: reduced ? 0.8 : 1.8 }); if (S.ripples.length > 40) S.ripples.shift(); };
    const goto = (n: number) => { if (S.next < 0 && n !== S.act) S.next = n; };
    const switchAct = (n: number) => {
      S.act = n; S.at = 0; setAct(n); setProg(0); au.actTransition(n); if (n === 6) au.ignite(false); if (n === 3) hitSwap = false;
      if (n === 1) { S.petals = []; for (let i = 0; i < 6; i++) S.petals.push({ kind: i, x: W * (0.14 + 0.72 * (i / 5)), y: H * (0.58 + (i % 2) * 0.09), vx: 0, vy: 0, ph: rnd(0, 6.28), placed: false, drag: false, fly: 0, fx: 0, fy: 0, rot: rnd(-0.6, 0.6) }); }
      if (n === 2) { S.nameTargets = nameLayout().pts; S.formed = 0; S.textShown = 0; S.parts = []; }
      if (n === 3) { S.parts = []; S.strokes = []; S.strokeLen = 0; S.echo = -1; }
      if (n === 4) { S.swap = 0; S.swapHold = 0; S.riseT = 0; }
      if (n === 5) { S.released = false; S.relT = 0; layout(); }
      if (n === 6 && !S.released) { S.released = true; S.relT = 0; S.kx = S.kr.x; S.ky = S.kr.y; S.kv = { x: 18, y: -45 }; }
      if (n === 6) {
        S.finT = 0; S.lanterns = []; const cnt = Math.min(28, 8 + S.log.length); for (let i = 0; i < cnt; i++) S.lanterns.push({ x: rnd(0.05, 0.95), y: rnd(0.55, 1.2), v: rnd(0.012, 0.03), s: rnd(0.05, 0.1), ph: rnd(0, 6.28) });
        setStats({ touches: S.log.filter(l => l.act === 0).length, lit: Math.round(S.litSec), strokes: S.strokes.length, petals: S.order.map(k => PETAL_NAMES[k]).join(' · ') });
      }
    };
    api.current.start = (n, m) => { S.name = n; S.msg = m; S.started = true; S.t = 0; };
    api.current.release = (w: string) => { S.wish = w; };
    api.current.restart = () => { S.log = []; S.awake = 0; S.stars.forEach(s => s.awake = false); S.placed = 0; S.order = []; S.lit = 0; S.litSec = 0; S.ripples = []; S.parts = []; S.strokes = []; S.wish = ''; S.next = 0; S.swap = 0; S.released = false; S.echo = -1; S.textShown = 0; S.readT = 0; S.nameA = 0; S.msgA = 0; S.risers = []; S.kr.a = 0; };
    api.current.skip = () => goto(Math.min(6, S.act + 1));

    /* ---------- input ---------- */
    const pt = (e: PointerEvent): Pt => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      if (!S.started || S.next >= 0) return; const p = pt(e); el.setPointerCapture(e.pointerId);
      S.drag = { id: e.pointerId, x: p.x, y: p.y, px: p.x, py: p.y, t: performance.now(), vx: 0, vy: 0, down: performance.now() };
      if (S.act === 0) {
        S.log.push({ ...p, t: S.t, act: 0 }); ripple(p.x, p.y, S.awake % 2); au.ripple(S.awake, p.y / H);
        if (p.y > horizon() * 0.6) { const free = S.stars.filter(s => !s.awake); if (free.length) { free[Math.floor(Math.random() * free.length)].awake = true; } S.awake++; for (let i = 0; i < 6 * cap + 1; i++) newPart({ x: p.x, y: p.y, vx: rnd(-30, 30), vy: rnd(-60, -10), max: rnd(2, 4), size: rnd(2, 4), hue: 60 }); }
        else { S.awake++; ripple(p.x, p.y, 1); }
      }
      if (S.act === 1) { let best: Petal | null = null, bd = 1e9; S.petals.forEach(q => { if (q.placed) return; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 70 && d < bd) { best = q; bd = d; } }); if (best) { (best as Petal).drag = true; S.petalDrag = best; au.petalPick(); } else ripple(p.x, p.y); S.log.push({ ...p, t: S.t, act: 1 }); }
      if (S.act === 2) { S.hold = true; au.ignite(true); S.log.push({ ...p, t: S.t, act: 2 }); }
      if (S.act === 3 && S.echo < 0) { if (p.y < horizon()) { ripple(p.x, p.y); return; } S.cur = [p]; S.strokes.push(S.cur); S.upT = 0; ripple(p.x, p.y, 1); S.log.push({ ...p, t: S.t, act: 3 }); }
      if (S.act === 5 && !S.released) { S.log.push({ ...p, t: S.t, act: 5 }); }
    };
    const move = (e: PointerEvent) => {
      const d = S.drag; if (!d || e.pointerId !== d.id) return; const p = pt(e), now = performance.now(), dt = Math.max(8, now - d.t);
      d.vx = lerp(d.vx, (p.x - d.px) / dt * 1000, 0.5); d.vy = lerp(d.vy, (p.y - d.py) / dt * 1000, 0.5); d.px = p.x; d.py = p.y; d.t = now;
      if (S.act === 1 && S.petalDrag) { S.petalDrag.x = p.x; S.petalDrag.y = p.y; }
      if (S.act === 0 && Math.random() < 0.25 * cap) newPart({ x: p.x, y: p.y, vx: rnd(-10, 10), vy: rnd(-20, 0), max: 2.5, size: 2.5, hue: 60 });
      if (S.act === 3 && S.cur) { const l = S.cur[S.cur.length - 1]; const dist = Math.hypot(p.x - l.x, p.y - l.y); if (dist > 4 && p.y > horizon()) { S.cur.push(p); S.strokeLen += dist; if (S.cur.length % 9 === 0) { ripple(p.x, p.y, 0); if (performance.now() - lastStroke > 140) { lastStroke = performance.now(); au.stroke(Math.hypot(d.vx, d.vy) / 1500); } } } }
      if (S.act === 4) { S.swap = clamp((d.y - p.y) / (H * 0.38), 0, 1); d.x = d.x; }
    };
    const up = (e: PointerEvent) => {
      const d = S.drag; if (!d || e.pointerId !== d.id) return; S.drag = null; if (S.hold && S.lit < 1) au.ignite(false); S.hold = false;
      if (S.act === 1 && S.petalDrag) { const q = S.petalDrag; S.petalDrag = null; q.drag = false; if (Math.hypot(q.x - S.kx, q.y - S.ky) < S.ks * 0.5) { q.placed = true; au.petal(q.kind); if (S.placed === 5) au.krathongDone(); q.fx = q.x; q.fy = q.y; q.fly = 0; S.placed++; S.order.push(q.kind); for (let i = 0; i < 14 * cap + 2; i++) newPart({ x: S.kx, y: S.ky - S.ks * 0.1 * S.placed / 2, vx: rnd(-80, 80), vy: rnd(-90, 10), max: rnd(0.8, 1.6), size: rnd(2, 5), hue: 330 }); ripple(S.kx, S.ky + S.ks * 0.38, 0); if (S.placed >= 6) setTimeout(() => goto(2), 1400); } }
      if (S.act === 3) { S.cur = null; S.upT = 0; }
      if (S.act === 4) { if (S.swap < 0.98) S.swap = S.swap; }
      if (S.act === 5 && !S.released && S.wish && S.at > 4.5) { const sp = Math.hypot(d.vx, d.vy); if (sp > 420 || (performance.now() - d.down < 500 && sp > 260)) { S.released = true; au.release(); S.relT = 0; S.kv = { x: d.vx / sp * 55, y: Math.min(d.vy / sp * 70, -35) }; } }
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

    /* ---------- drawing ---------- */
    const drawBackground = () => {
      const bg = imgs['river-night'];
      if (bg) { const c = cover(bg); ctx.drawImage(bg, c.x, c.y, c.w, c.h); }
      else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1038'); g.addColorStop(0.42, '#1a2a5e'); g.addColorStop(0.43, '#0e3a4a'); g.addColorStop(1, '#06181f'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); glow(W * 0.7, H * 0.2, W * 0.4, '255,240,220', 0.35); }
      const tile = imgs['water-tile']; if (tile) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.14; ctx.beginPath(); ctx.rect(0, horizon(), W, H); ctx.clip(); const sz = W * 0.9, off = (S.t * 8) % sz; for (let x = -sz; x < W + sz; x += sz) for (let y = horizon() - 20; y < H; y += sz) ctx.drawImage(tile, x + off, y, sz, sz); ctx.restore(); }
    };
    const drawStars = (sink = 0) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      S.stars.forEach(s => { const a = (s.awake ? 0.9 : 0.12) * (0.6 + 0.4 * Math.sin(S.t * 1.7 + s.ph)) * (1 - sink); const x = s.x * W, y = s.y * H + sink * H * 0.55; if (a < 0.02) return; if (s.awake && imgs['glow-sheet']) { sheet('glow-sheet', 3, 2, 2, x, y, 26 + s.b * 22, a); } else glow(x, y, s.awake ? 16 : 6, '255,244,220', a * 0.8); });
      ctx.restore();
    };
    const drawRipples = (dt: number) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      S.ripples = S.ripples.filter(r => (r.t += dt) < r.max);
      S.ripples.forEach(r => { const k = r.t / r.max, rad = 10 + k * 120, a = (1 - k) * 0.8; const i = r.kind === 1 ? 1 : 0; if (imgs['glow-sheet']) { sheet('glow-sheet', 3, 2, i, r.x, r.y, rad * 2, a); } else { ctx.strokeStyle = `rgba(255,${r.kind ? 190 : 235},${r.kind ? 220 : 170},${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.38, 0, 0, 6.283); ctx.stroke(); } });
      ctx.restore();
    };
    const drawParts = (dt: number) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      S.parts = S.parts.filter(p => {
        p.life += dt; if (p.seek !== undefined && p.tx !== undefined && p.ty !== undefined) { const k = clamp((p.life - p.seek) / 1.6); if (k > 0) { const e = ease(k); p.x = lerp(p.x, p.tx, e * 0.12 + 0.02); p.y = lerp(p.y, p.ty, e * 0.12 + 0.02); if (k >= 1) p.set = true; } else { p.x += p.vx * dt; p.y += p.vy * dt; } } else { p.x += p.vx * dt; p.y += p.vy * dt; }
        const a = p.set ? 0.95 * (1 - S.crisp * 0.92) : clamp(1 - p.life / p.max) * 0.9; if (a <= 0) return !!p.set;
        glow(p.x, p.y, p.size * (p.set ? 1.6 : 3), p.hue > 300 ? '255,170,210' : p.hue < 50 ? '255,215,140' : '255,200,120', a); return true;
      });
      ctx.restore();
    };
    const drawPetal = (kind: number, x: number, y: number, size: number, rot: number, a = 1) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
      if (!sheet('petal-sheet', 3, 2, kind, 0, 0, size)) { ctx.fillStyle = ['#f27fb0', '#fff4f0', '#ffb02e', '#a64fd0', '#fff', '#3e8d4a'][kind]; ctx.beginPath(); ctx.ellipse(0, 0, size * 0.28, size * 0.42, 0, 0, 6.283); ctx.fill(); }
      ctx.restore();
    };
    const drawFlame = (x: number, y: number, size: number, k: number) => {
      if (k <= 0.01) return; const f = reduced ? 0 : Math.floor(S.t * 9) % 4, wob = reduced ? 0 : Math.sin(S.t * 13) * size * 0.03;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(x, y + size * 0.2, size * 1.3 * k, '255,190,100', 0.5 * k);
      if (!sheet('flame-sheet', 4, 1, f, x + wob, y, size * k)) { glow(x, y - size * 0.1, size * 0.4 * k, '255,230,170', 0.95); }
      ctx.restore();
    };
    const drawKrathong = (reveal: number, flame: number, rot = 0, x = S.kx, y = S.ky, sc = 1) => {
      const s = S.ks * sc, im = imgs['krathong-hero'];
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      // soft reflection of light
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0, s * 0.3, s * 0.8, '255,170,140', 0.18 * clamp(reveal + flame)); ctx.restore();
      if (im) {
        if (reveal >= 0.999) ctx.drawImage(im, -s / 2, -s / 2, s, s);
        else if (reveal > 0) {
          const oc = maskCanvas, px = Math.round(s * dpr); if (oc.width !== px) { oc.width = px; oc.height = px; }
          const og = oc.getContext('2d')!; og.globalCompositeOperation = 'source-over'; og.clearRect(0, 0, px, px); og.drawImage(im, 0, 0, px, px);
          const edge = (1 - reveal) * 1.25, gr = og.createLinearGradient(0, 0, 0, px); gr.addColorStop(clamp(edge - 0.25), 'rgba(0,0,0,0)'); gr.addColorStop(clamp(edge), 'rgba(0,0,0,1)');
          og.globalCompositeOperation = 'destination-in'; og.fillStyle = gr; og.fillRect(0, 0, px, px); ctx.drawImage(oc, -s / 2, -s / 2, s, s);
        }
      } else {
        ctx.globalAlpha = clamp(reveal); ctx.fillStyle = '#3e8d4a'; ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.45, s * 0.14, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#f27fb0'; ctx.beginPath(); ctx.ellipse(0, s * 0.12, s * 0.36, s * 0.22, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff4f0'; ctx.beginPath(); ctx.ellipse(0, -s * 0.06, s * 0.22, s * 0.16, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffc46b'; ctx.fillRect(-s * 0.025, -s * 0.34, s * 0.05, s * 0.3); ctx.globalAlpha = 1;
      }
      drawFlame(-s * 0.03, -s * 0.42 - s * 0.34 * 0.42, s * 0.34, flame);
      ctx.restore();
    };
    const wrapText = (text: string, maxW: number) => { const out: string[] = [], seg = typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(text), x => x.segment) : text.split(''); let line = ''; for (const w of seg) { if (ctx.measureText(line + w).width > maxW && line) { out.push(line); line = w; } else line += w; } if (line) out.push(line); return out.slice(0, 4); };
    const drawText = (text: string, x: number, y: number, size: number, maxW: number, a: number, color = '255,240,222') => {
      if (a <= 0.01) return; ctx.save(); ctx.font = `${size}px Mali, "Noto Sans Thai", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = `rgba(255,190,110,${a * 0.8})`; ctx.shadowBlur = 14; ctx.fillStyle = `rgba(${color},${a})`;
      wrapText(text, maxW).forEach((l, i) => ctx.fillText(l, x, y + i * size * 1.45)); ctx.restore();
    };

    let nameCache = { key: '', size: 40, pts: [] as Pt[] };
    document.fonts?.ready.then(() => { nameCache.key = ''; });
    const nameY = () => H * 0.24;
    // One layout shared by the particle name and the crisp name, so they always coincide.
    const nameLayout = () => {
      const key = `${S.name}|${W}|${H}`; if (nameCache.key === key) return nameCache;
      let size = Math.min(64, W * 0.15); const font = (z: number) => `${z}px Mali, "Noto Sans Thai", sans-serif`;
      ctx.save(); ctx.font = font(size); while (ctx.measureText(S.name).width > W * 0.84 && size > 18) { size -= 2; ctx.font = font(size); } ctx.restore();
      const w = Math.ceil(W), h = Math.ceil(size * 2.2), c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true })!; g.font = font(size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(S.name, w / 2, h / 2);
      const d = g.getImageData(0, 0, w, h).data, all: Pt[] = [];
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 120) all.push({ x, y: nameY() - h / 2 + y });
      const k = Math.max(1, Math.ceil(all.length / 520)), pts = all.filter((_, i) => i % k === 0);
      nameCache = { key, size, pts: pts.length ? pts : [{ x: W / 2, y: nameY() }] }; return nameCache;
    };
    const drawSwapWorld = (sw: number) => {
      const sky = imgs['sky-world'], bg = imgs['river-night'];
      if (sky) { const c = cover(sky), step = 6; for (let y = 0; y < H; y += step) { const ph = y * 0.045 + S.t * 1.6, al = clamp(sw * 1.7 - (1 - y / H) * 0.7 + Math.sin(ph) * 0.12 * (1 - Math.abs(sw * 2 - 1))), dx = Math.sin(ph) * sw * (1 - sw) * 46; if (al <= 0) continue; const sy = (y - c.y) / c.h * sky.naturalHeight; ctx.globalAlpha = al; ctx.drawImage(sky, 0, Math.max(0, sy), sky.naturalWidth, step / c.h * sky.naturalHeight + 1, c.x + dx, y, c.w, step + 1); } ctx.globalAlpha = 1; }
      else if (bg) { ctx.save(); ctx.globalAlpha = sw; ctx.translate(0, H); ctx.scale(1, -1); const c = cover(bg); ctx.drawImage(bg, c.x, c.y, c.w, c.h); ctx.restore(); }
    };

    /* ---------- update + render per act ---------- */
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame); if (disposed) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt; S.at += dt;
      if (!W) return; ctx.clearRect(0, 0, W, H);
      // a short breath between acts - the world never goes dark, everything simply carries on
      if (S.next >= 0) { S.nextT += dt; if (S.nextT >= 0.6) { const n = S.next; S.next = -1; S.nextT = 0; switchAct(n); } }

      const a = S.act, nl = nameLayout(), msgY = nameY() + nl.size * 1.15 + 10;
      if (a === 0) { setProg(S.awake / 8); if (S.awake >= 8 && S.next < 0 && S.at > 1) goto(1); }
      if (a === 2) {
        if (S.hold && S.next < 0) S.lit = Math.min(1, S.lit + dt / 1.6); else if (!S.hold && S.lit < 1) S.lit = Math.max(0, S.lit - dt * 0.6);
        if (S.lit >= 1 && prevLit < 1) au.lit(); prevLit = S.lit;
        if (S.lit >= 1) { S.litSec += dt; S.nameT += dt; }
        if (S.hold) S.litSec += dt;
        const want = Math.min(S.nameTargets.length, Math.floor(520 * Math.max(cap, 0.5)));
        if (S.lit >= 1 && S.formed < want) { for (let i = 0; i < 8 && S.formed < want; i++) { const tg = S.nameTargets[Math.floor(S.formed * S.nameTargets.length / want)]; newPart({ x: S.kx + rnd(-4, 4), y: S.ky - S.ks * 0.4, vx: rnd(-40, 40), vy: rnd(-120, -40), max: 99, size: 1.5, hue: 40, tx: tg.x, ty: tg.y, seek: rnd(0.2, 1.8) }); S.formed++; } }
        const setCount = S.parts.filter(q => q.set).length; S.textShown = want ? clamp(setCount / (want * 0.85)) : 0;
        setProg(S.lit * 0.5 + S.textShown * 0.5);
        if (S.lit >= 1 && Math.random() < 0.3 * cap) newPart({ x: S.kx + rnd(-3, 3), y: S.ky - S.ks * 0.45, vx: rnd(-12, 12), vy: rnd(-50, -20), max: 2.4, size: 2, hue: 20 });
        if (S.textShown > 0.99) { S.readT += dt; if (S.readT > 5 && S.next < 0) { S.readT = 0; goto(3); } }
      }
      if (a === 3) {
        if (S.echo < 0 && !S.cur) { S.upT += dt; if (S.strokeLen > W * 2 && S.upT > 0.9 && S.strokes.length >= 2) {
          const all = S.strokes.flat(); const n = Math.min(360, Math.max(160, all.length)); S.echoSrc = []; for (let i = 0; i < n; i++) S.echoSrc.push(all[Math.floor(i * (all.length - 1) / (n - 1))]);
          const tg = nl.pts; S.echoDst = S.echoSrc.map((_, i) => tg[Math.floor(i * (tg.length - 1) / (n - 1))]); S.echo = 0; au.echo(); } }
        else if (S.echo >= 0) { S.echo += dt; if (S.echo > 6.5 && S.next < 0) goto(4); }
        setProg(S.echo >= 0 ? 1 : clamp(S.strokeLen / (W * 2)));
      }
      if (a === 4) {
        if (!S.drag) { S.swap = S.swap >= 0.98 ? 1 : Math.max(0, S.swap - dt * 0.05); }
        // the krathong's light rises as lanterns while the stars sink into the water
        if (S.swap > 0.12) { S.riseT += dt; if (S.riseT > 0.55 - S.swap * 0.25) { S.riseT = 0; S.risers.push({ x: S.kr.x + rnd(-S.ks * 0.35, S.ks * 0.35), y: S.kr.y - S.ks * 0.3, v: rnd(0.09, 0.15), s: rnd(0.05, 0.09), ph: rnd(0, 6.28) }); if (S.risers.length > 16) S.risers.shift(); } }
        if (S.swap >= 0.98) { S.swapHold += dt; if (S.swapHold > 3.2 && S.next < 0) goto(5); }
        au.swap(S.swap); if (S.swap >= 0.98 && !hitSwap) { hitSwap = true; au.swapHit(); }
        setProg(S.swap);
      }
      if (a === 5 && !S.released) S.swap = Math.max(0, S.swap - dt * 0.3);
      if ((a === 5 && S.released) || a === 6) {
        S.relT += dt; S.kx += S.kv.x * dt; S.ky += S.kv.y * dt; S.kv.x *= Math.exp(-dt * 0.05); S.kv.y = Math.min(S.kv.y, -28);
        if (a === 5 && Math.random() < 0.8 * cap) newPart({ x: S.kx + rnd(-12, 12), y: S.ky + S.ks * 0.3, vx: rnd(-8, 8), vy: rnd(-8, 8), max: 2.2, size: rnd(1.2, 2.4), hue: 40 });
        if (a === 5 && (S.relT > 4.5 || S.kx > W + S.ks * 0.3) && S.next < 0) goto(6);
      }
      if (a === 6) S.finT += dt;
      if (a >= 4) S.risers.forEach(l => { l.y -= l.v * dt * H; });

      // ---- the one krathong that lives through the whole story ----
      const kr = S.kr, sw = (a === 4 || a === 5) ? S.swap : 0;
      if (a >= 1) kr.a = Math.min(1, kr.a + dt * 2.5); else kr.a = Math.max(0, kr.a - dt * 2);
      if (a <= 2) { kr.x = S.kx; kr.y = S.ky; kr.s = 1; kr.rot = 0; }
      else if (a === 3) { kr.x = S.kx; kr.y = lerp(kr.y, H * 0.8, Math.min(1, dt * 2)); kr.s = lerp(kr.s, 0.6, Math.min(1, dt * 2)); kr.rot = 0; }
      else if (a === 4 || (a === 5 && !S.released)) { const p5 = a === 5 ? ease(S.at / 4) : 0; kr.x = S.kx; kr.y = lerp(H * 0.8, H * 0.7, p5) + Math.sin(S.t * 1.4) * 3; kr.s = lerp(0.6, 1, p5); kr.rot = Math.sin(S.t * 1.2) * 0.03; if (a === 5) S.ky = H * 0.7; }
      else { const sc = clamp((S.ky - horizon()) / (H * 0.7 - horizon()), 0.1, 1); kr.x = S.kx; kr.y = S.ky; kr.s = sc; kr.rot = 0; kr.a = clamp((S.ky - horizon()) / (S.ks * 0.2)) * (a === 6 ? clamp(1 - (S.finT - 6) / 4) : 1); }

      // text opacities glide toward their targets so words never pop
      const tName = a === 2 ? clamp(S.textShown * 1.7 - 0.7) : a === 3 ? (S.echo < 0 ? 0.3 : lerp(0.3, 1, clamp((S.echo - 1.5) / 1.5))) : a === 4 ? 1 - clamp(sw * 3) : a === 6 ? ease(S.finT / 2) : 0;
      const tMsg = a === 2 ? clamp(S.textShown * 1.6 - 0.8) : a === 3 ? (S.echo < 0 ? 0.35 : Math.max(0.35, clamp((S.echo - 2.5) / 1.2))) : a === 4 ? 1 - clamp(sw * 3) : a === 6 ? clamp((S.finT - 1) / 1.5) : 0;
      S.nameA += (tName - S.nameA) * Math.min(1, dt * 3); S.msgA += (tMsg - S.msgA) * Math.min(1, dt * 3); S.crisp = S.nameA;

      // ---- render ----
      drawBackground();
      if (a === 0) { ctx.fillStyle = `rgba(4,6,24,${0.55 * (1 - S.awake / 8)})`; ctx.fillRect(0, 0, W, H); }
      if (sw > 0.001) drawSwapWorld(sw);
      drawStars(sw);
      if (kr.a > 0.01) { ctx.save(); ctx.globalAlpha = kr.a; drawKrathong(a === 1 ? clamp(S.placed / 6) : 1, a < 2 ? 0 : a === 2 ? S.lit : 1, kr.rot, kr.x, kr.y, kr.s); ctx.restore(); }
      if (a === 1) {
        S.petals.forEach(q => {
          if (q.placed) { q.fly = Math.min(1, q.fly + dt / 0.5); const k = ease(q.fly); const tx = S.kx + Math.cos(q.kind * 1.05) * S.ks * 0.18, ty = S.ky - S.ks * (0.05 + (q.kind % 3) * 0.06); drawPetal(q.kind, lerp(q.fx, tx, k), lerp(q.fy, ty, k), S.ks * 0.3 * (1 - k * 0.7), q.rot * (1 - k), 1 - k); return; }
          if (!q.drag) { q.ph += dt; q.y += Math.sin(q.ph * 1.3) * 0.2; q.x += Math.cos(q.ph) * 0.15; }
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(q.x, q.y, S.ks * (q.drag ? 0.32 : 0.2), '255,200,230', q.drag ? 0.3 : 0.14); ctx.restore();
          drawPetal(q.kind, q.x, q.y, S.ks * (q.drag ? 0.44 : 0.36), q.rot + Math.sin(q.ph) * 0.12);
        });
        if (S.placed < 6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,220,160,${0.2 + 0.1 * Math.sin(S.t * 3)})`; ctx.setLineDash([4, 8]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(S.kx, S.ky, S.ks * 0.46, S.ks * 0.2, 0, 0, 6.283); ctx.stroke(); ctx.restore(); }
      }
      if (a === 3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        S.strokes.forEach((st, si) => { if (S.echo >= 0) return; ctx.strokeStyle = `rgba(255,${200 - si * 5},150,0.85)`; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(255,200,120,.9)'; ctx.shadowBlur = 12; ctx.beginPath(); st.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); });
        if (S.echo >= 0) { ctx.shadowBlur = 0; S.echoSrc.forEach((p, i) => { const q = S.echoDst[i], st = clamp(S.echo / 2.6 * 1.3 - i / S.echoSrc.length * 0.3), k = ease(st), x = lerp(p.x, q.x, k) + Math.sin(S.t * 4 + i) * (1 - k) * 10, y = lerp(p.y, q.y, k) - Math.sin(k * Math.PI) * 70; glow(x, y, 4 + (1 - k) * 4, '255,215,150', 0.9 * (1 - S.nameA * 0.85 * k)); }); }
        ctx.restore();
      }
      if (a === 5) {
        if (S.wish) drawText(S.wish, kr.x, kr.y - S.ks * 0.62 * kr.s, Math.max(13, W * 0.036) * (0.6 + 0.4 * kr.s), W * 0.7, S.released ? clamp(1.1 - S.relT / 7) : 0.9);
        if (!S.released && S.wish && S.at > 4.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const k = (S.t * 0.8) % 1; ctx.strokeStyle = `rgba(255,220,170,${0.5 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.9 - k * H * 0.3); ctx.lineTo(W * 0.62, H * 0.9 - k * H * 0.3 - 26); ctx.stroke(); ctx.restore(); }
      }
      if (a === 6) {
        const fin = ease(S.finT / 2);
        ctx.fillStyle = `rgba(4,6,24,${0.28 * fin})`; ctx.fillRect(0, 0, W, H);
        const pts = S.strokes.flat(); if (pts.length) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const k = ease(S.finT / 3); S.strokes.forEach(st => { ctx.strokeStyle = `rgba(255,225,170,${0.5 * k})`; ctx.lineWidth = 1.4; ctx.beginPath(); st.forEach((p, i) => { const x = W / 2 + (p.x - W / 2) * 0.6, y = H * 0.12 + (p.y - H * 0.7) * 0.3; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); st.forEach((p, i) => { if (i % 12) return; const x = W / 2 + (p.x - W / 2) * 0.6, y = H * 0.12 + (p.y - H * 0.7) * 0.3; glow(x, y, 8, '255,235,200', 0.8 * k * (0.6 + 0.4 * Math.sin(S.t * 2 + i))); }); }); ctx.restore(); }
        S.lanterns.forEach(l => { l.y -= l.v * dt; const x = l.x * W + Math.sin(S.t * 0.7 + l.ph) * 14, y = l.y * H; if (y < -0.2 * H) l.y = 1.15; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fin; glow(x, y, l.s * W * 0.9, '255,170,90', 0.28); if (imgs['lantern']) ctx.drawImage(imgs['lantern'], x - l.s * W / 2, y - l.s * W / 2, l.s * W, l.s * W); else glow(x, y, l.s * W * 0.3, '255,210,130', 0.9); ctx.restore(); });
        const bg = ctx.createLinearGradient(0, H * 0.72, 0, H); bg.addColorStop(0, 'rgba(4,6,24,0)'); bg.addColorStop(0.35, `rgba(4,6,24,${0.85 * fin})`); ctx.fillStyle = bg; ctx.fillRect(0, H * 0.72, W, H * 0.28);
        drawText('ถึง', W / 2, nameY() - nl.size * 0.95, Math.max(14, W * 0.04), W * 0.5, S.nameA * 0.8);
      }
      // lanterns born from the krathong's light keep rising through the rest of the story
      if (a >= 4) S.risers.forEach(l => { const x = l.x + Math.sin(S.t * 0.9 + l.ph) * 10, y = l.y, fadeTop = clamp(y / (H * 0.12)); if (fadeTop <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fadeTop; glow(x, y, l.s * W * 0.9, '255,170,90', 0.22); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fadeTop * 0.92; if (imgs['lantern']) ctx.drawImage(imgs['lantern'], x - l.s * W / 2, y - l.s * W / 2, l.s * W, l.s * W); ctx.restore(); });
      // one name, one message: same place and size in every act
      drawText(S.name, W / 2, nameY(), nl.size, W * 0.95, S.nameA * 0.95);
      drawText(S.msg, W / 2, msgY, Math.max(14, W * 0.04), W * 0.78, S.msgA);
      drawRipples(dt); drawParts(dt);
    };
    raf = requestAnimationFrame(frame);
    const vis = () => { last = performance.now(); }; document.addEventListener('visibilitychange', vis);
    return () => { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); document.removeEventListener('visibilitychange', vis); delete dbg.__river; audio.current.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = () => { audio.current.start(); api.current.start(to.trim() || 'คนสำคัญ', msg.trim() || 'ทุกความทรงจำของเรายังไหลอยู่ในสายน้ำนี้'); setStarted(true); };
  const confirmWish = (w: string) => { const v = w.trim() || WISHES[0]; setWish(v); api.current.release(v); };
  const toggleMute = () => { const m = !muted; setMuted(m); audio.current.setMuted(m); };
  const restart = () => { setWish(''); api.current.restart(); };

  return (
    <main className="river-app" data-act={act} data-loaded={loaded}>
      <canvas ref={canvas} className="river-canvas" role="img" aria-label={`ประสบการณ์ลอยกระทง ฉากที่ ${act + 1}: ${ACTS[act].title}`} />
      {!started && (
        <section className="river-intro">
          <p className="river-kicker">LuvNote · ลอยกระทง</p>
          <h1>สายน้ำ<em>จดจำ</em></h1>
          <p>ประสบการณ์ 7 ฉาก ราว 3–4 นาที แตะ ลาก และกดค้างไปกับสายน้ำ</p>
          <label>ชื่อผู้รับ<input value={to} maxLength={40} onChange={e => setTo(e.target.value)} /></label>
          <label>ข้อความถึงเธอ<textarea value={msg} maxLength={120} rows={2} onChange={e => setMsg(e.target.value)} /></label>
          <button className="river-go" onClick={begin}>ลงสู่สายน้ำ</button>
          <small>ทุกอย่างอยู่ในเบราว์เซอร์นี้เท่านั้น ไม่มีการอัปโหลด</small>
        </section>
      )}
      {started && (
        <>
          <header className="river-hud" aria-live="polite">
            <span className="river-act">ฉาก {act + 1}/7 · {ACTS[act].title}</span>
            <span className="river-hint" key={act}>{ACTS[act].hint}</span>
            <span className="river-prog" aria-hidden="true"><i style={{ width: `${Math.round(prog * 100)}%` }} /></span>
          </header>
          <button className="river-mute" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}>{muted ? '🔇' : '🔊'}</button>
          <button className="river-skip" onClick={() => api.current.skip()} aria-label="ข้ามไปฉากถัดไป" hidden={act >= 6}>ข้าม ›</button>
          {act === 5 && !wish && (
            <section className="river-wish">
              <label>พรของเธอ<input maxLength={60} placeholder={WISHES[0]} onKeyDown={e => { if (e.key === 'Enter') confirmWish((e.target as HTMLInputElement).value); }} id="river-wish-input" /></label>
              <div className="river-chips">{WISHES.map(w => <button key={w} onClick={() => confirmWish(w)}>{w}</button>)}<button onClick={() => confirmWish((document.getElementById('river-wish-input') as HTMLInputElement).value)}>ตกลง</button></div>
            </section>
          )}
          {act === 6 && (
            <section className="river-finale">
              <p>เธอแตะสายน้ำ {stats.touches} ครั้ง · จุดเทียน {stats.lit} วินาที · วาดร่องรอย {stats.strokes} เส้น</p>
              {stats.petals && <p>กลีบที่เธอเลือก: {stats.petals}</p>}
              {wish && <p>พรที่ลอยไป: “{wish}”</p>}
              <button onClick={restart}>เล่นอีกครั้ง</button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
