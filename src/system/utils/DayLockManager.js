import iconLoader from '../../utils/iconLoader.js';

// Функция для получения PointsService (загружается лениво)
function getPointsService() {
  // Сначала пробуем загрузить из window (передан из main процесса)
  if (typeof window !== 'undefined' && window.PointsService) {
    return window.PointsService;
  }
  
  // Fallback - пробуем require с относительным путем (только в dev режиме)
  try {
    return require('../services/PointsService.js');
  } catch (e) {
    console.warn('[DayLockManager] PointsService недоступен, используем fallback');
    // Fallback - создаем пустой класс
    return class {
      constructor() {}
      isDayOpen() { return true; }
      isFutureDay() { return false; }
    };
  }
}

/**
 * Менеджер для управления блокировкой дней
 * Отвечает за создание иконки блокировки и обновление состояния блокировки
 */
class DayLockManager {
  constructor(db, date = null) {
    this.db = db;
    // Загружаем PointsService лениво при создании экземпляра
    const PointsService = getPointsService();
    this.pointsService = new PointsService(db);
    this.date = date;
    this.isLocked = false;
  }

  /**
   * Инициализирует менеджер блокировки
   */
  async init() {
    if (this.date) {
      await this.updateLockState();
    }
  }

  /**
   * Обновляет дату и пересчитывает состояние блокировки
   * @param {string} date - Дата в формате YYYY-MM-DD
   */
  async updateDate(date) {
    this.date = date;
    await this.updateLockState();
  }

  /**
   * Обновляет внутреннее состояние блокировки
   */
  async updateLockState() {
    if (!this.date) {
      this.isLocked = false;
      return;
    }

    try {
      const isOpen = this.pointsService.isDayOpen(this.date);
      this.isLocked = !isOpen;
    } catch (e) {
      console.error('[DayLockManager] Ошибка обновления состояния блокировки:', e);
      this.isLocked = false;
    }
  }

  /**
   * Проверяет, заблокирован ли день
   * @returns {boolean}
   */
  getIsLocked() {
    return this.isLocked;
  }

  /**
   * Применяет блокировку к секции
   * @param {HTMLElement} element - Элемент секции
   */
  applyLockToSection(element) {
    if (!element) {
      return;
    }

    if (this.isLocked) {
      element.style.opacity = '0.5';
      element.style.pointerEvents = 'none';
      element.classList.add('section-locked');
    } else {
      element.style.opacity = '1';
      element.style.pointerEvents = 'auto';
      element.classList.remove('section-locked');
    }
  }

  /**
   * Создает иконку блокировки
   * @returns {Promise<HTMLElement>} Элемент иконки
   */
  async createLockIcon() {
    const iconElement = document.createElement('span');
    iconElement.className = 'section-lock-icon';
    iconElement.style.display = 'flex';
    iconElement.style.alignItems = 'center';
    iconElement.style.justifyContent = 'center';
    iconElement.style.cursor = 'pointer';
    iconElement.style.opacity = '0.6';
    iconElement.style.transition = 'opacity 0.2s';
    
    // Загружаем иконку блокировки
    try {
      const iconContent = await iconLoader.loadIcon('lock');
      iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${iconContent}</svg>`;
    } catch (e) {
      // Fallback иконка
      iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    }
    
    return iconElement;
  }

  /**
   * Обновляет состояние блокировки для секции
   * @param {HTMLElement} element - Элемент секции
   * @param {HTMLElement} contentElement - Элемент контента секции
   * @param {HTMLElement} lockIcon - Иконка блокировки
   * @param {string} date - Дата в формате YYYY-MM-DD
   */
  async updateLockState(element, contentElement, lockIcon, date) {
    if (!element || !contentElement || !lockIcon || !date) {
      return;
    }

    try {
      const isOpen = this.pointsService.isDayOpen(date);
      const isFuture = this.pointsService.isFutureDay(date);

      if (isOpen) {
        // День открыт - скрываем иконку и разблокируем контент
        lockIcon.style.display = 'none';
        contentElement.style.opacity = '1';
        contentElement.style.pointerEvents = 'auto';
        element.classList.remove('section-locked');
      } else {
        // День заблокирован - показываем иконку и блокируем контент
        lockIcon.style.display = 'flex';
        contentElement.style.opacity = '0.5';
        contentElement.style.pointerEvents = 'none';
        element.classList.add('section-locked');
        
        // Если это будущий день, меняем иконку
        if (isFuture) {
          try {
            const iconContent = await iconLoader.loadIcon('calendar');
            lockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${iconContent}</svg>`;
          } catch (e) {
            // Оставляем иконку блокировки
          }
        } else {
          // Для прошлых дней показываем иконку блокировки
          try {
            const iconContent = await iconLoader.loadIcon('lock');
            lockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${iconContent}</svg>`;
          } catch (e) {
            // Fallback
          }
        }
      }
    } catch (e) {
      console.error('[DayLockManager] Ошибка обновления состояния блокировки:', e);
      // В случае ошибки разблокируем контент
      lockIcon.style.display = 'none';
      contentElement.style.opacity = '1';
      contentElement.style.pointerEvents = 'auto';
      element.classList.remove('section-locked');
    }
  }
}

export default DayLockManager;

