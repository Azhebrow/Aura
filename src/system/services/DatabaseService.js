/**
 * Централизованный сервис для работы с базой данных
 * Заменяет использование window.getDB по всему приложению
 */
class DatabaseService {
  constructor() {
    this._getDB = null;
  }

  /**
   * Инициализирует сервис с функцией получения БД
   * @param {Function} getDBFunction - Функция для получения экземпляра БД
   */
  init(getDBFunction) {
    if (typeof getDBFunction !== 'function') {
      throw new Error('[DatabaseService] getDBFunction must be a function');
    }
    this._getDB = getDBFunction;
  }

  /**
   * Получает экземпляр базы данных
   * @returns {Object|null} Экземпляр БД или null
   */
  getDB() {
    if (!this._getDB) {
      console.warn('[DatabaseService] Database service not initialized. Trying fallback...');
      // Fallback для обратной совместимости
      if (window.getDB && typeof window.getDB === 'function') {
        return window.getDB();
      }
      console.error('[DatabaseService] Database service not available');
      return null;
    }
    
    const db = this._getDB();
    if (!db) {
      console.warn('[DatabaseService] Database instance is null');
    }
    return db;
  }

  /**
   * Проверяет доступность базы данных
   * @returns {boolean}
   */
  isAvailable() {
    return this._getDB !== null && this.getDB() !== null;
  }
}

// Создаем singleton экземпляр
const databaseService = new DatabaseService();

// Инициализация из window.getDB при загрузке (для обратной совместимости)
if (typeof window !== 'undefined' && window.getDB) {
  databaseService.init(window.getDB);
}

export default databaseService;









