/** Как в legacy `src/composites/config/constants.js` + `visualSettings.js`. */
export const LS_THEME_KEY = 'aura-theme';
export const LS_FONT_KEY = 'aura-font';
export const LS_ACCENT_KEY = 'aura-accent-preset';

export type AuraThemeMode = 'light' | 'dark' | 'dim';
export type AuraAccentPreset =
  | 'violet'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'mono'
  | 'cyan'
  | 'orange'
  | 'lime'
  | 'red'
  | 'indigo'
  | 'teal';

export function isAuraThemeMode(s: string | null | undefined): s is AuraThemeMode {
  return s === 'light' || s === 'dark' || s === 'dim';
}

export function isAuraAccentPreset(s: string | null | undefined): s is AuraAccentPreset {
  return (
    s === 'violet' ||
    s === 'blue' ||
    s === 'emerald' ||
    s === 'amber' ||
    s === 'rose' ||
    s === 'mono' ||
    s === 'cyan' ||
    s === 'orange' ||
    s === 'lime' ||
    s === 'red' ||
    s === 'indigo' ||
    s === 'teal'
  );
}
