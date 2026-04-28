/**
 * Типизированная система звуков для AURA
 * Полная категоризация и типизация всех звуков в приложении
 */

/**
 * Категории звуков по семантике
 */
export const SOUND_CATEGORIES = {
  // UI взаимодействия
  UI_INTERACTION: 'ui-interaction',
  UI_NAVIGATION: 'ui-navigation',
  
  // Действия с данными
  DATA_CREATE: 'data-create',
  DATA_UPDATE: 'data-update',
  DATA_DELETE: 'data-delete',
  DATA_COMPLETE: 'data-complete',
  
  // Системные события
  SYSTEM_SUCCESS: 'system-success',
  SYSTEM_ERROR: 'system-error',
  
  // Специфичные функции
  TIMER: 'timer',
  FORM_INPUT: 'form-input',
};

/**
 * Типы UI элементов
 */
export const UI_ELEMENT_TYPES = {
  // Кнопки
  BUTTON_PRIMARY: 'button-primary',
  BUTTON_SECONDARY: 'button-secondary',
  BUTTON_ICON: 'button-icon',
  BUTTON_DANGER: 'button-danger',
  BUTTON_SUCCESS: 'button-success',
  BUTTON_DEFAULT: 'button-default',
  
  // Модальные окна
  MODAL_OPEN: 'modal-open',
  MODAL_CLOSE: 'modal-close',
  MODAL_CONFIRM: 'modal-confirm',
  MODAL_CANCEL: 'modal-cancel',
  
  // Формы
  INPUT_TEXT: 'input-text',
  INPUT_RADIO: 'input-radio',
  INPUT_CHECKBOX: 'input-checkbox',
  INPUT_SELECT: 'input-select',
  INPUT_TEXTAREA: 'input-textarea',
  
  // Навигация
  MENU_OPEN: 'menu-open',
  MENU_SELECT: 'menu-select',
  TAB_SWITCH: 'tab-switch',
  NAV_ARROW_PREV: 'nav-arrow-prev',
  NAV_ARROW_NEXT: 'nav-arrow-next',
  LIST_EXPAND: 'list-expand',
  LIST_COLLAPSE: 'list-collapse',
  
  // Новые типы для WAV звуков
  ALERT_WARNING: 'alert-warning',
};

/**
 * Полная матрица соответствия: Категория → Тип → Звук
 */
