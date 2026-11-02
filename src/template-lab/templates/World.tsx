import { useEffect, useRef, useState } from 'react';
import type { Story } from '../data';
import { Icon, Photo, useScrollParallax, useStill } from '../shared';
import { ReadLetter, MemoryView, coverMoment } from '../recipient';

const stops = [
  [23, 43],
  [64, 27],
  [78, 67],
  [33, 76],
  [40, 20],
  [83, 40],
  [52, 75],
  [18, 68],
];
function MapDrawing() {
  return (
    <svg
      className="world-drawing"
      viewBox="0 0 800 520"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M98 227Q20 144 124 104T368 66 657 98Q791 141 729 305T438 444 175 400Q58 351 98 227Z"
        fill="#e6dab0"
      />
      <path
        d="M476 73Q422 159 492 219T443 421"
        stroke="#84b3bb"
        strokeWidth="35"
      />
      <path
        d="M150 225Q310 330 513 144T634 338 250 389"
        stroke="#fbf0d4"
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray="1 28"
      />
      <g fill="#739d7b">
        <circle cx="135" cy="162" r="20" />
        <circle cx="168" cy="148" r="27" />
        <circle cx="666" cy="287" r="29" />
        <circle cx="676" cy="249" r="19" />
        <circle cx="291" cy="369" r="23" />
      </g>
      <g fill="#cc8268" stroke="#8c604e" strokeWidth="2">
        <path d="m145 213 40-35 41 35v53h-81Z" />
        <path d="m505 124 34-25 35 25v48h-69Z" />
        <path d="m594 343 37-30 37 30v49h-74Z" />
      </g>
      <g fill="#f8e3b4">
        <path d="M171 238h21v28h-21ZM528 143h16v29h-16ZM624 365h17v27h-17Z" />
      </g>
      <path
        d="m165 208 20-17 21 17M519 126l20-15 21 15"
        stroke="#f7d4ae"
        strokeWidth="3"
      />
      <path d="M466 259h49" stroke="#a37752" strokeWidth="18" />
      <g className="world-cloud" fill="#f8f6e9">
        <ellipse cx="135" cy="65" rx="48" ry="14" />
        <circle cx="134" cy="55" r="21" />
        <ellipse cx="647" cy="43" rx="51" ry="14" />
        <circle cx="632" cy="31" r="20" />
      </g>
    </svg>
  );
}

export default function World({ story }: { story: Story }) {
  const [active, setActive] = useState(0);
  const [visited, setVisited] = useState<number[]>([]);
  const root = useRef<HTMLElement>(null);
  const still = useStill();
  useScrollParallax(root, '.world-cloud', !still);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.stop));
        }),
      { threshold: 0.55 },
    );
    root.current
      ?.querySelectorAll('[data-stop]')
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  function explore(i: number) {
    setActive(i);
    document.getElementById(`place-${story.moments[i].id}`)?.scrollIntoView({
      behavior: still ? 'instant' : 'smooth',
      block: 'start',
    });
  }
  return (
    <main ref={root} className="experience world">
      <header>
        <h1>{story.headline || 'Our little world.'}</h1>
        <p>
          {story.intro || `แผนที่ความทรงจำของ ${story.from} และ ${story.to}`}
        </p>
        {story.cover && (
          <div className="world-passport">
            <MemoryView moment={coverMoment(story)} />
            <span>
              {story.title}
              <small>เริ่มเดินทางด้วยกัน {story.date}</small>
            </span>
          </div>
        )}
      </header>
      <div className="world-map" data-many={story.moments.length > 4}>
        <MapDrawing />
        {story.moments.map((m, i) => (
          <button
            className={`world-pin ${active === i ? 'active' : ''} ${visited.includes(i) ? 'stamped' : ''}`}
            key={m.id}
            style={{ left: `${stops[i][0]}%`, top: `${stops[i][1]}%` }}
            onClick={() => explore(i)}
            aria-label={`ไปที่ ${m.title}`}
          >
            <span>{i + 1}</span>
            <small>{m.place || m.title}</small>
          </button>
        ))}
        <span className="world-compass" aria-hidden="true">
          N<br />↑
        </span>
      </div>
      <div className="world-places">
        {story.moments.map((m, i) => (
          <section
            data-stop={i}
            id={`place-${m.id}`}
            className={`world-place place-${i % 4}`}
            key={m.id}
          >
            <MemoryView moment={m} />
            <div>
              <span className="hand">{m.place || 'สักที่ ที่มีเรา'}</span>
              <h2>{m.title}</h2>
              <p>{m.note}</p>
              <time>{m.date}</time>
              {m.aside && <p className="hand world-postscript">{m.aside}</p>}
              <button
                className="world-stamp"
                aria-pressed={visited.includes(i)}
                onClick={() =>
                  setVisited((v) => (v.includes(i) ? v : [...v, i]))
                }
              >
                <Icon name={visited.includes(i) ? 'check' : 'heart'} />
                {visited.includes(i)
                  ? 'ประทับในความทรงจำแล้ว'
                  : 'เก็บสถานที่นี้ไว้'}
              </button>
            </div>
          </section>
        ))}
      </div>
      <section className="world-home">
        <Icon size={38} />
        <h2>{story.title}</h2>
        <p>{story.closing}</p>
        <ReadLetter
          story={story}
          label="เปิดจดหมายที่รออยู่ที่บ้าน"
          className="world-mailbox"
        />
        {visited.length === story.moments.length && (
          <p role="status">{story.secret}</p>
        )}
        <span>
          เก็บความทรงจำแล้ว {visited.length} / {story.moments.length} แห่ง
        </span>
        <button
          className="world-return"
          onClick={() =>
            document
              .querySelector('.world-map')
              ?.scrollIntoView({ block: 'start' })
          }
        >
          กลับไปเดินเล่นบนแผนที่
        </button>
      </section>
    </main>
  );
}
