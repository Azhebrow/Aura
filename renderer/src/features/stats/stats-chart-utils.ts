import { TASK_CATEGORY_PALETTE } from '@/shared/design/aura-palette';
import type { StatsCellValue, StatsMode } from '@/shared/stats/types';

/** Число для столбчатых/линейных графиков (калории для питания по элементам). */
export function statsNumericForChart(mode: StatsMode, v: StatsCellValue | undefined): number {
  void mode;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'object' && v !== null && 'calories' in v) {
    const c = (v as { calories?: number }).calories;
    return typeof c === 'number' && Number.isFinite(c) ? c : 0;
  }
  return 0;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 33 + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Цвет серии: только из `meta.colors` или детерминированно из фиксированной палитры (никакой случайной подстановки).
 */
export function resolveChartColor(
  metaColors: Record<string, string> | undefined,
  key: string,
  index: number
): string {
  const raw = metaColors?.[key];
  if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim();
    if (t.startsWith('#') && (t.length === 7 || t.length === 4)) return t;
    if (t.toLowerCase().startsWith('hsl')) return t;
    if (t.toLowerCase().startsWith('rgb')) return t;
    if (t.toLowerCase().startsWith('var(')) return t;
  }
  const idx = (hashKey(key) + index) % TASK_CATEGORY_PALETTE.length;
  return TASK_CATEGORY_PALETTE[idx];
}

export function pieFillColor(metaColors: Record<string, string> | undefined, key: string, index: number): string {
  return resolveChartColor(metaColors, key, index);
}

export function chartAxisUnit(mode: StatsMode): string {
  switch (mode) {
    case 'tasks':
    case 'rituals':
      return '%';
    case 'finance':
      return 'RUB';
    case 'time':
    case 'leisure':
      return 'ч';
    case 'rank':
      return 'очки';
    case 'nutrition':
      return 'ккал';
    case 'mood':
      return 'ур.';
    case 'correlation':
      return 'коэф.';
    default:
      return 'ед.';
  }
}

export function formatChartAxisValue(value: number, mode: StatsMode): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';

  switch (mode) {
    case 'tasks':
    case 'rituals':
      return `${Math.round(n)}%`;
    case 'finance':
      return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    case 'time':
    case 'leisure':
      return `${Math.round(n)}ч`;
    case 'rank':
      return Math.round(n).toLocaleString('ru-RU');
    case 'nutrition':
      return `${Math.round(n)}`;
    case 'mood':
      return `${Math.round(n)}`;
    case 'correlation':
      return `${n.toFixed(2)}`;
    default:
      return Math.round(n).toLocaleString('ru-RU');
  }
}

export function formatChartXAxisLabel(value: unknown): string {
  const source = String(value ?? '').trim();
  if (!source) return '';
  const noYear = source.replace(/\s+\d{4}$/u, '');
  return noYear.length > 7 ? `${noYear.slice(0, 7)}…` : noYear;
}
