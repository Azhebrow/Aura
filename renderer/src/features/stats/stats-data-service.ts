import type { AuraDatabase, AuraRow } from '@/types/aura';
import type { StatsDayRow, StatsGroupBy, StatsMode, StatsTimeSummary } from '@/features/stats/types';
import { getCategoryTitle } from '@/shared/config/task-categories-settings';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';
import { readNutritionTargets } from '@/shared/lib/nutrition-aggregate';

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

type TimeMetricKey = 'Фокус' | 'Наполнение' | 'Эскапизм';

type TimeMetricTotals = {
  actualHours: number;
  targetHours: number;
};

type TimeMetricTask = AuraRow & {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  task_type?: unknown;
  cfg_target_hours?: unknown;
  leisure_type?: unknown;
  icon?: unknown;
  color?: unknown;
};

type TimeMetricContext = {
  dates: string[];
  byDate: Record<string, Record<TimeMetricKey, number>>;
  totals: Record<TimeMetricKey, TimeMetricTotals>;
  items: Array<{ key: TimeMetricKey; actualHours: number; targetHours: number; icon?: string; color?: string }>;
};

function isTimerTask(row: AuraRow | null | undefined): boolean {
  return Boolean(row && row.task_type === 'timer');
}

function toHours(totalSeconds: number): number {
  return totalSeconds / 3600;
}

function getTargetHours(task: AuraRow | null | undefined): number {
  const target = Number(task?.cfg_target_hours ?? 0);
  return Number.isFinite(target) && target > 0 ? target : 0;
}

function getTaskLabel(task: TimeMetricTask): string {
  return String(task.title ?? task.name ?? task.id ?? '');
}

function readNumericSetting(db: AuraDatabase, key: string): number {
  try {
    const settings = db.getAppSettings();
    const raw = settings && typeof settings === 'object' ? Number((settings as Record<string, unknown>)[key]) : 0;
    return Number.isFinite(raw) ? raw : 0;
  } catch {
    return 0;
  }
}

function collectTimeMetricContext(db: AuraDatabase, startDate: string, endDate: string): TimeMetricContext {
  const dates = generateDateRange(startDate, endDate);
  const focusTasks = (db.getTasksByCategory('time') || []).filter(isTimerTask) as TimeMetricTask[];
  const leisureTasks = (db.getAll('cfg_leisure_tasks') || []).filter(isTimerTask) as TimeMetricTask[];
  const fillingTasks = leisureTasks.filter((task) => String(task.leisure_type ?? '') === 'filling');
  const escapeTasks = leisureTasks.filter((task) => String(task.leisure_type ?? '') === 'escape');

  const groups: Array<{ key: TimeMetricKey; tasks: TimeMetricTask[] }> = [
    { key: 'Фокус', tasks: focusTasks },
    { key: 'Наполнение', tasks: fillingTasks },
    { key: 'Эскапизм', tasks: escapeTasks },
  ];

  const totals: Record<TimeMetricKey, TimeMetricTotals> = {
    'Фокус': { actualHours: 0, targetHours: 0 },
    'Наполнение': { actualHours: 0, targetHours: 0 },
    'Эскапизм': { actualHours: 0, targetHours: 0 },
  };

  const byDate: Record<string, Record<TimeMetricKey, number>> = {};
  for (const date of dates) {
    const values: Record<TimeMetricKey, number> = { 'Фокус': 0, 'Наполнение': 0, 'Эскапизм': 0 };
    for (const group of groups) {
      let dayHours = 0;
      for (const task of group.tasks) {
        try {
          const totalSeconds = db.getTaskTimerTotal(date, String(task.id ?? '')) || 0;
          dayHours += toHours(Number(totalSeconds) || 0);
        } catch {
          /* ignore */
        }
      }
      values[group.key] = dayHours;
      totals[group.key].actualHours += dayHours;
    }
    byDate[date] = values;
  }

  const daysCount = Math.max(dates.length, 1);
  for (const group of groups) {
    totals[group.key].targetHours = group.tasks.reduce((sum, task) => sum + getTargetHours(task), 0) * daysCount;
  }

  const items = groups.map((group) => ({
    key: group.key,
    actualHours: totals[group.key].actualHours,
    targetHours: totals[group.key].targetHours,
  }));

  return { dates, byDate, totals, items };
}

