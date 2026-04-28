/**
 * Централизованный Event Bus для реактивного обновления данных
 * Гарантирует отправку событий ПОСЛЕ сохранения данных с полными деталями последнего действия
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.debounceTimers = new Map();
    this.maxHistorySize = 100;
  }

  /**
   * Подписаться на событие
   * @param {string} eventName - Имя события
   * @param {Function} callback - Функция обратного вызова (detail) => {}
   * @param {Object} options - Опции { once, priority, debounce }
   * @returns {Function} Функция для отписки
   */
  on(eventName, callback, options = {}) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const listener = { 
      callback, 
      options, 
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
    };
    
    this.listeners.get(eventName).push(listener);
    
    // Сортируем по приоритету (высокий приоритет = больше число)
    if (options.priority !== undefined) {
      this.listeners.get(eventName).sort((a, b) => 
        (b.options.priority || 0) - (a.options.priority || 0)
      );
    }
    
    // Возвращаем функцию отписки
    return () => this.off(eventName, listener.id);
  }

  /**
   * Отписаться от события
   */
  off(eventName, listenerId) {
    if (!this.listeners.has(eventName)) return;
    const listeners = this.listeners.get(eventName);
    const index = listeners.findIndex(l => l.id === listenerId);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Отправить событие
   * @param {string} eventName - Имя события
   * @param {Object} detail - Данные события (должен содержать action, data, date и т.д.)
   * @param {Object} options - Опции { immediate, debounce }
   */
  emit(eventName, detail = {}, options = {}) {
    if (!this.listeners.has(eventName)) return;
    
    const listeners = [...this.listeners.get(eventName)]; // Копия для безопасности
    
    // Добавляем timestamp если его нет
    if (!detail.timestamp) {
      detail.timestamp = Date.now();
    }
    
    // Сохраняем в историю для отладки
    this.addToHistory(eventName, detail);
    
    // Debounce если указан
    if (options.debounce && !options.immediate) {
      this.debounceEmit(eventName, detail, options.debounce);
      return;
    }
    
    // Вызываем все обработчики
    this.callListeners(listeners, detail, eventName);
  }

  /**
   * Отправить событие ПОСЛЕ завершения async операции сохранения
   * @param {string} eventName - Имя события
   * @param {Object} detail - Данные события
   * @param {Promise|Function} saveOperation - Promise или функция, возвращающая Promise
   * @param {Function} getUpdatedData - Функция для получения обновленных данных из БД
   */
  async emitAfterSave(eventName, detail, saveOperation, getUpdatedData = null) {
    try {
      // Ждем завершения сохранения
      const saveResult = typeof saveOperation === 'function' 
        ? await saveOperation() 
        : await saveOperation;
      
      // Получаем обновленные данные из БД если функция предоставлена
      let updatedData = detail.data;
      if (getUpdatedData && typeof getUpdatedData === 'function') {
        try {
          updatedData = await getUpdatedData(saveResult);
        } catch (e) {
          console.warn(`[EventBus] Ошибка получения обновленных данных для ${eventName}:`, e);
        }
      }
      
      // Обогащаем detail обновленными данными
      const enrichedDetail = {
        ...detail,
        data: updatedData || detail.data,
        timestamp: Date.now()
      };
      
      // Отправляем событие
      this.emit(eventName, enrichedDetail, { immediate: true });
      
      return enrichedDetail;
    } catch (error) {
      console.error(`[EventBus] Ошибка в emitAfterSave для ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * Подписаться один раз
   */
  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * Вызвать обработчики
   */
  callListeners(listeners, detail, eventName = '') {
    listeners.forEach(listener => {
      try {
        if (listener.options.once && eventName) {
          this.off(eventName, listener.id);
        }
        listener.callback(detail);
      } catch (error) {
        console.error(`[EventBus] Ошибка в обработчике ${eventName}:`, error);
      }
    });
  }

  /**
   * Debounce для события
   */
  debounceEmit(eventName, detail, delay) {
    const key = eventName;
    
    // Отменяем предыдущий таймер
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    // Создаем новый таймер
    const timer = setTimeout(() => {
      if (this.listeners.has(eventName)) {
        const listeners = [...this.listeners.get(eventName)];
        this.callListeners(listeners, detail, eventName);
      }
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timer);
  }

  /**
   * Добавить событие в историю
   */
  addToHistory(eventName, detail) {
    this.eventHistory.push({
      eventName,
      detail: { ...detail }, // Копия для избежания мутаций
      timestamp: detail.timestamp || Date.now()
    });
    
    // Ограничиваем размер истории
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Очистить все подписки
   */
  clear() {
    this.listeners.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Получить историю событий (для отладки)
   * @param {string} filter - Фильтр по имени события
   * @returns {Array}
   */
  getHistory(filter = null) {
    if (filter) {
      return this.eventHistory.filter(e => e.eventName === filter);
    }
    return [...this.eventHistory];
  }

  /**
   * Получить количество подписчиков на событие
   */
  getListenerCount(eventName) {
    return this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0;
  }
}

// Singleton instance
const eventBus = new EventBus();

// Делаем доступным глобально для отладки
if (typeof window !== 'undefined') {
  window.eventBus = eventBus;
}

export default eventBus;
