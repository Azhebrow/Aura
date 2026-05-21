import type { AuraDatabase } from '@/types/aura';
import { callDbBatched, fetchBootstrap, invalidateBootstrapCache } from './mini-app-client';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';

type DbCallResponse = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

const readCache = new Map<string, unknown>();
const MOBILE_READ_CACHE_TTL_MS = 5000;
const DESKTOP_READ_CACHE_TTL_MS = 2500;
const CFG_READ_CACHE_TTL_MS = 60000;

function isStickyRead(method: string, args: unknown[]) {
  if (method === 'getAppSettings') return true;
  if (method !== 'getAll') return false;
  const tableName = typeof args[0] === 'string' ? String(args[0]) : '';
  return tableName.startsWith('cfg_');
}

function mutationDetailFromMethod(method: string, args: unknown[]) {
  const first = args[0] as Record<string, unknown> | undefined;
  const second = args[1] as Record<string, unknown> | undefined;
  const date =
    typeof first?.date === 'string'
      ? first.date
      : typeof second?.date === 'string'
        ? second.date
        : typeof args[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[0])
          ? args[0]
          : typeof args[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[1])
            ? args[1]
            : undefined;

  if (/TimerSession/i.test(method)) return { type: 'timer', date, entityId: String(first?.task_id ?? second?.task_id ?? '') };
  if (/Ritual/i.test(method)) return { type: 'ritual', date };
  if (/Nutrition/i.test(method)) return { type: 'nutrition', date };
  if (/Transaction/i.test(method)) return { type: 'transaction', date };
  if (/Diary/i.test(method)) return { type: 'diary', date };
  if (/Goal|Stage|TaskCompletedAt/i.test(method)) return { type: 'goals', date };
  if (/TaskProgress/i.test(method)) return { type: 'task-progress', date };
  return undefined;
}

type BridgeMethodStat = {
  calls: number;
  errors: number;
  totalMs: number;
  cacheHits: number;
};

type BridgePageSnapshot = {
  pageId: string;
  startedAt: number;
  callsBefore: number;
  errorsBefore: number;
  cacheHitsBefore: number;
};

type BridgeAuditState = {
  startedAt: number;
  totalCalls: number;
  totalErrors: number;
  totalMs: number;
  cacheHits: number;
  byMethod: Record<string, BridgeMethodStat>;
  currentPage: BridgePageSnapshot | null;
  pageHistory: Array<{
    pageId: string;
    durationMs: number;
    calls: number;
    errors: number;
    cacheHits: number;
  }>;
};

function isMobileRuntime() {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(ua) || window.innerWidth < 900;
}

const bridgeAuditState: BridgeAuditState = {
  startedAt: Date.now(),
  totalCalls: 0,
  totalErrors: 0,
  totalMs: 0,
  cacheHits: 0,
  byMethod: {},
  currentPage: null,
  pageHistory: [],
};

function getMethodStat(method: string): BridgeMethodStat {
  if (!bridgeAuditState.byMethod[method]) {
    bridgeAuditState.byMethod[method] = {
      calls: 0,
      errors: 0,
      totalMs: 0,
      cacheHits: 0,
    };
  }
  return bridgeAuditState.byMethod[method];
}

export function clearReadCache() {
  readCache.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener(AURA_DATA_CHANGED, clearReadCache);
}

function finalizeCurrentPageSnapshot() {
  const current = bridgeAuditState.currentPage;
  if (!current) return;
  bridgeAuditState.pageHistory.push({
    pageId: current.pageId,
    durationMs: Math.max(0, Date.now() - current.startedAt),
    calls: bridgeAuditState.totalCalls - current.callsBefore,
    errors: bridgeAuditState.totalErrors - current.errorsBefore,
    cacheHits: bridgeAuditState.cacheHits - current.cacheHitsBefore,
  });
}

function markBridgePage(pageId: string) {
  if (!pageId) return;
  finalizeCurrentPageSnapshot();
  bridgeAuditState.currentPage = {
    pageId,
    startedAt: Date.now(),
    callsBefore: bridgeAuditState.totalCalls,
    errorsBefore: bridgeAuditState.totalErrors,
    cacheHitsBefore: bridgeAuditState.cacheHits,
  };
}

