type BatchOp = {
  method: string;
  args: unknown[];
};

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


function stableKey(method: string, args: unknown[]) {
  return `${method}:${JSON.stringify(args ?? [])}`;
}

function isMutationMethod(method: string) {
  return /^(add|create|update|save|delete|clear|reload|move|set)/i.test(method);
}

async function flushBatch() {
  const chunk = pendingQueue.splice(0, pendingQueue.length);
  flushTimer = null;
  if (!chunk.length) return;

  try {
    const db = typeof window !== 'undefined' && typeof window.getDB === 'function' ? window.getDB() : null;
    if (!db) {
      throw new Error('Database not available: window.getDB() is not initialized');
    }

    for (const [index, pending] of chunk.entries()) {
      try {
        const dbMethod = (db as any)[pending.method];
        if (typeof dbMethod !== 'function') {
          throw new Error(`DB method not found: ${pending.method}`);
        }
        const result = dbMethod.apply(db, pending.args);
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
      const db = typeof window !== 'undefined' && typeof window.getDB === 'function' ? window.getDB() : null;
      if (!db) {
        return {};
      }

      if (screen === 'rituals') {
        const goals = (db as any).getAllGoals?.() ?? [];
        const stagesByGoal: Record<string, unknown[]> = {};
        const tasksByStage: Record<string, unknown[]> = {};
        const goalProgressRows: unknown[] = [];

        for (const goal of goals) {
          const goalId = String(goal.id);
          stagesByGoal[goalId] = (db as any).getStagesByGoal?.(goalId) ?? [];
          for (const stage of stagesByGoal[goalId]) {
            const stageId = String(stage.id);
            tasksByStage[stageId] = (db as any).getTasksByStage?.(stageId) ?? [];
          }
        }

        const date = String(body.date ?? '');
        if (date && (db as any).getGoalTasksProgressByDate) {
          const rows = (db as any).getGoalTasksProgressByDate(date) ?? [];
          goalProgressRows.push(...rows);
        }

        const data = { goals, stagesByGoal, tasksByStage, goalProgressRows };
        bootstrapCache.set(key, { ts: Date.now(), data });
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
    return await promise;
  } finally {
    inflightBootstrap.delete(key);
  }
}

export function invalidateBootstrapCache() {
  bootstrapCache.clear();
  inflightBootstrap.clear();
}
