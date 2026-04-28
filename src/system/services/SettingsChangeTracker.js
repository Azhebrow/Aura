/**
 * Сервис для отслеживания изменений в базе данных
 * Отслеживает все действия: сохранение, удаление, редактирование
 * Перезагружает приложение только при выходе со страницы настроек, если на ней были изменения
 */
class SettingsChangeTracker {
  constructor() {
    this.hasChanges = false;
    this.lastChangedPageId = null;
  }

  /**
   * Отметить, что были внесены изменения в БД
   * Фиксируем страницу, на которой произошли изменения
   */
  markChanged() {
    this.hasChanges = true;
    this.lastChangedPageId = this.getCurrentPageId();
    console.log('[SettingsChangeTracker] Изменения в БД зафиксированы на странице:', this.lastChangedPageId);
  }

  /**
   * Проверить изменения и перезагрузить при необходимости
   * Вызывается при переходе на другую страницу
   * Перезагрузка происходит ТОЛЬКО если изменения были на странице настроек
   * @param {string} targetPageId - ID целевой страницы для перехода после перезагрузки
   * @returns {boolean} true если была выполнена перезагрузка, false если перезагрузка не нужна
   */
  checkAndReload(targetPageId) {
    if (typeof window === 'undefined') {
      return false;
    }
    if (!this.hasChanges) {
      return false; // Нет изменений, перезагрузка не нужна
    }

    // Перезагружаем только если изменения были на странице настроек
    if (this.lastChangedPageId !== 'settings') {
      return false;
    }

    console.log('[SettingsChangeTracker] Обнаружены изменения на странице настроек, перезагружаем приложение для перехода на:', targetPageId);
    
    // Сохраняем целевую страницу для восстановления после перезагрузки
    if (targetPageId) {
      sessionStorage.setItem('aura_pending_page', targetPageId);
    }
    
    // Перезагружаем приложение
    window.location.reload();
    return true; // Перезагрузка была инициирована
  }

  /**
   * Получить ID текущей страницы
   * @returns {string|null}
   */
  getCurrentPageId() {
    if (typeof window === 'undefined') {
      return 'home';
    }
    if (window.pageManager && window.pageManager.currentPageId) {
      return window.pageManager.currentPageId;
    }
    
    // Fallback: определяем по классам страницы
    if (window.pageManager && window.pageManager.currentPage) {
      const page = window.pageManager.currentPage;
      if (page.classList.contains('page-settings')) return 'settings';
      if (page.classList.contains('page-stats')) return 'stats';
      if (page.classList.contains('page-ranks')) return 'ranks';
      if (page.classList.contains('page-rituals')) return 'rituals';
      if (page.classList.contains('page-diary')) return 'diary';
      if (page.classList.contains('page-timer')) return 'timer';
      if (page.classList.contains('page-main')) return 'home';
    }
    
    // Fallback: определяем по BottomNavigation
    if (window.bottomNav && window.bottomNav.selectedIndex !== undefined && window.bottomNav.pages) {
      const page = window.bottomNav.pages[window.bottomNav.selectedIndex];
      if (page) return page.id;
    }
    
    return 'home'; // По умолчанию
  }

  /**
   * Очистить флаг изменений
   */
  clearChanges() {
    this.hasChanges = false;
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
      this.reloadTimeout = null;
    }
    console.log('[SettingsChangeTracker] Флаг изменений очищен');
  }

  /**
   * Проверить, были ли изменения
   * @returns {boolean}
   */
  getHasChanges() {
    return this.hasChanges;
  }
}

// Singleton экземпляр
const settingsChangeTracker = new SettingsChangeTracker();

export default settingsChangeTracker;
