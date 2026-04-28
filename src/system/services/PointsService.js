/**
 * Сервис для расчета и управления очками по дням
 */
class PointsService {
  constructor(db) {
    // db может быть объектом класса DB или экземпляром better-sqlite3
    // Если это объект класса DB, используем db.db, иначе db
    this.db = db.db || db;
  }

  /**
   * Вычисляет очки за день на основе процентов категорий
   * @param {string} date - Дата в формате YYYY-MM-DD
   * @returns {Object} { completionPercent, dailyPoints }
   */
  calculateDailyPoints(date) {
    try {
      // Получаем проценты категорий из act_task_completions
      const completion = this.db.prepare(`
        SELECT rituals_percent, time_percent, body_percent, deps_percent
        FROM act_task_completions
        WHERE date = ?
      `).get(date);

      if (!completion) {
        return { completionPercent: 0, dailyPoints: -100 };
      }

      const nutritionTotals = typeof this.db.getDailyNutrition === 'function'
        ? this.db.getDailyNutrition(date)
        : { calories: 0 };
      const settings = typeof this.db.getAppSettings === 'function'
        ? this.db.getAppSettings()
        : null;
      const nutritionTarget = Number(settings?.nutrition_target_calories || 0);
      const nutritionPercent = nutritionTarget > 0
        ? Math.min(100, ((nutritionTotals?.calories || 0) / nutritionTarget) * 100)
        : ((nutritionTotals?.calories || 0) > 0 ? 100 : 0);

      // Средний процент: (rituals + time + body + deps + nutrition) / 5
      const avgPercent = (
        (completion.rituals_percent || 0) +
        (completion.time_percent || 0) +
        (completion.body_percent || 0) +
        (completion.deps_percent || 0) +
        nutritionPercent
      ) / 5;

      // Преобразование: очки = (процент * 2) - 100
      const dailyPoints = (avgPercent * 2) - 100;

      return {
        completionPercent: Math.round(avgPercent * 100) / 100,
        dailyPoints: Math.round(dailyPoints * 100) / 100
      };
    } catch (e) {
      console.error(`[PointsService] Ошибка вычисления очков за день ${date}:`, e);
      return { completionPercent: 0, dailyPoints: -100 };
    }
  }

  /**
   * Вычисляет накопительные очки с учетом минимума 0
   * @param {string} date - Дата
   * @returns {number} Накопительные очки
   */
  calculateCumulativePoints(date) {
    try {
      const startDate = this.getPointsStartDate();
      
      if (!startDate || !date) {
        return 0;
      }
      
      // Получаем все записи от начала до текущей даты, отсортированные по дате
      const points = this.db.prepare(`
        SELECT daily_points
        FROM act_daily_points
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `).all(startDate, date);

      let cumulative = 0;
      
      for (const point of points) {
        const dailyPoints = point.daily_points || 0;
        cumulative = Math.max(0, cumulative + dailyPoints);
      }

      return Math.round(cumulative * 100) / 100;
    } catch (e) {
      console.error(`[PointsService] Ошибка вычисления накопительных очков для ${date}:`, e);
      console.error(`[PointsService] Детали ошибки:`, e.message);
      return 0;
    }
  }

