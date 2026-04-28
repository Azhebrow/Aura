import type { StatsAggregatedRow, StatsAggregation } from '@/shared/stats/types';
import { formatDateLabel } from '@/shared/stats/stats-table-format';

/** Подпись оси X: уникальный ключ — ISO `date`, не `label` (при агрегации подписи могут совпадать и ломать Recharts). */
export function buildAxisLabelMap(
  rows: StatsAggregatedRow[],
  aggregation: StatsAggregation
): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    m.set(r.date, formatDateLabel(r.date, aggregation, r.dateRange ?? null));
  }
  return m;
}
