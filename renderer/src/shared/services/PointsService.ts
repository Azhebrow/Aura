/**
 * PointsService — реализация логики блокировки дней, очков и данных календаря.
 *
 * Ранее этот класс должен был инжектироваться из main.js как window.PointsService,
 * но фактически никогда не был реализован. Теперь создаётся в renderer и
 * регистрируется в AppProviders.
 */

import type { AuraDatabase, AuraRow } from '@/types/aura';
import { FINANCE_SEMANTIC, MOOD_SCALE } from '@/shared/config/aura-palette';

export type DayStatus = 'open' | 'locked' | 'future';

export type DayData = {
  value: number;
  text: string;
  color: string;
  fillPercent: number;
};

export type DataType =
  | 'completion'
  | 'points'
  | 'rituals'
  | 'mood'
  | 'income'
  | 'expense'
  | 'finance'
  | 'calories';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextDayIso(dateString: string): string {
  const d = new Date(dateString + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0); // last day of month
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

// ─── PointsService ─────────────────────────────────────────────────────────────

export class PointsService {
  private readonly db: AuraDatabase;

  constructor(db: AuraDatabase) {
    this.db = db;
  }

  // ── Day status ───────────────────────────────────────────────────────────────

  /** Будущий ли день (строго после сегодня). */
  isFutureDay(dateString: string): boolean {
    return dateString > todayIso();
  }

  /**
   * Открыт ли день для редактирования.
   * День закрывается через `points_open_hours` часов после полуночи этого дня.
   * Будущие дни считаются открытыми.
   */
  isDayOpen(dateString: string): boolean {
    if (this.isFutureDay(dateString)) return true;

    try {
      const settings = (this.db.getAppSettings() ?? {}) as AuraRow;
      const openHours = Number(settings.points_open_hours ?? 48);

      // 0 часов = день никогда не блокируется (отключено)
      if (openHours <= 0) return true;

      const dayStart = new Date(dateString + 'T00:00:00');
      const lockTime = dayStart.getTime() + openHours * 3_600_000;
      return Date.now() < lockTime;
    } catch {
      return true; // fallback — не блокируем при ошибке
    }
  }

  /** Статус дня: 'open' | 'locked' | 'future'. */
  getDayStatus(dateString: string): DayStatus {
    if (this.isFutureDay(dateString)) return 'future';
    return this.isDayOpen(dateString) ? 'open' : 'locked';
  }

  // ── Points ───────────────────────────────────────────────────────────────────

  /**
   * Накопленные очки на конец указанного дня.
   * Используем getLastCumulativePointsBefore(nextDay) — последняя запись до следующего дня.
   */
  calculateCumulativePoints(dateString: string): number {
    try {
      return this.db.getLastCumulativePointsBefore(nextDayIso(dateString)) || 0;
    } catch {
      return 0;
    }
  }

  private getDailyPoints(dateString: string): number {
    try {
      const rows = this.db.getDailyPointsBetween(dateString, dateString);
      if (!rows.length) return 0;
      return Number(rows[0].daily_points ?? rows[0].points ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  // ── Calendar month range ──────────────────────────────────────────────────────

  /**
   * Загружает данные за весь месяц для указанного типа.
   * Возвращается как Map<dateString, value> — передаётся в getDayData как monthData.
   */
  getMonthRange(year: number, month: number, type: DataType): Map<string, number> {
    const { start, end } = monthRange(year, month);
    const result = new Map<string, number>();

    try {
      switch (type) {
        case 'income':
        case 'expense':
        case 'finance': {
          const txs = this.db.getTransactionsBetween(start, end);
          for (const tx of txs) {
            const date = String(tx.date ?? '');
            if (!date) continue;
            const amount = Number(tx.amount ?? 0) || 0;
            const kind = String(tx.transaction_type ?? tx.type ?? '');
            const cur = result.get(date) ?? 0;
            if (type === 'income' && (kind === 'income' || amount > 0)) {
              result.set(date, cur + Math.abs(amount));
            } else if (type === 'expense' && (kind === 'expense' || amount < 0)) {
              result.set(date, cur + Math.abs(amount));
            } else if (type === 'finance') {
              result.set(date, cur + amount);
            }
          }
          break;
        }
        case 'calories': {
          // calories come from nutrition entries
          try {
            const allTx = (this.db.getAllTransactions?.({ type: 'nutrition' }) ?? [])
              .filter((r) => String(r.date ?? '') >= start && String(r.date ?? '') <= end);
            for (const r of allTx) {
              const date = String(r.date ?? '');
              result.set(date, (result.get(date) ?? 0) + (Number(r.calories ?? 0) || 0));
            }
          } catch { /* ignore */ }
          break;
        }
        case 'mood': {
          const entries = this.db.getDiaryEntriesBetween(start, end, { moodOnly: true });
          const moods = this.db.getAll('cfg_moods');
          const moodLevelById = new Map<string, number>();
          for (const m of moods) {
            if (m.id != null && m.level != null) {
              moodLevelById.set(String(m.id), Number(m.level) || 0);
            }
          }
          for (const entry of entries) {
            const date = String(entry.date ?? '');
            if (!date || !entry.mood_id) continue;
            const level = moodLevelById.get(String(entry.mood_id)) ?? 0;
            if (level) result.set(date, level);
          }
          break;
        }
        case 'points': {
          const rows = this.db.getDailyPointsBetween(start, end);
          for (const row of rows) {
            const date = String(row.date ?? '');
            if (!date) continue;
            result.set(date, Number(row.daily_points ?? row.points ?? 0) || 0);
          }
          break;
        }
        default:
          // completion, rituals — вычисляются на лету per-day
          break;
      }
    } catch {
      /* fallback — пустой map */
    }

    return result;
  }

  // ── Day data ─────────────────────────────────────────────────────────────────

  /**
   * Данные для ячейки календаря на указанный день.
   * monthData — уже загруженный Map<date, value> из getMonthRange (опционально).
   */
  getDayData(dateString: string, type: DataType, monthData?: unknown): DayData {
    const empty: DayData = { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };

    try {
      switch (type) {
        case 'completion':
          return this._getCompletion(dateString);

        case 'rituals':
          return this._getRituals(dateString);

        case 'points':
          return this._getPoints(dateString, monthData as Map<string, number> | undefined);

        case 'mood':
          return this._getMood(dateString, monthData as Map<string, number> | undefined);

        case 'income':
          return this._getFinance(dateString, 'income', monthData as Map<string, number> | undefined);

        case 'expense':
          return this._getFinance(dateString, 'expense', monthData as Map<string, number> | undefined);

        case 'finance':
          return this._getFinance(dateString, 'finance', monthData as Map<string, number> | undefined);

        case 'calories':
          return this._getCalories(dateString, monthData as Map<string, number> | undefined);

        default:
          return empty;
      }
    } catch {
      return empty;
    }
  }

  // ── Private day-data methods ──────────────────────────────────────────────────

  private _getCompletion(dateString: string): DayData {
    try {
      const progress = this.db.getCategoryProgress?.('total', dateString);
      if (progress == null) {
        // fallback через getCategoryProgresses
        const all = this.db.getCategoryProgresses?.(dateString);
        if (all) {
          const vals = Object.values(all).map((v) => Number(v) || 0).filter((v) => v >= 0);
          if (!vals.length) return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const pct = Math.round(avg);
          return {
            value: pct,
            text: `${pct}%`,
            color: pct >= 80 ? 'var(--semantic-success)' : pct >= 40 ? 'var(--primary)' : 'var(--muted-foreground)',
            fillPercent: Math.min(100, pct),
          };
        }
        return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
      }
      const pct = Math.round(Number(progress) || 0);
      return {
        value: pct,
        text: `${pct}%`,
        color: pct >= 80 ? 'var(--semantic-success)' : pct >= 40 ? 'var(--primary)' : 'var(--muted-foreground)',
        fillPercent: Math.min(100, pct),
      };
    } catch {
      return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
    }
  }

  private _getRituals(dateString: string): DayData {
    try {
      const morning = this.db.calculateRitualProgress('sunrise', dateString) ?? 0;
      const evening = this.db.calculateRitualProgress('sunset', dateString) ?? 0;
      const avg = Math.round((morning + evening) / 2);
      return {
        value: avg,
        text: avg > 0 ? `${avg}%` : '—',
        color: avg >= 80 ? 'var(--semantic-success)' : avg >= 40 ? 'var(--primary)' : 'var(--muted-foreground)',
        fillPercent: Math.min(100, avg),
      };
    } catch {
      return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
    }
  }

  private _getPoints(dateString: string, monthData?: Map<string, number>): DayData {
    const pts = monthData
      ? (monthData.get(dateString) ?? this.getDailyPoints(dateString))
      : this.getDailyPoints(dateString);
    if (!pts) return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
    const pct = Math.min(100, Math.max(0, (pts / 100) * 100)); // 100pts = full
    return {
      value: pts,
      text: `${pts > 0 ? '+' : ''}${pts}`,
      color: pts > 0 ? 'var(--semantic-success)' : pts < 0 ? 'var(--semantic-negative)' : 'var(--muted-foreground)',
      fillPercent: pct,
    };
  }

  private _getMood(dateString: string, monthData?: Map<string, number>): DayData {
    let level: number;
    if (monthData) {
      level = monthData.get(dateString) ?? 0;
    } else {
      const entry = this.db.getDiaryEntry(dateString);
      if (!entry?.mood_id) return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
      const moods = this.db.getAll('cfg_moods');
      const moodRow = moods.find((m) => String(m.id) === String(entry.mood_id));
      level = Number(moodRow?.level ?? 0) || 0;
    }
    if (!level) return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
    const color = MOOD_SCALE[Math.round(level)] ?? 'var(--primary)';
    return {
      value: level,
      text: String(level),
      color,
      fillPercent: (level / 5) * 100,
    };
  }

  private _getFinance(dateString: string, kind: 'income' | 'expense' | 'finance', monthData?: Map<string, number>): DayData {
    let amount: number;
    if (monthData) {
      amount = monthData.get(dateString) ?? 0;
    } else {
      try {
        const txs = this.db.getTransactions(dateString);
        amount = txs.reduce((sum, tx) => {
          const v = Number(tx.amount ?? 0) || 0;
          const t = String(tx.transaction_type ?? tx.type ?? '');
          if (kind === 'income') return sum + (t === 'income' || v > 0 ? Math.abs(v) : 0);
          if (kind === 'expense') return sum + (t === 'expense' || v < 0 ? Math.abs(v) : 0);
          return sum + v; // finance = net
        }, 0);
      } catch {
        amount = 0;
      }
    }

    if (!amount) return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };

    const color =
      kind === 'income' ? FINANCE_SEMANTIC.income
      : kind === 'expense' ? FINANCE_SEMANTIC.expense
      : amount >= 0 ? FINANCE_SEMANTIC.income : FINANCE_SEMANTIC.expense;

    return {
      value: amount,
      text: fmtCurrency(Math.abs(amount)),
      color,
      fillPercent: Math.min(100, (Math.abs(amount) / 10_000) * 100),
    };
  }

  private _getCalories(dateString: string, monthData?: Map<string, number>): DayData {
    let kcal: number;
    if (monthData) {
      kcal = monthData.get(dateString) ?? 0;
    } else {
      try {
        const entries = this.db.getNutritionEntries(dateString);
        kcal = entries.reduce((sum, e) => sum + (Number(e.calories ?? 0) || 0), 0);
      } catch {
        kcal = 0;
      }
    }
    if (!kcal) return { value: 0, text: '—', color: 'var(--muted-foreground)', fillPercent: 0 };
    const target = 2000;
    const pct = Math.min(100, (kcal / target) * 100);
    return {
      value: kcal,
      text: `${Math.round(kcal)}`,
      color: pct > 110 ? 'var(--semantic-negative)' : pct >= 80 ? 'var(--semantic-success)' : 'var(--primary)',
      fillPercent: pct,
    };
  }
}

// ─── Register globally ────────────────────────────────────────────────────────

/**
 * Регистрирует PointsService в window, если ещё не зарегистрирован.
 * Вызывается один раз из AppProviders после готовности DB.
 */
export function registerPointsService(): void {
  if (typeof window === 'undefined') return;
  if (!window.PointsService) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).PointsService = PointsService;
  }
}
