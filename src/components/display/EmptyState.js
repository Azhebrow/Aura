import { iconLoader } from '../../utils/index.js';
import { Button } from '../form/index.js';

class EmptyState {
  constructor(config = {}) {
    this.type = config.type || 'elements'; // Тип пустого состояния
    this.title = config.title || null; // Кастомный заголовок
    this.message = config.message || null; // Кастомное сообщение
    this.icon = config.icon || null; // Кастомная иконка
    this.button = config.button || null; // Конфигурация кнопки { text, iconName, onClick }
    this.element = null;
    this.initialized = false;
    
    // Конфигурация для разных типов
    this.typeConfigs = {
      transactions: {
        icon: 'wallet',
        title: 'Нет транзакций',
        message: 'Нажмите «+» в заголовке, чтобы добавить первую транзакцию'
      },
      plans: {
        icon: 'calendar',
        title: 'Нет планов на день',
        message: 'Введите план в поле выше и нажмите Enter'
      },
      diary: {
        icon: 'book',
        title: 'Нет записей за этот месяц',
        message: 'Создайте запись, выбрав дату в календаре'
      },
      rituals_morning: {
        icon: 'sun',
        title: 'Нет утренних ритуалов',
        message: 'Добавьте утренние ритуалы в настройках'
      },
      rituals_evening: {
        icon: 'moon',
        title: 'Нет вечерних ритуалов',
        message: 'Добавьте вечерние ритуалы в настройках'
      },
      sessions: {
        icon: 'clock',
        title: 'Нет сессий за этот день',
        message: 'Запустите таймер для отслеживания времени'
      },
      tasks_escape: {
        icon: 'video',
        title: 'Нет задач для вкладки "Эскапизм"',
        message: 'Добавьте задачи эскапизма в настройках'
      },
      tasks_filling: {
        icon: 'book',
        title: 'Нет задач для вкладки "Наполнение"',
        message: 'Добавьте задачи наполнения в настройках'
      },
      tasks_time: {
        icon: 'target',
        title: 'Нет задач для вкладки "Задачи"',
        message: 'Добавьте задачи времени в настройках'
      },
      tasks: {
        icon: 'square-check',
        title: 'Нет задач',
        message: 'Добавьте задачи в настройках'
      },
      goals: {
        icon: 'target',
        title: 'Нет целей',
        message: 'Создайте первую цель для отслеживания прогресса'
      },
      goals_select: {
        icon: 'target',
        title: 'Выберите цель',
        message: 'Выберите цель из списка слева'
      },
      stages: {
        icon: 'layers',
        title: 'Нет этапов',
        message: 'Добавьте этапы для выбранной цели'
      },
      stages_select: {
        icon: 'layers',
        title: 'Выберите этап',
        message: 'Выберите этап из списка в центре'
      },
      tasks_select: {
        icon: 'square-check',
        title: 'Выберите этап',
        message: 'Выберите этап, чтобы увидеть задачи'
      },
      categories: {
        icon: 'folder',
        title: 'Нет категорий',
        message: 'Добавьте категории в настройках'
      },
      elements: {
        icon: 'inbox',
        title: 'Нет элементов',
        message: 'Добавьте элементы, используя кнопку "+"'
      },
      nutrition: {
        icon: 'apple',
        title: 'Нет записей о питании',
        message: 'Нажмите «+» в заголовке, чтобы добавить первую запись'
      },
      products: {
        icon: 'package',
        title: 'Нет продуктов',
        message: 'Добавьте продукты в настройках'
      },
      presets: {
        icon: 'layers',
        title: 'Нет пресетов',
        message: 'Добавьте пресеты в настройках'
      }
    };
  }

  async init() {
    if (this.initialized) {
      return this.element;
    }

    const container = document.createElement('div');
    container.className = 'empty-state';
    
    // Получаем конфигурацию для типа
    const typeConfig = this.typeConfigs[this.type] || this.typeConfigs.elements;
    
    // Определяем иконку
    const iconName = this.icon || typeConfig.icon;
    
    // Загружаем иконку
    let iconContent = '';
    try {
      iconContent = await iconLoader.loadIcon(iconName);
    } catch (e) {
      console.warn(`[EmptyState] Иконка "${iconName}" не найдена, используем fallback`);
      // Fallback иконка
      try {
        iconContent = await iconLoader.loadIcon('inbox');
      } catch (e2) {
        // Если и fallback не загрузился, используем простой круг
        iconContent = '<circle cx="12" cy="12" r="10"></circle>';
      }
    }
    
    // Иконка
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'empty-state-icon';
    iconWrapper.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        ${iconContent}
      </svg>
    `;
    container.appendChild(iconWrapper);
    
    // Заголовок
    const title = document.createElement('h3');
    title.className = 'empty-state-title';
    title.textContent = this.title || typeConfig.title;
    container.appendChild(title);
    
    // Сообщение
    const message = document.createElement('p');
    message.className = 'empty-state-message';
    message.textContent = this.message || typeConfig.message;
    container.appendChild(message);
    
    // Кнопка (если указана)
    if (this.button) {
      const buttonWrapper = document.createElement('div');
      buttonWrapper.className = 'empty-state-button-wrapper';
      
      const button = new Button({
        text: this.button.text || 'Добавить',
        iconName: this.button.iconName || null,
        onClick: this.button.onClick || null
      });
      await button.init();
      const buttonElement = button.element || await button.render();
      if (buttonElement && buttonElement instanceof HTMLElement) {
        buttonElement.style.marginTop = 'var(--space-md)';
        buttonWrapper.appendChild(buttonElement);
        container.appendChild(buttonWrapper);
      } else {
        console.warn('[EmptyState] Не удалось создать кнопку', buttonElement);
      }
    }
    
    this.element = container;
    this.initialized = true;
    
    return this.element;
  }

  render() {
    if (!this.initialized) {
      console.warn('[EmptyState] Компонент не инициализирован, вызывайте init() сначала');
      return document.createElement('div');
    }
    return this.element;
  }
}

export default EmptyState;

