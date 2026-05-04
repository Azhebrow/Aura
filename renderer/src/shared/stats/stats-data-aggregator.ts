import type { StatsAggregatedRow, StatsAggregation, StatsCellValue, StatsDayRow, StatsMode } from './types';

function getWeekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  return x;
}

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getYearStart(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00`);
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = parseDate(startDate);
  const end = parseDate(endDate);
  while (current <= end) {
    dates.push(formatDate(new Date(current)));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getWeekEnd(weekStart: Date): Date {
  const x = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? 0 : 7);
  x.setDate(diff);
  return x;
}

function getMonthEnd(monthStart: Date): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
}

function getYearEnd(yearStart: Date): Date {
  return new Date(yearStart.getFullYear(), 11, 31);
}

function aggregateKeyValues(mode: StatsMode, key: string, rawValues: (StatsCellValue | undefined)[]): StatsCellValue | undefined {
  const values = rawValues.filter((v) => v !== null && v !== undefined) as StatsCellValue[];
  if (values.length === 0) return undefined;

  const firstValue = values[0];
  const isNutritionCategoryKey = ['Белки', 'Жиры', 'Углеводы', 'Калории'].includes(key);

  if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue) && !isNutritionCategoryKey) {
    type NutritionTotals = { calories: number; proteins: number; fats: number; carbs: number };
    return values.reduce(
      (acc: NutritionTotals, v) => {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          const o = v as { calories?: number; proteins?: number; fats?: number; carbs?: number };
          return {
            calories: (acc.calories || 0) + (o.calories || 0),
            proteins: (acc.proteins || 0) + (o.proteins || 0),
            fats: (acc.fats || 0) + (o.fats || 0),
            carbs: (acc.carbs || 0) + (o.carbs || 0),
          };
        }
        return acc;
      },
      { calories: 0, proteins: 0, fats: 0, carbs: 0 } as NutritionTotals
    );
  }

  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return undefined;

  if (mode === 'mood') return nums.reduce((s, v) => s + v, 0) / nums.length;
  if (mode === 'tasks' || mode === 'rituals' || mode === 'correlation') return nums.reduce((s, v) => s + v, 0) / nums.length;
  if (mode === 'rank') return nums[nums.length - 1];
  return nums.reduce((s, v) => s + v, 0);
}

export function aggregateByDays(data: StatsDayRow[], startDate: string, endDate: string): StatsAggregatedRow[] {
  const dates = generateDateRange(startDate, endDate);
  return dates.map((date) => {
    const dayData = data.find((d) => d.date === date);
    return { date, label: date, values: dayData ? { ...dayData.values } : {}, dateRange: null };
  });
}

export function aggregateByWeeks(data: StatsDayRow[], startDate: string, endDate: string, mode: StatsMode): StatsAggregatedRow[] {
  const weekGroups = new Map<string, { date: string; label: string; values: Record<string, StatsCellValue>; days: StatsDayRow[]; weekStart: Date }>();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  for (const dayData of data) {
    const date = parseDate(dayData.date);
    const weekStart = getWeekStart(date);
    const weekKey = formatDate(weekStart);
    if (!weekGroups.has(weekKey)) weekGroups.set(weekKey, { date: weekKey, label: weekKey, values: {}, days: [], weekStart });
    weekGroups.get(weekKey)!.days.push(dayData);
  }

  const allWeeks = new Map<string, { date: string; label: string; values: Record<string, StatsCellValue>; days: StatsDayRow[]; weekStart: Date }>();
  let currentWeekStart = getWeekStart(start);
  while (currentWeekStart <= end) {
    const weekKey = formatDate(currentWeekStart);
    if (!allWeeks.has(weekKey)) allWeeks.set(weekKey, { date: weekKey, label: weekKey, values: {}, days: [], weekStart: new Date(currentWeekStart) });
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  weekGroups.forEach((week, weekKey) => {
    if (allWeeks.has(weekKey)) allWeeks.set(weekKey, week);
  });

  const result: StatsAggregatedRow[] = [];
  for (const [, week] of allWeeks.entries()) {
    const weekEnd = getWeekEnd(week.weekStart);
    if (week.weekStart > end || weekEnd < start) continue;

    const aggregatedValues: Record<string, StatsCellValue> = {};
    const allKeys = new Set<string>();
    for (const day of week.days) Object.keys(day.values || {}).forEach((k) => allKeys.add(k));
    for (const key of allKeys) {
      const vals = week.days.map((day) => day.values?.[key]);
      const part = aggregateKeyValues(mode, key, vals);
      if (part !== undefined) aggregatedValues[key] = part;
    }

    const weekStartInRange = week.weekStart < start ? start : week.weekStart;
    const weekEndInRange = weekEnd > end ? end : weekEnd;
    result.push({
      date: week.date,
      label: week.label,
      values: aggregatedValues,
      dateRange: { startDate: formatDate(weekStartInRange), endDate: formatDate(weekEndInRange) },
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByMonths(data: StatsDayRow[], startDate: string, endDate: string, mode: StatsMode): StatsAggregatedRow[] {
  const monthGroups = new Map<string, { date: string; label: string; values: Record<string, StatsCellValue>; days: StatsDayRow[]; monthStart: Date }>();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  for (const dayData of data) {
    const date = parseDate(dayData.date);
    const monthStart = getMonthStart(date);
    const monthKey = formatDate(monthStart);
    if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, { date: monthKey, label: monthKey, values: {}, days: [], monthStart });
    monthGroups.get(monthKey)!.days.push(dayData);
  }

  const allMonths = new Map<string, { date: string; label: string; values: Record<string, StatsCellValue>; days: StatsDayRow[]; monthStart: Date }>();
  let currentMonthStart = getMonthStart(start);
  while (currentMonthStart <= end) {
    const monthKey = formatDate(currentMonthStart);
    if (!allMonths.has(monthKey)) allMonths.set(monthKey, { date: monthKey, label: monthKey, values: {}, days: [], monthStart: new Date(currentMonthStart) });
    currentMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1);
  }

  monthGroups.forEach((m, k) => {
    if (allMonths.has(k)) allMonths.set(k, m);
  });

  const result: StatsAggregatedRow[] = [];
  for (const [, month] of allMonths.entries()) {
    const monthEnd = getMonthEnd(month.monthStart);
    if (month.monthStart > end || monthEnd < start) continue;

    const aggregatedValues: Record<string, StatsCellValue> = {};
    const allKeys = new Set<string>();
    for (const day of month.days) Object.keys(day.values || {}).forEach((k) => allKeys.add(k));
    for (const key of allKeys) {
      const vals = month.days.map((day) => day.values?.[key]);
      const part = aggregateKeyValues(mode, key, vals);
      if (part !== undefined) aggregatedValues[key] = part;
    }

    const monthStartInRange = month.monthStart < start ? start : month.monthStart;
    const monthEndInRange = monthEnd > end ? end : monthEnd;
    result.push({
      date: month.date,
      label: month.label,
      values: aggregatedValues,
      dateRange: { startDate: formatDate(monthStartInRange), endDate: formatDate(monthEndInRange) },
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByYears(data: StatsDayRow[], startDate: string, endDate: string, mode: StatsMode): StatsAggregatedRow[] {
  const yearGroups = new Map<string, { date: string; label: string; values: Record<string, StatsCellValue>; days: StatsDayRow[]; yearStart: Date }>();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  for (const dayData of data) {
    const date = parseDate(dayData.date);
    const yearStart = getYearStart(date);
    const yearKey = formatDate(yearStart);
    if (!yearGroups.has(yearKey)) yearGroups.set(yearKey, { date: yearKey, label: yearKey, values: {}, days: [], yearStart });
    yearGroups.get(yearKey)!.days.push(dayData);
  }

  const allYears = new Map<string, { date: string; label: string; values: Record<string, StatsCellValue>; days: StatsDayRow[]; yearStart: Date }>();
  let currentYearStart = getYearStart(start);
  while (currentYearStart <= end) {
    const yearKey = formatDate(currentYearStart);
    if (!allYears.has(yearKey)) allYears.set(yearKey, { date: yearKey, label: yearKey, values: {}, days: [], yearStart: new Date(currentYearStart) });
    currentYearStart = new Date(currentYearStart.getFullYear() + 1, 0, 1);
  }

  yearGroups.forEach((y, k) => {
    if (allYears.has(k)) allYears.set(k, y);
  });

  const result: StatsAggregatedRow[] = [];
  for (const [, year] of allYears.entries()) {
    const yearEnd = getYearEnd(year.yearStart);
    if (year.yearStart > end || yearEnd < start) continue;

    const aggregatedValues: Record<string, StatsCellValue> = {};
    const allKeys = new Set<string>();
    for (const day of year.days) Object.keys(day.values || {}).forEach((k) => allKeys.add(k));
    for (const key of allKeys) {
      const vals = year.days.map((day) => day.values?.[key]);
      const part = aggregateKeyValues(mode, key, vals);
      if (part !== undefined) aggregatedValues[key] = part;
    }

    const yearStartInRange = year.yearStart < start ? start : year.yearStart;
    const yearEndInRange = yearEnd > end ? end : yearEnd;
    result.push({
      date: year.date,
      label: year.label,
      values: aggregatedValues,
      dateRange: { startDate: formatDate(yearStartInRange), endDate: formatDate(yearEndInRange) },
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateData(data: StatsDayRow[], aggregation: StatsAggregation, startDate: string, endDate: string, mode: StatsMode): StatsAggregatedRow[] {
  switch (aggregation) {
    case 'week':
      return aggregateByWeeks(data, startDate, endDate, mode);
    case 'month':
      return aggregateByMonths(data, startDate, endDate, mode);
    case 'year':
      return aggregateByYears(data, startDate, endDate, mode);
    case 'day':
    default:
      return aggregateByDays(data, startDate, endDate);
  }
}
