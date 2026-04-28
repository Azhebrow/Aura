import Section from '../layout/Section.js';
import RadioButton from '../form/RadioButton.js';
import { iconLoader, DayLockManager } from '../../utils/index.js';
import { taskCategoriesConfigService } from '../../system/services/index.js';
import { getCategoryColor, hexToRgba, getIconBackgroundOpacity, hslToHex, applyIconBackground } from '../../utils/colorConversion.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { EmptyState } from '../display/index.js';
import eventBus from '../../system/core/EventBus.js';

class TimerTasksList {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TimerTasksList] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[TimerTasksList] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.activeTab = 'tasks'; // 'tasks', 'escape', 'filling'
    this.tasks = [];
    this.selectedTask = null;
    
    // Маппинг названий для динамического заголовка
    this.titleMap = {
      escape: 'Задачи: Эскапизм',
      filling: 'Задачи: Наполнение',
      tasks: 'Задачи: Время'
    };
    this.currentDate = null;
    this.radioButton = null;
    this.onTaskSelect = null; // Callback для уведомления о выборе задачи
    this.currentPage = 1;
    this.itemsPerPage = 4;
    this.externalContainer = null; // Контейнер для списка задач, если он перемещен
    this.dayLockManager = null;
    this.lockIcon = null;
    this.contentElement = null;
    this.externalTitleElement = null; // Элемент для подзаголовка в монолитной секции (PageManager)
    this.eventUnsubscribes = []; // Массив функций отписки от событий
  }

  setExternalTitleElement(el) {
    this.externalTitleElement = el;
    if (el) {
      const title = this.titleMap[this.activeTab] || this.titleMap.escape;
      el.textContent = title;
    }
  }

  async init() {
    // Получаем начальную дату
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.currentDate = selectedDateState.getSelectedDateString();
    } else {
      const now = new Date();
      this.currentDate = now.toISOString().split('T')[0];
    }

    // Создаем RadioButton для переключения между вкладками
    const tasksIcon = await iconLoader.loadIcon(taskCategoriesConfigService.getIcon('time')); // Фокус — задачи времени
    const escapeIcon = await iconLoader.loadIcon('video');
    const fillingIcon = await iconLoader.loadIcon('book');
    
    this.radioButton = new RadioButton({
      name: 'timer-tasks-tab',
      iconOnly: true,
      value: this.activeTab,
      items: [
        { value: 'tasks', icon: tasksIcon },
        { value: 'escape', icon: escapeIcon },
        { value: 'filling', icon: fillingIcon }
      ]
    });

    // Обработчик изменения вкладки
    const radioInputs = this.radioButton.element.querySelectorAll('input[type="radio"]');
    this.radioInputs = radioInputs; // Сохраняем ссылку
    radioInputs.forEach(input => {
      input.addEventListener('change', async () => {
        if (input.checked) {
          this.activeTab = input.value;
          this.updateSectionTitle();
          this.currentPage = 1; // Сбрасываем на первую страницу при смене вкладки
          await this.loadTasks();
          await this.render();
        }
      });
    });

    // Инициализируем DayLockManager
    if (this.db) {
      this.dayLockManager = new DayLockManager(this.db);
    }

    // Создаем radio button элемент для заголовка
    const radioButtonElement = this.radioButton.render();
    
    // Создаем секцию с начальным названием
    const initialTitle = this.titleMap[this.activeTab] || this.titleMap.escape;
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
    this.contentElement.className = 'timer-tasks-list-content';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.gap = 'var(--space-sm)';
    // Важно: контент должен занимать всё оставшееся пространство под заголовком
    // и позволять дочерним спискам управлять собственной прокруткой
    this.contentElement.style.flex = '1 1 0%';
    this.contentElement.style.minHeight = '0';
    this.contentElement.style.maxHeight = '100%';
    this.contentElement.style.overflow = 'hidden';
    
    this.element.appendChild(this.contentElement);

    // Подписываемся на изменения даты
    if (selectedDateState) {
      selectedDateState.subscribe(async (date, dateString) => {
        this.currentDate = dateString;
        this.currentPage = 1; // Сбрасываем на первую страницу при смене даты
        await this.updateLockState();
        await this.loadTasks();
        await this.render();
      });
    }
    
    await this.updateLockState();

    // Загружаем задачи
    await this.loadTasks();
    await this.render();

    // Подписываемся на события обновления сессий таймера
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Подписка на изменения сессий таймера - обновляем текущие значения задач
    const unsubscribeSessionAdded = eventBus.on('timerSessionAdded', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.currentDate) {
        return; // Игнорируем изменения для других дат
      }

      // Обновляем задачу, к которой относится сессия
      const taskId = detail.data?.task_id || detail.taskId;
      if (taskId) {
        await this.updateTaskProgress(taskId);
      } else {
        // Fallback - перезагружаем все задачи
        await this.loadTasks();
        await this.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeSessionAdded);

    const unsubscribeSessionChanged = eventBus.on('timerSessionChanged', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.currentDate) {
        return;
      }

      const taskId = detail.data?.task_id || detail.taskId;
      if (taskId) {
        await this.updateTaskProgress(taskId);
      } else {
        await this.loadTasks();
        await this.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeSessionChanged);

    const unsubscribeSessionDeleted = eventBus.on('timerSessionDeleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.currentDate) {
        return;
      }

      const taskId = detail.data?.task_id || detail.taskId;
      if (taskId) {
        await this.updateTaskProgress(taskId);
      } else {
        await this.loadTasks();
        await this.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeSessionDeleted);
  }

  /**
   * Обновить прогресс конкретной задачи
   */
  async updateTaskProgress(taskId) {
    if (!this.db || !this.element) return;

    // Обновляем значение в массиве задач
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.currentValue = this.db.getTaskTimerTotal(this.currentDate, task.id);
    }

    // Находим карточку задачи в DOM
    const card = this.element.querySelector(`[data-task-id="${taskId}"]`);
    if (!card) {
      // Если карточка не найдена (возможно на другой странице пагинации), просто перезагружаем
      await this.loadTasks();
      await this.render();
      return;
    }

    // Обновляем отображение времени в карточке
    const valuesPart = card.querySelector('.tasks-task-values');
    if (valuesPart && task) {
      const targetValue = task.cfg_target_hours || 0;
      const currentHours = task.currentValue / 3600;
      
      const targetText = valuesPart.querySelector('span:first-child');
      const currentText = valuesPart.querySelector('span:last-child');
      
      if (targetText) targetText.textContent = `${targetValue}ч`;
      if (currentText) currentText.textContent = `${currentHours.toFixed(1)}ч`;
    }

    // Обновляем прогресс-бар
    const rightPart = card.querySelector('.tasks-task-right');
    if (rightPart && task) {
      rightPart.innerHTML = '';
      const cellsContainer = await this.createProgressCells(task);
      rightPart.appendChild(cellsContainer);
    }
  }

  /**
   * Создать ячейки прогресса для задачи (единый стиль с целями — goals-progress-cells)
   */
  async createProgressCells(task) {
    const cellsContainer = document.createElement('div');
    cellsContainer.className = 'goals-progress-cells';

    const targetValue = task.cfg_target_hours || 0;
    const currentValue = task.currentValue || 0;
    const currentHours = currentValue / 3600;

    const totalCells = targetValue > 0 ? Math.ceil(targetValue * 2) : Math.ceil(currentHours * 2) || 1;
    const exactFilledCells = currentHours * 2;
    const maxFilledCells = totalCells > 0 ? Math.min(exactFilledCells, totalCells) : 0;

    // Определяем цвет задачи
    let taskColor = null;
    if (this.activeTab === 'tasks') {
      taskColor = getCategoryColor('time');
    } else if (this.activeTab === 'escape') {
      taskColor = task.color || CfgColorPalette.getDefaultColor('leisure-escape');
    } else if (this.activeTab === 'filling') {
      taskColor = task.color || CfgColorPalette.getDefaultColor('leisure-filling');
    } else {
      taskColor = task.color || '#3b82f6';
    }

    if (taskColor && typeof taskColor === 'string' && taskColor.toLowerCase().startsWith('hsl')) {
      taskColor = hslToHex(taskColor);
    }

    if (!taskColor || (!taskColor.startsWith('#') && !taskColor.toLowerCase().startsWith('hsl'))) {
      taskColor = '#3b82f6';
    }

    const hexToRgbaForGradient = (hex, alpha) => {
      let cleanHex = hex.replace('#', '');
      if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
      }
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'goals-progress-cell';

      if (i < Math.floor(maxFilledCells)) {
        cell.style.backgroundColor = taskColor;
        cell.style.opacity = '1';
        cell.classList.add('completed');
      } else if (i < maxFilledCells) {
        const fillPercentage = (maxFilledCells - i) * 100;
        const filledColor = hexToRgbaForGradient(taskColor, 1);
        const emptyColor = hexToRgbaForGradient(taskColor, 0.2);
        cell.style.background = `linear-gradient(to right, ${filledColor} ${fillPercentage}%, ${emptyColor} ${fillPercentage}%)`;
      } else {
        cell.style.backgroundColor = taskColor;
        cell.style.opacity = '0.2';
      }

      cellsContainer.appendChild(cell);
    }

    return cellsContainer;
  }

  async loadTasks() {
    if (!this.db) {
      this.tasks = [];
      return;
    }

    try {
      let allTasks = [];

      if (this.activeTab === 'escape') {
        // Эскапизм: cfg_leisure_tasks где task_type = 'timer' и leisure_type = 'escape'
        const leisureTasks = this.db.getAll('cfg_leisure_tasks');
        allTasks = leisureTasks.filter(task => 
          task.task_type === 'timer' && task.leisure_type === 'escape'
        );
      } else if (this.activeTab === 'filling') {
        // Наполнение: cfg_leisure_tasks где task_type = 'timer' и leisure_type = 'filling'
        const leisureTasks = this.db.getAll('cfg_leisure_tasks');
        allTasks = leisureTasks.filter(task => 
          task.task_type === 'timer' && task.leisure_type === 'filling'
        );
      } else if (this.activeTab === 'tasks') {
        // Задачи: cfg_tasks где task_type = 'timer' и category_type = 'time'
        const tasks = this.db.getAll('cfg_tasks');
        allTasks = tasks.filter(task => 
          task.task_type === 'timer' && task.category_type === 'time'
        );
      }

      // Сортируем по level
      this.tasks = allTasks.sort((a, b) => (a.level || 0) - (b.level || 0));

      // Загружаем текущие значения для каждой задачи
      for (const task of this.tasks) {
        task.currentValue = this.db.getTaskTimerTotal(this.currentDate, task.id);
      }

      console.log(`[TimerTasksList] Загружено задач для вкладки ${this.activeTab}:`, this.tasks.length);
    } catch (error) {
      console.error('[TimerTasksList] Ошибка загрузки задач:', error);
      this.tasks = [];
    }
  }

  async render() {
    // Удаляем все старые списки если есть (ищем в contentElement — он может быть вынесен в монолитную секцию)
    const container = this.contentElement || this.element;
    const oldLists = container.querySelectorAll('.act-list');
    oldLists.forEach(list => list.remove());
    
    const oldListItems = container.querySelectorAll('.act-list-items');
    oldListItems.forEach(items => items.remove());
    
    const oldPagination = container.querySelectorAll('.timer-tasks-pagination');
    oldPagination.forEach(pag => pag.remove());
    
    // Создаем список в стиле act-list
    const list = document.createElement('div');
    list.className = 'act-list';
    list.style.flex = '1 1 0%';
    list.style.minHeight = '0';
    list.style.maxHeight = '100%';
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.overflow = 'hidden';
    
    const listItems = document.createElement('div');
    listItems.className = 'act-list-items';
    listItems.style.flex = '1 1 0%';
    listItems.style.minHeight = '0';
    listItems.style.maxHeight = '100%';
    listItems.style.overflowY = 'auto';
    listItems.style.overflowX = 'hidden';
    
    if (this.tasks.length === 0) {
      const typeMap = {
        'escape': 'tasks_escape',
        'filling': 'tasks_filling',
        'tasks': 'tasks_time'
      };
      const emptyState = new EmptyState({ type: typeMap[this.activeTab] || 'tasks' });
      await emptyState.init();
      listItems.appendChild(emptyState.render());
    } else {
      // Вычисляем задачи для текущей страницы
      const totalPages = Math.ceil(this.tasks.length / this.itemsPerPage);
      if (this.currentPage > totalPages) {
        this.currentPage = totalPages || 1;
      }
      
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      const tasksForPage = this.tasks.slice(startIndex, endIndex);
      
      // Создаем карточки для задач текущей страницы
      for (const task of tasksForPage) {
        const card = await this.createTaskCard(task);
        listItems.appendChild(card);
      }
    }
    
    list.appendChild(listItems);
    
    // Добавляем пагинацию если задач больше чем на одну страницу
    if (this.tasks.length > this.itemsPerPage) {
      const pagination = this.createPagination();
      pagination.style.flexShrink = '0';
      list.appendChild(pagination);
    }
    
    // Добавляем список в contentElement
    this.contentElement.appendChild(list);
  }

  createPagination() {
    const pagination = document.createElement('div');
    pagination.className = 'timer-tasks-pagination';
    pagination.style.display = 'flex';
    pagination.style.justifyContent = 'center';
    pagination.style.alignItems = 'center';
    pagination.style.gap = 'var(--space-xs)';
    pagination.style.padding = 'var(--space-sm)';
    pagination.style.flexShrink = '0';
    
    const totalPages = Math.ceil(this.tasks.length / this.itemsPerPage);
    
    // Кнопка "Назад"
    if (this.currentPage > 1) {
      const prevButton = document.createElement('button');
      prevButton.textContent = '‹';
      prevButton.className = 'nav-arrow-button nav-arrow-inline nav-arrow-compact pagination-button';
      prevButton.addEventListener('click', async () => {
        // Воспроизводим звук переключения
        if (window.audioSystem) {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
          const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_PREV);
          if (sound) {
            window.audioSystem.play(sound);
          }
        }
        this.currentPage--;
        this.render();
      });
      pagination.appendChild(prevButton);
    }
    
    // Номера страниц
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i.toString();
      pageButton.className = 'pagination-button';
      
      const isActive = i === this.currentPage;
      pageButton.style.cssText = `
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        border-radius: var(--radius);
        border: 1px solid ${isActive ? 'var(--color-accent, #3b82f6)' : 'var(--color-border, rgba(255, 255, 255, 0.1))'};
        background-color: ${isActive ? 'var(--color-accent, #3b82f6)' : 'var(--color-surface, rgba(255, 255, 255, 0.05))'};
        color: ${isActive ? 'white' : 'var(--text-primary, rgba(255, 255, 255, 0.9))'};
        cursor: pointer;
        font-size: var(--font-size-sm, 0.875rem);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      `;
      
      if (!isActive) {
        pageButton.addEventListener('mouseenter', () => {
          pageButton.style.backgroundColor = 'var(--color-element-hover, rgba(255, 255, 255, 0.1))';
        });
        pageButton.addEventListener('mouseleave', () => {
          pageButton.style.backgroundColor = 'var(--color-surface, rgba(255, 255, 255, 0.05))';
        });
      }
      
      pageButton.addEventListener('click', () => {
        this.currentPage = i;
        this.render();
      });
      
      pagination.appendChild(pageButton);
    }
    
    // Кнопка "Вперед"
    if (this.currentPage < totalPages) {
      const nextButton = document.createElement('button');
      nextButton.textContent = '›';
      nextButton.className = 'nav-arrow-button nav-arrow-inline nav-arrow-compact pagination-button';
      nextButton.addEventListener('click', async () => {
        // Воспроизводим звук переключения
        if (window.audioSystem) {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
          const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_NEXT);
          if (sound) {
            window.audioSystem.play(sound);
          }
        }
        this.currentPage++;
        this.render();
      });
      pagination.appendChild(nextButton);
    }
    
    return pagination;
  }

  async createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'act-card';
    card.dataset.taskId = task.id;
    card.style.cursor = 'pointer';

    // Подсвечиваем выбранную задачу
    if (this.selectedTask && this.selectedTask.id === task.id) {
      card.classList.add('selected');
    }

    // Определяем цвет задачи
    let taskColor = null;
    
    if (this.activeTab === 'tasks') {
      // Для вкладки "Задачи" используем цвет категории time
      taskColor = getCategoryColor('time');
    } else if (this.activeTab === 'escape') {
      // Для эскапизма используем цвет из палитры или дефолтный
      if (task.color) {
        taskColor = task.color;
      } else {
        taskColor = CfgColorPalette.getDefaultColor('leisure-escape');
      }
    } else if (this.activeTab === 'filling') {
      // Для наполнения используем цвет из палитры или дефолтный
      if (task.color) {
        taskColor = task.color;
      } else {
        taskColor = CfgColorPalette.getDefaultColor('leisure-filling');
      }
    } else {
      taskColor = task.color || '#3b82f6';
    }
    
    // Конвертируем HSL в HEX если нужно
    if (taskColor && typeof taskColor === 'string' && taskColor.toLowerCase().startsWith('hsl')) {
      taskColor = hslToHex(taskColor);
    }
    
    // Убеждаемся, что цвет в формате HEX
    if (!taskColor || (!taskColor.startsWith('#') && !taskColor.toLowerCase().startsWith('hsl'))) {
      taskColor = '#3b82f6';
    }
    
    // Контент карточки - разделен на две равные части (50/50)
    const content = document.createElement('div');
    content.className = 'act-card-content';
    content.style.flex = '1';
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '0';
    content.style.minHeight = 'auto';
    content.style.width = '100%';
    
    const targetValue = task.cfg_target_hours || 0;
    const currentValue = task.currentValue || 0; // в секундах
    const currentHours = currentValue / 3600;
    
    // Левая часть (50% ширины): иконка, название, целевое значение
    const leftPart = document.createElement('div');
    leftPart.style.display = 'flex';
    leftPart.style.alignItems = 'center';
    leftPart.style.gap = 'var(--space-sm)';
    leftPart.style.flex = '0 0 50%';
    leftPart.style.width = '50%';
    leftPart.style.minWidth = '0';
    leftPart.style.minHeight = 'auto';
    leftPart.style.paddingRight = 'var(--space-md)';
    leftPart.setAttribute('data-part', 'left');
    
    // Иконка задачи (стандартный размер)
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color';
    applyIconBackground(iconWrapper, taskColor);
    iconWrapper.style.setProperty('--icon-color', taskColor);
    iconWrapper.style.flexShrink = '0';
    
    // Загружаем иконку
    if (task.icon) {
      try {
        const iconContent = await iconLoader.loadIcon(task.icon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    // Название задачи
    const title = document.createElement('span');
    title.className = 'act-card-title';
    title.textContent = task.title || 'Без названия';
    title.style.flex = '1 1 0';
    title.style.minWidth = '0';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.style.whiteSpace = 'nowrap';
    title.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    
    // Цифры (цель и текущее)
    const valuesPart = document.createElement('div');
    valuesPart.style.display = 'flex';
    valuesPart.style.alignItems = 'center';
    valuesPart.style.gap = 'var(--space-xs)';
    valuesPart.style.flexShrink = '0';
    valuesPart.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    valuesPart.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    
    const targetText = document.createElement('span');
    targetText.textContent = `${targetValue}ч`;
    
    const separator = document.createElement('span');
    separator.textContent = '/';
    separator.style.opacity = '0.5';
    
    const currentText = document.createElement('span');
    currentText.textContent = `${currentHours.toFixed(1)}ч`;
    
    valuesPart.appendChild(targetText);
    valuesPart.appendChild(separator);
    valuesPart.appendChild(currentText);
    
    // Добавляем элементы в левую часть
    leftPart.appendChild(iconWrapper);
    leftPart.appendChild(title);
    leftPart.appendChild(valuesPart);
    
    // Правая часть (50% ширины): прогресс-бары (единый стиль с целями)
    const rightPart = document.createElement('div');
    rightPart.className = 'tasks-task-right';
    rightPart.style.display = 'flex';
    rightPart.style.alignItems = 'center';
    rightPart.style.flex = '0 0 50%';
    rightPart.style.width = '50%';
    rightPart.style.minWidth = '0';
    rightPart.style.minHeight = 'auto';
    rightPart.style.padding = '0 var(--space-sm)';
    
    // Создаем ячейки прогресса
    const cellsContainer = await this.createProgressCells(task);
    
    // Добавляем контейнер ячеек в правую часть
    rightPart.appendChild(cellsContainer);
    
    // Собираем обе части в content
    content.appendChild(leftPart);
    content.appendChild(rightPart);
    
    card.appendChild(content);
    
    // Обработчик клика на карточку для выбора задачи
    card.addEventListener('click', async () => {
      // Воспроизводим звук выбора задачи
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MENU_SELECT);
        if (sound) {
          window.audioSystem.play(sound);
        }
      }
      this.selectTask(task);
    });
    
    return card;
  }

  updateSectionTitle() {
    const newTitle = this.titleMap[this.activeTab] || this.titleMap.escape;
    if (this.section) this.section.updateTitle(newTitle);
    if (this.externalTitleElement) this.externalTitleElement.textContent = newTitle;
  }

  async setActiveTab(tabName) {
    if (!['escape', 'filling', 'tasks'].includes(tabName)) {
      console.warn(`[TimerTasksList] Некорректное имя вкладки: ${tabName}`);
      return;
    }

    this.activeTab = tabName;
    this.updateSectionTitle();
    this.currentPage = 1; // Сбрасываем на первую страницу при смене вкладки
    
    // Обновляем радио-кнопку
    if (this.radioInputs) {
      this.radioInputs.forEach(input => {
        if (input.value === tabName) {
          input.checked = true;
        }
      });
    }
    
    // Загружаем и рендерим задачи
    await this.loadTasks();
    await this.render();
    
    console.log(`[TimerTasksList] Активирована вкладка: ${tabName}`);
  }

  async setActiveTabAndSelectTask(tabName, task) {
    // Устанавливаем активную вкладку
    await this.setActiveTab(tabName);
    
    // Ищем задачу по ID
    const foundTask = this.tasks.find(t => t.id === task.id);
    
    if (foundTask) {
      // Выбираем задачу
      this.selectTask(foundTask);
    } else {
      console.warn(`[TimerTasksList] Задача ${task.id} не найдена во вкладке ${tabName}`);
    }
  }

  selectTask(task) {
    this.selectedTask = task;
    
    // Обновляем подсветку
    this.render();
    
    // Уведомляем о выборе задачи
    if (this.onTaskSelect) {
      this.onTaskSelect(task);
    }
    
    console.log(`[TimerTasksList] Выбрана задача:`, task);
  }

  setOnTaskSelect(callback) {
    this.onTaskSelect = callback;
  }

  getFirstTask() {
    if (this.tasks.length > 0) {
      return this.tasks[0];
    }
    return null;
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
    // Очистка при необходимости
  }
}

export default TimerTasksList;