function getPercentValue(actual: number, target: number): number {
  if (!Number.isFinite(actual)) return 0;
  if (!(target > 0)) return 0;
  return (actual / target) * 100;
}

export function getTasksData(db: AuraDatabase, startDate: string, endDate: string, groupBy: StatsGroupBy): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  const categories = ['rituals', 'time', 'body', 'deps'] as const;

  if (groupBy === 'categories') {
    return dates.map((date) => {
      const values: Record<string, number> = {};
      const progressMap = getCategoryProgresses(db, date, categories);
      for (const categoryType of categories) {
        const categoryTitle = getCategoryTitle(categoryType, db);
        values[categoryTitle] = Number(progressMap[categoryType] ?? 0);
      }
      return { date, values };
    });
  }

  const allTasks: Array<AuraRow & { categoryType: string }> = [];
  for (const categoryType of categories) {
    try {
      const tasks = db.getTasksByCategory(categoryType);
      for (const task of tasks) allTasks.push({ ...task, categoryType });
    } catch {
      /* ignore */
    }
  }

  return dates.map((date) => {
    const values: Record<string, number> = {};
    for (const task of allTasks) {
      const id = String(task.id ?? '');
      const title = String(task.title ?? id);
      try {
        const progress = db.getTaskProgress(id, date);
        values[title] = progress?.completion_percent != null ? Number(progress.completion_percent) : 0;
      } catch {
        values[title] = 0;
      }
    }
    return { date, values };
  });
}

