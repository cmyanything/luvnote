import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { labAsset } from './paths';
import { useFlagshipAudio } from './useFlagshipAudio';
import './impossible.css';

const artwork = labAsset('images/flagship-lighthouse-v1.webp');
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export default function ImpossiblePostcard() {
  const stage = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const value = useRef(0);
  const bounds = useRef({ top: 0, left: 0, right: 0, bottom: 0 });
  const frame = useRef(0);
  const letterClose = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(null);
  const look = useRef<{ x: number; y: number } | null>(null);
  const [opened, setOpened] = useState(false);
  const [letter, setLetter] = useState(false);
  const [editor, setEditor] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [from, setFrom] = useState('คนที่คิดถึงเธอ');
  const [to, setTo] = useState('เธอ');
  const [message, setMessage] = useState('ไม่ว่าเราจะอยู่ไกลกันแค่ไหน ขอให้แสงดวงนี้พาเธอกลับมาหาความทรงจำดี ๆ ของเราเสมอ');
  const audio = useFlagshipAudio();

  function paint(p: number) {
    value.current = clamp(p);
    stage.current?.style.setProperty('--opening', String(value.current));
    const b = bounds.current, remaining = 1 - value.current;
    if (world.current) world.current.style.clipPath = `inset(${b.top * remaining}px ${b.right * remaining}px ${b.bottom * remaining}px ${b.left * remaining}px round ${3 * remaining}px)`;
  }
  function measure() {
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    bounds.current = { top: rect.top, left: rect.left, right: innerWidth - rect.right, bottom: innerHeight - rect.bottom };
    paint(value.current);
  }
  function animate(target: number) {
    cancelAnimationFrame(frame.current);
    const initial = value.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || Math.abs(initial - target) < .001) {
      paint(target); setOpened(target === 1); return;
    }
    const started = performance.now(), duration = target ? 1000 : 650;
    function tick(now: number) {
      const t = clamp((now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      paint(initial + (target - initial) * eased);
      if (t < 1 && !document.hidden) frame.current = requestAnimationFrame(tick);
      else { paint(target); setOpened(target === 1); }
    }
    frame.current = requestAnimationFrame(tick);
  }
  useEffect(() => {
    const image = new Image(); image.src = artwork;
    image.onload = () => setReady(true); image.onerror = () => setFailed(true);
    if (image.complete && image.naturalWidth) setReady(true);
    measure();
    const observer = new ResizeObserver(measure);
    if (windowRef.current) observer.observe(windowRef.current);
    window.addEventListener('resize', measure);
    return () => { image.onload = null; image.onerror = null; observer.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame.current); };
  }, []);
  useEffect(() => {
    if (!letter) return;
    letterClose.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLetter(false);
      if (event.key === 'Tab') { event.preventDefault(); letterClose.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [letter]);
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (!ready || opened) return;
    cancelAnimationFrame(frame.current);
    drag.current = { y: event.clientY, start: value.current, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const distance = drag.current.y - event.clientY;
    if (Math.abs(distance) > 5) drag.current.moved = true;
    paint(drag.current.start + distance / 210);
  }
  function finish() {
    if (!drag.current) return;
    const shouldOpen = !drag.current.moved || value.current > .32;
    drag.current = null;
    if (shouldOpen) audio.play('turn');
    animate(shouldOpen ? 1 : 0);
  }
  function reset() {
    setLetter(false); setEditor(false); setOpened(false);
    stage.current?.style.setProperty('--look-x', '0px');
    stage.current?.style.setProperty('--look-y', '0px');
    animate(0);
  }
  function exploreStart(event: PointerEvent<HTMLDivElement>) {
    if (!opened || letter || editor) return;
    look.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function exploreMove(event: PointerEvent<HTMLDivElement>) {
    if (!look.current) return;
    stage.current?.style.setProperty('--look-x', `${clamp((event.clientX - look.current.x) * .11, -16, 16)}px`);
    stage.current?.style.setProperty('--look-y', `${clamp((event.clientY - look.current.y) * .08, -10, 10)}px`);
  }
  function exploreEnd() { look.current = null; }
  return (
    <main className={`ip ${opened ? 'ip-open' : ''}`} ref={stage} aria-label="โปสการ์ดที่ซ่อนโลกไว้">
      <div className="ip-table" aria-hidden="true" />
      <div className="ip-world" ref={world} aria-hidden={!opened}>
        <div className="ip-landscape" style={{ backgroundImage: `url("${artwork}")` }} />
        <div className="ip-world-shade" />
      </div>
      {opened && <div className="ip-explore" onPointerDown={exploreStart} onPointerMove={exploreMove} onPointerUp={exploreEnd} onPointerCancel={exploreEnd} aria-hidden="true" />}
      <div className="ip-card" aria-hidden={opened}>
        <div className="ip-card-back" />
        <div className="ip-window" ref={windowRef} />
        <div className="ip-leaf ip-leaf-left"><img src={artwork} alt="" /><span /></div>
        <div className="ip-leaf ip-leaf-right"><img src={artwork} alt="" /><span /></div>
        <div className="ip-card-bottom"><span>มีที่แห่งหนึ่ง รอเธออยู่</span><i>✦</i></div>
        {!opened && <button className="ip-tab" disabled={!ready} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { drag.current = null; animate(0); }} onClick={(e) => { if (e.detail === 0 && ready) { audio.play('turn'); animate(1); } }} aria-label="ดึงขึ้นหรือแตะเพื่อเปิดโปสการ์ด"><span>ดึงขึ้น</span><span aria-hidden="true">↑</span></button>}
      </div>
      {!opened && <p className="ip-invitation">{failed ? 'โหลดภาพไม่สำเร็จ ลองรีเฟรชอีกครั้ง' : ready ? 'ดึงขึ้น หรือแตะเพื่อเปิด' : 'กำลังเตรียมโปสการ์ด…'}</p>}
      {opened && <>
        <button className="ip-beacon" aria-label="แตะแสงประภาคารเพื่ออ่านข้อความ" onClick={() => { setLetter(true); audio.play('finale'); }}><span /></button>
        {!letter && <div className="ip-world-prompt"><span>โลกใบนี้มีบางอย่างฝากถึงเธอ</span><strong>แตะแสงที่ประภาคาร</strong><small>ลองลากภาพเพื่อมองไปรอบ ๆ</small></div>}
        <button className="ip-replay" onClick={reset}>พับกลับและเล่นอีกครั้ง</button>
      </>}
      <button className="ip-settings" onClick={() => setEditor(!editor)} aria-expanded={editor} aria-controls="ip-editor">ปรับข้อความ</button>
      {editor && <section className="ip-editor" id="ip-editor" aria-label="ปรับข้อความส่วนตัว">
        <div className="ip-editor-head"><h2>ฝากเรื่องราวของคุณ</h2><button onClick={() => setEditor(false)} aria-label="ปิดการปรับข้อความ">×</button></div>
        <p>ตัวอย่างนี้เก็บข้อความไว้ในหน้านี้เท่านั้น</p>
        <label>ถึง<input maxLength={80} value={to} onChange={e => setTo(e.target.value)} /></label>
        <label>จาก<input maxLength={80} value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>ข้อความ<textarea maxLength={800} value={message} onChange={e => setMessage(e.target.value)} rows={4} /></label>
        <button className="ip-editor-sound" onClick={() => void audio.toggle()}>{audio.enabled ? 'ปิดเสียง' : 'เปิดเสียงประกอบ'}</button>
        {audio.unavailable && <p role="status">เปิดเสียงไม่ได้ แต่ยังเล่นต่อได้</p>}
        <button className="ip-editor-done" onClick={() => setEditor(false)}>เสร็จแล้ว</button>
      </section>}
      {letter && <section className="ip-letter" role="dialog" aria-modal="true" aria-label="ข้อความจากผู้ส่ง">
        <button ref={letterClose} className="ip-letter-close" onClick={() => setLetter(false)} aria-label="ปิดข้อความ">×</button>
        <div className="ip-letter-content"><p className="ip-letter-to">ถึง {to || 'เธอ'}</p><p className="ip-letter-message">{message}</p><p className="ip-letter-from">จาก {from || 'คนที่คิดถึงเธอ'}</p></div>
      </section>}
    </main>
  );
}
