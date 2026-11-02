import { useRef, useState, type PointerEvent } from 'react';
import type { Story } from '../data';
import { Button, Icon, Photo, useStill } from '../shared';
import { MemoryView, ReadLetter, coverMoment } from '../recipient';

export default function Surprise({ story }: { story: Story }) {
  const [stage, setStage] = useState(0);
  const [pull, setPull] = useState(0);
  const [clue, setClue] = useState(0);
  const [memory, setMemory] = useState(0);
  const start = useRef<number | null>(null);
  const still = useStill();
  function release(event: PointerEvent<HTMLButtonElement>) {
    // Pointer events can be batched before React paints the last drag frame.
    // The release position is authoritative; pull only drives the visual.
    const distance = start.current === null ? 0 : event.clientY - start.current;
    if (distance > 65) {
      setStage(1);
      setPull(0);
    } else setPull(0);
    start.current = null;
  }
  return (
    <main className={`experience surprise surprise-stage-${stage}`}>
      {stage < 2 ? (
        <>
          <header>
            <span>A little something for {story.to}</span>
            <h1>
              {stage === 0 ? (
                <>
                  {story.headline || (
                    <>
                      One more
                      <br />
                      little thing.
                    </>
                  )}
                </>
              ) : (
                <>
                  Ready
                  <br />
                  for this?
                </>
              )}
            </h1>
            <p>
              {stage === 0
                ? story.intro || 'มีเรื่องหนึ่งที่อยากบอกเธอมานานแล้ว'
                : 'บางคำ อยากให้เธอได้อ่านด้วยตัวเอง'}
            </p>
          </header>
          <div className="surprise-package">
            <div className="gift-label">
              <div className="surprise-cover">
                <Photo moment={coverMoment(story)} eager />
              </div>
              <span>To {story.to}</span>
              <Icon size={38} />
              <span>with love, {story.from}</span>
            </div>
            <div className="gift-ribbon-horizontal" aria-hidden="true" />
            {stage === 0 && (
              <button
                className="ribbon-pull"
                aria-label="ลากริบบิ้นลงเพื่อคลายปม"
                onPointerDown={(e) => {
                  if (!e.isPrimary || start.current !== null) return;
                  start.current = e.clientY;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (start.current !== null)
                    setPull(
                      Math.min(125, Math.max(0, e.clientY - start.current)),
                    );
                }}
                onPointerUp={release}
                onPointerCancel={() => {
                  start.current = null;
                  setPull(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setStage(1);
                  }
                }}
                onClick={(e) => {
                  if (e.detail === 0) setStage(1);
                }}
                style={{ transform: `translateY(${still ? 0 : pull}px)` }}
              >
                <span className="ribbon-loop ribbon-loop-left" />
                <span className="ribbon-loop ribbon-loop-right" />
                <span className="ribbon-tail" />
                <span className="ribbon-instruction">ดึงริบบิ้นลง</span>
              </button>
            )}
          </div>
          {stage === 1 && (
            <section className="surprise-clues">
              <span className="hand">ก่อนเปิด ลองนึกถึงวันเหล่านี้</span>
              <div>
                <MemoryView moment={story.moments[clue]} />
                <p>{story.moments[clue].aside || story.moments[clue].note}</p>
              </div>
              <nav aria-label="คำใบ้ในของขวัญ">
                {story.moments.map((m, i) => (
                  <button
                    key={m.id}
                    aria-pressed={clue === i}
                    onClick={() => setClue(i)}
                    aria-label={`ดูคำใบ้ ${i + 1}: ${m.title}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            </section>
          )}
          <div className="surprise-action">
            <Button onClick={() => setStage((s) => s + 1)}>
              {stage === 0 ? 'แตะเพื่อคลายริบบิ้น' : 'เปิดของขวัญชิ้นนี้'}{' '}
              <Icon name="arrow" size={18} />
            </Button>
            <span>
              {stage === 0
                ? 'หรือใช้นิ้วลากริบบิ้นก็ได้นะ'
                : 'ไม่ต้องรีบ เรารออยู่ตรงนี้'}
            </span>
          </div>
        </>
      ) : (
        <section className="surprise-reveal">
          <div className="curtain curtain-left" aria-hidden="true" />
          <div className="curtain curtain-right" aria-hidden="true" />
          {!still && (
            <div className="surprise-confetti" aria-hidden="true">
              {Array.from({ length: 26 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${(i * 37) % 100}%`,
                    animationDelay: `${(i % 6) * 0.07}s`,
                    background: ['#ebc891', '#fff1df', '#bf7d8b'][i % 3],
                    transform: `rotate(${i * 23}deg)`,
                  }}
                />
              ))}
            </div>
          )}
          <span>Surprise, {story.to}.</span>
          <h1>{story.title}</h1>
          <div className="surprise-photo">
            <MemoryView moment={story.moments[memory]} />
          </div>
          <nav className="surprise-photo-tabs" aria-label="รูปในของขวัญ">
            {story.moments.map((m, i) => (
              <button
                key={m.id}
                aria-pressed={memory === i}
                onClick={() => setMemory(i)}
              >
                <img src={m.image} alt="" loading="lazy" />
                <span>{m.title}</span>
              </button>
            ))}
          </nav>
          <h2>{story.moments[memory].title}</h2>
          <p>{story.moments[memory].note}</p>
          <p className="surprise-message" role="status">
            {story.secret}
          </p>
          <p>{story.closing}</p>
          <ReadLetter
            story={story}
            label="จดหมายที่ใส่ไว้ในของขวัญ"
            className="surprise-letter"
          />
          <p className="hand">รัก, {story.from}</p>
          <Button
            variant="quiet"
            onClick={() => {
              setStage(0);
              setMemory(0);
              setClue(0);
            }}
          >
            ผูกริบบิ้น เล่นอีกครั้ง
          </Button>
        </section>
      )}
    </main>
  );
}
