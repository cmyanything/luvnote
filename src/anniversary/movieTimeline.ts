import { gsap } from 'gsap';

/**
 * The Our Story film as one GSAP timeline. It is the same film as the
 * HyperFrames project in film/our-story, played live in the browser with the
 * card's own names, dates, photos and letter. All positions are in the
 * 540×960 stage's own pixels; the stage is scaled to fit the screen.
 */
export type MoviePlan = {
  photos: number;
  days: number;
  letter: boolean;
  reduce: boolean;
};

const COVER = 5;
const CHAPTER = 4;
const NAMES = 4.4;
const COUNT = 5;
const MOMENT = 4.4;
const STRIP = 6;
const COLLAGE = 5.4;
const END = 4.2;

const ARRIVALS: gsap.TweenVars[] = [
  { y: -620, rotation: -16 },
  { x: -640, rotation: 12 },
  { rotationY: -85, transformPerspective: 1100 },
  { y: 760, rotation: -6 },
  { scale: 1.5, opacity: 0 },
];
const EXITS: gsap.TweenVars[] = [
  { x: -640, rotation: -18 },
  { y: 780, rotation: 8 },
  { x: 640, rotation: 16 },
  { y: -780, rotation: -10 },
  { scale: 0.6, y: -130, opacity: 0 },
];
const ROTATIONS = [-3, 2.5, -2, 3, -1.5];
const DRIFTS = [
  [4, -3],
  [-5, 2],
  [3, 4],
  [-4, -2],
  [2, -4],
];
const SPOTS: Record<number, number[][]> = {
  2: [
    [-110, -40, -6],
    [110, 60, 5],
  ],
  3: [
    [-115, -150, -7],
    [115, -90, 6],
    [0, 120, -2],
  ],
  4: [
    [-115, -165, -8],
    [110, -140, 6],
    [-108, 130, 5],
    [118, 150, -7],
  ],
  5: [
    [-115, -165, -8],
    [110, -140, 6],
    [-108, 130, 5],
    [118, 150, -7],
    [0, -5, -2],
  ],
};

export function letterSeconds(text: string) {
  return Math.min(18, Math.max(8, 6 + text.length * 0.018));
}

