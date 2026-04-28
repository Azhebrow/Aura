/**
 * Глобальное состояние выбранного дня
 * Управляет выбранной датой и уведомляет подписчиков об изменениях
 */
class SelectedDateState {
  constructor() {
    // Выбранная дата (объект Date)
    this.selectedDate = new Date();
    // Нормализуем время на начало дня
    this.selectedDate.setHours(0, 0, 0, 0);
    
    // Подписчики на изменения
    this.subscribers = new Set();
  }

  /**
   * Получить выбранную дату
   * @returns {Date} Выбранная дата
   */
  getSelectedDate() {
    return new Date(this.selectedDate);
  }

  /**
   * Получить выбранную дату в формате YYYY-MM-DD
   * @returns {string} Дата в формате YYYY-MM-DD
   */
  getSelectedDateString() {
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Установить выбранную дату
   * @param {Date|string} date - Дата (объект Date или строка YYYY-MM-DD)
   */
  setSelectedDate(date) {
    let newDate;
    if (typeof date === 'string') {
      // Парсим строку YYYY-MM-DD вручную, чтобы избежать проблем с часовыми поясами
      const parts = date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Месяц в JS начинается с 0
        const day = parseInt(parts[2], 10);
        newDate = new Date(year, month, day, 0, 0, 0, 0);
      } else {
        // Fallback на стандартный парсинг
        newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
      }
    } else {
      newDate = new Date(date);
      // Нормализуем время на начало дня
      newDate.setHours(0, 0, 0, 0);
    }
    
    // Проверяем, изменилась ли дата
    if (newDate.getTime() !== this.selectedDate.getTime()) {
      this.selectedDate = newDate;
      this.notifySubscribers();
    }
  }

  /**
   * Подписаться на изменения выбранной даты
   * @param {Function} callback - Функция обратного вызова
   * @returns {Function} Функция для отписки
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Возвращаем функцию для отписки
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Уведомить всех подписчиков об изменении даты
   */
  notifySubscribers() {
    const date = this.getSelectedDate();
    const dateString = this.getSelectedDateString();
    
    this.subscribers.forEach(callback => {
      try {
        callback(date, dateString);
      } catch (error) {
        console.error('[SelectedDateState] Ошибка в подписчике:', error);
      }
    });
  }

  /**
   * Проверить, является ли дата сегодняшним днем
   * @param {Date} date - Дата для проверки
   * @returns {boolean}
   */
  isToday(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate.getTime() === today.getTime();
  }

  /**
   * Проверить, является ли дата выбранным днем
   * @param {Date} date - Дата для проверки
   * @returns {boolean}
   */
  isSelected(date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate.getTime() === this.selectedDate.getTime();
  }
}

// Создаем единственный экземпляр (singleton)
const selectedDateState = new SelectedDateState();

// Делаем доступным глобально
if (typeof window !== 'undefined') {
  window.selectedDateState = selectedDateState;
}

export default selectedDateState;












