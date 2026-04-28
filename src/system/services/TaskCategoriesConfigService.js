/**
 * Сервис конфигурации категорий задач (название, иконка, цвет)
 * Единый источник правды для всех потребителей
 * Цвета — только из curated-палитры UnifiedColorPalette
 */

import { validateTaskCategoryColor } from '../../design-system/tokens/UnifiedColorPalette.js';

const DEFAULT_CONFIG = {
  rituals: { title: 'Рутина', icon: 'sparkles', color: 'hsl(15, 50%, 50%)' },
  time: { title: 'Фокус', icon: 'timer', color: 'hsl(140, 45%, 48%)' },
  body: { title: 'Тонус', icon: 'activity', color: 'hsl(260, 45%, 50%)' },
  deps: { title: 'Детопс', icon: 'ban', color: 'hsl(0, 48%, 48%)' }
};

const CSS_VAR_MAP = {
  rituals: '--task-rituals',
  time: '--task-time',
  body: '--task-body',
  deps: '--task-deps'
};

class TaskCategoriesConfigService {
  constructor() {
    this._config = null;
    this._dbReady = false;
  }

  _getDB() {
    return typeof window !== 'undefined' && window.getDB ? window.getDB() : null;
  }

  _parseConfig(raw) {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      console.warn('[TaskCategoriesConfigService] Ошибка парсинга конфига:', e);
    }
    return null;
  }

  /**
   * Получить полный конфиг (из БД или дефолт)
   */
  getConfig() {
    if (this._config) return this._config;

    const db = this._getDB();
    if (!db) return { ...DEFAULT_CONFIG };

    try {
      const settings = db.getAppSettings();
      const raw = settings?.task_categories_config;
      const parsed = this._parseConfig(raw);

      if (parsed && Object.keys(parsed).length > 0) {
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        this._config = {};
        for (const [key, value] of Object.entries(merged)) {
          if (value && typeof value === 'object') {
            this._config[key] = { ...value, color: validateTaskCategoryColor(value.color) };
          } else {
            this._config[key] = value;
          }
        }
      } else {
        this._config = { ...DEFAULT_CONFIG };
      }
    } catch (e) {
      console.warn('[TaskCategoriesConfigService] Ошибка получения конфига:', e);
      this._config = { ...DEFAULT_CONFIG };
    }

    return this._config;
  }

  getTitle(categoryType) {
    const config = this.getConfig();
    return config[categoryType]?.title ?? DEFAULT_CONFIG[categoryType]?.title ?? categoryType;
  }

  getIcon(categoryType) {
    const config = this.getConfig();
    return config[categoryType]?.icon ?? DEFAULT_CONFIG[categoryType]?.icon ?? 'target';
  }

  getColor(categoryType) {
    const config = this.getConfig();
    return config[categoryType]?.color ?? DEFAULT_CONFIG[categoryType]?.color ?? 'hsl(210, 28%, 64%)';
  }

  /**
   * Применить цвета к CSS-переменным (только при наличии сохранённого конфига в БД)
   */
  _applyColorsToCSS(force = false) {
    if (typeof document === 'undefined') return;

    const db = this._getDB();
    if (!db && !force) return;

    let configToApply = null;
    if (force && this._config) {
      configToApply = this._config;
    } else if (db) {
      const settings = db.getAppSettings();
      const raw = settings?.task_categories_config;
      const parsed = this._parseConfig(raw);
      if (parsed && Object.keys(parsed).length > 0) {
        configToApply = { ...DEFAULT_CONFIG, ...parsed };
      }
    }

    if (configToApply) {
      for (const [categoryType, cssVar] of Object.entries(CSS_VAR_MAP)) {
        const color = configToApply[categoryType]?.color;
        if (color) {
          document.documentElement.style.setProperty(cssVar, color);
        }
      }
    }
  }

  /**
   * Сохранить конфиг в БД и применить цвета
   */
  saveConfig(config) {
    const db = this._getDB();
    if (!db) {
      console.warn('[TaskCategoriesConfigService] БД недоступна для сохранения');
      return false;
    }

    try {
      const merged = { ...DEFAULT_CONFIG, ...config };
      const validated = {};
      for (const [key, value] of Object.entries(merged)) {
        if (value && typeof value === 'object') {
          validated[key] = { ...value, color: validateTaskCategoryColor(value.color) };
        } else {
          validated[key] = value;
        }
      }
      this._config = validated;
      const settings = db.getAppSettings();
      settings.task_categories_config = this._config;
      db.saveAppSettings(settings);

      this._applyColorsToCSS(true);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('task-categories-config-changed', { detail: this._config }));
      }

      return true;
    } catch (e) {
      console.error('[TaskCategoriesConfigService] Ошибка сохранения:', e);
      return false;
    }
  }

  /**
   * Инициализация: применить сохранённые цвета при готовности БД
   */
  init() {
    if (this._dbReady) return;

    const apply = () => {
      this._config = null;
      this.getConfig();
      this._applyColorsToCSS();
      this._dbReady = true;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aura-db-ready', apply, { once: true });

      const db = this._getDB();
      if (db) {
        apply();
      }
    }
  }

  invalidateCache() {
    this._config = null;
  }
}

const taskCategoriesConfigService = new TaskCategoriesConfigService();
export default taskCategoriesConfigService;
