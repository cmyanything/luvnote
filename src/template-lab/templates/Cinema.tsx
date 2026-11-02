import { useRef, useState } from 'react';
import type { Story } from '../data';
import { Button, Photo, useScrollParallax, useStill, Words } from '../shared';

export default function Cinema({ story }: { story: Story }) {
  const root = useRef<HTMLElement>(null);
  const still = useStill();
  const [final, setFinal] = useState(false);
  useScrollParallax(root, '.cinema-image', !still);
  return (
    <main ref={root} className="experience cinema">
      <nav className="cinema-nav" aria-label="เลือกฉาก">
        {story.moments.map((m, i) => (
          <a
            href={`#scene-${m.id}`}
            key={m.id}
            aria-label={`ฉาก ${i + 1}: ${m.title}`}
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
        >
          <div className="cinema-image">
            <Photo moment={m} eager={i === 0} />
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
                  Our
                  <br />
                  cinematic
                  <br />
                  <em>journey.</em>
                </h1>
                <p>เลื่อนช้า ๆ หนังเรื่องนี้มีแค่เรา</p>
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