export function getFinanceData(db: AuraDatabase, startDate: string, endDate: string, groupBy: StatsGroupBy): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  let filteredTransactions: AuraRow[] = [];
  try {
    filteredTransactions = db.getTransactionsBetween(startDate, endDate);
  } catch {
    filteredTransactions = [];
  }

  if (groupBy === 'categories') {
    return dates.map((date) => {
      const totalIncome = filteredTransactions.filter((t) => t.date === date && t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const totalExpense = filteredTransactions.filter((t) => t.date === date && t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      return { date, values: { Доходы: totalIncome, Расходы: -totalExpense } };
    });
  }

  const incomeCategories = db.getAll('cfg_income_categories');
  const expenseCategories = db.getAll('cfg_expense_categories');

  return dates.map((date) => {
    const values: Record<string, number> = {};
    for (const category of incomeCategories) {
      const cid = String(category.id ?? '');
      const sum = filteredTransactions.filter((t) => t.date === date && t.type === 'income' && String(t.category_id ?? '') === cid).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      values[`+ ${String(category.title ?? cid)}`] = sum;
    }
    for (const category of expenseCategories) {
      const cid = String(category.id ?? '');
      const sum = filteredTransactions.filter((t) => t.date === date && t.type === 'expense' && String(t.category_id ?? '') === cid).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      values[`- ${String(category.title ?? cid)}`] = -sum;
    }
    return { date, values };
  });
}

export function getTimeAndLeisureData(db: AuraDatabase, startDate: string, endDate: string, groupBy: StatsGroupBy): StatsDayRow[] {
  const context = collectTimeMetricContext(db, startDate, endDate);

  if (groupBy === 'categories') {
    return context.dates.map((date) => {
      const values = context.byDate[date] ?? { 'Фокус': 0, 'Наполнение': 0, 'Эскапизм': 0 };
      return {
        date,
        values: {
          'Фокус': Number(values['Фокус'] ?? 0),
          'Наполнение': Number(values['Наполнение'] ?? 0),
          'Эскапизм': Number(values['Эскапизм'] ?? 0),
        },
      };
    });
  }

  const focusTasks = (db.getTasksByCategory('time') || []).filter(isTimerTask) as TimeMetricTask[];
  const leisureTasks = (db.getAll('cfg_leisure_tasks') || []).filter(isTimerTask) as TimeMetricTask[];
  const sortedLeisure = [...leisureTasks].sort((a, b) => {
    if (a.leisure_type === 'filling' && b.leisure_type === 'escape') return -1;
    if (a.leisure_type === 'escape' && b.leisure_type === 'filling') return 1;
    return 0;
  });

  return context.dates.map((date) => {
    const values: Record<string, number> = {};
    for (const task of focusTasks) {
      const title = getTaskLabel(task);
      const actual = (() => {
        try {
          return toHours(db.getTaskTimerTotal(date, String(task.id ?? '')) || 0);
        } catch {
          return 0;
        }
      })();
      values[title] = actual;
    }
    for (const task of sortedLeisure) {
      const title = getTaskLabel(task);
      const actual = (() => {
        try {
          return toHours(db.getTaskTimerTotal(date, String(task.id ?? '')) || 0);
        } catch {
          return 0;
        }
      })();
      values[title] = actual;
    }
    return { date, values };
  });
}

export function buildTimePeriodSummary(db: AuraDatabase, startDate: string, endDate: string): StatsTimeSummary {
  const context = collectTimeMetricContext(db, startDate, endDate);
  const totalTargetHours = context.items.reduce((sum, item) => sum + item.targetHours, 0);
  const totalActualHours = context.items.reduce((sum, item) => sum + item.actualHours, 0);

  const colors = {
    'Фокус': '#60a5fa',
    'Наполнение': '#22c55e',
    'Эскапизм': '#a855f7',
  } as const;

  return {
    items: context.items.map((item) => ({
      ...item,
      color: colors[item.key],
    })),
    totalActualHours,
    totalTargetHours,
  };
}

function ritualCompleted(row: AuraRow | null | undefined): boolean {
  if (!row) return false;
  return row.completed === 1 || row.completed === true;
}

export function getRitualsData(db: AuraDatabase, startDate: string, endDate: string, groupBy: StatsGroupBy): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);

  if (groupBy === 'categories') {
    return dates.map((date) => {
      let morning = 0;
      let evening = 0;
      try {
        morning = db.calculateRitualProgress('sunrise', date) ?? 0;
        evening = db.calculateRitualProgress('sunset', date) ?? 0;
      } catch {
        morning = 0;
        evening = 0;
      }
      return { date, values: { Утро: morning, Вечер: evening } };
    });
  }

  const morningRituals = db.getAll('cfg_rituals_morning').filter((r) => r.active !== 0);
  const eveningRituals = db.getAll('cfg_rituals_evening').filter((r) => r.active !== 0);

  return dates.map((date) => {
    const values: Record<string, number> = {};
    for (const ritual of morningRituals) {
      const rid = String(ritual.id ?? '');
      const title = String(ritual.title ?? rid);
      try {
        const st = db.getRitualMorningStatus(date, rid);
        values[title] = ritualCompleted(st) ? 100 : 0;
      } catch {
        values[title] = 0;
      }
    }
    for (const ritual of eveningRituals) {
      const rid = String(ritual.id ?? '');
      const title = String(ritual.title ?? rid);
      try {
        const st = db.getRitualEveningStatus(date, rid);
        values[title] = ritualCompleted(st) ? 100 : 0;
      } catch {
        values[title] = 0;
      }
    }
    return { date, values };
  });
}

export function getRankPointsData(db: AuraDatabase, startDate: string, endDate: string): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  let allPoints: AuraRow[] = [];
  try {
    allPoints = db.getDailyPointsBetween(startDate, endDate);
  } catch {
    allPoints = [];
  }
  const pointsMap = new Map<string, AuraRow>();
  for (const p of allPoints) {
    if (typeof p.date === 'string') pointsMap.set(p.date, p);
  }

  return dates.map((date) => {
    const pointRecord = pointsMap.get(date);
    let cumulative = 0;
    if (pointRecord) cumulative = Number(pointRecord.cumulative_points) || 0;
    else {
      try {
        cumulative = db.getLastCumulativePointsBefore(date);
      } catch {
        cumulative = 0;
      }
    }
    return { date, values: { 'Очки ранга': cumulative } };
  });
}

export function getRankDailyPointsData(db: AuraDatabase, startDate: string, endDate: string): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  let allPoints: AuraRow[] = [];
  try {
    allPoints = db.getDailyPointsBetween(startDate, endDate);
  } catch {
    allPoints = [];
  }
  const pointsMap = new Map<string, AuraRow>();
  for (const p of allPoints) {
    if (typeof p.date === 'string') pointsMap.set(p.date, p);
  }

  return dates.map((date) => {
    const pointRecord = pointsMap.get(date);
    const daily = pointRecord ? Number(pointRecord.daily_points) || 0 : 0;
    return { date, values: { 'Очки ранга': daily } };
  });
}

