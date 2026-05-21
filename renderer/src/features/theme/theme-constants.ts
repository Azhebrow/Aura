/** Как в legacy `src/composites/config/constants.js` + `visualSettings.js`. */
export const LS_THEME_KEY = 'aura-theme';
export const LS_FONT_KEY = 'aura-font';
export const LS_ACCENT_KEY = 'aura-accent-preset';
export const LS_STYLE_KEY = 'aura-theme-style';
export const LS_COLOR_FILTER_KEY = 'aura-color-filter';

export type AuraColorFilter = 'vivid' | 'serious' | 'warm' | 'cool' | 'pastel' | 'contrast' | 'bw';

export type AuraThemeMode = 'light' | 'dark' | 'dim';
export type AuraThemeStyle = 'strict' | 'vivid' | 'lush';
export type AuraAccentPreset =
  | 'slate'
  | 'stone'
  | 'graphite'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'cobalt'
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'forest'
  | 'lime'
  | 'amber'
  | 'orange'
  | 'rose'
  | 'pink'
  | 'mono';

export function isAuraThemeMode(s: string | null | undefined): s is AuraThemeMode {
  return s === 'light' || s === 'dark' || s === 'dim';
}

export function isAuraThemeStyle(s: string | null | undefined): s is AuraThemeStyle {
  return s === 'strict' || s === 'vivid' || s === 'lush';
}

export function isAuraColorFilter(s: string | null | undefined): s is AuraColorFilter {
  return s === 'vivid' || s === 'serious' || s === 'warm' || s === 'cool' || s === 'pastel' || s === 'contrast' || s === 'bw';
}

export function isAuraAccentPreset(s: string | null | undefined): s is AuraAccentPreset {
  return (
    s === 'slate' ||
    s === 'stone' ||
    s === 'graphite' ||
    s === 'violet' ||
    s === 'indigo' ||
    s === 'blue' ||
    s === 'cobalt' ||
    s === 'cyan' ||
    s === 'teal' ||
    s === 'emerald' ||
    s === 'forest' ||
    s === 'lime' ||
    s === 'amber' ||
    s === 'orange' ||
    s === 'rose' ||
    s === 'pink' ||
    s === 'mono'
  );
}
