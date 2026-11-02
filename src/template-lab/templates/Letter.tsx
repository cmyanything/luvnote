import { useState } from 'react';
import type { Story } from '../data';
import { shortDate } from '../data';
import { AnimatedGroup, Button, Icon, Words } from '../shared';

export default function Letter({ story }: { story: Story }) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState(false);
  return (
    <main className={`experience letter ${open ? 'letter-open' : ''}`}>
      <header className="letter-post">
        <span>From {story.from}</span>
        <span>{shortDate(story.date)}</span>
      </header>
      <h1>
        Words I’ve
        <br />
        kept for you.
      </h1>
      {!open && (
        <p className="letter-intro">บางคำ พูดไม่เก่งเท่าเขียนให้เธออ่าน</p>
      )}
      <div className="letter-desk">
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
            <AnimatedGroup>
              <p className="hand letter-salutation">ถึง {story.to},</p>
              <div className="letter-copy">{story.letter}</div>
              <p className="hand letter-sign">
                รักเสมอ,
                <br />
                {story.from}
              </p>
            </AnimatedGroup>
            {!secret ? (
              <Button variant="quiet" onClick={() => setSecret(true)}>
                ยังมีอีกบรรทัดหนึ่ง <Icon name="arrow" size={18} />
              </Button>
            ) : (
              <p className="letter-ps" role="status">
                <span>ป.ล.</span> <Words text={story.secret} />
              </p>
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
