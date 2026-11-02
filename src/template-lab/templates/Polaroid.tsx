import { useState } from 'react';
import { motion } from 'motion/react';
import type { Story } from '../data';
import { Button, Icon, Modal, Photo, useStill } from '../shared';

export default function Polaroid({ story }: { story: Story }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [zoom, setZoom] = useState(false);
  const still = useStill();
  const moment = story.moments[index];
  function move(direction: number) {
    setIndex(
      (i) => (i + direction + story.moments.length) % story.moments.length,
    );
    setFlipped(false);
  }
  return (
    <main className="experience polaroid">
      <div className="polaroid-heading">
        <h1>
          A little
          <br />
          pile of us.
        </h1>
        <span className="hand">
          เก็บไว้
          <br />
          คิดถึงกัน
        </span>
      </div>
      <div className="polaroid-table">
        {[2, 1].map((offset) => (
          <div
            className={`polaroid-under under-${offset}`}
            key={offset}
            aria-hidden="true"
          >
            <img
              src={story.moments[(index + offset) % story.moments.length].image}
              alt=""
              width="300"
              height="340"
            />
          </div>
        ))}
        <motion.div
          key={index}
          className="polaroid-drag"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 65) move(info.offset.x > 0 ? -1 : 1);
          }}
          initial={still ? false : { opacity: 0, rotate: -3 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.24 }}
          style={{ touchAction: 'pan-y' }}
        >
          <div className={`polaroid-print ${flipped ? 'flipped' : ''}`}>
            <div className="print-front" aria-hidden={flipped} inert={flipped}>
              <Photo moment={moment} eager />
              <button
                className="print-expand"
                aria-label="ขยายรูปภาพ"
                onClick={() => setZoom(true)}
              >
                <Icon name="expand" size={18} />
              </button>
              <p className="hand">{moment.title}</p>
              <span className="print-date">{moment.date}</span>
            </div>
            <div className="print-back" aria-hidden={!flipped} inert={!flipped}>
              <span className="hand">เขียนไว้หลังรูป</span>
              <div
                className="back-note"
                role="region"
                aria-label="ข้อความหลังรูป"
                tabIndex={0}
              >
                <p>{moment.note}</p>
              </div>
              <span>— {story.from}</span>
            </div>
          </div>
        </motion.div>
        <span className="polaroid-tape" aria-hidden="true" />
      </div>
      <div className="polaroid-controls">
        <button aria-label="รูปก่อนหน้า" onClick={() => move(-1)}>
          <Icon name="back" />
        </button>
        <Button
          variant="quiet"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
        >
          {flipped ? 'กลับมาดูรูป' : 'พลิกอ่านข้อความ'}
        </Button>
        <button aria-label="รูปถัดไป" onClick={() => move(1)}>
          <Icon name="arrow" />
        </button>
      </div>
      <p className="polaroid-hint" aria-live="polite">
        {index + 1} / {story.moments.length} <span>ปัดรูป หรือแตะลูกศร</span>
      </p>
      <p className="polaroid-closing">{story.closing}</p>
      {zoom && (
        <Modal title={moment.title} onClose={() => setZoom(false)}>
          <Photo moment={moment} eager />
          <p>{moment.note}</p>
        </Modal>
      )}
    </main>
  );
}
