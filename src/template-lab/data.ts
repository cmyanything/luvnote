import type { CardData } from '../types';

export interface Moment {
  id: string;
  date: string;
  title: string;
  note: string;
  image: string;
  alt: string;
  place: string;
}

export interface Story {
  to: string;
  from: string;
  date: string;
  title: string;
  letter: string;
  secret: string;
  closing: string;
  moments: Moment[];
}

export const demo: Story = {
  to: 'เธอ',
  from: 'คนข้าง ๆ',
  date: '2022-06-14',
  title: 'Some things feel like home.',
  letter:
    'ถ้าวันธรรมดามีหน้าตา ก็คงเป็นเธอที่นั่งอยู่ฝั่งตรงข้าม\nเป็นกาแฟที่แบ่งกัน เป็นเพลงที่ร้องผิดด้วยกัน\nและเป็นความเงียบที่ไม่เคยทำให้รู้สึกเหงา\n\nขอบคุณที่ทำให้คำว่า “เรา” เป็นที่ที่อยากกลับมาเสมอ',
  secret: 'ครั้งหน้า ไปสร้างความทรงจำใหม่ด้วยกันนะ',
  closing: 'ในทุกวันธรรมดา ฉันยังเลือกเธอ',
  moments: [
    {
      id: 'coffee',
      date: '2022-06-14',
      title: 'กาแฟแก้วแรก',
      note: 'วันนั้นกาแฟอาจจะธรรมดา แต่คนที่นั่งด้วยไม่ธรรมดาเลย',
      image: '/images/coffee.jpg',
      alt: 'กาแฟบนโต๊ะ ภาพประกอบวันแรกที่พบกัน',
      place: 'ร้านเดิม มุมหน้าต่าง',
    },
    {
      id: 'escape',
      date: '2023-02-18',
      title: 'หลงทางด้วยกัน',
      note: 'จำทางกลับแทบไม่ได้ แต่จำได้ว่าหัวเราะกันตลอดทาง',
      image: '/images/lake.jpg',
      alt: 'ทะเลสาบท่ามกลางภูเขา ภาพประกอบการเดินทาง',
      place: 'ที่ไหนสักแห่ง นอกเมือง',
    },
    {
      id: 'sunset',
      date: '2024-11-02',
      title: 'ไม่ต้องรีบไปไหน',
      note: 'โลกยังหมุนเร็วเหมือนเดิม แต่เราค่อย ๆ ใช้เวลาด้วยกันได้',
      image: '/images/landscape.jpg',
      alt: 'แสงเย็นเหนือทิวเขา ภาพประกอบวันที่ได้พักด้วยกัน',
      place: 'ระหว่างทางกลับบ้าน',
    },
    {
      id: 'home',
      date: '2026-06-14',
      title: 'บ้านที่ชื่อว่าเธอ',
      note: 'ไม่จำเป็นต้องเป็นที่ไหน แค่มีเธออยู่ข้าง ๆ ก็พอแล้ว',
      image: '/images/cabin.jpg',
      alt: 'กระท่อมริมทะเลสาบ ภาพประกอบความรู้สึกเหมือนบ้าน',
      place: 'ตรงนี้ ข้าง ๆ กัน',
    },
  ],
};

export const alternate: Story = {
  ...demo,
  to: 'เจ้าดวงอาทิตย์',
  from: 'มนุษย์กลางคืน',
  date: '2024-02-29',
  title: 'The best days start with you.',
  letter:
    'ถึงคนที่ทำให้ทุกวันสดใส\nไม่ว่าจะเดินทางไปที่ไหน อยากให้รู้ว่ามีคนตรงนี้คอยส่งกำลังใจให้เสมอ',
  secret: 'จองโต๊ะร้านโปรดไว้แล้ว เจอกันหกโมงนะ',
  closing: 'ขอให้เป็นปีที่ใจดีกับเธอ',
  moments: [...demo.moments]
    .reverse()
    .map((m, i) => ({
      ...m,
      id: `alt-${i}`,
      title: [
        'วันที่ยิ้มกว้าง',
        'เมืองที่อยากกลับไป',
        'แสงเช้าวันอาทิตย์',
        'มื้อเย็นแสนพิเศษ',
      ][i],
    })),
};

const safeImage = (src: string | null | undefined) => {
  if (!src) return '/images/coffee.jpg';
  // Data from a future editor stays text/URLs; never interpolate HTML or active schemes.
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(src)) return src;
  if (/^\/(?!\/)/.test(src)) return src;
  try {
    if (new URL(src).protocol === 'https:') return src;
  } catch {
    /* fallback */
  }
  return '/images/coffee.jpg';
};

/** A small adapter for future editor integration; no API or storage dependency. */
export function fromCardData(card: CardData): Story {
  return {
    to: card.to || 'คนโปรด',
    from: card.from || 'คนข้าง ๆ',
    date: card.startDate || '2022-06-14',
    title: card.endMsg || demo.title,
    letter: card.letter || demo.letter,
    secret: card.secret || demo.secret,
    closing: card.endMsg || demo.closing,
    moments: card.photos.length
      ? card.photos.map((photo, i) => ({
          id: `photo-${i}`,
          date: photo.date || card.startDate || '2022-06-14',
          title: photo.cap || `ความทรงจำที่ ${i + 1}`,
          note: photo.cap || card.letter,
          image: safeImage(photo.src),
          alt: photo.cap || `ภาพความทรงจำที่ ${i + 1}`,
          place: '',
        }))
      : [
          {
            ...demo.moments[0],
            title: 'เรื่องราวของเรา',
            note: card.letter || demo.letter,
            image: safeImage(card.cover),
          },
        ],
  };
}

export const shortDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
};