export const SOUND_MATRIX = {
  // ============================================
  // UI ВЗАИМОДЕЙСТВИЯ (UI_INTERACTION)
  // ============================================
  [SOUND_CATEGORIES.UI_INTERACTION]: {
    [UI_ELEMENT_TYPES.BUTTON_PRIMARY]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'high',
      description: 'Основные действия',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.BUTTON_SECONDARY]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'high',
      description: 'Второстепенные действия',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.BUTTON_ICON]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'high',
      description: 'Кнопки с иконками',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.BUTTON_DEFAULT]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'high',
      description: 'Любые кнопки без специфичного типа',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.BUTTON_DANGER]: {
      sound: 'error',
      priority: 'high',
      description: 'Опасные действия (удаление)',
    },
    [UI_ELEMENT_TYPES.BUTTON_SUCCESS]: {
      sound: 'small-buttons',
      priority: 'high',
      description: 'Подтверждающие действия',
    },
  },
  
  // ============================================
  // UI НАВИГАЦИЯ (UI_NAVIGATION)
  // ============================================
  [SOUND_CATEGORIES.UI_NAVIGATION]: {
    [UI_ELEMENT_TYPES.MODAL_OPEN]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'medium',
      description: 'Открытие модальных окон',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.MODAL_CLOSE]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'medium',
      description: 'Закрытие модальных окон',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.MODAL_CONFIRM]: {
      sound: 'small-buttons',
      priority: 'high',
      description: 'Подтверждение в модальном окне',
    },
    [UI_ELEMENT_TYPES.MODAL_CANCEL]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'medium',
      description: 'Отмена в модальном окне',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.MENU_OPEN]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'medium',
      description: 'Открытие меню/панелей',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.MENU_SELECT]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'medium',
      description: 'Выбор пункта меню',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.TAB_SWITCH]: {
      sound: null, // Рандомный выбор из type_01-05
      priority: 'medium',
      description: 'Переключение вкладок',
      randomSounds: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
    },
    [UI_ELEMENT_TYPES.NAV_ARROW_PREV]: {
      sound: 'select',
      priority: 'medium',
      description: 'Стрелка назад/влево для переключения',
    },
    [UI_ELEMENT_TYPES.NAV_ARROW_NEXT]: {
      sound: 'select',
      priority: 'medium',
      description: 'Стрелка вперед/вправо для переключения',
    },
    [UI_ELEMENT_TYPES.LIST_EXPAND]: {
      sound: 'toggle_on',
      priority: 'medium',
      description: 'Раскрытие списка/категории',
    },
    [UI_ELEMENT_TYPES.LIST_COLLAPSE]: {
      sound: 'toggle_off',
      priority: 'medium',
      description: 'Сворачивание списка/категории',
    },
  },
  
  // ============================================
  // ФОРМЫ (FORM_INPUT)
  // ============================================
  [SOUND_CATEGORIES.FORM_INPUT]: {
    [UI_ELEMENT_TYPES.INPUT_RADIO]: {
      sound: 'select',
      priority: 'medium',
      description: 'Выбор radio button',
    },
    [UI_ELEMENT_TYPES.INPUT_CHECKBOX]: {
      sound: 'select',
      priority: 'medium',
      description: 'Переключение checkbox',
    },
    [UI_ELEMENT_TYPES.INPUT_TEXT]: {
      sound: 'text-area',
      priority: 'low',
      description: 'Фокус на текстовое поле',
    },
    [UI_ELEMENT_TYPES.INPUT_TEXTAREA]: {
      sound: 'text-area',
      priority: 'low',
      description: 'Фокус на textarea',
    },
    [UI_ELEMENT_TYPES.INPUT_SELECT]: {
      sound: 'small-buttons',
      priority: 'medium',
      description: 'Выбор в select',
    },
  },
  
  // ============================================
  // ДАННЫЕ - СОЗДАНИЕ (DATA_CREATE)
  // ============================================
  [SOUND_CATEGORIES.DATA_CREATE]: {
    'transactionAdded': {
      sound: 'small-buttons',
      priority: 'high',
      description: 'Добавление транзакции',
    },
    'dailyPlanAdded': {
      sound: 'small-buttons',
      priority: 'medium',
      description: 'Добавление плана',
    },
    'timerSessionAdded': {
      sound: 'timer-start',
      priority: 'high',
      description: 'Добавление сессии таймера',
    },
  },
  
  // ============================================
  // ДАННЫЕ - ОБНОВЛЕНИЕ (DATA_UPDATE)
  // ============================================
  [SOUND_CATEGORIES.DATA_UPDATE]: {
    'taskProgressChanged': {
      sound: null, // Условный - только при 100%
      priority: 'high',
      description: 'Изменение прогресса задачи',
      condition: (detail) => {
        const completionPercent = detail?.data?.completionPercent ?? 
                                 detail?.data?.completion_percent ?? 
                                 0;
        const previousPercent = detail?.previousData?.completionPercent ?? 
                                detail?.previousData?.completion_percent ?? 
                                null;
        
        // Воспроизводим звук если:
        // 1. Текущий прогресс = 100% и предыдущий был < 100% (завершение)
        // 2. Текущий прогресс < 100% и предыдущий был = 100% (отмена)
        const isCompleting = completionPercent === 100 && (previousPercent === null || previousPercent < 100);
        const isUncompleting = completionPercent < 100 && previousPercent === 100;
        
        // Используем success.wav только при достижении 100% (завершение задачи)
        if (isCompleting) {
          return 'success';
        }
        // При отмене завершения (снятии 100%) не воспроизводим звук
        return null;
      },
    },
    'ritualChanged': {
      sound: 'small-buttons',
      priority: 'medium',
      description: 'Изменение ритуала',
    },
    'transactionChanged': {
      sound: 'small-buttons',
      priority: 'medium',
      description: 'Изменение транзакции',
    },
    'timerSessionChanged': {
      sound: 'small-buttons',
      priority: 'medium',
      description: 'Изменение сессии таймера',
    },
    'dailyPlanChanged': {
      sound: 'small-buttons',
      priority: 'medium',
      description: 'Изменение плана',
    },
  },
  
  // ============================================
  // ДАННЫЕ - УДАЛЕНИЕ (DATA_DELETE)
  // ============================================
  [SOUND_CATEGORIES.DATA_DELETE]: {
    'transactionDeleted': {
      sound: 'caution',
      priority: 'medium',
      description: 'Удаление транзакции',
    },
    'timerSessionDeleted': {
      sound: 'finished-timer',
      priority: 'high',
      description: 'Удаление сессии таймера',
    },
    'dailyPlanDeleted': {
      sound: 'caution',
      priority: 'medium',
      description: 'Удаление плана',
    },
  },
  
  // ============================================
  // ДАННЫЕ - ЗАВЕРШЕНИЕ (DATA_COMPLETE)
  // ============================================
  [SOUND_CATEGORIES.DATA_COMPLETE]: {
    'taskCompleted': {
      sound: 'task-completed',
      priority: 'high',
      description: 'Завершение задачи',
    },
    'ritualCompleted': {
      sound: null, // Рандомный выбор из tap_01-05
      priority: 'high',
      description: 'Завершение ритуала',
      randomSounds: ['tap_01', 'tap_02', 'tap_03', 'tap_04', 'tap_05'],
    },
  },
  
  // ============================================
  // СИСТЕМА - УСПЕХ (SYSTEM_SUCCESS)
  // ============================================
  [SOUND_CATEGORIES.SYSTEM_SUCCESS]: {
    'pointsUpdated': {
      sound: 'small-buttons',
      priority: 'high',
      description: 'Обновление очков',
    },
    'pointsRecalculated': {
      sound: 'small-buttons',
      priority: 'high',
      description: 'Пересчет очков',
    },
  },
  
  // ============================================
  // ТАЙМЕР (TIMER)
  // ============================================
  [SOUND_CATEGORIES.TIMER]: {
    'timerStart': {
      sound: 'timer-start',
      priority: 'high',
      description: 'Запуск таймера',
    },
    'timerFinish': {
      sound: 'finished-timer',
      priority: 'high',
      description: 'Завершение таймера',
    },
    'timerCancel': {
      sound: 'cansel-timer',
      priority: 'high',
      description: 'Отмена таймера',
    },
    'timerPause': {
      sound: 'toggle_on',
      priority: 'high',
      description: 'Пауза таймера',
    },
    'timerResume': {
      sound: 'toggle_off',
      priority: 'high',
      description: 'Возобновление таймера',
    },
  },
  
  // ============================================
  // СИСТЕМА - ОШИБКИ (SYSTEM_ERROR)
  // ============================================
  [SOUND_CATEGORIES.SYSTEM_ERROR]: {
    [UI_ELEMENT_TYPES.ALERT_WARNING]: {
      sound: 'caution', // WAV из SND01_sine
      priority: 'high',
      description: 'Предупреждения и alert',
    },
  },
  
};

