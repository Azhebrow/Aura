/**
 * Централизованный менеджер управления очками
 * Единая точка входа для всех операций с очками и автоматическая синхронизация компонентов
 */


class PointsManager {
  constructor() {
    this.pointsService = null;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Инициализация менеджера с базой данных
   * @param {Object} db - Экземпляр базы данных
   */
  init(db) {
    if (this.initialized) {
      console.warn('[PointsManager] Уже инициализирован');
      return;
    }

    this.db = db;
    
    // Инициализируем PointsService
    try {
      // Сначала пробуем загрузить из window (передан из main процесса)
      let PointsService;
      if (typeof window !== 'undefined' && window.PointsService) {
        PointsService = window.PointsService;
      } else {
        // Fallback - пробуем require с относительным путем
        PointsService = require('./PointsService.js');
      }
      this.pointsService = new PointsService(db);
    } catch (e) {
      console.error('[PointsManager] Ошибка инициализации PointsService:', e);
      return;
    }

    this.setupEventListeners();
    this.initialized = true;
    console.log('[PointsManager] Инициализирован');
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Слушаем изменение даты начала отчета
    window.addEventListener('pointsStartDateChanged', () => {
      console.log('[PointsManager] Получено событие pointsStartDateChanged, запускаем пересчет');
      this.recalculateAllPoints();
    });

    // Слушаем изменения задач для отправки события об обновлении очков
    window.addEventListener('taskProgressChanged', async (e) => {
      // После того как очки сохранены в index.js, отправляем событие об обновлении
      // Небольшая задержка, чтобы дать время PointsService сохранить данные
      setTimeout(() => {
        this.notifyPointsUpdated();
      }, 100);
    });

    // Слушаем изменения timer сессий для отправки события об обновлении очков
    // Используем глобальный window.eventBus для подписки на события timer сессий
    // EventBus доступен глобально через window.eventBus (устанавливается в EventBus.js)
    if (typeof window !== 'undefined' && window.eventBus) {
      const timerSessionEvents = ['timerSessionAdded', 'timerSessionChanged', 'timerSessionDeleted'];
      
      timerSessionEvents.forEach(eventName => {
        window.eventBus.on(eventName, async (detail) => {
          // Задержка для гарантии, что saveDailyPoints завершился (вызывается через 50ms в index.js)
          setTimeout(() => {
            this.notifyPointsUpdated();
          }, 150); // Увеличиваем задержку, так как saveDailyPoints вызывается через 50ms
        });
      });
    } else {
      console.warn('[PointsManager] window.eventBus недоступен, события timer сессий не будут обрабатываться');
    }
  }

  /**
   * Полный пересчет всех накопительных очков
   * Вызывается при изменении даты начала отчета
   */
  async recalculateAllPoints() {
    if (!this.pointsService || !this.initialized) {
      console.warn('[PointsManager] Не инициализирован, пропускаем пересчет');
      return;
    }

    try {
      console.log('[PointsManager] Начинаем полный пересчет всех накопительных очков');
      
      // Используем метод из PointsService для пересчета всех накопительных очков
      await this.pointsService.recalculateAllCumulativePoints();
      
      console.log('[PointsManager] Пересчет завершен, отправляем событие pointsRecalculated');
      
      // Отправляем событие о полном пересчете
      window.dispatchEvent(new CustomEvent('pointsRecalculated', {
        detail: { timestamp: new Date().toISOString() }
      }));
      
      // Также отправляем общее событие об обновлении
      this.notifyPointsUpdated();
    } catch (e) {
      console.error('[PointsManager] Ошибка при пересчете очков:', e);
    }
  }

  /**
   * Отправка события об обновлении очков
   */
  notifyPointsUpdated() {
    window.dispatchEvent(new CustomEvent('pointsUpdated', {
      detail: { timestamp: new Date().toISOString() }
    }));
  }

  /**
   * Получить экземпляр PointsService
   * @returns {PointsService|null}
   */
  getPointsService() {
    return this.pointsService;
  }

  /**
   * Проверка инициализации
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

// Экспортируем singleton экземпляр
const pointsManager = new PointsManager();

module.exports = pointsManager;
