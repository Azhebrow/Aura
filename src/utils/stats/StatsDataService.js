/**
 * Сервис для получения данных статистики из базы данных
 */

import { taskCategoriesConfigService } from '../../system/services/index.js';
import { NUTRITION_GROUPS, getGroupTitle } from '../../design-system/tokens/NutritionGroupPalette.js';

/**
 * Генерация массива дат в диапазоне
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Получить данные по задачам
 */
export function getTasksData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  if (groupBy === 'categories') {
    // Данные по категориям
    const categories = ['rituals', 'time', 'body', 'deps'];

    dates.forEach(date => {
      const values = {};
      categories.forEach(categoryType => {
        try {
          const progress = db.getCategoryProgress(categoryType, date);
          const categoryTitle = taskCategoriesConfigService.getTitle(categoryType);
          values[categoryTitle] = progress !== null && progress !== undefined ? progress : 0;
        } catch (e) {
          console.warn(`[StatsDataService] Ошибка получения прогресса категории ${categoryType} за ${date}:`, e);
          values[taskCategoriesConfigService.getTitle(categoryType)] = 0;
        }
      });

      data.push({
        date,
        values
      });
    });
  } else {
    // Данные по элементам (конкретным задачам)
    const allTasks = [];
    const categories = ['rituals', 'time', 'body', 'deps'];

    categories.forEach(categoryType => {
      const tasks = db.getTasksByCategory(categoryType);
      tasks.forEach(task => {
        allTasks.push({
          ...task,
          categoryType
        });
      });
    });

    dates.forEach(date => {
      const values = {};
      allTasks.forEach(task => {
        try {
          const progress = db.getTaskProgress(task.id, date);
          const taskTitle = task.title || task.id;
          values[taskTitle] = progress?.completion_percent || 0;
        } catch (e) {
          console.warn(`[StatsDataService] Ошибка получения прогресса задачи ${task.id} за ${date}:`, e);
          values[task.title || task.id] = 0;
        }
      });

      data.push({
        date,
        values
      });
    });
  }

  return data;
}

/**
 * Получить данные по финансам
 */
export function getFinanceData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем все транзакции за период
  const allTransactions = db.getAllTransactions();
  const filteredTransactions = allTransactions.filter(t => 
    t.date >= startDate && t.date <= endDate
  );

  if (groupBy === 'categories') {
    // Группировка по категориям: Доходы и Расходы (суммарно)
    dates.forEach(date => {
      const values = {};
      
      // Суммируем все доходы за день
      const totalIncome = filteredTransactions
        .filter(t => t.date === date && t.type === 'income')
        .reduce((acc, t) => acc + (t.amount || 0), 0);
      
      // Суммируем все расходы за день
      const totalExpense = filteredTransactions
        .filter(t => t.date === date && t.type === 'expense')
        .reduce((acc, t) => acc + (t.amount || 0), 0);
      
      values['Доходы'] = totalIncome;
      values['Расходы'] = -totalExpense; // Отрицательное значение для расходов

      data.push({
        date,
        values
      });
    });
  } else {
    // Группировка по элементам: конкретные категории доходов и расходов
    const incomeCategories = db.getAll('cfg_income_categories');
    const expenseCategories = db.getAll('cfg_expense_categories');

    dates.forEach(date => {
      const values = {};
      
      // Доходы по категориям
      incomeCategories.forEach(category => {
        const sum = filteredTransactions
          .filter(t => t.date === date && t.type === 'income' && t.category_id === category.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        
        values[`+ ${category.title || category.id}`] = sum;
      });

      // Расходы по категориям
      expenseCategories.forEach(category => {
        const sum = filteredTransactions
          .filter(t => t.date === date && t.type === 'expense' && t.category_id === category.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        
        values[`- ${category.title || category.id}`] = -sum; // Отрицательное значение для расходов
      });

      data.push({
        date,
        values
      });
    });
  }

  return data;
}

/**
 * Получить данные по времени (фокус)
 */
export function getTimeData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем задачи категории "time"
  const timeTasks = db.getTasksByCategory('time');

  if (groupBy === 'categories') {
    // Все задачи времени как одна категория "Фокус"
    dates.forEach(date => {
      const values = {};
      let totalHours = 0;

      timeTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            totalHours += totalSeconds / 3600;
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени задачи ${task.id} за ${date}:`, e);
          }
        }
      });

      values['Фокус'] = totalHours;

      data.push({
        date,
        values
      });
    });
  } else {
    // Данные по каждой задаче отдельно
    dates.forEach(date => {
      const values = {};

      timeTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            const hours = totalSeconds / 3600;
            values[task.title || task.id] = hours;
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени задачи ${task.id} за ${date}:`, e);
            values[task.title || task.id] = 0;
          }
        }
      });

      data.push({
        date,
        values
      });
    });
  }

  return data;
}

