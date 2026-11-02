import { useState } from 'react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { AnimatedGroup, Photo, Words } from '../shared';

export default function Diary({ story }: { story: Story }) {
  const [entry, setEntry] = useState(0);
  const [unfold, setUnfold] = useState(false);
  const moment = story.moments[entry];
  return (
    <main className="experience diary">
      <header>
        <h1>
          A diary
          <br />
          of us.
        </h1>
        <p>วันธรรมดา ในหน้ากระดาษของ {story.from}</p>
      </header>
      <div className="diary-body">
        <nav aria-label="เลือกวันที่ในไดอารี" className="diary-index">
          {story.moments.map((m, i) => (
            <button
              key={m.id}
              aria-current={entry === i ? 'date' : undefined}
              onClick={() => {
                setEntry(i);
                setUnfold(false);
              }}
            >
              <span>{m.date.slice(0, 4)}</span>
              <strong>
                {shortDate(m.date).split(' ').slice(0, 2).join(' ')}
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
            <span>{shortDate(moment.date)}</span>
            <span>Dear diary,</span>
          </div>
          <h2>
            <Words text={moment.title} />
          </h2>
          <div className="diary-photo">
            <Photo moment={moment} eager />
            <span className="hand">{moment.place || 'วันนี้ของเรา'}</span>
          </div>
          <AnimatedGroup>
            <p className="diary-note">{moment.note}</p>
            <p>
              ถ้าไม่ได้เขียนไว้ ก็คงกลัวว่าจะลืมรายละเอียดเล็ก ๆ<br />
              แต่พอคิดดูอีกที วันที่มีเธออยู่ด้วย มันไม่เคยจางเลย
            </p>
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
                : story.closing}
            </p>
          )}
          <p className="diary-sign hand">{story.from}</p>
        </article>
      </div>
    </main>
  );
}
