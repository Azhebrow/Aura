import type { AuraRow } from '@/types/aura';

export const DEFAULT_APP_SCALE = '1';
export const DEFAULT_TEXT_SCALE = '1';
export const DEFAULT_FONT_WEIGHT = '400';

export const APP_SCALE_STORAGE_FIELD = 'app_scale';
export const TEXT_SCALE_STORAGE_FIELD = 'text_scale';
export const FONT_WEIGHT_STORAGE_FIELD = 'font_weight_base';

export const FONT_WEIGHT_OPTIONS = [
  { value: '400', label: 'Обычный' },
  { value: '500', label: 'Средний' },
  { value: '600', label: 'Жирный' },
] as const;

export type FontWeightValue = '400' | '500' | '600';

export function normalizeScale(value: unknown, fallback = '1'): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n.toFixed(2).replace(/\.00$/, '').replace(/0$/, '').replace(/\.$/, '');
}

export function normalizeFontWeight(value: unknown): FontWeightValue {
  const s = String(value ?? '');
  if (s === '400' || s === '500' || s === '600') return s;
  return DEFAULT_FONT_WEIGHT as FontWeightValue;
}

export function readAppearanceScaleSettings(settings: AuraRow | null | undefined) {
  return {
    appScale: normalizeScale(settings?.[APP_SCALE_STORAGE_FIELD], DEFAULT_APP_SCALE),
    textScale: normalizeScale(settings?.[TEXT_SCALE_STORAGE_FIELD], DEFAULT_TEXT_SCALE),
    fontWeight: normalizeFontWeight(settings?.[FONT_WEIGHT_STORAGE_FIELD]),
  };
}

export function applyAppearanceScales(appScale: string, textScale: string, fontWeight?: string) {
  const root = document.documentElement;
  root.style.setProperty('--aura-ui-scale', normalizeScale(appScale, DEFAULT_APP_SCALE));
  root.style.setProperty('--aura-font-scale', normalizeScale(textScale, DEFAULT_TEXT_SCALE));
  if (fontWeight) root.style.setProperty('--aura-font-weight-base', fontWeight);
}
