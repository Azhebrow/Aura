/**
 * ЦЕНТРАЛИЗОВАННАЯ СИСТЕМА УПРАВЛЕНИЯ ПАЛИТРОЙ ЦВЕТОВ ДЛЯ CFG ЭЛЕМЕНТОВ
 * ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ для всех цветов cfg элементов
 * 
 * Все цвета читаются из CSS переменных (palette.css)
 * Цвета категорий задач — из TaskCategoriesConfigService (настраиваемые)
 */

import { taskCategoriesConfigService } from '../../system/services/index.js';

class CfgColorPalette {
  // ============================================
  // МАППИНГ ТИПОВ CFG НА CSS ПЕРЕМЕННЫЕ ПАЛИТРЫ
  // ============================================
  static PALETTE_MAPPING = {
    'finance-accounts': {
      cssVarPrefix: '--account-',
      count: 10,
      defaultIndex: 1
    },
    'finance-income': {
      cssVarPrefix: '--income-',
      count: 10,
      defaultIndex: 1
    },
    'finance-expense': {
      cssVarPrefix: '--expense-',
      count: 10,
      defaultIndex: 1
    },
    'leisure-filling': {
      cssVarPrefix: '--leisure-filling-',
      count: 10,
      defaultIndex: 1
    },
    'leisure-escape': {
      cssVarPrefix: '--leisure-escape-',
      count: 10,
      defaultIndex: 1
    },
    'tasks-categories': {
      cssVarPrefix: '--palette-',
      count: 10,
      defaultIndex: 1
    },
    'tasks-rituals': {
      cssVarPrefix: '--palette-',
      count: 10,
      defaultIndex: 1
    },
    'tasks-time': {
      cssVarPrefix: '--palette-',
      count: 10,
      defaultIndex: 1
    },
    'tasks-body': {
      cssVarPrefix: '--palette-',
      count: 10,
      defaultIndex: 1
    },
    'tasks-deps': {
      cssVarPrefix: '--palette-',
      count: 10,
      defaultIndex: 1
    },
    'goals': {
      cssVarPrefix: '--palette-',
      count: 10,
      defaultIndex: 1
    },
    'rituals-morning': {
      cssVarPrefix: '--ritual-morning-',
      count: 1,
      defaultIndex: 1
    },
    'rituals-evening': {
      cssVarPrefix: '--ritual-evening-',
      count: 1,
      defaultIndex: 1
    }
  };

  // ============================================
  // УТИЛИТЫ ДЛЯ РАБОТЫ С CSS ПЕРЕМЕННЫМИ
  // ============================================
  /**
   * Получает значение CSS переменной
   * @param {string} cssVar - Имя CSS переменной (например, '--account-1')
   * @returns {string} Значение переменной или пустая строка
   */
  static getCSSVariable(cssVar) {
    if (typeof document === 'undefined') {
      return '';
    }
    try {
      const style = getComputedStyle(document.documentElement);
      const value = style.getPropertyValue(cssVar).trim();
      // Проверяем, что значение не пустое и является валидным цветом
      if (value && (value.startsWith('hsl') || value.startsWith('rgb') || value.startsWith('#'))) {
        return value;
      }
      return '';
    } catch (e) {
      console.warn(`[CfgColorPalette] Ошибка при чтении CSS переменной ${cssVar}:`, e);
      return '';
    }
  }

  /**
   * Нормализует HSL строку (убирает лишние пробелы)
   * @param {string} hsl - HSL строка
   * @returns {string} Нормализованная HSL строка
   */
  static normalizeHSL(hsl) {
    if (!hsl || typeof hsl !== 'string') return '';
    return hsl.replace(/\s+/g, ' ').trim();
  }

  /**
   * Сравнивает два HSL цвета (с учетом нормализации)
   * @param {string} color1 - Первый цвет
   * @param {string} color2 - Второй цвет
   * @returns {boolean} true если цвета совпадают
   */
  static compareHSL(color1, color2) {
    return this.normalizeHSL(color1).toLowerCase() === this.normalizeHSL(color2).toLowerCase();
  }

