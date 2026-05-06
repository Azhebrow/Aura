import type { AuraDatabase } from '@/types/aura';
import { callDbBatched, fetchBootstrap, invalidateBootstrapCache } from './mini-app-client';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';

type DbCallResponse = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

type DbMethodsResponse = {
  ok: boolean;
  methods?: string[];
};

const SAFE_EMPTY_ARRAY_METHODS = new Set([
  'getAll',
  'getRitualsMorning',
  'getRitualsEvening',
  'getTimerSessions',
  'getNutritionEntries',
  'getAllGoals',
  'getStagesByGoal',
  'getTasksByStage',
  'getGoalTasksProgressByDate',
]);

const SAFE_NULL_METHODS = new Set(['getDiaryEntry', 'getAppSettings']);
const SAFE_ZERO_METHODS = new Set(['getCategoryProgress']);
const SAFE_EMPTY_OBJECT_METHODS = new Set(['getCategoryProgresses']);

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

function callDbSync(method: string, args: unknown[]): unknown {
  const isMutationMethod = /^(add|create|update|save|delete|clear|reload|move|set)/i.test(method);
  const cacheKey = `${method}:${JSON.stringify(args ?? [])}`;
  const methodStat = getMethodStat(method);
  const callStart = performance.now();

  if (!isMutationMethod) {
    const cached = readCache.get(cacheKey) as { value: unknown; ts: number } | undefined;
    if (cached && (isStickyRead(method, args) || Date.now() - cached.ts < getCacheTtlMs(method, args))) {
      bridgeAuditState.totalCalls += 1;
      bridgeAuditState.cacheHits += 1;
      methodStat.calls += 1;
      methodStat.cacheHits += 1;
      return cached.value;
    }
  }

  try {
    const db = typeof window !== 'undefined' && typeof window.getDB === 'function' ? window.getDB() : null;
    if (!db) {
      throw new Error('Database not available: window.getDB() is not initialized');
    }

    const dbMethod = (db as any)[method];
    if (typeof dbMethod !== 'function') {
      throw new Error(`DB method not found: ${method}`);
    }

    const result = dbMethod.apply(db, args as any[]);

    if (isMutationMethod) {
      clearReadCache();
      invalidateBootstrapCache();
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
}



export function initWebDbBridge() {
  if (typeof window === 'undefined') return;
  if (typeof window.getDB === 'function') return;

  // Wait for Electron main process to inject window.getDB
  const checkDbReady = () => {
    const db = typeof window !== 'undefined' && typeof window.getDB === 'function' ? window.getDB() : null;
    if (!db) {
      console.log('[Bridge] Waiting for database to be ready...');
      setTimeout(checkDbReady, 100);
      return;
    }

    console.log('[Bridge] ✅ Database ready, initializing bridge');
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
  };

  checkDbReady();
}
