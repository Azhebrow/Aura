import Button from '../form/Button.js';
import { iconLoader, colorConversion, confirmWithSound } from '../../utils/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';
import GoalsModal from './GoalsModal.js';
import ConfigModal from '../cfg/ConfigModal.js';
import { CFG_CONFIGS } from '../../system/database/cfg-configs.js';
import { EmptyState } from '../display/index.js';
import eventBus from '../../system/core/EventBus.js';

const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

class GoalsSection {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[GoalsSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[GoalsSection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.goals = [];
    this.currentIndex = 0;
    this.eventUnsubscribes = []; // Массив функций отписки от событий
    this.goalCards = new Map(); // Кэш карточек целей для быстрого доступа
  }

  async init() {
    await this.loadGoals();
    
    // Создаем элемент секции без заголовка
    this.element = document.createElement('div');
    this.element.className = 'section';
    
    await this.render();
    
    // Подписываемся на события для обновления прогресса целей
    this.setupEventListeners();

    // Подписываемся на изменения акцентного цвета и темы
    this.accentColorHandler = () => {
      this.render();
    };
    this.themeHandler = () => {
      this.render();
    };
    window.addEventListener('accentColorChanged', this.accentColorHandler);
    window.addEventListener('themeChanged', this.themeHandler);
  }

  setupEventListeners() {
    // Подписка на изменения задач - пересчитываем прогресс целей
    const unsubscribeTaskChange = eventBus.on('taskProgressChanged', async (detail) => {
      // Пересчитываем прогресс всех целей, которые зависят от задач
      await this.recalculateAllGoalsProgress();
    });
    this.eventUnsubscribes.push(unsubscribeTaskChange);
  }

  /**
   * Пересчитать прогресс всех целей
   */
  async recalculateAllGoalsProgress() {
    if (!this.db || !this.element) return;

    // Обновляем прогресс каждой цели
    for (const goal of this.goals) {
      await this.updateGoalProgress(goal.id);
    }
  }

  /**
   * Обновить прогресс конкретной цели
   */
  async updateGoalProgress(goalId) {
    if (!this.db || !this.element) return;

    // Если текущая цель соответствует обновляемой, перерисовываем
    const currentGoal = this.goals[this.currentIndex];
    if (currentGoal && currentGoal.id === goalId) {
      await this.render();
    }
  }

  async loadGoals() {
    try {
      if (!this.db) {
        this.goals = [];
        return;
      }
      
      // Загружаем цели из базы данных, сортируем по level
      this.goals = this.db.getAllGoals() || [];
      this.goals.sort((a, b) => (a.level || 0) - (b.level || 0));
      
      // Если есть цели, но индекс выходит за границы, сбрасываем на 0
      if (this.goals.length > 0 && this.currentIndex >= this.goals.length) {
        this.currentIndex = 0;
      }
    } catch (error) {
      console.error('[GoalsSection] Ошибка загрузки целей:', error);
      this.goals = [];
    }
  }

  async render() {
    // Очищаем содержимое секции
    this.element.innerHTML = '';

    // Создаем контейнер для контента
    const container = document.createElement('div');
    container.className = 'goals-section-container';

    if (this.goals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'goals-empty';
      empty.textContent = 'Нет целей';
      container.appendChild(empty);
      this.element.appendChild(container);
      return;
    }

    const currentGoal = this.goals[this.currentIndex];
    const goalProgress = await this.calculateGoalProgress(currentGoal.id);
    const progressPercent = Math.round(goalProgress.progress);
    const goalColor = currentGoal.color || this.getAccentColor();

    const stages = this.db.getStagesByGoal(currentGoal.id) || [];
    const stagesInfo = await this.getStagesInfo(currentGoal.id);

    // Кнопки навигации (справа в заголовке)
    const prevButton = await new Button({
      iconName: 'chevron-left'
    }).render();
    prevButton.classList.add('nav-arrow-button', 'nav-arrow-inline');
    prevButton.addEventListener('click', async () => {
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_PREV);
        if (sound) window.audioSystem.play(sound);
      }
      this.currentIndex = (this.currentIndex - 1 + this.goals.length) % this.goals.length;
      this.render();
    });

