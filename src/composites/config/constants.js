/**
 * Централизованные константы приложения
 */

// Маппинг страниц для навигации
export const PAGE_MAPPING = ['home', 'rituals', 'diary', 'timer', 'ranks', 'stats', 'settings'];

// Типы категорий задач
export const TASK_CATEGORIES = {
  RITUALS: 'rituals',
  TIME: 'time',
  BODY: 'body',
  DEPS: 'deps'
};

// Типы задач
export const TASK_TYPES = {
  TIMER: 'timer',
  RITUAL: 'ritual',
  REGULAR: 'regular'
};

// Типы ритуалов
export const RITUAL_TYPES = {
  MORNING: 'morning',
  EVENING: 'evening',
  SUNRISE: 'sunrise',
  SUNSET: 'sunset'
};

// Типы досуга
export const LEISURE_TYPES = {
  ESCAPE: 'escape',
  FILLING: 'filling'
};

// Названия категорий задач
export const CATEGORY_TITLES = {
  'rituals': 'Рутина',
  'time': 'Фокус',
  'body': 'Тонус',
  'deps': 'Детопс'
};

// Иконки категорий задач (единый источник для всех мест: настройки, таймер, таблица, графики)
export const CATEGORY_ICONS = {
  'rituals': 'sparkles',   // Рутина
  'time': 'timer',         // Фокус — задачи с таймером
  'body': 'activity',      // Тонус
  'deps': 'ban'            // Детопс
};

// Локальное хранилище ключи
export const STORAGE_KEYS = {
  THEME: 'aura-theme',
  ACCENT_COLOR: 'aura-accent-color',
  RADIUS: 'aura-radius',
  SPACING: 'aura-spacing',
  FONT: 'aura-font'
};

// Дефолтные значения
export const DEFAULTS = {
  THEME: 'dark',
  DATE_FORMAT: 'YYYY-MM-DD',
  ITEMS_PER_PAGE: 10
};

export default {
  PAGE_MAPPING,
  TASK_CATEGORIES,
  TASK_TYPES,
  RITUAL_TYPES,
  LEISURE_TYPES,
  CATEGORY_TITLES,
  CATEGORY_ICONS,
  STORAGE_KEYS,
  DEFAULTS
};







