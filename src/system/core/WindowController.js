/**
 * Контроллер для управления окном через IPC
 * Обертка над Electron IPC для управления окном приложения
 */

class WindowController {
  constructor() {
    this.ipcAvailable = false;
    this.checkIPCAvailability();
  }

  /**
   * Проверяет доступность IPC
   */
  checkIPCAvailability() {
    try {
      // Проверяем наличие require и ipcRenderer
      if (typeof window !== 'undefined' && window.require) {
        const { ipcRenderer } = window.require('electron');
        if (ipcRenderer) {
          this.ipcAvailable = true;
          this.ipcRenderer = ipcRenderer;
        }
      }
    } catch (error) {
      console.warn('[WindowController] IPC недоступен, используется fallback режим:', error);
      this.ipcAvailable = false;
    }
  }

  /**
   * Вызывает IPC метод с обработкой ошибок
   */
  async callIPC(action) {
    if (!this.ipcAvailable) {
      console.warn(`[WindowController] IPC недоступен, действие "${action}" не выполнено`);
      return { success: false, error: 'IPC not available' };
    }

    try {
      const result = await this.ipcRenderer.invoke('window-control', action);
      return result;
    } catch (error) {
      console.error(`[WindowController] Ошибка при вызове IPC для действия "${action}":`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Минимизирует окно
   */
  async minimize() {
    return await this.callIPC('minimize');
  }

  /**
   * Максимизирует или восстанавливает окно
   */
  async maximize() {
    return await this.callIPC('maximize');
  }

  /**
   * Закрывает окно
   */
  async close() {
    return await this.callIPC('close');
  }

  /**
   * Проверяет, максимизировано ли окно
   */
  async isMaximized() {
    const result = await this.callIPC('isMaximized');
    return result.success ? result.isMaximized : false;
  }
}

// Экспортируем singleton экземпляр
const windowController = new WindowController();
export default windowController;
