import type { AuraAccentPreset, AuraColorFilter, AuraIconTheme, AuraStrictMode, AuraThemeMode } from '@/features/theme/theme-constants';
import { AURA_FONT_STANDARD, DEFAULT_AURA_FONT, type AuraFontFamily } from '@/features/theme/font-constants';
import { setGlobalColorFilter } from '@/features/theme/color-filter-state';

export const AURA_THEME_CHANGED_EVENT = 'aura-theme-changed';

type AuraAppearanceInput = {
  theme: AuraThemeMode;
  accentPreset: AuraAccentPreset;
  fontFamily: AuraFontFamily;
  iconTheme: AuraIconTheme;
  colorFilter: AuraColorFilter;
  strictMode: AuraStrictMode;
};

/** Tailwind `dark` variant + `data-theme` для токенов. */
export function applyAuraThemeMode(mode: AuraThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
}

function releaseBootstrapThemeLocks() {
  const root = document.documentElement;
  root.style.removeProperty('--background');
  root.style.removeProperty('--foreground');
  root.style.background = '';
}

export function applyAuraIconTheme(theme: AuraIconTheme) {
  document.documentElement.setAttribute('data-icon-theme', theme);
}

const ACCENT_TINTS: Record<AuraAccentPreset, { light: string; tinted: string; dark: string }> = {
  slate:    { light: 'oklch(0.46 0.06 255)',  tinted: 'oklch(0.72 0.085 255)', dark: 'oklch(0.72 0.08 255)' },
  stone:    { light: 'oklch(0.5 0.01 85)',    tinted: 'oklch(0.78 0.012 85)',  dark: 'oklch(0.82 0.008 85)' },
  graphite: { light: 'oklch(0.34 0.01 260)',  tinted: 'oklch(0.76 0.012 260)', dark: 'oklch(0.74 0.01 260)' },
  violet:   { light: 'oklch(0.54 0.26 285)',  tinted: 'oklch(0.72 0.25 285)',  dark: 'oklch(0.68 0.24 285)' },
  indigo:   { light: 'oklch(0.52 0.18 280)',  tinted: 'oklch(0.73 0.17 280)',  dark: 'oklch(0.7 0.14 280)' },
  blue:     { light: 'oklch(0.52 0.24 248)',  tinted: 'oklch(0.72 0.23 248)',  dark: 'oklch(0.66 0.22 248)' },
  cobalt:   { light: 'oklch(0.52 0.18 262)',  tinted: 'oklch(0.73 0.17 262)',  dark: 'oklch(0.7 0.14 262)' },
  cyan:     { light: 'oklch(0.57 0.22 212)',  tinted: 'oklch(0.78 0.2 212)',   dark: 'oklch(0.72 0.2 212)' },
  teal:     { light: 'oklch(0.55 0.18 188)',  tinted: 'oklch(0.75 0.16 188)',  dark: 'oklch(0.7 0.16 188)' },
  emerald:  { light: 'oklch(0.56 0.22 158)',  tinted: 'oklch(0.75 0.2 158)',   dark: 'oklch(0.7 0.2 158)' },
  forest:   { light: 'oklch(0.5 0.12 150)',   tinted: 'oklch(0.73 0.12 150)',  dark: 'oklch(0.7 0.1 150)' },
  lime:     { light: 'oklch(0.68 0.24 132)',  tinted: 'oklch(0.82 0.23 132)',  dark: 'oklch(0.78 0.24 132)' },
  amber:    { light: 'oklch(0.62 0.2 68)',    tinted: 'oklch(0.8 0.19 68)',    dark: 'oklch(0.78 0.2 68)' },
  orange:   { light: 'oklch(0.6 0.24 44)',    tinted: 'oklch(0.77 0.22 44)',   dark: 'oklch(0.76 0.22 44)' },
  rose:     { light: 'oklch(0.56 0.26 14)',   tinted: 'oklch(0.72 0.24 14)',   dark: 'oklch(0.7 0.24 14)' },
  pink:     { light: 'oklch(0.58 0.26 340)',  tinted: 'oklch(0.74 0.24 340)',  dark: 'oklch(0.72 0.24 340)' },
  fantasy:  { light: 'oklch(0.55 0.16 292)',  tinted: 'oklch(0.76 0.15 292)',  dark: 'oklch(0.74 0.13 292)' },
  mono:     { light: 'oklch(0.36 0 0)',       tinted: 'oklch(0.78 0 0)',       dark: 'oklch(0.82 0 0)' },
};