  /**
   * Сохраняет или обновляет очки за день
   * @param {string} date - Дата
   * @param {boolean} force - Принудительный пересчет даже для зафиксированных дней
   */
  saveDailyPoints(date, force = false) {
    try {
      if (!date) {
        console.warn('[PointsService] saveDailyPoints: дата не указана');
        return;
      }
      
      console.log(`[PointsService] saveDailyPoints вызван для даты ${date}, force=${force}`);
      
      // Проверяем существование таблицы
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='act_daily_points'
      `).get();
      
      if (!tableExists) {
        console.warn('[PointsService] Таблица act_daily_points не существует, пропускаем сохранение');
        return;
      }
      
      // Проверяем, является ли день будущим - для будущих дней не создаем очки
      if (this.isFutureDay(date)) {
        console.log(`[PointsService] День ${date} является будущим, пропускаем сохранение`);
        return; // Не создаем очки для будущих дней
      }
      
      // Проверяем, открыт ли день для редактирования
      const isOpen = this.isDayOpen(date);
      console.log(`[PointsService] День ${date} открыт: ${isOpen}`);
      
      // Очки создаются и обновляются ТОЛЬКО для открытых дней
      if (!isOpen && !force) {
        console.log(`[PointsService] День ${date} не открыт и не force, пропускаем сохранение`);
        // Если день не открыт и не принудительный пересчет, не создаем/не обновляем очки
        return;
      }
      
      const existing = this.db.prepare(`
        SELECT is_fixed FROM act_daily_points WHERE date = ?
      `).get(date);

      // Не пересчитываем зафиксированные дни (если не force)
      if (existing && existing.is_fixed === 1 && !force) {
        console.log(`[PointsService] День ${date} зафиксирован и не force, пропускаем пересчет`);
        return;
      }

      // Вычисляем очки только для открытых дней
      const { completionPercent, dailyPoints } = this.calculateDailyPoints(date);
      console.log(`[PointsService] Рассчитаны очки для ${date}: completionPercent=${completionPercent}, dailyPoints=${dailyPoints}`);
      
      // Вычисляем накопительные очки
      const cumulativePoints = this.calculateCumulativePoints(date);
      console.log(`[PointsService] Накопительные очки для ${date}: ${cumulativePoints}`);

      // Для открытых дней is_fixed = 0, для остальных = 1
      const isFixed = isOpen ? 0 : 1;

      // Сохраняем или обновляем
      const id = `points_${date.replace(/-/g, '')}`;
      
      // Если запись существует и зафиксирована, сохраняем старое значение is_fixed
      const finalIsFixed = (existing && existing.is_fixed === 1 && !force) 
        ? 1 
        : isFixed;
      
      // Используем INSERT OR REPLACE для упрощения
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO act_daily_points 
          (id, date, completion_percent, daily_points, cumulative_points, is_fixed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(id, date, completionPercent, dailyPoints, cumulativePoints, finalIsFixed);
      console.log(`[PointsService] Очки сохранены для ${date}: id=${id}, dailyPoints=${dailyPoints}, cumulativePoints=${cumulativePoints}, is_fixed=${finalIsFixed}`);
    } catch (e) {
      console.error(`[PointsService] Ошибка сохранения очков за день ${date}:`, e);
      console.error(`[PointsService] Детали ошибки:`, e.message);
      console.error(`[PointsService] Stack:`, e.stack);
    }
  }

  /**
   * Проверяет, открыт ли день для редактирования
   * @param {string} date - Дата
   * @returns {boolean}
   */
  isDayOpen(date) {
    try {
      // Парсим строку даты (формат: "YYYY-MM-DD")
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        console.error(`[PointsService] Неверный формат даты: ${date}`);
        return false;
      }
      
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Месяц в JS: 0-11
      const day = parseInt(dateParts[2], 10);
      
      // Создаем целевую дату на начало дня в локальном времени
      const targetDateStart = new Date(year, month, day, 0, 0, 0, 0);
      
      // Получаем текущую дату и нормализуем на начало дня
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      
      // Сравниваем даты по компонентам для надежности
      const targetYear = targetDateStart.getFullYear();
      const targetMonth = targetDateStart.getMonth();
      const targetDay = targetDateStart.getDate();
      
      const todayYear = todayStart.getFullYear();
      const todayMonth = todayStart.getMonth();
      const todayDay = todayStart.getDate();
      
      // ОТЛАДКА: Выводим информацию для всех дней
      console.log(`[PointsService.isDayOpen] Проверка дня ${date}:`, {
        targetDate: `${targetYear}-${targetMonth + 1}-${targetDay}`,
        todayDate: `${todayYear}-${todayMonth + 1}-${todayDay}`,
        targetTimestamp: targetDateStart.getTime(),
        todayTimestamp: todayStart.getTime(),
        isToday: targetYear === todayYear && targetMonth === todayMonth && targetDay === todayDay,
        isFuture: targetYear > todayYear || 
                  (targetYear === todayYear && targetMonth > todayMonth) ||
                  (targetYear === todayYear && targetMonth === todayMonth && targetDay > todayDay)
      });
      
      // Если целевая дата в будущем, день закрыт
      if (targetYear > todayYear || 
          (targetYear === todayYear && targetMonth > todayMonth) ||
          (targetYear === todayYear && targetMonth === todayMonth && targetDay > todayDay)) {
        console.log(`[PointsService.isDayOpen] ${date} - БУДУЩИЙ день, возвращаем false`);
        return false;
      }
      
      // Если целевая дата - сегодня, день всегда открыт
      if (targetYear === todayYear && targetMonth === todayMonth && targetDay === todayDay) {
        console.log(`[PointsService.isDayOpen] ${date} - СЕГОДНЯ, возвращаем true`);
        return true;
      }
      
      // Для прошлых дней вычисляем разницу в часах от начала целевого дня до текущего момента
      const diffHours = (now.getTime() - targetDateStart.getTime()) / (1000 * 60 * 60);
      
      const openHours = this.getOpenHours();
      
      // День открыт если прошло не более openHours часов с начала целевого дня
      const isOpen = diffHours >= 0 && diffHours <= openHours;
      
      console.log(`[PointsService.isDayOpen] ${date} - ПРОШЛЫЙ день, diffHours=${diffHours.toFixed(2)}, openHours=${openHours}, возвращаем ${isOpen}`);
      
      return isOpen;
    } catch (e) {
      console.error(`[PointsService] Ошибка проверки открытости дня ${date}:`, e);
      // В случае ошибки возвращаем false для безопасности
      return false;
    }
  }

  /**
   * Проверяет, является ли день будущим
   * @param {string} date - Дата
   * @returns {boolean}
   */
  isFutureDay(date) {
    try {
      // Парсим строку даты (формат: "YYYY-MM-DD")
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        console.error(`[PointsService] Неверный формат даты: ${date}`);
        return false;
      }
      
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Месяц в JS: 0-11
      const day = parseInt(dateParts[2], 10);
      
      // Нормализуем текущую дату на начало дня (локальное время)
      const today = new Date();
      const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      
      // Создаем целевую дату на начало дня в локальном времени
      const targetDateNormalized = new Date(year, month, day, 0, 0, 0, 0);
      
      return targetDateNormalized > todayNormalized;
    } catch (e) {
      console.error(`[PointsService] Ошибка проверки будущего дня ${date}:`, e);
      return false;
    }
  }

  /**
   * Получает дату начала отчета
   */
  getPointsStartDate() {
    try {
      // Проверяем существование таблицы
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='app_settings'
      `).get();
      
      if (!tableExists) {
        // Если таблицы нет, используем сегодняшнюю дату
        return new Date().toISOString().split('T')[0];
      }
      
      const settings = this.db.prepare(`
        SELECT points_start_date, created_at FROM app_settings LIMIT 1
      `).get();
      
      if (settings && settings.points_start_date) {
        return settings.points_start_date;
      }
      
      // Если дата начала не установлена, используем дату первого запуска
      if (settings && settings.created_at) {
        const firstDate = new Date(settings.created_at).toISOString().split('T')[0];
        // Сохраняем её как дату начала
        try {
          this.db.prepare(`
            UPDATE app_settings SET points_start_date = ? WHERE id = (SELECT id FROM app_settings LIMIT 1)
          `).run(firstDate);
        } catch (updateError) {
          console.warn('[PointsService] Не удалось обновить points_start_date:', updateError.message);
        }
        return firstDate;
      }
      
      // Если ничего не найдено, используем сегодняшнюю дату
      return new Date().toISOString().split('T')[0];
    } catch (e) {
      console.error('[PointsService] Ошибка получения даты начала отчета:', e);
      console.error('[PointsService] Детали ошибки:', e.message);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Получает количество открытых часов
   */
  getOpenHours() {
    try {
      // Проверяем существование таблицы
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='app_settings'
      `).get();
      
      if (!tableExists) {
        return 48; // Значение по умолчанию
      }
      
      // Проверяем, существует ли колонка points_open_hours
      const tableInfo = this.db.prepare(`PRAGMA table_info(app_settings)`).all();
      const hasPointsOpenHours = tableInfo.some(col => col.name === 'points_open_hours');
      
      if (!hasPointsOpenHours) {
        return 48; // Значение по умолчанию, если колонка еще не создана
      }
      
      const settings = this.db.prepare(`
        SELECT points_open_hours FROM app_settings LIMIT 1
      `).get();
      
      return settings && settings.points_open_hours !== null && settings.points_open_hours !== undefined
        ? settings.points_open_hours
        : 48;
    } catch (e) {
      // Тихая обработка ошибки - просто возвращаем значение по умолчанию
      // Ошибка может возникать если миграция еще не выполнена
      return 48;
    }
  }

  /**
   * Получает общее количество очков (для страницы рангов)
   * Учитывает дату начала отчета - берет последнюю запись начиная с даты начала
   */
  getTotalPoints() {
    try {
      const startDate = this.getPointsStartDate();
      
      if (!startDate) {
        return 0;
      }

      // Берем последнюю запись начиная с даты начала отчета
      const result = this.db.prepare(`
        SELECT cumulative_points 
        FROM act_daily_points 
        WHERE date >= ?
        ORDER BY date DESC 
        LIMIT 1
      `).get(startDate);
      
      return result && result.cumulative_points !== null && result.cumulative_points !== undefined
        ? Math.round(result.cumulative_points * 100) / 100
        : 0;
    } catch (e) {
      console.error('[PointsService] Ошибка получения общего количества очков:', e);
      return 0;
    }
  }

  /**
   * Получает все записи очков для таблицы
   * Учитывает дату начала отчета - показывает только записи начиная с даты начала
   */
  getAllPoints() {
    try {
      const startDate = this.getPointsStartDate();
      
      let points;
      if (startDate) {
        // Фильтруем записи по дате начала отчета
        points = this.db.prepare(`
          SELECT 
            date,
            completion_percent,
            daily_points,
            cumulative_points,
            is_fixed
          FROM act_daily_points
          WHERE date >= ?
          ORDER BY date DESC
        `).all(startDate);
      } else {
        // Если дата начала не установлена, показываем все записи
        points = this.db.prepare(`
          SELECT 
            date,
            completion_percent,
            daily_points,
            cumulative_points,
            is_fixed
          FROM act_daily_points
          ORDER BY date DESC
        `).all();
      }
      
      console.log('[PointsService] getAllPoints: получено записей:', points.length, startDate ? `(начиная с ${startDate})` : '');
      return points;
    } catch (e) {
      console.error('[PointsService] Ошибка получения всех записей очков:', e);
      console.error('[PointsService] Детали ошибки:', e.message);
      console.error('[PointsService] Stack:', e.stack);
      return [];
    }
  }

  /**
   * Пересчитывает накопительные очки с указанной даты (для каскадного обновления)
   * @param {string} fromDate - Дата, с которой начинать пересчет
   */
  recalculateCumulativeFromDate(fromDate) {
    try {
      if (!fromDate) {
        return;
      }
      
      // Получаем все дни от указанной даты до сегодня, отсортированные по дате
      const days = this.db.prepare(`
        SELECT date, daily_points
        FROM act_daily_points
        WHERE date >= ?
        ORDER BY date ASC
      `).all(fromDate);

      if (days.length === 0) {
        return;
      }

      // Получаем накопительные очки до указанной даты
      const beforeDate = this.db.prepare(`
        SELECT cumulative_points
        FROM act_daily_points
        WHERE date < ?
        ORDER BY date DESC
        LIMIT 1
      `).get(fromDate);

      let cumulative = beforeDate && beforeDate.cumulative_points !== null && beforeDate.cumulative_points !== undefined
        ? beforeDate.cumulative_points
        : 0;

      // Пересчитываем накопительные очки для всех дней начиная с fromDate
      for (const day of days) {
        const dailyPoints = day.daily_points || 0;
        cumulative = Math.max(0, cumulative + dailyPoints);
        
        // Обновляем запись
        this.db.prepare(`
          UPDATE act_daily_points
          SET cumulative_points = ?, updated_at = CURRENT_TIMESTAMP
          WHERE date = ?
        `).run(Math.round(cumulative * 100) / 100, day.date);
      }
    } catch (e) {
      console.error(`[PointsService] Ошибка пересчета накопительных очков с ${fromDate}:`, e);
      console.error(`[PointsService] Детали ошибки:`, e.message);
    }
  }

  /**
   * Полный пересчет всех накопительных очков с учетом текущей даты начала отчета
   * Вызывается при изменении даты начала отчета
   */
  async recalculateAllCumulativePoints() {
    try {
      const startDate = this.getPointsStartDate();
      
      if (!startDate) {
        console.warn('[PointsService] Дата начала отчета не установлена, пропускаем пересчет');
        return;
      }

      console.log(`[PointsService] Начинаем полный пересчет накопительных очков с даты ${startDate}`);

      // Обнуляем накопительные очки для всех записей до новой даты начала
      // Это важно, чтобы старые данные не влияли на расчет
      const resetBeforeStart = this.db.prepare(`
        UPDATE act_daily_points
        SET cumulative_points = 0, updated_at = CURRENT_TIMESTAMP
        WHERE date < ?
      `);
      const resetCount = resetBeforeStart.run(startDate).changes;
      console.log(`[PointsService] Обнулено накопительных очков для ${resetCount} записей до даты начала`);

      // Получаем все записи очков начиная с новой даты начала, отсортированные по дате
      const allPoints = this.db.prepare(`
        SELECT date, daily_points
        FROM act_daily_points
        WHERE date >= ?
        ORDER BY date ASC
      `).all(startDate);

      if (allPoints.length === 0) {
        console.log('[PointsService] Нет записей для пересчета после новой даты начала');
        return;
      }

      let cumulative = 0;

      // Пересчитываем накопительные очки для каждого дня, начиная с новой даты начала
      for (const point of allPoints) {
        const dailyPoints = point.daily_points || 0;
        cumulative = Math.max(0, cumulative + dailyPoints);
        const roundedCumulative = Math.round(cumulative * 100) / 100;

        // Обновляем запись
        this.db.prepare(`
          UPDATE act_daily_points
          SET cumulative_points = ?, updated_at = CURRENT_TIMESTAMP
          WHERE date = ?
        `).run(roundedCumulative, point.date);
      }

      console.log(`[PointsService] Пересчет завершен. Обработано ${allPoints.length} записей. Финальные накопительные очки: ${cumulative}`);
    } catch (e) {
      console.error('[PointsService] Ошибка полного пересчета накопительных очков:', e);
      console.error('[PointsService] Детали ошибки:', e.message);
      throw e;
    }
  }

  /**
   * Получает процент выполнения для даты (для календаря)
   * @param {string} date - Дата
   * @returns {number} Процент выполнения (0-100)
   */
  getCompletionPercent(date) {
    try {
      // Проверяем существование таблицы
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='act_daily_points'
      `).get();
      
      if (!tableExists) {
        // Если таблицы нет, вычисляем из категорий
        const { completionPercent } = this.calculateDailyPoints(date);
        return Math.round(completionPercent);
      }

      const result = this.db.prepare(`
        SELECT completion_percent
        FROM act_daily_points
        WHERE date = ?
      `).get(date);

      if (result && result.completion_percent !== null && result.completion_percent !== undefined) {
        return Math.round(result.completion_percent);
      }

      // Если записи нет, вычисляем из категорий
      const { completionPercent } = this.calculateDailyPoints(date);
      return Math.round(completionPercent);
    } catch (e) {
      // Тихая обработка ошибки - вычисляем из категорий
      try {
        const { completionPercent } = this.calculateDailyPoints(date);
        return Math.round(completionPercent);
      } catch (calcError) {
        return 0;
      }
    }
  }

