import { normalizeCssColorForPaint } from '@/lib/css-color';
import { getAuraPublicIconUrlFromName } from '@/shared/lib/aura-icon-url';
import type { StatsCellValue, StatsMode } from '@/features/stats/types';
import type { StatsFormattedRow } from '@/features/stats/stats-table-format';

const RAW_ICON_MODULES = import.meta.glob('../../../public/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const RAW_ICON_BY_NAME = new Map<string, string>(
  Object.entries(RAW_ICON_MODULES).map(([path, svg]) => [path.split('/').pop()?.replace(/\.svg$/i, '') ?? path, svg])
);

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}

export function visibleSeriesKeys(columns: string[], selected: string[] | null): string[] {
  if (selected === null) return columns;
  return columns.filter((c) => selected.includes(c));
}

function readCssVariable(variableName: string): string {
  if (typeof document === 'undefined') return '';
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  } catch {
    return '';
  }
}

export function resolveChartColor(raw: string | null | undefined, fallback = 'hsl(214, 70%, 56%)'): string {
  if (!raw) return fallback;
  const t = String(raw).trim();
  if (!t) return fallback;
  const varMatch = t.match(/^var\((--[A-Za-z0-9-_]+)\)$/);
  if (varMatch) {
    const resolved = readCssVariable(varMatch[1]);
    if (resolved) return resolved;
  }
  return normalizeCssColorForPaint(t) ?? fallback;
}

export function getChartNumericValue(mode: StatsMode, key: string, raw: StatsCellValue): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (mode === 'nutrition' && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const v = raw as { calories?: number };
    const calories = Number(v.calories ?? 0);
    return Number.isFinite(calories) ? calories : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getNutritionNumericValue(key: string, raw: StatsCellValue): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const v = raw as { calories?: number; proteins?: number; fats?: number; carbs?: number };
    if (key.includes('Белки')) return Number.isFinite(Number(v.proteins)) ? Number(v.proteins ?? 0) : null;
    if (key.includes('Жиры')) return Number.isFinite(Number(v.fats)) ? Number(v.fats ?? 0) : null;
    if (key.includes('Углеводы')) return Number.isFinite(Number(v.carbs)) ? Number(v.carbs ?? 0) : null;
    if (key.includes('Калории')) return Number.isFinite(Number(v.calories)) ? Number(v.calories ?? 0) : null;
    const calories = Number(v.calories ?? 0);
    return Number.isFinite(calories) ? calories : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getChartDisplayValue(row: StatsFormattedRow, key: string): string {
  return row.values[key] ?? '—';
}

export function getChartIconUrl(iconName: string | null | undefined): string | null {
  return getAuraPublicIconUrlFromName(iconName ?? '');
}

export function getThemedChartIconDataUrl(iconUrl: string | null | undefined, color: string): string | null {
  if (!iconUrl) return null;
  const fileName = iconUrl.split('/').pop()?.replace(/\?.*$/, '').replace(/\.svg$/i, '') ?? '';
  const rawSvg = RAW_ICON_BY_NAME.get(fileName);
  if (!rawSvg) return iconUrl;

  const themedSvg = rawSvg
    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
    .replace(/fill="currentColor"/g, `fill="${color}"`)
    .replace('<svg', `<svg color="${color}"`);

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(themedSvg)}`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
