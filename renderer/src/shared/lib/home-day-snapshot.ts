import { readNutritionTargets, sumNutritionDay } from '@/shared/lib/nutrition-aggregate';
import { TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import type { AuraDatabase, AuraRow, AuraTaskProgress } from '@/types/aura';

export type RitualCountsByType = Record<string, { completed: number; total: number }>;

export type HomeDaySnapshot = {
  date: string;
  cfgTasks: AuraRow[];
  taskProgressById: Record<string, AuraTaskProgress | null>;
  timerTotalsByTaskId: Record<string, number>;
  ritualCountsByType: RitualCountsByType;
  categoryProgresses: Record<TaskCategoryId, number>;
  nutritionEntries: AuraRow[];
  nutritionTargets: ReturnType<typeof readNutritionTargets>;
  nutritionTotals: ReturnType<typeof sumNutritionDay>;
};

export type HomeDayBootstrap = Partial<HomeDaySnapshot> & {
  cfgRitualsMorning?: AuraRow[];
  cfgRitualsEvening?: AuraRow[];
  ritualsMorningRows?: AuraRow[];
  ritualsEveningRows?: AuraRow[];
  appSettings?: AuraRow | null;
};

const CATEGORIES = TASK_CATEGORY_IDS;

function clampPct(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function rowActive(row: AuraRow): boolean {
  const active = row.active;
  return !(active === 0 || active === '0' || active === false || active === 'false');
}

function safeRows(value: unknown): AuraRow[] {
  return Array.isArray(value) ? (value as AuraRow[]) : [];
}

function buildRitualCounts(
  morningCfg: AuraRow[],
  eveningCfg: AuraRow[],
  morningRows: AuraRow[],
  eveningRows: AuraRow[]
): RitualCountsByType {
  const morningIds = new Set(morningCfg.filter((row) => row.id && rowActive(row)).map((row) => String(row.id)));
  const eveningIds = new Set(eveningCfg.filter((row) => row.id && rowActive(row)).map((row) => String(row.id)));
  const countDone = (rows: AuraRow[], activeIds: Set<string>) =>
    rows.reduce((acc, row) => {
      const id = String(row.ritual_id ?? '');
      if (!id || !activeIds.has(id)) return acc;
      return acc + (Number(row.completed) === 1 ? 1 : 0);
    }, 0);

  return {
    sunrise: { completed: countDone(morningRows, morningIds), total: morningIds.size },
    sunset: { completed: countDone(eveningRows, eveningIds), total: eveningIds.size },
  };
}

function readTaskProgress(db: AuraDatabase, taskId: string, date: string): AuraTaskProgress | null {
  try {
    return db.getTaskProgress(taskId, date);
  } catch {
    return null;
  }
}

function readTimerTotal(db: AuraDatabase, date: string, taskId: string): number {
  try {
    return Math.max(0, Number(db.getTaskTimerTotal(date, taskId)) || 0);
  } catch {
    return 0;
  }
}

function progressObject(percent: number, value: unknown = percent): AuraTaskProgress {
  return {
    value,
    completed: percent >= 100 ? 1 : 0,
    current_value: value,
    selected_list_item: null,
    completion_percent: clampPct(percent),
  };
}

function taskProgressPercent(params: {
  task: AuraRow;
  progress: AuraTaskProgress | null;
  timerTotalSec: number;
  ritualCounts: RitualCountsByType;
  nutritionPct: number;
}): number {
  const { task, progress, timerTotalSec, ritualCounts, nutritionPct } = params;
  const taskType = String(task.task_type ?? '');
  if (taskType === 'timer') {
    const targetHours = Number(task.cfg_target_hours) || 0;
    if (targetHours <= 0) return 0;
    return clampPct((timerTotalSec / 3600 / targetHours) * 100);
  }
  if (taskType === 'ritual') {
    const counts = ritualCounts[String(task.ritual_type ?? 'sunrise')];
    if (!counts || counts.total <= 0) return 0;
    return clampPct((counts.completed / counts.total) * 100);
  }
  if (taskType === 'nutrition') return nutritionPct;
  return clampPct(progress?.completion_percent ?? 0);
}

function buildCategoryProgresses(
  cfgTasks: AuraRow[],
  progressById: Record<string, AuraTaskProgress | null>,
  timerTotalsByTaskId: Record<string, number>,
  ritualCountsByType: RitualCountsByType,
  nutritionPct: number
): Record<TaskCategoryId, number> {
  const out = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<TaskCategoryId, number>;
  for (const category of CATEGORIES) {
    const tasks = cfgTasks.filter((task) => String(task.category_type ?? '') === category && task.id);
    if (!tasks.length) {
      out[category] = 0;
      continue;
    }
    const total = tasks.reduce((acc, task) => {
      const id = String(task.id ?? '');
      return acc + taskProgressPercent({
        task,
        progress: progressById[id] ?? null,
        timerTotalSec: timerTotalsByTaskId[id] ?? 0,
        ritualCounts: ritualCountsByType,
        nutritionPct,
      });
    }, 0);
    out[category] = clampPct(total / tasks.length);
  }
  return out;
}

export function buildHomeDaySnapshot(
  db: AuraDatabase,
  date: string,
  bootstrap?: HomeDayBootstrap | null
): HomeDaySnapshot {
  // Only trust volatile (date-specific) data from bootstrap when the dates match.
  // If bootstrap is from a different day (stale after day switch), using its
  // volatile fields would cause a brief flash of wrong progress values.
  const bootstrapDateFresh = bootstrap?.date === date;

  const cfgTasks = safeRows(bootstrap?.cfgTasks);
  const tasks = cfgTasks.length ? cfgTasks : safeRows(db.getAll('cfg_tasks'));
  const morningCfg = safeRows(bootstrap?.cfgRitualsMorning).length
    ? safeRows(bootstrap?.cfgRitualsMorning)
    : safeRows(db.getAll('cfg_rituals_morning'));
  const eveningCfg = safeRows(bootstrap?.cfgRitualsEvening).length
    ? safeRows(bootstrap?.cfgRitualsEvening)
    : safeRows(db.getAll('cfg_rituals_evening'));
  const morningRows = bootstrapDateFresh && Array.isArray(bootstrap?.ritualsMorningRows)
    ? safeRows(bootstrap?.ritualsMorningRows)
    : safeRows(db.getRitualsMorning(date));
  const eveningRows = bootstrapDateFresh && Array.isArray(bootstrap?.ritualsEveningRows)
    ? safeRows(bootstrap?.ritualsEveningRows)
    : safeRows(db.getRitualsEvening(date));

  const taskProgressById: Record<string, AuraTaskProgress | null> = {};
  const timerTotalsByTaskId: Record<string, number> = {};
  const bootstrapProgress = bootstrapDateFresh && bootstrap?.taskProgressById && typeof bootstrap.taskProgressById === 'object'
    ? bootstrap.taskProgressById
    : {};
  const bootstrapTimers = bootstrapDateFresh && bootstrap?.timerTotalsByTaskId && typeof bootstrap.timerTotalsByTaskId === 'object'
    ? bootstrap.timerTotalsByTaskId
    : {};

  const nutritionEntries = bootstrapDateFresh && Array.isArray(bootstrap?.nutritionEntries)
    ? safeRows(bootstrap?.nutritionEntries)
    : safeRows(db.getNutritionEntries(date));
  const appSettings = (bootstrap?.appSettings ?? db.getAppSettings()) as AuraRow | null;
  const nutritionTotals = sumNutritionDay(nutritionEntries);
  const nutritionTargets = readNutritionTargets(appSettings);
  const nutritionTarget = Number(nutritionTargets.calories) || 0;
  const nutritionPct = nutritionTarget > 0
    ? clampPct((nutritionTotals.calories / nutritionTarget) * 100)
    : nutritionTotals.calories > 0 ? 100 : 0;
  const ritualCountsByType = bootstrapDateFresh && bootstrap?.ritualCountsByType && typeof bootstrap.ritualCountsByType === 'object'
    ? bootstrap.ritualCountsByType
    : buildRitualCounts(morningCfg, eveningCfg, morningRows, eveningRows);

  for (const task of tasks) {
    const id = String(task.id ?? '');
    if (!id) continue;
    const taskType = String(task.task_type ?? '');
    if (taskType === 'timer') {
      timerTotalsByTaskId[id] = Object.prototype.hasOwnProperty.call(bootstrapTimers, id)
        ? Math.max(0, Number(bootstrapTimers[id]) || 0)
        : readTimerTotal(db, date, id);
      const targetHours = Number(task.cfg_target_hours) || 0;
      const pct = targetHours > 0 ? clampPct((timerTotalsByTaskId[id] / 3600 / targetHours) * 100) : 0;
      taskProgressById[id] = progressObject(pct, pct);
      continue;
    }
    if (taskType === 'ritual') {
      const counts = ritualCountsByType[String(task.ritual_type ?? 'sunrise')];
      const pct = counts && counts.total > 0 ? clampPct((counts.completed / counts.total) * 100) : 0;
      taskProgressById[id] = progressObject(pct, pct);
      continue;
    }
    if (taskType === 'nutrition') {
      taskProgressById[id] = progressObject(nutritionPct, nutritionTotals.calories);
      continue;
    }
    // Task progress is volatile and often updated optimistically from the home list.
    // Prefer the current DB/proxy value so a stale bootstrap payload cannot briefly
    // revert the row before the fresh bootstrap response arrives.
    const dbProgress = readTaskProgress(db, id, date);
    taskProgressById[id] = dbProgress ?? (
      Object.prototype.hasOwnProperty.call(bootstrapProgress, id)
        ? (bootstrapProgress[id] ?? null)
        : null
    );
  }

  return {
    date,
    cfgTasks: tasks,
    taskProgressById,
    timerTotalsByTaskId,
    ritualCountsByType,
    categoryProgresses: buildCategoryProgresses(tasks, taskProgressById, timerTotalsByTaskId, ritualCountsByType, nutritionPct),
    nutritionEntries,
    nutritionTargets,
    nutritionTotals,
  };
}
