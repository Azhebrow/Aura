/**
 * Компонент таблицы статистики
 */

import { formatForTable, getCellColor } from '../../utils/stats/StatsDataFormatter.js';
import { EmptyState } from '../display/index.js';
import { hexToRgba, getIconBackgroundOpacity, applyIconBackground, hslToHex } from '../../utils/colorConversion.js';
import { setupDragScroll } from '../../utils/dragScroll.js';

class StatsTable {
  constructor() {
    this.element = null;
    this.data = null;
    this.mode = 'tasks';
    this.groupBy = 'categories';
    this.visibleColumns = null; // Map или Set для отслеживания видимых колонок
    this.lineChart = null; // Ссылка на lineChart для проверки видимости
  }

  async init() {
    this.element = document.createElement('div');
    this.element.className = 'stats-table-container';
    
    // Обработчики событий для обновления цветов
    this.accentColorHandler = () => this.updateColors();
    this.themeHandler = () => this.updateColors();
    
    window.addEventListener('accentColorChanged', this.accentColorHandler);
    window.addEventListener('themeChanged', this.themeHandler);
    
    // Инициализация drag scroll
    this.setupDragScroll();
  }

  /**
   * Настройка drag scroll для таблицы
   */
  setupDragScroll() {
    if (!this.element) return;
    setupDragScroll(this.element, { speed: 2 });
  }
  
  /**
   * Обновить цвета таблицы при изменении акцентного цвета или темы
   */
  async updateColors() {
    // Перерисовываем таблицу только если данные уже установлены
    if (this.data && this.data.length > 0 && this.element && this.element.querySelector('.stats-table')) {
      await this.render();
    }
  }

  setData(data, mode, groupBy, meta = null, aggregation = 'day') {
    this.data = data;
    this.mode = mode;
    this.groupBy = groupBy;
    this.meta = meta || { icons: {} };
    this.aggregation = aggregation;
  }

  /**
   * Установить ссылку на lineChart для проверки видимости датасетов
   */
  setLineChart(lineChart) {
    this.lineChart = lineChart;
  }

  /**
   * Проверить, видима ли колонка
   */
  isColumnVisible(columnIndex) {
    if (!this.lineChart) {
      return true; // Если нет ссылки на график, показываем все
    }
    return this.lineChart.isDatasetVisible(columnIndex);
  }

