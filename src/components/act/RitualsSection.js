import Section from '../layout/Section.js';
import RadioButton from '../form/RadioButton.js';
import Checkbox from '../form/Checkbox.js';
import { iconLoader, colorConversion } from '../../utils/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';
import { EmptyState } from '../display/index.js';
import DayLockManager from '../../system/utils/DayLockManager.js';
import eventBus from '../../system/core/EventBus.js';

const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

class RitualsSection {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[RitualsSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[RitualsSection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.ritualType = 'morning';
    this.rituals = [];
    this.completedStatuses = new Map();
    
    // Маппинг названий для динамического заголовка
    this.titleMap = {
      morning: 'Утренние ритуалы',
      evening: 'Вечерние ритуалы'
    };
    this.currentDate = null;
    this.unsubscribe = null;
    this.radioButton = null;
    this.scrollContainer = null;
    this.dayLockManager = null;
    this.lockIcon = null;
    this.contentElement = null;
    this.eventUnsubscribes = []; // Массив функций отписки от событий
  }

  async init() {
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.currentDate = selectedDateState.getSelectedDateString();
    } else {
      const now = new Date();
      this.currentDate = now.toISOString().split('T')[0];
    }

    if (this.db) {
      this.dayLockManager = new DayLockManager(this.db);
    }

    const sunIcon = await iconLoader.loadIcon('sun');
    const moonIcon = await iconLoader.loadIcon('moon');
    
    this.radioButton = new RadioButton({
      name: 'ritual-type',
      iconOnly: true,
      value: this.ritualType, // Устанавливаем текущий тип
      items: [
        { value: 'morning', icon: sunIcon },
        { value: 'evening', icon: moonIcon }
      ]
    });

    const radioInputs = this.radioButton.element.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      input.addEventListener('change', async () => {
        if (input.checked && !this.dayLockManager?.getIsLocked()) {
          this.ritualType = input.value;
          this.updateSectionTitle();
          await this.loadRituals();
          await this.render();
          this.updateRitualsBadge();
        }
      });
    });

    this.radioInputs = radioInputs;

    // Создаем radio button элемент для заголовка
    const radioButtonElement = this.radioButton.render();
    
    // Создаем секцию с начальным названием
    const initialTitle = this.titleMap[this.ritualType] || this.titleMap.morning;
    this.section = new Section({ 
      title: initialTitle,
      titleActions: radioButtonElement
    });
    this.element = this.section.render();
    
    // Создаем иконку блокировки и добавляем её слева от названия
    if (this.dayLockManager) {
      this.lockIcon = await this.dayLockManager.createLockIcon();
      this.lockIcon.style.display = 'none';
      this.section.setLockIcon(this.lockIcon);
    }
    
    // Создаем контейнер для контента
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'rituals-content';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = 'var(--space-md)';
    
    this.element.appendChild(this.contentElement);

    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.currentDate = dateString;
        await this.updateLockState();
        await this.loadRituals();
        await this.render();
        this.updateRitualsBadge();
      });
    }
    
    await this.updateLockState();

    await this.loadRituals();
    await this.render();
    this.updateRitualsBadge();

    // Подписываемся на события обновления ритуалов
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Подписка на изменения ритуалов (для обновления из других мест)
    const unsubscribeRitualCompleted = eventBus.on('ritualCompleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.currentDate) {
        return; // Игнорируем изменения для других дат
      }

      // Проверяем тип ритуала
      const ritualType = detail.data?.ritualType || detail.ritualType;
      if (ritualType && ritualType !== this.ritualType) {
        return; // Игнорируем изменения для другого типа ритуалов
      }

      // Если есть ID ритуала - обновляем только его карточку
      const ritualId = detail.data?.ritualId || detail.ritualId;
      if (ritualId) {
        await this.updateRitualCard(ritualId);
        this.updateRitualsBadge();
      } else {
        // Fallback - полная перезагрузка
        await this.loadRituals();
        await this.render();
        this.updateRitualsBadge();
      }
    });
    this.eventUnsubscribes.push(unsubscribeRitualCompleted);

    // Подписка на изменения задач (ритуалы влияют на задачи)
    const unsubscribeTaskChange = eventBus.on('taskProgressChanged', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.currentDate) {
        return;
      }
      // Если изменились задачи, которые зависят от ритуалов, обновляем отображение
      await this.loadRituals();
      await this.render();
      this.updateRitualsBadge();
    });
    this.eventUnsubscribes.push(unsubscribeTaskChange);
    
    // Подписка на изменения конфигурации ритуалов (добавление/удаление/изменение в настройках)
    const unsubscribeRitualChanged = eventBus.on('ritualChanged', async (detail) => {
      const ritualType = detail.data?.ritualType;
      // Обновляем только если это наш тип ритуалов
      if (!ritualType || ritualType === this.ritualType) {
        await this.loadRituals();
        await this.render();
        this.updateRitualsBadge();
      }
    });
    this.eventUnsubscribes.push(unsubscribeRitualChanged);
  }

  /**
   * Обновить карточку ритуала по ID
   */
  async updateRitualCard(ritualId) {
    if (!this.db || !this.contentElement) return;

    // Обновляем статус в кэше
    const completedRituals = this.ritualType === 'morning' 
      ? this.db.getRitualsMorning(this.currentDate)
      : this.db.getRitualsEvening(this.currentDate);
    
    const ritualStatus = completedRituals.find(r => r.ritual_id === ritualId);
    const isCompleted = ritualStatus && ritualStatus.completed === 1;
    this.completedStatuses.set(ritualId, isCompleted);

    // Находим карточку в DOM
    const card = this.contentElement.querySelector(`[data-ritual-id="${ritualId}"]`);
    if (!card) {
      await this.loadRituals();
      await this.render();
      return;
    }

    // Обновляем чекбокс
    const checkboxInput = card.querySelector('input[type="checkbox"]');
    if (checkboxInput) {
      checkboxInput.checked = isCompleted;
    }

    // Обновляем стили текста
    const title = card.querySelector('.act-card-title');
    if (title) {
      title.style.color = isCompleted ? 'var(--color-on-surface-secondary)' : 'var(--color-on-surface)';
      title.style.textDecoration = isCompleted ? 'line-through' : 'none';
    }

    // Обновляем бейдж
    this.updateRitualsBadge();
  }

  async loadRituals() {
    if (!this.db) {
      this.rituals = [];
      this.completedStatuses.clear();
      return;
    }

    try {
      const tableName = this.ritualType === 'morning' ? 'cfg_rituals_morning' : 'cfg_rituals_evening';
      const allRituals = this.db.getAll(tableName);
      
      // Фильтруем: активные (active = 1 или null/undefined, что означает активный) и с ID
      this.rituals = allRituals.filter(r => {
        // Проверяем наличие ID
        if (!r.id) {
          return false;
        }
        // Проверяем active: 1 = активный, null/undefined = активный (DEFAULT 1), 0 = неактивный
        const isActive = r.active === 1 || r.active === null || r.active === undefined;
        return isActive;
      });
      
      // Проверяем, есть ли ритуалы без ID или неактивные
      const ritualsWithoutId = allRituals.filter(r => !r.id);
      const inactiveRituals = allRituals.filter(r => r.id && r.active === 0);
      if (ritualsWithoutId.length > 0) {
        console.warn(`[RitualsSection] Найдено ${ritualsWithoutId.length} ритуалов без ID. Они будут пропущены.`, ritualsWithoutId);
      }
      if (inactiveRituals.length > 0) {
        console.log(`[RitualsSection] Найдено ${inactiveRituals.length} неактивных ритуалов. Они будут пропущены.`);
      }
      
      this.rituals.sort((a, b) => (a.level || 0) - (b.level || 0));

      this.completedStatuses.clear();
      const completedRituals = this.ritualType === 'morning' 
        ? this.db.getRitualsMorning(this.currentDate)
        : this.db.getRitualsEvening(this.currentDate);

      completedRituals.forEach(r => {
        if (r.completed === 1) {
          this.completedStatuses.set(r.ritual_id, true);
        }
      });

      console.log(`[RitualsSection] Загружено ${this.rituals.length} ${this.ritualType === 'morning' ? 'утренних' : 'вечерних'} ритуалов для ${this.currentDate}`);
    } catch (error) {
      console.error('[RitualsSection] Ошибка загрузки ритуалов:', error);
      this.rituals = [];
      this.completedStatuses.clear();
    }
  }

  updateRitualsBadge() {
    if (!this.section) return;
    
    const completed = Array.from(this.completedStatuses.values()).filter(v => v === true).length;
    const total = this.rituals.length;
    
    if (total > 0) {
      this.section.updateBadges([
        { text: `${completed} из ${total}` }
      ]);
    } else {
      this.section.updateBadges(null);
    }
  }

  async render() {
    if (!this.contentElement) return;
    
    // Очищаем контент
    this.contentElement.innerHTML = '';

    if (this.rituals.length === 0) {
      const emptyState = new EmptyState({ type: 'rituals' });
      await emptyState.init();
      this.contentElement.appendChild(emptyState.render());
      return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'rituals-list';
    listContainer.style.display = 'flex';
    listContainer.style.flexDirection = 'column';
    listContainer.style.gap = 'var(--space-sm)';
    listContainer.style.overflowY = 'auto';
    listContainer.style.flex = '1';
    listContainer.style.minHeight = '0';

    for (const ritual of this.rituals) {
      const card = await this.createRitualCard(ritual);
      if (card) { // Проверяем, что карточка создана (не null)
        listContainer.appendChild(card);
      }
    }

    this.contentElement.appendChild(listContainer);
    this.scrollContainer = listContainer;
  }

  async createRitualCard(ritual) {
    // Проверяем, что у ритуала есть ID
    if (!ritual.id) {
      console.error('[RitualsSection] Нельзя создать карточку ритуала без ID:', ritual);
      return null;
    }
    
    const card = document.createElement('div');
    card.className = 'act-card';
    card.dataset.ritualId = ritual.id; // Добавляем data-атрибут для быстрого поиска
    card.style.cursor = 'pointer';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'stretch';
    card.style.gap = '0';
    
    const isCompleted = this.completedStatuses.get(ritual.id) === true;
    
    // ВЕРХНИЙ УРОВЕНЬ: иконка, название, чекбокс
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = 'var(--space-md)';
    
    // Иконка слева
    const iconContainer = document.createElement('span');
    iconContainer.className = 'act-card-icon';
    
    // Получаем акцентный цвет
    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
    };
    
    const color = getAccentColor();
    iconContainer.classList.add('has-color');
    applyIconBackground(iconContainer, color);
    
    if (ritual.icon) {
      try {
        const iconContent = await iconLoader.loadIcon(ritual.icon);
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        console.warn(`[RitualsSection] Не удалось загрузить иконку ${ritual.icon}:`, e);
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    topRow.appendChild(iconContainer);
    
    // Название по центру (flex: 1)
    const title = document.createElement('span');
    title.className = 'act-card-title';
    title.textContent = ritual.title || '';
    title.style.flex = '1';
    title.style.minWidth = '0';
    title.style.color = isCompleted ? 'var(--color-on-surface-secondary)' : 'var(--color-on-surface)';
    title.style.textDecoration = isCompleted ? 'line-through' : 'none';
    topRow.appendChild(title);
    
    // Чекбокс справа
    const checkbox = new Checkbox({ checked: isCompleted });
    await checkbox.init();
    const checkboxElement = checkbox.render();
    checkboxElement.style.flexShrink = '0';
    checkboxElement.style.width = 'var(--height-control)';
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');
    
    const handleToggle = async (e) => {
      if (e) {
        e.stopPropagation();
      }
      if (!this.lockManager?.getIsLocked()) {
        // Проверяем, что у ритуала есть ID
        if (!ritual.id) {
          console.error('[RitualsSection] Нельзя сохранить статус ритуала без ID:', ritual);
          checkboxInput.checked = isCompleted; // Возвращаем чекбокс в исходное состояние
          return;
        }
        const newChecked = !isCompleted;
        await this.toggleRitual(ritual.id, newChecked);
      } else {
        checkboxInput.checked = isCompleted;
      }
    };
    
    checkboxInput.addEventListener('change', handleToggle);
    topRow.appendChild(checkboxElement);
    
    card.appendChild(topRow);
    
    // РАЗДЕЛИТЕЛЬНАЯ ЛИНИЯ (только если есть описание)
    if (ritual.description) {
      const divider = document.createElement('div');
      divider.style.width = '100%';
      divider.style.height = '1px';
      divider.style.backgroundColor = 'var(--color-border)';
      divider.style.marginTop = 'var(--space-sm)';
      card.appendChild(divider);
      
      // НИЖНИЙ УРОВЕНЬ: описание на всю ширину
      const bottomRow = document.createElement('div');
      bottomRow.style.display = 'flex';
      bottomRow.style.width = '100%';
      bottomRow.style.marginTop = 'var(--space-sm)';
      
      const description = document.createElement('span');
      description.className = 'act-card-description';
      description.style.fontSize = 'var(--font-size-sm)';
      description.style.color = 'var(--color-on-surface-secondary)';
      description.style.lineHeight = '1.4';
      description.style.width = '100%';
      description.textContent = ritual.description;
      bottomRow.appendChild(description);
      
      card.appendChild(bottomRow);
    }
    
    // Клик по всей карточке работает как клик по чекбоксу
    card.addEventListener('click', (e) => {
      // Не срабатывает если клик был на чекбокс (он сам обработает)
      if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('label')) {
        e.preventDefault();
        e.stopPropagation();
        checkboxInput.click();
      }
    });
    
    return card;
  }

  async toggleRitual(ritualId, completed) {
    if (!this.db || this.lockManager?.getIsLocked()) {
      return;
    }

    // Проверяем, что ritualId не null и не undefined
    if (!ritualId) {
      console.error('[RitualsSection] Нельзя сохранить статус ритуала: ritualId отсутствует');
      return;
    }

    try {
      if (this.ritualType === 'morning') {
        this.db.saveRitualMorning(this.currentDate, ritualId, completed);
      } else {
        this.db.saveRitualEvening(this.currentDate, ritualId, completed);
      }

      this.completedStatuses.set(ritualId, completed);
      await this.render();
      this.updateRitualsBadge();
      
      // Небольшая задержка для гарантии, что данные сохранены и пересчитаны в БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ сохранения
        eventBus.emit('ritualCompleted', {
          action: 'update',
          data: {
            ritualId: ritualId,
            ritualType: this.ritualType,
            completed: completed,
            date: this.currentDate
          },
          affectedIds: [ritualId],
          date: this.currentDate
        });

        // Также отправляем событие taskProgressChanged для совместимости
        eventBus.emit('taskProgressChanged', {
          action: 'update',
          data: {
            date: this.currentDate,
            ritualType: this.ritualType
          },
          date: this.currentDate
        });
      }, 0);
      
      console.log(`[RitualsSection] Ритуал ${ritualId} ${completed ? 'выполнен' : 'не выполнен'} для ${this.currentDate}`);
    } catch (error) {
      console.error('[RitualsSection] Ошибка сохранения статуса ритуала:', error);
    }
  }

  async setRitualType(type) {
    if (type !== 'morning' && type !== 'evening') {
      console.warn('[RitualsSection] Неверный тип ритуала:', type);
      return;
    }

    this.ritualType = type;
    this.updateSectionTitle();
    
    if (this.radioInputs) {
      this.radioInputs.forEach(input => {
        input.checked = input.value === type;
      });
    }

    await this.loadRituals();
    await this.render();
    this.updateRitualsBadge();
    console.log(`[RitualsSection] Тип ритуала установлен: ${type}, загружено ${this.rituals.length} ритуалов`);
  }

  updateSectionTitle() {
    if (!this.section) return;
    const newTitle = this.titleMap[this.ritualType] || this.titleMap.morning;
    this.section.updateTitle(newTitle);
  }

  async updateLockState() {
    if (!this.dayLockManager || !this.element) return;
    
    await this.dayLockManager.updateLockState(
      this.element,
      this.contentElement,
      this.lockIcon,
      this.currentDate
    );
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    // Отписываемся от всех событий
    this.eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribes = [];
  }
}

export default RitualsSection;

