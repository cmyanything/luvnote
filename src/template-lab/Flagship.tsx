import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { demo, type Story } from './data';
import { labAsset, labHome } from './paths';
import { readPhoto, jpeg } from '../lib/images';
import { useFlagshipAudio } from './useFlagshipAudio';
import CinematicPortal from './CinematicPortal';
import MemoryWorld from './MemoryWorld';
import CinematicFinale from './CinematicFinale';
import './flagship.css';

type BeamStyle = CSSProperties & { '--beam-angle': string };
const sceneNames = ['จดหมายจากทะเล', 'ปลุกตะเกียง', 'หาทิศทาง', 'เก็บความทรงจำ', 'เช็ดกระจก', 'จดหมาย', 'ส่งแสง'];
const art = labAsset('images/flagship-lighthouse-v1.webp');
const lantern = labAsset('images/flagship-lantern-v1.webp');

export default function Flagship() {
  const [story, setStory] = useState<Story>(() => structuredClone(demo));
  const [scene, setScene] = useState(0);
  const [turns, setTurns] = useState(0);
  const [beam, setBeam] = useState(15);
  const [memory, setMemory] = useState<number | null>(null);
  const [memoryFlow, setMemoryFlow] = useState<'forward' | 'freeze' | 'reverse'>('forward');
  const [memoryRotation, setMemoryRotation] = useState(0);
  const [memoryGPU, setMemoryGPU] = useState(false);
  const [polish, setPolish] = useState(0);
  const [letter, setLetter] = useState(false);
  const [sent, setSent] = useState(false);
  const [signals, setSignals] = useState(0);
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState('');
  const [artState, setArtState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [transitioning, setTransitioning] = useState(false);
  const [portalActive, setPortalActive] = useState(false);
  const [portalPull, setPortalPull] = useState(0);
  const [transitionKind, setTransitionKind] = useState<'entrance' | 'lantern' | 'light'>('light');
  const [finalReveal, setFinalReveal] = useState(false);
  const [holding, setHolding] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const audio = useFlagshipAudio();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdCompleted = useRef(false);
  const holdActive = useRef(false);
  const compassDrag = useRef(false);
  const transitionTarget = useRef<number | null>(null);
  const portalStart = useRef<number | null>(null);
  const portalDragged = useRef(false);
  const wipeStart = useRef<number | null>(null);
  const didWipe = useRef(false);
  const initialFocus = useRef<HTMLHeadingElement>(null);
  const reduce = useRef(false);
  useEffect(() => { const m = matchMedia('(prefers-reduced-motion: reduce)'); const sync = () => { reduce.current = m.matches || new URLSearchParams(location.search).get('still') === '1'; setReduced(reduce.current); }; sync(); m.addEventListener('change', sync); return () => { m.removeEventListener('change', sync); if (timer.current) clearTimeout(timer.current); if (finaleTimer.current) clearTimeout(finaleTimer.current); if (holdTimer.current) clearTimeout(holdTimer.current); }; }, []);
  useEffect(() => { const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }; setLowPower(!!n.connection?.saveData || (!!n.deviceMemory && n.deviceMemory <= 2) || (!!n.hardwareConcurrency && n.hardwareConcurrency <= 2)); const update = () => setPageHidden(document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => { if (reduced && portalActive) { setPortalActive(false); setTransitioning(false); setScene(1); transitionTarget.current = null; } if (reduced && sent && !finalReveal) { if (finaleTimer.current) clearTimeout(finaleTimer.current); setFinalReveal(true); } }, [reduced, portalActive, sent, finalReveal]);
  function next(n: number) {
    if (transitioning) return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setHolding(false); holdActive.current = false;
    audio.play(scene === 0 ? 'light' : 'turn');
    if (reduce.current || lowPower) { setScene(n); return; }
    transitionTarget.current = n;
    if (scene === 0 && n === 1) { setTransitioning(true); setPortalActive(true); return; }
    setTransitionKind(scene === 0 ? 'entrance' : scene === 1 || scene === 5 ? 'lantern' : 'light');
    setTransitioning(true);
    timer.current = setTimeout(() => { setScene(n); timer.current = setTimeout(() => { setTransitioning(false); transitionTarget.current = null; }, 650); }, 700);
  }
  function skip() {
    if (timer.current) clearTimeout(timer.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (finaleTimer.current) clearTimeout(finaleTimer.current);
    setTransitioning(false); setPortalActive(false); setPortalPull(0); setHolding(false); holdActive.current = false; setToolsOpen(false);
    if (transitioning && transitionTarget.current !== null) { setScene(transitionTarget.current); transitionTarget.current = null; return; }
    if (scene === 6) { setSent(true); setFinalReveal(true); } else setScene(s => Math.min(s + 1, 6));
  }
  function lanternTap() {
    if (holdCompleted.current) { holdCompleted.current = false; return; }
    audio.play('turn'); setTurns(t => Math.min(3, t + 1));
  }
  function beginHold(e: React.PointerEvent<HTMLButtonElement>) {
    if (turns >= 3 || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId); holdActive.current = true; holdCompleted.current = false; setHolding(true);
    holdTimer.current = setTimeout(() => { if (!holdActive.current) return; holdCompleted.current = true; setHolding(false); setTurns(3); audio.play('light'); }, 1100);
  }
  function endHold() { holdActive.current = false; setHolding(false); if (holdTimer.current) clearTimeout(holdTimer.current); }
  function steer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect(), x = e.clientX - (rect.left + rect.width / 2), y = e.clientY - (rect.top + rect.height / 2);
    const degrees = Math.max(-65, Math.min(65, Math.atan2(x, -y) * 180 / Math.PI));
    setBeam(Math.round((degrees + 65) / 1.3));
  }
  function sendLight() {
    if (sent) return; setSent(true); audio.play('finale');
    if (reduce.current || lowPower) { setFinalReveal(true); return; }
    setFinalReveal(false); finaleTimer.current = setTimeout(() => setFinalReveal(true), 3300);
  }
  useEffect(() => { initialFocus.current?.focus({ preventScroll: true }); }, [scene]);
  function restart() { setTurns(0); setBeam(15); setMemory(null); setMemoryFlow('forward'); setMemoryRotation(0); setPolish(0); setLetter(false); setSent(false); setFinalReveal(false); setSignals(0); next(0); }
  function update<K extends keyof Story>(key: K, value: Story[K]) { setStory(s => ({ ...s, [key]: value })); }
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !(!file.type && /\.(jpe?g|png|webp)$/i.test(file.name))) { setError('กรุณาเลือกรูป JPEG, PNG หรือ WebP'); return; }
    try {
      let result = await readPhoto(file, 1080); if (result.length > 750_000) result = await jpeg(result, 900, .72);
      if (result.length > 750_000) throw Error('large');
      setStory(s => ({ ...s, moments: s.moments.map((m, i) => i ? m : { ...m, image: result, alt: 'รูปที่ผู้ส่งเลือก' }) })); setError('เปลี่ยนรูปความทรงจำแรกแล้ว');
    } catch { setError('เปิดรูปนี้ไม่ได้ ลองเลือกรูปอื่นหรือแปลงเป็น JPEG'); }
  }
  useEffect(() => { const image = new Image(); let alive = true; image.onload = () => { if (alive) setArtState('ready'); }; image.onerror = () => { if (alive) setArtState('error'); }; image.src = art; return () => { alive = false; }; }, []);
  const guided = beam >= 63 && beam <= 85;
  return <main className={'fl-app fl-scene-' + scene + (sent ? ' fl-sent' : '') + (lowPower ? ' fl-low-power' : '') + (pageHidden ? ' fl-paused' : '') + (transitioning ? ' fl-transitioning' : '')}>
    <div className="fl-art" aria-hidden="true" style={{ backgroundImage: `url("${art}")` }}/><div className="fl-vignette" aria-hidden="true"/><div className="fl-haze fl-haze-a" aria-hidden="true"/><div className="fl-haze fl-haze-b" aria-hidden="true"/>
    <div className="fl-stars" aria-hidden="true">{Array.from({length: lowPower ? 5 : 16}, (_, i) => <i key={i} style={{left: `${7 + (i * 47) % 88}%`, top: `${5 + (i * 31) % 53}%`, animationDelay: `${(i % 5) * .6}s`}}/>)}</div>
    {artState !== 'ready' && <div className="fl-load-status" role="status">{artState === 'loading' ? 'กำลังเตรียมภาพ…' : <>โหลดภาพพื้นหลังไม่สำเร็จ <button onClick={() => location.reload()}>ลองใหม่</button></>}</div>}
    <header className="fl-header"><a href={labHome}>กลับ Lab</a><span>แสงที่รอเธอ</span><button onClick={() => setEdit(v => !v)} aria-expanded={edit}>{edit ? 'ปิดการแก้ไข' : 'ปรับเรื่อง'}</button><button className="fl-tools-toggle" onClick={() => setToolsOpen(v => !v)} aria-expanded={toolsOpen} aria-controls="fl-tools">ตัวเลือก</button></header>
    {toolsOpen && <div className="fl-tools" id="fl-tools"><button onClick={() => void audio.toggle()} aria-pressed={audio.enabled}>{audio.enabled ? 'ปิดเสียง' : 'เปิดเสียง'}</button><button onClick={() => setLowPower(v => !v)} aria-pressed={lowPower}>{lowPower ? 'เปิดเอฟเฟกต์เต็ม' : 'ลดเอฟเฟกต์'}</button><button onClick={skip}>{scene === 6 ? 'ข้ามไปข้อความท้าย' : 'ข้ามฉากนี้'}</button>{audio.unavailable && <p role="status">อุปกรณ์นี้ไม่รองรับเสียง ลองเล่นแบบไม่มีเสียงได้</p>}</div>}
    {edit && <section className="fl-editor" aria-label="ปรับข้อมูลผู้ส่ง"><div className="fl-editor-top"><h2>ปรับเรื่องของเรา</h2><button onClick={() => setEdit(false)}>เสร็จแล้ว</button></div><p>ข้อมูลตัวอย่างอยู่ในเบราว์เซอร์หน้านี้ และจะหายเมื่อโหลดใหม่</p><div className="fl-fields"><label>ชื่อผู้รับ<input maxLength={120} value={story.to} onChange={e => update('to', e.target.value)}/></label><label>ชื่อผู้ส่ง<input maxLength={120} value={story.from} onChange={e => update('from', e.target.value)}/></label><label>จดหมาย<textarea maxLength={8000} value={story.letter} onChange={e => update('letter', e.target.value)}/></label><label>ข้อความลับ<input maxLength={500} value={story.secret} onChange={e => update('secret', e.target.value)}/></label><label>ข้อความส่งท้าย<input maxLength={500} value={story.closing} onChange={e => update('closing', e.target.value)}/></label><label>ชื่อความทรงจำแรก<input maxLength={300} value={story.moments[0].title} onChange={e => update('moments', story.moments.map((m,i) => i ? m : {...m, title:e.target.value}))}/></label><label>รูปความทรงจำแรก<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></label></div><p role="status">{error}</p></section>}
    <nav className="fl-progress" aria-label={`เรื่องราว ${scene + 1} จาก ${sceneNames.length}: ${sceneNames[scene]}`}><span>{sceneNames.map((name,i) => <i key={name} className={i <= scene ? 'on' : ''}/>)}</span><small>{scene + 1} / {sceneNames.length}</small></nav>
    {portalActive && <CinematicPortal image={art} onCovered={() => setScene(1)} onFinish={() => { setPortalActive(false); setTransitioning(false); transitionTarget.current = null; setPortalPull(0); }} onUnavailable={() => { setPortalActive(false); setTransitionKind('entrance'); timer.current = setTimeout(() => { setScene(1); timer.current = setTimeout(() => { setTransitioning(false); transitionTarget.current = null; }, 650); }, 700); }}/>}
    {transitioning && !portalActive && <div className={'fl-carry fl-carry-' + transitionKind} aria-hidden="true"><div className="fl-carry-shade"/><div className="fl-carry-ring"/><div className="fl-carry-ray"/><div className="fl-carry-object">{transitionKind === 'light' ? <span/> : <img src={lantern} alt=""/>}</div><div className="fl-carry-dust">{Array.from({length: 12}, (_,i) => <i key={i} style={{'--i': i} as CSSProperties}/>)}</div></div>}
    <div className="fl-stage" key={scene}>
      {scene === 0 && <section className="fl-opening"><div className="fl-opening-copy"><p className="fl-to">ถึง {story.to}</p><h1 ref={initialFocus} tabIndex={-1}>มีแสงดวงหนึ่ง<br/>รอเธออยู่</h1><p>คืนนี้ มีใครบางคนฝากแสงเล็ก ๆ มาให้เธอ</p></div><div className="fl-bottom"><p>ลองเดินทางไปหามันด้วยกันนะ</p><button className="fl-portal-handle" aria-label="ลากแสงขึ้นเพื่อเปิดทาง" style={{'--pull': portalPull} as CSSProperties} onPointerDown={e => { portalStart.current=e.clientY; portalDragged.current=false; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if(portalStart.current===null)return; const d=Math.max(0,portalStart.current-e.clientY); if(d>8)portalDragged.current=true; setPortalPull(Math.min(1,d/85)); }} onPointerUp={e => { if(portalStart.current!==null && portalStart.current-e.clientY>60) { portalDragged.current=true; next(1); } portalStart.current=null; setPortalPull(0); }} onPointerCancel={() => {portalStart.current=null;setPortalPull(0);}} onClick={() => { if(!portalDragged.current) next(1); portalDragged.current=false; }}><span aria-hidden="true">✦</span><small>ลากแสงขึ้นเพื่อเปิดทาง</small></button><button className="fl-primary" onClick={() => next(1)}>เริ่มเดินทาง <span aria-hidden="true">→</span></button><small>จาก {story.from}</small></div></section>}
      {scene === 1 && <section className="fl-chapter fl-lantern-chapter"><div className="fl-copy"><p>ก่อนออกเดินทาง</p><h1 ref={initialFocus} tabIndex={-1}>ปลุกแสงดวงน้อย</h1><p>กดตะเกียงค้างไว้ หรือแตะสามครั้งเพื่อปลุกแสง</p></div><button className={'fl-lantern turn-' + turns + (holding ? ' is-holding' : '')} onPointerDown={beginHold} onPointerUp={endHold} onPointerCancel={endHold} onLostPointerCapture={endHold} onClick={lanternTap} aria-label={`แตะตรงนี้เพื่อปลุกตะเกียง ${turns} จาก 3 ครั้ง`}><span className="fl-lantern-glow"/><span className="fl-awakening" aria-hidden="true"><i/><i/><i/><b/>{Array.from({length: 12}, (_,i) => <em key={i} style={{'--i': i} as CSSProperties}/>)}</span><img src={lantern} alt=""/><span className="fl-lantern-tap">แตะตรงนี้</span></button><div className="fl-chapter-foot"><div className="fl-ticks" role="img" aria-label={`แตะแล้ว ${turns} จาก 3 ครั้ง`}>{[1,2,3].map(i=><i key={i} className={i<=turns?'on':''}/>)}</div><p aria-live="polite">{turns === 3 ? 'แสงดวงน้อยตื่นแล้ว' : 'กดค้างเพื่อปลุกแสง หรือแตะทีละนิด'}</p>{turns === 3 && <button className="fl-primary fl-enter" onClick={() => next(2)}>พาแสงไปด้วยกัน <span aria-hidden="true">→</span></button>}</div></section>}
      {scene === 2 && <section className="fl-chapter fl-bearing"><div className="fl-copy"><p>แสงดวงนี้กำลังตามหาเธอ</p><h1 ref={initialFocus} tabIndex={-1}>หาทิศทางของหัวใจ</h1><p>หมุนเข็มทิศ หรือเลื่อนแถบไปหาประกายสีทอง</p></div><div className="fl-compass" aria-hidden="true" onPointerDown={e => { compassDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); steer(e); }} onPointerMove={e => { if (compassDrag.current) steer(e); }} onPointerUp={() => { compassDrag.current = false; }} onPointerCancel={() => { compassDrag.current = false; }} style={{'--beam-angle': `${-65 + beam * 1.3}deg`} as BeamStyle}><div className="fl-compass-glow"/><div className="fl-compass-ring"><span className="fl-compass-n">N</span><span className="fl-compass-e">E</span><span className="fl-compass-s">S</span><span className="fl-compass-w">W</span><span className="fl-target">✦</span><div className="fl-needle"><i/></div><span className="fl-compass-center"/></div></div><div className="fl-chapter-foot"><label className="fl-slider-label" htmlFor="fl-bearing">หมุนเข็มทิศ</label><input id="fl-bearing" type="range" min="0" max="100" value={beam} onChange={e => setBeam(Number(e.target.value))} aria-valuetext={guided ? 'พบแสงแล้ว' : 'กำลังหาทิศทาง'}/><button className="fl-text-button" onClick={() => setBeam(70)}>ช่วยฉันหาทิศทาง</button><p aria-live="polite">{guided ? 'เจอแล้ว แสงอยู่ทางนี้เอง' : 'เลื่อนเข็มอย่างช้า ๆ'}</p>{guided && <button className="fl-primary fl-enter" onClick={() => next(3)}>ตามแสงไป <span aria-hidden="true">→</span></button>}</div></section>}
      {scene === 3 && <section className="fl-chapter fl-memories"><div className="fl-copy"><p>ระหว่างทาง</p><h1 ref={initialFocus} tabIndex={-1}>เก็บช่วงเวลาของเรา</h1><p>แตะภาพ แล้วลากเพื่อหมุนโลกความทรงจำ</p></div><div className="fl-memory-display" aria-live="polite">{memory === null ? <div className="fl-empty-frame"><span>✦</span><p>มีความทรงจำรออยู่ตรงนี้</p></div> : <figure className="fl-memory-figure" key={memory}><MemoryWorld key={story.moments[memory].id} image={story.moments[memory].image} alt={story.moments[memory].alt} flow={memoryFlow} rotation={memoryRotation} onRotate={setMemoryRotation} onAvailability={setMemoryGPU} staticMode={lowPower || reduced}/><figcaption><strong>{story.moments[memory].title}</strong><span>{story.moments[memory].note}</span></figcaption></figure>}</div><div className="fl-chapter-foot"><div className="fl-memory-picks" aria-label="เลือกความทรงจำ">{story.moments.slice(0,3).map((m,i)=><button key={m.id} onClick={() => { if (memory !== i) { setMemoryRotation(0); setMemoryFlow('forward'); setMemoryGPU(false); } setMemory(i); audio.play('memory'); }} aria-pressed={memory===i} aria-label={`ดูความทรงจำ ${m.title}`}><img src={m.image} alt=""/></button>)}</div>{memory !== null && <div className="fl-memory-controls" role="group" aria-label="ควบคุมโลกความทรงจำ"><button onClick={() => setMemoryRotation(v => Math.max(-1,v-.3))} disabled={!memoryGPU}>หมุนซ้าย</button><button onClick={() => setMemoryFlow(v => v === 'freeze' ? 'forward' : 'freeze')} disabled={!memoryGPU} aria-pressed={memoryFlow === 'freeze'}>{memoryFlow === 'freeze' ? 'ให้เวลาเดินต่อ' : 'หยุดเวลา'}</button><button onClick={() => setMemoryFlow(v => v === 'reverse' ? 'forward' : 'reverse')} disabled={!memoryGPU} aria-pressed={memoryFlow === 'reverse'}>{memoryFlow === 'reverse' ? 'เดินหน้าตามปกติ' : 'ย้อนเวลา'}</button><button onClick={() => setMemoryRotation(v => Math.min(1,v+.3))} disabled={!memoryGPU}>หมุนขวา</button>{!memoryGPU && <span role="status">กำลังเตรียมฉาก หรือใช้ภาพนิ่งบนอุปกรณ์นี้</span>}</div>}{memory !== null && <button className="fl-primary fl-enter" onClick={() => next(4)}>เก็บไว้ในแสงนี้ <span aria-hidden="true">→</span></button>}</div></section>}
      {scene === 4 && <section className="fl-chapter fl-glass"><div className="fl-copy"><p>ใกล้ถึงแล้ว</p><h1 ref={initialFocus} tabIndex={-1}>เช็ดหน้าต่างรับแสง</h1><p>ค่อย ๆ เช็ดฝ้าออก จะเห็นข้อความที่ซ่อนอยู่</p></div><button className={'fl-glass-pane clean-' + polish} onPointerDown={e => { wipeStart.current = e.clientX; didWipe.current = false; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (wipeStart.current !== null && Math.abs(e.clientX - wipeStart.current) > 35) { setPolish(v => Math.min(3,v+1)); wipeStart.current = e.clientX; didWipe.current = true; } }} onPointerUp={() => { wipeStart.current = null; }} onClick={() => { if (!didWipe.current) setPolish(v => Math.min(3,v+1)); didWipe.current = false; }} aria-label={polish === 3 ? `ข้อความ ${story.secret}` : `เช็ดกระจก ${polish} จาก 3 ครั้ง`}><span className="fl-glass-rim"><span className="fl-glass-message" aria-hidden="true">{polish === 3 ? story.secret : ''}</span><span className="fl-fog"/><span className="fl-glass-reflection"/></span></button><div className="fl-chapter-foot"><p aria-live="polite">{polish === 3 ? 'ข้อความนี้ส่งมาถึงเธอ' : `ปัดหรือแตะกระจกเพื่อเช็ดฝ้า ${polish}/3`}</p>{polish === 3 && <p className="fl-secret-readable" tabIndex={0}>{story.secret}</p>}{polish === 3 && <button className="fl-primary fl-enter" onClick={() => next(5)}>มีจดหมายอีกฉบับ <span aria-hidden="true">→</span></button>}</div></section>}
      {scene === 5 && <section className="fl-chapter fl-letter-scene"><div className="fl-copy"><p>จากฝั่งที่คิดถึง</p><h1 ref={initialFocus} tabIndex={-1}>จดหมายถึงเธอ</h1><p>บางคำอยากให้เธอค่อย ๆ อ่าน</p></div><div className={'fl-envelope ' + (letter ? 'opened' : '')}>{!letter ? <button onClick={() => setLetter(true)} className="fl-seal" aria-label="เปิดจดหมาย">เปิดจดหมาย<span aria-hidden="true">✦</span></button> : <article className="fl-paper" tabIndex={0} aria-label="เนื้อหาจดหมาย"><p className="fl-dear">ถึง {story.to}</p><p className="fl-letter-text">{story.letter}</p><p className="fl-sign">ด้วยความคิดถึง<br/><strong>{story.from}</strong></p></article>}</div><div className="fl-chapter-foot">{letter && <button className="fl-primary fl-enter" onClick={() => next(6)}>เหลืออีกหนึ่งอย่าง <span aria-hidden="true">→</span></button>}</div></section>}
      {scene === 6 && <section className="fl-chapter fl-finale"><div className="fl-copy"><p>{finalReveal ? 'แสงเดินทางออกไปแล้ว' : 'ถึงปลายทางของคืนนี้'}</p><h1 ref={initialFocus} tabIndex={-1}>{finalReveal ? <>ไม่ว่าอยู่ที่ไหน<br/>เรายังเห็นแสงเดียวกัน</> : <>ฝากแสงนี้<br/>กลับไปหา {story.from}</>}</h1><p>{finalReveal ? story.closing : sent ? 'แสงกำลังเดินทางไปหาใครบางคน…' : 'แตะส่งแสง แล้วมองดูมันเดินทางข้ามทะเล'}</p></div><button className={'fl-final-lamp ' + (sent ? 'lit' : '')} onClick={() => sent && setSignals(n => n + 1)} aria-label={sent ? 'แตะตะเกียงส่งประกายอีกครั้ง' : 'ตะเกียงรอส่งแสง'}>{sent && !lowPower && !reduced && <CinematicFinale images={story.moments.slice(0,3).map(m => m.image)}/>}<span className="fl-final-beam"/><span className="fl-final-rings" aria-hidden="true"><i/><i/><i/></span><span className="fl-final-motes" aria-hidden="true">{Array.from({length: 14}, (_,i) => <i key={i} style={{'--i': i} as CSSProperties}/>)}</span><img src={lantern} alt=""/>{sent && signals > 0 && <span className="fl-signal-particles" key={signals} aria-hidden="true">{Array.from({length: 8}, (_,i) => <i key={i} style={{'--i': i} as CSSProperties}/>)}</span>}</button><div className="fl-chapter-foot"><p aria-live="polite">{finalReveal ? `แสงจาก ${story.to} เดินทางถึง ${story.from} ในเรื่องนี้แล้ว` : sent ? 'แสงกำลังข้ามทะเล' : 'มีคนรอรับแสงของเธออยู่'}</p>{finalReveal && <small>ลองแตะตะเกียงเพื่อส่งประกายอีกครั้ง</small>}{!sent ? <button className="fl-primary" onClick={sendLight}>ส่งแสงกลับไป</button> : finalReveal ? <button className="fl-primary fl-enter" onClick={restart}>เริ่มเรื่องอีกครั้ง</button> : <button className="fl-text-button" onClick={() => { if (finaleTimer.current) clearTimeout(finaleTimer.current); setFinalReveal(true); }}>ข้ามแอนิเมชัน</button>}<small>สร้างเพื่อทดลองใน LuvNote Lab</small></div></section>}
    </div>
  </main>;
}
