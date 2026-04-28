/**
 * Утилиты для конвертации цветов
 * Все функции делегируют в ColorSystem для единой точки входа
 */

import ColorSystem from '../design-system/tokens/ColorSystem.js';

/**
 * Преобразует HSL в HEX
 * @param {string} hsl - HSL строка вида "hsl(38, 90%, 59%)"
 * @returns {string} HEX строка вида "#ff0000"
 */
export function hslToHex(hsl) {
  // Если строка содержит calc(), нужно вычислить её через DOM
  if (hsl && typeof hsl === 'string' && hsl.includes('calc')) {
    const el = document.createElement('div');
    el.style.color = hsl;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    
    // computed будет в формате rgb(r, g, b)
    const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const toHex = (c) => c.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  }
  
  // Стандартный парсинг для обычных HSL
  const hslMatch = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!hslMatch) return '#000000';
  
  const h = parseInt(hslMatch[1]) / 360;
  const s = parseInt(hslMatch[2]) / 100;
  const l = parseInt(hslMatch[3]) / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Преобразует HEX или HSL в RGBA
 * Автоматически конвертирует HSL в HEX перед использованием ColorSystem.rgba()
 * @param {string} color - HEX строка вида "#ff0000" или HSL строка вида "hsl(38, 90%, 59%)"
 * @param {number} alpha - Альфа канал (0-1)
 * @returns {string} RGBA строка вида "rgba(255, 0, 0, 0.5)"
 */
export function hexToRgba(color, alpha = 1) {
  // Если цвет в формате HSL, конвертируем в HEX
  if (color && typeof color === 'string' && color.toLowerCase().startsWith('hsl')) {
    color = hslToHex(color);
  }
  return ColorSystem.rgba(color, alpha);
}

/**
 * Получает непрозрачность фона иконки в зависимости от темы иконок
 * Поддерживает различные темы: minimal, subtle, vibrant, bordered, shadowed, solid
 * @returns {number} Непрозрачность фона (0-1)
 */
export function getIconBackgroundOpacity() {
  if (typeof document === 'undefined') return 0.15;
  
  // Получаем выбранную тему иконок
  const iconTheme = document.documentElement.getAttribute('data-icon-theme') || 
                    localStorage.getItem('aura-icon-theme') || 
                    'minimal';
  
  // Определяем непрозрачность в зависимости от темы иконок
  const opacityMap = {
    'minimal': 0.15,
    'gradient': 0.25
  };
  
  let opacity = opacityMap[iconTheme] || 0.15;
  
  // Для светлой темы немного увеличиваем непрозрачность для лучшей видимости
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (currentTheme === 'light' && iconTheme !== 'solid') {
    opacity = Math.min(opacity + 0.05, 0.4);
  }
  
  return opacity;
}

/**
 * Преобразует HEX в RGB объект
 * Делегирует в ColorSystem.hexToRgb()
 * @param {string} hex - HEX строка
 * @returns {Object|null} Объект {r, g, b} или null
 */
export function hexToRgb(hex) {
  return ColorSystem.hexToRgb(hex);
}

/**
 * Получает цвет категории задачи
 * Получает HSL из ColorSystem и конвертирует в HEX
 * @param {string} categoryType - Тип категории ('rituals', 'time', 'body', 'deps')
 * @returns {string} HEX цвет категории
 */
export function getCategoryColor(categoryType) {
  const hsl = ColorSystem.getTaskCategoryColor(categoryType);
  return hslToHex(hsl);
}

/**
 * Получает цвет типа транзакции
 * Получает HSL из ColorSystem и конвертирует в HEX
 * @param {string} transactionType - Тип транзакции ('income', 'expense', 'transfer')
 * @returns {string} HEX цвет типа транзакции
 */
export function getTransactionTypeColor(transactionType) {
  const hsl = ColorSystem.getTransactionTypeColor(transactionType);
  return hslToHex(hsl);
}

/**
 * Применяет фон к иконке с учетом выбранной темы иконок
 * Поддерживает градиентную тему и другие стили
 * @param {HTMLElement} iconWrapper - Элемент иконки (может быть act-card-icon, cfg-card-icon, stats-table-header-icon-badge и т.д.)
 * @param {string} iconColor - Цвет иконки (hex или hsl)
 */
export function applyIconBackground(iconWrapper, iconColor) {
  if (!iconWrapper || !iconColor) return;
  
  const iconTheme = document.documentElement.getAttribute('data-icon-theme') || 
                    localStorage.getItem('aura-icon-theme') || 
                    'minimal';
  
  // Конвертируем цвет в HEX если нужно (для единообразия)
  let hexColor = iconColor;
  if (typeof iconColor === 'string') {
    if (iconColor.toLowerCase().startsWith('hsl') || iconColor.includes('calc')) {
      hexColor = hslToHex(iconColor);
    } else if (iconColor.startsWith('rgb')) {
      // Конвертируем rgb/rgba в hex
      const rgbMatch = iconColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        const toHex = (c) => c.toString(16).padStart(2, '0');
        hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
    }
  }
  
  const opacity = getIconBackgroundOpacity();
  
  // Для градиентной темы применяем градиент
  if (iconTheme === 'gradient') {
    iconWrapper.style.backgroundImage = `linear-gradient(135deg, ${hexToRgba(hexColor, 0.25)}, ${hexToRgba(hexColor, 0.176)})`;
    iconWrapper.style.backgroundColor = 'transparent';
  } else {
    // Минималистичная тема
    iconWrapper.style.backgroundImage = 'none';
    iconWrapper.style.backgroundColor = hexToRgba(hexColor, opacity);
  }
  
  // Сохраняем цвет для последующего обновления (в HEX формате)
  iconWrapper.style.setProperty('--icon-color', hexColor);
}

export default {
  hslToHex,
  hexToRgba,
  hexToRgb,
  getCategoryColor,
  getTransactionTypeColor,
  getIconBackgroundOpacity,
  applyIconBackground
};