function resetBridgeAudit() {
  bridgeAuditState.startedAt = Date.now();
  bridgeAuditState.totalCalls = 0;
  bridgeAuditState.totalErrors = 0;
  bridgeAuditState.totalMs = 0;
  bridgeAuditState.cacheHits = 0;
  bridgeAuditState.byMethod = {};
  bridgeAuditState.pageHistory = [];
  bridgeAuditState.currentPage = null;
}

function getBridgeAuditSnapshot() {
  const byMethod = Object.entries(bridgeAuditState.byMethod)
    .map(([method, stat]) => ({
      method,
      calls: stat.calls,
      errors: stat.errors,
      cacheHits: stat.cacheHits,
      avgMs: stat.calls > 0 ? Number((stat.totalMs / stat.calls).toFixed(2)) : 0,
      totalMs: Number(stat.totalMs.toFixed(2)),
    }))
    .sort((a, b) => b.calls - a.calls);

  const topSlowMethods = [...byMethod].sort((a, b) => b.totalMs - a.totalMs).slice(0, 15);
  const uptimeMs = Math.max(1, Date.now() - bridgeAuditState.startedAt);
  const callsPerMinute = Number(((bridgeAuditState.totalCalls * 60000) / uptimeMs).toFixed(1));

  const currentPage =
    bridgeAuditState.currentPage == null
      ? null
      : {
          pageId: bridgeAuditState.currentPage.pageId,
          durationMs: Math.max(0, Date.now() - bridgeAuditState.currentPage.startedAt),
          calls: bridgeAuditState.totalCalls - bridgeAuditState.currentPage.callsBefore,
          errors: bridgeAuditState.totalErrors - bridgeAuditState.currentPage.errorsBefore,
          cacheHits: bridgeAuditState.cacheHits - bridgeAuditState.currentPage.cacheHitsBefore,
        };

  return {
    startedAt: bridgeAuditState.startedAt,
    uptimeMs,
    callsPerMinute,
    totalCalls: bridgeAuditState.totalCalls,
    totalErrors: bridgeAuditState.totalErrors,
    cacheHits: bridgeAuditState.cacheHits,
    cacheHitRate:
      bridgeAuditState.totalCalls > 0 ? Number((bridgeAuditState.cacheHits / bridgeAuditState.totalCalls).toFixed(3)) : 0,
    avgMsPerCall: bridgeAuditState.totalCalls > 0 ? Number((bridgeAuditState.totalMs / bridgeAuditState.totalCalls).toFixed(2)) : 0,
    byMethod,
    topSlowMethods,
    pageHistory: [...bridgeAuditState.pageHistory].slice(-30),
    currentPage,
  };
}

function getCacheTtlMs(method: string, args: unknown[]) {
  if (method === 'getTransactions' || method === 'getAllTransactions' || method === 'getTransactionsBetween') {
    return 0;
  }
  const base = isMobileRuntime() ? MOBILE_READ_CACHE_TTL_MS : DESKTOP_READ_CACHE_TTL_MS;
  if (method === 'getTaskProgress') {
    return isMobileRuntime() ? 7000 : 3600;
  }
  if (method === 'getTaskTimerTotal') {
    return isMobileRuntime() ? 7000 : 3600;
  }
  if (method === 'calculateRitualProgress') {
    return isMobileRuntime() ? 7000 : 3600;
  }
  if (method === 'getRitualsMorning' || method === 'getRitualsEvening') {
    return isMobileRuntime() ? 7000 : 3600;
  }
  if (method === 'getCategoryProgresses' || method === 'getGoalTasksProgressByDate') {
    return isMobileRuntime() ? 7000 : 3600;
  }
  if (method === 'getAll') {
    const tableName = typeof args[0] === 'string' ? String(args[0]) : '';
    if (tableName.startsWith('cfg_')) return CFG_READ_CACHE_TTL_MS;
    return isMobileRuntime() ? 6000 : 3000;
  }
  if (method === 'getAppSettings') return CFG_READ_CACHE_TTL_MS;
  return base;
}

