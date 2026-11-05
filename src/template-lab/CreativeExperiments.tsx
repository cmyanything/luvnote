import { useState } from 'react';
import './creative-experiments.css';
import LoyKrathong from './LoyKrathong';

type Kind = 'radio' | 'train' | 'theatre' | 'loy-krathong';
const concepts: { id: Kind; title: string; subtitle: string }[] = [
  { id: 'radio', title: 'Midnight Radio', subtitle: 'ปรับคลื่นจนเจอข้อความที่ส่งถึงเธอ' },
  { id: 'train', title: 'The Last Train', subtitle: 'ประทับตั๋ว แล้วเดินทางผ่านความทรงจำ' },
  { id: 'theatre', title: 'Paper Theatre', subtitle: 'เปิดม่านให้เรื่องราวของเราเริ่มขึ้น' },
  { id: 'loy-krathong', title: 'ใต้แสงจันทร์วันเพ็ญ', subtitle: 'ปล่อยกระทงและส่งคำอธิษฐานไปด้วยกัน' },
];

export default function CreativeExperiments() {
  const [kind, setKind] = useState<Kind>(() => new URLSearchParams(location.search).get('theme') === 'loy-krathong' ? 'loy-krathong' : 'radio');
  return <div className="cx-shell">
    <header className="cx-nav"><a href="?">← Template Lab</a><span>CREATIVE STUDIO / LAB ONLY</span></header>
    <div className="cx-heading"><p>LITTLE WORLDS, BIG FEELINGS</p><h1>เรื่องเล็ก ๆ<br/><i>ที่มีเธออยู่ในนั้น</i></h1><p>ต้นแบบทดลอง · เลือกเรื่อง แล้วลองเล่นได้เลย</p></div>
    <nav className="cx-tabs" aria-label="เลือกต้นแบบ">{concepts.map((c, i) => <button key={c.id} onClick={() => setKind(c.id)} aria-pressed={kind === c.id}><small>0{i + 1}</small><strong>{c.title}</strong><span>{c.subtitle}</span></button>)}</nav>
    <Experience key={kind} kind={kind}/>
    <footer className="cx-footer">ตัวอย่างใน Template Lab · ข้อมูลสมมติ · ไม่มีการสร้างลิงก์หรือส่งข้อมูล</footer>
  </div>;
}