/**
 * Типизированная конфигурация звуков
 * Структура: { category, elementType, sound, priority, condition? }
 */
export const TYPED_SOUND_CONFIG = {
  // Маппинг классов кнопок на типы
  buttonClassToType: {
    'btn': UI_ELEMENT_TYPES.BUTTON_DEFAULT,
    'btn-primary': UI_ELEMENT_TYPES.BUTTON_PRIMARY,
    'btn-secondary': UI_ELEMENT_TYPES.BUTTON_SECONDARY,
    'btn-icon': UI_ELEMENT_TYPES.BUTTON_ICON,
    'btn-danger': UI_ELEMENT_TYPES.BUTTON_DANGER,
    'btn-success': UI_ELEMENT_TYPES.BUTTON_SUCCESS,
  },
  
  // Маппинг EventBus событий на категории и типы
  eventBusToCategory: {
    // Создание
    'transactionAdded': {
      category: SOUND_CATEGORIES.DATA_CREATE,
      type: 'transactionAdded',
    },
    'dailyPlanAdded': {
      category: SOUND_CATEGORIES.DATA_CREATE,
      type: 'dailyPlanAdded',
    },
    'timerSessionAdded': {
      category: SOUND_CATEGORIES.DATA_CREATE,
      type: 'timerSessionAdded',
    },
    
    // Обновление
    'taskProgressChanged': {
      category: SOUND_CATEGORIES.DATA_UPDATE,
      type: 'taskProgressChanged',
    },
    'ritualChanged': {
      category: SOUND_CATEGORIES.DATA_UPDATE,
      type: 'ritualChanged',
    },
    'transactionChanged': {
      category: SOUND_CATEGORIES.DATA_UPDATE,
      type: 'transactionChanged',
    },
    'timerSessionChanged': {
      category: SOUND_CATEGORIES.DATA_UPDATE,
      type: 'timerSessionChanged',
    },
    'dailyPlanChanged': {
      category: SOUND_CATEGORIES.DATA_UPDATE,
      type: 'dailyPlanChanged',
    },
    
    // Удаление
    'transactionDeleted': {
      category: SOUND_CATEGORIES.DATA_DELETE,
      type: 'transactionDeleted',
    },
    'timerSessionDeleted': {
      category: SOUND_CATEGORIES.DATA_DELETE,
      type: 'timerSessionDeleted',
    },
    'dailyPlanDeleted': {
      category: SOUND_CATEGORIES.DATA_DELETE,
      type: 'dailyPlanDeleted',
    },
    
    // Завершение
    'taskCompleted': {
      category: SOUND_CATEGORIES.DATA_COMPLETE,
      type: 'taskCompleted',
    },
    'ritualCompleted': {
      category: SOUND_CATEGORIES.DATA_COMPLETE,
      type: 'ritualCompleted',
    },
    
    // Система
    'pointsUpdated': {
      category: SOUND_CATEGORIES.SYSTEM_SUCCESS,
      type: 'pointsUpdated',
    },
    'pointsRecalculated': {
      category: SOUND_CATEGORIES.SYSTEM_SUCCESS,
      type: 'pointsRecalculated',
    },
  },
};

