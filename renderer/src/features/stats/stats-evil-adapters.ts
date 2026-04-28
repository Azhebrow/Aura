import { getColumnOrder } from '@/shared/stats/stats-column-order';
import { formatDateLabel } from '@/shared/stats/stats-table-format';
import type {
  StatsAggregatedRow,
  StatsAggregation,
  StatsDayRow,
  StatsGroupBy,
  StatsMeta,
  StatsMode,
} from '@/shared/stats/types';
import { resolveChartColor, statsNumericForChart } from './stats-chart-utils';
import { MOOD_SCALE } from '@/shared/design/aura-palette';

export type EvilSeriesDef = { key: string; color: string; label: string; icon?: string };
export type EvilPoint = Record<string, string | number>;
export type EvilSummaryRow = { name: string; value: number; fill: string };

function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 3) return 0;
  const n = a.length;
  const meanA = a.reduce((sum, x) => sum + x, 0) / n;
  const meanB = b.reduce((sum, y) => sum + y, 0) / n;
  let covariance = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    covariance += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA <= 0 || varB <= 0) return 0;
  return covariance / Math.sqrt(varA * varB);
}
export function toChartConfigKey(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'series'
  );
}

export function resolveVisibleKeys(
  rows: StatsAggregatedRow[],
  mode: StatsMode,
  groupBy: StatsGroupBy,
  selectedSeriesKeys: string[] | null
): string[] {
  const all = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.values || {})) all.add(key);
  }
  const ordered = getColumnOrder(mode, groupBy, all);
  if (selectedSeriesKeys === null) return ordered;
  return ordered.filter((key) => selectedSeriesKeys.includes(key));
}

export function buildSeriesDefs(keys: string[], meta: StatsMeta, mode?: StatsMode): EvilSeriesDef[] {
  void mode;
  const mono = null;
  return keys.map((key, index) => ({
    key,
    label: key,
    color: mono ?? resolveChartColor(meta.colors, key, index),
    icon: meta.icons[key],
  }));
}

export function buildTimeSeriesData(
  rows: StatsAggregatedRow[],
  keys: string[],
  mode: StatsMode,
  aggregation: StatsAggregation
): EvilPoint[] {
  return rows.map((row) => {
    const point: EvilPoint = {
      date: row.date,
      labelDisplay: formatDateLabel(row.date, aggregation, row.dateRange ?? null),
    };
    for (const key of keys) {
      point[key] = statsNumericForChart(mode, row.values?.[key]);
    }
    return point;
  });
}

export function buildFinanceComposedData(
  rows: StatsAggregatedRow[],
  keys: string[],
  aggregation: StatsAggregation
): EvilPoint[] {
  return rows.map((row) => {
    let income = 0;
    let expense = 0;
    for (const key of keys) {
      const value = statsNumericForChart('finance', row.values?.[key]);
      if (value > 0) income += value;
      if (value < 0) expense += Math.abs(value);
    }
    return {
      date: row.date,
      labelDisplay: formatDateLabel(row.date, aggregation, row.dateRange ?? null),
      income,
      expense,
      net: income - expense,
    };
  });
}

export function buildSummaryRows(
  mode: StatsMode,
  aggregatedRows: StatsAggregatedRow[],
  dayRows: StatsDayRow[],
  keys: string[],
  meta: StatsMeta,
  rankRows: StatsAggregatedRow[] | null
): EvilSummaryRow[] {
  if (mode === 'mood') {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of dayRows) {
      const raw = row.values?.['Настроение'];
      if (typeof raw !== 'number' || Number.isNaN(raw)) continue;
      const level = Math.round(raw);
      if (level >= 1 && level <= 5) counts[level] += 1;
    }
    return [1, 2, 3, 4, 5]
      .map((level, index) => {
        const name = meta.moodNames?.[level] ?? `Уровень ${level}`;
        return {
          name,
          value: counts[level],
          fill: MOOD_SCALE[level] ?? resolveChartColor(meta.colors, name, index),
        };
      })
      .filter((row) => row.value > 0);
  }

  if (mode === 'rank') {
    const source = rankRows?.length ? rankRows : aggregatedRows;
    const last = source[source.length - 1];
    if (!last) return [];
    return keys
      .map((key, index) => ({
        name: key,
        value: statsNumericForChart('rank', last.values?.[key]),
        fill: resolveChartColor(meta.colors, key, index),
      }))
      .filter((row) => Number.isFinite(row.value) && row.value !== 0);
  }

  if (mode === 'correlation') {
    const targetKey = 'Успех, %';
    return keys
      .filter((key) => key !== targetKey)
      .map((key, index) => {
        const pairs = dayRows
          .map((row) => ({
            x: statsNumericForChart('correlation', row.values?.[key]),
            y: statsNumericForChart('correlation', row.values?.[targetKey]),
          }))
          .filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));
        const x = pairs.map((pair) => pair.x);
        const y = pairs.map((pair) => pair.y);
        return {
          name: key,
          value: pearsonCorrelation(x, y),
          fill: resolveChartColor(meta.colors, key, index),
        };
      })
      .filter((row) => Number.isFinite(row.value));
  }

  return keys
    .map((key, index) => {
      const values = aggregatedRows.map((row) => statsNumericForChart(mode, row.values?.[key]));
      const finite = values.filter((value) => Number.isFinite(value));
      const value =
        mode === 'tasks' || mode === 'rituals'
          ? finite.length
            ? Math.max(0, Math.min(100, finite.reduce((a, b) => a + b, 0) / finite.length))
            : 0
          : finite.reduce((a, b) => a + b, 0);
      return {
        name: key,
        value,
        fill: resolveChartColor(meta.colors, key, index),
      };
    })
    .filter((row) => Number.isFinite(row.value) && row.value !== 0);
}
