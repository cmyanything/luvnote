import { useState } from 'react';
import { labAsset } from './paths';

const defaultWish = 'ขอให้ทุกวันต่อจากนี้ ใจเธอเบาเหมือนกระทงที่ลอยไป';
const defaultLetter = 'ไม่ว่าปีนี้จะมีเรื่องราวมากมายแค่ไหน\nขอให้เธอรู้ไว้ว่า ยังมีฉันอยู่ข้าง ๆ เสมอ';

export default function LoyKrathong() {
  const [step, setStep] = useState(0);
  const [to, setTo] = useState('เธอ');
  const [from, setFrom] = useState('คนข้าง ๆ');
  const [wish, setWish] = useState(defaultWish);
  const [letter, setLetter] = useState(defaultLetter);
  const [editing, setEditing] = useState(false);
  const [blessing, setBlessing] = useState('');
  const restart = () => { setStep(0); setBlessing(''); window.scrollTo({ top: 0, behavior: 'auto' }); };
  return <main className="cx-world cx-loy">
    <div className="loy-atmosphere" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    <div className="loy-content">
      <div className="loy-top"><span>LUVNOTE · FESTIVAL OF LIGHTS</span><span>คืนวันเพ็ญ / FOR YOU</span></div>
      <div className="loy-layout">
        <div className="loy-copy"><p className="cx-overline">A LITTLE WISH FOR US</p><h2>ใต้แสงจันทร์<br/><em>วันเพ็ญ</em></h2><p>คืนนี้ฝากความเหนื่อยล้าไปกับสายน้ำ<br/>แล้วเก็บคำอธิษฐานดี ๆ ไว้ด้วยกัน</p>
          <div className="loy-to">ถึง <strong>{to.trim() || 'เธอ'}</strong> <span>✦</span></div>
          <div className="loy-story-action" aria-live="polite">
            {step === 0 && <><p className="loy-step-label">01 / จุดแสงให้คืนพิเศษ</p><button onClick={() => setStep(1)}>จุดเทียนบนกระทง ✦</button><p className="loy-hint">เริ่มด้วยแสงเล็ก ๆ ที่เราแบ่งปันกัน</p></>}
            {step === 1 && <><p className="loy-step-label">02 / เลือกสิ่งที่อยากฝากไปกับสายน้ำ</p><div className="loy-blessings" role="group" aria-label="เลือกคำอวยพร">{['ความสุข', 'ความสบายใจ', 'การได้อยู่ข้างกัน'].map(item => <button key={item} onClick={() => {setBlessing(item); setStep(2);}}>{item} ✧</button>)}</div><p className="loy-hint">เลือกหนึ่งอย่างที่อยากส่งให้คนพิเศษ</p></>}
            {step === 2 && <><p className="loy-step-label">03 / พร้อมออกเดินทาง</p><p className="loy-selected">ฝาก “{blessing}” ไปกับกระทงของเรา</p><button onClick={() => setStep(3)}>ปล่อยกระทงของเรา →</button><p className="loy-hint">แตะปล่อยกระทง แล้วเลื่อนลงไปอ่านข้อความ</p></>}
            {step >= 3 && <p className="loy-hint loy-status" role="status">✦ กระทงนำ “{blessing}” ออกเดินทางแล้ว · เลื่อนลงเพื่ออ่านข้อความ</p>}
          </div>
        </div>
        <div className={'loy-scene ' + (step >= 3 ? 'is-floating' : '') + (step >= 1 ? ' is-lit' : '')}><img className="loy-art" src={labAsset('images/loy-krathong-animation-v1.webp')} alt="ภาพวาดกระทงดอกบัวและเทียน ลอยอยู่บนสายน้ำใต้แสงจันทร์วันเพ็ญ"/><div className="loy-art-glow" aria-hidden="true"/><div className="loy-fireflies" aria-hidden="true"><i/><i/><i/><i/><i/></div></div>
      </div>
      {step >= 3 && <section className="loy-letter" aria-live="polite"><span>✦ &nbsp; A WISH FOR YOU &nbsp; ✦</span><p className="loy-recipient">ฝาก {blessing} ไปถึง {to.trim() || 'เธอ'}</p><h3>“{wish.trim() || defaultWish}”</h3><p className="loy-letter-copy">{letter.trim() || defaultLetter}</p><div className="loy-sign">ด้วยความคิดถึง<br/><b>{from.trim() || 'คนข้าง ๆ'}</b></div>{step === 3 && <button onClick={() => setStep(4)}>เก็บคำอธิษฐานไว้ด้วยกัน →</button>}</section>}
      {step === 4 && <section className="loy-finale" aria-live="polite"><div className="loy-finale-moon" aria-hidden="true">✧</div><p>UNDER THE SAME MOON</p><h3>ไม่ว่าเราจะอยู่ที่ไหน<br/><em>ยังมองเห็นพระจันทร์ดวงเดียวกัน</em></h3><p>ขอให้คืนวันเพ็ญนี้เป็นความทรงจำที่อบอุ่นของเรา</p><button onClick={restart}>เริ่มต้นอีกครั้ง ↺</button></section>}
      <div className="loy-end">ONE MOON · ONE WISH · ALWAYS WITH YOU</div>
      <details className="loy-editor" open={editing} onToggle={e => setEditing(e.currentTarget.open)}><summary>ปรับข้อความตัวอย่างใน Lab</summary><p>เปลี่ยนข้อความเพื่อทดลองตัวอย่าง ข้อมูลอยู่ในหน้านี้เท่านั้น</p><div className="loy-fields"><label>ชื่อผู้รับ<input maxLength={60} value={to} onChange={e => setTo(e.target.value)}/></label><label>ชื่อผู้ส่ง<input maxLength={60} value={from} onChange={e => setFrom(e.target.value)}/></label><label>คำอธิษฐาน<textarea maxLength={180} rows={3} value={wish} onChange={e => setWish(e.target.value)}/></label><label>ข้อความจากใจ<textarea maxLength={600} rows={5} value={letter} onChange={e => setLetter(e.target.value)}/></label></div><button onClick={() => {setEditing(false); restart();}}>ดูตัวอย่างตั้งแต่ต้น →</button></details>
    </div>
  </main>;
}
