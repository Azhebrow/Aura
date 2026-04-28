/**
 * Форматирование данных статистики для отображения
 */

import { formatCurrency } from '../formatCurrency.js';
import { hslToHex } from '../colorConversion.js';

/**
 * Форматировать время в миллисекундах в строку "X ч Y м"
 */
export function formatTime(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '0 м';
  }

  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    if (minutes === 0) {
      return '0 м';
    }
    return `${minutes} м`;
  }

  if (minutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${minutes} м`;
}

/**
 * Форматировать время в часах в строку "X ч Y м"
 */
export function formatTimeFromHours(hours) {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '0 м';
  }

  const totalMinutes = Math.floor(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) {
    if (m === 0) {
      return '0 м';
    }
    return `${m} м`;
  }

  if (m === 0) {
    return `${h} ч`;
  }

  return `${h} ч ${m} м`;
}

/**
 * Форматировать процент
 */
export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${Math.round(value)}%`;
}

/**
 * Получить короткое название месяца на русском
 */
function getMonthNameShort(monthIndex) {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return months[monthIndex];
}

/**
 * Форматировать дату для метки в таблице
 * @param {string} dateString - дата в формате YYYY-MM-DD
 * @param {string} aggregation - тип агрегации: 'day', 'week', 'month', 'year'
 * @param {object} dateRange - объект с startDate и endDate для диапазонов (опционально)
 * @returns {string} - отформатированная дата
 */
export function formatDateLabel(dateString, aggregation = 'day', dateRange = null) {
  if (!dateString) return '';
  
  const date = new Date(dateString + 'T00:00:00');
  
  switch (aggregation) {
    case 'day': {
      // "25 апр"
      const day = date.getDate();
      const month = getMonthNameShort(date.getMonth());
      return `${day} ${month}`;
    }
    
    case 'week': {
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const start = new Date(dateRange.startDate + 'T00:00:00');
        const end = new Date(dateRange.endDate + 'T00:00:00');
        
        const startDay = start.getDate();
        const endDay = end.getDate();
        const startMonth = start.getMonth();
        const endMonth = end.getMonth();
        
        // Если неделя в пределах одного месяца: "25-31 апр"
        if (startMonth === endMonth) {
          return `${startDay}-${endDay} ${getMonthNameShort(startMonth)}`;
        } else {
          // Если неделя переходит через месяц: "25 апр - 1 мая"
          return `${startDay} ${getMonthNameShort(startMonth)} - ${endDay} ${getMonthNameShort(endMonth)}`;
        }
      } else {
        // Fallback: просто день и месяц начала недели
        const day = date.getDate();
        const month = getMonthNameShort(date.getMonth());
        return `${day} ${month}`;
      }
    }
    
    case 'month': {
      // "апр 2025"
      const month = getMonthNameShort(date.getMonth());
      const year = date.getFullYear();
      return `${month} ${year}`;
    }
    
    case 'year': {
      // "2025"
      return String(date.getFullYear());
    }
    
    default: {
      // По умолчанию формат дня
      const day = date.getDate();
      const month = getMonthNameShort(date.getMonth());
      return `${day} ${month}`;
    }
  }
}

/**
 * Форматировать значение для таблицы
 */
