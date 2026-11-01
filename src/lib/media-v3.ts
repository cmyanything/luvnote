import type { CardData, CreatedCard, ThemeId } from '../types';
import { jpeg } from './images';

const API = (import.meta.env.VITE_API_URL || 'https://api.luvnote.fun').replace(/\/$/, '');
const ENABLED = import.meta.env.VITE_R2_MEDIA_ENABLED === 'true';
export const R2_MEDIA_ENABLED = ENABLED;
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

type Session = { sessionId: string; uploadToken: string; expires: number };
type Uploaded = { id: string };
// Memory only. Never store upload bearer capabilities in URLs, localStorage or logs.
let pending: { fingerprint: string; session: Session; ids: Map<string,string>; keys: Map<string,string> } | null = null;

async function responseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (['session_invalid','upload_failed','upload_limit_or_conflict'].includes(String(data.error))) pending = null;
    throw new Error(typeof data.error === 'string' ? data.error : 'http_' + res.status);
  }
  return data as unknown as T;
}

async function uploadJpeg(
  session: Session, source: string, kind: 'photo' | 'cover', key: string, signal: AbortSignal,
): Promise<string> {
  // PhotoPicker already resized, normalized orientation and encoded this JPEG.
  // Avoid decoding/re-encoding it again on every upload or retry.
  const dataUrl = source.startsWith('data:image/jpeg;base64,')
    ? source
    : await jpeg(source, kind === 'cover' ? 700 : 900, 0.78);
  const binary = await fetch(dataUrl, { signal }).then((res) => res.blob());
  if (binary.size > 1_500_000) throw new Error('too_large');
  const res = await fetch(
    API + '/v3/upload-sessions/' + session.sessionId + '/media?kind=' + kind,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + session.uploadToken, 'Idempotency-Key': key },
      body: binary,
      signal,
    },
  );
  // A declared server upload failure leaves a failed journal; a fresh session lets
  // the next click recover. Network/receipt loss retains the key for safe replay.
  if (res.status >= 500) pending = null;
  const uploaded = await responseJson<Uploaded>(res);
  if (!/^[0-9a-f-]{36}$/.test(uploaded.id)) throw new Error('bad_upload_receipt');
  return uploaded.id;
}

type Send = (session: Session, payload: Record<string, unknown>) => Promise<Response>;

// Upload every photo once into a fresh guest session, then send the card (new or edit).
async function uploadAndSend(
  target: string, theme: ThemeId, data: CardData, turnstileToken: string, signal: AbortSignal, send: Send,
): Promise<CreatedCard & { session: Session }> {
  if (!turnstileToken) throw new Error('verification_required');
  signal.throwIfAborted();
  const fingerprint = JSON.stringify({ target, theme, data });
  if (!pending || pending.fingerprint !== fingerprint || pending.session.expires <= Date.now()) {
  const sessionResponse = await fetch(API + '/v3/upload-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstileToken }),
    signal,
  });
  const session = await responseJson<Session>(sessionResponse);
  if (!/^[0-9a-f-]{36}$/.test(session.sessionId) ||
      !/^[0-9a-f]{64}$/.test(session.uploadToken) || !Number.isFinite(session.expires) || session.expires <= Date.now()) throw new Error('bad_session_receipt');
  pending = { fingerprint, session, ids: new Map(), keys: new Map() };
  }
  const attempt = pending;
  const { session } = attempt;
  const upload = async (source: string, kind: 'photo' | 'cover', slot: string) => {
    const existing = attempt.ids.get(slot);
    if (existing) return existing;
    const key = attempt.keys.get(slot) || crypto.randomUUID();
    attempt.keys.set(slot,key);
    const id = await uploadJpeg(session,source,kind,key,signal);
    attempt.ids.set(slot,id);
    return id;
  };
  const photos = [];
  for (const [index, photo] of data.photos.entries()) {
    signal.throwIfAborted();
    const id = await upload(photo.src, 'photo', 'photo:' + index);
    photos.push({ id, cap: photo.cap, ...(photo.date ? { date: photo.date } : {}) });
  }
  const cover_id = data.cover ? await upload(data.cover, 'cover', 'cover') : null;
  const payload = {
    ...data,
    photos,
    cover: undefined,
    cover_id,
    expires: undefined,
  };
  signal.throwIfAborted();
  const card = await responseJson<CreatedCard>(await send(session, payload));
  if (!/^[a-z0-9]{7}$/.test(card.id) || !Number.isFinite(card.expires))
    throw new Error('bad_card_receipt');
  pending = null;
  return { id: card.id, expires: card.expires, session };
}

export async function createR2Card(
  theme: ThemeId, data: CardData, turnstileToken: string, signal: AbortSignal,
): Promise<CreatedCard> {
  const card = await uploadAndSend('new', theme, data, turnstileToken, signal, (session, payload) =>
    fetch(API + '/v3/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.uploadToken },
      body: JSON.stringify({ theme, sessionId: session.sessionId, data: payload }),
      signal,
    }));
  // The publishing token becomes the owner's edit key; the server keeps only its hash.
  return { id: card.id, expires: card.expires, editKey: card.session.uploadToken };
}

export async function editR2Card(
  theme: ThemeId, cardId: string, editKey: string, data: CardData, turnstileToken: string, signal: AbortSignal,
): Promise<CreatedCard> {
  const card = await uploadAndSend('edit:' + cardId, theme, data, turnstileToken, signal, (session, payload) =>
    fetch(API + '/v3/cards/' + cardId + '/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.uploadToken },
      body: JSON.stringify({ theme, sessionId: session.sessionId, editKey, data: payload }),
      signal,
    }));
  return { id: card.id, expires: card.expires, editKey };
}

export interface LoadedCard {
  theme: ThemeId;
  expires: number;
  data: Omit<CardData, 'expires'>;
}

async function asDataUrl(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('media_unavailable');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('media_unavailable'));
    reader.readAsDataURL(blob);
  });
}

// Load an existing card for its owner. Photos become data URLs so the editor treats them like new picks.
export async function loadCardForEdit(cardId: string, signal: AbortSignal): Promise<LoadedCard> {
  const res = await fetch(API + '/v2/cards/' + cardId, { signal });
  if (res.status === 410) throw new Error('expired');
  const card = await responseJson<LoadedCard>(res);
  const photos = await Promise.all((card.data.photos || []).map(async (p) => ({
    src: await asDataUrl(p.src, signal), cap: p.cap || '', ...(p.date ? { date: p.date } : {}),
  })));
  const cover = card.data.cover ? await asDataUrl(card.data.cover, signal) : null;
  return { ...card, data: { ...card.data, photos, cover } };
}
