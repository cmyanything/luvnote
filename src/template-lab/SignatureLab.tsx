import { useEffect, useState } from 'react';
import { labAsset } from './paths';
import { SignatureStage, type SignatureMode } from './SignatureStage';
import './signature.css';

const entries: {id:SignatureMode;title:string;label:string;verb:string;description:string}[] = [
  {id:'type',title:'Living Typography',label:'อักษรมีชีวิต',verb:'ดึงข้อความให้ไหว',description:'ตัวอักษรทั้งบรรทัดยืดตามมือ แล้วทิ้งร่องรอยของการสัมผัสไว้'},
  {id:'physics',title:'Impossible Physics',label:'ภาพที่เชื่อมกัน',verb:'ลากภาพผ่านช่อง',description:'ภาพเดียวกันอยู่ในสองหน้าต่าง เมื่อขยับด้านหนึ่ง อีกด้านเคลื่อนสวนกลับ'},
  {id:'echo',title:'Memory Echo',label:'ร่องรอยความทรงจำ',verb:'วาดร่องรอยของเธอ',description:'เส้นที่เธอวาดจะเดินทางกลับมาประกอบเป็นชื่อที่ผู้ส่งฝากไว้'},
];
const initialMode=():SignatureMode=>{const value=new URLSearchParams(location.search).get('effect');return value==='physics'||value==='echo'?value:'type'};
export default function SignatureLab(){
  const [mode,setMode]=useState<SignatureMode>(initialMode),[to,setTo]=useState('คนสำคัญ'),[message,setMessage]=useState('ทุกความทรงจำของเรายังมีชีวิตอยู่เสมอ'),[photo,setPhoto]=useState(''),[error,setError]=useState(''),[editor,setEditor]=useState(false);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo)},[photo]);
  useEffect(()=>{const onPop=()=>setMode(initialMode());window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[]);
  function choose(id:SignatureMode){setMode(id);const url=new URL(location.href);url.searchParams.set('experiment','signature');url.searchParams.set('effect',id);history.replaceState(null,'',url)}
  function selectPhoto(file?:File){if(!file)return;if(!file.type.startsWith('image/')||file.size>6*1024*1024){setError('เลือกไฟล์รูปภาพขนาดไม่เกิน 6 MB');return}setError('');setPhoto(URL.createObjectURL(file))}
  const current=entries.find(x=>x.id===mode)!;
  return <main className="sig-app">
    <header className="sig-header"><a href={labAsset('template-lab/')}>LuvNote <span>Lab</span></a><span className="sig-header-note">พื้นที่ทดลอง · ไม่มีการส่งข้อมูล</span><button className="sig-custom-toggle" onClick={()=>setEditor(!editor)} aria-expanded={editor} aria-controls="sig-editor">ปรับเรื่องของเรา</button></header>
    <div className="sig-layout"><div className="sig-intro"><h1>ของขวัญที่<br/><em>ตอบรับเธอ</em></h1><p>สามการทดลองเล็ก ๆ ที่เปลี่ยนชื่อ รูป และร่องรอยของเธอ ให้กลายเป็นเรื่องที่มีชีวิต</p></div>
      <nav className="sig-tabs" aria-label="เลือกการทดลอง">{entries.map((item,i)=><button key={item.id} aria-pressed={mode===item.id} onClick={()=>choose(item.id)}><small>0{i+1}</small><span>{item.label}</span></button>)}</nav>
      <section className="sig-experiment" aria-labelledby="sig-current-title"><div className="sig-stage-heading"><div><p>{current.title}</p><h2 id="sig-current-title">{current.verb}</h2></div><span className="sig-stage-index">0{entries.findIndex(x=>x.id===mode)+1} / 03</span></div><p className="sig-stage-desc">{current.description}</p><SignatureStage key={mode} mode={mode} name={to} message={message} image={photo || labAsset('images/flagship-lighthouse-v1.webp')} /></section>
      <aside className="sig-side"><p>ผลลัพธ์จะเปลี่ยนไป<br/>เมื่อเรื่องราวเป็นของเธอ</p><button onClick={()=>setEditor(!editor)} aria-controls="sig-editor" aria-expanded={editor}>ใส่ชื่อ ข้อความ และรูปของเรา <span aria-hidden="true">↗</span></button><small>รูปและข้อความอยู่ในแท็บนี้เท่านั้น</small></aside>
    </div>
    {editor&&<section className="sig-editor" id="sig-editor" aria-label="ปรับข้อมูลการทดลอง"><div className="sig-editor-head"><h2>ใส่เรื่องของเรา</h2><button onClick={()=>setEditor(false)} aria-label="ปิดการปรับข้อมูล">×</button></div><p>ใช้เพื่อทดลองในเบราว์เซอร์นี้ ไม่มีการอัปโหลดหรือบันทึกเข้าระบบ</p><label>ชื่อผู้รับ<input value={to} maxLength={100} onChange={e=>setTo(e.target.value)} /></label><label>ข้อความ<textarea value={message} maxLength={500} rows={4} onChange={e=>setMessage(e.target.value)} /></label><label>รูปความทรงจำ <input type="file" accept="image/*" onChange={e=>selectPhoto(e.target.files?.[0])}/></label>{error&&<p role="alert">{error}</p>}<div className="sig-editor-actions">{photo&&<button onClick={()=>{setPhoto('');setError('')}}>ใช้รูปตัวอย่าง</button>}<button onClick={()=>setEditor(false)}>เสร็จแล้ว</button></div></section>}
    <footer className="sig-footer">Signature Effects Lab · ต้นแบบสำหรับทดลอง ไม่ได้สร้างหรือเผยแพร่การ์ดจริง</footer>
  </main>
}