export function getMoodData(db: AuraDatabase, startDate: string, endDate: string): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  let allEntries: AuraRow[] = [];
  try {
    allEntries = db.getDiaryEntriesBetween(startDate, endDate, { moodOnly: true });
  } catch {
    allEntries = [];
  }
  const moods = db.getAll('cfg_diary_moods') || [];
  const moodMap = new Map<string, AuraRow>();
  for (const mood of moods) {
    if (mood.id != null) moodMap.set(String(mood.id), mood);
  }
  const entriesMap = new Map<string, AuraRow>();
  for (const e of allEntries) {
    if (typeof e.date === 'string') entriesMap.set(e.date, e);
  }

  return dates.map((date) => {
    const entry = entriesMap.get(date);
    const values: Record<string, number | null> = { Настроение: null };
    if (entry?.mood_id) {
      const mood = moodMap.get(String(entry.mood_id));
      values['Настроение'] = mood ? Number(mood.level) || 0 : 0;
    }
    return { date, values };
  });
}

function isNutritionDishEntry(db: AuraDatabase, entry: AuraRow): boolean {
  const pid = entry.product_id != null ? String(entry.product_id) : '';
  if (pid) {
    const row = db.getById('cfg_nutrition_products', pid);
    const g = row && typeof row === 'object' && 'group' in row ? String((row as { group?: string }).group ?? '') : '';
    return g === 'dishes';
  }
  const prid = entry.preset_id != null ? String(entry.preset_id) : '';
  if (prid) {
    const row = db.getById('cfg_nutrition_presets', prid);
    const g = row && typeof row === 'object' && 'group' in row ? String((row as { group?: string }).group ?? '') : '';
    return g === 'dishes';
  }
  return false;
}

export function getNutritionData(db: AuraDatabase, startDate: string, endDate: string, groupBy: StatsGroupBy): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  const allEntries: Array<AuraRow & { date: string }> = [];
  for (const date of dates) {
    try {
      const entries = db.getNutritionEntries(date);
      for (const e of entries) {
        if (isNutritionDishEntry(db, e)) continue;
        allEntries.push({ ...e, date });
      }
    } catch {
      /* ignore */
    }
  }

  if (groupBy === 'categories') {
    return dates.map((date) => {
      const values: Record<string, number> = { Белки: 0, Жиры: 0, Углеводы: 0, Калории: 0 };
      for (const entry of allEntries.filter((e) => e.date === date)) {
        values['Белки'] += Number(entry.total_proteins) || 0;
        values['Жиры'] += Number(entry.total_fats) || 0;
        values['Углеводы'] += Number(entry.total_carbs) || 0;
        values['Калории'] += Number(entry.total_calories) || 0;
      }
      return { date, values };
    });
  }

  return dates.map((date) => {
    const values: Record<string, { calories: number; proteins: number; fats: number; carbs: number }> = {};
    for (const entry of allEntries.filter((e) => e.date === date)) {
      let title: string | null = null;
      if (entry.product_id) {
        const product = db.getById('cfg_nutrition_products', String(entry.product_id));
        title = product ? String(product.title ?? entry.product_id) : null;
      } else if (entry.preset_id) {
        const preset = db.getById('cfg_nutrition_presets', String(entry.preset_id));
        title = preset ? String(preset.title ?? entry.preset_id) : null;
      }
      if (title) {
        if (!values[title]) values[title] = { calories: 0, proteins: 0, fats: 0, carbs: 0 };
        values[title].calories += Number(entry.total_calories) || 0;
        values[title].proteins += Number(entry.total_proteins) || 0;
        values[title].fats += Number(entry.total_fats) || 0;
        values[title].carbs += Number(entry.total_carbs) || 0;
      }
    }
    return { date, values };
  });
}