    const nextButton = await new Button({
      iconName: 'chevron-right'
    }).render();
    nextButton.classList.add('nav-arrow-button', 'nav-arrow-inline');
    nextButton.addEventListener('click', async () => {
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_NEXT);
        if (sound) window.audioSystem.play(sound);
      }
      this.currentIndex = (this.currentIndex + 1) % this.goals.length;
      this.render();
    });

    // Заголовок секции: слева иконка + название + статы, справа кнопки переключения
    const header = document.createElement('div');
    header.className = 'goals-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'goals-header-left';

    if (currentGoal.icon) {
      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'act-card-icon';
      iconWrapper.classList.add('has-color');
      applyIconBackground(iconWrapper, goalColor);
      iconWrapper.style.setProperty('--icon-color', goalColor);
      try {
        const iconContent = await iconLoader.loadIcon(currentGoal.icon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
      }
      headerLeft.appendChild(iconWrapper);
    }

    const title = document.createElement('h3');
    title.className = 'goals-card-title';
    title.textContent = currentGoal.title || 'Цель';
    headerLeft.appendChild(title);

    const stats = document.createElement('span');
    stats.className = 'goals-card-stats';
    stats.textContent = `${stagesInfo.total} этапов · ${goalProgress.total} задач · ${progressPercent}%`;
    headerLeft.appendChild(stats);

    const headerRight = document.createElement('div');
    headerRight.className = 'goals-header-right';
    headerRight.appendChild(prevButton);
    headerRight.appendChild(nextButton);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);

    // Горизонтальная разделяющая линия под заголовком
    const divider = document.createElement('div');
    divider.className = 'goals-divider';

    // Контент под заголовком (монолитно, без вложенной карточки с заголовком)
    const content = document.createElement('div');
    content.className = 'goals-content';
    content.style.cursor = 'pointer';
    content.addEventListener('click', () => {
      this.openGoalsModal(currentGoal);
    });

    // Прогресс-бар цели (как в карточках этапов) — заполняет верхнюю зону вместо пустого отступа
    const progressBarRow = document.createElement('div');
    progressBarRow.className = 'goals-content-progress';
    const progressBar = this.createProgressBarCells(goalProgress.completed, goalProgress.total, goalColor);
    progressBarRow.appendChild(progressBar);
    content.appendChild(progressBarRow);

    if (currentGoal.description) {
      const description = document.createElement('p');
      description.className = 'goals-card-desc';
      description.textContent = currentGoal.description;
      description.title = currentGoal.description;
      content.appendChild(description);
    }

    if (stages.length > 0) {
      const body = document.createElement('div');
      body.className = 'goals-card-body';

      const stagesWithProgress = [];
      for (const stage of stages) {
        const stageProgress = await this.calculateStageProgress(stage.id);
        const tasks = this.db.getTasksByStage(stage.id) || [];
        const tasksWithDone = await Promise.all(tasks.map(async (task) => {
          const progress = this.db.getGoalTaskProgress(task.id, this.getCurrentDate());
          let completed = false;
          if (task.task_type === 'checkbox') {
            completed = progress && progress.completed === 1;
          } else if (task.task_type === 'number' && (task.target_value || 0) > 0) {
            completed = (progress ? (progress.current_value || 0) : 0) >= task.target_value;
          }
          return { task, completed };
        }));
        tasksWithDone.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
        stagesWithProgress.push({ stage, stageProgress, tasksWithDone });
      }
      stagesWithProgress.sort((a, b) => (a.stageProgress.progress >= 100 ? 1 : 0) - (b.stageProgress.progress >= 100 ? 1 : 0));

      for (const { stage, stageProgress, tasksWithDone } of stagesWithProgress) {
        const stageBlock = document.createElement('div');
        stageBlock.className = 'goals-stage' + (stageProgress.progress >= 100 ? ' goals-stage-done' : '');

        const stageHead = document.createElement('div');
        stageHead.className = 'goals-stage-head';
        const stageCountEl = document.createElement('span');
        stageCountEl.className = 'goals-stage-num';
        stageCountEl.textContent = `${stageProgress.completed}/${stageProgress.total}`;
        const stageTitleEl = document.createElement('span');
        stageTitleEl.className = 'goals-stage-name';
        stageTitleEl.textContent = stage.title || 'Этап';
        stageHead.appendChild(stageCountEl);
        stageHead.appendChild(stageTitleEl);

        const taskList = document.createElement('ul');
        taskList.className = 'goals-task-list';

        const [checkIcon, circleIcon] = await Promise.all([
          iconLoader.loadIcon('check').catch(() => ''),
          iconLoader.loadIcon('circle').catch(() => '')
        ]);
        for (const { task, completed } of tasksWithDone) {
          const li = document.createElement('li');
          li.className = 'goals-task' + (completed ? ' goals-task-done' : '');
          li.title = (task.title || 'Задача') + (completed ? ' - выполнено' : '');
          const mark = document.createElement('span');
          mark.className = 'goals-task-mark goals-task-mark-icon';
          const iconSvg = completed ? checkIcon : circleIcon;
          mark.innerHTML = iconSvg ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;">${iconSvg}</svg>` : (completed ? '✓' : '○');
          const text = document.createElement('span');
          text.className = 'goals-task-text';
          text.textContent = task.title || 'Задача';
          li.appendChild(mark);
          li.appendChild(text);
          taskList.appendChild(li);
        }

        stageBlock.appendChild(stageHead);
        stageBlock.appendChild(taskList);
        body.appendChild(stageBlock);
      }

      content.appendChild(body);
    }

    container.appendChild(header);
    container.appendChild(divider);
    container.appendChild(content);

    this.element.appendChild(container);
  }

  // Вспомогательные функции для создания элементов

  getAccentColor() {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
  }

  async createIconContainer(icon, color) {
    const iconContainer = document.createElement('span');
    iconContainer.className = 'cfg-card-icon';
    
    const iconColor = color || this.getAccentColor();
    iconContainer.classList.add('has-color');
    applyIconBackground(iconContainer, iconColor);
    iconContainer.style.setProperty('--icon-color', iconColor);

    if (icon) {
      try {
        const iconContent = await iconLoader.loadIcon(icon);
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }

    return iconContainer;
  }

  createProgressBarCells(completed, total, color) {
    const cellsContainer = document.createElement('div');
    cellsContainer.className = 'goals-progress-cells';
    
    const totalCells = total > 0 ? total : 1;
    const completedCells = Math.min(completed, total);
    
    const cellColor = color || this.getAccentColor();
    
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'goals-progress-cell';
      
      if (i < completedCells) {
        cell.style.backgroundColor = cellColor;
        cell.style.opacity = '1';
        cell.classList.add('completed');
      } else {
        cell.style.backgroundColor = cellColor;
        cell.style.opacity = '0.2';
      }
      
      cellsContainer.appendChild(cell);
    }
    
    return cellsContainer;
  }

  async createProgressSquare(progressPercent) {
    const progressSquare = document.createElement('div');
    progressSquare.className = 'goals-card-progress-square';
    if (progressPercent === 100) {
      try {
        const checkIcon = await iconLoader.loadIcon('check');
        progressSquare.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="goals-progress-check-icon">${checkIcon}</svg>`;
      } catch (e) {
        progressSquare.innerHTML = '✓';
      }
      progressSquare.classList.add('completed');
    } else {
      progressSquare.textContent = `${progressPercent}%`;
    }
    return progressSquare;
  }

  createControlDivider() {
    const divider = document.createElement('div');
    divider.className = 'goals-control-divider';
    return divider;
  }

  addButtonsToGroup(actionsGroup, buttons) {
    buttons.forEach((btn, index) => {
      actionsGroup.appendChild(btn);
      if (index < buttons.length - 1) {
        actionsGroup.appendChild(this.createControlDivider());
      }
    });
  }

  // Получаем текущую дату
  getCurrentDate() {
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      return selectedDateState.getSelectedDateString();
    }
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  async getAllTasksByGoal(goalId) {
    const stages = this.db.getStagesByGoal(goalId) || [];
    const allTasks = [];
    for (const stage of stages) {
      const tasks = this.db.getTasksByStage(stage.id) || [];
      allTasks.push(...tasks);
    }
    return allTasks;
  }

  async getStagesInfo(goalId) {
    const stages = this.db.getStagesByGoal(goalId) || [];
    const currentDate = this.getCurrentDate();
    let completedStages = 0;

    for (const stage of stages) {
      const stageProgress = await this.calculateStageProgress(stage.id);
      if (Math.round(stageProgress.progress) === 100) {
        completedStages++;
      }
    }

    return {
      total: stages.length,
      completed: completedStages
    };
  }

  async calculateStageProgress(stageId) {
    const tasks = this.db.getTasksByStage(stageId) || [];
    if (tasks.length === 0) return { progress: 0, completed: 0, total: 0 };
    
    const currentDate = this.getCurrentDate();
    let completedCount = 0;
    
    for (const task of tasks) {
      const progress = this.db.getGoalTaskProgress(task.id, currentDate);
      let taskProgress = 0;
      
      if (task.task_type === 'checkbox') {
        taskProgress = progress && progress.completed === 1 ? 100 : 0;
      } else if (task.task_type === 'number') {
        const targetValue = task.target_value || 0;
        if (targetValue === 0) {
          taskProgress = 0;
        } else {
          const currentValue = progress ? (progress.current_value || 0) : 0;
          taskProgress = Math.min(100, (currentValue / targetValue) * 100);
        }
      }
      
      if (taskProgress === 100) completedCount++;
    }
    
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
    return { progress, completed: completedCount, total: totalTasks };
  }

  async getCurrentTasksInfo(goalId) {
    const stages = this.db.getStagesByGoal(goalId) || [];
    const currentDate = this.getCurrentDate();
    const tasksInfo = [];

    for (const stage of stages) {
      const tasks = this.db.getTasksByStage(stage.id) || [];
      for (const task of tasks) {
        const progress = this.db.getGoalTaskProgress(task.id, currentDate);
        let isCompleted = false;
        
        if (task.task_type === 'checkbox') {
          isCompleted = progress && progress.completed === 1;
        } else if (task.task_type === 'number') {
          const targetValue = task.target_value || 0;
          if (targetValue > 0) {
            const currentValue = progress ? (progress.current_value || 0) : 0;
            isCompleted = currentValue >= targetValue;
          }
        }

        // Добавляем только незавершенные задачи или недавно завершенные
        if (!isCompleted || (isCompleted && tasksInfo.length < 3)) {
          tasksInfo.push({
            id: task.id,
            title: task.title,
            icon: task.icon,
            stageTitle: stage.title,
            completed: isCompleted
          });
        }
      }
    }

    // Сортируем: сначала незавершенные, потом завершенные
    tasksInfo.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    return tasksInfo;
  }

  async calculateGoalProgress(goalId) {
    const allTasks = await this.getAllTasksByGoal(goalId);
    if (allTasks.length === 0) return { progress: 0, completed: 0, total: 0 };
    
    const currentDate = this.getCurrentDate();
    let completedCount = 0;
    
    for (const task of allTasks) {
      const progress = this.db.getGoalTaskProgress(task.id, currentDate);
      let taskProgress = 0;
      
      if (task.task_type === 'checkbox') {
        taskProgress = progress && progress.completed === 1 ? 100 : 0;
      } else if (task.task_type === 'number') {
        const targetValue = task.target_value || 0;
        if (targetValue === 0) {
          taskProgress = 0;
        } else {
          const currentValue = progress ? (progress.current_value || 0) : 0;
          taskProgress = Math.min(100, (currentValue / targetValue) * 100);
        }
      }
      
      if (taskProgress === 100) completedCount++;
    }
    
    const totalTasks = allTasks.length;
    const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
    return { progress, completed: completedCount, total: totalTasks };
  }

  async createCard(goal) {
    const card = document.createElement('div');
    card.className = 'goals-column-card';
    card.dataset.goalId = goal.id; // Добавляем data-атрибут для быстрого поиска
    this.goalCards.set(goal.id, card); // Сохраняем в кэш

    // Вычисляем прогресс цели
    const goalProgress = await this.calculateGoalProgress(goal.id);
    const progressPercent = Math.round(goalProgress.progress);

    // Клик по карточке открывает модальное окно
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.goals-card-controls')) {
        this.openGoalsModal(goal);
      }
    });

    // Основная строка: иконка + название + кнопки действий
    const mainRow = document.createElement('div');
    mainRow.className = 'goals-card-main-row';
    
    // Иконка
    const iconContainer = await this.createIconContainer(goal.icon, goal.color);
    mainRow.appendChild(iconContainer);

    // Название
    const title = document.createElement('span');
    title.className = 'cfg-card-title';
    title.textContent = goal.title || 'Без названия';
    mainRow.appendChild(title);

    // Контейнер для кнопок управления и прогресса
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'goals-card-controls';
    
    // Компактная группа кнопок с разделителями
    const actions = document.createElement('div');
    actions.className = 'goals-card-actions-group';
    controlsContainer.appendChild(actions);
    
    // Квадрат прогресса
    const goalProgressPercent = Math.round(goalProgress.progress);
    controlsContainer.appendChild(await this.createProgressSquare(goalProgressPercent));
    
    mainRow.appendChild(controlsContainer);

    card.appendChild(mainRow);

    // Разделительная линия
    const divider = document.createElement('div');
    divider.className = 'goals-card-inner-divider';
    card.appendChild(divider);

    // Подстроки: описание и прогресс
    const subRow = document.createElement('div');
    subRow.className = 'goals-card-sub-row';
    
    if (goal.description) {
      const description = document.createElement('div');
      description.className = 'cfg-card-data';
      description.textContent = goal.description;
      description.style.cssText = `
        font-size: var(--font-sm);
        color: var(--color-on-surface-secondary);
      `;
      subRow.appendChild(description);
    }

    // Вертикальная разделительная линия между описанием и прогрессом
    const progressDivider = document.createElement('div');
    progressDivider.className = 'goals-progress-divider';
    subRow.appendChild(progressDivider);

    // Прогресс-бар с ячейками для цели
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'goals-progress-container';
    
    // Количественное значение над ячейками
    const progressText = document.createElement('div');
    progressText.className = 'goals-progress-text';
    progressText.textContent = `${goalProgress.completed}/${goalProgress.total}`;
    progressText.style.cssText = `
      font-size: var(--font-sm);
      color: var(--color-on-surface-secondary);
      text-align: center;
      margin-bottom: var(--space-xs);
    `;
    progressBarContainer.appendChild(progressText);
    
    // Ячейки прогресса
    const progressBar = this.createProgressBarCells(goalProgress.completed, goalProgress.total, goal.color);
    progressBarContainer.appendChild(progressBar);
    
    subRow.appendChild(progressBarContainer);

    card.appendChild(subRow);

    // Кнопки перемещения
    const currentIndex = this.goals.findIndex(g => g.id === goal.id);
    const buttons = [];

    if (currentIndex > 0) {
      const moveUpBtn = await new Button({
        iconName: 'chevron-up',
        onClick: async (e) => {
          e.stopPropagation();
          await this.moveGoal(goal.id, 'up');
        }
      }).render();
      moveUpBtn.classList.add('goals-control-btn');
      buttons.push(moveUpBtn);
    }

    if (currentIndex < this.goals.length - 1) {
      const moveDownBtn = await new Button({
        iconName: 'chevron-down',
        onClick: async (e) => {
          e.stopPropagation();
          await this.moveGoal(goal.id, 'down');
        }
      }).render();
      moveDownBtn.classList.add('goals-control-btn');
      buttons.push(moveDownBtn);
    }

    const editBtn = await new Button({
      iconName: 'pencil',
      onClick: async (e) => {
        e.stopPropagation();
        await this.openGoalModal(goal);
      }
    }).render();
    editBtn.classList.add('goals-control-btn');
    buttons.push(editBtn);

    const deleteBtn = await new Button({
      iconName: 'trash-2',
      onClick: async (e) => {
        e.stopPropagation();
        this.deleteGoal(goal.id);
      }
    }).render();
    deleteBtn.classList.add('goals-control-btn');
    buttons.push(deleteBtn);

    // Добавляем кнопки в группу с разделителями
    this.addButtonsToGroup(actions, buttons);

    return card;
  }

  async openGoalModal(goal) {
    await ConfigModal.open(CFG_CONFIGS['goals'], goal, async (data) => {
      try {
        if (goal) {
          this.db.updateGoal(goal.id, data);
        } else {
          this.db.addGoal(data);
        }
        await this.loadGoals();
        // Сохраняем текущий индекс, если цель была изменена
        const goalIndex = this.goals.findIndex(g => g.id === (goal ? goal.id : null));
        if (goalIndex !== -1) {
          this.currentIndex = goalIndex;
        }
        await this.render();
      } catch (error) {
        console.error('[GoalsSection] Ошибка сохранения цели:', error);
        alert('Ошибка при сохранении цели');
      }
    });
  }

  async moveGoal(goalId, direction) {
    try {
      if (!this.db) return;

      const currentIndex = this.goals.findIndex(g => g.id === goalId);
      if (currentIndex === -1) return;

      let targetIndex;
      if (direction === 'up') {
        if (currentIndex === 0) return;
        targetIndex = currentIndex - 1;
      } else {
        if (currentIndex === this.goals.length - 1) return;
        targetIndex = currentIndex + 1;
      }

      // Меняем местами level
      const tempLevel = this.goals[currentIndex].level;
      this.db.updateGoal(this.goals[currentIndex].id, { level: this.goals[targetIndex].level });
      this.db.updateGoal(this.goals[targetIndex].id, { level: tempLevel });

      // Перезагружаем и перерисовываем
      await this.loadGoals();
      // Обновляем индекс после перемещения
      const newIndex = this.goals.findIndex(g => g.id === goalId);
      if (newIndex !== -1) {
        this.currentIndex = newIndex;
      }
      await this.render();
    } catch (error) {
      console.error('[GoalsSection] Ошибка перемещения цели:', error);
    }
  }

  async deleteGoal(goalId) {
    if (this.goals.length <= 1) {
      const { customAlert } = await import('../../utils/customDialogs.js');
      await customAlert('Это последняя цель. Должна остаться хотя бы одна цель.');
      return;
    }
    if (!confirmWithSound('Удалить цель? Все этапы и задачи этой цели также будут удалены.')) {
      return;
    }

    try {
      if (!this.db) return;

      this.db.deleteGoal(goalId);
      await this.loadGoals();
      // Если удалили текущую цель, сбрасываем индекс
      if (this.currentIndex >= this.goals.length && this.goals.length > 0) {
        this.currentIndex = 0;
      } else if (this.goals.length === 0) {
        this.currentIndex = 0;
      }
      await this.render();
    } catch (error) {
      console.error('[GoalsSection] Ошибка удаления цели:', error);
      alert('Ошибка при удалении цели');
    }
  }

  async openGoalsModal(goal = null) {
    // Check if we're on rituals page and can show the panel
    if (window.pageManager && window.pageManager.showGoalsPanel) {
      await window.pageManager.showGoalsPanel(goal);
    } else {
      // Fallback to modal if not on rituals page
      await GoalsModal.open(goal, async () => {
        await this.loadGoals();
        await this.render();
      });
    }
  }

  destroy() {
    // Отписываемся от всех событий
    this.eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribes = [];
    this.goalCards.clear();
    
    // Отписываемся от изменений акцентного цвета и темы
    if (this.accentColorHandler) {
      window.removeEventListener('accentColorChanged', this.accentColorHandler);
    }
    if (this.themeHandler) {
      window.removeEventListener('themeChanged', this.themeHandler);
    }
  }
}

export default GoalsSection;

