/**
 * Кэш для данных статистики
 * TTL: 5 минут
 * Хранение: память + localStorage для persistence
 */

class StatsCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 минут в миллисекундах
    this.storageKey = 'aura-stats-cache';
    this.loadFromStorage();
    
    // Очистка устаревших записей каждую минуту
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Генерация ключа кэша
   */
  generateKey(mode, viewType, groupBy, period, aggregation, startDate, endDate) {
    return `${mode}_${viewType}_${groupBy}_${period}_${aggregation}_${startDate}_${endDate}`;
  }

  /**
   * Получить данные из кэша
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Проверка TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return entry.data;
  }

  /**
   * Сохранить данные в кэш
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.saveToStorage();
  }

  /**
   * Инвалидировать кэш (удалить все записи)
   */
  invalidate() {
    this.cache.clear();
    this.saveToStorage();
  }

  /**
   * Инвалидировать кэш по префиксу (например, все записи для определенного режима)
   */
  invalidateByPrefix(prefix) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Очистить устаревшие записи
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Сохранить кэш в localStorage
   */
  saveToStorage() {
    try {
      const data = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        data: entry.data,
        timestamp: entry.timestamp
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('[StatsCache] Ошибка сохранения в localStorage:', e);
    }
  }

  /**
   * Загрузить кэш из localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      const now = Date.now();

      data.forEach(({ key, data: entryData, timestamp }) => {
        // Загружаем только если не истек TTL
        if (now - timestamp <= this.ttl) {
          this.cache.set(key, {
            data: entryData,
            timestamp
          });
        }
      });
    } catch (e) {
      console.warn('[StatsCache] Ошибка загрузки из localStorage:', e);
    }
  }
}

// Singleton instance
let cacheInstance = null;

export function getStatsCache() {
  if (!cacheInstance) {
    cacheInstance = new StatsCache();
  }
  return cacheInstance;
}

export default StatsCache;



