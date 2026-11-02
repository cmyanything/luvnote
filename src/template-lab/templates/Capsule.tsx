import { useState } from 'react';
import type { Story } from '../data';
import { AnimatedGroup, Button, Icon, Photo } from '../shared';
import { LetterCopy, MemoryView } from '../recipient';
import { shortDate } from '../data';

function Keepsake({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 100 90" fill="none" aria-hidden="true">
      {index % 4 === 0 ? (
        <>
          <path
            d="M12 21h76v18q-12 6 0 13v18H12V52q12-6 0-13Z"
            fill="#ead9a9"
          />
          <path
            d="M68 22v48M25 36h28m-28 8h18"
            stroke="#8d5535"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text x="24" y="61" fill="#70432b" fontSize="10">
            FOR TWO
          </text>
        </>
      ) : index % 4 === 1 ? (
        <>
          <circle cx="33" cy="28" r="17" stroke="#e9c276" strokeWidth="7" />
          <path d="m45 42 29 28h15V58H76V47" stroke="#e9c276" strokeWidth="8" />
        </>
      ) : index % 4 === 2 ? (
        <>
          <path d="m21 7 64 9-11 71-64-9Z" fill="#f6ecdb" />
          <path d="m28 17 47 7-7 44-47-6Z" fill="#8da49a" />
          <path d="m22 58 16-17 12 13 14-19 7 30Z" fill="#435c56" />
        </>
      ) : (
        <>
          <path d="m15 12 68 5-4 66-68-5Z" fill="#e9d2ae" />
          <path
            d="m24 34 45 4m-46 7 41 3m-42 7 34 3"
            stroke="#996a4d"
            strokeWidth="1.5"
          />
          <path
            d="M48 26s-10-7-7-11q4-5 7 1 4-5 8-1 3 5-8 11Z"
            fill="#ac554e"
          />
        </>
      )}
    </svg>
  );
}

export default function Capsule({ story }: { story: Story }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [found, setFound] = useState<number[]>([]);
  const [final, setFinal] = useState(false);
  function pick(i: number) {
    setSelected(i);
    setFound((f) => (f.includes(i) ? f : [...f, i]));
  }
  return (
    <main className={`experience capsule ${open ? 'capsule-open' : ''}`}>
      <header>
        <span>ฝากไว้ตั้งแต่ {story.date}</span>
        <h1>
          {story.headline || (
            <>
              For the days
              <br />
              we’ll remember.
            </>
          )}
        </h1>
        <p>{story.intro || 'ไม่ได้เก็บของ เก็บความรู้สึกไว้ต่างหาก'}</p>
      </header>
      <div className="capsule-box" data-many={story.moments.length > 4}>
        <div className="capsule-inside">
          {open && (
            <AnimatedGroup className="keepsakes">
              {story.moments.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => pick(i)}
                  aria-label={`หยิบของชิ้นที่ ${i + 1}: ${m.title}`}
                  aria-pressed={found.includes(i)}
                >
                  <Keepsake
                    index={['ticket', 'key', 'photo', 'letter'].indexOf(
                      m.keepsakeType || 'photo',
                    )}
                  />
                  <span>{m.keepsake || m.title}</span>
                  {found.includes(i) && <Icon name="check" size={16} />}
                </button>
              ))}
            </AnimatedGroup>
          )}
        </div>
        <button
          className="capsule-lid"
          disabled={open}
          onClick={() => setOpen(true)}
          aria-label="เปิดกล่องความทรงจำ"
        >
          {story.cover && (
            <img className="capsule-cover" src={story.cover} alt="" />
          )}
          <span className="box-stamp">
            Our time
            <br />
            capsule
          </span>
          <span className="box-for">to {story.to}</span>
          <span className="box-open-hint">แตะเพื่อเปิดกล่อง</span>
        </button>
      </div>
      {open && (
        <div className="capsule-readout" aria-live="polite">
          {selected === null ? (
            <p>หยิบอะไรขึ้นมาดูก่อนดี?</p>
          ) : (
            <>
              <MemoryView moment={story.moments[selected]} />
              <div>
                <h2>{story.moments[selected].title}</h2>
                <p>{story.moments[selected].note}</p>
                <small>
                  {[
                    shortDate(story.moments[selected].date),
                    story.moments[selected].place,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
                {story.moments[selected].aside && (
                  <p className="hand">{story.moments[selected].aside}</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {open && (
        <div className="capsule-bottom">
          <span>
            ค้นพบ {found.length} / {story.moments.length}
          </span>
          {found.length < story.moments.length && (
            <Button
              variant="quiet"
              onClick={() =>
                pick(story.moments.findIndex((_, i) => !found.includes(i)))
              }
            >
              หยิบชิ้นที่ยังไม่ได้ดู
            </Button>
          )}
          <Button
            onClick={() => setFinal(true)}
            disabled={found.length < story.moments.length || final}
          >
            เปิดช่องลับใต้กล่อง
          </Button>
        </div>
      )}
      {final && (
        <div className="capsule-hidden" role="status">
          <Icon />
          <p>{story.secret}</p>
          <h2>{story.title}</h2>
          <LetterCopy story={story} />
          <p className="capsule-promise">{story.closing}</p>
          <span>
            ฝากไว้จาก {story.from} ถึง {story.to}
          </span>
          <Button
            variant="quiet"
            onClick={() => {
              setFinal(false);
              document
                .querySelector('.capsule-box')
                ?.scrollIntoView({ block: 'start' });
            }}
          >
            กลับไปดูของในกล่อง
          </Button>
        </div>
      )}
    </main>
  );
}