  /**
   * Получает данные различных типов для указанной даты
   * @param {string} date - Дата в формате YYYY-MM-DD
   * @param {string} type - Тип данных (completion, points, rituals, mood, finance)
   * @returns {Object} { value, text, color, icon }
   */
  getDayData(date, type, monthData = null) {
    try {
      switch (type) {
        case 'completion': {
          const percent = this.getCompletionPercent(date);
          const dayData = {
            value: percent,
            text: `${percent}%`,
            color: 'var(--color-accent-ui, var(--color-accent))' // Только акцентный цвет для прогресс-бара
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        case 'points': {
          const result = this.db.prepare(`
            SELECT daily_points FROM act_daily_points WHERE date = ?
          `).get(date);
          const points = result ? Math.round(result.daily_points) : 0;
          
          // Отрицательные очки — нейтральный приглушённый текст (без красного)
          const color = points >= 0 ? 'var(--color-accent-ui, var(--color-accent))' : 'var(--color-metric-negative, var(--color-on-surface-secondary))';
          
          const dayData = {
            value: points,
            text: points > 0 ? `+${points}` : `${points}`,
            color: color
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        case 'rituals': {
          // Получаем все активные ритуалы
          const morningRituals = this.db.prepare(`
            SELECT id FROM cfg_rituals_morning WHERE active = 1
          `).all();
          const eveningRituals = this.db.prepare(`
            SELECT id FROM cfg_rituals_evening WHERE active = 1
          `).all();
          
          const totalRituals = morningRituals.length + eveningRituals.length;
          
          if (totalRituals === 0) {
            return {
              value: 0,
              text: '0/0',
              color: 'var(--color-on-surface-secondary)'
            };
          }
          
          // Получаем выполненные ритуалы
          const completedMorning = this.db.prepare(`
            SELECT COUNT(*) as count FROM act_rituals_morning 
            WHERE date = ? AND completed = 1
          `).get(date);
          const completedEvening = this.db.prepare(`
            SELECT COUNT(*) as count FROM act_rituals_evening 
            WHERE date = ? AND completed = 1
          `).get(date);
          
          const completedCount = (completedMorning?.count || 0) + (completedEvening?.count || 0);
          
          // Вычисляем средний процент выполнения
          const morningPercent = morningRituals.length > 0 
            ? ((completedMorning?.count || 0) / morningRituals.length) * 100 
            : 0;
          const eveningPercent = eveningRituals.length > 0 
            ? ((completedEvening?.count || 0) / eveningRituals.length) * 100 
            : 0;
          
          // Средний процент между утренними и вечерними
          let avgPercent = 0;
          if (morningRituals.length > 0 && eveningRituals.length > 0) {
            avgPercent = (morningPercent + eveningPercent) / 2;
          } else if (morningRituals.length > 0) {
            avgPercent = morningPercent;
          } else if (eveningRituals.length > 0) {
            avgPercent = eveningPercent;
          }
          
          const dayData = {
            value: Math.round(avgPercent),
            text: `${completedCount}/${totalRituals}`,
            color: 'var(--color-accent-ui, var(--color-accent))' // Только акцентный цвет для прогресс-бара
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        case 'mood': {
          const result = this.db.prepare(`
            SELECT mood_id FROM act_diary_entries WHERE date = ?
          `).get(date);
          if (result && result.mood_id) {
            const mood = this.db.prepare(`
              SELECT level, icon FROM cfg_diary_moods WHERE id = ?
            `).get(result.mood_id);
            if (mood) {
              // Низкие уровни настроения — нейтральный приглушённый цвет; 3–5 — акцент
              const moodColors = {
                1: 'var(--color-metric-negative, var(--color-on-surface-secondary))',
                2: 'var(--color-metric-negative, var(--color-on-surface-secondary))',
                3: 'var(--color-accent-ui, var(--color-accent))',
                4: 'var(--color-accent-ui, var(--color-accent))',
                5: 'var(--color-accent-ui, var(--color-accent))'
              };
              
              const moodNames = {
                1: 'Ужасно',
                2: 'Плохо',
                3: 'Нормально',
                4: 'Хорошо',
                5: 'Отлично'
              };

              const dayData = {
                value: mood.level, // Используем level вместо mood_id для правильного вычисления прогресс-бара
                moodId: result.mood_id, // Сохраняем mood_id отдельно если нужно
                text: moodNames[mood.level] || '—',
                color: moodColors[mood.level] || 'var(--color-on-surface-secondary)',
                icon: mood.icon
              };
              dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
              return dayData;
            }
          }
          const emptyData = {
            value: null,
            text: '—',
            color: 'var(--color-on-surface-disabled)'
          };
          emptyData.fillPercent = 0;
          return emptyData;
        }
        case 'income': {
          const transactions = this.db.prepare(`
            SELECT amount FROM act_transactions WHERE date = ? AND type = 'income'
          `).all(date);
          
          let totalIncome = 0;
          transactions.forEach(t => {
            totalIncome += t.amount;
          });
          
          // Получаем валюту из настроек
          let currencySymbol = '₽';
          try {
            const settings = this.db.prepare(`
              SELECT currency FROM app_settings LIMIT 1
            `).get();
            if (settings && settings.currency) {
              const symbols = {
                'RUB': '₽', 'USD': '$', 'EUR': '€', 'GBP': '£',
                'JPY': '¥', 'CNY': '¥', 'KZT': '₸', 'BYN': 'Br', 'PLN': 'zł'
              };
              currencySymbol = symbols[settings.currency] || '₽';
            }
          } catch (e) {
            // Используем значение по умолчанию
          }
          
          const formattedIncome = totalIncome === 0 
            ? `0 ${currencySymbol}`
            : `+${Math.round(totalIncome)} ${currencySymbol}`;
          
          const dayData = {
            value: totalIncome,
            text: formattedIncome,
            color: 'var(--color-accent-ui, var(--color-accent))' // Только акцентный цвет для прогресс-бара
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        case 'expense': {
          const transactions = this.db.prepare(`
            SELECT amount FROM act_transactions WHERE date = ? AND type = 'expense'
          `).all(date);
          
          let totalExpense = 0;
          transactions.forEach(t => {
            totalExpense += t.amount;
          });
          
          // Получаем валюту из настроек
          let currencySymbol = '₽';
          try {
            const settings = this.db.prepare(`
              SELECT currency FROM app_settings LIMIT 1
            `).get();
            if (settings && settings.currency) {
              const symbols = {
                'RUB': '₽', 'USD': '$', 'EUR': '€', 'GBP': '£',
                'JPY': '¥', 'CNY': '¥', 'KZT': '₸', 'BYN': 'Br', 'PLN': 'zł'
              };
              currencySymbol = symbols[settings.currency] || '₽';
            }
          } catch (e) {
            // Используем значение по умолчанию
          }
          
          const formattedExpense = totalExpense === 0 
            ? `0 ${currencySymbol}`
            : `-${Math.round(totalExpense)} ${currencySymbol}`;
          
          const dayData = {
            value: totalExpense,
            text: formattedExpense,
            color: totalExpense > 0
              ? 'var(--color-metric-negative, var(--color-on-surface-secondary))'
              : 'var(--color-on-surface-secondary)'
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        case 'finance': {
          // Финансы: баланс (доходы - расходы)
          const transactions = this.db.prepare(`
            SELECT amount, type FROM act_transactions WHERE date = ?
          `).all(date);
          
          let income = 0;
          let expense = 0;
          
          transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
          });
          
          const balance = income - expense;
          
          // Получаем валюту из настроек
          let currencySymbol = '₽';
          try {
            const settings = this.db.prepare(`
              SELECT currency FROM app_settings LIMIT 1
            `).get();
            if (settings && settings.currency) {
              const symbols = {
                'RUB': '₽', 'USD': '$', 'EUR': '€', 'GBP': '£',
                'JPY': '¥', 'CNY': '¥', 'KZT': '₸', 'BYN': 'Br', 'PLN': 'zł'
              };
              currencySymbol = symbols[settings.currency] || '₽';
            }
          } catch (e) {
            // Используем значение по умолчанию
          }
          
          // Форматируем баланс с валютой
          const formattedBalance = balance === 0 
            ? `0 ${currencySymbol}`
            : (balance > 0 ? `+${Math.round(balance)} ${currencySymbol}` : `${Math.round(balance)} ${currencySymbol}`);
          
          const color = balance >= 0 ? 'var(--color-accent-ui, var(--color-accent))' : 'var(--color-metric-negative, var(--color-on-surface-secondary))';
          
          const dayData = {
            value: balance,
            text: formattedBalance,
            color: color
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        case 'calories': {
          // Получаем все записи питания за день
          const entries = this.db.prepare(`
            SELECT total_calories FROM act_nutrition_entries WHERE date = ?
          `).all(date);
          
          let totalCalories = 0;
          entries.forEach(entry => {
            totalCalories += entry.total_calories || 0;
          });
          
          const dayData = {
            value: Math.round(totalCalories),
            text: `${Math.round(totalCalories)} ккал`,
            color: 'var(--color-accent-ui, var(--color-accent))' // Как у остальных типов — читаемо в светлой и тёмной теме
          };
          dayData.fillPercent = this.getFillPercent(date, type, dayData, monthData);
          return dayData;
        }
        default: {
          const defaultData = { value: 0, text: '0%', color: 'var(--color-on-surface-secondary)' };
          defaultData.fillPercent = 0;
          return defaultData;
        }
      }
    } catch (e) {
      console.error(`[PointsService] Ошибка получения данных типа ${type} для ${date}:`, e);
      const errorData = { value: 0, text: '—', color: 'var(--color-on-surface-disabled)' };
      errorData.fillPercent = 0;
      return errorData;
    }
  }

  /**
   * Получает минимальное и максимальное значение для указанного месяца
   * @param {number} year - Год
   * @param {number} month - Месяц (1-12)
   * @param {string} type - Тип: 'income', 'expense' или 'mood'
   * @returns {Object} { minValue, maxValue }
   */
  getMonthRange(year, month, type) {
    try {
      // Формируем начало и конец месяца
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      
      if (type === 'mood') {
        // Для настроения получаем уровни из дневника
        const diaryEntries = this.db.prepare(`
          SELECT mood_id FROM act_diary_entries 
          WHERE date >= ? AND date <= ? AND mood_id IS NOT NULL
        `).all(startDate, endDate);
        
        if (diaryEntries.length === 0) {
          return { minValue: 1, maxValue: 5 }; // По умолчанию полный диапазон
        }
        
        // Получаем уровни настроения
        const moodLevels = [];
        for (const entry of diaryEntries) {
          const mood = this.db.prepare(`
            SELECT level FROM cfg_diary_moods WHERE id = ?
          `).get(entry.mood_id);
          if (mood && mood.level) {
            moodLevels.push(mood.level);
          }
        }
        
        if (moodLevels.length === 0) {
          return { minValue: 1, maxValue: 5 }; // По умолчанию полный диапазон
        }
        
        const minValue = Math.min(...moodLevels);
        const maxValue = Math.max(...moodLevels);
        
        // Если min и max одинаковые, возвращаем диапазон с этим значением
        if (minValue === maxValue) {
          return { minValue: minValue, maxValue: maxValue };
        }
        
        return { minValue, maxValue };
      } else if (type === 'points') {
        // Для очков получаем максимальное абсолютное значение в месяце
        const points = this.db.prepare(`
          SELECT daily_points FROM act_daily_points 
          WHERE date >= ? AND date <= ?
        `).all(startDate, endDate);
        
        if (points.length === 0) {
          return { maxAbsValue: 0 };
        }
        
        // Находим максимальное абсолютное значение
        const absValues = points.map(p => Math.abs(p.daily_points || 0));
        const maxAbsValue = Math.max(...absValues);
        
        return { maxAbsValue };
      } else if (type === 'finance') {
        // Для финансов получаем максимальное абсолютное значение баланса в месяце
        const transactions = this.db.prepare(`
          SELECT date, amount, type FROM act_transactions 
          WHERE date >= ? AND date <= ?
          ORDER BY date ASC
        `).all(startDate, endDate);
        
        if (transactions.length === 0) {
          return { maxAbsValue: 0 };
        }
        
        // Вычисляем баланс для каждого дня
        const dailyBalances = {};
        transactions.forEach(t => {
          if (!dailyBalances[t.date]) {
            dailyBalances[t.date] = { income: 0, expense: 0 };
          }
          if (t.type === 'income') {
            dailyBalances[t.date].income += t.amount;
          } else if (t.type === 'expense') {
            dailyBalances[t.date].expense += t.amount;
          }
        });
        
        // Вычисляем балансы для каждого дня
        const balances = Object.values(dailyBalances).map(d => d.income - d.expense);
        
        // Находим максимальное абсолютное значение баланса
        const absValues = balances.map(b => Math.abs(b));
        const maxAbsValue = Math.max(...absValues);
        
        return { maxAbsValue };
      } else if (type === 'calories') {
        // Для калорий получаем все записи питания за месяц
        const entries = this.db.prepare(`
          SELECT date, total_calories FROM act_nutrition_entries 
          WHERE date >= ? AND date <= ?
        `).all(startDate, endDate);
        
        if (entries.length === 0) {
          return { minValue: 0, maxValue: 0 };
        }
        
        // Вычисляем сумму калорий для каждого дня
        const dailyValues = {};
        entries.forEach(entry => {
          if (!dailyValues[entry.date]) {
            dailyValues[entry.date] = 0;
          }
          dailyValues[entry.date] += entry.total_calories || 0;
        });
        
        // Находим min и max значения
        const values = Object.values(dailyValues);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        // Если min и max одинаковые, возвращаем 0 для обоих
        if (minValue === maxValue) {
          return { minValue: 0, maxValue: maxValue || 0 };
        }
        
        return { minValue, maxValue };
      } else {
        // Для income и expense получаем транзакции
        const transactions = this.db.prepare(`
          SELECT date, amount FROM act_transactions 
          WHERE date >= ? AND date <= ? AND type = ?
          ORDER BY date ASC
        `).all(startDate, endDate, type);
        
        if (transactions.length === 0) {
          return { minValue: 0, maxValue: 0 };
        }
        
        // Вычисляем сумму для каждого дня
        const dailyValues = {};
        transactions.forEach(t => {
          if (!dailyValues[t.date]) {
            dailyValues[t.date] = 0;
          }
          dailyValues[t.date] += t.amount;
        });
        
        // Находим min и max значения
        const values = Object.values(dailyValues);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        // Если min и max одинаковые, возвращаем 0 для обоих
        if (minValue === maxValue) {
          return { minValue: 0, maxValue: 0 };
        }
        
        return { minValue, maxValue };
      }
    } catch (e) {
      console.error(`[PointsService] Ошибка получения диапазона ${type} за ${year}-${month}:`, e);
      // Возвращаем значения по умолчанию в зависимости от типа
      if (type === 'mood') {
        return { minValue: 1, maxValue: 5 };
      }
      return { minValue: 0, maxValue: 0 };
    }
  }

  /**
   * Вычисляет процент заполнения прогресс-бара для указанного типа данных
   * Централизованная система вычисления процента заполнения
   * @param {string} date - Дата в формате YYYY-MM-DD
   * @param {string} type - Тип данных (completion, points, rituals, mood, finance)
   * @param {Object} dayData - Данные дня из getDayData
   * @param {Object} monthData - Дополнительные данные месяца (для finance: { minBalance, maxBalance })
   * @returns {number} Процент заполнения (0-100)
   */
  getFillPercent(date, type, dayData, monthData = null) {
    try {
      // Базовые проверки
      if (!dayData || dayData.value === null || dayData.value === undefined) {
        return 0;
      }

      // Получаем базовый процент выполнения для всех типов, которые его используют
      const completionPercent = this.getCompletionPercent(date);

      switch (type) {
        case 'completion':
        case 'rituals': {
          // Для completion и rituals используем процент выполнения (0-100)
          return Math.max(0, Math.min(100, type === 'rituals' ? dayData.value : completionPercent));
        }
        
        case 'points':
        case 'finance': {
          // Очки и Финансы: прогресс-бар от 0 до 100 на основе абсолютного значения
          // При нуле - 0%, при максимальном абсолютном значении в месяце - 100%
          // Цвет зависит от знака (уже установлен в getDayData)
          const value = dayData.value || 0;
          
          // Если значение равно нулю, прогресс-бар не показывается
          if (value === 0) {
            return 0;
          }
          
          if (!monthData || monthData.maxAbsValue === undefined) {
            return 0;
          }
          
          const { maxAbsValue } = monthData;
          
          // Если нет максимального значения, показываем 0%
          if (maxAbsValue === 0) {
            return 0;
          }
          
          // Нормализация: абсолютное значение / максимальное абсолютное значение * 100
          const absValue = Math.abs(value);
          const normalized = (absValue / maxAbsValue) * 100;
          return Math.max(0, Math.min(100, normalized));
        }
        
        case 'mood': {
          // Настроение: нормализация относительно min/max уровня настроения в месяце
          // Чем выше уровень настроения, тем больше прогресс-бар (0-100%)
          const moodLevel = dayData.value;
          
          if (!moodLevel || moodLevel < 1 || moodLevel > 5) {
            return 0;
          }
          
          if (!monthData || monthData.minValue === undefined || monthData.maxValue === undefined) {
            // Если нет данных месяца, используем полный диапазон 1-5
            return ((moodLevel - 1) / 4) * 100;
          }
          
          const { minValue, maxValue } = monthData;
          
          // Если нет диапазона (все значения одинаковые), показываем 100% если это максимальное значение
          if (minValue === maxValue) {
            return moodLevel === minValue ? 100 : 0;
          }
          
          // Нормализация: (moodLevel - minValue) / (maxValue - minValue) * 100
          // Это гарантирует: minValue -> 0%, maxValue -> 100%
          const normalized = ((moodLevel - minValue) / (maxValue - minValue)) * 100;
          return Math.max(0, Math.min(100, normalized));
        }
        
        case 'income':
        case 'expense': {
          // Доходы/Расходы: нормализация относительно min/max значения в месяце
          // Чем больше значение, тем больше прогресс-бар (0-100%)
          // Отрицательные значения не показываются (0%)
          if (dayData.value < 0) {
            return 0;
          }
          
          if (!monthData || monthData.minValue === undefined || monthData.maxValue === undefined) {
            return 0;
          }
          
          const { minValue, maxValue } = monthData;
          
          // Если нет диапазона (все значения одинаковые), показываем 0%
          if (minValue === maxValue) {
            // Если значение равно 0 и maxValue тоже 0, показываем 0%
            // Если значение > 0 и равно maxValue, показываем 100%
            if (dayData.value === 0) {
              return 0;
            }
            // Если все дни имеют одинаковое значение > 0, показываем 100%
            return 100;
          }
          
          // Нормализация: (value - minValue) / (maxValue - minValue) * 100
          // Это гарантирует: minValue -> 0%, maxValue -> 100%
          const normalized = ((dayData.value - minValue) / (maxValue - minValue)) * 100;
          return Math.max(0, Math.min(100, normalized));
        }
        
        default:
          return 0;
      }
    } catch (e) {
      console.error(`[PointsService] Ошибка вычисления процента заполнения для ${type} на ${date}:`, e);
      return 0;
    }
  }
}

module.exports = PointsService;
