const TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'aura-stats-cache';

type CacheEntry<T> = { data: T; timestamp: number };

export class StatsCache {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private lastCleanup = 0;

  constructor() {
    this.loadFromStorage();
  }

  generateKey(
    mode: string,
    viewType: string,
    groupBy: string,
    period: number,
    aggregation: string,
    startDate: string,
    endDate: string
  ): string {
    return `${mode}_${viewType}_${groupBy}_${period}_${aggregation}_${startDate}_${endDate}`;
  }

  get<T>(key: string): T | null {
    this.maybeCleanup();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL_MS) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    this.saveToStorage();
  }

  invalidate(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) keysToDelete.push(key);
    }
    for (const k of keysToDelete) this.cache.delete(k);
    if (keysToDelete.length > 0) this.saveToStorage();
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > TTL_MS) keysToDelete.push(key);
    }
    for (const k of keysToDelete) this.cache.delete(k);
    if (keysToDelete.length > 0) this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        data: entry.data,
        timestamp: entry.timestamp,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored) as { key: string; data: unknown; timestamp: number }[];
      const now = Date.now();
      for (const row of data) {
        if (now - row.timestamp <= TTL_MS) {
          this.cache.set(row.key, { data: row.data, timestamp: row.timestamp });
        }
      }
    } catch {
      /* ignore */
    }
  }
}

let cacheInstance: StatsCache | null = null;

export function getStatsCache(): StatsCache {
  if (!cacheInstance) cacheInstance = new StatsCache();
  return cacheInstance;
}
