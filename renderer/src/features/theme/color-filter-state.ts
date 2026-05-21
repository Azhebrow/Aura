import type { AuraColorFilter } from './theme-constants';

let _filter: AuraColorFilter = 'vivid';

export function setGlobalColorFilter(f: AuraColorFilter): void {
  _filter = f;
}

export function getGlobalColorFilter(): AuraColorFilter {
  return _filter;
}

/**
 * Десатурирует цвет в формате hsl(...) или oklch(...) согласно текущему фильтру.
 * Нейтральные цвета (saturation=0 или chroma≈0) не меняются — фильтр работает
 * только на насыщенных/акцентных значениях.
 */
export function filterColorValue(color: string): string {
  if (_filter === 'vivid') return color;
  const factor = _filter === 'bw' ? 0 : 0.2;

  // hsl(H, S%, L%)
  const hm = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
  if (hm) {
    const [, h, s, l] = hm;
    return `hsl(${h}, ${(parseFloat(s) * factor).toFixed(1)}%, ${l}%)`;
  }

  // oklch(L C H)
  const om = color.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (om) {
    const [, l, c, h] = om;
    return `oklch(${l} ${(parseFloat(c) * factor).toFixed(4)} ${h})`;
  }

  return color;
}