export function formatValueForTable(value, mode, key = null) {
  // Для режима питания значения могут быть объектами с БЖУ или числами
  if (mode === 'nutrition') {
    if (typeof value === 'object' && value !== null) {
      // Объект с БЖУ (для группировки по элементам)
      const calories = Math.round(value.calories || 0);
      const proteins = Math.round(value.proteins || 0);
      const fats = Math.round(value.fats || 0);
      const carbs = Math.round(value.carbs || 0);
      return `${calories} ккал / Б:${proteins}г Ж:${fats}г У:${carbs}г`;
    } else if (typeof value === 'number') {
      // Числовое значение (для группировки по категориям - отдельные столбцы БЖУ и калорий)
      const roundedValue = Math.round(value || 0);
      // Добавляем единицы измерения в зависимости от ключа
      if (key === 'Белки' || key === 'Жиры' || key === 'Углеводы') {
        return `${roundedValue} г`;
      } else if (key === 'Калории') {
        return `${roundedValue} ккал`;
      }
      return roundedValue.toString();
    } else {
      return `${Math.round(value || 0)} ккал`;
    }
  }
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  switch (mode) {
    case 'tasks':
    case 'rituals':
      return formatPercent(value);
    case 'finance':
      return formatCurrency(value, { showDecimals: true });
    case 'time':
    case 'leisure':
      // value в часах (decimal)
      return formatTimeFromHours(value);
    case 'rank':
      // value - накопительные очки (целое число)
      return Math.round(value).toLocaleString('ru-RU');
    case 'mood':
      // value - уровень настроения (1-5)
      return Math.round(value).toString();
    default:
      return String(value);
  }
}

/**
 * Порядок столбцов по категориям (логичная группировка, не по алфавиту)
 * Экспортируется для использования в StatsPage (фильтр) и StatsLegend
 */
export function getColumnOrder(mode, groupBy, allKeys) {
  const keysArray = Array.from(allKeys);

  if (mode === 'tasks' && groupBy === 'categories') {
    const order = ['Рутина', 'Фокус', 'Тонус', 'Детопс'];
    return order.filter(k => allKeys.has(k)).concat(keysArray.filter(k => !order.includes(k)));
  }
  if (mode === 'tasks' && groupBy === 'elements') {
    return keysArray; // Порядок из данных: rituals → time → body → deps
  }

  if (mode === 'finance' && groupBy === 'categories') {
    const order = ['Доходы', 'Расходы'];
    return order.filter(k => allKeys.has(k)).concat(keysArray.filter(k => !order.includes(k)));
  }
  if (mode === 'finance' && groupBy === 'elements') {
    const income = keysArray.filter(k => k.startsWith('+ ')).sort((a, b) => a.localeCompare(b));
    const expense = keysArray.filter(k => k.startsWith('- ')).sort((a, b) => a.localeCompare(b));
    const other = keysArray.filter(k => !k.startsWith('+ ') && !k.startsWith('- ')).sort();
    return income.concat(expense).concat(other);
  }

  if ((mode === 'time' || mode === 'leisure') && groupBy === 'categories') {
    const order = mode === 'leisure' ? ['Наполнение', 'Эскапизм'] : ['Фокус', 'Наполнение', 'Эскапизм'];
    return order.filter(k => allKeys.has(k)).concat(keysArray.filter(k => !order.includes(k)));
  }
  if ((mode === 'time' || mode === 'leisure') && groupBy === 'elements') {
    return keysArray; // Порядок из данных: time → filling → escape
  }

  if (mode === 'rituals' && groupBy === 'categories') {
    const order = ['Утро', 'Вечер'];
    return order.filter(k => allKeys.has(k)).concat(keysArray.filter(k => !order.includes(k)));
  }
  if (mode === 'rituals' && groupBy === 'elements') {
    return keysArray; // Порядок из данных: morning → evening
  }

  if (mode === 'nutrition' && groupBy === 'categories') {
    const order = ['Белки', 'Жиры', 'Углеводы', 'Калории'];
    return order.filter(k => allKeys.has(k)).concat(keysArray.filter(k => !order.includes(k)).sort());
  }
  if (mode === 'nutrition' && groupBy === 'elements') {
    return keysArray.sort();
  }

  return keysArray.sort();
}

/**
 * Форматировать данные для таблицы
 */
