import { useState, type CSSProperties } from 'react';
import type { Story } from '../data';
import { Button, Flower, Photo } from '../shared';

export default function Garden({ story }: { story: Story }) {
  const [bloomed, setBloomed] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [bouquet, setBouquet] = useState(false);
  const positions =
    story.moments.length > 4
      ? [
          [16, 15],
          [49, 10],
          [82, 16],
          [20, 48],
          [52, 43],
          [84, 50],
          [31, 79],
          [69, 79],
        ]
      : [
          [12, 36],
          [57, 13],
          [40, 56],
          [76, 55],
        ];
  function bloom(i: number) {
    setSelected(i);
    setBloomed((b) => (b.includes(i) ? b : [...b, i]));
  }
  return (
    <main className={`experience garden ${bouquet ? 'garden-finished' : ''}`}>
      <header>
        <h1>
          Love grows
          <br />
          in little things.
        </h1>
        <p>สวนเล็ก ๆ ที่ปลูกไว้ให้ {story.to}</p>
      </header>
      {!bouquet ? (
        <>
          <div className="garden-bed" data-many={story.moments.length > 4}>
            <div className="garden-soil" aria-hidden="true" />
            {story.moments.map((m, i) => (
              <button
                className={`garden-flower ${bloomed.includes(i) ? 'picked' : ''}`}
                key={m.id}
                aria-label={`ให้ดอกไม้บาน: ${m.title}`}
                aria-pressed={bloomed.includes(i)}
                style={
                  {
                    '--x': `${positions[i][0]}%`,
                    '--y': `${positions[i][1]}%`,
                  } as CSSProperties
                }
                onClick={() => bloom(i)}
              >
                <Flower bloom={bloomed.includes(i)} variant={i} />
                <span>{m.title}</span>
              </button>
            ))}
            <span className="garden-whisper hand">แตะ แล้วปล่อยให้บาน</span>
          </div>
          <div className="garden-note" aria-live="polite">
            {selected === null ? (
              <p>ทุกดอกมีเหตุผลที่เรารักเธอซ่อนอยู่</p>
            ) : (
              <>
                <Photo moment={story.moments[selected]} />
                <div>
                  <h2>{story.moments[selected].title}</h2>
                  <p>{story.moments[selected].note}</p>
                </div>
              </>
            )}
          </div>
          <div className="garden-tools">
            <span>
              ผลิบานแล้ว {bloomed.length} / {story.moments.length}
            </span>
            <Button
              disabled={bloomed.length < story.moments.length}
              onClick={() => setBouquet(true)}
            >
              ผูกเป็นช่อให้เธอ
            </Button>
          </div>
        </>
      ) : (
        <section className="garden-bouquet">
          <div className="bouquet-flowers" aria-hidden="true">
            {story.moments.slice(0, 8).map((m, i) => (
              <div
                key={m.id}
                style={{
                  transform: `rotate(${(i - (Math.min(story.moments.length, 8) - 1) / 2) * 18}deg)`,
                }}
              >
                <Flower bloom variant={i} />
              </div>
            ))}
            <div className="bouquet-wrap" />
          </div>
          <h2>ให้เธอ ทั้งสวนของฉัน</h2>
          <p role="status">{story.secret}</p>
          <p className="hand">จาก {story.from}</p>
        </section>
      )}
    </main>
  );
}
