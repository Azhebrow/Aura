/**
 * Базовый класс для всех компонентов
 * Предоставляет общие методы для lifecycle, подписок и очистки ресурсов
 */
import databaseService from '../services/DatabaseService.js';
import stateService from '../services/StateService.js';

class BaseComponent {
  constructor() {
    this.element = null;
    this._subscriptions = new Set(); // Хранит функции отписки
    this._eventListeners = new Map(); // Хранит обработчики событий для очистки
    this._isDestroyed = false;
  }

  /**
   * Инициализация компонента
   * Переопределяется в дочерних классах
   */
  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  /**
   * Рендеринг компонента
   * Переопределяется в дочерних классах
   */
  async render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Получает экземпляр базы данных
   * @returns {Object|null}
   */
  getDB() {
    return databaseService.getDB();
  }

  /**
   * Проверяет доступность базы данных
   * @returns {boolean}
   */
  isDBAvailable() {
    return databaseService.isAvailable();
  }

  /**
   * Получает состояние выбранной даты
   * @returns {Object|null}
   */
  getSelectedDateState() {
    return stateService.getSelectedDateState();
  }

  /**
   * Подписывается на изменения выбранной даты
   * Автоматически сохраняет функцию отписки для очистки
   * @param {Function} callback - Функция обратного вызова (date, dateString)
   * @returns {Function} Функция для отписки
   */
  subscribeToDate(callback) {
    const selectedDateState = this.getSelectedDateState();
    if (!selectedDateState) {
      console.warn('[BaseComponent] selectedDateState not available');
      return () => {};
    }

    const unsubscribe = selectedDateState.subscribe(callback);
    this._subscriptions.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Добавляет обработчик события с автоматической очисткой
   * @param {HTMLElement} element - Элемент
   * @param {string} event - Тип события
   * @param {Function} handler - Обработчик
   * @param {Object} options - Опции addEventListener
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element) {
      console.warn('[BaseComponent] Cannot add event listener to null element');
      return;
    }

    element.addEventListener(event, handler, options);
    
    // Сохраняем для очистки
    const key = `${element.constructor.name}_${event}`;
    if (!this._eventListeners.has(key)) {
      this._eventListeners.set(key, []);
    }
    this._eventListeners.get(key).push({ element, event, handler, options });
  }

  /**
   * Удаляет обработчик события
   * @param {HTMLElement} element - Элемент
   * @param {string} event - Тип события
   * @param {Function} handler - Обработчик
   * @param {Object} options - Опции removeEventListener
   */
  removeEventListener(element, event, handler, options = {}) {
    if (!element) return;
    element.removeEventListener(event, handler, options);
  }

  /**
   * Очистка всех ресурсов компонента
   * Вызывается при уничтожении компонента
   */
  destroy() {
    if (this._isDestroyed) {
      console.warn('[BaseComponent] Component already destroyed');
      return;
    }

    // Отписываемся от всех подписок
    this._subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (e) {
        console.error('[BaseComponent] Error unsubscribing:', e);
      }
    });
    this._subscriptions.clear();

    // Удаляем все обработчики событий
    this._eventListeners.forEach(listeners => {
      listeners.forEach(({ element, event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (e) {
          console.error('[BaseComponent] Error removing event listener:', e);
        }
      });
    });
    this._eventListeners.clear();

    // Очищаем элемент
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;

    this._isDestroyed = true;
  }

  /**
   * Проверяет, уничтожен ли компонент
   * @returns {boolean}
   */
  isDestroyed() {
    return this._isDestroyed;
  }
}

export default BaseComponent;