// Creates an HTTP-backed proxy for window.getDB() in web mode.
// Uses synchronous XHR so all existing sync db.method() calls work unchanged.
// This is intentional for local dev use — sync XHR blocks the thread but is
// invisible at localhost latency (<1ms per call).
function createSyncHttpProxy(): AuraDatabase {
  return new Proxy({} as AuraDatabase, {
    get(_target, prop: string) {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return (...args: unknown[]) => {
        const isMutationMethod = /^(add|create|update|save|delete|clear|reload|move|set)/i.test(prop);
        const cacheKey = `${prop}:${JSON.stringify(args ?? [])}`;

        if (!isMutationMethod) {
          const cached = readCache.get(cacheKey) as { value: unknown; ts: number } | undefined;
          if (cached && (isStickyRead(prop, args) || Date.now() - cached.ts < getCacheTtlMs(prop, args))) {
            const methodStat = getMethodStat(prop);
            bridgeAuditState.totalCalls += 1;
            bridgeAuditState.cacheHits += 1;
            methodStat.calls += 1;
            methodStat.cacheHits += 1;
            return cached.value;
          }
        }

        const methodStat = getMethodStat(prop);
        const callStart = performance.now();
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/db/call', false); // synchronous=false would be async
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({ method: prop, args }));

          if (xhr.status !== 200) throw new Error(`HTTP ${xhr.status} for ${prop}`);
          const response: DbCallResponse = JSON.parse(xhr.responseText);
          if (!response.ok) throw new Error(response.error || `DB error: ${prop}`);

          const result = response.result;
          if (isMutationMethod) {
            const detail = mutationDetailFromMethod(prop, args);
            clearReadCache();
            invalidateBootstrapCache(detail);
          } else {
            readCache.set(cacheKey, { value: result, ts: Date.now() });
          }
          return result;
        } catch (error) {
          bridgeAuditState.totalErrors += 1;
          methodStat.errors += 1;
          throw error;
        } finally {
          const elapsed = Math.max(0, performance.now() - callStart);
          bridgeAuditState.totalCalls += 1;
          bridgeAuditState.totalMs += elapsed;
          methodStat.calls += 1;
          methodStat.totalMs += elapsed;
        }
      };
    },
  });
}

function setupBridgeAuditGlobals() {
  const bridgeApi = {
    snapshot: getBridgeAuditSnapshot,
    reset: resetBridgeAudit,
    markPage: markBridgePage,
  };
  const miniApi = {
    callDbBatched,
    fetchBootstrap,
    invalidateBootstrapCache,
  };
  (window as Window & { __auraDbBridgeAudit?: typeof bridgeApi }).__auraDbBridgeAudit = bridgeApi;
  (window as Window & { __auraMiniApi?: typeof miniApi }).__auraMiniApi = miniApi;
  markBridgePage('bootstrap');
}

/** True when running inside an Electron renderer process (nodeIntegration=true). */
function isElectronRenderer(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof (process as NodeJS.Process & { versions?: Record<string, string> }).versions?.electron === 'string'
  );
}

export function initWebDbBridge() {
  if (typeof window === 'undefined') return;

  const hasGetDB = typeof (window as Window & { getDB?: unknown }).getDB === 'function';

  // Pure web mode: no Electron process globals and no getDB yet →
  // create the synchronous XHR proxy that routes DB calls to the
  // local mini-app-server (port 8787 / Vite proxy).
  if (!hasGetDB && !isElectronRenderer()) {
    (window as Window & { __auraWebMode?: boolean }).__auraWebMode = true;
    const proxy = createSyncHttpProxy();
    (window as Window & { getDB: () => AuraDatabase }).getDB = () => proxy;
    window.dispatchEvent(new Event('aura-db-ready'));
    setupBridgeAuditGlobals();
    return;
  }

  // Electron mode: window.getDB is injected asynchronously by the main
  // process via executeJavaScript on 'did-finish-load' — it is NOT yet
  // available when this module loads.  Wait for 'aura-db-ready' (dispatched
  // by the same executeJavaScript block right after setting window.getDB)
  // so that setupBridgeAuditGlobals() runs in the same synchronous tick,
  // before waitForAuraDatabase()'s promise resolves in useAuraDb.
  if (!hasGetDB) {
    window.addEventListener('aura-db-ready', () => setupBridgeAuditGlobals(), { once: true });
    return;
  }

  // getDB already set (e.g. Vite HMR re-run after first load).
  const db = (window as Window & { getDB: () => unknown }).getDB();
  if (db) {
    setupBridgeAuditGlobals();
  } else {
    window.addEventListener('aura-db-ready', () => setupBridgeAuditGlobals(), { once: true });
  }
}
