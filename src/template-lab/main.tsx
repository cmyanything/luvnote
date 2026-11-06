import {
  Component,
  lazy,
  StrictMode,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { alternate, demo, type Story } from './data';
import { polaroidDemo } from './polaroid-sample';
import { findTemplate, templates, type TemplateId } from './registry';
import { Button, Icon } from './shared';
import { labAsset, labHome } from './paths';
import { validateStory, draftKey } from './validation';
import { RecipientTools } from './recipient';
import Studio from './Studio';
import './lab.css';
import './templates.css';
import './complete.css';

const CreativeExperiments = lazy(() => import('./CreativeExperiments'));
const Flagship = lazy(() => import('./Flagship'));
const ImpossiblePostcard = lazy(() => import('./ImpossiblePostcard'));

const players = {
  'love-letter': lazy(() => import('./templates/Letter')),
  polaroid: lazy(() => import('./templates/Polaroid')),
  cinema: lazy(() => import('./templates/Cinema')),
  stars: lazy(() => import('./templates/Stars')),
  garden: lazy(() => import('./templates/Garden')),
  capsule: lazy(() => import('./templates/Capsule')),
  scrapbook: lazy(() => import('./templates/Scrapbook')),
  world: lazy(() => import('./templates/World')),
  choose: lazy(() => import('./templates/Choose')),
  diary: lazy(() => import('./templates/Diary')),
  constellation: lazy(() => import('./templates/Constellation')),
  surprise: lazy(() => import('./templates/Surprise')),
};

class ExperienceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="load-failure">
        <h1>เปิดตัวอย่างนี้ไม่ได้</h1>
        <p>ลองโหลดใหม่อีกครั้ง ไฟล์ตัวอย่างอาจยังโหลดไม่ครบ</p>
        <Button onClick={() => location.reload()}>โหลดใหม่</Button>
        <a href={labHome}>กลับไปหน้า Lab</a>
      </main>
    ) : (
      this.props.children
    );
  }
}

function Player({ id }: { id: TemplateId }) {
  const params = new URLSearchParams(location.search);
  const [replay, setReplay] = useState(0);
  const [story, setStory] = useState<Story | null>(() => {
    if (params.get('draft') === '1') {
      try {
        const saved = JSON.parse(localStorage.getItem(draftKey(id)) || 'null');
        return saved?.version === 1 &&
          saved.template === id &&
          validateStory(saved.story)
          ? saved.story
          : null;
      } catch {
        return null;
      }
    }
    return params.get('dataset') === 'alternate' ? alternate : id === 'polaroid' ? polaroidDemo : demo;
  });
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === window.parent &&
        event.data?.type === 'luvnote-lab-story' &&
        validateStory(event.data.story)
      )
        setStory(event.data.story);
    };
    window.addEventListener('message', listener);
    if (window.parent !== window)
      window.parent.postMessage({ type: 'luvnote-lab-ready' }, location.origin);
    return () => window.removeEventListener('message', listener);
  }, []);
  const Template = players[id];
  if (!story)
    return (
      <main className="load-failure">
        <h1>ไม่พบฉบับร่างในเครื่องนี้</h1>
        <p>
          ลิงก์ร่างใช้กับเบราว์เซอร์ที่บันทึกไว้เท่านั้น
          กลับไปโหลดหรือนำเข้าไฟล์ร่างเพื่อดูการ์ดของคุณ
        </p>
        <a href={labHome + '?template=' + id}>กลับไปปรับแต่งการ์ด</a>
      </main>
    );
  return (
    <ExperienceBoundary>
      <Suspense
        fallback={
          <p className="template-loading" role="status">
            กำลังเปิดเรื่องราว…
          </p>
        }
      >
        <RecipientTools
          key={replay}
          story={story}
          replay={() => {
            setReplay((n) => n + 1);
            window.scrollTo({ top: 0 });
          }}
        />
        <Template key={`${id}-${replay}`} story={story} />
      </Suspense>
    </ExperienceBoundary>
  );
}

type Device = 'mobile' | 'tablet' | 'desktop';
const devices = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};

