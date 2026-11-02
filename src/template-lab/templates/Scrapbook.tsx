import { useRef, useState } from 'react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { Icon, Photo, Words } from '../shared';

export default function Scrapbook({ story }: { story: Story }) {
  const [page, setPage] = useState(0);
  const [peeled, setPeeled] = useState<number[]>([]);
  const pointer = useRef<number | null>(null);
  const moment = story.moments[page];
  function turn(direction: number) {
    setPage((p) =>
      Math.max(0, Math.min(story.moments.length - 1, p + direction)),
    );
  }
  return (
    <main className="experience scrapbook">
      <header>
        <h1>Us, in pieces.</h1>
        <p className="hand">ไม่ต้องเรียบร้อย แค่เป็นเรื่องของเรา</p>
      </header>
      <div
        className="scrapbook-book"
        onPointerDown={(e) => {
          pointer.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (
            pointer.current !== null &&
            Math.abs(e.clientX - pointer.current) > 70
          )
            turn(e.clientX < pointer.current ? 1 : -1);
          pointer.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        <div className="book-binding" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <article className={`scrapbook-page scrap-page-${page % 2}`} key={page}>
          <div className="scrap-left">
            <span className="scrap-date">{shortDate(moment.date)}</span>
            <div className="scrap-image">
              <Photo moment={moment} eager />
              <div
                className={`scrap-mask ${peeled.includes(page) ? 'peeled' : ''}`}
              >
                <span className="hand">มีอะไรซ่อนอยู่?</span>
              </div>
            </div>
            <button
              className="scrap-tape"
              aria-pressed={peeled.includes(page)}
              onClick={() =>
                setPeeled((p) => (p.includes(page) ? p : [...p, page]))
              }
            >
              {peeled.includes(page)
                ? 'รูปนี้เก็บไว้แล้ว'
                : 'ลอกเทป เปิดรูปนี้'}
            </button>
          </div>
          <div className="scrap-right">
            <span className="scrap-circle" aria-hidden="true">
              <Icon size={32} />
            </span>
            <h2>
              <Words text={moment.title} />
            </h2>
            <p>{moment.note}</p>
            <span className="hand scrap-sign">
              อยู่กับเธอตรงนี้
              <br />
              ก็ดีที่สุดแล้ว
            </span>
            <span className="scrap-page-number">{page + 1}</span>
          </div>
        </article>
      </div>
      <nav className="scrap-nav" aria-label="พลิกหน้าสมุด">
        <button disabled={page === 0} onClick={() => turn(-1)}>
          <Icon name="back" /> หน้าก่อน
        </button>
        <span>
          หน้า {page + 1} จาก {story.moments.length}
        </span>
        <button
          disabled={page === story.moments.length - 1}
          onClick={() => turn(1)}
        >
          หน้าถัดไป <Icon name="arrow" />
        </button>
      </nav>
      {page === story.moments.length - 1 && (
        <p className="scrap-end" role="status">
          {story.secret}
        </p>
      )}
    </main>
  );
}
