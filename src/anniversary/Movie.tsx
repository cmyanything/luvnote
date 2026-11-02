import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { CardData } from '../types';
import { dateLabel, daysTogether } from '../lib/dates';
import { useModal } from '../hooks/useModal';
import type { MusicBox } from './musicBox';
import { buildMovie } from './movieTimeline';
import './movie.css';

const W = 540;
const H = 960;

function fit() {
  return Math.min(window.innerWidth / W, window.innerHeight / H);
}

/** Shrinks one-line names to fit the stage; very long ones wrap instead. */
function fitNames(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    el.style.fontSize = '';
    el.style.whiteSpace = '';
    const max = Number(el.dataset.fit);
    const width = el.scrollWidth;
    if (width <= max) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    const fitted = (size * max) / width;
    if (fitted >= size * 0.55) el.style.fontSize = `${fitted}px`;
    else {
      el.style.fontSize = `${size * 0.55}px`;
      el.style.whiteSpace = 'normal';
    }
  });
}

function preload(sources: string[]) {
  const images = sources.map(
    (src) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = image.onerror = () => resolve();
        image.src = src;
      }),
  );
  const fonts =
    document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  return Promise.race([
    Promise.all([...images, fonts]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 10000)),
  ]);
}

export default function Movie({
  card,
  music,
  onClose,
  onRead,
}: {
  card: CardData;
  music: MusicBox;
  onClose: () => void;
  onRead: () => void;
}) {
  const modal = useModal(onClose);
  const stage = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [scale, setScale] = useState(fit);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const photos = card.photos.slice(0, 5);
  const to = card.to || 'เธอ';
  const from = card.from || 'เรา';
  const letter = card.letter.trim();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const strip = Array.from(
    { length: Math.max(10, photos.length * 2) },
    (_, i) => photos[i % Math.max(1, photos.length)],
  );

  useEffect(() => {
    const resize = () => setScale(fit());
    window.addEventListener('resize', resize);
    let alive = true;
    void preload(photos.map((photo) => photo.src)).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
      window.removeEventListener('resize', resize);
    };
    // The photo list cannot change while the film is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ready || !stage.current) return;
    const root = stage.current;
    fitNames(root);
    let tl: gsap.core.Timeline | undefined;
    const context = gsap.context(() => {
      tl = buildMovie(
        root,
        {
          photos: photos.length,
          days: daysTogether(card.startDate || ''),
          letter: !!letter,
          reduce,
        },
        letter.length,
        () => {
          setEnded(true);
          music.fadeOut();
        },
      );
      tl.eventCallback('onUpdate', () => {
        if (bar.current && tl)
          bar.current.style.transform = `scaleX(${tl.progress()})`;
      });
    }, root);
    timeline.current = tl ?? null;
    Object.assign(root, { movieTimeline: tl });
    tl?.play(0);
    music.start();
    return () => {
      context.revert();
      timeline.current = null;
    };
    // Built once per open; the card cannot change while the film plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    function hidden() {
      if (document.hidden && timeline.current?.isActive()) setPaused(true);
    }
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);

  useEffect(() => {
    const tl = timeline.current;
    if (!tl || ended) return;
    if (paused) {
      tl.pause();
      music.pause();
    } else {
      tl.resume();
      music.resume();
    }
  }, [paused, ended, music]);

  function replay() {
    setEnded(false);
    setPaused(false);
    timeline.current?.play(0);
    music.start();
  }

  return (
    <div
      className="mv-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="หนังสั้นของเรา"
      ref={modal}
    >
      <div className="mv-frame" style={{ width: W * scale, height: H * scale }}>
        <div
          className="mv-stage"
          ref={stage}
          style={{ transform: `scale(${scale})` }}
          onClick={() => ready && !ended && setPaused((value) => !value)}
          data-reduce={reduce || undefined}
          aria-hidden="true"
        >
          <div className="mv-paper" />

          <div className="mv-scene" data-scene="cover">
            <div className="mv-cover-cam" data-m="cover-cam">
              <div className="mv-page" data-m="cover-page">
                <p className="mv-eyebrow">chapter 01</p>
                <p className="mv-eyebrow mv-rust">the beginning</p>
              </div>
              <div className="mv-lid" data-m="cover-lid">
                <span className="mv-ribbon" />
                <div>
                  <p className="mv-eyebrow mv-faded">
                    est. {card.startDate?.slice(0, 4) || 'us'} · vol. 01
                  </p>
                  <h2>
                    our
                    <br />
                    story.
                  </h2>
                </div>
                <p className="mv-for">
                  a little film for <b>{to}</b>
                  <br />
                  with love, <b>{from}</b>
                </p>
              </div>
            </div>
          </div>

          <div className="mv-scene" data-scene="chapter">
            <div className="mv-center">
              <p className="mv-eyebrow" data-m="ch-eyebrow">
                chapter 01 — the beginning
              </p>
              <p className="mv-title" data-m="ch-line">
                <span>เรื่องราวดี ๆ</span>
                <br />
                <span>มักเริ่มจาก</span>
                <span>วันธรรมดา</span>
                <span>วันหนึ่ง</span>
              </p>
            </div>
          </div>

          <div className="mv-scene" data-scene="names">
            <div className="mv-center">
              <p className="mv-names" data-m="names" data-fit="450">
                {to}
                <span className="mv-amp">&amp;</span>
                {from}
              </p>
              <p className="mv-date" data-m="since">
                ตั้งแต่ {dateLabel(card.startDate || '')}
              </p>
            </div>
          </div>

          <div className="mv-scene" data-scene="count">
            <div className="mv-center">
              <p className="mv-small" data-m="count-pre">
                เราเดินมาด้วยกันแล้ว
              </p>
              <div className="mv-ring" data-m="ring">
                <svg viewBox="0 0 600 600">
                  <circle
                    data-m="ring-line"
                    cx="300"
                    cy="300"
                    r="290"
                    fill="none"
                    stroke="#9aa588"
                    strokeWidth="3"
                    strokeDasharray="1822"
                    strokeDashoffset="1822"
                    transform="rotate(-96 300 300)"
                  />
                </svg>
                <strong data-m="count">0</strong>
              </div>
              <p className="mv-eyebrow" data-m="count-post">
                days… and counting
              </p>
            </div>
          </div>

          {photos.map((photo, i) => (
            <div className="mv-scene" data-scene={`m${i}`} key={i}>
              <p className="mv-date mv-moment-date" data-m={`m${i}-date`}>
                {photo.date
                  ? dateLabel(photo.date)
                  : `little moment ${String(i + 1).padStart(2, '0')}`}
              </p>
              <figure className="mv-pol" data-m={`m${i}-pol`}>
                <span className="mv-tape" />
                <div className="mv-photo">
                  <img data-m={`m${i}-img`} src={photo.src} alt="" />
                </div>
                <figcaption data-m={`m${i}-cap`}>
                  {photo.cap || 'วันหนึ่ง… ที่มีเราสองคน'}
                </figcaption>
              </figure>
            </div>
          ))}

          {photos.length >= 2 && (
            <div className="mv-scene" data-scene="strip">
              <p className="mv-eyebrow mv-strip-eyebrow" data-m="strip-eyebrow">
                every little moment
              </p>
              <div className="mv-strip" data-m="strip">
                <div className="mv-strip-track" data-m="strip-track">
                  <span className="mv-holes top" />
                  <span className="mv-holes bottom" />
                  {strip.map((photo, i) => (
                    <img key={i} src={photo.src} alt="" />
                  ))}
                </div>
              </div>
              <p className="mv-title mv-strip-line" data-m="strip-line">
                ทุกช่วงเวลาเล็ก ๆ ที่มีเธอ
              </p>
            </div>
          )}

          {letter && (
            <div className="mv-scene mv-letter-scene" data-scene="letter">
              <div className="mv-letter" data-m="letter">
                <p className="mv-letter-to">ถึง {to},</p>
                <div className="mv-letter-view" data-m="letter-view">
                  <p className="mv-letter-text" data-m="letter-text">
                    {letter}
                  </p>
                </div>
                <p className="mv-letter-from">— {from}</p>
              </div>
            </div>
          )}

          {photos.length >= 2 && (
            <div className="mv-scene" data-scene="collage">
              <div className="mv-collage" data-m="collage">
                {photos.map((photo, i) => (
                  <figure className="mv-pol mv-mini" data-m={`c${i}`} key={i}>
                    <div className="mv-photo">
                      <img src={photo.src} alt="" />
                    </div>
                    <figcaption>{photo.cap}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="mv-title mv-collage-line" data-m="collage-line">
                และเรื่องของเรา…
              </p>
            </div>
          )}

          <div className="mv-scene" data-scene="end">
            <div className="mv-center">
              <p className="mv-eyebrow" data-m="end-eyebrow">
                to be continued, together.
              </p>
              <p
                className="mv-names mv-end-names"
                data-m="end-names"
                data-fit="450"
              >
                {from} <span data-m="end-heart">♡</span> {to}
              </p>
              <p className="mv-small mv-end-msg" data-m="end-msg">
                {card.endMsg || 'สุขสันต์วันครบรอบนะ'}
              </p>
            </div>
          </div>

          <div className="mv-fx mv-dust" data-fx="dust">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 53 + 11) % 100}%`,
                  top: `${(i * 37 + 23) % 100}%`,
                  width: 2 + (i % 4),
                  height: 2 + (i % 4),
                  opacity: 0.2 + (i % 5) * 0.09,
                }}
              />
            ))}
          </div>
          <div className="mv-fx mv-leak" data-fx="leak" />
          <div className="mv-fx mv-grain" data-fx="grain" />
          <div className="mv-fx mv-vignette" />
        </div>

        <div className="mv-progress" aria-hidden="true">
          <i ref={bar} />
        </div>
        <button
          type="button"
          className="mv-button mv-close"
          onClick={onClose}
          aria-label="ปิดหนังสั้น"
        >
          ×
        </button>
        {!ready && (
          <p className="mv-loading" role="status">
            กำลังเตรียมหนังสั้นของเรา…
          </p>
        )}
        {ready && !ended && (
          <div className="mv-controls">
            <button
              type="button"
              className="mv-button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
            >
              {paused ? '▶' : '❚❚'}
            </button>
            <button
              type="button"
              className={`mv-button ${muted ? 'is-off' : ''}`}
              onClick={() => {
                music.setMuted(!muted);
                setMuted(!muted);
              }}
              aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
              aria-pressed={!muted}
            >
              ♪
            </button>
          </div>
        )}
        {paused && !ended && (
          <p className="mv-paused" aria-hidden="true">
            แตะเพื่อเล่นต่อ
          </p>
        )}
        {ended && (
          <div className="mv-end-actions">
            <button type="button" className="mv-pill" onClick={replay}>
              ↻ ดูอีกครั้ง
            </button>
            <button type="button" className="mv-pill solid" onClick={onRead}>
              อ่านสมุดของเรา ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
