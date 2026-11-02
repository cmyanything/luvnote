import { useState } from 'react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { AnimatedGroup, Button, Icon, Words } from '../shared';
import { MemoryView, coverMoment } from '../recipient';

export default function Letter({ story }: { story: Story }) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState(false);
  const [memory, setMemory] = useState(0);
  return (
    <main className={`experience letter ${open ? 'letter-open' : ''}`}>
      <header className="letter-post">
        <span>From {story.from}</span>
        <span>{shortDate(story.date)}</span>
      </header>
      <h1>
        {story.headline || (
          <>
            Words I’ve
            <br />
            kept for you.
          </>
        )}
      </h1>
      {!open && (
        <p className="letter-intro">
          {story.intro || 'บางคำ พูดไม่เก่งเท่าเขียนให้เธออ่าน'}
        </p>
      )}
      <div className="letter-desk">
        {!open && (
          <div className="letter-postcard">
            <MemoryView moment={coverMoment(story)} />
            <span className="hand">ถึงคนในรูปนี้</span>
          </div>
        )}
        <div className="envelope" aria-hidden="true">
          <div className="envelope-flap" />
          <div className="envelope-pocket" />
          <span className="envelope-name">
            ถึง {story.to}
            <small>with all my heart</small>
          </span>
        </div>
        {!open ? (
          <button
            className="wax-seal"
            aria-label="เปิดซองจดหมาย"
            onClick={() => setOpen(true)}
          >
            <Icon size={30} />
            <span>แตะเปิดซอง</span>
          </button>
        ) : (
          <article className="letter-paper" aria-label="จดหมายที่เปิดแล้ว">
            <h2 className="letter-subject">{story.title}</h2>
            <AnimatedGroup>
              <p className="hand letter-salutation">ถึง {story.to},</p>
              <div className="letter-copy" data-letter-content>
                {story.letter}
              </div>
              <p className="hand letter-sign">
                รักเสมอ,
                <br />
                {story.from}
              </p>
            </AnimatedGroup>
            <section className="letter-inserts" aria-label="ภาพที่สอดมาในซอง">
              <h3>แนบมาพร้อมความคิดถึง</h3>
              <nav aria-label="เลือกรูปที่แนบมา">
                {story.moments.map((m, i) => (
                  <button
                    key={m.id}
                    aria-pressed={memory === i}
                    onClick={() => setMemory(i)}
                  >
                    {i + 1}
                    <span>{m.title}</span>
                  </button>
                ))}
              </nav>
              <div className="letter-insert-content">
                <MemoryView moment={story.moments[memory]} />
                <div>
                  <h4>{story.moments[memory].title}</h4>
                  <p>{story.moments[memory].note}</p>
                  <small>
                    {[
                      shortDate(story.moments[memory].date),
                      story.moments[memory].place,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                  {story.moments[memory].aside && (
                    <p className="hand">{story.moments[memory].aside}</p>
                  )}
                </div>
              </div>
            </section>
            {!secret ? (
              <Button variant="quiet" onClick={() => setSecret(true)}>
                ยังมีอีกบรรทัดหนึ่ง <Icon name="arrow" size={18} />
              </Button>
            ) : (
              <p className="letter-ps" role="status">
                <span>ป.ล.</span> <Words text={story.secret} />
              </p>
            )}
            {secret && (
              <div className="letter-kept">
                <Icon size={19} />
                <p>{story.closing}</p>
                <button
                  onClick={() => {
                    setOpen(false);
                    setSecret(false);
                    setMemory(0);
                  }}
                >
                  พับจดหมายใส่ซอง
                </button>
              </div>
            )}
          </article>
        )}
      </div>
      <div className="letter-bottom">
        <span>For your eyes & your heart.</span>
        <Icon size={18} />
      </div>
    </main>
  );
}