export function formatForTable(data, mode, groupBy, aggregation = 'day') {
  if (!data || data.length === 0) {
    return {
      labels: [],
      rows: [],
      columns: []
    };
  }

  // Собираем все ключи (категории/элементы), включая нулевые
  const allKeys = new Set();
  data.forEach(item => {
    Object.keys(item.values || {}).forEach(key => allKeys.add(key));
  });

  const columns = getColumnOrder(mode, groupBy, allKeys);

  // Форматируем строки с красивыми датами
  const rows = data.map(item => {
    // Используем formatDateLabel для красивого форматирования
    const formattedLabel = formatDateLabel(item.date, aggregation, item.dateRange);
    
    const row = {
      date: item.date,
      label: formattedLabel,
      values: {},
      originalValues: {} // Сохраняем исходные числовые значения для условного форматирования
    };

    columns.forEach(key => {
      const value = item.values?.[key];
      // Определяем дефолтное значение в зависимости от режима и типа группировки
      let defaultValue;
      if (mode === 'nutrition') {
        // Для питания при группировке по категориям значения - числа, при группировке по элементам - объекты
        if (groupBy === 'categories') {
          defaultValue = 0;
        } else {
          defaultValue = { calories: 0, proteins: 0, fats: 0, carbs: 0 };
        }
      } else {
        defaultValue = 0;
      }
      // Сохраняем исходное значение (может быть undefined для нулевых значений)
      row.originalValues[key] = value !== undefined ? value : defaultValue;
      // Форматируем значение (для undefined будет показано 0 или дефолтное значение)
      row.values[key] = formatValueForTable(value !== undefined ? value : defaultValue, mode, key);
    });

    return row;
  });

  return {
    labels: rows.map(row => row.label),
    rows,
    columns
  };
}

/** Если в meta нет цвета для ключа — фиксированные отличающиеся оттенки (pie только) */
const PIE_PALETTE_FALLBACK = [
  '#3B82F6',
  '#22C55E',
  '#EAB308',
  '#EF4444',
  '#A855F7',
  '#EC4899',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
  '#6366F1'
];

function expandShortHex(hex) {
  const s = (hex || '').trim();
  if (s.length === 4 && s.startsWith('#')) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return s;
}

/** Один непрозрачный #rrggbb из meta (hex / hsl / rgb) */
function solidHexFromMetaColor(colorValue) {
  if (!colorValue || typeof colorValue !== 'string') return null;
  const s = colorValue.trim();
  if (s.startsWith('#')) {
    if (s.length === 7 || s.length === 4) return expandShortHex(s);
    return null;
  }
  if (s.toLowerCase().startsWith('hsl')) {
    try {
      return hslToHex(s);
    } catch {
      return null;
    }
  }
  if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    const to = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
  }
  return null;
}

function pieBorderFromFill(hex) {
  const h = expandShortHex(hex);
  if (!h || h.length !== 7) return '#2a2a2a';
  const r = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(1, 3), 16) * 0.78)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(3, 5), 16) * 0.78)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(5, 7), 16) * 0.78)));
  const t = (x) => x.toString(16).padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}

/**
 * Цвета сегментов pie: совпадают с meta.colors[key] (легенда/таблица), иначе палитра.
 * Без rgba с альфой — круг выглядит предсказуемо.
 */
function buildPieDatasetColors(keys, meta) {
  const fills = keys.map((key, index) => {
    const raw = meta?.colors?.[key];
    const fromMeta = raw != null ? solidHexFromMetaColor(String(raw)) : null;
    if (fromMeta) return fromMeta;
    return PIE_PALETTE_FALLBACK[index % PIE_PALETTE_FALLBACK.length];
  });
  return {
    backgroundColor: fills,
    borderColor: fills.map(pieBorderFromFill)
  };
}

/**
 * Форматировать данные для графика Chart.js
 */
