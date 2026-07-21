// ─── Rank Utils ───────────────────────────────────────────────────────────────
// Вспомогательные функции для страницы рангов:
// валидация дат, построение диапазона истории, форматирование.

import { addDaysIso } from '@/shared/lib/dates';
import type { AuraDatabase, AuraRow } from '@/types/aura';

/** Проверяет, что значение является строкой в формате YYYY-MM-DD */
export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dailyPointsFromCompletion(value: unknown): number {
  const pct = Number(value);
  const safePct = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return Math.round(2 * safePct - 100);
}

/**
 * Строит массив строк истории очков от endDate вниз до начала данных.
 * Для дат без записей подставляет объект с нулями (placeholder).
 */
export function buildPointsHistoryRange(db: AuraDatabase, endDate: string): AuraRow[] {
  const rows = db.getAll('act_daily_points').filter((r) => isIsoDate(r.date));
  const settings = (db.getAppSettings() ?? {}) as AuraRow;
  const configuredStart  = isIsoDate(settings.points_start_date) ? settings.points_start_date : null;
  const firstStoredDate  = rows.map((r) => String(r.date)).sort((a, b) => a.localeCompare(b))[0];
  const startDate        = configuredStart ?? firstStoredDate ?? endDate;
  const safeEnd          = isIsoDate(endDate) ? endDate : startDate;
  if (startDate > safeEnd) return [];

  const byDate = new Map(rows.map((row) => [String(row.date), row]));
  const asc: AuraRow[] = [];
  let running = (() => {
    try {
      return Number(db.getLastCumulativePointsBefore?.(startDate) ?? 0) || 0;
    } catch {
      return 0;
    }
  })();
  for (let cursor = startDate, guard = 0; cursor <= safeEnd && guard < 5000; cursor = addDaysIso(cursor, 1), guard += 1) {
    const row = byDate.get(cursor);
    if (row) {
      const daily = row.daily_points != null ? Number(row.daily_points) || 0 : dailyPointsFromCompletion(row.completion_percent);
      running = Math.max(0, running + daily);
      asc.push({ ...row, daily_points: daily, cumulative_points: running });
      continue;
    }
    const daily = dailyPointsFromCompletion(0);
    running = Math.max(0, running + daily);
    asc.push({ id: `empty_${cursor}`, date: cursor, completion_percent: 0, daily_points: daily, cumulative_points: running });
  }
  return asc.reverse();
}

/** Форматирует YYYY-MM-DD в короткий вид «день.месяц» */
export function formatHistoryDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}.${d.getMonth() + 1}`;
}
