import { useEffect, useRef, useState } from 'react';
import type { Story } from '../data';
import { Button, Photo, useScrollParallax, useStill, Words } from '../shared';
import { ReadLetter, MemoryView } from '../recipient';

export default function Cinema({ story }: { story: Story }) {
  const root = useRef<HTMLElement>(null);
  const still = useStill();
  const [final, setFinal] = useState(false);
  const [current, setCurrent] = useState(0);
  useScrollParallax(root, '.cinema-image', !still);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setCurrent(Number((entry.target as HTMLElement).dataset.scene));
      },
      { threshold: 0.55 },
    );
    root.current
      ?.querySelectorAll('[data-scene]')
      .forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, []);
  return (
    <main ref={root} className="experience cinema">
      <nav className="cinema-nav" aria-label="เลือกฉาก">
        {story.moments.map((m, i) => (
          <a
            href={`#scene-${m.id}`}
            key={m.id}
            aria-label={`ฉาก ${i + 1}: ${m.title}`}
            aria-current={current === i ? 'location' : undefined}
          >
            {String(i + 1).padStart(2, '0')}
          </a>
        ))}
      </nav>
      {story.moments.map((m, i) => (
        <section
          className={`cinema-scene cinema-scene-${i}`}
          id={`scene-${m.id}`}
          key={m.id}
          data-scene={i}
        >
          <div className="cinema-image">
            <Photo
              moment={i === 0 && story.cover ? { ...m, image: story.cover } : m}
              eager={i === 0}
            />
          </div>
          <div className="cinema-shade" />
          <div className="cinema-frame" aria-hidden="true" />
          {i === 0 && (
            <div className="cinema-credit">
              A film by {story.from} & {story.to}
            </div>
          )}
          <div className="cinema-caption">
            {i === 0 ? (
              <>
                <h1>
                  {story.headline || (
                    <>
                      Our
                      <br />
                      cinematic
                      <br />
                      <em>journey.</em>
                    </>
                  )}
                </h1>
                <p>{story.intro || 'เลื่อนช้า ๆ หนังเรื่องนี้มีแค่เรา'}</p>
                <div className="cinema-first-memory">
                  <span>{m.date}</span>
                  <h2>{m.title}</h2>
                  <p>{m.note}</p>
                </div>
              </>
            ) : (
              <>
                <span className="cinema-date">{m.date}</span>
                <h2>
                  <Words text={m.title} />
                </h2>
                <p>{m.note}</p>
              </>
            )}
          </div>
          <span className="cinema-time">
            {String(i + 1).padStart(2, '0')} /{' '}
            {String(story.moments.length).padStart(2, '0')}
          </span>
        </section>
      ))}
      <section className="cinema-afterword">
        <div className="cinema-film-strip" aria-label="ย้อนดูแต่ละฉาก">
          {story.moments.map((m, i) => (
            <div key={m.id}>
              <MemoryView moment={m} />
              <a
                href={`#scene-${m.id}`}
                aria-label={`ย้อนดูฉาก ${i + 1}: ${m.title}`}
              >
                {m.title}
              </a>
            </div>
          ))}
        </div>
        <div className="cinema-credits">
          <h2>{story.title}</h2>
          <dl>
            <dt>คนที่ทำให้เรื่องนี้มีความหมาย</dt>
            <dd>{story.to}</dd>
            <dt>เล่าโดย</dt>
            <dd>{story.from}</dd>
            <dt>เริ่มฉายครั้งแรก</dt>
            <dd>{story.date}</dd>
          </dl>
          <ReadLetter story={story} label="อ่านบันทึกหลังเลนส์" />
        </div>
      </section>
      <section className="cinema-finale">
        <p>To be continued, with you.</p>
        <h2>{story.closing}</h2>
        <Button onClick={() => setFinal(true)} disabled={final}>
          {final ? 'เรื่องของเรา ยังมีตอนต่อไป' : 'เปิดฉากต่อไปของเรา'}
        </Button>
        {final && <p role="status">{story.secret}</p>}
      </section>
    </main>
  );
}
