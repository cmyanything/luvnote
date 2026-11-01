import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CardData, Photo } from '../types';
import { dateLabel, daysTogether, today } from '../lib/dates';
import { useModal } from '../hooks/useModal';
import { COFFEE_ART, FLOWER_ART } from './demo';

function Sprig({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`sprig ${className}`}
      viewBox="0 0 100 170"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M49 160Q70 78 43 12M56 126L24 93M58 99L86 62M55 70L28 41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g fill="currentColor" opacity=".6">
        <ellipse
          cx="29"
          cy="102"
          rx="9"
          ry="25"
          transform="rotate(-40 29 102)"
        />
        <ellipse cx="79" cy="81" rx="8" ry="25" transform="rotate(35 79 81)" />
        <ellipse cx="32" cy="49" rx="7" ry="22" transform="rotate(-35 32 49)" />
        <ellipse cx="45" cy="20" rx="6" ry="18" transform="rotate(-12 45 20)" />
      </g>
    </svg>
  );
}

function Heart({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 70"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M40 61C27 49 9 39 10 24C12 7 32 6 40 21C51 2 72 12 69 29C67 42 48 55 40 61Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 21Q25 13 31 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Reveal({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      id={id}
      ref={ref}
      className={`journal-reveal ${visible ? 'visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const ref = useModal(onClose);
  return (
    <div
      className="story-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="รูปความทรงจำ"
      ref={ref}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="ปิดรูป"
      >
        ×
      </button>
      <figure>
        <img src={photo.src} alt={photo.cap || 'รูปความทรงจำของเรา'} />
        <figcaption>
          {photo.cap}
          <small>{photo.date && dateLabel(photo.date)}</small>
        </figcaption>
      </figure>
    </div>
  );
}

function startAmbient() {
  const context = new AudioContext();
  void context.resume();
  const chords = [
    [261.63, 329.63, 392],
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [196, 246.94, 293.66],
  ];
  let index = 0;
  function play() {
    if (context.state === 'closed') return;
    const now = context.currentTime;
    chords[index++ % chords.length].forEach((frequency, i) => {
      const tone = context.createOscillator(),
        gain = context.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.013, now + 0.6 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.start(now + i * 0.14);
      tone.stop(now + 5);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    });
  }
  play();
  const timer = setInterval(play, 4500);
  return () => {
    clearInterval(timer);
    void context.close();
  };
}

export function Journal({
  card,
  demo,
  auto,
}: {
  card: CardData;
  demo: boolean;
  auto: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [musicError, setMusicError] = useState('');
  const stopMusic = useRef<(() => void) | null>(null);
  const count = daysTogether(card.startDate || '');
  const cover = card.cover || card.photos[0]?.src;
  const codeLock = card.lock.type === 'code' && /^\d{4}$/.test(card.lock.code);
  useEffect(() => () => stopMusic.current?.(), []);
  function go(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'center',
      });
  }
  function openBook() {
    setOpen(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function replay() {
    stopMusic.current?.();
    stopMusic.current = null;
    setMusicOn(false);
    setOpen(false);
    setLetterOpen(false);
    setSecretOpen(false);
    setUnlocked(false);
    setPin('');
    setPinError('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function toggleMusic() {
    if (musicOn) {
      stopMusic.current?.();
      stopMusic.current = null;
      setMusicOn(false);
      return;
    }
    try {
      if (card.music.type === 'demo') stopMusic.current = startAmbient();
      setMusicOn(true);
      setMusicError('');
    } catch {
      setMusicError('เบราว์เซอร์นี้ยังเปิดเสียงไม่ได้ ลองแตะอีกครั้งนะ');
    }
  }
  useEffect(() => {
    if (!auto) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (callback: () => void, ms: number) =>
      timers.push(setTimeout(callback, ms));
    if (!open) later(openBook, 2200);
    else {
      later(() => go('journey-start'), 500);
      card.photos.forEach((_, index) =>
        later(() => go(`moment-${index}`), 2500 + index * 2200),
      );
      const end = 2600 + card.photos.length * 2200;
      later(() => {
        setLetterOpen(true);
        go('our-letter');
      }, end);
      later(() => {
        setSecretOpen(true);
        setUnlocked(true);
        go('our-secret');
      }, end + 2800);
      later(() => go('next-page'), end + 5000);
      later(replay, end + 8000);
    }
    return () => timers.forEach(clearTimeout);
  }, [auto, open, card.photos.length]);

  return (
    <div
      className={`story-app ${open ? 'reading' : 'closed'} effect-${card.effect}`}
    >
      <div className="story-grain" aria-hidden="true" />
      <div className="story-ambient" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 29 + 7) % 100}%`,
              animationDelay: `${-i * 1.7}s`,
              animationDuration: `${15 + (i % 5) * 2}s`,
            }}
          >
            {card.effect === 'stars'
              ? '✧'
              : card.effect === 'confetti'
                ? '▱'
                : '♡'}
          </span>
        ))}
      </div>
      <header className="story-topbar">
        <a href="../../" target="_top" className="story-brand">
          LuvNote <span>♡</span>
        </a>
        <span className="story-edition">
          {demo ? 'A LITTLE PREVIEW' : 'ANNIVERSARY EDITION'}
        </span>
        {open && (
          <button
            type="button"
            className={`music-toggle ${musicOn ? 'playing' : ''}`}
            onClick={toggleMusic}
            aria-label={musicOn ? 'ปิดเพลง' : 'เปิดเพลง'}
            aria-pressed={musicOn}
          >
            <span className="music-bars">
              <i />
              <i />
              <i />
            </span>
            <span>{musicOn ? 'ปิดเพลง' : 'เพลงของเรา'}</span>
          </button>
        )}
      </header>
      {musicError && (
        <p className="music-message" role="status">
          {musicError}
        </p>
      )}
      {musicOn && card.music.type === 'youtube' && (
        <div className="story-music">
          <p>
            เพลงของเรา ♫ <small>กดเล่นในกรอบได้เลย</small>
          </p>
          <iframe
            title="เพลงของเรา"
            src={`https://www.youtube.com/embed/${card.music.id}?autoplay=1&playsinline=1&rel=0&start=${card.music.start}`}
            width="300"
            height="200"
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {!open ? (
        <main className="story-cover">
          <h1 className="sr-only">Our Story — สมุดความทรงจำวันครบรอบ</h1>
          <p className="cover-eyebrow">FOR ALL THE LITTLE MOMENTS</p>
          <button
            type="button"
            className="cover-book"
            onClick={openBook}
            aria-label="เปิดสมุดความทรงจำ"
          >
            <span className="book-spine" />
            <span className="book-elastic" />
            <span className="book-volume">
              VOL. 01 <span>EST. {card.startDate?.slice(0, 4) || 'US'}</span>
            </span>
            <Sprig className="cover-sprig" />
            <span className="cover-title">
              our
              <br />
              <em>story.</em>
            </span>
            <span className="cover-subtitle">เรื่องเล็ก ๆ ของเราสองคน</span>
            <span className="cover-pictures">
              <span className="mini-polaroid back">
                <img src={card.photos[1]?.src || FLOWER_ART} alt="" />
                <span>little things</span>
              </span>
              <span className="mini-polaroid front">
                <img src={cover || COFFEE_ART} alt="" />
                <span>you & me ♡</span>
              </span>
              <span className="cover-tape" />
            </span>
            <span className="cover-for">
              a book for <span className="js-to">{card.to}</span>
            </span>
            <span className="cover-sign">with love, {card.from}</span>
            <span className="book-corner" />
          </button>
          <button type="button" className="open-book" onClick={openBook}>
            เปิดสมุดของเรา <span>↗</span>
          </button>
          <p className="cover-footnote">
            บางความทรงจำ… ก็อยากเก็บไว้อ่านด้วยกันอีกครั้ง
          </p>
        </main>
      ) : (
        <main className="journal-pages">
          <section className="journey-intro" id="journey-start">
            <span className="chapter-note">CHAPTER 01 — THE BEGINNING</span>
            <Sprig className="intro-sprig" />
            <p className="handwritten">สุขสันต์วันครบรอบนะ</p>
            <h1>
              เธอ กับ เรา
              <br />
              <em>และทุกเรื่องระหว่างทาง</em>
            </h1>
            <p className="date-strip">
              ตั้งแต่ {dateLabel(card.startDate || '')}
            </p>
            <div className="day-counter">
              <span className="counter-label">เราเดินมาด้วยกัน</span>
              <strong data-testid="days-together">
                {count.toLocaleString('en-US')}
              </strong>
              <span className="counter-unit">
                วัน <i>…and counting</i>
              </span>
            </div>
            <p className="intro-copy">
              บางวันอาจธรรมดา บางวันอาจไม่ง่าย
              <br />
              แต่พอย้อนมองกลับไป… ดีใจที่ในวันเหล่านั้นมีเธอ
            </p>
            <button
              type="button"
              className="quiet-link"
              onClick={() => go(card.photos.length ? 'moment-0' : 'our-letter')}
            >
              ค่อย ๆ ย้อนวันวานด้วยกัน <span>↓</span>
            </button>
          </section>
          {!!card.photos.length && (
            <section className="moments" aria-label="เส้นทางความรักของเรา">
              {card.photos.map((item, index) => (
                <Reveal key={index} id={`moment-${index}`} className="moment">
                  <span className="moment-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="moment-content">
                    <p className="moment-date">
                      {item.date
                        ? dateLabel(item.date)
                        : `OUR LITTLE MOMENT ${String(index + 1).padStart(2, '0')}`}
                    </p>
                    <button
                      type="button"
                      className="story-polaroid"
                      onClick={() => setPhoto(item)}
                      aria-label={`ดูรูปความทรงจำที่ ${index + 1}`}
                    >
                      <span className="photo-tape" />
                      <img
                        src={item.src}
                        alt={item.cap || `ความทรงจำที่ ${index + 1}`}
                        loading="lazy"
                      />
                      <span className="photo-caption">
                        {item.cap || 'วันหนึ่ง… ที่มีเราสองคน'}
                      </span>
                      <span className="photo-mark">♡</span>
                    </button>
                    <span className="moment-scribble">
                      {
                        [
                          'a little moment, a big memory.',
                          'my favourite place is beside you.',
                          'ordinary days, extraordinary us.',
                          'one more page of our story.',
                          'I would choose you, all over again.',
                        ][index]
                      }
                    </span>
                  </div>
                </Reveal>
              ))}
            </section>
          )}
          <Reveal className="letter-chapter" id="our-letter">
            <span className="chapter-note">
              CHAPTER 02 — WORDS I KEEP FOR YOU
            </span>
            <h2>
              มีบางคำ…
              <br />
              <em>ที่อยากเขียนให้เธอ</em>
            </h2>
            <div className={`story-letter ${letterOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="letter-seal"
                aria-expanded={letterOpen}
                onClick={() => setLetterOpen(!letterOpen)}
                aria-label={letterOpen ? 'พับจดหมาย' : 'เปิดจดหมาย'}
              >
                <Heart />
                <span>{letterOpen ? 'พับเก็บไว้ตรงนี้' : 'แตะเปิดจดหมาย'}</span>
              </button>
              {letterOpen ? (
                <div className="letter-content">
                  <span className="letter-to">
                    ถึง <span className="js-to">{card.to}</span> คนโปรดของเรา
                  </span>
                  <p>{card.letter}</p>
                  <span className="letter-from">
                    รักเสมอ,
                    <br />
                    <b>{card.from}</b>
                  </span>
                  <Heart className="letter-doodle" />
                </div>
              ) : (
                <div className="folded-letter">
                  <span>To my favourite person,</span>
                  <span>มีความรู้สึกดี ๆ พับเก็บอยู่ในนี้ ♡</span>
                </div>
              )}
            </div>
          </Reveal>
          <Reveal className="secret-chapter" id="our-secret">
            <span className="chapter-note">A LITTLE SECRET BETWEEN US</span>
            <h2>
              อีกหนึ่งเรื่อง
              <br />
              <em>สำหรับเธอคนเดียว</em>
            </h2>
            <div className={`secret-envelope ${secretOpen ? 'is-open' : ''}`}>
              {!secretOpen ? (
                <button
                  type="button"
                  className="envelope-button"
                  onClick={() => {
                    setSecretOpen(true);
                    if (!codeLock) setUnlocked(true);
                  }}
                  aria-label="เปิดข้อความลับ"
                >
                  <span className="envelope-fold" />
                  <Heart />
                  <span>just between us</span>
                </button>
              ) : unlocked ? (
                <div className="secret-note" data-testid="secret-note">
                  <Heart />
                  <p>{card.secret}</p>
                  <span>เก็บไว้เป็นความลับของเรานะ ♡</span>
                </div>
              ) : (
                <form
                  className="secret-pin"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (pin === card.lock.code) {
                      setUnlocked(true);
                      setPinError('');
                    } else {
                      setPinError('ยังไม่ใช่รหัสของเรา ลองใหม่อีกครั้งนะ');
                      setPin('');
                    }
                  }}
                >
                  <Heart />
                  <label htmlFor="secret-pin">รหัสลับของเรา 4 หลัก</label>
                  <p>{card.lock.hint || 'ลองนึกถึงตัวเลขที่เรารู้กันสองคน'}</p>
                  <input
                    id="secret-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    autoComplete="off"
                    aria-describedby="pin-message"
                  />
                  <button type="submit">เปิดอ่านข้อความ ♡</button>
                  <p className="pin-error" role="status" id="pin-message">
                    {pinError}
                  </p>
                </form>
              )}
            </div>
          </Reveal>
          <Reveal className="ending-chapter" id="next-page">
            <span className="chapter-note">TO BE CONTINUED, TOGETHER.</span>
            <Sprig />
            <h2>
              {card.endMsg || 'หน้าต่อไปของเรา\nยังอยากมีเธออยู่ด้วยเสมอ ♡'}
            </h2>
            <p>
              แด่ทุกความทรงจำที่ผ่านมา
              <br />
              และอีกมากมาย… ที่กำลังรอให้เราเขียนด้วยกัน
            </p>
            <span className="ending-names">
              {card.from} <Heart /> {card.to}
            </span>
            <button type="button" className="quiet-link" onClick={replay}>
              ↶ กลับไปอ่านตั้งแต่หน้าแรก
            </button>
          </Reveal>
          <footer className="story-footer">
            <span>LuvNote ♡</span>
            <a href="./" target="_top">
              เขียนเรื่องของเราบ้าง ↗
            </a>
          </footer>
        </main>
      )}
      {photo && <Lightbox photo={photo} onClose={() => setPhoto(null)} />}
    </div>
  );
}

export function LoadState({
  error,
}: {
  error?: 'expired' | 'missing' | 'network';
}) {
  const message =
    error === 'expired'
      ? 'สมุดเล่มนี้หมดอายุแล้ว'
      : error === 'missing'
        ? 'ยังหาสมุดเล่มนี้ไม่เจอ'
        : 'เปิดสมุดไม่สำเร็จ';
  return (
    <main className="story-load" aria-live="polite">
      <Sprig />
      <span className="story-brand">LuvNote ♡</span>
      <h1>{error ? message : 'กำลังเปิดสมุดความทรงจำ…'}</h1>
      <p>
        {error === 'expired'
          ? 'ลิงก์การ์ดเปิดได้ 15 วันนับจากวันที่สร้างนะ'
          : error
            ? 'ลองตรวจลิงก์อีกครั้ง หรือกลับมาลองใหม่สักครู่นะ'
            : 'เรื่องราวเล็ก ๆ ของเรา กำลังรออยู่ข้างใน'}
      </p>
      {error && (
        <a href={error === 'network' ? location.href : '../../'}>
          {error === 'network' ? 'ลองเปิดใหม่ ↗' : 'กลับไปที่ LuvNote ↗'}
        </a>
      )}
    </main>
  );
}
