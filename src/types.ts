export type ThemeId =
  | 'pink-coquette'
  | 'coquette-dream'
  | 'little-memories'
  | 'birthday-chat'
  | 'velvet-gift';
export type ChatRow =
  | { w: 'f' | 'oops'; x: string }
  | { w: 't'; o: string[] }
  | { w: 'stk'; s: 'heart' | 'cake' | 'gift' | 'hug' }
  | { w: 'pic' };

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  title: string;
  category: string;
  description: string;
  price: number;
  version: number;
  prefix: string;
  features: string[];
  templates: string[];
  toPlaceholder: string;
  fromPlaceholder: string;
  photoTitle: string;
  photoHelp: string[];
  coverLabel: string | null;
  coverHelp: string | null;
  letterTitle: string;
  secretTitle: string;
  secretPlaceholder: string;
  defaultLock: 'scratch' | 'seal';
  lockLabel: string;
  codeLabel: string;
  musicHelp: string;
  effects: { value: string; label: string; icons: string[] }[];
  endPlaceholder: string;
  defaultEnd: string;
  shareMessage: string;
  successIcon: string;
}

export interface Photo {
  src: string;
  cap: string;
}
export interface EditorState {
  to: string;
  from: string;
  age: string;
  letter: string;
  secret: string;
  lock: 'scratch' | 'seal' | 'code';
  code: string;
  hint: string;
  youtube: string;
  musicStart: string;
  effect: string;
  endMsg: string;
  photos: Photo[];
  cover: string | null;
  chat: ChatRow[];
}

export interface CardData {
  to: string;
  from: string;
  age: number | null;
  letter: string;
  secret: string;
  lock: { type: EditorState['lock']; code: string; hint: string };
  endMsg: string;
  effect: string;
  music: { type: 'demo' } | { type: 'youtube'; id: string; start: number };
  photos: Photo[];
  cover?: string | null;
  chat?: ChatRow[];
  expires?: string;
}

export interface CreatedCard {
  id: string;
  expires: number;
  /** Owner-only secret for editing this card later (R2 cards only). */
  editKey?: string;
}