/**
 * Получить звук по категории и типу элемента
 * @param {string} category - Категория звука
 * @param {string} elementType - Тип UI элемента
 * @returns {string|null} Имя звука или null
 */
export function getSoundByType(category, elementType) {
  const categorySounds = SOUND_MATRIX[category];
  if (!categorySounds) return null;
  
  const soundConfig = categorySounds[elementType];
  if (!soundConfig) return null;
  
  // Если есть массив randomSounds, выбираем случайный звук
  if (soundConfig.randomSounds && Array.isArray(soundConfig.randomSounds) && soundConfig.randomSounds.length > 0) {
    const randomIndex = Math.floor(Math.random() * soundConfig.randomSounds.length);
    return soundConfig.randomSounds[randomIndex];
  }
  
  return soundConfig.sound;
}

/**
 * Получить звук для EventBus события
 * @param {string} eventName - Имя события
 * @param {object} detail - Детали события
 * @returns {string|null} Имя звука или null
 */
export function getSoundForEvent(eventName, detail = {}) {
  const eventConfig = TYPED_SOUND_CONFIG.eventBusToCategory[eventName];
  if (!eventConfig) return null;
  
  const { category, type } = eventConfig;
  const categorySounds = SOUND_MATRIX[category];
  if (!categorySounds) return null;
  
  const soundConfig = categorySounds[type];
  if (!soundConfig) return null;
  
  // Если есть условие, проверяем его
  if (soundConfig.condition && typeof soundConfig.condition === 'function') {
    return soundConfig.condition(detail);
  }
  
  // Если есть массив randomSounds, выбираем случайный звук
  if (soundConfig.randomSounds && Array.isArray(soundConfig.randomSounds) && soundConfig.randomSounds.length > 0) {
    const randomIndex = Math.floor(Math.random() * soundConfig.randomSounds.length);
    return soundConfig.randomSounds[randomIndex];
  }
  
  return soundConfig.sound;
}

/**
 * Получить звук для кнопки по классам
 * @param {HTMLElement} element - Элемент кнопки
 * @returns {string} Имя звука
 */
export function getSoundForButton(element) {
  // Проверяем классы в порядке приоритета
  for (const [className, elementType] of Object.entries(TYPED_SOUND_CONFIG.buttonClassToType)) {
    if (element.classList.contains(className)) {
      const sound = getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, elementType);
      if (sound) return sound;
    }
  }
  
  // Дефолтный звук (будет рандомный из type_01-05)
  const defaultSound = getSoundByType(
    SOUND_CATEGORIES.UI_INTERACTION,
    UI_ELEMENT_TYPES.BUTTON_DEFAULT
  );
  return defaultSound || 'small-buttons';
}

/**
 * ВСЕ ДОСТУПНЫЕ ЗВУКИ В СИСТЕМЕ
 */