  // ============================================
  // ОСНОВНЫЕ МЕТОДЫ
  // ============================================
  /**
   * Получает все цвета палитры для типа cfg
   * @param {string} cfgType - Тип cfg (например, 'finance-accounts')
   * @returns {Array<{value: string, index: number, cssVar: string}>} Массив цветов
   */
  static getPalette(cfgType) {
    const mapping = this.PALETTE_MAPPING[cfgType];
    if (!mapping) {
      // Fallback на общую палитру
      return this.getPalette('tasks-categories');
    }

    const colors = [];
    for (let i = 1; i <= mapping.count; i++) {
      const cssVar = `${mapping.cssVarPrefix}${i}`;
      const computedValue = this.getCSSVariable(cssVar);
      
      // Проверяем, что значение не пустое и не содержит только пробелы
      if (computedValue && computedValue.trim()) {
        colors.push({
          value: computedValue.trim(),
          index: i,
          cssVar: cssVar
        });
      } else {
        // Если переменная не читается, пробуем прочитать напрямую через document.documentElement.style
        // Это может помочь, если переменная определена, но не вычисляется через getComputedStyle
        try {
          const directValue = document.documentElement.style.getPropertyValue(cssVar).trim();
          if (directValue) {
            colors.push({
              value: directValue.trim(),
              index: i,
              cssVar: cssVar
            });
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    }

    // Если не удалось получить цвета, возвращаем хотя бы дефолтный
    if (colors.length === 0 && mapping.defaultIndex) {
      const defaultColor = this.getColorByIndex(cfgType, mapping.defaultIndex);
      if (defaultColor) {
        colors.push({
          value: defaultColor,
          index: mapping.defaultIndex,
          cssVar: `${mapping.cssVarPrefix}${mapping.defaultIndex}`
        });
      }
    }

    return colors;
  }

  /**
   * Получает цвет по индексу для типа cfg
   * @param {string} cfgType - Тип cfg
   * @param {number} index - Индекс цвета (1-based)
   * @returns {string} HSL цвет или пустая строка
   */
  static getColorByIndex(cfgType, index) {
    const mapping = this.PALETTE_MAPPING[cfgType];
    if (!mapping || index < 1 || index > mapping.count) {
      return '';
    }

    const cssVar = `${mapping.cssVarPrefix}${index}`;
    return this.getCSSVariable(cssVar);
  }

  /**
   * Получает индекс цвета в палитре (если цвет найден)
   * @param {string} cfgType - Тип cfg
   * @param {string} color - HSL цвет для поиска
   * @returns {number|null} Индекс цвета или null
   */
  static getColorIndex(cfgType, color) {
    if (!color) return null;
    
    const palette = this.getPalette(cfgType);
    const normalizedColor = this.normalizeHSL(color);
    
    for (const item of palette) {
      if (this.compareHSL(item.value, normalizedColor)) {
        return item.index;
      }
    }
    
    return null;
  }

  /**
   * Получает дефолтный цвет для типа cfg
   * @param {string} cfgType - Тип cfg
   * @returns {string} HSL цвет
   */
  static getDefaultColor(cfgType) {
    const mapping = this.PALETTE_MAPPING[cfgType];
    if (!mapping) {
      // Fallback на общую палитру
      return this.getColorByIndex('tasks-categories', 1) || 'hsl(210, 28%, 64%)';
    }

    return this.getColorByIndex(cfgType, mapping.defaultIndex) || 'hsl(210, 28%, 64%)';
  }

  /**
   * Получает цвет из значения (HSL или индекс)
   * Если передан индекс - возвращает цвет из палитры
   * Если передан HSL - возвращает его как есть
   * @param {string} cfgType - Тип cfg
   * @param {string|number} colorValue - HSL строка или индекс
   * @returns {string} HSL цвет
   */
  static getColorFromValue(cfgType, colorValue) {
    if (!colorValue) {
      return this.getDefaultColor(cfgType);
    }

    // Если это число (индекс)
    if (typeof colorValue === 'number' || /^\d+$/.test(String(colorValue))) {
      const index = parseInt(colorValue, 10);
      const color = this.getColorByIndex(cfgType, index);
      return color || this.getDefaultColor(cfgType);
    }

    // Если это HSL строка
    if (typeof colorValue === 'string' && colorValue.toLowerCase().startsWith('hsl')) {
      return colorValue;
    }

    // Fallback
    return this.getDefaultColor(cfgType);
  }

  /**
   * Нормализует цвет к палитре
   * Если цвет из палитры - возвращает актуальное значение из CSS переменной
   * Если цвет кастомный - возвращает как есть
   * @param {string} cfgType - Тип cfg
   * @param {string} colorValue - HSL цвет для нормализации
   * @returns {string} Нормализованный HSL цвет
   */
  static normalizeColor(cfgType, colorValue) {
    if (!colorValue) {
      return this.getDefaultColor(cfgType);
    }

    // Проверяем, есть ли этот цвет в палитре
    const palette = this.getPalette(cfgType);
    const normalizedInput = this.normalizeHSL(colorValue);

    for (const item of palette) {
      if (this.compareHSL(item.value, normalizedInput)) {
        // Цвет из палитры - возвращаем актуальное значение из CSS переменной
        return item.value;
      }
    }

    // Цвет не из палитры - возвращаем как есть (кастомный цвет)
    return colorValue;
  }

  /**
   * Получает цвет категории задачи
   * Читает из TaskCategoriesConfigService (настраиваемые в настройках)
   * @param {string} categoryType - Тип категории ('rituals', 'time', 'body', 'deps')
   * @returns {string} HSL цвет категории
   */
  static getTaskCategoryColor(categoryType) {
    return taskCategoriesConfigService.getColor(categoryType);
  }
}

export default CfgColorPalette;

