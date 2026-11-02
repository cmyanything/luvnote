import type { Story, StoryChoices } from './data';

const text = (value: unknown, max = 8000): value is string =>
  typeof value === 'string' && value.length <= max;
export const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
};
export function validStoryImage(value: unknown): value is string {
  if (!text(value, 750_000)) return false;
  return (
    /^\/(?!\/)/.test(value) ||
    /^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(value) ||
    /^https:\/\//.test(value)
  );
}
function validChoices(value: unknown): value is StoryChoices {
  if (!value || typeof value !== 'object') return false;
  const c = value as StoryChoices;
  return (
    Array.isArray(c.questions) &&
    c.questions.length === 2 &&
    c.questions.every((q) => text(q, 500) && q.trim()) &&
    Array.isArray(c.options) &&
    c.options.length === 2 &&
    c.options.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 2 &&
        row.every((v) => text(v, 120) && v.trim()),
    ) &&
    Array.isArray(c.endings) &&
    c.endings.length === 4 &&
    c.endings.every(
      (e) => e && text(e.title, 300) && e.title.trim() && text(e.text, 4000),
    )
  );
}
export function validateStory(value: unknown): value is Story {
  if (!value || typeof value !== 'object') return false;
  const s = value as Story;
  if (
    !['to', 'from', 'title', 'letter', 'secret', 'closing'].every((k) =>
      text(s[k as keyof Story]),
    )
  )
    return false;
  if (
    !s.to.trim() ||
    !s.from.trim() ||
    s.to.length > 120 ||
    s.from.length > 120 ||
    !validDate(s.date)
  )
    return false;
  if (s.headline !== undefined && !text(s.headline, 240)) return false;
  if (s.intro !== undefined && !text(s.intro, 1200)) return false;
  if (s.cover !== undefined && s.cover !== '' && !validStoryImage(s.cover))
    return false;
  if (!Array.isArray(s.moments) || !s.moments.length || s.moments.length > 8)
    return false;
  const ids = new Set<string>();
  if (
    !s.moments.every((m) => {
      if (
        !m ||
        !['id', 'date', 'title', 'note', 'alt', 'place'].every((k) =>
          text(m[k as keyof typeof m]),
        )
      )
        return false;
      if (
        !/^[a-zA-Z0-9_-]+$/.test(m.id) ||
        ids.has(m.id) ||
        (m.date !== '' && !validDate(m.date)) ||
        !validStoryImage(m.image)
      )
        return false;
      if (m.aside !== undefined && !text(m.aside, 4000)) return false;
      if (m.keepsake !== undefined && !text(m.keepsake, 240)) return false;
      if (
        m.keepsakeType !== undefined &&
        !['ticket', 'key', 'photo', 'letter'].includes(m.keepsakeType)
      )
        return false;
      ids.add(m.id);
      return true;
    })
  )
    return false;
  if (s.choices !== undefined && !validChoices(s.choices)) return false;
  if (s.music !== undefined) {
    const m = s.music;
    if (!m || !['none', 'demo', 'youtube'].includes(m.type)) return false;
    if (
      m.type === 'youtube' &&
      (!/^[a-zA-Z0-9_-]{11}$/.test(m.id) ||
        !Number.isInteger(m.start) ||
        m.start < 0 ||
        m.start > 36_000)
    )
      return false;
  }
  return JSON.stringify(s).length <= 4_500_000;
}

export const draftKey = (id: string) => `luvnote:creative-draft:v1:${id}`;
