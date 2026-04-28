import type { StatsAggregation, StatsCellValue, StatsGroupBy, StatsMode } from './types';
import { getColumnOrder } from './stats-column-order';

function getMonthNameShort(monthIndex: number): string {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return months[monthIndex] ?? '';
}

export function formatTimeFromHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return '0 м';
  }
  const totalMinutes = Math.floor(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) {
    if (m === 0) return '0 м';
    return `${m} м`;
  }
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} м`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0%';
  }
  return `${Math.round(value)}%`;
}

function formatCurrencyRu(value: number, db?: { getAppSettings: () => { currency?: string } | null } | null): string {
  let code = 'RUB';
  try {
    const s = db?.getAppSettings?.();
    if (s && typeof s === 'object' && typeof (s as { currency?: string }).currency === 'string') {
      code = (s as { currency: string }).currency;
    }
  } catch {
    /* ignore */
  }
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

export function formatDateLabel(
  dateString: string,
  aggregation: string = 'day',
  dateRange: { startDate: string; endDate: string } | null = null
): string {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);

  switch (aggregation) {
    case 'day': {
      const day = date.getDate();
      const month = getMonthNameShort(date.getMonth());
      return `${day} ${month}`;
    }
    case 'week': {
      if (dateRange?.startDate && dateRange?.endDate) {
        const start = new Date(`${dateRange.startDate}T00:00:00`);
        const end = new Date(`${dateRange.endDate}T00:00:00`);
        const startDay = start.getDate();
        const endDay = end.getDate();
        const startMonth = start.getMonth();
        const endMonth = end.getMonth();
        if (startMonth === endMonth) {
          return `${startDay}-${endDay} ${getMonthNameShort(startMonth)}`;
        }
        return `${startDay} ${getMonthNameShort(startMonth)} - ${endDay} ${getMonthNameShort(endMonth)}`;
      }
      return `${date.getDate()} ${getMonthNameShort(date.getMonth())}`;
    }
    case 'month': {
      return `${getMonthNameShort(date.getMonth())} ${date.getFullYear()}`;
    }
    case 'year': {
      return String(date.getFullYear());
    }
    default: {
      return `${date.getDate()} ${getMonthNameShort(date.getMonth())}`;
    }
  }
}

export function formatValueForTable(
  value: unknown,
  mode: StatsMode,
  key: string | null = null,
  db?: { getAppSettings: () => { currency?: string } | null } | null
): string {
  if (mode === 'nutrition') {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const v = value as { calories?: number; proteins?: number; fats?: number; carbs?: number };
      const calories = Math.round(v.calories ?? 0);
      const proteins = Math.round(v.proteins ?? 0);
      const fats = Math.round(v.fats ?? 0);
      const carbs = Math.round(v.carbs ?? 0);
      return `${calories} ккал / Б:${proteins}г Ж:${fats}г У:${carbs}г`;
    }
    if (typeof value === 'number') {
      const roundedValue = Math.round(value || 0);
      if (key === 'Белки' || key === 'Жиры' || key === 'Углеводы') {
        return `${roundedValue} г`;
      }
      if (key === 'Калории') {
        return `${roundedValue} ккал`;
      }
      return roundedValue.toString();
    }
    return `${Math.round(Number(value) || 0)} ккал`;
  }

  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    return '—';
  }

  switch (mode) {
    case 'tasks':
    case 'rituals':
      return formatPercent(Number(value));
    case 'finance':
      return formatCurrencyRu(Number(value), db ?? null);
    case 'time':
    case 'leisure':
      return formatTimeFromHours(Number(value));
    case 'rank':
      return Math.round(Number(value)).toLocaleString('ru-RU');
    case 'mood':
      return Math.round(Number(value)).toString();
    case 'correlation': {
      const n = Number(value);
      if (key?.includes('%')) return formatPercent(n);
      if (key?.includes('ч')) return formatTimeFromHours(n);
      if (key?.includes('ккал')) return `${Math.round(n)} ккал`;
      if (key === 'Настроение') return Math.round(n).toString();
      return Number.isFinite(n) ? n.toFixed(2) : '—';
    }
    default:
      return String(value);
  }
}

export type StatsFormattedRow = {
  date: string;
  label: string;
  values: Record<string, string>;
  originalValues: Record<string, StatsCellValue>;
};

export type StatsFormattedTable = {
  labels: string[];
  columns: string[];
  rows: StatsFormattedRow[];
};

/** Как `formatForTable` в legacy `StatsDataFormatter.js`. */
export function formatForTable(
  data: Array<{
    date: string;
    values?: Record<string, StatsCellValue>;
    dateRange?: { startDate: string; endDate: string } | null;
  }>,
  mode: StatsMode,
  groupBy: StatsGroupBy,
  aggregation: StatsAggregation = 'day',
  db?: { getAppSettings: () => { currency?: string } | null } | null
): StatsFormattedTable {
  if (!data?.length) {
    return { labels: [], rows: [], columns: [] };
  }

  const allKeys = new Set<string>();
  for (const item of data) {
    for (const k of Object.keys(item.values || {})) {
      allKeys.add(k);
    }
  }

  const columns = getColumnOrder(mode, groupBy, allKeys);

  const rows: StatsFormattedRow[] = data.map((item) => {
    const label = formatDateLabel(item.date, aggregation, item.dateRange ?? null);
    const row: StatsFormattedRow = {
      date: item.date,
      label,
      values: {},
      originalValues: {},
    };

    for (const key of columns) {
      const value = item.values?.[key];
      let defaultValue: StatsCellValue;
      if (mode === 'nutrition') {
        defaultValue = groupBy === 'categories' ? 0 : { calories: 0, proteins: 0, fats: 0, carbs: 0 };
      } else if (mode === 'mood') {
        defaultValue = null;
      } else {
        defaultValue = 0;
      }
      const raw = value !== undefined ? value : defaultValue;
      row.originalValues[key] = raw;
      row.values[key] = formatValueForTable(raw, mode, key, db ?? null);
    }
    return row;
  });

  return {
    labels: rows.map((r) => r.label),
    rows,
    columns,
  };
}
