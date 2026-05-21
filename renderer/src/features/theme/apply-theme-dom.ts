import type { AuraAccentPreset, AuraColorFilter, AuraThemeMode, AuraThemeStyle } from '@/features/theme/theme-constants';
import { AURA_FONT_STANDARD, DEFAULT_AURA_FONT, type AuraFontFamily } from '@/features/theme/font-constants';
import { setGlobalColorFilter } from '@/features/theme/color-filter-state';

/** Tailwind `dark` variant + `data-theme` для токенов (в т.ч. dim). */
export function applyAuraThemeMode(mode: AuraThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  // Стиль иконок фиксируем в минималистичном варианте.
  root.setAttribute('data-icon-theme', 'minimal');
  if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
}

const ACCENT_TINTS: Record<AuraAccentPreset, { light: string; dark: string }> = {
  slate:    { light: 'oklch(0.46 0.06 255)',  dark: 'oklch(0.72 0.08 255)' },
  stone:    { light: 'oklch(0.5 0.01 85)',    dark: 'oklch(0.82 0.008 85)' },
  graphite: { light: 'oklch(0.34 0.01 260)',  dark: 'oklch(0.74 0.01 260)' },
  violet:   { light: 'oklch(0.54 0.26 285)',  dark: 'oklch(0.68 0.24 285)' },
  indigo:   { light: 'oklch(0.52 0.18 280)',  dark: 'oklch(0.7 0.14 280)' },
  blue:     { light: 'oklch(0.52 0.24 248)',  dark: 'oklch(0.66 0.22 248)' },
  cobalt:   { light: 'oklch(0.52 0.18 262)',  dark: 'oklch(0.7 0.14 262)' },
  cyan:     { light: 'oklch(0.57 0.22 212)',  dark: 'oklch(0.72 0.2 212)' },
  teal:     { light: 'oklch(0.55 0.18 188)',  dark: 'oklch(0.7 0.16 188)' },
  emerald:  { light: 'oklch(0.56 0.22 158)',  dark: 'oklch(0.7 0.2 158)' },
  forest:   { light: 'oklch(0.5 0.12 150)',   dark: 'oklch(0.7 0.1 150)' },
  lime:     { light: 'oklch(0.68 0.24 132)',  dark: 'oklch(0.78 0.24 132)' },
  amber:    { light: 'oklch(0.62 0.2 68)',    dark: 'oklch(0.78 0.2 68)' },
  orange:   { light: 'oklch(0.6 0.24 44)',    dark: 'oklch(0.76 0.22 44)' },
  rose:     { light: 'oklch(0.56 0.26 14)',   dark: 'oklch(0.7 0.24 14)' },
  pink:     { light: 'oklch(0.58 0.26 340)',  dark: 'oklch(0.72 0.24 340)' },
  mono:     { light: 'oklch(0.36 0 0)',       dark: 'oklch(0.82 0 0)' },
};

const ACCENT_FOREGROUND: Record<AuraAccentPreset, { light: string; dark: string }> = {
  slate: { light: 'oklch(0.98 0.01 255)', dark: 'oklch(0.2 0.01 255)' },
  stone: { light: 'oklch(0.98 0.008 85)', dark: 'oklch(0.2 0.008 85)' },
  graphite: { light: 'oklch(0.98 0.006 260)', dark: 'oklch(0.2 0.006 260)' },
  violet: { light: 'oklch(0.985 0.01 275)', dark: 'oklch(0.2 0.03 272)' },
  indigo: { light: 'oklch(0.985 0.01 280)', dark: 'oklch(0.2 0.03 280)' },
  blue: { light: 'oklch(0.985 0.01 250)', dark: 'oklch(0.2 0.02 248)' },
  cobalt: { light: 'oklch(0.985 0.01 262)', dark: 'oklch(0.2 0.02 262)' },
  cyan: { light: 'oklch(0.985 0.01 210)', dark: 'oklch(0.2 0.02 210)' },
  teal: { light: 'oklch(0.985 0.01 190)', dark: 'oklch(0.2 0.02 190)' },
  emerald: { light: 'oklch(0.98 0.01 160)', dark: 'oklch(0.22 0.02 160)' },
  amber: { light: 'oklch(0.97 0.004 260)', dark: 'oklch(0.19 0.006 260)' },
  orange: { light: 'oklch(0.98 0.008 44)', dark: 'oklch(0.2 0.01 44)' },
  forest: { light: 'oklch(0.98 0.01 150)', dark: 'oklch(0.21 0.02 150)' },
  lime: { light: 'oklch(0.98 0.01 130)', dark: 'oklch(0.21 0.02 130)' },
  rose: { light: 'oklch(0.98 0.01 18)', dark: 'oklch(0.2 0.02 18)' },
  pink: { light: 'oklch(0.98 0.008 340)', dark: 'oklch(0.2 0.01 340)' },
  mono: { light: 'oklch(0.98 0 0)', dark: 'oklch(0.2 0 0)' },
};

