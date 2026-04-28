import { Button } from '../form/index.js';
import { iconLoader, colorConversion } from '../../utils/index.js';
import { EmptyState } from '../display/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';

const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

class ActList {
  constructor(config = {}) {
    this.config = config; // Конфигурация для типа элементов
    this.items = [];
    this.element = null;
    this.getDB = null; // Функция для получения БД
    this.onCreateCard = config.onCreateCard || null; // Кастомная функция создания карточки
    this.onDelete = config.onDelete || null; // Кастомная функция удаления
    this.onEdit = config.onEdit || null; // Кастомная функция редактирования
  }

  // Устанавливаем функцию для получения БД (из Electron)
  setDB(getDBFunction) {
    this.getDB = getDBFunction;
  }

  // Устанавливаем элементы
  setItems(items) {
    this.items = items || [];
  }

  async init() {
    await this.render();
  }

  async render() {
    // Если элемент уже существует, очищаем его
    if (this.element) {
      this.element.innerHTML = '';
    } else {
      this.element = document.createElement('div');
      this.element.className = 'act-list';
    }
    
    const container = this.element;

    // Список элементов
    const list = document.createElement('div');
    list.className = 'act-list-items';
    
    if (this.items.length === 0) {
      const emptyState = new EmptyState({ 
        type: this.config.emptyType || 'elements',
        title: this.config.emptyText || null,
        message: this.config.emptyMessage || null
      });
      await emptyState.init();
      list.appendChild(emptyState.render());
    } else {
      for (const item of this.items) {
        const card = await this.createCard(item);
        if (card && card instanceof Node) {
          list.appendChild(card);
        }
      }
    }
    
    container.appendChild(list);
    return container;
  }

  async createCard(item) {
    // Если есть кастомная функция создания карточки, используем её
    if (this.onCreateCard) {
      return await this.onCreateCard(item, this);
    }

    // Стандартная реализация
    const card = document.createElement('div');
    card.className = 'act-card';
    
    // Делаем карточку кликабельной для редактирования
    if (this.onEdit) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', async (e) => {
        // Не открываем редактирование если клик был на кнопку
        if (!e.target.closest('.act-card-actions')) {
          // Воспроизводим звук выбора карточки
          if (window.audioSystem) {
            const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
            const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MENU_SELECT);
            if (sound) {
              window.audioSystem.play(sound);
            }
          }
          this.onEdit(item);
        }
      });
    }
    
    // Иконка
    const iconContainer = document.createElement('span');
    iconContainer.className = 'act-card-icon';
    
    // Получаем акцентный цвет из CSS переменной
    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
    };
    
    // Получаем иконку и цвет из элемента
    const icon = item.icon || null;
    const color = item.color || getAccentColor();
    
    // Устанавливаем цвет фона и иконки с учетом темы
    iconContainer.classList.add('has-color');
    applyIconBackground(iconContainer, color);
    
    if (icon) {
      try {
        const iconContent = await iconLoader.loadIcon(icon);
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        // Если иконка не найдена, показываем дефолтную иконку
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      // Если иконки нет, показываем дефолтную иконку
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    card.appendChild(iconContainer);
    
    // Контент карточки - однострочный layout
    const content = document.createElement('div');
    content.className = 'act-card-content';
    
    // Название слева
    const title = document.createElement('span');
    title.className = 'act-card-title';
    title.textContent = item.title || item.name || 'Без названия';
    content.appendChild(title);
    
    // Данные справа (если есть)
    if (item.data) {
      const dataContainer = document.createElement('div');
      dataContainer.className = 'act-card-data';
      
      if (Array.isArray(item.data)) {
        item.data.forEach(dataItem => {
          const dataElement = document.createElement('span');
          dataElement.className = 'act-card-data-item';
          if (typeof dataItem === 'string') {
            dataElement.textContent = dataItem;
          } else {
            dataElement.textContent = dataItem.text || '';
            if (dataItem.color) {
              dataElement.style.color = dataItem.color;
            }
            if (dataItem.fontWeight) {
              dataElement.style.fontWeight = dataItem.fontWeight;
            }
          }
          dataContainer.appendChild(dataElement);
        });
      } else if (typeof item.data === 'string') {
        const dataElement = document.createElement('span');
        dataElement.className = 'act-card-data-item';
        dataElement.textContent = item.data;
        dataContainer.appendChild(dataElement);
      }
      
      content.appendChild(dataContainer);
    }
    
    card.appendChild(content);
    
    // Кнопки действий
    if (this.onDelete || this.onEdit) {
      const actions = document.createElement('div');
      actions.className = 'act-card-actions';
      
      const buttons = [];
      
      if (this.onEdit) {
        buttons.push({ 
          iconName: 'edit', 
          onClick: (e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            this.onEdit(item);
          } 
        });
      }
      
      if (this.onDelete) {
        buttons.push({ 
          iconName: 'trash-2', 
          onClick: (e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            this.onDelete(item);
          } 
        });
      }
      
      // Создаем кнопки
      for (const btnConfig of buttons) {
        try {
          const btn = new Button({ ...btnConfig });
          await btn.init();
          const element = btn.element;
          if (element && element instanceof Node) {
            actions.appendChild(element);
          }
        } catch (error) {
          console.error('[ActList] Ошибка создания кнопки:', error, btnConfig);
        }
      }
      
      card.appendChild(actions);
    }
    
    return card;
  }

  // Обновить список
  async refresh() {
    await this.render();
  }
}

export default ActList;







