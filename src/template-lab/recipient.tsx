import { useEffect, useRef, useState } from 'react';
import type { Story, Moment } from './data';
import { shortDate } from './data';
import { Button, Icon, Modal, Photo } from './shared';
import { createMusicBox, type MusicBox } from '../anniversary/musicBox';

export const coverMoment = (story: Story): Moment => ({
  ...story.moments[0],
  image: story.cover || story.moments[0].image,
  alt: `ภาพปกของ ${story.to}`,
});

export function LetterCopy({
  story,
  className = '',
}: {
  story: Story;
  className?: string;
}) {
  return (
    <div className={`personal-letter ${className}`} data-letter-content>
      <p className="letter-address">ถึง {story.to},</p>
      {story.letter
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p className="letter-paragraph" key={i}>
            {p}
          </p>
        ))}
      <p className="letter-signature">
        รักเสมอ,
        <br />
        {story.from}
      </p>
    </div>
  );
}

export function MemoryView({
  moment,
  children,
}: {
  moment: Moment;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="memory-view"
        onClick={() => setOpen(true)}
        aria-label={`ขยายภาพ: ${moment.title}`}
      >
        <Photo moment={moment} />
        {children}
        <Icon name="expand" size={17} />
      </button>
      {open && (
        <Modal title={moment.title} onClose={() => setOpen(false)}>
          <Photo moment={moment} eager />
          <p>{moment.note}</p>
          <p>
            {[shortDate(moment.date), moment.place].filter(Boolean).join(' · ')}
          </p>
          {moment.aside && <p className="hand">{moment.aside}</p>}
        </Modal>
      )}
    </>
  );
}

export function ReadLetter({
  story,
  label,
  className = '',
}: {
  story: Story;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`read-letter ${className}`}>
      <Button
        variant="quiet"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'พับจดหมายเก็บไว้' : label}{' '}
        <Icon name={open ? 'book' : 'heart'} size={18} />
      </Button>
      {open && <LetterCopy story={story} />}
    </div>
  );
}

export function RecipientTools({
  story,
  replay,
}: {
  story: Story;
  replay: () => void;
}) {
  const [on, setOn] = useState(false);
  const box = useRef<MusicBox | null>(null);
  useEffect(
    () => () => {
      box.current?.close();
      box.current = null;
    },
    [story.music],
  );
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        box.current?.pause();
        setOn(false);
      }
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  function toggle() {
    if (story.music?.type === 'demo') {
      if (!box.current) {
        box.current = createMusicBox();
        box.current.start();
      } else if (on) box.current.pause();
      else box.current.resume();
    }
    setOn((v) => !v);
  }
  return (
    <nav className="recipient-tools" aria-label="เครื่องมืออ่านการ์ด">
      {story.music && story.music.type !== 'none' && (
        <button
          onClick={toggle}
          aria-pressed={on}
          aria-label={on ? 'ปิดเพลงประกอบ' : 'เปิดเพลงประกอบ'}
        >
          <span aria-hidden="true">{on ? 'Ⅱ' : '♪'}</span>
          <span>{on ? 'ปิดเพลง' : 'เปิดเพลง'}</span>
        </button>
      )}
      <button
        onClick={() => {
          box.current?.close();
          box.current = null;
          setOn(false);
          replay();
        }}
        aria-label="เริ่มอ่านการ์ดใหม่"
      >
        <Icon name="reset" size={17} />
        <span>อ่านอีกครั้ง</span>
      </button>
      {on && story.music?.type === 'youtube' && (
        <div className="recipient-youtube">
          <iframe
            title="เพลงที่ผู้ส่งเลือก"
            src={`https://www.youtube.com/embed/${story.music.id}?autoplay=1&playsinline=1&rel=0&start=${story.music.start}`}
            allow="autoplay; encrypted-media"
          />
          <span>
            หากเพลงไม่เล่น ลองกดเล่นในกรอบเพลง หรืออ่านต่อโดยปิดเพลงได้
          </span>
        </div>
      )}
    </nav>
  );
}
