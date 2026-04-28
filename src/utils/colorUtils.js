/**
 * Утилиты для работы с цветами
 * Делегирует всю логику в ColorSystem для обратной совместимости
 */

import ColorSystem from '../design-system/tokens/ColorSystem.js';

class ColorUtils {
  /**
   * Парсит hex цвет в RGB компоненты
   * Делегирует в ColorSystem
   */
  static hexToRgb(hex) {
    return ColorSystem.hexToRgb(hex);
  }

  /**
   * Инициализирует динамические цветовые токены
   * Делегирует в ColorSystem
   */
  static initDynamicColors() {
    ColorSystem.init();
  }

  /**
   * Обновляет динамические цвета при изменении accent цвета
   * Делегирует в ColorSystem
   */
  static updateAccentColor(newAccentColor) {
    ColorSystem.setAccent(newAccentColor);
  }
}

export default ColorUtils;