export function getAuraAccentPresetColors(preset: AuraAccentPreset, mode: AuraThemeMode) {
  const darkLike = mode !== 'light';
  return {
    tint: ACCENT_TINTS[preset][darkLike ? 'dark' : 'light'],
    tintFg: ACCENT_FOREGROUND[preset][darkLike ? 'dark' : 'light'],
  };
}

export function applyAuraAccentPreset(preset: AuraAccentPreset, mode: AuraThemeMode) {
  const root = document.documentElement;
  const { tint, tintFg } = getAuraAccentPresetColors(preset, mode);
  root.style.setProperty('--primary', tint);
  root.style.setProperty('--primary-foreground', tintFg);
  root.style.setProperty('--ring', tint);
  root.style.setProperty('--accent', tint);
  root.style.setProperty('--accent-foreground', tintFg);
  root.style.setProperty('--sidebar-primary', tint);
  root.style.setProperty('--sidebar-primary-foreground', tintFg);
  root.style.setProperty('--sidebar-accent', tint);
  root.style.setProperty('--sidebar-accent-foreground', tintFg);
}

const STYLE_OVERRIDES: Record<AuraThemeStyle, Partial<Record<string, string>>> = {
  strict: {
    '--background': 'oklch(0.992 0.004 255)',
    '--card': 'oklch(0.985 0.005 255)',
    '--popover': 'oklch(0.985 0.005 255)',
    '--secondary': 'oklch(0.944 0.012 255)',
    '--muted': 'oklch(0.934 0.01 255)',
    '--accent': 'oklch(0.905 0.014 252)',
    '--border': 'oklch(0.88 0.01 255)',
    '--input': 'oklch(0.88 0.01 255)',
    '--shadow-sm': '0 1px 3px oklch(0 0 0 / 0.08)',
    '--shadow-md': '0 2px 8px oklch(0 0 0 / 0.1)',
  },
  vivid: {
    '--background': 'oklch(0.992 0.006 260)',
    '--card': 'oklch(0.988 0.008 260)',
    '--popover': 'oklch(0.988 0.008 260)',
    '--secondary': 'oklch(0.935 0.02 262)',
    '--muted': 'oklch(0.92 0.016 262)',
    '--accent': 'oklch(0.895 0.03 252)',
    '--border': 'oklch(0.86 0.015 255)',
    '--input': 'oklch(0.86 0.015 255)',
    '--shadow-sm': '0 1px 3px oklch(0 0 0 / 0.09)',
    '--shadow-md': '0 2px 10px oklch(0 0 0 / 0.11)',
  },
  lush: {
    '--background': 'oklch(0.99 0.008 258)',
    '--card': 'oklch(0.985 0.01 258)',
    '--popover': 'oklch(0.985 0.01 258)',
    '--secondary': 'oklch(0.928 0.022 252)',
    '--muted': 'oklch(0.91 0.018 252)',
    '--accent': 'oklch(0.88 0.035 248)',
    '--border': 'oklch(0.85 0.018 255)',
    '--input': 'oklch(0.85 0.018 255)',
    '--shadow-sm': '0 1px 3px oklch(0 0 0 / 0.1)',
    '--shadow-md': '0 2px 12px oklch(0 0 0 / 0.12)',
  },
};

export function applyAuraThemeStyle(style: AuraThemeStyle) {
  const root = document.documentElement;
  root.setAttribute('data-theme-style', style);
  const overrides = STYLE_OVERRIDES[style];
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'string') {
      root.style.setProperty(key, value);
    }
  }
}

export function resetAuraThemeStyle() {
  const root = document.documentElement;
  root.removeAttribute('data-theme-style');
  for (const style of Object.values(STYLE_OVERRIDES)) {
    for (const key of Object.keys(style)) {
      root.style.removeProperty(key);
    }
  }
}

export function applyAuraFontFamily(font: AuraFontFamily) {
  const root = document.documentElement;
  if (font === AURA_FONT_STANDARD) {
    root.style.removeProperty('--font-sans');
    root.style.removeProperty('--font-heading');
    return;
  }
  const family = `'${font}', ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`;
  root.style.setProperty('--font-sans', family);
  root.style.setProperty('--font-heading', family);
}

export function resetAuraFontFamily() {
  applyAuraFontFamily(DEFAULT_AURA_FONT);
}

// ─── Цветовой фильтр ──────────────────────────────────────────────────────────

export function applyAuraColorFilter(filter: AuraColorFilter) {
  setGlobalColorFilter(filter);
  const root = document.documentElement;
  root.setAttribute('data-color-filter', filter);
  // Фильтр применяется через CSS: body { filter: saturate(X) } на основе data-color-filter.
  // Нейтральные surface-переменные переопределены в CSS для каждой темы отдельно.
}