export function buildMovie(
  root: HTMLElement,
  plan: MoviePlan,
  letterLength: number,
  onEnd: () => void,
) {
  const q = gsap.utils.selector(root);
  const tl = gsap.timeline({ paused: true });
  const { reduce } = plan;
  const n = Math.min(5, plan.photos);

  const scene = (name: string, start: number, length: number) => {
    tl.set(q(`[data-scene="${name}"]`), { autoAlpha: 1 }, start);
    tl.set(q(`[data-scene="${name}"]`), { autoAlpha: 0 }, start + length);
  };
  // Every arrival either moves (normal) or simply fades (reduced motion).
  const arrive = (
    target: string,
    from: gsap.TweenVars,
    to: gsap.TweenVars,
    at: number,
  ) =>
    reduce
      ? tl.fromTo(
          q(target),
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: 'power1.out' },
          at,
        )
      : tl.fromTo(q(target), from, to, at);
  const blurIn = (target: string, at: number, duration = 0.9) =>
    arrive(
      target,
      { opacity: 0, filter: 'blur(6px)' },
      { opacity: 1, filter: 'blur(0px)', duration, ease: 'power3.out' },
      at,
    );
  const blurOut = (target: string, at: number, duration = 0.35) =>
    tl.to(
      q(target),
      reduce
        ? { opacity: 0, duration }
        : { opacity: 0, filter: 'blur(5px)', duration, ease: 'power2.in' },
      at,
    );
  const write = (target: string, at: number, duration: number) =>
    arrive(
      target,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      {
        clipPath: 'inset(0% -4% 0% 0%)',
        duration,
        ease: 'power2.inOut',
      },
      at,
    );
  const leak = (at: number) => {
    if (reduce) return;
    tl.fromTo(
      q('[data-fx="leak"]'),
      { opacity: 0, x: -45 },
      {
        keyframes: [
          { opacity: 0.85, x: -10, duration: 0.6, ease: 'power2.out' },
          { opacity: 0, x: 45, duration: 1.4, ease: 'power1.in' },
        ],
      },
      Math.max(0, at),
    );
  };

  let t = 0;
  /* 1 · the book: on screen at once, the cover opens, the camera falls into page one */
  scene('cover', t, COVER);
  if (!reduce) {
    tl.fromTo(
      q('[data-m="cover-cam"]'),
      { y: 13, scale: 0.97 },
      { y: 0, scale: 1, duration: 2.2, ease: 'power2.out' },
      t,
    );
    tl.fromTo(
      q('[data-m="cover-lid"]'),
      { rotationY: 0 },
      { rotationY: -168, duration: 1.5, ease: 'power2.inOut' },
      t + 2.5,
    );
    tl.to(
      q('[data-m="cover-cam"]'),
      { scale: 3.4, y: 80, duration: 1, ease: 'power3.in' },
      t + 3.9,
    );
    tl.to(q('[data-m="cover-page"]'), { opacity: 0, duration: 0.25 }, t + 4.7);
  } else {
    tl.to(q('[data-m="cover-lid"]'), { opacity: 0, duration: 0.6 }, t + 2.5);
    tl.to(q('[data-m="cover-cam"]'), { opacity: 0, duration: 0.5 }, t + 4.3);
  }
  t += COVER;

  /* 2 · chapter line, phrase by phrase */
  scene('chapter', t, CHAPTER);
  blurIn('[data-m="ch-eyebrow"]', t, 0.6);
  if (reduce) blurIn('[data-m="ch-line"] span', t + 0.5, 0.6);
  else
    tl.fromTo(
      q('[data-m="ch-line"] span'),
      { opacity: 0, filter: 'blur(6px)' },
      {
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.32,
      },
      t + 0.5,
    );
  blurOut('[data-scene="chapter"] .mv-center', t + CHAPTER - 0.4);
  t += CHAPTER;

  /* 3 · names, written left to right like a pen */
  scene('names', t, NAMES);
  write('[data-m="names"]', t + 0.3, 2);
  blurIn('[data-m="since"]', t + 1.9, 0.8);
  blurOut('[data-scene="names"] .mv-center', t + NAMES - 0.4);
  t += NAMES;

  /* 4 · days together: the ring draws itself while the number climbs */
  scene('count', t, COUNT);
  blurIn('[data-m="count-pre"]', t + 0.1, 0.6);
  arrive(
    '[data-m="ring"]',
    { opacity: 0, scale: 0.92 },
    { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' },
    t + 0.4,
  );
  tl.fromTo(
    q('[data-m="ring-line"]'),
    { strokeDashoffset: 1822 },
    { strokeDashoffset: 0, duration: 2.8, ease: 'power2.inOut' },
    t + 0.5,
  );
  const counter = { value: 0 };
  const number = q('[data-m="count"]')[0];
  tl.fromTo(
    counter,
    { value: 0 },
    {
      value: plan.days,
      duration: 2.6,
      ease: 'power3.out',
      onUpdate: () => {
        if (number)
          number.textContent = Math.round(counter.value).toLocaleString(
            'en-US',
          );
      },
    },
    t + 0.7,
  );
  blurIn('[data-m="count-post"]', t + 2.9, 0.6);
  blurOut('[data-scene="count"] .mv-center', t + COUNT - 0.4);
  t += COUNT;

  /* 5 · moments: each polaroid arrives its own way, the photo drifts, the caption is typed */
  for (let i = 0; i < n; i++) {
    const at = t;
    scene(`m${i}`, at, MOMENT);
    blurIn(`[data-m="m${i}-date"]`, at + 0.15, 0.7);
    arrive(
      `[data-m="m${i}-pol"]`,
      { x: 0, y: 0, scale: 1, opacity: 1, rotationY: 0, ...ARRIVALS[i] },
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        rotationY: 0,
        rotation: ROTATIONS[i],
        duration: 1.15,
        ease: 'expo.out',
      },
      at + 0.05,
    );
    if (!reduce)
      tl.fromTo(
        q(`[data-m="m${i}-img"]`),
        { scale: 1.24, xPercent: DRIFTS[i][0], yPercent: DRIFTS[i][1] },
        {
          scale: 1.02,
          xPercent: 0,
          yPercent: 0,
          duration: 4.3,
          ease: 'sine.out',
        },
        at,
      );
    arrive(
      `[data-m="m${i}-cap"]`,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'steps(16)' },
      at + 1.2,
    );
    tl.to(
      q(`[data-m="m${i}-pol"]`),
      reduce
        ? { opacity: 0, duration: 0.4 }
        : { ...EXITS[i], duration: 0.5, ease: 'power3.in' },
      at + MOMENT - 0.55,
    );
    blurOut(`[data-m="m${i}-date"]`, at + MOMENT - 0.55, 0.3);
    leak(at - 0.2);
    t += MOMENT;
  }

  /* 6 · film strip of every photo */
  if (n >= 2) {
    scene('strip', t, STRIP);
    blurIn('[data-m="strip-eyebrow"]', t + 0.2, 0.7);
    arrive(
      '[data-m="strip"]',
      { opacity: 0, scaleY: 0.2 },
      { opacity: 1, scaleY: 1, duration: 0.7, ease: 'expo.out' },
      t + 0.05,
    );
    if (!reduce) {
      const track = q('[data-m="strip-track"]')[0];
      const travel = track ? Math.max(0, track.scrollWidth / 2) : 1100;
      tl.fromTo(
        track,
        { x: 0 },
        { x: -travel, duration: STRIP, ease: 'none' },
        t,
      );
    }
    blurIn('[data-m="strip-line"]', t + 1.4, 0.8);
    tl.to(
      q('[data-m="strip"]'),
      reduce
        ? { opacity: 0, duration: 0.4 }
        : { scaleY: 0, opacity: 0, duration: 0.4, ease: 'power3.in' },
      t + STRIP - 0.45,
    );
    blurOut(
      '[data-m="strip-eyebrow"], [data-m="strip-line"]',
      t + STRIP - 0.45,
      0.3,
    );
    t += STRIP;
  }

  /* 7 · the letter slides up and is written top to bottom */
  if (plan.letter) {
    const length = letterSeconds('x'.repeat(letterLength));
    scene('letter', t, length);
    arrive(
      '[data-m="letter"]',
      { y: 650, rotation: 2 },
      { y: 0, rotation: 0, duration: 1.1, ease: 'expo.out' },
      t,
    );
    const ink = length - 2.2;
    const view = q('[data-m="letter-view"]')[0];
    const text = q('[data-m="letter-text"]')[0];
    const overflow =
      view && text ? Math.max(0, text.scrollHeight - view.clientHeight) : 0;
    if (reduce) blurIn('[data-m="letter-text"]', t + 0.9, 0.8);
    else {
      tl.fromTo(
        text,
        { '--ink': '-8%' },
        { '--ink': '108%', duration: ink, ease: 'none' },
        t + 0.9,
      );
      if (overflow)
        tl.fromTo(
          text,
          { y: 0 },
          { y: -overflow, duration: ink, ease: 'none' },
          t + 0.9,
        );
    }
    tl.to(
      q('[data-m="letter"]'),
      reduce
        ? { opacity: 0, duration: 0.4 }
        : {
            y: -30,
            scale: 0.94,
            opacity: 0,
            filter: 'blur(5px)',
            duration: 0.45,
            ease: 'power3.in',
          },
      t + length - 0.5,
    );
    t += length;
  }

  /* 8 · every polaroid lands in a collage while the camera pulls back */
  if (n >= 2) {
    scene('collage', t, COLLAGE);
    SPOTS[n].forEach(([x, y, rotation], i) =>
      arrive(
        `[data-m="c${i}"]`,
        { x: 0, y: 350, scale: 0.6, rotation: 0, opacity: 0 },
        {
          x,
          y,
          scale: 1,
          rotation,
          opacity: 1,
          duration: 1.2,
          ease: 'expo.out',
        },
        t + 0.15 + i * 0.22,
      ),
    );
    if (!reduce)
      tl.fromTo(
        q('[data-m="collage"]'),
        { scale: 1.16 },
        { scale: 0.96, duration: 5.2, ease: 'power2.out' },
        t,
      );
    blurIn('[data-m="collage-line"]', t + 2, 0.8);
    blurOut('[data-m="collage"], [data-m="collage-line"]', t + COLLAGE - 0.4);
    leak(t - 0.2);
    t += COLLAGE;
  }

  /* 9 · end card, then the replay buttons */
  tl.set(q('[data-scene="end"]'), { autoAlpha: 1 }, t);
  blurIn('[data-m="end-eyebrow"]', t + 0.1, 0.7);
  arrive(
    '[data-m="end-names"]',
    { opacity: 0, filter: 'blur(8px)', y: 7 },
    { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1, ease: 'power3.out' },
    t + 0.6,
  );
  if (!reduce)
    tl.fromTo(
      q('[data-m="end-heart"]'),
      { scale: 1 },
      {
        keyframes: [
          { scale: 1.2, duration: 0.18, ease: 'power2.out' },
          { scale: 1, duration: 0.22, ease: 'power2.in' },
          { scale: 1.12, duration: 0.18, ease: 'power2.out' },
          { scale: 1, duration: 0.4, ease: 'power2.in' },
        ],
        repeat: 2,
        repeatDelay: 0.25,
      },
      t + 1.4,
    );
  blurIn('[data-m="end-msg"]', t + 1.5, 0.8);
  t += END;
  tl.call(onEnd, [], t);

  /* atmosphere: dust drifting up and film grain, for the whole film */
  if (!reduce) {
    q('[data-fx="dust"] i').forEach((mote, i) => {
      tl.fromTo(
        mote,
        { y: 0, x: 0 },
        {
          y: -(110 + ((i * 37) % 210)),
          x: ((i * 23) % 40) - 20,
          duration: t,
          ease: 'none',
        },
        0,
      );
    });
    tl.fromTo(
      q('[data-fx="grain"]'),
      { backgroundPosition: '0px 0px' },
      {
        backgroundPosition: `${Math.round(t * 5) * 97}px ${Math.round(t * 5) * 65}px`,
        duration: t,
        ease: `steps(${Math.round(t * 5)})`,
      },
      0,
    );
  }
  return tl;
}
