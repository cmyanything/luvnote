import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { BeyondWorld, graphemes } from './BeyondWorld';
import ImpossiblePostcard from './ImpossiblePostcard';
import { labAsset } from './paths';
import { useFlagshipAudio } from './useFlagshipAudio';
import './beyond.css';

export default function Beyond() {
  const canvas=useRef<HTMLCanvasElement>(null),world=useRef<BeyondWorld|null>(null),progress=useRef(0),animation=useRef(0);
  const drag=useRef<{y:number;start:number;moved:boolean}|null>(null),look=useRef<{x:number;y:number}|null>(null);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[opened,setOpened]=useState(false);
  const [editor,setEditor]=useState(false),[showing,setShowing]=useState(false),[page,setPage]=useState(0);
  const [from,setFrom]=useState('คนที่คิดถึงเธอ'),[to,setTo]=useState('เธอ'),[message,setMessage]=useState('ไม่ว่าเราจะอยู่ไกลกันแค่ไหน ขอให้แสงดวงนี้พาเธอกลับมาหาความทรงจำดี ๆ ของเราเสมอ');
  const audio=useFlagshipAudio();const pages=Math.max(1,Math.ceil(graphemes(message).length/90));
  useEffect(()=>{let alive=true;try{const w=new BeyondWorld(canvas.current!,()=>{if(alive)setFailed(true)});world.current=w;w.init(labAsset('images/flagship-lighthouse-v1.webp')).then(()=>{if(alive)setReady(true)}).catch(()=>{if(alive)setFailed(true)});}catch{setFailed(true)}return()=>{alive=false;cancelAnimationFrame(animation.current);world.current?.dispose();world.current=null}},[]);
  useEffect(()=>{if(failed){world.current?.dispose();world.current=null}},[failed]);
  useEffect(()=>{if(showing)world.current?.showMessage(to,from,message,page)},[showing,to,from,message,page]);
  function paint(p:number){progress.current=Math.max(0,Math.min(1,p));world.current?.paint(progress.current);canvas.current?.parentElement?.style.setProperty('--pull',String(progress.current))}
  function settle(target:number){cancelAnimationFrame(animation.current);const start=progress.current,begin=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?1:1200;function tick(now:number){const t=Math.min(1,(now-begin)/duration),ease=1-Math.pow(1-t,3);paint(start+(target-start)*ease);if(t<1&&!document.hidden)animation.current=requestAnimationFrame(tick);else{paint(target);setOpened(target===1)}}animation.current=requestAnimationFrame(tick)}
  function down(e:PointerEvent<HTMLButtonElement>){if(!ready)return;cancelAnimationFrame(animation.current);drag.current={y:e.clientY,start:progress.current,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}
  function move(e:PointerEvent<HTMLButtonElement>){if(!drag.current)return;const distance=drag.current.y-e.clientY;if(Math.abs(distance)>5)drag.current.moved=true;paint(drag.current.start+distance/200)}
  function up(){if(!drag.current)return;const go=!drag.current.moved||progress.current>.3;drag.current=null;if(go)audio.play('turn');settle(go?1:0)}
  function reset(){setShowing(false);world.current?.hideMessage();world.current?.resetLook();setOpened(false);settle(0)}
  function exploreStart(e:PointerEvent<HTMLCanvasElement>){if(!opened||showing||editor)return;look.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);world.current?.explore(0,0)}
  function exploreMove(e:PointerEvent<HTMLCanvasElement>){if(!look.current)return;world.current?.explore((e.clientX-look.current.x)/140,(look.current.y-e.clientY)/180)}
  function exploreEnd(){look.current=null;world.current?.resetLook()}
  if(failed)return <><span className="beyond-sr" role="status">อุปกรณ์นี้เปิดโลกสามมิติไม่ได้ กำลังใช้โปสการ์ดเวอร์ชันสำรอง</span><ImpossiblePostcard initial={{from,to,message}} /></>;
  return <main className={`beyond ${opened?'beyond-open':''}`} aria-label="โลกที่ซ่อนอยู่ในโปสการ์ด"><canvas ref={canvas} className="beyond-canvas" aria-hidden="true" onPointerDown={exploreStart} onPointerMove={exploreMove} onPointerUp={exploreEnd} onPointerCancel={exploreEnd}/>
    <button className="beyond-settings" onClick={()=>setEditor(!editor)} aria-expanded={editor} aria-controls="beyond-editor">ปรับข้อความ</button>
    {!opened&&<><button className="beyond-pull" disabled={!ready} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;settle(0)}} onClick={e=>{if(e.detail===0&&ready)settle(1)}}>ดึงขึ้น <span aria-hidden="true">↑</span></button><p className="beyond-hint">{ready?'ดึงขึ้น หรือแตะเพื่อเปิด':'กำลังเตรียมโลกใบเล็ก…'}</p></>}
    {opened&&<><div className="beyond-prompt">{showing?'ข้อความจากหัวใจ':'ลองลากภาพ เพื่อมองไปรอบโลก'}</div><div className="beyond-actions"><button onClick={reset}>พับกลับ</button>{showing?<><button onClick={()=>{setShowing(false);world.current?.hideMessage()}}>ปิดข้อความ</button>{pages>1&&<button onClick={()=>setPage((page+1)%pages)}>หน้าถัดไป {page+1}/{pages}</button>}</>:<button onClick={()=>{setPage(0);setShowing(true);audio.play('light')}}>อ่านข้อความ</button>}</div></>}
    {showing&&<p className="beyond-sr" aria-live="polite">ถึง {to} {message} จาก {from}</p>}
    {editor&&<section className="beyond-editor" id="beyond-editor" aria-label="ปรับข้อความส่วนตัว"><div className="beyond-editor-head"><h2>ฝากเรื่องราวของคุณ</h2><button onClick={()=>setEditor(false)} aria-label="ปิดการปรับข้อความ">×</button></div><p>ข้อความอยู่ในหน้านี้เท่านั้น</p><label>ถึง<input maxLength={80} value={to} onChange={e=>setTo(e.target.value)}/></label><label>จาก<input maxLength={80} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>ข้อความ<textarea maxLength={800} rows={4} value={message} onChange={e=>{setMessage(e.target.value);setPage(0)}}/></label><button className="beyond-editor-button" onClick={()=>void audio.toggle()}>{audio.enabled?'ปิดเสียง':'เปิดเสียงประกอบ'}</button><button className="beyond-editor-button" onClick={()=>setEditor(false)}>เสร็จแล้ว</button>{audio.unavailable&&<p role="status">เปิดเสียงไม่ได้ แต่ยังเล่นต่อได้</p>}</section>}
  </main>
}
