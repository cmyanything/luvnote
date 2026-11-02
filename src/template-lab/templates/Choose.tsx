import { useState } from 'react';
import type { Story } from '../data';
import { AnimatedGroup, Button, Icon, Photo } from '../shared';

export default function Choose({ story }: { story: Story }) {
  const [choices, setChoices] = useState<number[]>([]);
  const step = choices.length;
  const places = ['ออกไปหลงทาง', 'อยู่บ้านด้วยกัน'];
  const times = ['แสงเช้า', 'ดวงดาว'];
  const index = (choices[0] || 0) * 2 + (choices[1] || 0);
  const endings = [
    {
      title: 'เช้าวันใหม่ บนถนนเส้นใหม่',
      text: 'เราออกเดินทางก่อนเมืองจะตื่น ไม่ต้องรู้ว่าปลายทางคือไหน แค่มีเธออยู่ข้าง ๆ',
      image: 1,
    },
    {
      title: 'หลงทางไปใต้ดวงดาว',
      text: 'ปิดแผนที่ลงสักคืน แล้วให้ท้องฟ้าพาเราไปหาความทรงจำใหม่ด้วยกัน',
      image: 2,
    },
    {
      title: 'กาแฟช้า ๆ ที่บ้านของเรา',
      text: 'ไม่ต้องมีตั๋วเดินทาง แค่เช้าที่ไม่ต้องรีบ กาแฟสองแก้ว และคนที่อยากนั่งด้วย',
      image: 0,
    },
    {
      title: 'คืนธรรมดา ที่พิเศษที่สุด',
      text: 'ทำอาหารง่าย ๆ เปิดเพลงเบา ๆ แล้วเล่าเรื่องของวันนี้ให้กันฟัง นี่แหละวันในฝันของเรา',
      image: 3,
    },
  ];
  const ending = endings[index];
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
                Where shall
                <br />
                we go?
              </>
            ) : (
              <>
                When the
                <br />
                world is ours.
              </>
            )}
          </h1>
          <p>
            {step === 0
              ? 'ถ้าพรุ่งนี้มีเวลาให้กันทั้งวัน เธออยาก…'
              : 'แล้วอยากให้วันของเราเริ่มด้วยอะไร?'}
          </p>
          <AnimatedGroup className="choice-options">
            {(step === 0 ? places : times).map((label, i) => (
              <Button
                key={label}
                className={`choice-option option-${i}`}
                onClick={() => setChoices((c) => [...c, i])}
              >
                <span>
                  {step === 0
                    ? i === 0
                      ? 'ไป'
                      : 'อยู่'
                    : i === 0
                      ? 'เช้า'
                      : 'ค่ำ'}
                </span>
                <div>
                  {label}
                  <small>
                    {step === 0
                      ? i === 0
                        ? 'ถนนใหม่ ๆ กับคนเดิม'
                        : 'ไม่ไปไหน ก็มีความสุข'
                      : i === 0
                        ? 'โลกที่ยังเงียบ และกาแฟหอม ๆ'
                        : 'โลกที่ช้าลง และเพลงโปรด'}
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
          <Button variant="quiet" onClick={() => setChoices([])}>
            เลือกเส้นทางใหม่
          </Button>
        )}
        <span>ไม่ว่าเลือกทางไหน ก็อยากไปกับเธอ</span>
      </nav>
    </main>
  );
}
