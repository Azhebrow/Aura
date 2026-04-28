import type { AuraDatabase } from '@/types/aura';

/** Значение в ячейке дня: число, объект БЖУ или null (настроение). */
export type StatsCellValue = number | Record<string, number> | null;

export type StatsMode =
  | 'tasks'
  | 'finance'
  | 'time'
  | 'leisure'
  | 'rituals'
  | 'rank'
  | 'mood'
  | 'nutrition'
  | 'correlation';

export type StatsViewType = 'table' | 'chart';

export type StatsAggregation = 'day' | 'week' | 'month' | 'year';

/** В UI — «Элементы»; в сервисе совпадает с legacy `!== 'categories'`. */
export type StatsGroupBy = 'categories' | 'elements';

export type StatsDayRow = {
  date: string;
  values: Record<string, StatsCellValue>;
};

export type StatsAggregatedRow = {
  date: string;
  label: string;
  values: Record<string, StatsCellValue>;
  dateRange: { startDate: string; endDate: string } | null;
};

export type StatsMeta = {
  icons: Record<string, string>;
  colors: Record<string, string>;
  moodNames?: Record<number, string>;
  leisureTaskTypes?: Record<string, string>;
  financeCategoryTypes?: Record<string, 'income' | 'expense'>;
  ritualTypes?: Record<string, 'morning' | 'evening'>;
};

export type StatsControlsState = {
  mode: StatsMode;
  viewType: StatsViewType;
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  period: number;
  startDate: string;
  endDate: string;
  /** null — все серии; иначе список видимых ключей (как в legacy `visibleKeys`). */
  selectedSeriesKeys: string[] | null;
};

export type { AuraDatabase };
