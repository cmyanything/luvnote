import type { CardData, CreatedCard, ThemeId } from '../types';
import { jpeg } from './images';

const API = (import.meta.env.VITE_API_URL || 'https://api.luvnote.fun').replace(/\/$/, '');
const ENABLED = import.meta.env.VITE_R2_MEDIA_ENABLED === 'true';
export const R2_MEDIA_ENABLED = ENABLED;
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

type Session = { sessionId: string; uploadToken: string; expires: number };
type Uploaded = { id: string };

async function responseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'http_' + res.status);
  return data as unknown as T;
}

async function uploadJpeg(
  session: Session, source: string, kind: 'photo' | 'cover', signal: AbortSignal,
): Promise<string> {
  const dataUrl = await jpeg(source, kind === 'cover' ? 700 : 900, 0.78);
  const binary = await fetch(dataUrl, { signal }).then((res) => res.blob());
  if (binary.size > 1_500_000) throw new Error('too_large');
  const res = await fetch(
    API + '/v3/upload-sessions/' + session.sessionId + '/media?kind=' + kind,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + session.uploadToken },
      body: binary,
      signal,
    },
  );
  const uploaded = await responseJson<Uploaded>(res);
  if (!/^[0-9a-f-]{36}$/.test(uploaded.id)) throw new Error('bad_upload_receipt');
  return uploaded.id;
}

export async function createR2Card(
  theme: ThemeId, data: CardData, turnstileToken: string, signal: AbortSignal,
): Promise<CreatedCard> {
  if (!turnstileToken) throw new Error('verification_required');
  signal.throwIfAborted();
  const sessionResponse = await fetch(API + '/v3/upload-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstileToken }),
    signal,
  });
  const session = await responseJson<Session>(sessionResponse);
  if (!/^[0-9a-f-]{36}$/.test(session.sessionId) ||
      !/^[0-9a-f]{64}$/.test(session.uploadToken)) throw new Error('bad_session_receipt');
  const photos = [];
  for (const photo of data.photos) {
    signal.throwIfAborted();
    const id = await uploadJpeg(session, photo.src, 'photo', signal);
    photos.push({ id, cap: photo.cap });
  }
  const cover_id = data.cover ? await uploadJpeg(session, data.cover, 'cover', signal) : null;
  const payload = {
    ...data,
    photos,
    cover: undefined,
    cover_id,
    expires: undefined,
  };
  signal.throwIfAborted();
  const response = await fetch(API + '/v3/cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + session.uploadToken,
    },
    body: JSON.stringify({ theme, sessionId: session.sessionId, data: payload }),
    signal,
  });
  const card = await responseJson<CreatedCard>(response);
  if (!/^[a-z0-9]{7}$/.test(card.id) || !Number.isFinite(card.expires))
    throw new Error('bad_card_receipt');
  return card;
}
