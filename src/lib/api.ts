import { R2_MEDIA_ENABLED, TURNSTILE_SITE_KEY, createR2Card } from './media-v3';
import type { CardData, CreatedCard, ThemeId } from '../types';
import { jpeg } from './images';
import { occasionOf } from './occasion';

export const API = (
  import.meta.env.VITE_API_URL || 'https://api.luvnote.fun'
).replace(/\/$/, '');
const BODY_LIMIT = 1_850_000;

export async function createCard(
  theme: ThemeId,
  data: CardData,
  signal: AbortSignal,
  turnstileToken?: string,
): Promise<CreatedCard> {
  signal.throwIfAborted();
  if (R2_MEDIA_ENABLED) {
    if (!TURNSTILE_SITE_KEY) throw new Error('media_not_configured');
    return createR2Card(theme, data, turnstileToken || '', signal);
  }
  const payload = {
    ...data,
    photos: await Promise.all(
      data.photos.map(async (p) => ({
        ...p,
        src: await jpeg(p.src, 900, 0.78),
      })),
    ),
  };
  delete payload.expires;
  if (payload.cover) payload.cover = await jpeg(payload.cover, 700, 0.78);
  let body = JSON.stringify({ theme, occasion: occasionOf(theme), data: payload });
  if (new TextEncoder().encode(body).length > BODY_LIMIT) {
    payload.photos = await Promise.all(
      payload.photos.map(async (p) => ({
        ...p,
        src: await jpeg(p.src, 700, 0.7),
      })),
    );
    body = JSON.stringify({ theme, occasion: occasionOf(theme), data: payload });
  }
  if (new TextEncoder().encode(body).length > BODY_LIMIT)
    throw new Error('too_large');
  signal.throwIfAborted();
  const response = await fetch(`${API}/v2/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal,
  });
  const result = await response.json().catch(() => ({}));
  if (
    !response.ok ||
    !/^[a-z0-9]{7}$/.test(result.id) ||
    !Number.isFinite(result.expires)
  ) {
    throw new Error(result.error || `http_${response.status}`);
  }
  return result as CreatedCard;
}