  /**
   * Затемнить цвет, смешивая его с черным
   */
  darkenColor(color, amount) {
    // Парсим цвет (hex или rgb)
    let r = 59, g = 130, b = 246; // Fallback синий
    
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      }
    }
    
    // Смешиваем с черным: result = color * (1 - amount) + black * amount
    const darkenedR = Math.round(r * (1 - amount));
    const darkenedG = Math.round(g * (1 - amount));
    const darkenedB = Math.round(b * (1 - amount));
    
    return `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
  }

  /**
   * Смешать полупрозрачный цвет с базовым непрозрачным фоном
   */
  blendColor(overlayColor, baseColor) {
    // Парсим overlay цвет (rgba)
    const rgbaMatch = overlayColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!rgbaMatch) return baseColor;
    
    const overlayR = parseInt(rgbaMatch[1]);
    const overlayG = parseInt(rgbaMatch[2]);
    const overlayB = parseInt(rgbaMatch[3]);
    const overlayAlpha = parseFloat(rgbaMatch[4] || '1');
    
    // Получаем базовый цвет (из CSS переменной или fallback)
    let baseR = 255, baseG = 255, baseB = 255; // Белый по умолчанию для светлой темы
    try {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const baseColorValue = computedStyle.getPropertyValue('--color-section-background')?.trim() || 
                            computedStyle.getPropertyValue('--color-surface')?.trim() || 
                            '#ffffff';
      
      // Парсим hex, rgb или rgba
      if (baseColorValue.startsWith('#')) {
        const hex = baseColorValue.slice(1);
        if (hex.length === 6) {
          baseR = parseInt(hex.slice(0, 2), 16);
          baseG = parseInt(hex.slice(2, 4), 16);
          baseB = parseInt(hex.slice(4, 6), 16);
        }
      } else if (baseColorValue.startsWith('rgb')) {
        const rgbMatch = baseColorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          baseR = parseInt(rgbMatch[1], 10);
          baseG = parseInt(rgbMatch[2], 10);
          baseB = parseInt(rgbMatch[3], 10);
        }
      }
    } catch (e) {
      // Используем значения по умолчанию
    }
    
    // Смешиваем цвета: result = base * (1 - alpha) + overlay * alpha
    const r = Math.round(baseR * (1 - overlayAlpha) + overlayR * overlayAlpha);
    const g = Math.round(baseG * (1 - overlayAlpha) + overlayG * overlayAlpha);
    const b = Math.round(baseB * (1 - overlayAlpha) + overlayB * overlayAlpha);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Получить цвет для столбца по индексу
   */
  getColumnColor(index) {
    // Палитра минималистичных цветов
    const colors = [
      'rgba(59, 130, 246, 0.9)',   // Синий
      'rgba(34, 197, 94, 0.9)',    // Зеленый
      'rgba(251, 191, 36, 0.9)',   // Желтый
      'rgba(239, 68, 68, 0.9)',    // Красный
      'rgba(168, 85, 247, 0.9)',   // Фиолетовый
      'rgba(236, 72, 153, 0.9)',   // Розовый
      'rgba(14, 165, 233, 0.9)',   // Голубой
      'rgba(20, 184, 166, 0.9)',   // Бирюзовый
      'rgba(249, 115, 22, 0.9)',   // Оранжевый
      'rgba(139, 92, 246, 0.9)'    // Индиго
    ];
    
    return colors[index % colors.length];
  }

  async render() {
    if (!this.element) {
      await this.init();
    }

    // Очищаем содержимое
    this.element.innerHTML = '';

    if (!this.data || this.data.length === 0) {
      const emptyState = new EmptyState({
        type: 'elements',
        title: 'Нет данных',
        message: 'Нет данных за выбранный период'
      });
      await emptyState.init();
      this.element.appendChild(emptyState.render());
      return this.element;
    }

    // Форматируем данные для таблицы
    const formatted = formatForTable(this.data, this.mode, this.groupBy, this.aggregation);

    if (formatted.rows.length === 0 || formatted.columns.length === 0) {
      const emptyState = new EmptyState({
        type: 'elements',
        title: 'Нет данных',
        message: 'Нет данных за выбранный период'
      });
      await emptyState.init();
      this.element.appendChild(emptyState.render());
      return this.element;
    }

    // Реверс порядка строк (от новых к старым)
    formatted.rows.reverse();

    // Получаем фон для заголовков из CSS переменных
    let headerBackgroundColor = '#ffffff'; // Fallback цвет для светлой темы
    try {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      headerBackgroundColor = computedStyle.getPropertyValue('--color-section-background')?.trim() || 
                             computedStyle.getPropertyValue('--color-surface')?.trim() || 
                             '#ffffff';
    } catch (e) {
      // Используем fallback цвет
    }

    // Создаем таблицу
    const table = document.createElement('table');
    table.className = 'stats-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Заголовок
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'stats-table-header-row';

    // Колонка с датой
    const dateHeader = document.createElement('th');
    dateHeader.className = 'stats-table-header';
    dateHeader.textContent = 'Дата';
    dateHeader.style.textAlign = 'left';
      dateHeader.style.padding = 'var(--space-sm) var(--space-md)';
      dateHeader.style.borderBottom = '1px solid var(--color-border)';
      // Устанавливаем фон для заголовка с датой
    dateHeader.style.setProperty('background-color', headerBackgroundColor, 'important');
    headerRow.appendChild(dateHeader);

    // Колонки с метриками
    formatted.columns.forEach((column, columnIndex) => {
      // Проверяем видимость колонки
      const isVisible = this.isColumnVisible(columnIndex);
      
      const th = document.createElement('th');
      th.className = 'stats-table-header';
      th.dataset.columnIndex = columnIndex;
      th.style.textAlign = 'center';
      th.style.padding = 'var(--space-sm) var(--space-md)';
      th.style.borderBottom = '1px solid var(--color-border)';
      // Устанавливаем темный фон для всех заголовков
      th.style.setProperty('background-color', headerBackgroundColor, 'important');
      
      // Скрываем колонку, если она не видима
      if (!isVisible) {
        th.style.display = 'none';
      }
      
      // Получаем цвет для этого столбца (из метаданных или палитры)
      let columnColor = this.meta?.colors?.[column];
      if (!columnColor) {
        columnColor = this.getColumnColor(columnIndex);
      } else {
        // Если цвет в hex формате, преобразуем в rgba для консистентности
        if (columnColor.startsWith('#')) {
          const hex = columnColor.slice(1);
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          columnColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
        }
      }
      
      // Создаем контейнер для иконки и текста
      const headerContent = document.createElement('div');
      
      // Иконка (если есть в метаданных)
      const iconName = this.meta?.icons?.[column];
      if (iconName) {
        // Создаем бейдж для иконки
        const iconBadge = document.createElement('div');
        iconBadge.className = 'stats-table-header-icon-badge';
        
        // Устанавливаем цветной фон бейджа из цвета столбца (унифицированный стиль с остальными иконками)
        let badgeColor = columnColor;
        // Конвертируем в hex если нужно, затем применяем полупрозрачный фон
        if (badgeColor.startsWith('hsl')) {
          // Конвертируем HSL в HEX
          badgeColor = hslToHex(badgeColor);
        } else if (badgeColor.startsWith('rgba')) {
          // Извлекаем rgb из rgba
          const rgbaMatch = badgeColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]);
            const g = parseInt(rgbaMatch[2]);
            const b = parseInt(rgbaMatch[3]);
            // Конвертируем rgb в hex
            const toHex = (c) => c.toString(16).padStart(2, '0');
            badgeColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          }
        } else if (badgeColor.startsWith('rgb')) {
          // Извлекаем rgb и конвертируем в hex
          const rgbMatch = badgeColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            const toHex = (c) => c.toString(16).padStart(2, '0');
            badgeColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          }
        }
        // Применяем полупрозрачный фон как у остальных иконок с учетом темы
        applyIconBackground(iconBadge, badgeColor);
        
        // Создаем контейнер для иконки внутри бейджа
        const iconWrapper = document.createElement('div');
        
        // Определяем цвет иконки в зависимости от темы
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const iconColor = currentTheme === 'light' ? '#1a1a1a' : '#ffffff';
        iconWrapper.style.color = iconColor;
        iconWrapper.style.display = 'flex';
        iconWrapper.style.alignItems = 'center';
        iconWrapper.style.justifyContent = 'center';
        iconWrapper.style.width = '100%';
        iconWrapper.style.height = '100%';
        
        // Загружаем иконку асинхронно (используем iconLoader)
        (async () => {
          try {
            const iconLoaderModule = await import('../../utils/iconLoader.js');
            const iconLoader = iconLoaderModule.default;
            const iconSvg = await iconLoader.loadIcon(iconName);
            iconWrapper.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
          } catch (error) {
            console.warn(`[StatsTable] Не удалось загрузить иконку ${iconName}:`, error);
          }
        })();
        
        iconBadge.appendChild(iconWrapper);
        headerContent.appendChild(iconBadge);
      }
      
      // Текст заголовка (обычный цвет, без применения columnColor)
      const headerText = document.createElement('span');
      headerText.textContent = column;
      headerContent.appendChild(headerText);
      
      th.appendChild(headerContent);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тело таблицы
    const tbody = document.createElement('tbody');
    tbody.className = 'stats-table-body';

    formatted.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'stats-table-row';

      // Ячейка с датой
      const dateCell = document.createElement('td');
      dateCell.className = 'stats-table-cell stats-table-cell-date';
      dateCell.textContent = row.label;
      dateCell.style.padding = 'var(--space-sm) var(--space-md)';
      dateCell.style.borderBottom = '1px solid var(--color-border)';
      dateCell.style.textAlign = 'left';
      // Явно устанавливаем непрозрачный фон для ячейки с датой (sticky)
      // Получаем реальное значение цвета из CSS переменной
      try {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        const bgColor = computedStyle.getPropertyValue('--color-section-background')?.trim() || 
                       computedStyle.getPropertyValue('--color-surface')?.trim() || 
                       '#ffffff';
        dateCell.style.setProperty('background-color', bgColor, 'important');
      } catch (e) {
        dateCell.style.setProperty('background-color', '#ffffff', 'important');
      }
      tr.appendChild(dateCell);

      // Ячейки со значениями
      formatted.columns.forEach((column, columnIndex) => {
        // Проверяем видимость колонки
        const isVisible = this.isColumnVisible(columnIndex);
        
        const td = document.createElement('td');
        td.className = 'stats-table-cell';
        td.dataset.columnIndex = columnIndex;
        
        // Скрываем ячейку, если колонка не видима
        if (!isVisible) {
          td.style.display = 'none';
        }
        
        const displayValue = row.values[column] || '-';
        td.style.textAlign = 'center';
        td.style.padding = 'var(--space-sm) var(--space-md)';
        td.style.borderBottom = '1px solid var(--color-border)';
        td.style.verticalAlign = 'middle';
        td.style.backgroundColor = 'var(--color-section-fill-dense, var(--color-section-background, var(--color-surface)))';
        td.textContent = displayValue;

        // Получаем исходное значение для цветового кодирования из row.originalValues
        const originalValue = row.originalValues?.[column];
        // Проверяем, что значение не null/undefined и является числом (или объектом для питания)
        const isValidValue = originalValue !== null && originalValue !== undefined && 
          (typeof originalValue === 'number' || (typeof originalValue === 'object' && originalValue !== null));
        if (isValidValue) {
          const backgroundColor = getCellColor(originalValue, this.mode);
          if (backgroundColor !== 'transparent') {
            // Смешиваем условный цвет с базовым непрозрачным фоном
            // Получаем реальный цвет фона из CSS переменной
            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);
            const baseColor = computedStyle.getPropertyValue('--color-section-background')?.trim() || 
                             computedStyle.getPropertyValue('--color-surface')?.trim() || 
                             '#ffffff';
            const mixedColor = this.blendColor(backgroundColor, baseColor);
            td.style.backgroundColor = mixedColor;
          }
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // Очищаем элемент перед добавлением новой таблицы
    this.element.innerHTML = '';
    this.element.appendChild(table);

    return this.element;
  }
}

export default StatsTable;