/**
 * Получить данные по досугу
 */
export function getLeisureData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем все задачи досуга
  const leisureTasks = db.getAll('cfg_leisure_tasks');

  if (groupBy === 'categories') {
    // Группировка по типам (filling/escape)
    dates.forEach(date => {
      const values = {
        'Наполнение': 0,
        'Эскапизм': 0
      };

      leisureTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            const hours = totalSeconds / 3600;
            
            if (task.leisure_type === 'filling') {
              values['Наполнение'] += hours;
            } else if (task.leisure_type === 'escape') {
              values['Эскапизм'] += hours;
            }
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени досуга ${task.id} за ${date}:`, e);
          }
        }
      });

      data.push({
        date,
        values
      });
    });
  } else {
    // Данные по каждой задаче отдельно
    // Сортируем задачи: сначала filling, потом escape
    const sortedTasks = [...leisureTasks].sort((a, b) => {
      // filling идет первым (возвращаем -1), escape идет вторым (возвращаем 1)
      if (a.leisure_type === 'filling' && b.leisure_type === 'escape') return -1;
      if (a.leisure_type === 'escape' && b.leisure_type === 'filling') return 1;
      // Если одинаковый тип, сохраняем исходный порядок
      return 0;
    });

    dates.forEach(date => {
      const values = {};

      sortedTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            const hours = totalSeconds / 3600;
            values[task.title || task.id] = hours;
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени досуга ${task.id} за ${date}:`, e);
            values[task.title || task.id] = 0;
          }
        }
      });

      data.push({
        date,
        values
      });
    });
  }

  return data;
}

/**
 * Получить объединенные данные по времени и досугу
 */