export function formatForChart(data, mode, chartType, groupBy, meta = null) {
  if (!data || data.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Для pie/doughnut chart - агрегируем данные по категориям (суммируем за весь период)
  if (chartType === 'pie' || chartType === 'doughnut') {
    // Специальная обработка для режима настроения - разбиваем по уровням
    if (mode === 'mood') {
      // Получаем настроения из meta или используем дефолтные уровни
      const moodLevels = [1, 2, 3, 4, 5];
      const moodCounts = {};
      moodLevels.forEach(level => {
        moodCounts[level] = 0;
      });

      // Подсчитываем количество записей для каждого уровня настроения
      data.forEach(item => {
        const moodValue = item.values?.['Настроение'];
        if (moodValue !== null && moodValue !== undefined && !isNaN(moodValue)) {
          const level = Math.round(moodValue);
          if (level >= 1 && level <= 5) {
            moodCounts[level] = (moodCounts[level] || 0) + 1;
          }
        }
      });

      // Создаем ключи для каждого уровня настроения
      // Используем названия из meta.moodNames, если есть, иначе "Уровень N"
      const getMoodLabel = (level) => {
        if (meta && meta.moodNames && meta.moodNames[level]) {
          return meta.moodNames[level];
        }
        return `Уровень ${level}`;
      };

      const keys = moodLevels.map(level => getMoodLabel(level));
      const aggregatedValues = moodLevels.map(level => moodCounts[level] || 0);

      // Фильтруем только уровни с данными (не нулевые)
      const filteredData = keys.map((key, index) => ({
        key,
        value: aggregatedValues[index],
        level: moodLevels[index]
      })).filter(item => item.value > 0);

      const finalKeys = filteredData.map(item => item.key);
      const finalValues = filteredData.map(item => item.value);
      const finalLevels = filteredData.map(item => item.level);

      const pieColors = buildPieDatasetColors(finalKeys, meta);

      // Для pie chart нужен один dataset с массивом значений
      return {
        labels: finalKeys,
        datasets: [{
          label: 'Настроение',
          data: finalValues,
          backgroundColor: pieColors.backgroundColor,
          borderColor: pieColors.borderColor,
          borderWidth: 1
        }],
        // Сохраняем keys и levels для легенды
        datasetKeys: finalKeys,
        moodLevels: finalLevels
      };
    }

    // Обычная обработка для других режимов
    // Собираем все ключи (категории/элементы)
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item.values || {}).forEach(key => allKeys.add(key));
    });

    const keys = getColumnOrder(mode, groupBy, allKeys);
    
    // Суммируем значения по каждой категории/элементу за весь период
    const aggregatedValues = keys.map(key => {
      let sum = 0;
      data.forEach(item => {
        const value = item.values?.[key];
        if (value !== null && value !== undefined) {
          // Для режима питания значения могут быть объектами с БЖУ или числами
          if (mode === 'nutrition') {
            if (typeof value === 'object' && value !== null && !isNaN(value.calories)) {
              // Объект с БЖУ (для группировки по элементам) - используем калории
              sum += value.calories || 0;
            } else if (typeof value === 'number') {
              // Числовое значение (для группировки по категориям) - используем как есть
              sum += value;
            }
          } else if (!isNaN(value)) {
            sum += value;
          }
        }
      });
      return sum;
    });

    const pieColors = buildPieDatasetColors(keys, meta);

    // Для pie chart нужен один dataset с массивом значений
    return {
      labels: keys,
      datasets: [{
        label: mode === 'tasks' || mode === 'rituals' ? 'Выполнение (%)' : 'Значения',
        data: aggregatedValues,
        backgroundColor: pieColors.backgroundColor,
        borderColor: pieColors.borderColor,
        borderWidth: 1
      }],
      // Сохраняем keys для легенды
      datasetKeys: keys
    };
  }

  // Для line/bar chart - форматируем данные по датам
  const labels = data.map(item => {
    // Для графиков используем простой формат даты
    const date = new Date(item.date + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  });

  // Собираем все ключи (категории/элементы)
  const allKeys = new Set();
  data.forEach(item => {
    Object.keys(item.values || {}).forEach(key => allKeys.add(key));
  });

  const keys = getColumnOrder(mode, groupBy, allKeys);

  // Создаем datasets для каждой категории/элемента
  const datasets = keys.map((key, index) => {
    // Сохраняем нулевые значения как 0, а не null
    const values = data.map(item => {
      const value = item.values?.[key];
      // Если значение undefined или null, возвращаем 0 для отображения (все категории должны быть видны)
      if (value === undefined || value === null) {
        return 0;
      }
      // Для режима питания значения могут быть объектами с БЖУ или числами
      if (mode === 'nutrition') {
        if (typeof value === 'object' && value !== null && !isNaN(value.calories)) {
          // Объект с БЖУ (для группировки по элементам) - используем калории для графиков
          return value.calories || 0;
        } else if (typeof value === 'number') {
          // Числовое значение (для группировки по категориям) - используем как есть
          return value;
        }
      }
      return value;
    });

    // Определяем текущую тему для адаптации цветов
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isLightTheme = currentTheme === 'light';
    
    // Для bar chart используем полностью непрозрачные цвета для четкости
    // Для line chart используем адаптивную прозрачность в зависимости от темы
    const backgroundColorAlpha = chartType === 'bar' ? 1.0 : (isLightTheme ? 0.25 : 0.35);
    const borderColor = getColorForIndex(index, key, 1, meta);
    const backgroundColor = getColorForIndex(index, key, backgroundColorAlpha, meta);

    const datasetConfig = {
      label: key,
      data: values,
      borderColor: borderColor,
      backgroundColor: backgroundColor,
      borderWidth: chartType === 'bar' ? 0 : 2.5, // Без обводки для bar chart, средняя толщина для line chart
      tension: chartType === 'line' ? 0.35 : undefined, // Плавные кривые для line chart
      borderRadius: undefined, // Без округления для четких границ
      borderSkipped: chartType === 'bar' ? false : undefined,
      pointRadius: chartType === 'line' ? 3.5 : 0, // Точки для line chart
      pointHoverRadius: chartType === 'line' ? 6 : 0,
      pointBorderWidth: chartType === 'line' ? 2 : 0,
      pointBackgroundColor: chartType === 'line' ? borderColor : undefined, // Цветные точки
      pointBorderColor: chartType === 'line' ? (isLightTheme ? '#ffffff' : backgroundColor) : undefined
    };

    // Добавляем заливку под линией для линейных диаграмм
    if (chartType === 'line') {
      // Заливка под линией с адаптивной прозрачностью
      datasetConfig.fill = true;
    }

    return datasetConfig;
  });

  return {
    labels,
    datasets,
    // Сохраняем keys для легенды
    datasetKeys: keys
  };
}

