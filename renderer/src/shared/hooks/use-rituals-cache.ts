import { useCallback } from 'react';
import type { AuraRow } from '@/types/aura';

interface RitualsCache {
  morning: AuraRow[];
  evening: AuraRow[];
  morningDone: Set<string>;
  eveningDone: Set<string>;
}

interface RitualsCacheEntry {
  data: RitualsCache;
  at: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 минут
const MAX_ENTRIES = 14; // не больше двух недель в памяти

const globalRitualsCache = new Map<string, RitualsCacheEntry>();

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of globalRitualsCache) {
    if (now - entry.at > TTL_MS) globalRitualsCache.delete(key);
  }
  if (globalRitualsCache.size > MAX_ENTRIES) {
    const oldest = [...globalRitualsCache.entries()].sort((a, b) => a[1].at - b[1].at);
    for (let i = 0; i < oldest.length - MAX_ENTRIES; i++) {
      globalRitualsCache.delete(oldest[i][0]);
    }
  }
}

export function useRitualsCache(dateString: string) {
  const getCached = useCallback((): RitualsCache | undefined => {
    const entry = globalRitualsCache.get(dateString);
    if (!entry) return undefined;
    if (Date.now() - entry.at > TTL_MS) {
      globalRitualsCache.delete(dateString);
      return undefined;
    }
    return entry.data;
  }, [dateString]);

  const setCached = useCallback((data: RitualsCache) => {
    pruneCache();
    globalRitualsCache.set(dateString, { data, at: Date.now() });
  }, [dateString]);

  const invalidate = useCallback(() => {
    globalRitualsCache.delete(dateString);
  }, [dateString]);

  return { getCached, setCached, invalidate };
}
