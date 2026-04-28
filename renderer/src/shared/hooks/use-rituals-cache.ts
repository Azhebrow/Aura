import { useCallback } from 'react';
import type { AuraRow } from '@/types/aura';

interface RitualsCache {
  morning: AuraRow[];
  evening: AuraRow[];
  morningDone: Set<string>;
  eveningDone: Set<string>;
}

const globalRitualsCache = new Map<string, RitualsCache>();

export function useRitualsCache(dateString: string) {
  const getCached = useCallback(() => {
    return globalRitualsCache.get(dateString);
  }, [dateString]);

  const setCached = useCallback((data: RitualsCache) => {
    globalRitualsCache.set(dateString, data);
  }, [dateString]);

  return { getCached, setCached };
}