export function getTimeAndLeisureData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем задачи категории "time"
  const timeTasks = db.getTasksByCategory('time');
  // Получаем все задачи досуга
  const leisureTasks = db.getAll('cfg_leisure_tasks') || [];

  if (groupBy === 'categories') {
    // Группировка по категориям: Фокус, Наполнение, Эскапизм
    dates.forEach(date => {
      const values = {
        'Фокус': 0,
        'Наполнение': 0,
        'Эскапизм': 0
      };

      // Суммируем время задач категории "time"
      timeTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            values['Фокус'] += totalSeconds / 3600;
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени задачи ${task.id} за ${date}:`, e);
          }
        }
      });

      // Суммируем время задач досуга
      leisureTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            const hours = totalSeconds / 3600;
            
            if (task.leisure_type === 'filling') {
              values['Наполнение'] += hours;
            } else if (task.leisure_type === 'escape') {
              values['Эскапизм'] += hours;
            }
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени досуга ${task.id} за ${date}:`, e);
          }
        }
      });

      data.push({
        date,
        values
      });
    });
  } else {
    // Данные по каждой задаче отдельно
    // Сначала задачи времени, потом задачи досуга (сначала filling, потом escape)
    const sortedLeisureTasks = [...leisureTasks].sort((a, b) => {
      if (a.leisure_type === 'filling' && b.leisure_type === 'escape') return -1;
      if (a.leisure_type === 'escape' && b.leisure_type === 'filling') return 1;
      return 0;
    });

    dates.forEach(date => {
      const values = {};

      // Добавляем задачи времени
      timeTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            const hours = totalSeconds / 3600;
            values[task.title || task.id] = hours;
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени задачи ${task.id} за ${date}:`, e);
            values[task.title || task.id] = 0;
          }
        }
      });

      // Добавляем задачи досуга
      sortedLeisureTasks.forEach(task => {
        if (task.task_type === 'timer') {
          try {
            const totalSeconds = db.getTaskTimerTotal(date, task.id) || 0;
            const hours = totalSeconds / 3600;
            values[task.title || task.id] = hours;
          } catch (e) {
            console.warn(`[StatsDataService] Ошибка получения времени досуга ${task.id} за ${date}:`, e);
            values[task.title || task.id] = 0;
          }
        }
      });

      data.push({
        date,
        values
      });
    });
  }

  return data;
}

/**
 * Получить данные по ритуалам
 */
export function getRitualsData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  if (groupBy === 'categories') {
    // Данные по утро/вечер
    dates.forEach(date => {
      const values = {};

      try {
        // Утренние ритуалы
        const morningProgress = db.calculateRitualProgress('sunrise', date);
        values['Утро'] = morningProgress || 0;

        // Вечерние ритуалы
        const eveningProgress = db.calculateRitualProgress('sunset', date);
        values['Вечер'] = eveningProgress || 0;
      } catch (e) {
        console.warn(`[StatsDataService] Ошибка получения прогресса ритуалов за ${date}:`, e);
        values['Утро'] = 0;
        values['Вечер'] = 0;
      }

      data.push({
        date,
        values
      });
    });
  } else {
    // Данные по каждому ритуалу отдельно
    const morningRituals = db.getAll('cfg_rituals_morning').filter(r => r.active !== 0);
    const eveningRituals = db.getAll('cfg_rituals_evening').filter(r => r.active !== 0);

    dates.forEach(date => {
      const values = {};

      // Утренние ритуалы
      morningRituals.forEach(ritual => {
        try {
          // Используем прямой доступ к БД через db.db.prepare
          if (db.db && typeof db.db.prepare === 'function') {
            const stmt = db.db.prepare(`
              SELECT completed FROM act_rituals_morning 
              WHERE date = ? AND ritual_id = ?
            `);
            const result = stmt.get(date, ritual.id);
            values[ritual.title || ritual.id] = result?.completed === 1 ? 100 : 0;
          } else {
            // Fallback: используем getAll если доступен
            const allMorning = db.getAll('act_rituals_morning') || [];
            const ritualData = allMorning.find(r => r.date === date && r.ritual_id === ritual.id);
            values[ritual.title || ritual.id] = ritualData?.completed === 1 ? 100 : 0;
          }
        } catch (e) {
          console.warn(`[StatsDataService] Ошибка получения статуса ритуала ${ritual.id} за ${date}:`, e);
          values[ritual.title || ritual.id] = 0;
        }
      });

      // Вечерние ритуалы
      eveningRituals.forEach(ritual => {
        try {
          if (db.db && typeof db.db.prepare === 'function') {
            const stmt = db.db.prepare(`
              SELECT completed FROM act_rituals_evening 
              WHERE date = ? AND ritual_id = ?
            `);
            const result = stmt.get(date, ritual.id);
            values[ritual.title || ritual.id] = result?.completed === 1 ? 100 : 0;
          } else {
            const allEvening = db.getAll('act_rituals_evening') || [];
            const ritualData = allEvening.find(r => r.date === date && r.ritual_id === ritual.id);
            values[ritual.title || ritual.id] = ritualData?.completed === 1 ? 100 : 0;
          }
        } catch (e) {
          console.warn(`[StatsDataService] Ошибка получения статуса ритуала ${ritual.id} за ${date}:`, e);
          values[ritual.title || ritual.id] = 0;
        }
      });

      data.push({
        date,
        values
      });
    });
  }

  return data;
}

/**
 * Получить данные по очкам ранга (накопительный показатель)
 */
export function getRankPointsData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем все записи очков за период
  try {
    const allPoints = db.db.prepare(`
      SELECT * FROM act_daily_points 
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(startDate, endDate);

    // Создаем мапу для быстрого доступа
    const pointsMap = new Map();
    allPoints.forEach(point => {
      pointsMap.set(point.date, point);
    });

    // Для накопительного показателя используем cumulative_points
    dates.forEach(date => {
      const values = {};
      const pointRecord = pointsMap.get(date);
      
      if (pointRecord) {
        // Используем накопительные очки
        values['Очки ранга'] = pointRecord.cumulative_points || 0;
      } else {
        // Если записи нет, берем последнее известное значение или 0
        // Находим последнюю запись до этой даты
        const lastPoint = db.db.prepare(`
          SELECT cumulative_points FROM act_daily_points 
          WHERE date < ?
          ORDER BY date DESC
          LIMIT 1
        `).get(date);
        
        values['Очки ранга'] = lastPoint ? (lastPoint.cumulative_points || 0) : 0;
      }

      data.push({
        date,
        values
      });
    });
  } catch (e) {
    console.error('[StatsDataService] Ошибка получения данных очков ранга:', e);
    // Возвращаем пустые данные
    dates.forEach(date => {
      data.push({
        date,
        values: { 'Очки ранга': 0 }
      });
    });
  }

  return data;
}

/**
 * Получить данные по дневным очкам ранга (дневные очки, не накопительные)
 */
export function getRankDailyPointsData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем все записи очков за период
  try {
    const allPoints = db.db.prepare(`
      SELECT * FROM act_daily_points 
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(startDate, endDate);

    // Создаем мапу для быстрого доступа
    const pointsMap = new Map();
    allPoints.forEach(point => {
      pointsMap.set(point.date, point);
    });

    // Для дневных очков используем daily_points
    dates.forEach(date => {
      const values = {};
      const pointRecord = pointsMap.get(date);
      
      if (pointRecord) {
        // Используем дневные очки
        values['Очки ранга'] = pointRecord.daily_points || 0;
      } else {
        // Если записи нет, используем 0
        values['Очки ранга'] = 0;
      }

      data.push({
        date,
        values
      });
    });
  } catch (e) {
    console.error('[StatsDataService] Ошибка получения данных дневных очков ранга:', e);
    // Возвращаем пустые данные
    dates.forEach(date => {
      data.push({
        date,
        values: { 'Очки ранга': 0 }
      });
    });
  }

  return data;
}

/**
 * Получить данные по настроению (линейный график)
 */
export function getMoodData(db, startDate, endDate, groupBy) {
  const dates = generateDateRange(startDate, endDate);
  const data = [];

  // Получаем все записи дневника за период
  try {
    const allEntries = db.db.prepare(`
      SELECT * FROM act_diary_entries 
      WHERE date >= ? AND date <= ? AND mood_id IS NOT NULL
      ORDER BY date ASC
    `).all(startDate, endDate);

    // Получаем все настроения для маппинга
    const moods = db.getAll('cfg_diary_moods') || [];
    const moodMap = new Map();
    moods.forEach(mood => {
      moodMap.set(mood.id, mood);
    });

    // Создаем мапу записей по датам
    const entriesMap = new Map();
    allEntries.forEach(entry => {
      entriesMap.set(entry.date, entry);
    });

    // Для каждого дня находим настроение
    dates.forEach(date => {
      const values = {};
      const entry = entriesMap.get(date);
      
      if (entry && entry.mood_id) {
        const mood = moodMap.get(entry.mood_id);
        if (mood) {
          // Используем уровень настроения (1-5)
          values['Настроение'] = mood.level || 0;
        } else {
          values['Настроение'] = 0;
        }
      } else {
        // Если записи нет, значение отсутствует (null или 0)
        // Для линейного графика лучше использовать null, но для совместимости используем 0
        values['Настроение'] = null;
      }

      data.push({
        date,
        values
      });
    });
  } catch (e) {
    console.error('[StatsDataService] Ошибка получения данных настроения:', e);
    // Возвращаем пустые данные
    dates.forEach(date => {
      data.push({
        date,
        values: { 'Настроение': null }
      });
    });
  }

  return data;
}

/**
 * Получить данные по питанию
 */
export function getNutritionData(db, startDate, endDate, groupBy) {
  console.log('[StatsDataService] getNutritionData вызван:', { startDate, endDate, groupBy });
  const dates = generateDateRange(startDate, endDate);
  console.log('[StatsDataService] Сгенерировано дат:', dates.length);
  const data = [];

  // Получаем все записи питания за период
  const allEntries = [];
  dates.forEach(date => {
    try {
      const entries = db.getNutritionEntries(date);
      console.log(`[StatsDataService] Записей питания за ${date}:`, entries.length);
      entries.forEach(entry => {
        allEntries.push({ ...entry, date });
      });
    } catch (e) {
      console.error(`[StatsDataService] Ошибка получения записей питания за ${date}:`, e);
    }
  });
  
  console.log('[StatsDataService] Всего записей питания за период:', allEntries.length);

  if (groupBy === 'categories') {
    // Группировка по категориям: суммируем БЖУ и калории в общие столбцы
    dates.forEach(date => {
      const values = {
        'Белки': 0,
        'Жиры': 0,
        'Углеводы': 0,
        'Калории': 0
      };

      // Суммируем все записи за эту дату
      allEntries
        .filter(entry => entry.date === date)
        .forEach(entry => {
          values['Белки'] += entry.total_proteins || 0;
          values['Жиры'] += entry.total_fats || 0;
          values['Углеводы'] += entry.total_carbs || 0;
          values['Калории'] += entry.total_calories || 0;
        });

      data.push({
        date,
        values
      });
    });
  } else {
    // Группировка по элементам: суммируем БЖУ по каждому продукту/пресету
    dates.forEach(date => {
      const values = {};
      
      // Суммируем записи за эту дату по продуктам/пресетам
      allEntries
        .filter(entry => entry.date === date)
        .forEach(entry => {
          let title = null;
          
          // Получаем название продукта или пресета
          if (entry.product_id) {
            const product = db.getById('cfg_nutrition_products', entry.product_id);
            if (product) {
              title = product.title || entry.product_id;
            }
          } else if (entry.preset_id) {
            const preset = db.getById('cfg_nutrition_presets', entry.preset_id);
            if (preset) {
              title = preset.title || entry.preset_id;
            }
          }

          if (title) {
            if (!values[title]) {
              values[title] = {
                calories: 0,
                proteins: 0,
                fats: 0,
                carbs: 0
              };
            }
            values[title].calories += entry.total_calories || 0;
            values[title].proteins += entry.total_proteins || 0;
            values[title].fats += entry.total_fats || 0;
            values[title].carbs += entry.total_carbs || 0;
          }
        });

      data.push({
        date,
        values
      });
    });
  }

  console.log('[StatsDataService] getNutritionData вернул данных:', data.length);
  if (data.length > 0) {
    console.log('[StatsDataService] Пример данных:', data[0]);
  }
  
  return data;
}

/**
 * Главная функция получения данных
 */
export function getStatsData(db, mode, startDate, endDate, groupBy) {
  if (!db) {
    console.error('[StatsDataService] База данных недоступна');
    return [];
  }

  switch (mode) {
    case 'tasks':
      return getTasksData(db, startDate, endDate, groupBy);
    case 'finance':
      return getFinanceData(db, startDate, endDate, groupBy);
    case 'time':
      // Используем объединенную функцию для режима time
      return getTimeAndLeisureData(db, startDate, endDate, groupBy);
    case 'leisure':
      // Используем объединенную функцию для режима leisure (для обратной совместимости)
      return getTimeAndLeisureData(db, startDate, endDate, groupBy);
    case 'rituals':
      return getRitualsData(db, startDate, endDate, groupBy);
    case 'rank':
      return getRankPointsData(db, startDate, endDate, groupBy);
    case 'mood':
      return getMoodData(db, startDate, endDate, groupBy);
    case 'nutrition':
      return getNutritionData(db, startDate, endDate, groupBy);
    default:
      console.warn(`[StatsDataService] Неизвестный режим: ${mode}`);
      return [];
  }
}

