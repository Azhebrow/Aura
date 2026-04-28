/**
 * Инициализация PointsManager и подписки EventBus для очков и сессий таймера.
 */
export function registerPointsManagerAndHandlers(eventBus, selectedDateState) {
  try {
    let pointsManager;
    if (typeof window !== 'undefined' && window.PointsManager) {
      pointsManager = window.PointsManager;
    } else {
      pointsManager = require('../system/services/PointsManager.js');
    }

    const getDB = window.getDB;
    if (getDB) {
      const db = getDB();
      if (db) {
        pointsManager.init(db);
        window.pointsManager = pointsManager;
        console.log('[AURA] PointsManager инициализирован');
      }
    }
  } catch (e) {
    console.warn('[AURA] Ошибка инициализации PointsManager:', e);
  }

  eventBus.on('taskProgressChanged', async (detail) => {
    try {
      const getDB = window.getDB;
      if (!getDB) return;

      const db = getDB();
      if (!db) return;

      let pointsService;
      const pm = window.pointsManager;
      if (pm && pm.isInitialized()) {
        pointsService = pm.getPointsService();
      } else {
        const PointsService = require('../system/services/PointsService.js');
        pointsService = new PointsService(db);
      }

      if (!pointsService) return;

      let date = null;
      if (detail && detail.date) {
        date = detail.date;
      } else if (detail && detail.data && detail.data.date) {
        date = detail.data.date;
      } else if (selectedDateState) {
        date = selectedDateState.getSelectedDateString();
      } else {
        const now = new Date();
        date = now.toISOString().split('T')[0];
      }

      if (date) {
        try {
          pointsService.saveDailyPoints(date);
          console.log(`[AURA] Очки сохранены для даты ${date}`);
        } catch (error) {
          console.error(`[AURA] Ошибка сохранения очков для даты ${date}:`, error);
        }
      }
    } catch (error) {
      console.error('[AURA] Ошибка сохранения очков при изменении прогресса:', error);
    }
  });

  const timerSessionEvents = ['timerSessionAdded', 'timerSessionChanged', 'timerSessionDeleted'];
  timerSessionEvents.forEach((eventName) => {
    eventBus.on(eventName, async (detail) => {
      try {
        const getDB = window.getDB;
        if (!getDB) return;

        const db = getDB();
        if (!db) return;

        let date = null;
        if (detail && detail.date) {
          date = detail.date;
        } else if (detail && detail.data && detail.data.date) {
          date = detail.data.date;
        }

        if (!date) {
          console.warn(`[AURA] Нет даты в событии ${eventName}`, detail);
          return;
        }

        if (typeof date === 'string' && date.includes('T')) {
          date = date.split('T')[0];
        }

        let taskId = detail.data?.task_id || detail.taskId || detail.previousData?.task_id;

        if (!taskId) {
          console.warn(`[AURA] Нет taskId в событии ${eventName}, пересчитываем все категории для даты ${date}`, detail);

          const categories = ['time', 'body', 'rituals', 'deps'];
          for (const categoryType of categories) {
            try {
              db.calculateCategoryProgress(categoryType, date);
            } catch (error) {
              console.error(`[AURA] Ошибка пересчета категории ${categoryType}:`, error);
            }
          }
        } else {
          const allTasks = db.getAll('cfg_tasks');
          const task = allTasks.find((t) => t.id === taskId);

          if (!task) {
            console.warn(`[AURA] Задача ${taskId} не найдена, пересчитываем все категории для даты ${date}`);
            const categories = ['time', 'body', 'rituals', 'deps'];
            for (const categoryType of categories) {
              try {
                db.calculateCategoryProgress(categoryType, date);
              } catch (error) {
                console.error(`[AURA] Ошибка пересчета категории ${categoryType}:`, error);
              }
            }
          } else if (task.task_type === 'timer' || task.task_type === 'nutrition') {
            const categoryType = task.category_type;
            if (categoryType) {
              const categoryPercent = db.calculateCategoryProgress(categoryType, date);
              console.log(`[AURA] Пересчитан процент категории ${categoryType} для ${date}: ${categoryPercent}%`);
            }
          }
        }

        let pointsService;
        const pm = window.pointsManager;
        if (pm && pm.isInitialized()) {
          pointsService = pm.getPointsService();
        } else {
          const PointsService = require('../system/services/PointsService.js');
          pointsService = new PointsService(db);
        }

        if (pointsService) {
          try {
            await new Promise((resolve) => {
              setTimeout(() => {
                try {
                  pointsService.saveDailyPoints(date);
                  console.log(`[AURA] Очки пересчитаны для даты ${date} после изменения timer сессии`);

                  eventBus.emit('pointsUpdated', {
                    date: date,
                    timestamp: Date.now()
                  });

                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pointsUpdated', {
                      detail: { date: date, timestamp: Date.now() }
                    }));
                  }

                  resolve();
                } catch (error) {
                  console.error(`[AURA] Ошибка пересчета очков для даты ${date}:`, error);
                  resolve();
                }
              }, 50);
            });
          } catch (error) {
            console.error(`[AURA] Ошибка в цепочке пересчета очков для даты ${date}:`, error);
          }
        }
      } catch (error) {
        console.error(`[AURA] Ошибка в обработчике ${eventName}:`, error);
        console.error('[AURA] Детали ошибки:', error.stack);
      }
    });
  });
}
