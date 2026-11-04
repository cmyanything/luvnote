import type { CardData, ChatRow, EditorState, ThemeConfig } from '../types';
import { today, validDate } from './dates';

export function youtubeId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
    if (host === 'youtube.com') {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : (url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ??
            null);
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function seconds(value: string): number {
  const parts = value.trim().split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  return Math.min(
    36000,
    Math.round(parts.reduce((total, n) => total * 60 + n, 0)),
  );
}

export function youtubeStart(value: string): string {
  try {
    const url = new URL(value);
    const time =
      url.searchParams.get('t') || url.searchParams.get('start') || '';
    const match = time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    if (!match) return '';
    const total = Math.min(
      36000,
      Number(match[1] || 0) * 3600 +
        Number(match[2] || 0) * 60 +
        Number(match[3] || 0),
    );
    return total
      ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
      : '';
  } catch {
    return '';
  }
}

export function cleanChat(rows: ChatRow[]): ChatRow[] {
  return rows.flatMap((row): ChatRow[] => {
    if (row.w === 'pic' || row.w === 'stk') return [{ ...row }];
    if (row.w === 't') {
      const options = row.o
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      return options.length ? [{ w: 't', o: options }] : [];
    }
    return row.x.trim() ? [{ w: row.w, x: row.x.trim() }] : [];
  });
}

export type InvalidField =
  'to' | 'from' | 'letter' | 'secret' | 'code' | 'chat' | 'startDate';
export function invalidFields(
  state: EditorState,
  hasChat: boolean,
  anniversary = false,
  noSecret = false,
): InvalidField[] {
  const errors: InvalidField[] = [];
  if (!state.to.trim()) errors.push('to');
  if (!state.from.trim()) errors.push('from');
  if (anniversary && (!validDate(state.startDate) || state.startDate > today()))
    errors.push('startDate');
  if (hasChat && !cleanChat(state.chat).some((row) => row.w === 'f'))
    errors.push('chat');
  if (!state.letter.trim()) errors.push('letter');
  if (!noSecret) {
    if (!state.secret.trim()) errors.push('secret');
    if (state.lock === 'code' && !/^\d{4}$/.test(state.code)) errors.push('code');
  }
  return errors;
}

export function cardData(
  state: EditorState,
  theme: ThemeConfig,
  musicAllowed: boolean,
): CardData {
  const id = youtubeId(state.youtube);
  return {
    to: state.to.trim(),
    from: state.from.trim(),
    age: state.age ? Number(state.age) : null,
    letter: state.letter.trim(),
    secret: state.secret.trim(),
    photos: state.photos.map((photo) => ({ ...photo, cap: photo.cap.trim() })),
    lock: { type: state.lock, code: state.code, hint: state.hint.trim() },
    endMsg: state.endMsg.trim() || theme.defaultEnd,
    effect: state.effect,
    music:
      id && musicAllowed
        ? { type: 'youtube', id, start: seconds(state.musicStart) }
        : { type: 'demo' },
    ...(theme.coverLabel ? { cover: state.cover } : {}),
    ...(theme.occasion === 'anniversary' ? { startDate: state.startDate } : {}),
    ...(theme.id === 'birthday-chat' ? { chat: cleanChat(state.chat) } : {}),
  };
}

export function cardLink(theme: ThemeConfig, id: string): string {
  const base = (import.meta.env.VITE_SITE_URL || 'https://luvnote.fun').replace(
    /\/$/,
    '',
  );
  return `${base}/#${theme.prefix}${id}`;
}

export function editLink(theme: ThemeConfig, id: string, key: string): string {
  const base = (import.meta.env.VITE_SITE_URL || 'https://luvnote.fun').replace(
    /\/$/,
    '',
  );
  return `${base}/themes/${theme.id}/?edit=${id}#key=${key}`;
}

// Read `?edit=<card>#key=<secret>` from the editor URL.
export function editTarget(location: Location): { id: string; key: string } | null {
  const id = new URLSearchParams(location.search).get('edit') || '';
  const key = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash)?.[1] || '';
  return /^[a-z0-9]{7}$/.test(id) && key ? { id, key } : null;
}

function clock(total: number): string {
  return total ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}` : '';
}

// Inverse of cardData(): turn a stored card back into editor fields.
export function stateFromCard(
  data: Omit<CardData, 'expires'>,
  theme: ThemeConfig,
  fallbackChat: ChatRow[],
): EditorState {
  return {
    to: data.to || '',
    from: data.from || '',
    age: data.age ? String(data.age) : '',
    startDate: data.startDate || '',
    letter: data.letter || '',
    secret: data.secret || '',
    lock: data.lock?.type === 'code' ? 'code' : theme.defaultLock,
    code: data.lock?.code || '',
    hint: data.lock?.hint || '',
    youtube: data.music?.type === 'youtube' ? `https://www.youtube.com/watch?v=${data.music.id}` : '',
    musicStart: data.music?.type === 'youtube' ? clock(data.music.start) : '',
    effect: theme.effects.some((e) => e.value === data.effect) ? data.effect : theme.effects[0].value,
    endMsg: data.endMsg && data.endMsg !== theme.defaultEnd ? data.endMsg : '',
    photos: (data.photos || []).map((p) => ({ src: p.src, cap: p.cap || '', ...(p.date ? { date: p.date } : {}) })),
    cover: data.cover || null,
    chat: data.chat?.length ? data.chat : fallbackChat,
  };
}
