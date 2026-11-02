import { useState } from 'react';
import type { Story } from '../data';
import { AnimatedGroup, Button, Icon, Photo } from '../shared';
import { defaultChoices } from '../data';
import { MemoryView, ReadLetter, coverMoment } from '../recipient';

export default function Choose({ story }: { story: Story }) {
  const [choices, setChoices] = useState<number[]>([]);
  const [scene, setScene] = useState(0);
  const content = story.choices || defaultChoices;
  const step = choices.length;
  const places = content.options[0];
  const times = content.options[1];
  const index = (choices[0] || 0) * 2 + (choices[1] || 0);
  const ending = { ...content.endings[index], image: [1, 2, 0, 3][index] };
  return (
    <main className={`experience choose choose-step-${step}`}>
      <header>
        <span>
          {story.from} มีคำถามอยากถาม {story.to}
        </span>
        <div
          className="choice-track"
          role="group"
          aria-label={`คำถาม ${Math.min(step + 1, 2)} จาก 2`}
        >
          {[0, 1].map((i) => (
            <span className={step > i ? 'done' : ''} key={i}>
              {step > i ? <Icon name="check" size={14} /> : i + 1}
            </span>
          ))}
        </div>
      </header>
      {step < 2 ? (
        <section key={step} className="choose-question">
          <h1>
            {step === 0 ? (
              <>
                {story.headline || (
                  <>
                    Where shall
                    <br />
                    we go?
                  </>
                )}
              </>
            ) : (
              <>
                When the
                <br />
                world is ours.
              </>
            )}
          </h1>
          <p>{content.questions[step]}</p>
          {step === 0 ? (
            <div className="choose-prologue">
              <MemoryView moment={coverMoment(story)} />
              <p>{story.intro || story.title}</p>
            </div>
          ) : (
            <div className="choose-branch-scene">
              <span className="hand">เมื่อเธอเลือก {places[choices[0]]}</span>
              <p>
                {story.moments[choices[0] % story.moments.length].aside ||
                  story.moments[choices[0] % story.moments.length].note}
              </p>
            </div>
          )}
          <AnimatedGroup className="choice-options">
            {(step === 0 ? places : times).map((label, i) => (
              <Button
                key={label}
                className={`choice-option option-${i}`}
                onClick={() => setChoices((c) => [...c, i])}
              >
                <span aria-hidden="true">{i === 0 ? 'A' : 'B'}</span>
                <div>
                  {label}
                  <small>
                    {i === 0 ? 'ทางเลือกหนึ่งของเรา' : 'อีกทางที่ไปด้วยกันได้'}
                  </small>
                </div>
                <Icon name="arrow" />
              </Button>
            ))}
          </AnimatedGroup>
        </section>
      ) : (
        <section className="choice-ending" key={index}>
          <span className="hand">เส้นเรื่องที่เธอเลือก</span>
          <p className="choice-dedication">{story.title}</p>
          <h1>{ending.title}</h1>
          <Photo
            moment={story.moments[ending.image % story.moments.length]}
            eager
          />
          <p>{ending.text}</p>
          <p className="choice-promise" role="status">
            {story.secret}
          </p>
          <span>
            {places[choices[0]]} + {times[choices[1]]}
          </span>
          <section className="choice-memories">
            <h2>ระหว่างทางที่มีเรา</h2>
            <nav aria-label="ความทรงจำในเส้นเรื่อง">
              {story.moments.map((m, i) => (
                <button
                  key={m.id}
                  aria-pressed={scene === i}
                  onClick={() => setScene(i)}
                >
                  {i + 1}
                  <span>{m.title}</span>
                </button>
              ))}
            </nav>
            <MemoryView moment={story.moments[scene]} />
            <h3>{story.moments[scene].title}</h3>
            <p>{story.moments[scene].note}</p>
            {story.moments[scene].aside && (
              <p className="hand">{story.moments[scene].aside}</p>
            )}
          </section>
          <ReadLetter
            story={story}
            label="อ่านจดหมายของเส้นทางนี้"
            className="choice-letter"
          />
          <p className="hand choice-closing">{story.closing}</p>
        </section>
      )}
      <nav className="choose-nav" aria-label="เปลี่ยนเส้นทาง">
        {step > 0 && (
          <Button
            variant="quiet"
            onClick={() => setChoices((c) => c.slice(0, -1))}
          >
            <Icon name="back" /> ย้อนคำตอบ
          </Button>
        )}
        {step === 2 && (
          <Button
            variant="quiet"
            onClick={() => {
              setChoices([]);
              setScene(0);
            }}
          >
            เลือกเส้นทางใหม่
          </Button>
        )}
        <span>ไม่ว่าเลือกทางไหน ก็อยากไปกับเธอ</span>
      </nav>
    </main>
  );
}