function Experience({kind}: {kind: Kind}) {
  const [step, setStep] = useState(0);
  const [frequency, setFrequency] = useState(88);
  const reset = () => { setStep(0); setFrequency(88); };
  if (kind === 'radio') return <main className="cx-world cx-radio">
    <div className="radio-label"><span>LOVE FREQUENCY</span><span>STEREO / 01</span></div>
    <div className="radio-layout"><div><p className="cx-overline">A MESSAGE IN THE AIR</p><h2>Somewhere<br/><em>on your dial.</em></h2><p>ถึงเธอ ในคืนที่โลกเงียบลง<br/>มีคลื่นเล็ก ๆ ที่ส่งมาจากคนคิดถึง</p></div>
    <section className="radio-set" aria-label="เครื่องรับวิทยุ"><div className="radio-screen"><div className="radio-scale">88 <span>92</span> 96 <span>100</span> 104 <span>108</span></div><div className="radio-needle" style={{left: `${(frequency - 88) / 20 * 100}%`}}/><b>{frequency}.0 <small>MHz</small></b><p>{step ? '● SIGNAL FOUND' : '○ FIND THE SIGNAL'}</p></div>
    <label htmlFor="frequency">เลื่อนหาคลื่น 96 MHz</label><input id="frequency" type="range" min="88" max="108" value={frequency} onChange={e => { const value = Number(e.target.value); setFrequency(value); if (value === 96) setStep(1); }}/><button onClick={() => {setFrequency(96); setStep(1);}}>ฟังข้อความที่ 96 MHz →</button></section></div>
    {step > 0 && <section className="cx-reveal radio-reveal" aria-live="polite"><p>NOW PLAYING / FOR YOU</p><h3>“ขอบคุณที่เป็น<br/>เพลงโปรดในวันธรรมดา”</h3><p>ไม่ว่าเราจะอยู่ห่างกันแค่ไหน ยังมีคนหนึ่งคอยส่งความคิดถึงไปหาเธอเสมอ</p><span>จาก คนข้าง ๆ ♡</span><button onClick={reset}>ปรับคลื่นอีกครั้ง ↺</button></section>}
  </main>;
  if (kind === 'train') return <main className="cx-world cx-train"><div className="train-top"><span>PLATFORM 02</span><span>ONE WAY / TOGETHER</span></div><div className="train-layout"><div><p className="cx-overline">THE LAST TRAIN</p><h2>ปลายทาง<br/><em>คือการมีเธอ</em></h2><p>ทุกสถานีมีเรื่องราวเล็ก ๆ ซ่อนอยู่<br/>ปั๊มตั๋วเพื่อออกเดินทางไปด้วยกัน</p></div><section className={'ticket ' + (step > 0 ? 'stamped' : '')}><div className="ticket-top"><span>LUVNOTE RAILWAY</span><b>02:14</b></div><h3>OUR<br/>JOURNEY</h3><div className="ticket-route"><div><small>FROM</small><b>วันแรก</b></div><span>⟶</span><div><small>TO</small><b>ทุกวันต่อไป</b></div></div><div className="ticket-bottom"><span>PASSENGER<br/><b>เธอ & คนข้าง ๆ</b></span><button onClick={() => setStep(1)} disabled={step > 0}>{step ? 'ประทับแล้ว ✓' : 'ประทับตั๋ว ↘'}</button></div>{step > 0 && <div className="stamp" aria-hidden="true">VALID<br/>WITH LOVE</div>}</section></div>
    {step > 0 && <section className="train-journey" aria-live="polite"><p>YOUR STOPS / 01—03</p><div className="stops"><article><b>01</b><h3>วันแรกที่พบ</h3><p>กาแฟธรรมดา กับคนที่ไม่ธรรมดา</p></article><article><b>02</b><h3>วันที่หลงทาง</h3><p>จำทางกลับไม่ได้ แต่จำเสียงหัวเราะได้</p></article><article><b>03</b><h3>สถานีถัดไป</h3><p>ไม่ต้องรีบไปไหน แค่ไปด้วยกัน</p></article></div><blockquote>“ขอบคุณที่นั่งข้างกันมาตลอดทาง”</blockquote><button onClick={reset}>เริ่มเดินทางอีกครั้ง ↺</button></section>}
  </main>;
  if (kind === 'loy-krathong') return <LoyKrathong />;
  return <main className="cx-world cx-theatre"><div className="theatre-heading"><span>THE LITTLE PAPER THEATRE</span><span>AN ORIGINAL STORY / FOR YOU</span></div><div className="theatre-layout"><div className="theatre-copy"><p className="cx-overline">A STORY IN ONE ACT</p><h2>เรื่องของเรา<br/><em>บนเวทีเล็ก ๆ</em></h2><p>บางช่วงเวลาควรเก็บไว้ให้ดูซ้ำ<br/>เปิดม่าน แล้วให้ความทรงจำเล่าเรื่อง</p><button onClick={() => setStep(step ? 0 : 1)} aria-expanded={step > 0}>{step ? 'ปิดม่านเพื่อเล่นอีกครั้ง ↺' : 'เปิดม่านชมเรื่องราว →'}</button></div><section className={'stage ' + (step ? 'opened' : '')} aria-label="เวทีเรื่องราว"><div className="stage-sky"><div className="stage-sun"/><div className="stage-hill hill-back"/><div className="stage-hill hill-front"/><div className="stage-message" aria-live="polite">{step > 0 && <><small>SCENE 01 / US</small><h3>ในโลกใบใหญ่<br/>ดีใจที่ได้เจอเธอ</h3><p>ขอบคุณทุกวันธรรมดา<br/>ที่กลายเป็นเรื่องพิเศษเพราะมีเธอ</p><b>— คนข้าง ๆ</b></>}</div></div><div className="curtain left"/><div className="curtain right"/><div className="stage-header">✦ &nbsp; OUR LITTLE STORY &nbsp; ✦</div></section></div><p className="theatre-end">{step ? 'THE END · AND A THOUSAND MORE BEGINNINGS' : 'CURTAIN UP WHEN YOU ARE READY'}</p></main>;
}
