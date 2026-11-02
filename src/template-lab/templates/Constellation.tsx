import { useState } from 'react';
import type { Story } from '../data';
import { Button, Icon, Modal, Photo } from '../shared';
import { ReadLetter, MemoryView } from '../recipient';
import { shortDate } from '../data';

const points = [
  [12, 72],
  [37, 22],
  [69, 56],
  [87, 13],
  [68, 86],
  [26, 48],
  [91, 73],
  [48, 8],
];

export default function Constellation({ story }: { story: Story }) {
  const [time, setTime] = useState(0);
  const [detail, setDetail] = useState<number | null>(null);
  const count = story.moments.length;
  const point = (i: number) => points[i % points.length];
  const route = story.moments.map((_, i) => point(i));
  const d = route
    .map(([x, y], i) =>
      i === 0
        ? `M${x * 6} ${y * 5}`
        : `Q${(route[i - 1][0] + x) * 3} ${(route[i - 1][1] + y) * 2.5 + (i % 2 ? 60 : -60)} ${x * 6} ${y * 5}`,
    )
    .join(' ');
  return (
    <main className="experience constellation">
      <header>
        <h1>
          {story.headline || (
            <>
              Nothing was
              <br />a straight line.
            </>
          )}
        </h1>
        <p>
          {story.intro ||
            `ทุกจุดที่ผ่านมาพา ${story.from} และ ${story.to} มาเจอกัน`}
        </p>
        {story.cover && (
          <img
            className="constellation-cover"
            src={story.cover}
            alt={`ภาพปกเส้นทางของ ${story.to}`}
          />
        )}
      </header>
      <div className="constellation-stage">
        <div className="constellation-map">
          <svg
            viewBox="0 0 600 500"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={d}
              stroke="#72939a"
              fill="none"
              strokeWidth="1"
              strokeDasharray="3 9"
            />
            <path
              className="constellation-route"
              d={d}
              stroke="#f3d4a0"
              fill="none"
              strokeWidth="2"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset={
                100 - (count <= 1 ? 1 : time / (count - 1)) * 100
              }
            />
          </svg>
          {story.moments.map((m, i) => (
            <button
              key={m.id}
              className={`const-node ${time >= i ? 'lit' : ''} ${time === i ? 'current' : ''}`}
              style={{ left: `${point(i)[0]}%`, top: `${point(i)[1]}%` }}
              aria-label={`ดูจุดเวลา ${i + 1}: ${m.title}`}
              onClick={() => {
                setTime(i);
                setDetail(i);
              }}
            >
              <span className="node-dot" />
              <span className="node-year">{m.date.slice(0, 4)}</span>
            </button>
          ))}
        </div>
        <section className="constellation-note" aria-live="polite">
          <span className="constellation-count">
            {String(time + 1).padStart(2, '0')}
            <small>/ {String(count).padStart(2, '0')}</small>
          </span>
          <h2>{story.moments[time].title}</h2>
          <div className="constellation-photo">
            <MemoryView moment={story.moments[time]} />
          </div>
          <p>{story.moments[time].note}</p>
          <small>
            {[shortDate(story.moments[time].date), story.moments[time].place]
              .filter(Boolean)
              .join(' · ')}
          </small>
          {story.moments[time].aside && (
            <p className="hand">{story.moments[time].aside}</p>
          )}
          <button className="const-detail" onClick={() => setDetail(time)}>
            เปิดความทรงจำนี้ <Icon name="expand" size={18} />
          </button>
        </section>
      </div>
      <div className="constellation-controls">
        <label htmlFor="memory-time">ลากเพื่อเดินทางผ่านเวลา</label>
        <input
          id="memory-time"
          type="range"
          min="0"
          max={Math.max(0, count - 1)}
          step="1"
          value={time}
          aria-valuetext={`${story.moments[time].date} ${story.moments[time].title}`}
          onChange={(e) => setTime(Number(e.target.value))}
        />
        <div>
          <span>{story.moments[0].date.slice(0, 4)}</span>
          <span>{story.moments[count - 1].date.slice(0, 4)}</span>
        </div>
        <Button
          variant="quiet"
          disabled={time === 0}
          onClick={() => setTime((t) => Math.max(0, t - 1))}
        >
          ช่วงเวลาก่อนหน้า
        </Button>
        <Button
          onClick={() => setTime((t) => Math.min(count - 1, t + 1))}
          disabled={time === count - 1}
        >
          ไปยังช่วงเวลาถัดไป <Icon name="arrow" size={18} />
        </Button>
      </div>
      {time === count - 1 && (
        <section className="constellation-dedication">
          <h2>{story.title}</h2>
          <p className="constellation-ending" role="status">
            ทุกเส้นทาง ต่อกันเป็นเรา
            <br />
            <strong>{story.secret}</strong>
          </p>
          <ReadLetter story={story} label="อ่านข้อความที่จุดหมายของเรา" />
          <p className="hand">{story.closing}</p>
          <Button variant="quiet" onClick={() => setTime(0)}>
            ย้อนกลับไปวันแรก
          </Button>
        </section>
      )}
      {detail !== null && (
        <Modal
          title={story.moments[detail].title}
          onClose={() => setDetail(null)}
        >
          <Photo moment={story.moments[detail]} eager />
          <p>{story.moments[detail].note}</p>
        </Modal>
      )}
    </main>
  );
}
