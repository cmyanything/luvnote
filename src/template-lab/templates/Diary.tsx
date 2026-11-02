import { useState } from 'react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { AnimatedGroup, Photo, Words } from '../shared';
import { MemoryView, ReadLetter } from '../recipient';

export default function Diary({ story }: { story: Story }) {
  const [entry, setEntry] = useState(0);
  const [unfold, setUnfold] = useState(false);
  const moment = story.moments[entry];
  return (
    <main className="experience diary">
      <header>
        <h1>
          {story.headline || (
            <>
              A diary
              <br />
              of us.
            </>
          )}
        </h1>
        <p>{story.intro || `วันธรรมดา ในหน้ากระดาษของ ${story.from}`}</p>
        <span className="diary-dedication">
          {story.title} · เขียนถึง {story.to}
        </span>
        {story.cover && (
          <img
            className="diary-cover"
            src={story.cover}
            alt={`ปกไดอารีของ ${story.to}`}
          />
        )}
      </header>
      <div className="diary-body">
        <nav aria-label="เลือกวันที่ในไดอารี" className="diary-index">
          {story.moments.map((m, i) => (
            <button
              key={m.id}
              aria-label={`อ่านบันทึก ${i + 1}: ${m.title}${m.date ? ` · ${shortDate(m.date)}` : ''}`}
              aria-current={entry === i ? 'date' : undefined}
              onClick={() => {
                setEntry(i);
                setUnfold(false);
              }}
            >
              <span>{m.date ? m.date.slice(0, 4) : `บันทึก ${i + 1}`}</span>
              <strong>
                {m.date ? shortDate(m.date).split(' ').slice(0, 2).join(' ') : 'ไม่ระบุวันที่'}
              </strong>
              <span className="diary-tab-title">{m.title}</span>
            </button>
          ))}
        </nav>
        <article
          className={`diary-entry diary-layout-${entry % 4}`}
          key={moment.id}
        >
          <div className="diary-entry-date">
            <span>{moment.date ? shortDate(moment.date) : `ความทรงจำที่ ${entry + 1}`}</span>
            <span>Dear diary,</span>
          </div>
          <h2>
            <Words text={moment.title} />
          </h2>
          <div className="diary-photo">
            <MemoryView moment={moment} />
            <span className="hand">{moment.place || 'วันนี้ของเรา'}</span>
          </div>
          <AnimatedGroup>
            <p className="diary-note">{moment.note}</p>
            {moment.place && (
              <p className="diary-place">เขียนไว้จาก {moment.place}</p>
            )}
          </AnimatedGroup>
          <button
            className={`diary-fold ${unfold ? 'unfolded' : ''}`}
            onClick={() => setUnfold((v) => !v)}
            aria-expanded={unfold}
          >
            {unfold ? 'พับบันทึกกลับ' : 'เปิดกระดาษโน้ตที่พับไว้'}
          </button>
          {unfold && (
            <p className="diary-private hand" role="status">
              {entry === story.moments.length - 1
                ? story.secret
                : moment.aside || story.closing}
            </p>
          )}
          <p className="diary-sign hand">{story.from}</p>
        </article>
      </div>
      <nav className="diary-traversal" aria-label="อ่านไดอารีต่อ">
        <button
          disabled={entry === 0}
          onClick={() => {
            setEntry((i) => i - 1);
            setUnfold(false);
          }}
        >
          บันทึกก่อนหน้า
        </button>
        <span>
          {entry + 1} / {story.moments.length}
        </span>
        <button
          disabled={entry === story.moments.length - 1}
          onClick={() => {
            setEntry((i) => i + 1);
            setUnfold(false);
          }}
        >
          บันทึกถัดไป
        </button>
      </nav>
      {entry === story.moments.length - 1 && (
        <section className="diary-afterword">
          <h2>เขียนไว้ให้เธออ่าน ในวันข้างหน้า</h2>
          <ReadLetter story={story} label="อ่านหน้าสุดท้ายของสมุด" />
          <p className="hand">{story.closing}</p>
        </section>
      )}
    </main>
  );
}
