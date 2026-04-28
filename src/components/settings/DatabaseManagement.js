import Button from '../form/Button.js';
import { confirmWithSound } from '../../utils/index.js';

class DatabaseManagement {
  constructor() {
    this.element = null;
    this.getDB = window.getDB;
  }

  async init() {
    const container = document.createElement('div');
    container.className = 'database-management-container';

    // Кнопки управления
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'database-management-actions';

    // Кнопка "Перезагрузить пресеты"
    const reloadPresetsButton = new Button({
      text: 'Перезагрузить пресеты'
    });
    await reloadPresetsButton.init();
    reloadPresetsButton.element.className += ' database-management-button';
    reloadPresetsButton.element.addEventListener('click', async () => {
      await this.handleReloadPresets();
    });
    buttonsContainer.appendChild(reloadPresetsButton.element);

    // Кнопка "Очистить базу данных"
    const clearDatabaseButton = new Button({
      text: 'Очистить базу данных'
    });
    await clearDatabaseButton.init();
    clearDatabaseButton.element.className += ' database-management-button database-management-button--danger';
    clearDatabaseButton.element.addEventListener('click', async () => {
      const confirmed = confirmWithSound('Вы уверены, что хотите очистить базу данных? Это действие необратимо!');
      if (!confirmed) {
        return;
      }
      await this.handleClearDatabase();
    });
    buttonsContainer.appendChild(clearDatabaseButton.element);

    container.appendChild(buttonsContainer);

    this.element = container;
  }

  async handleReloadPresets() {
    try {
      const db = this.getDB ? this.getDB() : null;
      if (!db) {
        alert('База данных недоступна');
        return;
      }

      if (db.reloadPresets) {
        db.reloadPresets();
        alert('Пресеты успешно перезагружены');
        // Перезагружаем страницу для применения изменений
        window.location.reload();
      } else {
        alert('Метод reloadPresets не найден в базе данных');
      }
    } catch (error) {
      console.error('[DatabaseManagement] Ошибка перезагрузки пресетов:', error);
      alert(`Ошибка: ${error.message}`);
    }
  }

  async handleClearDatabase() {
    try {
      const db = this.getDB ? this.getDB() : null;
      if (!db) {
        alert('База данных недоступна');
        return;
      }

      if (db.clearDatabase) {
        db.clearDatabase();
        alert('База данных успешно очищена');
        // Перезагружаем страницу для применения изменений
        window.location.reload();
      } else {
        alert('Метод clearDatabase не найден в базе данных');
      }
    } catch (error) {
      console.error('[DatabaseManagement] Ошибка очистки базы данных:', error);
      alert(`Ошибка: ${error.message}`);
    }
  }

  async render() {
    if (!this.element) {
      await this.init();
    }
    return this.element;
  }
}

export default DatabaseManagement;

