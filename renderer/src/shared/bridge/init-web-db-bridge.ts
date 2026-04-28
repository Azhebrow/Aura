import type { AuraDatabase } from '@/types/aura';
import { callDbBatched, fetchBootstrap, invalidateBootstrapCache } from '@/shared/bridge/mini-app-client';

type DbCallResponse = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

type DbMethodsResponse = {
  ok: boolean;
  methods?: string[];
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

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/db/call', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ method, args }));

  try {
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error(`DB bridge HTTP ${xhr.status}`);
    }

    const payload = JSON.parse(xhr.responseText) as DbCallResponse;
    if (!payload.ok) {
      throw new Error(payload.error || `DB method failed: ${method}`);
    }

    if (isMutationMethod) {
      readCache.clear();
      invalidateBootstrapCache();
    } else {
      readCache.set(cacheKey, { value: payload.result, ts: Date.now() });
    }
    return payload.result;
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

function getAvailableMethodsSync(): Set<string> {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/db/methods', false);
  xhr.send();

  if (xhr.status < 200 || xhr.status >= 300) {
    return new Set();
  }

  const payload = JSON.parse(xhr.responseText) as DbMethodsResponse;
  const methods = Array.isArray(payload.methods) ? payload.methods : [];
  return new Set(methods);
}

function createWebDbProxy(availableMethods: Set<string>): AuraDatabase {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        if (!availableMethods.has(prop)) return undefined;
        return (...args: unknown[]) => callDbSync(prop, args);
      },
    }
  ) as AuraDatabase;
}

export function initWebDbBridge() {
  if (typeof window === 'undefined') return;
  if (typeof window.getDB === 'function') return;

  const availableMethods = getAvailableMethodsSync();
  const proxyDb = createWebDbProxy(availableMethods);
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
  window.getDB = () => proxyDb;
  markBridgePage('bootstrap');
  window.dispatchEvent(new CustomEvent('aura-db-ready'));
}
