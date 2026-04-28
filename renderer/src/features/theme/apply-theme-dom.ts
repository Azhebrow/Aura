import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import { AURA_FONT_STANDARD, DEFAULT_AURA_FONT, type AuraFontFamily } from '@/features/theme/font-constants';

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
  violet: { light: 'oklch(0.56 0.16 272)', dark: 'oklch(0.72 0.12 272)' },
  blue: { light: 'oklch(0.56 0.13 248)', dark: 'oklch(0.7 0.11 248)' },
  emerald: { light: 'oklch(0.6 0.12 160)', dark: 'oklch(0.75 0.1 160)' },
  // Keep `amber` key for backward compatibility; semantic preset is "Graphite".
  amber: { light: 'oklch(0.34 0.015 260)', dark: 'oklch(0.78 0.012 260)' },
  rose: { light: 'oklch(0.62 0.14 18)', dark: 'oklch(0.76 0.11 18)' },
  mono: { light: 'oklch(0.36 0 0)', dark: 'oklch(0.86 0 0)' },
  cyan: { light: 'oklch(0.62 0.11 210)', dark: 'oklch(0.78 0.08 210)' },
  orange: { light: 'oklch(0.66 0.14 52)', dark: 'oklch(0.78 0.11 52)' },
  lime: { light: 'oklch(0.69 0.13 132)', dark: 'oklch(0.8 0.1 132)' },
  red: { light: 'oklch(0.58 0.19 28)', dark: 'oklch(0.73 0.14 28)' },
  indigo: { light: 'oklch(0.52 0.14 285)', dark: 'oklch(0.7 0.11 285)' },
  teal: { light: 'oklch(0.58 0.1 190)', dark: 'oklch(0.74 0.08 190)' },
};

const ACCENT_FOREGROUND: Record<AuraAccentPreset, { light: string; dark: string }> = {
  violet: { light: 'oklch(0.985 0.01 275)', dark: 'oklch(0.2 0.03 272)' },
  blue: { light: 'oklch(0.985 0.01 250)', dark: 'oklch(0.2 0.02 248)' },
  emerald: { light: 'oklch(0.98 0.01 160)', dark: 'oklch(0.22 0.02 160)' },
  amber: { light: 'oklch(0.97 0.004 260)', dark: 'oklch(0.19 0.006 260)' },
  rose: { light: 'oklch(0.98 0.01 20)', dark: 'oklch(0.22 0.03 18)' },
  mono: { light: 'oklch(0.98 0 0)', dark: 'oklch(0.2 0 0)' },
  cyan: { light: 'oklch(0.98 0.01 210)', dark: 'oklch(0.2 0.02 210)' },
  orange: { light: 'oklch(0.97 0.01 52)', dark: 'oklch(0.2 0.03 52)' },
  lime: { light: 'oklch(0.96 0.01 132)', dark: 'oklch(0.21 0.02 132)' },
  red: { light: 'oklch(0.98 0.01 28)', dark: 'oklch(0.2 0.03 28)' },
  indigo: { light: 'oklch(0.98 0.01 285)', dark: 'oklch(0.2 0.03 285)' },
  teal: { light: 'oklch(0.98 0.01 190)', dark: 'oklch(0.2 0.02 190)' },
};

export function applyAuraAccentPreset(preset: AuraAccentPreset, mode: AuraThemeMode) {
  const root = document.documentElement;
  const darkLike = mode !== 'light';
  const tint = ACCENT_TINTS[preset][darkLike ? 'dark' : 'light'];
  const tintFg = ACCENT_FOREGROUND[preset][darkLike ? 'dark' : 'light'];
  root.style.setProperty('--primary', tint);
  root.style.setProperty('--primary-foreground', tintFg);
  root.style.setProperty('--ring', `color-mix(in oklab, ${tint} 78%, white 22%)`);
  root.style.setProperty('--sidebar-primary', tint);
  root.style.setProperty('--sidebar-primary-foreground', tintFg);
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
