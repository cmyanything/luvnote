import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { Story } from '../data';
import { Button, Icon, Photo, useStill } from '../shared';

const Aurora = lazy(() => import('../Aurora'));
class ShaderFallback extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
const positions = [
  [18, 30],
  [70, 17],
  [82, 61],
  [36, 74],
  [50, 43],
  [15, 59],
  [88, 33],
  [58, 85],
];

export default function Stars({ story }: { story: Story }) {
  const [visited, setVisited] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [secret, setSecret] = useState(false);
  const [shader, setShader] = useState(false);
  const still = useStill();
  const count = story.moments.length;
  const point = (i: number) => positions[i % positions.length];
  function select(i: number) {
    setSelected(i);
    setVisited((v) => (v.includes(i) ? v : [...v, i]));
  }
  return (
    <main className="experience stars">
      {shader && !still && (
        <ShaderFallback>
          <Suspense fallback={null}>
            <Aurora />
          </Suspense>
        </ShaderFallback>
      )}
      <div className="star-dust" aria-hidden="true">
        {Array.from({ length: 38 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37 + 9) % 100}%`,
              top: `${(i * 53 + 11) % 100}%`,
              opacity: 0.2 + (i % 3) * 0.2,
            }}
          />
        ))}
      </div>
      <header>
        <span>
          {story.from} & {story.to}
        </span>
        <h1>
          Written
          <br />
          in the stars.
        </h1>
        <p>แตะดาวสักดวง มีความทรงจำรออยู่</p>
      </header>
      <div className="star-map" aria-label="ท้องฟ้าความทรงจำ">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points={visited.map((i) => point(i).join(',')).join(' ')}
            fill="none"
            stroke="#e5c58a"
            strokeWidth=".25"
          />
        </svg>
        {story.moments.map((m, i) => (
          <button
            key={m.id}
            className={`memory-star ${visited.includes(i) ? 'visited' : ''}`}
            style={{ left: `${point(i)[0]}%`, top: `${point(i)[1]}%` }}
            onClick={() => select(i)}
            aria-label={`เปิดดาว ${i + 1}: ${m.title}`}
            aria-pressed={selected === i}
          >
            <Icon name="star" size={24} />
            <span>{String(i + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      <div className="star-readout" aria-live="polite">
        {selected !== null ? (
          <>
            <Photo moment={story.moments[selected]} eager />
            <div>
              <h2>{story.moments[selected].title}</h2>
              <p>{story.moments[selected].note}</p>
            </div>
          </>
        ) : (
          <p>เรื่องราวเล็ก ๆ ในจักรวาลที่กว้างใหญ่</p>
        )}
      </div>
      <div className="star-actions">
        <p>
          {visited.length} / {count} ดวงที่ค้นพบ
        </p>
        <Button
          disabled={visited.length < count || secret}
          onClick={() => setSecret(true)}
        >
          {secret ? 'พบข้อความแล้ว' : 'อ่านข้อความในกลุ่มดาว'}
        </Button>
      </div>
      {secret && (
        <p className="star-secret" role="status">
          {story.secret}
        </p>
      )}
      {!still && (
        <button
          className="shader-toggle"
          onClick={() => setShader((v) => !v)}
          aria-pressed={shader}
        >
          {shader ? 'ปิดแสงเหนือ' : 'ทดลองแสงเหนือ · GPU'}
        </button>
      )}
    </main>
  );
}