const ACCENT_FOREGROUND: Record<AuraAccentPreset, { light: string; tinted: string; dark: string }> = {
  slate: { light: 'oklch(0.98 0.01 255)', tinted: 'oklch(0.18 0.012 255)', dark: 'oklch(0.2 0.01 255)' },
  stone: { light: 'oklch(0.98 0.008 85)', tinted: 'oklch(0.18 0.008 85)', dark: 'oklch(0.2 0.008 85)' },
  graphite: { light: 'oklch(0.98 0.006 260)', tinted: 'oklch(0.18 0.006 260)', dark: 'oklch(0.2 0.006 260)' },
  violet: { light: 'oklch(0.985 0.01 275)', tinted: 'oklch(0.17 0.03 272)', dark: 'oklch(0.2 0.03 272)' },
  indigo: { light: 'oklch(0.985 0.01 280)', tinted: 'oklch(0.17 0.03 280)', dark: 'oklch(0.2 0.03 280)' },
  blue: { light: 'oklch(0.985 0.01 250)', tinted: 'oklch(0.17 0.02 248)', dark: 'oklch(0.2 0.02 248)' },
  cobalt: { light: 'oklch(0.985 0.01 262)', tinted: 'oklch(0.17 0.02 262)', dark: 'oklch(0.2 0.02 262)' },
  cyan: { light: 'oklch(0.985 0.01 210)', tinted: 'oklch(0.17 0.02 210)', dark: 'oklch(0.2 0.02 210)' },
  teal: { light: 'oklch(0.985 0.01 190)', tinted: 'oklch(0.17 0.02 190)', dark: 'oklch(0.2 0.02 190)' },
  emerald: { light: 'oklch(0.98 0.01 160)', tinted: 'oklch(0.18 0.02 160)', dark: 'oklch(0.22 0.02 160)' },
  amber: { light: 'oklch(0.97 0.004 260)', tinted: 'oklch(0.16 0.006 260)', dark: 'oklch(0.19 0.006 260)' },
  orange: { light: 'oklch(0.98 0.008 44)', tinted: 'oklch(0.17 0.01 44)', dark: 'oklch(0.2 0.01 44)' },
  forest: { light: 'oklch(0.98 0.01 150)', tinted: 'oklch(0.18 0.02 150)', dark: 'oklch(0.21 0.02 150)' },
  lime: { light: 'oklch(0.98 0.01 130)', tinted: 'oklch(0.18 0.02 130)', dark: 'oklch(0.21 0.02 130)' },
  rose: { light: 'oklch(0.98 0.01 18)', tinted: 'oklch(0.17 0.02 18)', dark: 'oklch(0.2 0.02 18)' },
  pink: { light: 'oklch(0.98 0.008 340)', tinted: 'oklch(0.17 0.01 340)', dark: 'oklch(0.2 0.01 340)' },
  fantasy: { light: 'oklch(0.985 0.01 292)', tinted: 'oklch(0.18 0.02 292)', dark: 'oklch(0.21 0.02 292)' },
  mono: { light: 'oklch(0.98 0 0)', tinted: 'oklch(0.17 0 0)', dark: 'oklch(0.2 0 0)' },
};

export function getAuraAccentPresetColors(preset: AuraAccentPreset, mode: AuraThemeMode) {
  const tone = mode === 'light' ? 'light' : mode === 'tinted' ? 'tinted' : 'dark';
  return {
    tint: ACCENT_TINTS[preset][tone],
    tintFg: ACCENT_FOREGROUND[preset][tone],
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
  root.removeAttribute('data-color-filter');
}

function applyAuraStrictMode(mode: AuraStrictMode) {
  const root = document.documentElement;
  if (mode !== 'on') {
    root.removeAttribute('data-strict-mode');
    return;
  }
  root.setAttribute('data-strict-mode', 'on');
}

export function applyAuraAppearance(input: AuraAppearanceInput) {
  applyAuraThemeMode(input.theme);
  releaseBootstrapThemeLocks();
  applyAuraAccentPreset(input.accentPreset, input.theme);
  applyAuraFontFamily(input.fontFamily);
  applyAuraIconTheme(input.iconTheme);
  applyAuraColorFilter(input.colorFilter);
  applyAuraStrictMode(input.strictMode);

  window.dispatchEvent(new CustomEvent(AURA_THEME_CHANGED_EVENT, {
    detail: {
      theme: input.theme,
      accentPreset: input.accentPreset,
      fontFamily: input.fontFamily,
      iconTheme: input.iconTheme,
      colorFilter: input.colorFilter,
      strictMode: input.strictMode,
    },
  }));
}
