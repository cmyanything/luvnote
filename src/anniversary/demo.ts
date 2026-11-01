import type { CardData } from '../types';

function illustration(scene: string, background: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700"><defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".05"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><rect width="600" height="700" fill="${background}"/><g filter="url(#paper)">${scene}</g><rect x="20" y="20" width="560" height="660" rx="5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></svg>`)}`;
}

export const COFFEE_ART = illustration(
  `<rect y="420" width="600" height="280" fill="#bba58a"/><rect x="70" y="55" width="460" height="365" rx="160" fill="#d5d9c4"/><path d="M300 55v365M70 250h460" stroke="#eee9dc" stroke-width="14"/><path d="M80 420q110-100 220 0q110-140 220 0" fill="#a2ae87"/><ellipse cx="300" cy="510" rx="220" ry="65" fill="#8e785d" opacity=".17"/><g stroke="#72614e" stroke-width="5" stroke-linejoin="round"><path d="M118 398h150v99q-75 59-150 0z" fill="#f5eee0"/><path d="M268 415q68-10 49 49q-12 26-49 18" fill="none"/><ellipse cx="193" cy="399" rx="75" ry="18" fill="#78634e"/><path d="M338 420h130v89q-65 50-130 0z" fill="#d3aa94"/><path d="M468 434q58-6 41 43q-12 25-41 19" fill="none"/><ellipse cx="403" cy="420" rx="65" ry="16" fill="#82664e"/></g><g fill="none" stroke="#f9f4e9" stroke-width="6" stroke-linecap="round" opacity=".7"><path d="M180 345q-22-30 1-52t0-52M216 344q-22-30 1-52"/><path d="M391 367q-22-30 1-52t0-52"/></g><path d="M278 570q22-31 44 0q22-31 44 0q0 25-44 51q-44-26-44-51" fill="#9b624c" opacity=".7"/>`,
  '#e9dfcc',
);

export const SEA_ART = illustration(
  `<rect y="270" width="600" height="430" fill="#9eafa5"/><circle cx="320" cy="240" r="95" fill="#e8bc8f"/><path d="M0 290q120-35 240 0t240 0t240 0" fill="none" stroke="#f4e7d0" stroke-width="12"/><path d="M0 370q120-35 240 0t240 0t240 0M0 440q120-35 240 0t240 0t240 0M0 510q120-35 240 0t240 0t240 0" fill="none" stroke="#d9dfc9" stroke-opacity=".7" stroke-width="5"/><path d="M0 590q250-125 600-25v135H0z" fill="#d7c5a6"/><g fill="#6f735b"><circle cx="240" cy="462" r="27"/><path d="M208 490q34-18 68 0l19 120H194z"/><circle cx="339" cy="470" r="25"/><path d="M308 496q31-18 62 0l25 112h-104z"/></g><path d="M270 533l38 16" stroke="#6f735b" stroke-width="15" stroke-linecap="round"/><path d="M110 150q20-20 40 0q20-20 40 0M430 105q16-16 32 0q16-16 32 0" fill="none" stroke="#a28f73" stroke-width="3"/>`,
  '#eadbc0',
);

export const FLOWER_ART = illustration(
  `<rect width="600" height="700" fill="#e8e6d6"/><path d="M0 580q300-80 600 0v120H0z" fill="#c5b294"/><ellipse cx="300" cy="600" rx="140" ry="26" fill="#aa987c" opacity=".25"/><path d="M220 390q80-30 160 0l-25 198q-55 30-110 0z" fill="#d3b6a0" stroke="#8f7d62" stroke-width="3"/><g fill="none" stroke="#7b8a64" stroke-width="6"><path d="M290 420q-30-160-90-230M310 420q20-190 100-240M310 400q-15-140 0-260"/></g><g fill="#97a077"><ellipse cx="242" cy="310" rx="45" ry="13" transform="rotate(35 242 310)"/><ellipse cx="348" cy="295" rx="45" ry="13" transform="rotate(-35 348 295)"/><ellipse cx="282" cy="245" rx="35" ry="12" transform="rotate(45 282 245)"/></g><g fill="#eee6c8" stroke="#c4ab88" stroke-width="2">${[
    [195, 185],
    [410, 180],
    [310, 140],
  ]
    .map(
      ([x, y]) =>
        `<g transform="translate(${x} ${y})">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cy="-27" rx="13" ry="25" transform="rotate(${a})"/>`).join('')}<circle r="14" fill="#b49b65"/></g>`,
    )
    .join('')}</g>`,
  '#e8e6d6',
);

export const DEMO: CardData = {
  to: 'คนโปรด',
  from: 'คนข้าง ๆ',
  age: null,
  startDate: '2022-06-14',
  photos: [
    { src: COFFEE_ART, cap: 'กาแฟแก้วแรก กับคนที่ใช่', date: '2022-06-14' },
    { src: SEA_ART, cap: 'ทะเลครั้งนั้น ยังจำได้เสมอ', date: '2023-02-18' },
    {
      src: FLOWER_ART,
      cap: 'วันธรรมดา ที่พิเศษเพราะมีเธอ',
      date: '2024-06-14',
    },
  ],
  letter:
    'จากวันแรกที่เราได้รู้จักกัน\nจนถึงวันนี้ที่กลายเป็นคนข้าง ๆ\n\nขอบคุณที่ทำให้เรื่องเล็ก ๆ กลายเป็นความทรงจำที่อยากเก็บไว้ ขอบคุณที่เป็นความสบายใจ และยังจับมือกันในวันที่ไม่ง่าย\n\nถ้าชีวิตเป็นสมุดเล่มหนึ่ง เราก็อยากมีเธออยู่ในทุกหน้าต่อจากนี้นะ',
  secret: 'ปีหน้า กลับไปจิบกาแฟร้านแรกของเราด้วยกันอีกนะ ♡',
  lock: { type: 'seal', code: '', hint: '' },
  effect: 'hearts',
  music: { type: 'demo' },
  endMsg: 'หน้าต่อไปของเรา\nยังอยากมีเธออยู่ด้วยเสมอ ♡',
};
