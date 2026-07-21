/** Как в legacy `src/composites/config/constants.js` + `visualSettings.js`. */
export const LS_THEME_KEY = 'aura-theme';
export const LS_FONT_KEY = 'aura-font';
export const LS_ACCENT_KEY = 'aura-accent-preset';
export const LS_COLOR_FILTER_KEY = 'aura-color-filter';
export const LS_ICON_THEME_KEY = 'aura-icon-theme';
export const LS_STRICT_MODE_KEY = 'aura-strict-mode';

export type AuraColorFilter = 'standard';
export type AuraStrictMode = 'off' | 'on';

export type AuraThemeMode = 'light' | 'tinted' | 'dark';
export type AuraIconTheme = 'outline' | 'plain' | 'filled';
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
  | 'fantasy'
  | 'mono';

export function isAuraThemeMode(s: string | null | undefined): s is AuraThemeMode {
  return s === 'light' || s === 'tinted' || s === 'dark';
}

export function normalizeAuraThemeMode(s: string | null | undefined): AuraThemeMode {
  if (s === 'dark') return 'dark';
  if (s === 'tinted' || s === 'dim') return 'tinted';
  return 'light';
}

export function isAuraIconTheme(s: string | null | undefined): s is AuraIconTheme {
  return s === 'outline' || s === 'plain' || s === 'filled';
}

export function isAuraColorFilter(s: string | null | undefined): s is AuraColorFilter {
  return s === 'standard';
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
    s === 'fantasy' ||
    s === 'mono'
  );
}

export const STANDARD_ACCENT_PRESETS = ['fantasy', 'blue', 'teal', 'emerald', 'amber', 'rose', 'slate', 'graphite'] as const;
export type StandardAuraAccentPreset = (typeof STANDARD_ACCENT_PRESETS)[number];

export function normalizeAuraAccentPreset(s: string | null | undefined): StandardAuraAccentPreset {
  if ((STANDARD_ACCENT_PRESETS as readonly string[]).includes(String(s))) return s as StandardAuraAccentPreset;
  if (s === 'violet' || s === 'indigo' || s === 'pink') return 'fantasy';
  if (s === 'cyan' || s === 'cobalt') return 'blue';
  if (s === 'forest' || s === 'lime') return 'emerald';
  if (s === 'orange') return 'amber';
  if (s === 'mono' || s === 'stone') return 'graphite';
  return 'slate';
}
