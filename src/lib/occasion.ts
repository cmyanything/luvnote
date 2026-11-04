import { themes } from '../themes';
import type { ThemeId } from '../types';

// Sent with each card so the API can check occasion-specific fields
// without keeping its own list of templates.
export const occasionOf = (theme: ThemeId) =>
  themes.find((t) => t.id === theme)?.occasion || 'birthday';
