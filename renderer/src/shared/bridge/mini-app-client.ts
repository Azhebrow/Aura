type BatchResult = {
  index: number;
  status: number;
  ok: boolean;
  result?: unknown;
  error?: string;
};

type PendingCall = {
  method: string;
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type BootstrapCacheEntry = {
  ts: number;
  data: unknown;
};

type InvalidationDetail = {
  type?: string;
  date?: string;
  entityId?: string;
  scope?: string;
};

const BATCH_FLUSH_MS = 20;
const DEFAULT_BOOTSTRAP_TTL_MS = 4200;
const BOOTSTRAP_TTL_BY_SCREEN: Record<string, number> = {
  home: 5200,
  rituals: 4600,
  sidebar: 5200,
  'date-strip': 5200,
};

const pendingQueue: PendingCall[] = [];
const inflightReads = new Map<string, Promise<unknown>>();
const inflightBootstrap = new Map<string, Promise<unknown>>();
const bootstrapCache = new Map<string, BootstrapCacheEntry>();
let flushTimer: number | null = null;

function getDataSourceMode() {
  if (typeof window === 'undefined') return 'unavailable';
  if ((window as Window & { __auraWebMode?: boolean }).__auraWebMode) return 'web-mini-api';
  if (typeof (window as Window & { getDB?: () => unknown }).getDB === 'function') return 'electron-direct';
  return 'unavailable';
}

function isWebMode() {
  return getDataSourceMode() === 'web-mini-api';
}

function screensForMutation(detail?: InvalidationDetail): Set<string> | null {
  if (!detail?.type || detail.scope === 'global') return null;
  const screens =
    detail.type === 'timer'
      ? ['home', 'sidebar']
      : detail.type === 'ritual'
        ? ['home', 'rituals', 'sidebar']
        : detail.type === 'nutrition' || detail.type === 'diary' || detail.type === 'transaction'
          ? ['home', 'sidebar']
          : detail.type === 'points'
            ? ['sidebar', 'date-strip']
            : detail.type === 'goals'
              ? ['rituals']
              : ['home', 'rituals', 'sidebar', 'date-strip'];
  return new Set(screens);
}

function cacheKeyScreen(key: string) {
  return key.slice(0, key.indexOf(':'));
}

function stableKey(method: string, args: unknown[]) {
  return `${method}:${JSON.stringify(args ?? [])}`;
}

function isMutationMethod(method: string) {
  return /^(add|create|update|save|delete|clear|reload|move|set)/i.test(method);
}

function asDbAny(db: unknown): Record<string, unknown> {
  return db as Record<string, unknown>;
}

function callDbMethod<T>(dbAny: Record<string, unknown>, method: string, args: unknown[] = [], fallback: T): T {
  const fn = dbAny[method];
  if (typeof fn !== 'function') return fallback;
  try {
    return (fn as (...a: unknown[]) => T).apply(dbAny, args);
  } catch {
    return fallback;
  }
}

function isActiveRow(row: Record<string, unknown>): boolean {
  const active = row.active;
  return !(active === 0 || active === '0' || active === false || active === 'false');
}

function buildRitualCountsByType(
  morningCfg: Array<Record<string, unknown>>,
  eveningCfg: Array<Record<string, unknown>>,
  morningRows: Array<Record<string, unknown>>,
  eveningRows: Array<Record<string, unknown>>
) {
  const morningIds = new Set(morningCfg.filter((row) => row.id && isActiveRow(row)).map((row) => String(row.id)));
  const eveningIds = new Set(eveningCfg.filter((row) => row.id && isActiveRow(row)).map((row) => String(row.id)));
  const countDone = (rows: Array<Record<string, unknown>>, ids: Set<string>) =>
    rows.reduce((acc, row) => {
      const ritualId = String(row.ritual_id ?? '');
      if (!ritualId || !ids.has(ritualId)) return acc;
      return acc + (Number(row.completed) === 1 ? 1 : 0);
    }, 0);
  return {
    sunrise: { completed: countDone(morningRows, morningIds), total: morningIds.size },
    sunset: { completed: countDone(eveningRows, eveningIds), total: eveningIds.size },
  };
}

async function flushBatch() {
  const chunk = pendingQueue.splice(0, pendingQueue.length);
  flushTimer = null;
  if (!chunk.length) return;

  if (isWebMode()) {
    try {
      const response = await fetch('/api/db/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: chunk.map(({ method, args }) => ({ method, args })) }),
      });
      const json = await response.json();
      const results: BatchResult[] = json.results ?? [];
      for (const [index, pending] of chunk.entries()) {
        const r = results[index];
        if (!r) { pending.reject(new Error(`No result for index ${index}`)); continue; }
        if (r.ok) pending.resolve(r.result);
        else pending.reject(new Error(r.error ?? 'DB error'));
      }
    } catch (error) {
      chunk.forEach((p) => p.reject(error));
    }
    return;
  }

  try {
    const db = typeof window !== 'undefined' && typeof (window as Window & { getDB?: () => unknown }).getDB === 'function'
      ? (window as Window & { getDB: () => unknown }).getDB()
      : null;
    if (!db) {
      throw new Error('Database not available: window.getDB() is not initialized');
    }

    for (const pending of chunk) {
      try {
        const dbAny = db as unknown as Record<string, unknown>;
        const dbMethod = dbAny[pending.method];
        if (typeof dbMethod !== 'function') {
          throw new Error(`DB method not found: ${pending.method}`);
        }
        const result = (dbMethod as (...a: unknown[]) => unknown).apply(db, pending.args);
        pending.resolve(result);
      } catch (error) {
        pending.reject(error);
      }
    }
  } catch (error) {
    chunk.forEach((entry) => entry.reject(error));
  }
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    void flushBatch();
  }, BATCH_FLUSH_MS);
}