function Frame({
  id,
  device,
  reset,
  dataset,
  still,
  custom,
}: {
  id: TemplateId;
  device: Device;
  reset: number;
  dataset: string;
  still: boolean;
  custom: Story | null;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [available, setAvailable] = useState(0);
  const dimensions = devices[device];
  const scale = available ? Math.min(1, available / dimensions.width) : 1;
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setAvailable(entries[0].contentRect.width),
    );
    if (holder.current) observer.observe(holder.current);
    return () => observer.disconnect();
  }, []);
  function send() {
    if (custom && dataset === 'custom')
      frame.current?.contentWindow?.postMessage(
        { type: 'luvnote-lab-story', story: custom },
        location.origin,
      );
  }
  useEffect(send, [custom, dataset]);
  useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'luvnote-lab-ready'
      )
        send();
    };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [custom, dataset]);
  return (
    <div className="frame-holder" ref={holder}>
      <div
        className={`device-frame device-${device}`}
        style={{
          width: dimensions.width * scale,
          height: dimensions.height * scale,
        }}
      >
        <iframe
          ref={frame}
          key={`${id}-${device}-${reset}-${dataset}-${still}`}
          title={`ทดลอง ${findTemplate(id)?.title}`}
          src={`?play=${id}&dataset=${dataset}${still ? '&still=1' : ''}`}
          onLoad={send}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
}

