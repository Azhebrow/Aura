import type { AuraDatabase } from '@/types/aura';

const DEFAULT_CATEGORY_IDS = ['rituals', 'time', 'body', 'deps'] as const;
const CACHE_TTL_MS_MOBILE = 3500;
const CACHE_TTL_MS_DESKTOP = 1800;
const CACHE = new Map<string, { ts: number; data: Record<string, number> }>();

function cacheKey(date: string, categories: readonly string[]) {
  return `${date}:${categories.join(',')}`;
}

function isMobileRuntime() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(navigator.userAgent);
}

export function getCategoryProgresses(
  db: AuraDatabase,
  date: string,
  categories: readonly string[] = DEFAULT_CATEGORY_IDS
): Record<string, number> {
  const key = cacheKey(date, categories);
  const cached = CACHE.get(key);
  const ttl = isMobileRuntime() ? CACHE_TTL_MS_MOBILE : CACHE_TTL_MS_DESKTOP;
  if (cached && Date.now() - cached.ts < ttl) {
    return { ...cached.data };
  }

  const result: Record<string, number> = {};

  try {
    if (typeof db.getCategoryProgresses === 'function') {
      const bulk = db.getCategoryProgresses(date) ?? {};
      for (const category of categories) {
        const value = bulk[category];
        result[category] = value == null || Number.isNaN(Number(value)) ? 0 : Math.min(100, Math.max(0, Number(value)));
      }
      CACHE.set(key, { ts: Date.now(), data: { ...result } });
      return result;
    }
  } catch {
    // Fallback to per-category calls below.
  }

  for (const category of categories) {
    try {
      const value = db.getCategoryProgress(category, date);
      result[category] = value == null || Number.isNaN(Number(value)) ? 0 : Math.min(100, Math.max(0, Number(value)));
    } catch {
      result[category] = 0;
    }
  }

  CACHE.set(key, { ts: Date.now(), data: { ...result } });
  return result;
}