/**
 * Получить цвет для индекса (из палитры или meta)
 */
function getColorForIndex(index, key, alpha = 1, meta = null) {
  // Если есть meta и цвет для этого ключа, используем его
  if (meta && meta.colors && meta.colors[key]) {
    const colorValue = meta.colors[key];
    
    // Проверяем формат цвета (HSL или HEX)
    if (colorValue.toLowerCase().startsWith('hsl')) {
      // Конвертируем HSL в HEX, затем в RGB
      try {
        const hex = hslToHex(colorValue);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch (e) {
        console.warn(`[StatsDataFormatter] Ошибка конвертации HSL цвета ${colorValue}:`, e);
      }
    } else if (colorValue.startsWith('#')) {
      // HEX формат
      const r = parseInt(colorValue.slice(1, 3), 16);
      const g = parseInt(colorValue.slice(3, 5), 16);
      const b = parseInt(colorValue.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      // Пытаемся использовать как есть (может быть уже rgba)
      return colorValue;
    }
  }

  // Fallback: используем старую палитру (на случай если meta.colors не заполнен)
  // В идеале все цвета должны приходить из meta.colors

  // Старая fallback палитра (на случай если CfgColorPalette недоступен)
  const colors = [
    'rgba(59, 130, 246, {alpha})',  // blue
    'rgba(34, 197, 94, {alpha})',   // green
    'rgba(251, 191, 36, {alpha})',  // yellow
    'rgba(239, 68, 68, {alpha})',   // red
    'rgba(168, 85, 247, {alpha})',  // purple
    'rgba(236, 72, 153, {alpha})',  // pink
    'rgba(14, 165, 233, {alpha})',  // sky
    'rgba(20, 184, 166, {alpha})'   // teal
  ];

  const color = colors[index % colors.length];
  return color.replace('{alpha}', alpha);
}


/**
 * Получить цвет ячейки таблицы в зависимости от значения и режима
 * Использует акцентный цвет темы с градиентом от прозрачного до непрозрачного
 */
export function getCellColor(value, mode) {
  // Для режима питания значения могут быть объектами или числами
  if (mode === 'nutrition' && typeof value === 'object' && value !== null) {
    // Для объектов используем калории для определения цвета
    const calories = value.calories || 0;
    if (calories === 0 || isNaN(calories)) {
      return 'transparent';
    }
    value = calories; // Используем калории для дальнейшей обработки
  }
  
  if (value === null || value === undefined || isNaN(value)) {
    return 'transparent';
  }

  // Получаем акцентный цвет из CSS переменной
  let r = 59, g = 130, b = 246; // Fallback синий цвет
  try {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    let accentColorStr = computedStyle.getPropertyValue('--color-accent').trim();
    
    if (accentColorStr) {
      // Если цвет в формате hex (#RRGGBB или #RGB)
      if (accentColorStr.startsWith('#')) {
        const hex = accentColorStr.slice(1);
        if (hex.length === 6) {
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
        } else if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        }
      } else if (accentColorStr.startsWith('rgb')) {
        // Если цвет в формате rgb/rgba, извлекаем компоненты
        const match = accentColorStr.match(/\d+/g);
        if (match && match.length >= 3) {
          r = parseInt(match[0], 10);
          g = parseInt(match[1], 10);
          b = parseInt(match[2], 10);
        }
      }
    }
  } catch (e) {
    console.warn('[StatsDataFormatter] Не удалось получить акцентный цвет:', e);
  }

  // Функция для создания rgba из RGB компонентов
  const toRgba = (red, green, blue, opacity) => {
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  };

  if (mode === 'tasks' || mode === 'rituals') {
    // Градиент по проценту: от прозрачного (0%) до непрозрачного (100%)
    // 0% = прозрачный, 100% = максимальная opacity акцентного цвета
    const opacity = Math.min(Math.max(value / 100, 0), 1) * 0.3; // Максимум 30% opacity для читаемости
    return toRgba(r, g, b, opacity);
  }

  if (mode === 'finance') {
    // Для финансов: положительные значения - акцентный цвет, отрицательные - прозрачные
    if (value > 0) {
      // Используем нормализованное значение для opacity (например, если значение большое)
      // Но для простоты используем фиксированную opacity для положительных значений
      return toRgba(r, g, b, 0.2);
    }
    return 'transparent';
  }

  if (mode === 'time' || mode === 'leisure') {
    // Градиент по времени (больше = насыщеннее)
    // Предполагаем максимум 8 часов = максимальная opacity
    const maxHours = 8;
    const opacity = Math.min(Math.max(value / maxHours, 0), 1) * 0.3;
    return toRgba(r, g, b, opacity);
  }

  if (mode === 'nutrition') {
    // Для питания: градиент по значению
    // Для белков/жиров/углеводов максимум ~200г, для калорий ~3000 ккал
    // Используем нормализацию в зависимости от типа значения
    const maxValue = 200; // Предполагаем максимум для БЖУ
    const opacity = Math.min(Math.max(value / maxValue, 0), 1) * 0.3;
    return toRgba(r, g, b, opacity);
  }

  return 'transparent';
}

