/**
 * Конфигурация звуковой системы
 * Генерируется автоматически из типизированной системы звуков
 */

import {
  SOUND_CATEGORIES,
  UI_ELEMENT_TYPES,
  SOUND_MATRIX,
  TYPED_SOUND_CONFIG,
  getSoundByType,
  getSoundForEvent,
  getSoundForButton,
} from './soundTypes.js';

/**
 * Обратная совместимость: маппинг EventBus событий
 * Генерируется автоматически из типизированной конфигурации
 */
export const eventBusSounds = Object.keys(TYPED_SOUND_CONFIG.eventBusToCategory).reduce((acc, eventName) => {
  // Для событий с условиями (например, taskProgressChanged) не добавляем в старый маппинг
  // Они обрабатываются через getSoundForEvent с деталями события
  const eventConfig = TYPED_SOUND_CONFIG.eventBusToCategory[eventName];
  const { category, type } = eventConfig;
  const categorySounds = SOUND_MATRIX[category];
  
  if (categorySounds && categorySounds[type]) {
    const soundConfig = categorySounds[type];
    // Если есть условие, не добавляем в старый маппинг
    if (!soundConfig.condition) {
      acc[eventName] = soundConfig.sound;
    }
  }
  
  return acc;
}, {});

/**
 * Обратная совместимость: маппинг кнопок
 * Генерируется автоматически из типизированной конфигурации
 */
export const buttonSounds = {
  'default': getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_DEFAULT) || 'small-buttons',
  'btn-primary': getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_PRIMARY) || 'small-buttons',
  'btn-secondary': getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_SECONDARY) || 'small-buttons',
  'btn-icon': getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_ICON) || 'small-buttons',
  'btn-danger': getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_DANGER) || 'error',
  'btn-success': getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_SUCCESS) || 'small-buttons',
  'modal-close': getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_CLOSE) || 'small-buttons',
  'modal-confirm': getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_CONFIRM) || 'small-buttons',
  'modal-cancel': getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_CANCEL) || 'small-buttons',
};

/**
 * Общая громкость для всех звуков (0-1)
 * Изменение этого значения влияет на все звуки в приложении
 */
export const DEFAULT_VOLUME = 0.040625; // Уменьшено еще в 2 раза (было 0.08125, изначально 0.325)

/**
 * Дефолтные настройки звуковой системы
 */
export const defaultSettings = {
  volume: DEFAULT_VOLUME,  // Громкость от 0 до 1 (использует общую константу)
  enabled: true,           // Включена ли система
  preload: true,           // Предзагружать ли звуки
};

/**
 * Список звуков для предзагрузки
 * Звуки, которые используются часто и должны быть готовы сразу
 */
export const preloadSounds = [
  'timer-start',
  'small-buttons',
  'select', // Для radio buttons
  'type_01', 'type_02', 'type_03', 'type_04', 'type_05', // Для кнопок (рандомный выбор)
  'tap_01', 'tap_02', 'tap_03', 'tap_04', 'tap_05', // Для ритуалов (рандомный выбор)
  'cansel-timer',
  'finished-timer',
  'success',
  'error',
  'task-completed',
];

// Экспортируем функции для использования в AudioSystem
export { getSoundForEvent, getSoundForButton, getSoundByType };
export { SOUND_CATEGORIES, UI_ELEMENT_TYPES };
