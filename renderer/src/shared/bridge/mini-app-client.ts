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

  const operations: BatchOp[] = chunk.map((entry) => ({ method: entry.method, args: entry.args }));
  let payload: { ok: boolean; results?: BatchResult[]; error?: string };
  try {
    const response = await fetch('/api/db/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });
    if (!response.ok) throw new Error(`Batch HTTP ${response.status}`);
    payload = (await response.json()) as { ok: boolean; results?: BatchResult[]; error?: string };
  } catch (error) {
    chunk.forEach((entry) => entry.reject(error));
    return;
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  for (const [index, pending] of chunk.entries()) {
    const row = results[index];
    if (!row || !row.ok) {
      pending.reject(new Error(row?.error || payload.error || 'Batch DB call failed'));
    } else {
      pending.resolve(row.result);
    }
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
    const response = await fetch(`/api/bootstrap/${screen}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) {
      throw new Error(`Bootstrap HTTP ${response.status} for ${screen}`);
    }
    const payload = (await response.json()) as { ok: boolean; data?: unknown; error?: string };
    if (!payload.ok) {
      throw new Error(payload.error || `Bootstrap failed: ${screen}`);
    }
    bootstrapCache.set(key, { ts: Date.now(), data: payload.data });
    return payload.data;
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
