/**
 * Видимость опциональных секций страниц (JSON в app_settings.page_sections_visibility).
 */

export const PAGE_SECTION_DEFAULTS = {
  home: {
    tasksCategories: true,
    transactions: true,
    dailyPlans: true,
    categoryProgressChart: true
  },
  rituals: {
    rituals: true,
    vows: true,
    goals: true
  },
  diary: {
    entryPanel: true,
    contentEntries: true,
    contentNutrition: true
  },
  ranks: {
    rank: true,
    pointsHistory: true
  }
};

function deepMergeVisibility(stored) {
  const out = JSON.parse(JSON.stringify(PAGE_SECTION_DEFAULTS));
  if (!stored || typeof stored !== 'object') return out;
  for (const page of Object.keys(PAGE_SECTION_DEFAULTS)) {
    if (stored[page] && typeof stored[page] === 'object') {
      for (const key of Object.keys(PAGE_SECTION_DEFAULTS[page])) {
        if (Object.prototype.hasOwnProperty.call(stored[page], key)) {
          out[page][key] = Boolean(stored[page][key]);
        }
      }
    }
  }
  return out;
}

/**
 * Исправляет инварианты: дневник и ранги не могут скрыть оба блока контента.
 * @param {object} v merged visibility
 * @returns {object} same object mutated + fixed
 */
export function enforceVisibilityInvariants(v) {
  if (!v.diary.contentEntries && !v.diary.contentNutrition) {
    v.diary.contentEntries = true;
  }
  if (!v.ranks.rank && !v.ranks.pointsHistory) {
    v.ranks.rank = true;
  }
  return v;
}

export function parsePageSectionsVisibility(raw) {
  if (raw == null || raw === '') return deepMergeVisibility(null);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return enforceVisibilityInvariants(deepMergeVisibility(parsed));
  } catch {
    return deepMergeVisibility(null);
  }
}

class PageSectionsVisibilityService {
  getFromDb() {
    const getDB = typeof window !== 'undefined' && window.getDB ? window.getDB : null;
    if (!getDB) return deepMergeVisibility(null);
    const db = getDB();
    if (!db || typeof db.getAppSettings !== 'function') return deepMergeVisibility(null);
    const settings = db.getAppSettings();
    return parsePageSectionsVisibility(settings?.page_sections_visibility);
  }

  /**
   * @param {string} path dot path e.g. 'home.transactions'
   */
  isVisible(path) {
    const v = this.getFromDb();
    const parts = path.split('.');
    let cur = v;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return true;
      cur = cur[p];
    }
    return cur !== false;
  }

  /**
   * Сохранить полный объект видимости (как после редактирования в настройках).
   * @param {object} visibility — вложенный объект страниц/ключей
   */
  saveVisibility(visibility) {
    const getDB = typeof window !== 'undefined' && window.getDB ? window.getDB : null;
    if (!getDB) return false;
    const db = getDB();
    if (!db || typeof db.getAppSettings !== 'function' || typeof db.saveAppSettings !== 'function') {
      return false;
    }
    const current = db.getAppSettings() || { id: 'app_settings_1' };
    const merged = enforceVisibilityInvariants(deepMergeVisibility(visibility));
    db.saveAppSettings({
      ...current,
      page_sections_visibility: JSON.stringify(merged)
    });
    return true;
  }
}

const pageSectionsVisibilityService = new PageSectionsVisibilityService();
export default pageSectionsVisibilityService;
