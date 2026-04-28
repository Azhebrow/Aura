import Section from '../layout/Section.js';
import Button from '../form/Button.js';
import { iconLoader, DayLockManager, colorConversion, confirmWithSound } from '../../utils/index.js';
const { hexToRgba, getIconBackgroundOpacity, applyIconBackground, getCategoryColor, hslToHex } = colorConversion;
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { EmptyState } from '../display/index.js';
import eventBus from '../../system/core/EventBus.js';

class TimerSessionsList {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TimerSessionsList] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[TimerSessionsList] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.sessions = [];
    this.currentDate = null;
    this.unsubscribe = null;
    this.scrollContainer = null;
    this.dayLockManager = null;
    this.lockIcon = null;
    this.contentElement = null;
    this.eventUnsubscribes = []; // Массив функций отписки от событий
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

    // Инициализируем DayLockManager
    if (this.db) {
      this.dayLockManager = new DayLockManager(this.db);
    }

    // Создаем кнопку добавления (как в секции «Финансы»)
    const addButton = new Button({
      iconName: 'plus'
    });
    await addButton.init();
    addButton.element.className = 'btn btn-icon';
    addButton.element.style.flexShrink = '0';
    addButton.element.style.width = 'var(--height-control)';
    addButton.element.style.minWidth = 'var(--height-control)';
    addButton.element.style.maxWidth = 'var(--height-control)';
    addButton.element.addEventListener('click', async () => {
      const { default: TimerSessionModal } = await import('./TimerSessionModal.js');
      await TimerSessionModal.open(
        { date: this.currentDate },
        async (sessionId, formData) => {
          if (!sessionId) {
            await this.addSession(formData);
          } else {
            await this.updateSession(sessionId, formData);
          }
        }
      );
    });

    // Создаем секцию с кнопкой добавления
    this.section = new Section({
      title: 'История',
      titleActions: addButton.element
    });
    this.element = this.section.render();
    
    if (this.dayLockManager) {
      this.lockIcon = await this.dayLockManager.createLockIcon();
      this.lockIcon.style.display = 'none';
      this.section.setLockIcon(this.lockIcon);
    }
    
    // Создаем контейнер для контента
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'timer-sessions-list-content';
    this.element.appendChild(this.contentElement);

    // Подписываемся на изменения даты
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.currentDate = dateString;
        await this.updateLockState();
        await this.loadSessions();
        await this.render();
        this.updateTotalTimeBadge();
      });
    }
    
    await this.updateLockState();

    // Загружаем сессии
    await this.loadSessions();
    await this.render();

    // Подписываемся на события обновления сессий
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Вспомогательная функция для нормализации даты
    const normalizeDate = (date) => {
      if (!date) return null;
      if (typeof date === 'string') {
        return date.split('T')[0]; // Берем только дату без времени
      }
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      return String(date).split('T')[0];
    };

    // Подписка на добавление сессий
    const unsubscribeSessionAdded = eventBus.on('timerSessionAdded', async (detail) => {
      const eventDate = normalizeDate(detail.date || (detail.data && detail.data.date));
      const currentDateNormalized = normalizeDate(this.currentDate);
      
      if (eventDate && eventDate !== currentDateNormalized) {
        return; // Игнорируем изменения для других дат
      }
      await this.loadSessions();
      await this.render();
      this.updateTotalTimeBadge();
    });
    this.eventUnsubscribes.push(unsubscribeSessionAdded);

    // Подписка на изменение сессий
    const unsubscribeSessionChanged = eventBus.on('timerSessionChanged', async (detail) => {
      const eventDate = normalizeDate(detail.date || (detail.data && detail.data.date));
      const currentDateNormalized = normalizeDate(this.currentDate);
      
      if (eventDate && eventDate !== currentDateNormalized) {
        return;
      }
      
      // Всегда перезагружаем сессии для гарантии актуальности данных
      await this.loadSessions();
      await this.render();
      this.updateTotalTimeBadge();
    });
    this.eventUnsubscribes.push(unsubscribeSessionChanged);

    // Подписка на удаление сессий
    const unsubscribeSessionDeleted = eventBus.on('timerSessionDeleted', async (detail) => {
      const eventDate = normalizeDate(detail.date || (detail.data && detail.data.date));
      const currentDateNormalized = normalizeDate(this.currentDate);
      
      if (eventDate && eventDate !== currentDateNormalized) {
        return;
      }
      await this.loadSessions();
      await this.render();
      this.updateTotalTimeBadge();
    });
    this.eventUnsubscribes.push(unsubscribeSessionDeleted);
  }

  /**
   * Обновить карточку сессии по ID
   */
  async updateSessionCard(sessionId) {
    if (!this.db || !this.contentElement) return;

    // Находим сессию
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      // Если сессия не найдена, перезагружаем
      await this.loadSessions();
      await this.render();
      return;
    }

    // Находим карточку в DOM
    const card = this.contentElement.querySelector(`[data-session-id="${sessionId}"]`);
    if (!card) {
      await this.loadSessions();
      await this.render();
      return;
    }

    // Обновляем продолжительность
    const durationEl = card.querySelector('.act-card-data-item');
    if (durationEl) {
      durationEl.textContent = this.formatDuration(session.duration);
    }
    
    // Обновляем бейдж с суммарным временем
    this.updateTotalTimeBadge();
  }

  async loadSessions() {
    if (!this.db) {
      this.sessions = [];
      return;
    }

    try {
      this.sessions = this.db.getTimerSessions(this.currentDate);
      console.log(`[TimerSessionsList] Загружено сессий за ${this.currentDate}:`, this.sessions.length);
    } catch (error) {
      console.error('[TimerSessionsList] Ошибка загрузки сессий:', error);
      this.sessions = [];
    }
  }

  async render() {
    if (!this.contentElement) return;
    
    // Удаляем все старые списки если есть
    const oldLists = this.contentElement.querySelectorAll('.act-list');
    oldLists.forEach(list => list.remove());
    
    // Удаляем все старые act-list-items если есть
    const oldListItems = this.contentElement.querySelectorAll('.act-list-items');
    oldListItems.forEach(items => items.remove());
    
    // Создаем список в стиле act-list
    const list = document.createElement('div');
    list.className = 'act-list';
    
    const listItems = document.createElement('div');
    listItems.className = 'act-list-items';
    
    if (this.sessions.length === 0) {
      const emptyState = new EmptyState({ type: 'sessions' });
      await emptyState.init();
      listItems.appendChild(emptyState.render());
    } else {
      // Создаем карточки для каждой сессии
      for (const session of this.sessions) {
        const card = await this.createSessionCard(session);
        listItems.appendChild(card);
      }
    }
    
    list.appendChild(listItems);
    this.contentElement.appendChild(list);
    
    // Сохраняем ссылку на контейнер прокрутки
    this.scrollContainer = listItems;
    
    // Обновляем бейдж с суммарным временем
    this.updateTotalTimeBadge();
  }

  updateTotalTimeBadge() {
    if (!this.section) return;
    
    const totalSeconds = this.sessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);
    
    if (totalSeconds > 0) {
      const formattedTime = this.formatDurationHoursMinutes(totalSeconds);
      this.section.updateBadges([
        { text: formattedTime }
      ]);
    } else {
      this.section.updateBadges(null);
    }
  }

  async createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'act-card';
    card.dataset.sessionId = session.id;

    // Получаем информацию о задаче
    let task = null;
    let taskIcon = null;
    let taskColor = '#3b82f6';
    let taskTitle = 'Неизвестная задача';
    let fromCfgTasks = false;

    // Пытаемся найти задачу в разных таблицах
    if (this.db) {
      // Проверяем cfg_leisure_tasks
      task = this.db.getById('cfg_leisure_tasks', session.task_id);
      if (!task) {
        // Проверяем cfg_tasks
        task = this.db.getById('cfg_tasks', session.task_id);
        if (task) fromCfgTasks = true;
      }

      if (task) {
        taskTitle = task.title || 'Без названия';
        taskIcon = task.icon || null;
        // Цвет как в списке задач таймера: по категории для cfg_tasks, по задаче/палитре для leisure
        if (fromCfgTasks && task.category_type) {
          taskColor = getCategoryColor(task.category_type);
        } else if (task.leisure_type) {
          taskColor = task.color || CfgColorPalette.getDefaultColor('leisure-' + task.leisure_type);
        } else {
          taskColor = task.color || '#3b82f6';
        }
      }
    }

    // Конвертируем HSL в HEX если нужно
    if (taskColor && typeof taskColor === 'string' && taskColor.toLowerCase().startsWith('hsl')) {
      taskColor = hslToHex(taskColor);
    }
    if (!taskColor || !taskColor.startsWith('#')) {
      taskColor = '#3b82f6';
    }

    // Иконка задачи слева
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color';
    
    applyIconBackground(iconWrapper, taskColor);
    iconWrapper.style.setProperty('--icon-color', taskColor);
    
    // Загружаем иконку
    if (taskIcon) {
      try {
        const iconContent = await iconLoader.loadIcon(taskIcon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        // Дефолтная иконка
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      // Дефолтная иконка
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    card.appendChild(iconWrapper);
    
    // Контент карточки - в одну строку
    const content = document.createElement('div');
    content.className = 'act-card-content';
    content.style.flex = '1';
    
    // Название задачи
    const title = document.createElement('span');
    title.className = 'act-card-title';
    title.textContent = taskTitle;
    content.appendChild(title);
    
    // Продолжительность
    const duration = document.createElement('span');
    duration.className = 'act-card-data-item';
    duration.textContent = this.formatDuration(session.duration);
    duration.style.color = 'var(--color-on-surface-secondary)';
    duration.style.marginLeft = 'var(--space-sm)';
    content.appendChild(duration);
    
    card.appendChild(content);
    
    // Действия (кнопка удаления)
    const actions = document.createElement('div');
    actions.className = 'act-card-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-icon';
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await confirmWithSound('Удалить эту сессию?');
      if (confirmed) {
        await this.deleteSession(session.id);
      }
    });
    actions.appendChild(deleteBtn);
    
    card.appendChild(actions);
    
    // Обработчик клика на карточку для редактирования
    card.style.cursor = 'pointer';
    card.addEventListener('click', async (e) => {
      // Игнорируем клики на кнопку удаления
      if (e.target.closest('.act-card-actions')) {
        return;
      }
      
      // Открываем модальное окно редактирования
      const { default: TimerSessionModal } = await import('./TimerSessionModal.js');
      await TimerSessionModal.open(session, async (sessionId, sessionData) => {
        await this.updateSession(sessionId, sessionData);
      });
    });
    
    return card;
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
  }

  formatDurationHoursMinutes(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0 && minutes > 0) {
      return `${hours}ч ${minutes}м`;
    } else if (hours > 0) {
      return `${hours}ч`;
    } else if (minutes > 0) {
      return `${minutes}м`;
    } else {
      return '0м';
    }
  }

  async addSession(formData) {
    if (!this.db) return;

    try {
      const sessionId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = {
        id: sessionId,
        date: formData.date || this.currentDate,
        task_id: formData.task_id,
        duration: formData.duration || 0,
        timer_type: formData.timer_type || 'timer',
        target_duration: formData.target_duration || null
      };

      this.db.addTimerSession(session);

      await this.loadSessions();
      await this.render();
      this.updateTotalTimeBadge();
      console.log(`[TimerSessionsList] Сессия ${sessionId} добавлена`);

      setTimeout(() => {
        eventBus.emit('timerSessionAdded', {
          action: 'create',
          data: session,
          affectedIds: [session.id],
          date: session.date
        });
      }, 10);

      if (window.timerTasksList) {
        await window.timerTasksList.loadTasks();
        await window.timerTasksList.render();
      }
    } catch (error) {
      console.error('[TimerSessionsList] Ошибка добавления сессии:', error);
      alert(`Ошибка при добавлении: ${error.message}`);
    }
  }

  async updateSession(sessionId, sessionData) {
    if (!this.db) {
      return;
    }

    try {
      // Получаем предыдущие данные для деталей события
      const previousSession = this.sessions.find(s => s.id === sessionId);
      
      // Обновляем в БД
      this.db.updateTimerSession(sessionId, sessionData);
      
      // Загружаем обновленные данные из БД
      await this.loadSessions();
      const updatedSession = this.sessions.find(s => s.id === sessionId);
      
      // Обновляем UI
      await this.render();
      this.updateTotalTimeBadge();
      console.log(`[TimerSessionsList] Сессия ${sessionId} обновлена`);
      
      // Отправляем событие через EventBus с деталями ПОСЛЕ обновления UI
      // Используем небольшую задержку для гарантии, что данные сохранены в БД
      setTimeout(() => {
        eventBus.emit('timerSessionChanged', {
          action: 'update',
          data: updatedSession || { id: sessionId, ...sessionData },
          previousData: previousSession,
          affectedIds: [sessionId],
          date: updatedSession?.date || sessionData.date || this.currentDate
        });
      }, 10); // Небольшая задержка для гарантии сохранения в БД
      
      // Обновляем список задач, если он существует
      if (window.timerTasksList) {
        await window.timerTasksList.loadTasks();
        await window.timerTasksList.render();
      }
    } catch (error) {
      console.error('[TimerSessionsList] Ошибка обновления сессии:', error);
    }
  }

  async deleteSession(sessionId) {
    if (!this.db) {
      return;
    }

    try {
      // Получаем данные сессии перед удалением для деталей события
      const deletedSession = this.sessions.find(s => s.id === sessionId);
      const sessionDate = deletedSession?.date || this.currentDate;
      const taskId = deletedSession?.task_id; // Сохраняем task_id перед удалением
      
      // Удаляем из БД
      this.db.deleteTimerSession(sessionId);
      
      // Загружаем обновленные данные из БД
      await this.loadSessions();
      
      // Обновляем UI
      await this.render();
      this.updateTotalTimeBadge();
      console.log(`[TimerSessionsList] Сессия ${sessionId} удалена`);
      
      // Отправляем событие через EventBus с деталями ПОСЛЕ обновления UI
      // Важно: включаем task_id в событие для правильного пересчета категории
      setTimeout(() => {
        eventBus.emit('timerSessionDeleted', {
          action: 'delete',
          data: deletedSession || { id: sessionId, task_id: taskId, date: sessionDate },
          previousData: deletedSession, // Сохраняем предыдущие данные с task_id
          affectedIds: [sessionId],
          date: sessionDate,
          taskId: taskId // Добавляем taskId на верхний уровень для удобства
        });
      }, 10); // Небольшая задержка для гарантии удаления из БД
      
      // Обновляем список задач, если он существует
      if (window.timerTasksList) {
        await window.timerTasksList.loadTasks();
        await window.timerTasksList.render();
      }
    } catch (error) {
      console.error('[TimerSessionsList] Ошибка удаления сессии:', error);
    }
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

export default TimerSessionsList;




