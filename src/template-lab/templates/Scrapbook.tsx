import { useRef, useState } from 'react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { Icon, Photo, Words } from '../shared';
import { LetterCopy, MemoryView } from '../recipient';

export default function Scrapbook({ story }: { story: Story }) {
  const [page, setPage] = useState(0);
  const [peeled, setPeeled] = useState<number[]>([]);
  const [contents, setContents] = useState(false);
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
        <h1>{story.headline || 'Us, in pieces.'}</h1>
        <p className="hand">
          {story.intro || `สมุดของ ${story.from} กับ ${story.to}`}
        </p>
        {story.cover && (
          <img
            className="scrap-cover-photo"
            src={story.cover}
            alt={`ปกสมุดของ ${story.to}`}
          />
        )}
        <button
          className="scrap-contents-toggle"
          onClick={() => setContents((v) => !v)}
          aria-expanded={contents}
        >
          เปิดสารบัญความทรงจำ <Icon name="book" size={18} />
        </button>
      </header>
      {contents && (
        <nav className="scrap-contents" aria-label="สารบัญความทรงจำ">
          {story.moments.map((m, i) => (
            <button
              key={m.id}
              onClick={() => {
                setPage(i);
                setContents(false);
              }}
            >
              <span>{i + 1}</span>
              {m.title}
              <small>{m.date}</small>
            </button>
          ))}
        </nav>
      )}
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
              {peeled.includes(page) ? (
                <MemoryView moment={moment} />
              ) : (
                <Photo moment={moment} eager />
              )}
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
              {moment.aside || story.closing}
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
        <section className="scrap-last-spread">
          <div>
            <h2>{story.title}</h2>
            <LetterCopy story={story} />
          </div>
          <div className="scrap-pocket">
            <span className="hand">ซองเล็ก ๆ ที่ติดไว้ท้ายเล่ม</span>
            <p className="scrap-end" role="status">
              {story.secret}
            </p>
            <p>{story.closing}</p>
            <span className="hand">ทำให้ {story.to} ด้วยมือและด้วยใจ</span>
          </div>
        </section>
      )}
    </main>
  );
}
