/**
 * Централизованный сервис для работы с глобальным состоянием
 * Заменяет использование window.selectedDateState и других глобальных переменных
 */
class StateService {
  constructor() {
    this._selectedDateState = null;
    this._pageManager = null;
    this._topNav = null;
    this._bottomNav = null;
  }

  /**
   * Инициализирует сервис состояния
   * @param {Object} state - Объект с состояниями
   */
  init(state = {}) {
    if (state.selectedDateState) {
      this._selectedDateState = state.selectedDateState;
    }
    if (state.pageManager) {
      this._pageManager = state.pageManager;
    }
    if (state.topNav) {
      this._topNav = state.topNav;
    }
    if (state.bottomNav) {
      this._bottomNav = state.bottomNav;
    }
  }

  /**
   * Получает состояние выбранной даты
   * @returns {Object|null}
   */
  getSelectedDateState() {
    if (!this._selectedDateState && typeof window !== 'undefined' && window.selectedDateState) {
      this._selectedDateState = window.selectedDateState;
    }
    return this._selectedDateState;
  }

  /**
   * Получает менеджер страниц
   * @returns {Object|null}
   */
  getPageManager() {
    if (!this._pageManager && typeof window !== 'undefined' && window.pageManager) {
      this._pageManager = window.pageManager;
    }
    return this._pageManager;
  }

  /**
   * Получает верхнюю навигацию
   * @returns {Object|null}
   */
  getTopNav() {
    if (!this._topNav && typeof window !== 'undefined' && window.topNav) {
      this._topNav = window.topNav;
    }
    return this._topNav;
  }

  /**
   * Получает нижнюю навигацию
   * @returns {Object|null}
   */
  getBottomNav() {
    if (!this._bottomNav && typeof window !== 'undefined' && window.bottomNav) {
      this._bottomNav = window.bottomNav;
    }
    return this._bottomNav;
  }

  /**
   * Устанавливает состояние выбранной даты
   */
  setSelectedDateState(state) {
    this._selectedDateState = state;
  }

  /**
   * Устанавливает менеджер страниц
   */
  setPageManager(manager) {
    this._pageManager = manager;
  }

  /**
   * Устанавливает верхнюю навигацию
   */
  setTopNav(nav) {
    this._topNav = nav;
  }

  /**
   * Устанавливает нижнюю навигацию
   */
  setBottomNav(nav) {
    this._bottomNav = nav;
  }
}

// Создаем singleton экземпляр
const stateService = new StateService();

export default stateService;