export const AVAILABLE_SOUNDS = {
  'small-buttons': {
    file: 'small-buttons.wav',
    category: SOUND_CATEGORIES.UI_INTERACTION,
    usage: 'Основной звук для кнопок и UI элементов',
    status: '✅ Есть',
  },
  'success': {
    file: 'success.wav',
    category: SOUND_CATEGORIES.SYSTEM_SUCCESS,
    usage: 'Успешные действия, подтверждения',
    status: '✅ Есть',
  },
  'error': {
    file: 'error.wav',
    category: SOUND_CATEGORIES.SYSTEM_ERROR,
    usage: 'Ошибки, опасные действия',
    status: '✅ Есть',
  },
  'text-area': {
    file: 'text-area.wav',
    category: SOUND_CATEGORIES.FORM_INPUT,
    usage: 'Фокус на текстовые поля',
    status: '✅ Есть',
  },
  'task-completed': {
    file: 'task-completed.wav',
    category: SOUND_CATEGORIES.DATA_COMPLETE,
    usage: 'Завершение задач и ритуалов',
    status: '✅ Есть',
  },
  'timer-start': {
    file: 'timer-start.mp3',
    category: SOUND_CATEGORIES.TIMER,
    usage: 'Запуск таймера, добавление сессии',
    status: '✅ Есть',
  },
  'finished-timer': {
    file: 'finished-timer.wav',
    category: SOUND_CATEGORIES.TIMER,
    usage: 'Завершение таймера, удаление сессии',
    status: '✅ Есть',
  },
  'cansel-timer': {
    file: 'cansel-timer.wav',
    category: SOUND_CATEGORIES.TIMER,
    usage: 'Отмена таймера',
    status: '✅ Есть',
  },
  // WAV звуки
  'caution': {
    file: 'caution.wav',
    category: SOUND_CATEGORIES.SYSTEM_ERROR,
    usage: 'Предупреждения, alert, удаление элементов',
    status: '✅ Есть',
  },
  'toggle_on': {
    file: 'toggle_on.wav',
    category: SOUND_CATEGORIES.UI_NAVIGATION,
    usage: 'Включение состояния, пауза таймера',
    status: '✅ Есть',
  },
  'toggle_off': {
    file: 'toggle_off.wav',
    category: SOUND_CATEGORIES.UI_NAVIGATION,
    usage: 'Выключение состояния, возобновление таймера',
    status: '✅ Есть',
  },
  'select': {
    file: 'select.wav',
    category: SOUND_CATEGORIES.UI_NAVIGATION,
    usage: 'Переключение стрелками, выбор элементов, radio buttons',
    status: '✅ Есть',
  },
  // Рандомные звуки для кнопок
  'type_01': {
    file: 'type_01.wav',
    category: SOUND_CATEGORIES.UI_INTERACTION,
    usage: 'Кнопки (рандомный выбор)',
    status: '✅ Есть',
  },
  'type_02': {
    file: 'type_02.wav',
    category: SOUND_CATEGORIES.UI_INTERACTION,
    usage: 'Кнопки (рандомный выбор)',
    status: '✅ Есть',
  },
  'type_03': {
    file: 'type_03.wav',
    category: SOUND_CATEGORIES.UI_INTERACTION,
    usage: 'Кнопки (рандомный выбор)',
    status: '✅ Есть',
  },
  'type_04': {
    file: 'type_04.wav',
    category: SOUND_CATEGORIES.UI_INTERACTION,
    usage: 'Кнопки (рандомный выбор)',
    status: '✅ Есть',
  },
  'type_05': {
    file: 'type_05.wav',
    category: SOUND_CATEGORIES.UI_INTERACTION,
    usage: 'Кнопки (рандомный выбор)',
    status: '✅ Есть',
  },
  // Рандомные звуки для ритуалов
  'tap_01': {
    file: 'tap_01.wav',
    category: SOUND_CATEGORIES.DATA_COMPLETE,
    usage: 'Выполнение ритуалов (рандомный выбор)',
    status: '✅ Есть',
  },
  'tap_02': {
    file: 'tap_02.wav',
    category: SOUND_CATEGORIES.DATA_COMPLETE,
    usage: 'Выполнение ритуалов (рандомный выбор)',
    status: '✅ Есть',
  },
  'tap_03': {
    file: 'tap_03.wav',
    category: SOUND_CATEGORIES.DATA_COMPLETE,
    usage: 'Выполнение ритуалов (рандомный выбор)',
    status: '✅ Есть',
  },
  'tap_04': {
    file: 'tap_04.wav',
    category: SOUND_CATEGORIES.DATA_COMPLETE,
    usage: 'Выполнение ритуалов (рандомный выбор)',
    status: '✅ Есть',
  },
  'tap_05': {
    file: 'tap_05.wav',
    category: SOUND_CATEGORIES.DATA_COMPLETE,
    usage: 'Выполнение ритуалов (рандомный выбор)',
    status: '✅ Есть',
  },
};
