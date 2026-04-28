import Section from '../layout/Section.js';
import { DayLockManager, getCategoryColor, colorConversion } from '../../utils/index.js';
import iconLoader from '../../utils/iconLoader.js';
import { taskCategoriesConfigService } from '../../system/services/index.js';
import InputSuffix from '../../composites/InputSuffix.js';
import eventBus from '../../system/core/EventBus.js';

const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

class TasksCategoriesSection {
  constructor(date) {
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.date = date || selectedDateState.getSelectedDateString();
    } else {
      this.date = date || this.getCurrentDate();
    }
    
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TasksCategoriesSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[TasksCategoriesSection] База данных не инициализирована');
      }
    }
    
    this.element = null;
    this.unsubscribe = null;
    this.eventUnsubscribes = []; // Массив функций отписки от событий
    this.taskCards = new Map(); // Кэш карточек задач для быстрого доступа
    this.isRendering = false; // Флаг для предотвращения одновременных вызовов render()
  }

  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  async init() {
    // Контейнер с CSS Grid для адаптивного расположения категорий
    this.element = document.createElement('div');
    this.element.className = 'tasks-categories-container';
    // Стили будут применены через CSS, здесь только базовая структура
    
    // Загружаем и отображаем категории
    await this.render();
    
    // Добавляем обработчик изменения размера окна для обновления grid
    this.resizeHandler = () => {
      this.updateGridColumns();
    };
    window.addEventListener('resize', this.resizeHandler);
    
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.date = dateString;
        await this.render();
      });
    }

    // Подписываемся на события обновления задач
    this.setupEventListeners();

    this.categoriesConfigHandler = () => this.render();
    window.addEventListener('task-categories-config-changed', this.categoriesConfigHandler);
    this.eventUnsubscribes.push(() => {
      window.removeEventListener('task-categories-config-changed', this.categoriesConfigHandler);
    });
  }

  setupEventListeners() {
    // Подписка на изменения задач
    const unsubscribeTaskChange = eventBus.on('taskProgressChanged', async (detail) => {
      // Проверяем, относится ли изменение к текущей дате
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return; // Игнорируем изменения для других дат
      }

      // Игнорируем события taskProgressChanged от ритуалов (они обрабатываются через ritualCompleted)
      if (detail.data?.ritualType) {
        return;
      }

      // Если есть детали с taskId - обновляем только конкретную карточку
      const taskId = detail.data?.taskId || detail.taskId;
      if (taskId) {
        await this.updateTaskCardById(taskId);
        
        // Обновляем процент и индикатор изменения категории
        const task = this.db.getAll('cfg_tasks').find(t => t.id === taskId);
        if (task && task.category_type) {
          await this.updateCategoryPercent(task.category_type);
        }
      } else {
        // Fallback - полная перезагрузка
        await this.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeTaskChange);

    // Подписка на изменения ритуалов (влияют на задачи типа 'ritual')
    const unsubscribeRitual = eventBus.on('ritualCompleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      // Ритуалы влияют на задачи типа 'ritual', нужно обновить все такие задачи
      await this.updateRitualTasks();
    });
    this.eventUnsubscribes.push(unsubscribeRitual);

    // Подписка на изменения сессий таймера для обновления timer задач
    const unsubscribeTimerSessionAdded = eventBus.on('timerSessionAdded', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return; // Игнорируем изменения для других дат
      }

      // Обновляем timer задачу
      const taskId = detail.data?.task_id || detail.taskId;
      if (taskId) {
        // Получаем предыдущий прогресс перед обновлением
        const previousProgress = this.db.getTaskProgress(taskId, this.date);
        const previousPercent = previousProgress ? (previousProgress.completion_percent || 0) : 0;
        
        await this.updateTaskCardById(taskId);
        
        // Пересчитываем процент категории для обновления completion_percent
        const task = this.db.getAll('cfg_tasks').find(t => t.id === taskId);
        if (task && task.category_type) {
          this.db.calculateCategoryProgress(task.category_type, this.date);
          // Обновляем процент и индикатор изменения категории
          await this.updateCategoryPercent(task.category_type);
        }
        
        // Получаем обновленный прогресс и отправляем событие
        const finalProgress = this.db.getTaskProgress(taskId, this.date);
        const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
        
        if (finalCompletionPercent !== previousPercent) {
          setTimeout(() => {
            eventBus.emit('taskProgressChanged', {
              action: 'update',
              data: {
                taskId: taskId,
                date: this.date,
                completionPercent: finalCompletionPercent
              },
              previousData: {
                completionPercent: previousPercent
              },
              affectedIds: [taskId],
              date: this.date
            });
          }, 0);
        }
      } else {
        // Если нет конкретного taskId, обновляем все timer задачи
        await this.updateAllTimerTasks();
      }
    });
    this.eventUnsubscribes.push(unsubscribeTimerSessionAdded);

    const unsubscribeTimerSessionChanged = eventBus.on('timerSessionChanged', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }

      const taskId = detail.data?.task_id || detail.taskId;
      if (taskId) {
        // Получаем предыдущий прогресс перед обновлением
        const previousProgress = this.db.getTaskProgress(taskId, this.date);
        const previousPercent = previousProgress ? (previousProgress.completion_percent || 0) : 0;
        
        await this.updateTaskCardById(taskId);
        
        // Пересчитываем процент категории для обновления completion_percent
        const task = this.db.getAll('cfg_tasks').find(t => t.id === taskId);
        if (task && task.category_type) {
          this.db.calculateCategoryProgress(task.category_type, this.date);
          // Обновляем процент и индикатор изменения категории
          await this.updateCategoryPercent(task.category_type);
        }
        
        // Получаем обновленный прогресс и отправляем событие
        const finalProgress = this.db.getTaskProgress(taskId, this.date);
        const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
        
        if (finalCompletionPercent !== previousPercent) {
          setTimeout(() => {
            eventBus.emit('taskProgressChanged', {
              action: 'update',
              data: {
                taskId: taskId,
                date: this.date,
                completionPercent: finalCompletionPercent
              },
              previousData: {
                completionPercent: previousPercent
              },
              affectedIds: [taskId],
              date: this.date
            });
          }, 0);
        }
      } else {
        await this.updateAllTimerTasks();
      }
    });
    this.eventUnsubscribes.push(unsubscribeTimerSessionChanged);

    const unsubscribeTimerSessionDeleted = eventBus.on('timerSessionDeleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }

      const taskId = detail.data?.task_id || detail.taskId;
      if (taskId) {
        // Получаем предыдущий прогресс перед обновлением
        const previousProgress = this.db.getTaskProgress(taskId, this.date);
        const previousPercent = previousProgress ? (previousProgress.completion_percent || 0) : 0;
        
        await this.updateTaskCardById(taskId);
        
        // Пересчитываем процент категории для обновления completion_percent
        const task = this.db.getAll('cfg_tasks').find(t => t.id === taskId);
        if (task && task.category_type) {
          this.db.calculateCategoryProgress(task.category_type, this.date);
          // Обновляем процент и индикатор изменения категории
          await this.updateCategoryPercent(task.category_type);
        }
        
        // Получаем обновленный прогресс и отправляем событие
        const finalProgress = this.db.getTaskProgress(taskId, this.date);
        const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
        
        if (finalCompletionPercent !== previousPercent) {
          setTimeout(() => {
            eventBus.emit('taskProgressChanged', {
              action: 'update',
              data: {
                taskId: taskId,
                date: this.date,
                completionPercent: finalCompletionPercent
              },
              previousData: {
                completionPercent: previousPercent
              },
              affectedIds: [taskId],
              date: this.date
            });
          }, 0);
        }
      } else {
        await this.updateAllTimerTasks();
      }
    });
    this.eventUnsubscribes.push(unsubscribeTimerSessionDeleted);
  }

  /**
   * Вычислить процент выполнения для задачи (с учетом типа)
   */
  getTaskCompletionPercent(task, date) {
    if (task.task_type === 'timer') {
      // Для timer задач вычисляем процент на лету из текущих сессий
      const totalSeconds = this.db.getTaskTimerTotal(date, task.id) || 0;
      const targetHours = task.cfg_target_hours || 0;
      
      if (targetHours > 0) {
        const currentHours = totalSeconds / 3600;
        return currentHours >= targetHours ? 100 : Math.min(100, (currentHours / targetHours) * 100);
      }
      return 0;
    } else {
      // Для остальных типов используем данные из БД
      const progress = this.db.getTaskProgress(task.id, date);
      return progress ? (progress.completion_percent || 0) : 0;
    }
  }

  /**
   * Обновить карточку задачи по ID
   */
  async updateTaskCardById(taskId) {
    if (!this.db) return;

    // Находим карточку в DOM
    const card = this.element.querySelector(`[data-task-id="${taskId}"]`);
    if (!card) {
      // Если карточка не найдена, возможно она еще не отрендерена
      // Делаем полную перезагрузку
      await this.render();
      return;
    }

    // Находим задачу
    const allTasks = this.db.getAll('cfg_tasks');
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    // Получаем цвет категории
    const categoryColor = getCategoryColor(task.category_type);

    // Обновляем информацию о проценте выполнения
    await this.updateTaskCardInfo(card, task, this.date);

    // Обновляем средний процент категории
    await this.updateCategoryPercent(task.category_type);
  }

  /**
   * Обновить все задачи типа 'ritual'
   */
  async updateRitualTasks() {
    if (!this.db) return;

    // Находим все задачи типа 'ritual'
    const allTasks = this.db.getAll('cfg_tasks');
    const ritualTasks = allTasks.filter(t => t.task_type === 'ritual');

    // Обновляем каждую карточку и отправляем события
    for (const task of ritualTasks) {
      await this.updateTaskCardById(task.id);
      
      // Получаем предыдущий и текущий прогресс
      const previousProgress = this.db.getTaskProgress(task.id, this.date);
      const previousPercent = previousProgress ? (previousProgress.completion_percent || 0) : 0;
      
      // Пересчитываем процент категории для обновления completion_percent
      const categoryType = task.category_type;
      if (categoryType) {
        this.db.calculateCategoryProgress(categoryType, this.date);
      }
      
      // Получаем обновленный прогресс
      const finalProgress = this.db.getTaskProgress(task.id, this.date);
      const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
      
      // Отправляем событие только если процент изменился
      if (finalCompletionPercent !== previousPercent) {
        setTimeout(() => {
          eventBus.emit('taskProgressChanged', {
            action: 'update',
            data: {
              taskId: task.id,
              date: this.date,
              completionPercent: finalCompletionPercent
            },
            previousData: {
              completionPercent: previousPercent
            },
            affectedIds: [task.id],
            date: this.date
          });
        }, 0);
      }
    }
  }

  /**
   * Обновить все задачи типа 'timer'
   */
  async updateAllTimerTasks() {
    if (!this.db) return;

    // Находим все задачи типа 'timer'
    const allTasks = this.db.getAll('cfg_tasks');
    const timerTasks = allTasks.filter(t => t.task_type === 'timer');

    // Обновляем каждую карточку и отправляем события
    for (const task of timerTasks) {
      await this.updateTaskCardById(task.id);
      
      // Получаем предыдущий и текущий прогресс
      const previousProgress = this.db.getTaskProgress(task.id, this.date);
      const previousPercent = previousProgress ? (previousProgress.completion_percent || 0) : 0;
      
      // Пересчитываем процент категории для обновления completion_percent
      const categoryType = task.category_type;
      if (categoryType) {
        this.db.calculateCategoryProgress(categoryType, this.date);
      }
      
      // Получаем обновленный прогресс
      const finalProgress = this.db.getTaskProgress(task.id, this.date);
      const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
      
      // Отправляем событие только если процент изменился
      if (finalCompletionPercent !== previousPercent) {
        setTimeout(() => {
          eventBus.emit('taskProgressChanged', {
            action: 'update',
            data: {
              taskId: task.id,
              date: this.date,
              completionPercent: finalCompletionPercent
            },
            previousData: {
              completionPercent: previousPercent
            },
            affectedIds: [task.id],
            date: this.date
          });
        }, 0);
      }
    }
  }

  /**
   * Обновить процент выполнения категории и индикатор изменения
   */
  async updateCategoryPercent(categoryType) {
    if (!this.element) return;

    // Находим секцию категории
    const categorySections = Array.from(this.element.children);
    const categorySection = categorySections.find(section => {
      const title = section.querySelector('.page-title');
      return title && title.textContent === taskCategoriesConfigService.getTitle(categoryType);
    });

    if (!categorySection) return;

    // Вычисляем предыдущий день для индикатора
    const currentDateObj = new Date(this.date);
    const previousDateObj = new Date(currentDateObj);
    previousDateObj.setDate(previousDateObj.getDate() - 1);
    const previousDate = previousDateObj.toISOString().split('T')[0];

    // Пересчитываем и сохраняем процент категории в БД для текущего и предыдущего дня
    // calculateCategoryProgress правильно обрабатывает timer задачи и сохраняет результат
    this.db.calculateCategoryProgress(categoryType, this.date);
    this.db.calculateCategoryProgress(categoryType, previousDate);
    
    const currentProgress = this.db.getCategoryProgress(categoryType, this.date) || 0;
    const previousProgress = this.db.getCategoryProgress(categoryType, previousDate) || 0;
    
    // Обновляем процент в заголовке справа
    const headerRight = categorySection.querySelector('.section-header-right');
    if (headerRight) {
      const percentSpan = headerRight.querySelector('span');
      if (percentSpan) {
        percentSpan.textContent = `${Math.round(currentProgress)}%`;
      }
    }
    
    // Обновляем индикатор изменения в заголовке слева
    await this.updateCategoryChangeIndicator(categorySection, categoryType, currentProgress, previousProgress);
  }

  /**
   * Обновить индикатор изменения категории
   */
  async updateCategoryChangeIndicator(categorySection, categoryType, currentProgress, previousProgress) {
    if (!categorySection) return;

    const difference = currentProgress - previousProgress;
    const headerLeft = categorySection.querySelector('.section-header-left');
    if (!headerLeft) return;

    // Находим или создаем контейнер для бейджей
    let badgesContainer = headerLeft.querySelector('.section-header-badges');
    
    // Находим существующий индикатор изменения (ищем по классу)
    const existingIndicator = badgesContainer?.querySelector('.category-change-indicator') || 
                               categorySection.querySelector('.category-change-indicator');

    // Если подсветка отключена в настройках — полностью скрываем индикатор изменений
    if (!this.isCategoryPercentHighlightEnabled()) {
      if (existingIndicator) {
        existingIndicator.remove();
      }
      if (badgesContainer && badgesContainer.children.length === 0) {
        badgesContainer.remove();
      }
      return;
    }
    
    // Если разница меньше порога, удаляем индикатор
    if (Math.abs(difference) <= 0.01) {
      if (existingIndicator) {
        existingIndicator.remove();
        // Если контейнер бейджей пуст, удаляем его
        if (badgesContainer && badgesContainer.children.length === 0) {
          badgesContainer.remove();
        }
      }
      return;
    }

    // Создаем контейнер для бейджей, если его нет
    if (!badgesContainer) {
      badgesContainer = document.createElement('div');
      badgesContainer.className = 'section-header-badges';
      const headingElement = headerLeft.querySelector('.page-title');
      if (headingElement && headingElement.nextSibling) {
        headerLeft.insertBefore(badgesContainer, headingElement.nextSibling);
      } else {
        headerLeft.appendChild(badgesContainer);
      }
    }

    // Если индикатор существует, обновляем его
    if (existingIndicator) {
      const arrowSpan = existingIndicator.querySelector('.section-badge-text');
      const valueSpan = existingIndicator.querySelector('.section-badge-value');
      
      if (arrowSpan && valueSpan) {
        arrowSpan.textContent = difference > 0 ? '↑' : '↓';
        valueSpan.textContent = `${Math.abs(difference).toFixed(1)}%`;
        this.applyCategoryChangeIndicatorStyle(existingIndicator, difference);
      }
    } else {
      // Создаем новый индикатор только если его действительно нет
      if (!existingIndicator) {
        const { default: SectionBadge } = await import('../display/SectionBadge.js');
        
        const changeIndicator = new SectionBadge({
          text: difference > 0 ? '↑' : '↓',
          value: `${Math.abs(difference).toFixed(1)}%`
        });
        
        const badgeElement = changeIndicator.render();
        badgeElement.classList.add('category-change-indicator');
        this.applyCategoryChangeIndicatorStyle(badgeElement, difference);
        
        // Убеждаемся, что контейнер существует
        if (!badgesContainer) {
          badgesContainer = document.createElement('div');
          badgesContainer.className = 'section-header-badges';
          const headingElement = headerLeft.querySelector('.page-title');
          if (headingElement && headingElement.nextSibling) {
            headerLeft.insertBefore(badgesContainer, headingElement.nextSibling);
          } else {
            headerLeft.appendChild(badgesContainer);
          }
        }
        
        badgesContainer.appendChild(badgeElement);
      }
    }
  }

  isCategoryPercentHighlightEnabled() {
    const settings = this.db?.getAppSettings?.();
    return settings?.category_percent_highlight_enabled !== 0 && settings?.category_percent_highlight_enabled !== false;
  }

  applyCategoryChangeIndicatorStyle(indicatorElement, difference) {
    if (!indicatorElement) return;

    if (!this.isCategoryPercentHighlightEnabled()) {
      indicatorElement.style.removeProperty('color');
      indicatorElement.style.removeProperty('border-color');
      indicatorElement.style.removeProperty('background-color');
      return;
    }

    if (difference > 0) {
      indicatorElement.style.color = '#10b981';
      indicatorElement.style.borderColor = '#10b981';
      indicatorElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    } else {
      indicatorElement.style.color = '#ef4444';
      indicatorElement.style.borderColor = '#ef4444';
      indicatorElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    }
  }

  async render() {
    if (!this.element || !this.db) return;
    
    // Предотвращаем одновременные вызовы render()
    if (this.isRendering) {
      return;
    }
    
    this.isRendering = true;
    
    try {
      // Категории для отображения
      const categories = ['rituals', 'time', 'body', 'deps'];
      
      // Обновляем каждую категорию, не пересоздавая структуру
      for (const categoryType of categories) {
        const existingSection = this.element.querySelector(`[data-category-type="${categoryType}"]`);
        
        if (existingSection) {
          // Обновляем существующую секцию категории
          await this.updateCategorySection(categoryType, existingSection);
        } else {
          // Создаем новую секцию только если её нет
          const categorySection = await this.createCategorySection(categoryType);
          if (categorySection) {
            this.element.appendChild(categorySection);
          }
        }
      }
      
      // Удаляем секции категорий, которых больше нет
      const existingSections = this.element.querySelectorAll('[data-category-type]');
      existingSections.forEach(section => {
        const categoryType = section.dataset.categoryType;
        if (!categories.includes(categoryType)) {
          section.remove();
        }
      });
      
      // Обновляем количество колонок для равномерного распределения
      // Используем requestAnimationFrame для корректного расчета размеров после рендера
      requestAnimationFrame(() => {
        this.updateGridColumns();
      });
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Обновляет существующую секцию категории без пересоздания структуры
   */
  async updateCategorySection(categoryType, existingSection) {
    if (!this.db || !existingSection) return;
    
    // Получаем задачи для категории
    const allTasks = this.db.getAll('cfg_tasks');
    const categoryTasks = allTasks.filter(task => task.category_type === categoryType);
    
    // Сортируем по level
    categoryTasks.sort((a, b) => (a.level || 0) - (b.level || 0));
    
    // Получаем цвет категории
    const categoryColor = getCategoryColor(categoryType);
    
    // Получаем контейнер для карточек задач (правильный селектор)
    const tasksContainer = existingSection.querySelector('.tasks-category-tasks');
    if (!tasksContainer) {
      // Если контейнера нет, пересоздаем секцию
      existingSection.remove();
      const newSection = await this.createCategorySection(categoryType);
      if (newSection) {
        this.element.appendChild(newSection);
      }
      return;
    }
    
    // Обновляем карточки задач в контейнере
    // Удаляем старые карточки и пустые сообщения
    const oldCards = tasksContainer.querySelectorAll('[data-task-id]');
    oldCards.forEach(card => card.remove());
    const emptyText = tasksContainer.querySelector('div');
    if (emptyText && !emptyText.dataset.taskId) {
      emptyText.remove();
    }
    
    // Обновляем кэш карточек
    categoryTasks.forEach(task => {
      this.taskCards.delete(task.id);
    });
    
    if (categoryTasks.length === 0) {
      // Если задач нет, показываем пустое состояние
      const emptyTextEl = document.createElement('div');
      emptyTextEl.style.padding = 'var(--space-md)';
      emptyTextEl.style.color = 'var(--color-on-surface-secondary)';
      emptyTextEl.style.fontSize = 'var(--font-size-sm)';
      emptyTextEl.textContent = 'Нет задач';
      tasksContainer.appendChild(emptyTextEl);
    } else {
      // Создаем новые карточки с правильным цветом категории
      for (const task of categoryTasks) {
        const card = await this.createTaskCard(task, categoryColor);
        if (card) {
          card.dataset.taskId = task.id; // Добавляем data-атрибут для быстрого поиска
          this.taskCards.set(task.id, card); // Сохраняем в кэш
          tasksContainer.appendChild(card);
        }
      }
    }
    
    // Обновляем процент выполнения в заголовке
    const headerRight = existingSection.querySelector('.section-header-right');
    if (headerRight) {
      const percentSpan = headerRight.querySelector('span');
      if (percentSpan) {
        this.db.calculateCategoryProgress(categoryType, this.date);
        const currentProgress = this.db.getCategoryProgress(categoryType, this.date) || 0;
        percentSpan.textContent = `${Math.round(currentProgress)}%`;
      }
    }
    
    // Обновляем индикатор изменения
    const currentDateObj = new Date(this.date);
    const previousDateObj = new Date(currentDateObj);
    previousDateObj.setDate(previousDateObj.getDate() - 1);
    const previousDate = previousDateObj.toISOString().split('T')[0];
    
    this.db.calculateCategoryProgress(categoryType, this.date);
    this.db.calculateCategoryProgress(categoryType, previousDate);
    
    const currentProgress = this.db.getCategoryProgress(categoryType, this.date) || 0;
    const previousProgress = this.db.getCategoryProgress(categoryType, previousDate) || 0;
    
    await this.updateCategoryChangeIndicator(existingSection, categoryType, currentProgress, previousProgress);
  }

  /**
   * Обновляет количество колонок в grid для равномерного распределения карточек
   */
  updateGridColumns() {
    if (!this.element) return;
    
    const children = Array.from(this.element.children);
    const itemCount = children.length;
    
    if (itemCount === 0) return;
    
    // Получаем ширину контейнера
    const containerWidth = this.element.offsetWidth || window.innerWidth;
    
    // На очень узких экранах (< 600px) - одна колонка
    if (containerWidth < 600) {
      this.element.style.gridTemplateColumns = '1fr';
      return;
    }
    
    // На узких экранах (600px - 1100px) - две колонки, если места достаточно
    if (containerWidth < 1100) {
      // Минимальная ширина для одной карточки - примерно 250px
      // Если контейнер может вместить 2 карточки (с учетом gap), используем 2 колонки
      const minCardWidth = 250;
      const gap = 16; // var(--space-md) обычно 16px
      const canFitTwo = containerWidth >= (minCardWidth * 2 + gap);
      
      if (canFitTwo && itemCount >= 2) {
        this.element.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else {
        this.element.style.gridTemplateColumns = '1fr';
      }
      return;
    }
    
    // На широких экранах - все категории в одну строку
    // Используем количество колонок равное количеству категорий
    this.element.style.gridTemplateColumns = `repeat(${itemCount}, 1fr)`;
  }

  /**
   * Вычисляет оптимальное количество колонок для равномерного распределения
   */
  calculateOptimalColumns(itemCount, maxColumns) {
    if (itemCount <= 1) return 1;
    if (maxColumns <= 1) return 1;
    
    // Ограничиваем максимальное количество колонок
    const limitedMax = Math.min(maxColumns, 3);
    
    // Вычисляем количество рядов для каждого варианта колонок
    let bestColumns = 1;
    let bestBalance = Infinity;
    
    for (let cols = 1; cols <= limitedMax; cols++) {
      const rows = Math.ceil(itemCount / cols);
      const lastRowItems = itemCount % cols || cols;
      
      // Вычисляем "несбалансированность" - разницу между количеством элементов в рядах
      const balance = Math.abs(rows - lastRowItems);
      
      // Предпочитаем варианты, где последний ряд не сильно отличается от других
      if (balance < bestBalance || (balance === bestBalance && cols > bestColumns)) {
        bestBalance = balance;
        bestColumns = cols;
      }
    }
    
    return bestColumns;
  }

  async createCategorySection(categoryType) {
    // Получаем задачи для категории
    const allTasks = this.db.getAll('cfg_tasks');
    const categoryTasks = allTasks.filter(task => task.category_type === categoryType);
    
    // Сортируем по level
    categoryTasks.sort((a, b) => (a.level || 0) - (b.level || 0));
    
    // Получаем категорию из cfg_task_categories (таблица может не существовать)
    let category = null;
    try {
      const tableCheck = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='cfg_task_categories'`).get();
      if (tableCheck) {
        const categories = this.db.getAll('cfg_task_categories');
        category = categories.find(cat => cat.id === categoryType);
      }
    } catch (e) {
      category = null;
    }
    
    // Получаем цвет категории
    const categoryColor = getCategoryColor(categoryType);
    
    // Вычисляем средний процент выполнения
    let avgPercent = 0;
    if (categoryTasks.length > 0) {
      let totalPercent = 0;
      for (const task of categoryTasks) {
        const completionPercent = this.getTaskCompletionPercent(task, this.date);
        totalPercent += completionPercent;
      }
      avgPercent = Math.round(totalPercent / categoryTasks.length);
    }
    
    // Создаем секцию для категории
    const categoryTitle = taskCategoriesConfigService.getTitle(categoryType);
    const section = new Section({ 
      title: categoryTitle
    });
    const sectionElement = section.render();
    // Добавляем атрибут для идентификации категории
    sectionElement.setAttribute('data-category-type', categoryType);
    
    // Создаем DayLockManager для этой категории
    const dayLockManager = new DayLockManager(this.db);
    let lockIcon = null;
    if (dayLockManager) {
      lockIcon = await dayLockManager.createLockIcon();
      lockIcon.style.display = 'none';
      section.setLockIcon(lockIcon);
    }
    
    // Получаем левую часть заголовка для добавления иконки категории
    const headerLeft = section.getHeaderLeft();
    if (headerLeft) {
      // Иконка категории
      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'tasks-category-icon has-color';
      applyIconBackground(iconWrapper, categoryColor);
      iconWrapper.style.setProperty('--icon-color', categoryColor);
      iconWrapper.style.flexShrink = '0';
      
      // Используем централизованную иконку категории
      const categoryIcon = taskCategoriesConfigService.getIcon(categoryType) || (categoryTasks.length > 0 ? categoryTasks[0].icon : null);
      if (categoryIcon) {
        try {
          const iconContent = await iconLoader.loadIcon(categoryIcon);
          iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
        } catch (e) {
          iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
        }
      } else {
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
      
      // Вставляем иконку категории после lockIcon (если есть) или в начало
      const headingElement = headerLeft.querySelector('.page-title');
      if (headingElement) {
        // Если есть lockIcon, вставляем после него, иначе в начало
        const lockIconElement = headerLeft.querySelector('.section-lock-icon');
        if (lockIconElement) {
          headerLeft.insertBefore(iconWrapper, lockIconElement.nextSibling);
        } else {
          headerLeft.insertBefore(iconWrapper, headingElement);
        }
      } else {
        headerLeft.appendChild(iconWrapper);
      }
      
    }
    
    // Добавляем процент выполнения и индикатор изменения
    const headerRight = section.getHeaderRight();
    if (headerRight) {
      // Вычисляем предыдущий день для индикатора
      const currentDateObj = new Date(this.date);
      const previousDateObj = new Date(currentDateObj);
      previousDateObj.setDate(previousDateObj.getDate() - 1);
      const previousDate = previousDateObj.toISOString().split('T')[0];
      
      // Получаем прогресс за текущий и предыдущий день через БД
      this.db.calculateCategoryProgress(categoryType, this.date);
      this.db.calculateCategoryProgress(categoryType, previousDate);
      
      const currentProgress = this.db.getCategoryProgress(categoryType, this.date) || 0;
      const previousProgress = this.db.getCategoryProgress(categoryType, previousDate) || 0;
      
      // Обновляем avgPercent на основе реального прогресса из БД
      avgPercent = Math.round(currentProgress);
      
      // Процент выполнения
      const percentSpan = document.createElement('span');
      percentSpan.style.color = 'var(--color-on-surface-secondary)';
      percentSpan.style.fontSize = 'var(--font-size-sm)';
      percentSpan.textContent = `${Math.round(currentProgress)}%`;
      headerRight.appendChild(percentSpan);
    }
    
    // Добавляем индикатор изменения (используем метод, который предотвращает дублирование)
    const currentDateObj = new Date(this.date);
    const previousDateObj = new Date(currentDateObj);
    previousDateObj.setDate(previousDateObj.getDate() - 1);
    const previousDate = previousDateObj.toISOString().split('T')[0];
    
    this.db.calculateCategoryProgress(categoryType, this.date);
    this.db.calculateCategoryProgress(categoryType, previousDate);
    
    const currentProgress = this.db.getCategoryProgress(categoryType, this.date) || 0;
    const previousProgress = this.db.getCategoryProgress(categoryType, previousDate) || 0;
    
    await this.updateCategoryChangeIndicator(sectionElement, categoryType, currentProgress, previousProgress);
    
    // Создаем контейнер для контента
    const contentElement = document.createElement('div');
    contentElement.className = 'tasks-category-content';
    
    // Контейнер для задач
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'tasks-category-tasks';
    
    if (categoryTasks.length === 0) {
      const emptyText = document.createElement('div');
      emptyText.style.padding = 'var(--space-md)';
      emptyText.style.color = 'var(--color-on-surface-secondary)';
      emptyText.style.fontSize = 'var(--font-size-sm)';
      emptyText.textContent = 'Нет задач';
      tasksContainer.appendChild(emptyText);
    } else {
      // Создаем карточки для каждой задачи
      for (const task of categoryTasks) {
        const taskCard = await this.createTaskCard(task, categoryColor);
        taskCard.dataset.taskId = task.id; // Добавляем data-атрибут для быстрого поиска
        this.taskCards.set(task.id, taskCard); // Сохраняем в кэш
        tasksContainer.appendChild(taskCard);
      }
    }
    
    contentElement.appendChild(tasksContainer);
    
    // Добавляем контент в секцию
    sectionElement.appendChild(contentElement);
    
    // Устанавливаем стили для секции, чтобы она равномерно распределялась
    sectionElement.style.flex = '1';
    sectionElement.style.minWidth = '0';
    sectionElement.style.maxWidth = '100%';
    
    // Обновляем состояние блокировки
    if (dayLockManager && lockIcon) {
      await dayLockManager.updateLockState(
        sectionElement,
        contentElement,
        lockIcon,
        this.date
      );
    }
    
    // Подписываемся на изменения даты для обновления блокировки
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      selectedDateState.subscribe(async (date, dateString) => {
        if (dayLockManager && lockIcon) {
          await dayLockManager.updateLockState(
            sectionElement,
            contentElement,
            lockIcon,
            dateString
          );
        }
      });
    }
    
    return sectionElement;
  }

  async createTaskCard(task, categoryColor) {
    // Получаем прогресс задачи
    const progress = this.db.getTaskProgress(task.id, this.date);
    const completionPercent = progress ? (progress.completion_percent || 0) : 0;
    const isCompleted = completionPercent === 100;
    
    // Используем стандартную структуру act-card
    const card = document.createElement('div');
    card.className = 'act-card';
    
    // Устанавливаем CSS переменные для цвета категории (для выполненных задач)
    if (isCompleted) {
      card.classList.add('completed');
      // Легкий фон в цвет категории
      card.style.setProperty('--task-completed-bg', hexToRgba(categoryColor, 0.06));
      // Тонкая рамка в цвет категории
      card.style.setProperty('--task-completed-border', hexToRgba(categoryColor, 0.2));
      // При hover - чуть ярче
      card.style.setProperty('--task-completed-bg-hover', hexToRgba(categoryColor, 0.1));
      card.style.setProperty('--task-completed-border-hover', hexToRgba(categoryColor, 0.3));
    }
    // Padding и gap теперь задаются в CSS
    
    // ЧАСТЬ 1: Левая часть - иконка + название (широкая)
    const leftPart = document.createElement('div');
    leftPart.className = 'tasks-task-left';
    leftPart.style.flex = '1 1 0'; // Равномерное распределение, но широкая
    leftPart.style.minWidth = '0';
    // Padding и gap теперь задаются в CSS на уровне act-card
    
    // Иконка задачи
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color';
    iconWrapper.style.backgroundColor = hexToRgba(categoryColor, getIconBackgroundOpacity());
    iconWrapper.style.setProperty('--icon-color', categoryColor);
    
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
    
    leftPart.appendChild(iconWrapper);
    
    // Название задачи
    const title = document.createElement('span');
    title.className = 'act-card-title';
    title.textContent = task.title || 'Без названия';
    title.style.flex = '1';
    title.style.minWidth = '0';
    leftPart.appendChild(title);
    
    card.appendChild(leftPart);
    
    // ЧАСТЬ 2: Средняя часть - процент выполнения (узкая)
    const infoPart = document.createElement('div');
    infoPart.className = 'tasks-task-info';
    infoPart.style.flex = '0 0 auto'; // Фиксированная ширина, узкая
    infoPart.style.minWidth = '0';
    infoPart.style.width = 'auto'; // Автоматическая ширина по содержимому
    // Padding и gap теперь задаются в CSS на уровне act-card
    card.appendChild(infoPart);
    
    // ЧАСТЬ 3: Правая часть - элемент управления (широкая)
    const controlPart = document.createElement('div');
    controlPart.className = 'tasks-task-control';
    controlPart.style.flex = '1 1 0'; // Равномерное распределение, но широкая
    controlPart.style.minWidth = '0';
    // Padding и gap теперь задаются в CSS на уровне act-card
    controlPart.style.setProperty('--task-control-border', hexToRgba(categoryColor, 0.2));
    controlPart.style.setProperty('--task-control-bg', hexToRgba(categoryColor, 0.05));
    controlPart.style.setProperty('--task-control-border-focus', categoryColor);
    controlPart.style.setProperty('--task-control-bg-focus', hexToRgba(categoryColor, 0.1));
    controlPart.style.setProperty('--task-control-border-hover', categoryColor);
    controlPart.style.setProperty('--task-control-bg-hover', hexToRgba(categoryColor, 0.08));
    
    // Предотвращаем всплытие событий
    controlPart.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Создаем элемент управления в зависимости от типа задачи
    if (task.task_type === 'checkbox') {
      const checkboxButton = document.createElement('button');
      checkboxButton.className = 'tasks-checkbox-button';
      checkboxButton.type = 'button';
      
      const isCompleted = progress && progress.completed === 1;
      checkboxButton.innerHTML = isCompleted 
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`;
      
      checkboxButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const currentProgress = this.db.getTaskProgress(task.id, this.date);
        const currentCompleted = currentProgress && currentProgress.completed === 1;
        const completed = !currentCompleted;
        
        // Сохраняем предыдущее состояние для деталей события
        const previousProgress = this.db.getTaskProgress(task.id, this.date);
        const previousCompleted = previousProgress && previousProgress.completed === 1;
        
        // Сохраняем в БД
        this.db.saveTaskProgress(task.id, this.date, { completed });
        
        // Получаем обновленные данные
        const updatedProgress = this.db.getTaskProgress(task.id, this.date);
        const completionPercent = updatedProgress ? (updatedProgress.completion_percent || 0) : 0;
        
        // Обновляем кнопку
        checkboxButton.innerHTML = completed 
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`;
        
        // Обновляем карточку и правую часть
        await this.updateTaskCardInfo(card, task, this.date);
        
        // Небольшая задержка для гарантии, что данные сохранены и пересчитаны в БД
        // Используем setTimeout для асинхронной отправки события после обновления БД
        setTimeout(() => {
          // Перечитываем данные из БД для гарантии актуальности
          const finalProgress = this.db.getTaskProgress(task.id, this.date);
          const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
          
          // Отправляем событие через EventBus с полными деталями
          eventBus.emit('taskProgressChanged', {
            action: 'update',
            data: {
              taskId: task.id,
              date: this.date,
              completed: completed,
              completionPercent: finalCompletionPercent
            },
            previousData: {
              completed: previousCompleted,
              completionPercent: previousProgress ? (previousProgress.completion_percent || 0) : 0
            },
            affectedIds: [task.id],
            date: this.date
          });
        }, 0); // Используем 0ms для отправки в следующем тике event loop
      });
      
      controlPart.appendChild(checkboxButton);
    } else if (task.task_type === 'number') {
      // Кастомное поле ввода с суффиксом посередине
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'tasks-number-input-wrapper';
      
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'tasks-number-input';
      const currentValue = progress ? (progress.current_value || 0) : 0;
      const numValue = parseFloat(currentValue) || 0;
      input.value = numValue;
      input.min = 0;
      input.step = (task.cfg_unit === 'км' || task.cfg_unit === 'л') ? 0.1 : 1;
      
      const inputContent = document.createElement('div');
      inputContent.className = 'tasks-number-input-content';
      
      const unit = task.cfg_unit || '';
      const targetValue = task.cfg_target_value || 0;
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'tasks-number-input-value';
      
      const suffixSpan = document.createElement('span');
      suffixSpan.className = 'tasks-number-input-suffix';
      
      // Функция обновления отображения
      const updateDisplay = (value) => {
        const val = parseFloat(value) || 0;
        
        if (targetValue > 0 && val === 0) {
          // Если значение = 0, показываем только целевое значение блеклым
          valueSpan.textContent = '';
          valueSpan.style.display = 'none';
          suffixSpan.textContent = `${targetValue} ${unit}`;
          suffixSpan.style.opacity = '0.5';
          suffixSpan.style.color = 'var(--color-on-surface-secondary)';
        } else {
          // Если значение введено, показываем значение + единицу обычным цветом
          valueSpan.textContent = val;
          valueSpan.style.display = 'inline';
          suffixSpan.textContent = unit;
          suffixSpan.style.opacity = '1';
          suffixSpan.style.color = 'var(--color-on-surface)';
        }
      };
      
      // Инициализируем отображение
      updateDisplay(numValue);
      
      inputContent.appendChild(valueSpan);
      inputContent.appendChild(suffixSpan);
      
      inputWrapper.appendChild(input);
      inputWrapper.appendChild(inputContent);
      
      // Обработчики для стилизации wrapper и переключения видимости
      input.addEventListener('focus', () => {
        inputWrapper.style.borderColor = 'var(--task-control-border-focus, var(--task-color, var(--color-accent-ui, var(--color-accent))))';
        inputWrapper.style.backgroundColor = 'var(--task-control-bg-focus, var(--task-control-bg-hover, rgba(255, 255, 255, 0.05)))';
        // При фокусе скрываем inputContent полностью
        inputContent.style.opacity = '0';
        inputContent.style.pointerEvents = 'none';
        // input становится видимым через CSS (opacity: 1)
      });
      
      // Обновляем отображение при вводе (только для синхронизации, но inputContent скрыт)
      input.addEventListener('input', (e) => {
        const value = e.target.value || '0';
        // Обновляем для синхронизации, но он скрыт пока input в фокусе
        updateDisplay(value);
      });
      
      // Автоматически снимаем фокус при нажатии Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        }
      });
      
      input.addEventListener('blur', async (e) => {
        // Сбрасываем стили wrapper
        inputWrapper.style.borderColor = '';
        inputWrapper.style.backgroundColor = '';
        
        const newValue = parseFloat(e.target.value) || 0;
        // Обновляем значение input
        input.value = newValue;
        // Обновляем отображение в inputContent
        updateDisplay(newValue);
        // Показываем inputContent снова
        inputContent.style.opacity = '1';
        inputContent.style.pointerEvents = 'none';
        // input снова скрывается через CSS (opacity: 0)
        
        // Сохраняем предыдущее состояние
        const previousProgress = this.db.getTaskProgress(task.id, this.date);
        const previousValue = previousProgress ? (previousProgress.current_value || 0) : 0;
        
        // Сохраняем в БД
        this.db.saveTaskProgress(task.id, this.date, { current_value: newValue });
        
        // Получаем обновленные данные
        const updatedProgress = this.db.getTaskProgress(task.id, this.date);
        const completionPercent = updatedProgress ? (updatedProgress.completion_percent || 0) : 0;
        
        // Обновляем правую часть
        await this.updateTaskCardInfo(card, task, this.date);
        
        // Небольшая задержка для гарантии, что данные сохранены и пересчитаны в БД
        setTimeout(() => {
          // Перечитываем данные из БД для гарантии актуальности
          const finalProgress = this.db.getTaskProgress(task.id, this.date);
          const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
          
          // Отправляем событие через EventBus с полными деталями
          eventBus.emit('taskProgressChanged', {
            action: 'update',
            data: {
              taskId: task.id,
              date: this.date,
              currentValue: newValue,
              completionPercent: finalCompletionPercent
            },
            previousData: {
              currentValue: previousValue,
              completionPercent: previousProgress ? (previousProgress.completion_percent || 0) : 0
            },
            affectedIds: [task.id],
            date: this.date
          });
        }, 0);
      });
      
      controlPart.appendChild(inputWrapper);
    } else if (task.task_type === 'timer') {
      const timerButton = document.createElement('button');
      timerButton.className = 'tasks-ritual-button';
      timerButton.type = 'button';
      
      // Получаем сумму времени
      const totalSeconds = this.db.getTaskTimerTotal(this.date, task.id) || 0;
      const targetHours = task.cfg_target_hours || 0;
      
      // Форматируем время (часы и минуты)
      const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
          return `${hours}ч ${minutes}м`;
        } else {
          return `${minutes}м`;
        }
      };
      
      // Если нет сессий, показываем целевое значение
      if (totalSeconds === 0 && targetHours > 0) {
        timerButton.textContent = `${targetHours}ч`;
      } else if (totalSeconds > 0) {
        // Если есть данные, показываем сумму времени
        timerButton.textContent = formatDuration(totalSeconds);
      } else {
        timerButton.textContent = 'Таймер';
      }
      
      timerButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Переключаемся на страницу таймера и выбираем задачу
        if (window.pageManager) {
          window.pageManager.showPage('timer');
          // Используем setTimeout для ожидания рендеринга страницы
          setTimeout(async () => {
            const timerTasksList = window.pageManager.timerTasksList;
            if (timerTasksList) {
              // Задачи из TasksCategoriesSection всегда из cfg_tasks с category_type='time'
              // Поэтому активируем вкладку 'tasks'
              await timerTasksList.setActiveTabAndSelectTask('tasks', task);
            }
          }, 100);
        }
      });
      
      controlPart.appendChild(timerButton);
    } else if (task.task_type === 'ritual') {
      const ritualButton = document.createElement('button');
      ritualButton.className = 'tasks-ritual-button';
      ritualButton.type = 'button';
      
      // Получаем количество выполненных и общее количество ритуалов
      const ritualType = task.ritual_type;
      let completedCount = 0;
      let totalCount = 0;
      let ritualTypeLabel = '';
      
      if (ritualType === 'sunrise') {
        ritualTypeLabel = 'Утренние ритуалы';
        // Получаем все активные утренние ритуалы
        const morningRituals = this.db.getAll('cfg_rituals_morning').filter(r => r.active !== 0);
        totalCount = morningRituals.length;
        // Получаем выполненные ритуалы
        const completedRituals = this.db.getRitualsMorning(this.date);
        completedCount = completedRituals.filter(r => r.completed === 1).length;
      } else if (ritualType === 'sunset') {
        ritualTypeLabel = 'Вечерние ритуалы';
        // Получаем все активные вечерние ритуалы
        const eveningRituals = this.db.getAll('cfg_rituals_evening').filter(r => r.active !== 0);
        totalCount = eveningRituals.length;
        // Получаем выполненные ритуалы
        const completedRituals = this.db.getRitualsEvening(this.date);
        completedCount = completedRituals.filter(r => r.completed === 1).length;
      } else {
        ritualTypeLabel = 'Ритуалы';
      }
      
      ritualButton.textContent = totalCount > 0 
        ? `${completedCount} из ${totalCount}`
        : '0 из 0';
      
      ritualButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Переключаемся на страницу ритуалов с соответствующим типом
        if (window.pageManager) {
          // Определяем тип ритуала для секции на основе ritual_type задачи
          let ritualSectionType = null;
          if (ritualType === 'sunrise') {
            ritualSectionType = 'morning';
          } else if (ritualType === 'sunset') {
            ritualSectionType = 'evening';
          }
          
          // Передаем тип ритуала при переходе на страницу
          if (ritualSectionType) {
            window.pageManager.showPage('rituals', { ritualType: ritualSectionType });
          } else {
            window.pageManager.showPage('rituals');
          }
        }
      });
      
      controlPart.appendChild(ritualButton);
    } else if (task.task_type === 'list') {
      // Кнопка для циклического переключения элементов списка
      let configItems = [];
      if (task.config) {
        try {
          const config = JSON.parse(task.config);
          if (config.items && Array.isArray(config.items)) {
            configItems = config.items;
          }
        } catch (e) {
          console.error('[TasksCategoriesSection] Ошибка парсинга config для задачи:', e);
        }
      }
      
      if (configItems.length > 0) {
        const listButton = document.createElement('button');
        listButton.className = 'tasks-list-button';
        listButton.type = 'button';
        
        const currentIndex = progress && progress.value !== null && progress.value !== undefined 
          ? progress.value 
          : -1;
        const currentItem = currentIndex >= 0 && currentIndex < configItems.length 
          ? configItems[currentIndex] 
          : null;
        
        listButton.textContent = currentItem 
          ? (currentItem.title || currentItem.name || 'Выбрано')
          : 'Выбор';
        
        listButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          
          // Сохраняем предыдущее состояние ДО изменения
          const previousProgress = this.db.getTaskProgress(task.id, this.date);
          const previousValue = previousProgress ? previousProgress.value : null;
          const previousCompletionPercent = previousProgress ? (previousProgress.completion_percent || 0) : 0;
          
          const currentProgress = this.db.getTaskProgress(task.id, this.date);
          const currentIndex = currentProgress && currentProgress.value !== null && currentProgress.value !== undefined 
            ? currentProgress.value 
            : -1;
          
          // Циклическое переключение
          let nextIndex = currentIndex + 1;
          if (nextIndex >= configItems.length) {
            nextIndex = -1; // Сбрасываем на «Выбор»
          }
          
          if (nextIndex >= 0) {
            const selectedItem = configItems[nextIndex];
            this.db.saveTaskProgress(task.id, this.date, { 
              value: nextIndex,
              selected_list_item: selectedItem.title || selectedItem.name || '',
              completion_percent: selectedItem.percent || selectedItem.percentage || 0
            });
            listButton.textContent = selectedItem.title || selectedItem.name || 'Выбрано';
          } else {
            this.db.saveTaskProgress(task.id, this.date, { 
              value: null,
              selected_list_item: null,
              completion_percent: 0
            });
            listButton.textContent = 'Выбор';
          }
          
          // Обновляем правую часть
          await this.updateTaskCardInfo(card, task, this.date);
          
          // Небольшая задержка для гарантии, что данные сохранены и пересчитаны в БД
          setTimeout(() => {
            // Перечитываем данные из БД для гарантии актуальности
            const finalProgress = this.db.getTaskProgress(task.id, this.date);
            const finalCompletionPercent = finalProgress ? (finalProgress.completion_percent || 0) : 0;
            
            // Отправляем событие через EventBus с полными деталями
            eventBus.emit('taskProgressChanged', {
              action: 'update',
              data: {
                taskId: task.id,
                date: this.date,
                value: nextIndex >= 0 ? nextIndex : null,
                completionPercent: finalCompletionPercent
              },
              previousData: {
                value: previousValue,
                completionPercent: previousCompletionPercent
              },
              affectedIds: [task.id],
              date: this.date
            });
          }, 0);
        });
        
        controlPart.appendChild(listButton);
      }
    }
    
    card.appendChild(controlPart);
    
    // Обновляем информацию о проценте выполнения (infoPart уже создан выше)
    await this.updateTaskCardInfo(card, task, this.date);
    
    return card;
  }
  
  async updateTaskCardInfo(card, task, date) {
    const infoPart = card.querySelector('.tasks-task-info');
    if (!infoPart) {
      // Создаем среднюю часть, если её нет
      const newInfoPart = document.createElement('div');
      newInfoPart.className = 'tasks-task-info';
      newInfoPart.style.flex = '0 0 auto'; // Фиксированная ширина, узкая
      newInfoPart.style.display = 'flex';
      newInfoPart.style.alignItems = 'center';
      newInfoPart.style.justifyContent = 'center'; // Выравнивание по центру
      newInfoPart.style.padding = 'var(--space-sm)';
      newInfoPart.style.minWidth = '0';
      newInfoPart.style.width = 'auto'; // Автоматическая ширина по содержимому
      // Вставляем между левой частью и элементом управления
      const leftPart = card.querySelector('.tasks-task-left');
      if (leftPart && leftPart.nextSibling) {
        card.insertBefore(newInfoPart, leftPart.nextSibling);
      } else {
        card.appendChild(newInfoPart);
      }
      return this.updateTaskCardInfo(card, task, date);
    }

    // Настройка: скрыть процент выполнения на карточках
    const settings = this.db.getAppSettings();
    const hidePercent = settings && (settings.tasks_hide_completion_percent === 1 || settings.tasks_hide_completion_percent === true);
    if (hidePercent) {
      infoPart.style.display = 'none';
      infoPart.innerHTML = '';
      return;
    }
    infoPart.style.display = 'flex';

    // Убеждаемся, что стили правильные
    infoPart.style.flex = '0 0 auto';
    infoPart.style.justifyContent = 'center';
    infoPart.style.width = 'auto';
    
    // Очищаем содержимое
    infoPart.innerHTML = '';
    
    const completionPercent = this.getTaskCompletionPercent(task, date);
    const isCompleted = completionPercent === 100;
    
    // Получаем цвет категории для стилизации выполненных задач
    const categoryColor = getCategoryColor(task.category_type);
    
    if (isCompleted) {
      // Показываем галочку
      infoPart.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
      card.classList.add('completed');
      // Устанавливаем CSS переменные для цвета выполненных задач
      card.style.setProperty('--task-completed-bg', hexToRgba(categoryColor, 0.06));
      card.style.setProperty('--task-completed-border', hexToRgba(categoryColor, 0.2));
      card.style.setProperty('--task-completed-bg-hover', hexToRgba(categoryColor, 0.1));
      card.style.setProperty('--task-completed-border-hover', hexToRgba(categoryColor, 0.3));
    } else {
      // Показываем проценты
      infoPart.textContent = `${Math.round(completionPercent)}%`;
      card.classList.remove('completed');
      // Убираем CSS переменные для невыполненных задач
      card.style.removeProperty('--task-completed-bg');
      card.style.removeProperty('--task-completed-border');
      card.style.removeProperty('--task-completed-bg-hover');
      card.style.removeProperty('--task-completed-border-hover');
    }
    
    // Обновляем tasks-task-control для задач типа 'ritual'
    if (task.task_type === 'ritual') {
      const controlPart = card.querySelector('.tasks-task-control');
      if (controlPart) {
        const ritualButton = controlPart.querySelector('.tasks-ritual-button');
        if (ritualButton) {
          // Получаем количество выполненных и общее количество ритуалов
          const ritualType = task.ritual_type;
          let completedCount = 0;
          let totalCount = 0;
          
          if (ritualType === 'sunrise') {
            // Получаем все активные утренние ритуалы
            const morningRituals = this.db.getAll('cfg_rituals_morning').filter(r => r.active !== 0);
            totalCount = morningRituals.length;
            // Получаем выполненные ритуалы
            const completedRituals = this.db.getRitualsMorning(date);
            completedCount = completedRituals.filter(r => r.completed === 1).length;
          } else if (ritualType === 'sunset') {
            // Получаем все активные вечерние ритуалы
            const eveningRituals = this.db.getAll('cfg_rituals_evening').filter(r => r.active !== 0);
            totalCount = eveningRituals.length;
            // Получаем выполненные ритуалы
            const completedRituals = this.db.getRitualsEvening(date);
            completedCount = completedRituals.filter(r => r.completed === 1).length;
          }
          
          ritualButton.textContent = totalCount > 0 
            ? `${completedCount} из ${totalCount}`
            : '0 из 0';
        }
      }
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    // Отписываемся от всех событий
    this.eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribes = [];
    this.taskCards.clear();
  }
}

export default TasksCategoriesSection;