function DevicePicker({
  value,
  onChange,
}: {
  value: Device;
  onChange: (value: Device) => void;
}) {
  return (
    <fieldset className="device-picker">
      <legend className="sr-only">จำลองขนาดหน้าจอ</legend>
      {(Object.keys(devices) as Device[]).map((device) => (
        <label key={device}>
          <input
            type="radio"
            name="device"
            value={device}
            checked={value === device}
            onChange={() => onChange(device)}
          />
          <span>
            {device === 'mobile'
              ? 'Mobile'
              : device === 'tablet'
                ? 'Tablet'
                : 'Desktop'}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Lab() {
  const params = new URLSearchParams(location.search);
  const selected = findTemplate(params.get('template'));
  const comparison = (params.get('compare') || '')
    .split(',')
    .flatMap((id) => (findTemplate(id) ? [id as TemplateId] : []))
    .slice(0, 2);
  const [compare, setCompare] = useState<TemplateId[]>(comparison);
  const [filter, setFilter] = useState('all');
  const [device, setDevice] = useState<Device>('mobile');
  const [reset, setReset] = useState(0);
  const [dataset, setDataset] = useState('demo');
  const [custom, setCustom] = useState<Story | null>(null);
  const [still, setStill] = useState(false);
  const [evidence, setEvidence] = useState<{
    date: string;
    summary: string;
  } | null>(null);
  useEffect(() => {
    void fetch(labAsset('previews/verification.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then(setEvidence)
      .catch(() => {});
  }, []);
  const ids = selected ? [selected.id] : comparison;
  const isDetail = ids.length > 0;
  return (
    <div className="lab">
      <a className="skip" href="#lab-main" tabIndex={0}>
        ข้ามไปเนื้อหา
      </a>
      <header className="lab-header">
        <a
          href={labHome}
          className="lab-brand"
          aria-label="LuvNote Template Lab"
        >
          <Icon size={22} />
          <span>LuvNote</span>
          <span className="lab-brand-divider" />
          <small>Creative Lab</small>
        </a>
        <span className="lab-private">พื้นที่ทดลองภายใน</span>
      </header>
      {!isDetail ? (
        <main id="lab-main">
          <section className="lab-intro">
            <div>
              <h1>
                Same love.
                <br />
                Twelve different
                <br />
                <em>ways to feel it.</em>
              </h1>
              <p>
                จดหมายหนึ่งฉบับ แผนที่หนึ่งใบ หรือท้องฟ้าที่มีแค่เรา
                <br />
                ลองค้นหาวิธีเล่าเรื่องที่ใช่ สำหรับความทรงจำของคุณ
              </p>
            </div>
            <a className="lab-feature" href="?template=polaroid">
              <img
                src={labAsset('previews/polaroid-mobile.jpg')}
                alt="ภาพจริงของ Polaroid Memories กองรูปที่ปัดและพลิกได้"
                width="390"
                height="844"
              />
              <span>
                <Icon name="play" size={16} /> ลองเล่น Polaroid Memories
              </span>
            </a>
            <span className="lab-intro-note">
              Every story opens differently.
            </span>
          </section>
          <section style={{ padding: "24px 5%", background: "#e9e1d4" }}><a href="?experiment=creative-studio">ทดลองต้นแบบใหม่จาก Creative Studio →</a></section>
          <section className="lab-catalog" aria-label="ต้นแบบทั้งหมด">
            <div className="catalog-heading">
              <h2>Find your kind of feeling.</h2>
              <span>12 interactive studies</span>
            </div>
            <div
              className="lab-filter"
              role="group"
              aria-label="กรองแนวเทมเพลต"
            >
              {[
                ['all', 'ทั้งหมด'],
                ['paper', 'Paper & memories'],
                ['immersive', 'Immersive worlds'],
                ['playful', 'Play & discover'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="template-grid">
              {templates
                .filter((t) => filter === 'all' || filter === t.tone)
                .map((t, i) => (
                  <article
                    key={t.id}
                    className="template-tile"
                    style={{ '--tile': t.color } as CSSProperties}
                  >
                    <a
                      className="tile-preview"
                      href={`?template=${t.id}`}
                      aria-label={`เปิด ${t.title}`}
                    >
                      <img
                        src={labAsset(`previews/${t.id}-mobile.jpg`)}
                        alt={`ภาพจริงของ ${t.title}`}
                        width="390"
                        height="844"
                        loading={i > 2 ? 'lazy' : 'eager'}
                      />
                      <span className="tile-play">
                        <Icon name="play" size={18} /> ลองเล่น
                      </span>
                    </a>
                    <div className="tile-meta">
                      <span>{t.kind}</span>
                      <label className="compare-check">
                        <input
                          type="checkbox"
                          checked={compare.includes(t.id)}
                          disabled={
                            !compare.includes(t.id) && compare.length >= 2
                          }
                          onChange={(e) =>
                            setCompare((c) =>
                              e.target.checked
                                ? [...c, t.id]
                                : c.filter((id) => id !== t.id),
                            )
                          }
                          aria-label={`เปรียบเทียบ ${t.title}`}
                        />
                        เปรียบเทียบ
                      </label>
                    </div>
                    <a href={`?template=${t.id}`} className="tile-title">
                      <h3>{t.title}</h3>
                      <Icon name="arrow" size={20} />
                    </a>
                    <p>{t.thai}</p>
                  </article>
                ))}
            </div>
          </section>
          {compare.length > 0 && (
            <aside className="compare-tray" aria-label="รายการเปรียบเทียบ">
              <span>เลือกแล้ว {compare.length} / 2 แบบ</span>
              <a href={`?compare=${compare.join(',')}`}>
                เปิดดูคู่กัน <Icon name="arrow" size={18} />
              </a>
              <button onClick={() => setCompare([])}>ล้างตัวเลือก</button>
            </aside>
          )}
        </main>
      ) : (
        <main id="lab-main" className="lab-detail">
          <a className="lab-back" href={`${labHome}#catalog`}>
            <Icon name="back" size={18} /> กลับไปดูทั้งหมด
          </a>
          <div className="detail-heading">
            <div>
              <h1>{selected?.title || 'Two stories, side by side.'}</h1>
              <p>
                {selected?.thai ||
                  'ทดลองจังหวะการเล่าเรื่องของแต่ละแบบ แล้วเลือกสิ่งที่รู้สึกใช่'}
              </p>
            </div>
            <span className="prototype-badge">ฉบับพัฒนาประสบการณ์เต็ม</span>
          </div>
          <div className="lab-toolbar">
            <DevicePicker value={device} onChange={setDevice} />
            <a className="studio-jump" href="#studio">
              ปรับชื่อและรูปของคุณ
            </a>
            <span className="device-measure">
              {devices[device].width} × {devices[device].height}
            </span>
            <Button variant="quiet" onClick={() => setReset((n) => n + 1)}>
              <Icon name="reset" size={17} /> Reset interaction
            </Button>
            <label className="motion-control">
              <input
                type="checkbox"
                checked={still}
                onChange={(e) => setStill(e.target.checked)}
              />{' '}
              ลดการเคลื่อนไหว
            </label>
            <label className="dataset-picker">
              ข้อมูล
              <select
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
              >
                <option value="demo">เรื่องของเรา</option>
                <option value="alternate">อีกเรื่องหนึ่ง</option>
                {custom && <option value="custom">ข้อมูลที่แก้ไข</option>}
              </select>
            </label>
          </div>
          <div className={`lab-frames ${ids.length > 1 ? 'paired' : ''}`}>
            {ids.map((id) => (
              <section key={id} className="lab-preview">
                <div className="preview-caption">
                  <span>{findTemplate(id)?.title}</span>
                  {dataset !== 'custom' ? (
                    <a
                      href={`?play=${id}&dataset=${dataset}${still ? '&still=1' : ''}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      เปิดเต็มจอ <Icon name="expand" size={15} />
                    </a>
                  ) : (
                    <span>ข้อมูลแก้ไขใช้ใน Preview นี้</span>
                  )}
                </div>
                <Frame
                  id={id}
                  device={device}
                  reset={reset}
                  dataset={dataset}
                  still={still}
                  custom={custom}
                />
              </section>
            ))}
          </div>
          <Studio
            key={
              ids.join(',') + (dataset === 'alternate' ? '-alternate' : '-demo')
            }
            id={selected?.id || ids[0]}
            initial={
              dataset === 'custom' && custom
                ? custom
                : dataset === 'alternate'
                  ? alternate
                  : (selected?.id || ids[0]) === 'polaroid' ? polaroidDemo : demo
            }
            onApply={(story) => {
              setCustom(story);
              setDataset('custom');
              setReset((n) => n + 1);
            }}
          />
          <div className="detail-notes">
            {ids.map((id) => {
              const t = findTemplate(id)!;
              return (
                <section key={id}>
                  <h2>{t.title}</h2>
                  <p>{t.signature}</p>
                  <dl>
                    <dt>Design & motion guidance</dt>
                    <dd>{t.skills.join(' / ')}</dd>
                    <dt>Runtime / adapted components</dt>
                    <dd>{t.libraries.join(' / ')}</dd>
                    <dt>สถานะและผลทดสอบ</dt>
                    <dd>
                      {evidence ? (
                        <>
                          {evidence.summary}
                          <br />
                          <a
                            href={labAsset('previews/verification.json')}
                            target="_blank"
                            rel="noreferrer"
                          >
                            หลักฐาน {evidence.date}
                          </a>
                        </>
                      ) : (
                        'ยังไม่พบผลทดสอบล่าสุดใน build นี้'
                      )}
                    </dd>
                  </dl>
                </section>
              );
            })}
          </div>
        </main>
      )}
      <footer className="lab-footer">
        <span>LuvNote · A little love, thoughtfully made.</span>
        <p>
          ตัวอย่างภายใน ข้อมูลและภาพประกอบสำหรับทดลอง
          ไม่มีการเผยแพร่การ์ดหรือเรียก API ลูกค้า
        </p>
      </footer>
    </div>
  );
}

const experiment = new URLSearchParams(location.search).get('experiment') === 'creative-studio';
const flagship = new URLSearchParams(location.search).get('experiment') === 'flagship';
const impossible = new URLSearchParams(location.search).get('experiment') === 'impossible';
const requested = new URLSearchParams(location.search).get('play');
const template = findTemplate(requested);
document.documentElement.dataset.labPlayer = template ? 'true' : 'false';
const still = new URLSearchParams(location.search).get('still') === '1';
if (still) document.documentElement.dataset.still = 'true';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion={still ? 'always' : 'user'}>
      {impossible ? <Suspense fallback={<p>กำลังเตรียมโปสการ์ด…</p>}><ImpossiblePostcard /></Suspense> : flagship ? <Suspense fallback={<p>กำลังเตรียมแสงให้เธอ…</p>}><Flagship /></Suspense> : experiment ? <Suspense fallback={<p>กำลังเปิดต้นแบบ…</p>}><CreativeExperiments /></Suspense> : template ? <Player id={template.id} /> : <Lab />}
    </MotionConfig>
  </StrictMode>,
);
