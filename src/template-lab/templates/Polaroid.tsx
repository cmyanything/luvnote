import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { Button, Icon, Modal, MOTION, Photo, useStill } from '../shared';
import { LetterCopy } from '../recipient';
import { DevelopPhoto } from './polaroid/DevelopPhoto';
import { saveKeepsake } from './polaroid/keepsake';
import './polaroid/polaroid.css';

const chapters = ['แกะห่อรูป', 'เปิดความทรงจำ', 'จัดมุมโปรด', 'จดหมายถึงเธอ'];
const stickers = ['เทปกระดาษ', 'ประทับหัวใจ', 'วันที่ของเรา'];

export default function Polaroid({ story }: { story: Story }) {
  const [chapter, setChapter] = useState(0);
  const [opening, setOpening] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [developed, setDeveloped] = useState<number[]>([]);
  const [read, setRead] = useState<number[]>([]);
  const [unfolded, setUnfolded] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [sticker, setSticker] = useState(0);
  const [reply, setReply] = useState('');
  const [lastPrint, setLastPrint] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const alive = useRef(true);
  const still = useStill();
  const moment = story.moments[index];
  const clear = developed.includes(index);
  const selected = favorites.map((i) => story.moments[i]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (chapter) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [chapter]);
  function move(direction: number) {
    setIndex((i) => (i + direction + story.moments.length) % story.moments.length);
    setFlipped(false);
  }
  function develop() {
    setDeveloped((list) => list.includes(index) ? list : [...list, index]);
  }
  function flip() {
    develop();
    if (!flipped) setRead((list) => list.includes(index) ? list : [...list, index]);
    setFlipped((v) => !v);
  }
  function favorite(i: number) {
    setNotice('');
    if (favorites.includes(i)) setFavorites((list) => list.filter((n) => n !== i));
    else if (favorites.length < 3) setFavorites((list) => [...list, i]);
    else setNotice('เลือกเก็บได้ 3 รูป เอารูปที่เลือกไว้ออกก่อนเปลี่ยนใบใหม่ได้');
  }
  function rearrange(slot: number, direction: number) {
    const next = slot + direction;
    if (next < 0 || next >= favorites.length) return;
    setFavorites((list) => {
      const copy = [...list];
      [copy[slot], copy[next]] = [copy[next], copy[slot]];
      return copy;
    });
  }
  function openParcel() {
    if (still) setChapter(1);
    else setOpening(true);
  }
  async function download() {
    setSaving(true);
    setNotice('กำลังทำภาพที่ระลึก…');
    try {
      await saveKeepsake(story, selected, reply, sticker);
      if (alive.current) setNotice('ทำภาพที่ระลึกแล้ว เปิดดูในไฟล์ดาวน์โหลดของเบราว์เซอร์ได้');
    } catch {
      if (alive.current) setNotice('บันทึกภาพไม่ได้ รูปจากลิงก์ภายนอกอาจไม่อนุญาตให้บันทึก ลองใช้รูปที่อัปโหลดใน Studio แล้วกดอีกครั้ง');
    } finally {
      if (alive.current) setSaving(false);
    }
  }

  return (
    <main className="experience polaroid polaroid-evening">
      <header className="polaroid-heading">
        <div>
          <p className="pm-address">สำหรับ {story.to} <span>จาก {story.from}</span></p>
          <h1>{story.headline || <>Some days,<br />kept forever.</>}</h1>
          <p className="pm-intro">{story.intro || 'ค่อย ๆ เปิดทีละรูป บางเรื่องก็ชัดขึ้นเมื่อเราใช้เวลากับมัน'}</p>
        </div>
        <span className="pm-edition hand">รูปเล็ก ๆ<br />เรื่องใหญ่ของเรา</span>
      </header>
      <nav className="pm-chapters" aria-label="ช่วงของอัลบั้ม">
        {chapters.map((label, i) => <button key={label} aria-current={chapter === i ? 'step' : undefined} onClick={() => { setOpening(false); setChapter(i); }}><span aria-hidden="true">{i + 1}</span>{label}</button>)}
      </nav>

      {chapter === 0 && <section className="pm-arrival" aria-label="ห่อรูปจากคนข้าง ๆ">
        <div className="pm-peeking" aria-hidden="true">{story.moments.slice(0, 3).map((m) => <img key={m.id} src={m.image} alt="" />)}</div>
        <motion.div className="pm-parcel" drag={opening ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.35}
          onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 65) openParcel(); }}
          animate={opening ? { y: -420, rotate: -12 } : { y: 0, rotate: -3 }}
          transition={{ duration: still ? 0 : 0.48, ease: MOTION.ease }}
          onAnimationComplete={() => { if (opening) setChapter(1); }}>
          <span className="pm-string horizontal" aria-hidden="true" /><span className="pm-string vertical" aria-hidden="true" />
          <div className="pm-parcel-label">{story.cover && <img className="pm-parcel-cover" src={story.cover} alt={`ปกอัลบั้มถึง ${story.to}`} />}<span className="hand">เปิดเมื่อคิดถึงกัน</span><h2>ถึง {story.to}</h2><p>เก็บมาฝาก {story.moments.length} ความทรงจำ</p><span className="hand">— {story.from}</span></div>
          <button className="pm-knot" onClick={openParcel} disabled={opening} aria-label="แกะห่อรูปความทรงจำ"><span aria-hidden="true" /><span aria-hidden="true" /><Icon name="heart" size={25} /></button>
        </motion.div>
        <div className="pm-arrival-note"><p className="hand">มีบางวันที่เราอยากเก็บไว้ในมือ</p><p>ลากห่อเบา ๆ หรือแตะปมเชือกเพื่อเปิด<br />ให้เวลาตัวเองกับรูปกองนี้สักหน่อยนะ</p></div>
      </section>}

      {chapter === 1 && <section className="pm-darkroom" aria-labelledby="pm-memory-heading">
        <div className="pm-scene-heading"><h2 ref={heading} tabIndex={-1} id="pm-memory-heading">วันนั้น… ยังจำได้ไหม</h2><p>ลูบรูปให้ความทรงจำค่อย ๆ ชัด พลิกอ่านลายมือ แล้วแง้มโน้ตที่พับไว้</p></div>
        <div className="pm-desk">
          <aside className="pm-desk-note"><span className="hand">ที่ถ่ายรูปนี้</span><p>{moment.place || 'ที่ไหนก็พิเศษ เมื่อมีเราอยู่ด้วยกัน'}</p><span>{shortDate(moment.date) || 'วันหนึ่งที่อยากจำ'}</span><p className="hand pm-desk-whisper">{read.includes(index) ? 'บางความรู้สึก… เขียนไว้หลังรูปหมดแล้ว' : 'มีข้อความถึงเธออยู่หลังรูปด้วยนะ'}</p></aside>
          <div>
            <div className="polaroid-table">
              {[2, 1].map((offset) => <div className={`polaroid-under under-${offset}`} key={offset} aria-hidden="true"><img src={story.moments[(index + offset) % story.moments.length].image} alt="" /></div>)}
              <motion.div key={index} className="polaroid-drag" drag={clear ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
                onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 65) move(info.offset.x > 0 ? -1 : 1); }}
                initial={still ? false : { x: 34, rotate: 7 }} animate={{ x: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 330, damping: 28 }} style={{ touchAction: clear ? 'pan-y' : 'none' }}>
                <div className={`polaroid-print ${flipped ? 'flipped' : ''}`}>
                  <div className="print-front" aria-hidden={flipped} inert={flipped}>
                    <div className="pm-image-window"><Photo moment={moment} eager />{!clear && <DevelopPhoto key={moment.id} onComplete={develop} />}</div>
                    <button className="print-expand" aria-label="ขยายรูปภาพ" onClick={() => { develop(); setZoom(true); }}><Icon name="expand" size={18} /></button>
                    <p className="hand">{moment.title}</p><span className="print-date">{shortDate(moment.date)}</span>
                    {favorites.includes(index) && <span className="pm-favorite-stamp" aria-hidden="true"><Icon name="heart" size={24} /></span>}
                  </div>
                  <div className="print-back" aria-hidden={!flipped} inert={!flipped}>
                    <span className="hand">เขียนไว้หลังรูป</span>
                    <div className="back-note" role="region" aria-label="ข้อความหลังรูป" tabIndex={0}>
                      <p>{moment.note || 'บางรูปก็เล่าเรื่องของมันได้ โดยไม่ต้องมีคำบรรยาย'}</p>
                      {moment.aside && <div className={`pm-folded-note ${unfolded.includes(index) ? 'unfolded' : ''}`}><button aria-expanded={unfolded.includes(index)} onClick={() => setUnfolded((list) => list.includes(index) ? list.filter((n) => n !== index) : [...list, index])}><span className="pm-fold-corner" aria-hidden="true" />{unfolded.includes(index) ? 'พับโน้ตกลับ' : 'แง้มโน้ตเล็ก ๆ'}</button>{unfolded.includes(index) && <p className="hand">{moment.aside}</p>}</div>}
                    </div><span>— {story.from}</span>
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="pm-develop-action">{!clear ? <button onClick={develop}>เปิดภาพทันที</button> : <span className="hand">ชัดเท่าเดิม เพิ่มเติมคือคิดถึง</span>}</div>
            <div className="polaroid-controls"><button aria-label="รูปก่อนหน้า" onClick={() => move(-1)}><Icon name="back" /></button><Button variant="quiet" onClick={flip} aria-pressed={flipped}>{flipped ? 'กลับมาดูรูป' : 'พลิกอ่านข้อความ'}</Button><button aria-label="รูปถัดไป" onClick={() => move(1)}><Icon name="arrow" /></button></div>
            <button className="pm-save-favorite" aria-pressed={favorites.includes(index)} onClick={() => favorite(index)}><Icon name="heart" size={18} />{favorites.includes(index) ? 'เก็บเป็นรูปโปรดแล้ว' : 'เก็บรูปนี้ไว้ในมุมโปรด'}</button>
          </div>
        </div>
        <p className="polaroid-hint" aria-live="polite">{index + 1} / {story.moments.length}<span>{clear ? 'ปัดรูป หรือแตะลูกศร' : 'ใช้นิ้วลูบบนภาพ หรือกดเปิดภาพทันที'}</span></p>
        <div className="polaroid-contact" aria-label="รูปทั้งหมดในกอง">{story.moments.map((m, i) => <button key={m.id} onClick={() => { setIndex(i); setFlipped(false); }} aria-label={`เลือกรูป ${i + 1}: ${m.title}`} aria-pressed={index === i}><img src={m.image} alt="" loading="lazy" /><span>{i + 1}{read.includes(i) && <Icon name="check" size={12} />}</span></button>)}</div>
        <div className="pm-next-chapter"><p>อ่านข้อความหลังรูปแล้ว {read.length} / {story.moments.length}</p><Button onClick={() => setChapter(2)}>ไปจัดมุมความทรงจำ <Icon name="arrow" size={18} /></Button><button className="pm-text-link" onClick={() => setChapter(3)}>ยังมีรูปใบสุดท้ายถึงเธอ</button></div>
      </section>}

      {chapter === 2 && <section className="pm-curation" aria-labelledby="pm-wall-heading">
        <div className="pm-scene-heading"><h2 id="pm-wall-heading" ref={heading} tabIndex={-1}>ถ้าเก็บไว้ใกล้ตัวได้สามรูป…</h2><p>เลือกรูปที่อยากเห็นทุกวัน แล้วจัดมุมเล็ก ๆ ให้เป็นของเรา</p></div>
        <div className="pm-picker" aria-label="เลือกรูปโปรดไม่เกินสามรูป">{story.moments.map((m, i) => <button key={m.id} onClick={() => favorite(i)} aria-pressed={favorites.includes(i)} aria-label={`รูปโปรด ${i + 1}: ${m.title}`}><img src={m.image} alt="" loading="lazy" /><span>{m.title}</span><Icon name={favorites.includes(i) ? 'check' : 'heart'} size={18} /></button>)}</div>
        <div className={`pm-memory-wall pm-sticker-${sticker}`} aria-label="มุมความทรงจำที่จัดไว้">
          {favorites.length === 0 && <p className="pm-empty-wall hand">แตะเลือกรูปข้างบน<br />ให้ผนังตรงนี้มีเรื่องของเรา</p>}
          {favorites.map((i, slot) => <div className="pm-wall-item" key={story.moments[i].id}>
            <motion.div className="pm-wall-print" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 45) rearrange(slot, info.offset.x > 0 ? 1 : -1); }} style={{ touchAction: 'pan-y' }}>
              <span className="pm-wall-decoration" aria-hidden="true">{sticker === 1 ? <Icon name="heart" size={30} /> : sticker === 2 ? (shortDate(story.moments[i].date) || 'วันของเรา') : ''}</span><Photo moment={story.moments[i]} /><p className="hand">{story.moments[i].title}</p>
            </motion.div>
            <div className="pm-order-controls"><button disabled={slot === 0} aria-label={`เลื่อนรูปโปรด ${slot + 1} ไปก่อนหน้า`} onClick={() => rearrange(slot, -1)}><Icon name="back" size={16} /></button><span>รูปที่ {slot + 1}</span><button disabled={slot === favorites.length - 1} aria-label={`เลื่อนรูปโปรด ${slot + 1} ไปถัดไป`} onClick={() => rearrange(slot, 1)}><Icon name="arrow" size={16} /></button></div>
          </div>)}
        </div>
        <fieldset className="pm-stickers"><legend>ติดอะไรบนรูปดี</legend>{stickers.map((label, i) => <button key={label} aria-pressed={sticker === i} onClick={() => setSticker(i)}>{label}</button>)}</fieldset>
        <div className="pm-reply-postcard"><label htmlFor="pm-reply">คราวหน้า อยากทำอะไรด้วยกัน?</label><textarea id="pm-reply" maxLength={300} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="ทริปเล็ก ๆ ร้านเดิม หรือแค่วันว่างที่ได้นั่งข้างกัน…" /><p>ข้อความนี้เก็บอยู่ในหน้านี้และภาพที่คุณเลือกบันทึก ไม่ได้ส่งกลับให้ผู้ส่ง</p></div>
        <div className="pm-next-chapter"><Button onClick={download} disabled={!favorites.length || saving}><Icon name="expand" size={18} />{saving ? 'กำลังทำภาพ…' : 'บันทึกมุมโปรดเป็นภาพ'}</Button><Button variant="quiet" onClick={() => setChapter(3)}>เปิดจดหมายถึงเธอ <Icon name="arrow" size={18} /></Button></div>
      </section>}

      {chapter === 3 && <section className="pm-finale" aria-labelledby="pm-letter-heading">
        <div className="pm-scene-heading"><h2 id="pm-letter-heading" ref={heading} tabIndex={-1}>รูปมีแค่นี้ แต่เรื่องของเรายังมีต่อ</h2><p>มีอีกบางอย่าง ที่เขียนไว้ให้เธอคนเดียว</p></div>
        <div className="polaroid-letter-print"><span className="hand">{story.title}</span><LetterCopy story={story} />
          <div className={`pm-last-pocket ${lastPrint ? 'pulled' : ''}`}>
            {!lastPrint && <motion.button className="pm-last-tab" drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.3} onDragEnd={(_, info) => { if (info.offset.y < -35) setLastPrint(true); }} onClick={() => setLastPrint(true)} style={{ touchAction: 'pan-x' }}><span className="hand">รูปใบที่ยังไม่ได้ถ่าย</span><Icon name="arrow" size={22} /><span>ดึงขึ้น หรือแตะเปิดรูปใบสุดท้าย</span></motion.button>}
            {lastPrint && <motion.div className="pm-future-print" initial={still ? false : { y: 30, rotate: -4 }} animate={{ y: 0, rotate: 2 }} transition={{ duration: 0.48, ease: MOTION.ease }}><div><Icon name="heart" size={40} /><p className="hand">รูปต่อไป… อยากถ่ายกับเธอ</p></div><p className="hand" role="status">{story.secret}</p><p>{story.closing}</p></motion.div>}
          </div>
        </div>
        {selected.length > 0 && <div className="pm-ending-prints" aria-label="รูปโปรดที่เลือกไว้">{selected.map((m) => <figure key={m.id}><Photo moment={m} /><figcaption className="hand">{m.title}</figcaption></figure>)}{reply && <p className="hand pm-ending-reply">คราวหน้าของเรา<br />{reply}</p>}</div>}
        <div className="pm-next-chapter"><Button variant="quiet" onClick={() => setChapter(2)}>กลับไปจัดมุมโปรด</Button><Button variant="quiet" onClick={() => { setChapter(1); setFlipped(false); }}>กลับไปดูรูปในกอง</Button></div>
      </section>}
      {notice && <p className="pm-notice" role="status">{notice}</p>}
      {zoom && <Modal title={moment.title} onClose={() => setZoom(false)}><Photo moment={moment} eager /><p>{moment.note}</p><p>{[shortDate(moment.date), moment.place].filter(Boolean).join(' · ')}</p></Modal>}
    </main>
  );
}
