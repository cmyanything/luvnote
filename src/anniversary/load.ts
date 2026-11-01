import type { CardData, Photo } from '../types';
import { API } from '../lib/api';
import { validDate } from '../lib/dates';
import { DEMO } from './demo';

export class CardLoadError extends Error {
  constructor(public kind: 'expired' | 'missing' | 'network') {
    super(kind);
  }
}

// Legacy cards embed JPEG data URLs; R2 cards reference the API's private media route.
const R2_MEDIA = /^https?:\/\/[^/?#]+\/v3\/cards\/[a-z0-9]{7}\/media\/[0-9a-f-]{36}$/;
function safeImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value) || R2_MEDIA.test(value))
  );
}

/** Only accept the same data shape as the API; user text stays text in React. */
export function normalizeCard(value: unknown): CardData {
  const d =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const string = (key: string, limit: number) =>
    typeof d[key] === 'string' ? (d[key] as string).slice(0, limit) : '';
  const lock =
    d.lock && typeof d.lock === 'object'
      ? (d.lock as Record<string, unknown>)
      : {};
  const music =
    d.music && typeof d.music === 'object'
      ? (d.music as Record<string, unknown>)
      : {};
  const photos: Photo[] = Array.isArray(d.photos)
    ? d.photos.slice(0, 5).flatMap((photo) => {
        if (!photo || typeof photo !== 'object' || !safeImage(photo.src))
          return [];
        return [
          {
            src: photo.src,
            cap: typeof photo.cap === 'string' ? photo.cap.slice(0, 40) : '',
            ...(validDate(photo.date) ? { date: photo.date } : {}),
          },
        ];
      })
    : [];
  return {
    to: string('to', 40),
    from: string('from', 40),
    age: null,
    startDate: validDate(d.startDate as string) ? (d.startDate as string) : '',
    letter: string('letter', 700),
    secret: string('secret', 140),
    endMsg: string('endMsg', 140),
    photos,
    ...(safeImage(d.cover) ? { cover: d.cover } : {}),
    lock: {
      type:
        lock.type === 'code' && /^\d{4}$/.test(String(lock.code))
          ? 'code'
          : 'seal',
      code: /^\d{4}$/.test(String(lock.code)) ? String(lock.code) : '',
      hint: typeof lock.hint === 'string' ? lock.hint.slice(0, 60) : '',
    },
    effect: ['hearts', 'stars', 'confetti'].includes(String(d.effect))
      ? String(d.effect)
      : 'hearts',
    music:
      music.type === 'youtube' &&
      typeof music.id === 'string' &&
      /^[\w-]{11}$/.test(music.id)
        ? {
            type: 'youtube',
            id: music.id,
            start: Math.min(36000, Math.max(0, Number(music.start) || 0)),
          }
        : { type: 'demo' },
  };
}

export async function loadCard(): Promise<{ card: CardData; demo: boolean }> {
  const hash = location.hash.slice(1);
  if (hash === 'preview') {
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;
      function finish(card: CardData, demo: boolean) {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        resolve({ card, demo });
      }
      function receive(event: MessageEvent) {
        if (
          event.origin !== location.origin ||
          event.source !== parent ||
          event.data?.type !== 'luvnote-card'
        )
          return;
        const value = event.data.card;
        if (!value || typeof value !== 'object') return;
        const empty = Object.keys(value).length === 0;
        finish(empty ? DEMO : normalizeCard(value), empty);
      }
      window.addEventListener('message', receive);
      timer = setTimeout(() => finish(DEMO, true), 4000);
      if (parent !== window)
        parent.postMessage({ type: 'luvnote-ready' }, location.origin);
    });
  }
  if (!hash || hash === 'demo') return { card: DEMO, demo: true };
  if (!/^[a-z0-9]{7}$/.test(hash)) throw new CardLoadError('missing');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API}/v2/cards/${hash}`, {
      signal: controller.signal,
    });
    if (response.status === 410) throw new CardLoadError('expired');
    if (response.status === 404) throw new CardLoadError('missing');
    if (!response.ok) throw new CardLoadError('network');
    const result = await response.json();
    if (
      result.theme !== 'anniversary-journey' ||
      !result.data ||
      !validDate(result.data.startDate)
    )
      throw new CardLoadError('missing');
    return { card: normalizeCard(result.data), demo: false };
  } catch (error) {
    throw error instanceof CardLoadError ? error : new CardLoadError('network');
  } finally {
    clearTimeout(timeout);
  }
}
