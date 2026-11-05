export type ThemeId =
  | 'pink-coquette'
  | 'coquette-dream'
  | 'little-memories'
  | 'birthday-chat'
  | 'velvet-gift'
  | 'anniversary-journey'
  | 'villa-amore'
  | 'sweet-cake'
  | 'loy-together';
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
  occasion?: 'birthday' | 'anniversary' | 'festival';
  /** Couple theme (Loy Together): a face photo for each person, free card plus a paid premium tier. */
  couple?: boolean;
  /** Premium price in baht for couple themes (unlocked by the owner after LINE payment). */
  premiumPrice?: number;
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
  /** Theme has no secret-message scene, so the editor hides that step. */
  noSecret?: boolean;
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
  date?: string;
}
export interface EditorState {
  to: string;
  from: string;
  age: string;
  startDate: string;
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
  faceFrom: string | null;
  faceTo: string | null;
  premium: boolean;
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
  startDate?: string;
  cover?: string | null;
  chat?: ChatRow[];
  /** Whose faces the leading photos are (couple themes), in order. */
  faces?: ('from' | 'to')[];
  /** The customer asked for premium; the owner unlocks it after payment. */
  wantPremium?: boolean;
  /** Set only by the owner's admin unlock. */
  premium?: boolean;
  expires?: string | number;
}

export interface CreatedCard {
  id: string;
  expires: number;
  /** Owner-only secret for editing this card later (R2 cards only). */
  editKey?: string;
}
