/**
 * Сервис порядка страниц нижнего меню
 * Позволяет настраивать порядок отображения страниц
 */

const DEFAULT_ORDER = ['home', 'rituals', 'diary', 'timer', 'ranks', 'stats', 'settings'];

const PAGE_META = {
  home: { name: 'Домашняя', icon: 'house' },
  rituals: { name: 'Ритуалы', icon: 'flame' },
  diary: { name: 'Дневник', icon: 'notebook' },
  timer: { name: 'Таймер', icon: 'timer' },
  ranks: { name: 'Ранги', icon: 'trophy' },
  stats: { name: 'Статистика', icon: 'chart-bar' },
  settings: { name: 'Настройки', icon: 'settings' }
};

class NavOrderConfigService {
  constructor() {
    this._order = null;
  }

  _getDB() {
    return typeof window !== 'undefined' && window.getDB ? window.getDB() : null;
  }

  _parseOrder(raw) {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(id => PAGE_META[id]);
      }
    } catch (e) {
      console.warn('[NavOrderConfigService] Ошибка парсинга порядка:', e);
    }
    return null;
  }

  /**
   * Получить порядок страниц (массив id)
   */
  getPagesOrder() {
    if (this._order) return [...this._order];

    const db = this._getDB();
    if (!db) return [...DEFAULT_ORDER];

    try {
      const settings = db.getAppSettings();
      const raw = settings?.bottom_nav_pages_order;
      const parsed = this._parseOrder(raw);

      if (parsed && parsed.length > 0) {
        const validIds = new Set(Object.keys(PAGE_META));
        const ordered = parsed.filter(id => validIds.has(id));
        const missing = DEFAULT_ORDER.filter(id => !ordered.includes(id));
        this._order = [...ordered, ...missing];
      } else {
        this._order = [...DEFAULT_ORDER];
      }
    } catch (e) {
      console.warn('[NavOrderConfigService] Ошибка получения порядка:', e);
      this._order = [...DEFAULT_ORDER];
    }

    return [...this._order];
  }

  /**
   * Получить страницы в порядке с метаданными
   */
  getPages() {
    const order = this.getPagesOrder();
    return order.map(id => ({
      id,
      name: PAGE_META[id]?.name ?? id,
      icon: PAGE_META[id]?.icon ?? 'circle'
    }));
  }

  /**
   * Сохранить порядок страниц
   */
  savePagesOrder(order) {
    const db = this._getDB();
    if (!db) {
      console.warn('[NavOrderConfigService] БД недоступна для сохранения');
      return false;
    }

    const validIds = new Set(Object.keys(PAGE_META));
    const filtered = order.filter(id => validIds.has(id));
    const missing = DEFAULT_ORDER.filter(id => !filtered.includes(id));
    const finalOrder = [...filtered, ...missing];

    try {
      this._order = finalOrder;
      const settings = db.getAppSettings();
      settings.bottom_nav_pages_order = finalOrder;
      db.saveAppSettings(settings);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nav-order-changed', { detail: finalOrder }));
      }

      return true;
    } catch (e) {
      console.error('[NavOrderConfigService] Ошибка сохранения:', e);
      return false;
    }
  }

  invalidateCache() {
    this._order = null;
  }
}

const navOrderConfigService = new NavOrderConfigService();
export default navOrderConfigService;
