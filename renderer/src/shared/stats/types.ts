import type { AuraDatabase } from '@/types/aura';

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

export type StatsAggregation = 'day' | 'week' | 'month' | 'year';

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

export type StatsTimeSummaryItem = {
  key: string;
  actualHours: number;
  targetHours: number;
  icon?: string;
  color?: string;
};

export type StatsTimeSummary = {
  items: StatsTimeSummaryItem[];
  totalActualHours: number;
  totalTargetHours: number;
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
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  period: number;
  startDate: string;
  endDate: string;
  selectedSeriesKeys: string[] | null;
};

export type { AuraDatabase };
