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
): InvalidField[] {
  const errors: InvalidField[] = [];
  if (!state.to.trim()) errors.push('to');
  if (!state.from.trim()) errors.push('from');
  if (anniversary && (!validDate(state.startDate) || state.startDate > today()))
    errors.push('startDate');
  if (hasChat && !cleanChat(state.chat).some((row) => row.w === 'f'))
    errors.push('chat');
  if (!state.letter.trim()) errors.push('letter');
  if (!state.secret.trim()) errors.push('secret');
  if (state.lock === 'code' && !/^\d{4}$/.test(state.code)) errors.push('code');
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