function enqueueDbCall(method: string, args: unknown[]) {
  return new Promise<unknown>((resolve, reject) => {
    pendingQueue.push({ method, args, resolve, reject });
    scheduleFlush();
  });
}

export async function callDbBatched(method: string, args: unknown[] = []): Promise<unknown> {
  const key = stableKey(method, args);
  const mutation = isMutationMethod(method);

  if (!mutation && inflightReads.has(key)) {
    return inflightReads.get(key)!;
  }

  const promise = enqueueDbCall(method, args);
  if (!mutation) {
    inflightReads.set(key, promise);
  }

  try {
    const result = await promise;
    if (mutation) {
          bootstrapCache.clear();
    }
    return result;
  } finally {
    if (!mutation) inflightReads.delete(key);
  }
}

export async function fetchBootstrap(
  screen: 'home' | 'rituals' | 'sidebar' | 'date-strip',
  body: Record<string, unknown>
): Promise<unknown> {
  const key = `${screen}:${JSON.stringify(body ?? {})}`;
  const ttl = BOOTSTRAP_TTL_BY_SCREEN[screen] ?? DEFAULT_BOOTSTRAP_TTL_MS;
  const now = Date.now();
  const cached = bootstrapCache.get(key);
  if (cached && now - cached.ts < ttl) {
    return cached.data;
  }

  if (inflightBootstrap.has(key)) {
    return inflightBootstrap.get(key)!;
  }

  const promise = (async () => {
    try {
      if (isWebMode()) {
        const response = await fetch(`/api/bootstrap/${screen}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body ?? {}),
        });
        if (!response.ok) throw new Error(`Bootstrap HTTP ${response.status}`);
        const json = await response.json();
        if (!json.ok) throw new Error(json.error || 'Bootstrap error');
        const data = json.data;
        // Only write to cache if this promise is still the current one.
        // If invalidateBootstrapCache() was called while we were in-flight,
        // inflightBootstrap.get(key) will be undefined or a newer promise —
        // writing stale data back would poison the cache.
        return data;
      }

      // Electron mode: use window.getDB() directly
      const db = typeof window !== 'undefined' && typeof (window as Window & { getDB?: () => unknown }).getDB === 'function'
        ? (window as Window & { getDB: () => unknown }).getDB()
        : null;
      if (!db) {
        return {};
      }

      const dbAny = asDbAny(db);
      const date = String(body.date ?? '');

      if (screen === 'home') {
        const cfgTasks = callDbMethod<Array<Record<string, unknown>>>(dbAny, 'getAll', ['cfg_tasks'], []);
        const cfgRitualsMorning = callDbMethod<Array<Record<string, unknown>>>(dbAny, 'getAll', ['cfg_rituals_morning'], []);
        const cfgRitualsEvening = callDbMethod<Array<Record<string, unknown>>>(dbAny, 'getAll', ['cfg_rituals_evening'], []);
        const ritualsMorningRows = date ? callDbMethod<Array<Record<string, unknown>>>(dbAny, 'getRitualsMorning', [date], []) : [];
        const ritualsEveningRows = date ? callDbMethod<Array<Record<string, unknown>>>(dbAny, 'getRitualsEvening', [date], []) : [];
        const taskProgressById: Record<string, unknown> = {};
        const timerTotalsByTaskId: Record<string, number> = {};
        for (const task of cfgTasks) {
          const taskId = String(task.id ?? '');
          if (!taskId || !date) continue;
          const taskType = String(task.task_type ?? '');
          if (taskType === 'timer') {
            timerTotalsByTaskId[taskId] = Number(callDbMethod(dbAny, 'getTaskTimerTotal', [date, taskId], 0)) || 0;
            taskProgressById[taskId] = null;
          } else if (taskType === 'ritual' || taskType === 'nutrition') {
            taskProgressById[taskId] = null;
          } else {
            taskProgressById[taskId] = callDbMethod(dbAny, 'getTaskProgress', [taskId, date], null);
          }
        }
        const data = {
          date,
          categoryProgresses: {},
          appSettings: callDbMethod(dbAny, 'getAppSettings', [], null),
          cfgTasks,
          cfgRitualsMorning,
          cfgRitualsEvening,
          ritualsMorningRows,
          ritualsEveningRows,
          ritualCountsByType: buildRitualCountsByType(cfgRitualsMorning, cfgRitualsEvening, ritualsMorningRows, ritualsEveningRows),
          nutritionEntries: date ? callDbMethod(dbAny, 'getNutritionEntries', [date], []) : [],
          taskProgressById,
          timerTotalsByTaskId,
        };
        return data;
      }

      if (screen === 'rituals') {
        const goalsFromAll = callDbMethod<unknown[]>(dbAny, 'getAll', ['cfg_goals'], []);
        const goals = goalsFromAll.length ? goalsFromAll : callDbMethod<unknown[]>(dbAny, 'getAllGoals', [], []);
        const stages = callDbMethod<unknown[]>(dbAny, 'getAll', ['cfg_goal_stages'], []);
        const tasks = callDbMethod<unknown[]>(dbAny, 'getAll', ['cfg_goal_tasks'], []);
        const stagesByGoal: Record<string, unknown[]> = {};
        const tasksByStage: Record<string, unknown[]> = {};
        const goalProgressRows: unknown[] = [];

        for (const goal of goals) {
          const goalId = String((goal as Record<string, unknown>).id);
          const goalStages = stages
            .filter((stage) => String((stage as Record<string, unknown>).goal_id ?? '') === goalId)
            .sort(
              (a, b) =>
                Number((a as Record<string, unknown>).order_index ?? 0) -
                Number((b as Record<string, unknown>).order_index ?? 0)
            );
          stagesByGoal[goalId] = goalStages.length
            ? goalStages
            : callDbMethod<unknown[]>(dbAny, 'getStagesByGoal', [goalId], []);
          for (const stage of stagesByGoal[goalId]) {
            const stageId = String((stage as Record<string, unknown>).id);
            const stageTasks = tasks
              .filter((task) => String((task as Record<string, unknown>).stage_id ?? '') === stageId)
              .sort(
                (a, b) =>
                  Number((a as Record<string, unknown>).order_index ?? 0) -
                  Number((b as Record<string, unknown>).order_index ?? 0)
              );
            tasksByStage[stageId] = stageTasks.length
              ? stageTasks
              : callDbMethod<unknown[]>(dbAny, 'getTasksByStage', [stageId], []);
          }
        }

        if (date) goalProgressRows.push(...callDbMethod<unknown[]>(dbAny, 'getGoalTasksProgressByDate', [date], []));

        const data = {
          goals,
          stagesByGoal,
          tasksByStage,
          goalProgressRows,
          cfgRitualsMorning: callDbMethod(dbAny, 'getAll', ['cfg_rituals_morning'], []),
          cfgRitualsEvening: callDbMethod(dbAny, 'getAll', ['cfg_rituals_evening'], []),
          ritualsMorningRows: date ? callDbMethod(dbAny, 'getRitualsMorning', [date], []) : [],
          ritualsEveningRows: date ? callDbMethod(dbAny, 'getRitualsEvening', [date], []) : [],
          cfgVows: callDbMethod(dbAny, 'getAll', ['cfg_vows'], []),
          appSettings: callDbMethod(dbAny, 'getAppSettings', [], null),
        };
        return data;
      }

      if (screen === 'sidebar') {
        const data = {
          categoryProgresses: {},
          dailyPointsRows: callDbMethod(dbAny, 'getAll', ['act_daily_points'], []),
          timerSessions: date ? callDbMethod(dbAny, 'getTimerSessions', [date], []) : [],
          nutritionEntries: date ? callDbMethod(dbAny, 'getNutritionEntries', [date], []) : [],
          diaryEntry: date ? callDbMethod(dbAny, 'getDiaryEntry', [date], null) : null,
          transactions: date ? callDbMethod(dbAny, 'getTransactions', [date], []) : [],
        };
        return data;
      }

      if (screen === 'date-strip') {
        const rangeDays = Math.max(1, Number(body.rangeDays) || 7);
        const start = new Date(`${date}T00:00:00`);
        const dailyPointsRows = callDbMethod<Array<Record<string, unknown>>>(dbAny, 'getAll', ['act_daily_points'], []);
        const dailyByDate = new Map(dailyPointsRows.map((row) => [String(row.date ?? ''), row]));
        const data: Array<{ date: string; categoryProgresses: unknown; completionPercent: number }> = [];
        if (!Number.isNaN(start.getTime())) {
          for (let i = 0; i < rangeDays; i += 1) {
            const y = start.getFullYear();
            const m = String(start.getMonth() + 1).padStart(2, '0');
            const d = String(start.getDate()).padStart(2, '0');
            const ymd = `${y}-${m}-${d}`;
            const daily = dailyByDate.get(ymd);
            const completion = daily && daily.completion_percent != null ? Number(daily.completion_percent) || 0 : 0;
            data.push({
              date: ymd,
              categoryProgresses: {},
              completionPercent: Math.min(100, Math.max(0, completion)),
            });
            start.setDate(start.getDate() + 1);
          }
        }
        return data;
      }

      return {};
    } catch (error) {
      console.error(`[fetchBootstrap] Error loading ${screen}:`, error);
      return {};
    }
  })();

  inflightBootstrap.set(key, promise);
  try {
    const data = await promise;
    if (inflightBootstrap.get(key) === promise) {
      bootstrapCache.set(key, { ts: Date.now(), data });
    }
    return data;
  } finally {
    inflightBootstrap.delete(key);
  }
}

export function invalidateBootstrapCache(detail?: InvalidationDetail) {
  const screens = screensForMutation(detail);
  if (!screens) {
    bootstrapCache.clear();
    inflightBootstrap.clear();
    return;
  }
  for (const key of [...bootstrapCache.keys()]) {
    if (screens.has(cacheKeyScreen(key))) bootstrapCache.delete(key);
  }
  for (const key of [...inflightBootstrap.keys()]) {
    if (screens.has(cacheKeyScreen(key))) inflightBootstrap.delete(key);
  }
}
