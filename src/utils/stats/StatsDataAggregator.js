/**
 * Агрегация данных статистики по периодам
 */

/**
 * Получить первый день недели (понедельник) для даты
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
  return new Date(d.setDate(diff));
}

/**
 * Получить первый день месяца для даты
 */
function getMonthStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Получить первый день года для даты
 */
function getYearStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), 0, 1);
}

/**
 * Форматировать дату в строку YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Парсить строку даты в Date объект
 */
function parseDate(dateString) {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Генерация массива дат в диапазоне
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(formatDate(new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Агрегация по дням (без группировки, просто возвращаем данные за каждый день)
 */
export function aggregateByDays(data, startDate, endDate) {
  const dates = generateDateRange(parseDate(startDate), parseDate(endDate));
  const result = [];

  dates.forEach(date => {
    const dayData = data.find(d => d.date === date);
    result.push({
      date,
      label: date,
      values: dayData ? dayData.values : {},
      dateRange: null // Для дней диапазон не нужен
    });
  });

  return result;
}

/**
 * Получить последний день недели (воскресенье) для даты
 */
function getWeekEnd(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Воскресенье
  return new Date(d.setDate(diff));
}

/**
 * Получить последний день месяца для даты
 */
function getMonthEnd(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * Получить последний день года для даты
 */
function getYearEnd(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), 11, 31);
}

/**
 * Агрегация по неделям (группировка понедельник-воскресенье)
 */
export function aggregateByWeeks(data, startDate, endDate) {
  const weekGroups = new Map();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Группируем данные по неделям
  data.forEach(dayData => {
    const date = parseDate(dayData.date);
    const weekStart = getWeekStart(date);
    const weekKey = formatDate(weekStart);

    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, {
        date: weekKey,
        label: weekKey,
        values: {},
        days: [],
        weekStart: weekStart
      });
    }

    const week = weekGroups.get(weekKey);
    week.days.push(dayData);
  });

  // Генерируем все недели в диапазоне, даже если данных нет
  const allWeeks = new Map();
  let currentWeekStart = getWeekStart(start);
  
  while (currentWeekStart <= end) {
    const weekKey = formatDate(currentWeekStart);
    if (!allWeeks.has(weekKey)) {
      allWeeks.set(weekKey, {
        date: weekKey,
        label: weekKey,
        values: {},
        days: [],
        weekStart: new Date(currentWeekStart)
      });
    }
    // Переходим к следующей неделе
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // Объединяем данные из weekGroups в allWeeks
  weekGroups.forEach((week, weekKey) => {
    if (allWeeks.has(weekKey)) {
      allWeeks.set(weekKey, week);
    }
  });

  // Агрегируем значения для каждой недели
  const result = [];
  for (const [weekKey, week] of allWeeks.entries()) {
    // Фильтруем: включаем только недели, которые пересекаются с исходным диапазоном
    const weekEnd = getWeekEnd(week.weekStart);
    // Неделя пересекается с диапазоном, если её начало <= end и её конец >= start
    if (week.weekStart > end || weekEnd < start) {
      continue; // Пропускаем недели вне диапазона
    }

    const aggregatedValues = {};

    // Для каждого ключа значения (категория/элемент)
    const allKeys = new Set();
    week.days.forEach(day => {
      Object.keys(day.values || {}).forEach(key => allKeys.add(key));
    });

    allKeys.forEach(key => {
      const values = week.days
        .map(day => day.values?.[key])
        .filter(v => v !== null && v !== undefined);

      if (values.length > 0) {
        // Проверяем, является ли значение объектом (для питания)
        const firstValue = values[0];
        // Для питания при группировке по категориям ключи "Белки", "Жиры", "Углеводы", "Калории" - это числа
        const isNutritionCategoryKey = ['Белки', 'Жиры', 'Углеводы', 'Калории'].includes(key);
        
        if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue) && !isNutritionCategoryKey) {
          // Для объектов (БЖУ) суммируем каждое поле
          aggregatedValues[key] = values.reduce((acc, v) => {
            if (typeof v === 'object' && v !== null) {
              return {
                calories: (acc.calories || 0) + (v.calories || 0),
                proteins: (acc.proteins || 0) + (v.proteins || 0),
                fats: (acc.fats || 0) + (v.fats || 0),
                carbs: (acc.carbs || 0) + (v.carbs || 0)
              };
            }
            return acc;
          }, { calories: 0, proteins: 0, fats: 0, carbs: 0 });
        } else {
          // Среднее для процентов (задачи, ритуалы) и настроения, сумма для остального
          // Определяем тип по первому значению - если все <= 100, считаем это процентами
          // Для настроения (ключ "Настроение") также используем среднее
          const isPercentage = values.every(v => typeof v === 'number' && v >= 0 && v <= 100);
          const isMood = key === 'Настроение';
          
          if (isPercentage || isMood) {
            aggregatedValues[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
          } else {
            aggregatedValues[key] = values.reduce((sum, v) => sum + v, 0);
          }
        }
      }
    });

    // Вычисляем диапазон недели (ограничиваем исходным диапазоном)
    const weekStartInRange = week.weekStart < start ? start : week.weekStart;
    const weekEndInRange = weekEnd > end ? end : weekEnd;
    const dateRange = {
      startDate: formatDate(weekStartInRange),
      endDate: formatDate(weekEndInRange)
    };

    result.push({
      date: weekKey,
      label: weekKey,
      values: aggregatedValues,
      dateRange: dateRange
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Агрегация по месяцам (группировка по календарным месяцам)
 */
export function aggregateByMonths(data, startDate, endDate) {
  const monthGroups = new Map();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Группируем данные по месяцам
  data.forEach(dayData => {
    const date = parseDate(dayData.date);
    const monthStart = getMonthStart(date);
    const monthKey = formatDate(monthStart);

    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, {
        date: monthKey,
        label: monthKey,
        values: {},
        days: [],
        monthStart: monthStart
      });
    }

    const month = monthGroups.get(monthKey);
    month.days.push(dayData);
  });

  // Генерируем все месяцы в диапазоне, даже если данных нет
  const allMonths = new Map();
  let currentMonthStart = getMonthStart(start);
  
  while (currentMonthStart <= end) {
    const monthKey = formatDate(currentMonthStart);
    if (!allMonths.has(monthKey)) {
      allMonths.set(monthKey, {
        date: monthKey,
        label: monthKey,
        values: {},
        days: [],
        monthStart: new Date(currentMonthStart)
      });
    }
    // Переходим к следующему месяцу
    currentMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1);
  }

  // Объединяем данные из monthGroups в allMonths
  monthGroups.forEach((month, monthKey) => {
    if (allMonths.has(monthKey)) {
      allMonths.set(monthKey, month);
    }
  });

  // Агрегируем значения для каждого месяца
  const result = [];
  for (const [monthKey, month] of allMonths.entries()) {
    // Фильтруем: включаем только месяцы, которые пересекаются с исходным диапазоном
    const monthEnd = getMonthEnd(month.monthStart);
    // Месяц пересекается с диапазоном, если его начало <= end и его конец >= start
    if (month.monthStart > end || monthEnd < start) {
      continue; // Пропускаем месяцы вне диапазона
    }

    const aggregatedValues = {};

    const allKeys = new Set();
    month.days.forEach(day => {
      Object.keys(day.values || {}).forEach(key => allKeys.add(key));
    });

    allKeys.forEach(key => {
      const values = month.days
        .map(day => day.values?.[key])
        .filter(v => v !== null && v !== undefined);

      if (values.length > 0) {
        // Проверяем, является ли значение объектом (для питания)
        const firstValue = values[0];
        // Для питания при группировке по категориям ключи "Белки", "Жиры", "Углеводы", "Калории" - это числа
        const isNutritionCategoryKey = ['Белки', 'Жиры', 'Углеводы', 'Калории'].includes(key);
        
        if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue) && !isNutritionCategoryKey) {
          // Для объектов (БЖУ) суммируем каждое поле
          aggregatedValues[key] = values.reduce((acc, v) => {
            if (typeof v === 'object' && v !== null) {
              return {
                calories: (acc.calories || 0) + (v.calories || 0),
                proteins: (acc.proteins || 0) + (v.proteins || 0),
                fats: (acc.fats || 0) + (v.fats || 0),
                carbs: (acc.carbs || 0) + (v.carbs || 0)
              };
            }
            return acc;
          }, { calories: 0, proteins: 0, fats: 0, carbs: 0 });
        } else {
          const isPercentage = values.every(v => typeof v === 'number' && v >= 0 && v <= 100);
          
          if (isPercentage) {
            aggregatedValues[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
          } else {
            aggregatedValues[key] = values.reduce((sum, v) => sum + v, 0);
          }
        }
      }
    });

    // Вычисляем диапазон месяца (ограничиваем исходным диапазоном)
    const monthStartInRange = month.monthStart < start ? start : month.monthStart;
    const monthEndInRange = monthEnd > end ? end : monthEnd;
    const dateRange = {
      startDate: formatDate(monthStartInRange),
      endDate: formatDate(monthEndInRange)
    };

    result.push({
      date: monthKey,
      label: monthKey,
      values: aggregatedValues,
      dateRange: dateRange
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Агрегация по годам (группировка по календарным годам)
 */
export function aggregateByYears(data, startDate, endDate) {
  const yearGroups = new Map();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Группируем данные по годам
  data.forEach(dayData => {
    const date = parseDate(dayData.date);
    const yearStart = getYearStart(date);
    const yearKey = formatDate(yearStart);

    if (!yearGroups.has(yearKey)) {
      yearGroups.set(yearKey, {
        date: yearKey,
        label: yearKey,
        values: {},
        days: [],
        yearStart: yearStart
      });
    }

    const year = yearGroups.get(yearKey);
    year.days.push(dayData);
  });

  // Генерируем все годы в диапазоне, даже если данных нет
  const allYears = new Map();
  let currentYearStart = getYearStart(start);
  
  while (currentYearStart <= end) {
    const yearKey = formatDate(currentYearStart);
    if (!allYears.has(yearKey)) {
      allYears.set(yearKey, {
        date: yearKey,
        label: yearKey,
        values: {},
        days: [],
        yearStart: new Date(currentYearStart)
      });
    }
    // Переходим к следующему году
    currentYearStart = new Date(currentYearStart.getFullYear() + 1, 0, 1);
  }

  // Объединяем данные из yearGroups в allYears
  yearGroups.forEach((year, yearKey) => {
    if (allYears.has(yearKey)) {
      allYears.set(yearKey, year);
    }
  });

  // Агрегируем значения для каждого года
  const result = [];
  for (const [yearKey, year] of allYears.entries()) {
    // Фильтруем: включаем только годы, которые пересекаются с исходным диапазоном
    const yearEnd = getYearEnd(year.yearStart);
    // Год пересекается с диапазоном, если его начало <= end и его конец >= start
    if (year.yearStart > end || yearEnd < start) {
      continue; // Пропускаем годы вне диапазона
    }

    const aggregatedValues = {};

    const allKeys = new Set();
    year.days.forEach(day => {
      Object.keys(day.values || {}).forEach(key => allKeys.add(key));
    });

    allKeys.forEach(key => {
      const values = year.days
        .map(day => day.values?.[key])
        .filter(v => v !== null && v !== undefined);

      if (values.length > 0) {
        // Проверяем, является ли значение объектом (для питания)
        const firstValue = values[0];
        // Для питания при группировке по категориям ключи "Белки", "Жиры", "Углеводы", "Калории" - это числа
        const isNutritionCategoryKey = ['Белки', 'Жиры', 'Углеводы', 'Калории'].includes(key);
        
        if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue) && !isNutritionCategoryKey) {
          // Для объектов (БЖУ) суммируем каждое поле
          aggregatedValues[key] = values.reduce((acc, v) => {
            if (typeof v === 'object' && v !== null) {
              return {
                calories: (acc.calories || 0) + (v.calories || 0),
                proteins: (acc.proteins || 0) + (v.proteins || 0),
                fats: (acc.fats || 0) + (v.fats || 0),
                carbs: (acc.carbs || 0) + (v.carbs || 0)
              };
            }
            return acc;
          }, { calories: 0, proteins: 0, fats: 0, carbs: 0 });
        } else {
          const isPercentage = values.every(v => typeof v === 'number' && v >= 0 && v <= 100);
          
          if (isPercentage) {
            aggregatedValues[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
          } else {
            aggregatedValues[key] = values.reduce((sum, v) => sum + v, 0);
          }
        }
      }
    });

    // Вычисляем диапазон года (ограничиваем исходным диапазоном)
    const yearStartInRange = year.yearStart < start ? start : year.yearStart;
    const yearEndInRange = yearEnd > end ? end : yearEnd;
    const dateRange = {
      startDate: formatDate(yearStartInRange),
      endDate: formatDate(yearEndInRange)
    };

    result.push({
      date: yearKey,
      label: yearKey,
      values: aggregatedValues,
      dateRange: dateRange
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Главная функция агрегации
 */
export function aggregateData(data, aggregation, startDate, endDate) {
  switch (aggregation) {
    case 'day':
      return aggregateByDays(data, startDate, endDate);
    case 'week':
      return aggregateByWeeks(data, startDate, endDate);
    case 'month':
      return aggregateByMonths(data, startDate, endDate);
    case 'year':
      return aggregateByYears(data, startDate, endDate);
    default:
      return aggregateByDays(data, startDate, endDate);
  }
}