export function getCorrelationData(db: AuraDatabase, startDate: string, endDate: string): StatsDayRow[] {
  const dates = generateDateRange(startDate, endDate);
  const timeContext = collectTimeMetricContext(db, startDate, endDate);
  const ritualsRows = getRitualsData(db, startDate, endDate, 'categories');
  const moodRows = getMoodData(db, startDate, endDate);
  const nutritionRows = getNutritionData(db, startDate, endDate, 'categories');

  const ritualByDate = new Map(ritualsRows.map((row) => [row.date, row.values]));
  const moodByDate = new Map(moodRows.map((row) => [row.date, row.values]));
  const nutritionByDate = new Map(nutritionRows.map((row) => [row.date, row.values]));

  let dailyPointsRows: AuraRow[] = [];
  try {
    dailyPointsRows = db.getDailyPointsBetween(startDate, endDate);
  } catch {
    dailyPointsRows = [];
  }
  const pointsByDate = new Map<string, AuraRow>();
  for (const row of dailyPointsRows) {
    if (typeof row.date === 'string') pointsByDate.set(row.date, row);
  }

  let maxMoodLevel = 5;
  try {
    const moods = db.getAll('cfg_diary_moods') || [];
    const levels = moods.map((m) => Number(m.level)).filter((v) => Number.isFinite(v) && v > 0);
    if (levels.length > 0) maxMoodLevel = Math.max(...levels);
  } catch {
    /* ignore */
  }

  const nutritionTargets = readNutritionTargets(db.getAppSettings() ?? null);
  const dailyTimeTargetHours = {
    'Фокус': timeContext.totals['Фокус'].targetHours / Math.max(dates.length, 1),
    'Наполнение': timeContext.totals['Наполнение'].targetHours / Math.max(dates.length, 1),
    'Эскапизм': timeContext.totals['Эскапизм'].targetHours / Math.max(dates.length, 1),
  };

  return dates.map((date) => {
    const ritual = ritualByDate.get(date) ?? {};
    const mood = moodByDate.get(date) ?? {};
    const nutrition = nutritionByDate.get(date) ?? {};
    const points = pointsByDate.get(date);
    const time = timeContext.byDate[date] ?? { 'Фокус': 0, 'Наполнение': 0, 'Эскапизм': 0 };

    const morning = Number(ritual['Утро'] ?? 0);
    const evening = Number(ritual['Вечер'] ?? 0);
    const ritualPercent = (morning + evening) / 2;
    const completionPercent = Number(points?.completion_percent);
    const successPercent = Number.isFinite(completionPercent) ? Math.max(0, Math.min(100, completionPercent)) : 0;
    const moodLevel = Number(mood['Настроение'] ?? 0);

    return {
      date,
      values: {
        'Успех, %': successPercent,
        'Фокус, %': getPercentValue(Number(time['Фокус'] ?? 0), dailyTimeTargetHours['Фокус']),
        'Калории, %': getPercentValue(Number(nutrition['Калории'] ?? 0), nutritionTargets.calories),
        'Ритуалы, %': Number.isFinite(ritualPercent) ? ritualPercent : 0,
        'Настроение, %': getPercentValue(Number.isFinite(moodLevel) ? moodLevel : 0, maxMoodLevel),
        'Эскапизм, %': getPercentValue(Number(time['Эскапизм'] ?? 0), dailyTimeTargetHours['Эскапизм']),
        'Наполнение, %': getPercentValue(Number(time['Наполнение'] ?? 0), dailyTimeTargetHours['Наполнение']),
      },
    };
  });
}

export function getStatsData(db: AuraDatabase, mode: StatsMode, startDate: string, endDate: string, groupBy: StatsGroupBy): StatsDayRow[] {
  switch (mode) {
    case 'tasks':
      return getTasksData(db, startDate, endDate, groupBy);
    case 'finance':
      return getFinanceData(db, startDate, endDate, groupBy);
    case 'time':
    case 'leisure':
      return getTimeAndLeisureData(db, startDate, endDate, groupBy);
    case 'rituals':
      return getRitualsData(db, startDate, endDate, groupBy);
    case 'rank':
      return getRankPointsData(db, startDate, endDate);
    case 'mood':
      return getMoodData(db, startDate, endDate);
    case 'nutrition':
      return getNutritionData(db, startDate, endDate, groupBy);
    case 'correlation':
      return getCorrelationData(db, startDate, endDate);
    default:
      return [];
  }
}
