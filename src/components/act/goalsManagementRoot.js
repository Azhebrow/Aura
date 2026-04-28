import { iconLoader, confirmWithSound } from '../../utils/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';
import Button from '../form/Button.js';
import ConfigModal from '../cfg/ConfigModal.js';
import { CFG_CONFIGS } from '../../system/database/cfg-configs.js';
import { EmptyState } from '../display/index.js';
import RadioButton from '../form/RadioButton.js';

import { colorConversion } from '../../utils/index.js';
const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

// Вспомогательные функции (оставляем для совместимости, но используем из colorConversion)
const hexToRgbaLocal = (hex, alpha) => {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getAccentColor = () => {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
};

const createIconContainer = async (icon, color) => {
  const iconContainer = document.createElement('span');
  iconContainer.className = 'cfg-card-icon';
  
  const iconColor = color || getAccentColor();
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
};

/** Линейный прогресс-бар (минималистичный, на всю ширину) */
const createLinearProgressBar = (completed, total, color, options = {}) => {
  const { showPercentLabel = false, labelText = null } = options;
  const wrap = document.createElement('div');
  wrap.className = 'goals-linear-progress';
  const totalSafe = total > 0 ? total : 1;
  const pct = Math.min(100, Math.max(0, (Math.min(completed, totalSafe) / totalSafe) * 100));
  const track = document.createElement('div');
  track.className = 'goals-linear-progress-track';
  const fill = document.createElement('div');
  fill.className = 'goals-linear-progress-fill';
  fill.style.width = `${pct}%`;
  fill.style.backgroundColor = color || getAccentColor();
  track.appendChild(fill);
  if (showPercentLabel || labelText) {
    const label = document.createElement('span');
    label.className = 'goals-linear-progress-label';
    label.textContent = labelText || `${Math.round(pct)}%`;
    track.appendChild(label);
  }
  wrap.appendChild(track);
  return wrap;
};

const createCardContent = (title, description = null) => {
  const content = document.createElement('div');
  content.className = 'cfg-card-content';

  const titleElement = document.createElement('span');
  titleElement.className = 'cfg-card-title';
  titleElement.textContent = title || 'Без названия';
  content.appendChild(titleElement);

  if (description) {
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'cfg-card-data';
    descriptionElement.textContent = description;
    descriptionElement.className = 'goals-nav-breadcrumb-description';
    content.appendChild(descriptionElement);
  }

  return content;
};

/**
 * @param {{ selectedGoal: object|null, requestClose: () => void, escapeGate: () => boolean, contentClassName?: string }} opts
 * @returns {{ content: HTMLElement, dispose: () => void }}
 */
export async function mountGoalsManagement(opts) {
  const {
    selectedGoal,
    requestClose,
    escapeGate,
    contentClassName = 'fullscreen-modal-content goals-modal-content'
  } = opts;

  const getDB = window.getDB;
  if (!getDB) {
    console.error('[goalsManagementRoot] База данных недоступна');
    const content = document.createElement('div');
    return { content, dispose: () => {} };
  }
  const db = getDB();
  if (!db) {
    console.error('[goalsManagementRoot] База данных не инициализирована');
    const content = document.createElement('div');
    return { content, dispose: () => {} };
  }

    const content = document.createElement('div');
    content.className = contentClassName;

    // Заголовок: назад слева | заголовок по центру | режим + закрытие справа
    const header = document.createElement('div');
    header.className = 'goals-modal-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'goals-modal-header-left';

    const titleCenter = document.createElement('div');
    titleCenter.className = 'goals-modal-header-center';

    const title = document.createElement('h3');
    title.className = 'goals-modal-title';
    title.textContent = 'Панель управления целями';
    titleCenter.appendChild(title);

    const rightControls = document.createElement('div');
    rightControls.className = 'goals-modal-header-actions';

    // Загружаем иконки для радиокнопок и галочек
    const targetIcon = await iconLoader.loadIcon('target').catch(() => '');
    const archiveIcon = await iconLoader.loadIcon('archive').catch(() => '');
    const checkIcon = await iconLoader.loadIcon('check').catch(() => '');
    const plusIconRaw = await iconLoader.loadIcon('plus').catch(() => '');

    // Радиокнопки для переключения между активными целями и архивом
    const viewModeRadio = new RadioButton({
      name: 'goals-view-mode',
      value: 'active', // Устанавливаем текущий режим
      iconOnly: true, // Только иконки, без текста
      items: [
        { value: 'active', icon: targetIcon },
        { value: 'archive', icon: archiveIcon }
      ]
    });
    const viewModeRadioElement = viewModeRadio.render();
    rightControls.appendChild(viewModeRadioElement);

    let handlePanelBack = async () => {};
    const backTopBtn = await new Button({
      iconName: 'chevron-left',
      onClick: async (e) => {
        e?.stopPropagation?.();
        if (backTopBtn.disabled) return;
        await handlePanelBack();
      }
    }).render();
    backTopBtn.classList.add('goals-header-action-btn', 'goals-header-back-btn');
    headerLeft.appendChild(backTopBtn);

    const closeButton = document.createElement('button');
    closeButton.className = 'goals-modal-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      requestClose();
    });
    rightControls.appendChild(closeButton);

    header.appendChild(headerLeft);
    header.appendChild(titleCenter);
    header.appendChild(rightControls);

    content.appendChild(header);

    // Одноколоночная панель: навигация + список текущего уровня
    const panelBody = document.createElement('div');
    panelBody.className = 'goals-panel-body';

    let handlePanelAdd = async () => {};

    const panelList = document.createElement('div');
    panelList.className = 'goals-panel-list goals-column-list';

    panelBody.appendChild(panelList);
    content.appendChild(panelBody);

    // Состояние
    let currentGoalId = selectedGoal ? selectedGoal.id : null;
    let currentStageId = null;
    let currentViewMode = 'active'; // 'active' или 'archive'
    /** @type {'goals' | 'stages' | 'tasks'} */
    let panelLevel = selectedGoal ? 'stages' : 'goals';

    // Получаем текущую дату
    const getCurrentDate = () => {
      const selectedDateState = window.selectedDateState;
      if (selectedDateState) {
        return selectedDateState.getSelectedDateString();
      }
      const now = new Date();
      return now.toISOString().split('T')[0];
    };
    const currentDate = getCurrentDate();

    const formatCompletedDateLine = (at) => {
      if (at === null || at === undefined || at === '') return null;
      try {
        const d = new Date(at);
        if (Number.isNaN(d.getTime())) return String(at);
        return d.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return null;
      }
    };

    const appendCardTitleBlock = (mainRow, titleText, completedAt, progressPercent) => {
      const titleWrap = document.createElement('div');
      titleWrap.className = 'goals-card-title-block';
      const titleEl = document.createElement('span');
      titleEl.className = 'cfg-card-title';
      titleEl.textContent = titleText || 'Без названия';
      titleWrap.appendChild(titleEl);
      const line = formatCompletedDateLine(completedAt);
      if (progressPercent === 100 && line) {
        const meta = document.createElement('div');
        meta.className = 'goals-card-title-meta';
        meta.textContent = `Завершено ${line}`;
        titleWrap.appendChild(meta);
      }
      mainRow.appendChild(titleWrap);
    };

    const loadStages = async (goalId) => {
      if (!goalId) return [];
      try {
        const stages = db.getStagesByGoal(goalId) || [];
        stages.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        return stages;
      } catch (e) {
        console.error('[GoalsModal] Ошибка загрузки этапов:', e);
        return [];
      }
    };

    const loadTasks = async (stageId) => {
      if (!stageId) return [];
      return db.getTasksByStage(stageId);
    };

    // Функции для вычисления прогресса
    const calculateTaskProgress = (task, progress) => {
      if (!progress) return 0;
      
      if (task.task_type === 'checkbox') {
        return progress.completed === 1 ? 100 : 0;
      } else if (task.task_type === 'number') {
        const targetValue = task.target_value || 0;
        if (targetValue === 0) return 0;
        const currentValue = progress.current_value || 0;
        return Math.min(100, (currentValue / targetValue) * 100);
      }
      return 0;
    };

    const getAllTasksByGoal = async (goalId) => {
      const stages = await loadStages(goalId);
      const allTasks = [];
      for (const stage of stages) {
        const tasks = await loadTasks(stage.id);
        allTasks.push(...tasks);
      }
      return allTasks;
    };

    const calculateGoalProgress = async (goalId) => {
      const allTasks = await getAllTasksByGoal(goalId);
      if (allTasks.length === 0) return { progress: 0, completed: 0, total: 0 };
      
      let completedCount = 0;
      
      for (const task of allTasks) {
        const progress = db.getGoalTaskProgress(task.id, currentDate);
        const taskProgress = calculateTaskProgress(task, progress);
        if (taskProgress === 100) completedCount++;
      }
      
      const totalTasks = allTasks.length;
      const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
      return { progress, completed: completedCount, total: totalTasks };
    };

    const calculateStageProgress = async (stageId) => {
      const tasks = await loadTasks(stageId);
      if (tasks.length === 0) return { progress: 0, completed: 0, total: 0 };
      
      let totalProgress = 0;
      let completedCount = 0;
      
      for (const task of tasks) {
        const progress = db.getGoalTaskProgress(task.id, currentDate);
        const taskProgress = calculateTaskProgress(task, progress);
        totalProgress += taskProgress;
        if (taskProgress === 100) completedCount++;
      }
      
      return {
        progress: tasks.length > 0 ? totalProgress / tasks.length : 0,
        completed: completedCount,
        total: tasks.length
      };
    };

    // Функции для работы с данными
    const loadGoals = async () => {
      let goals = db.getAllGoals() || [];
      goals.sort((a, b) => (a.level || 0) - (b.level || 0));
      
      // Фильтруем цели по режиму просмотра
      const filteredGoals = [];
      for (const goal of goals) {
        const goalProgress = await calculateGoalProgress(goal.id);
        const progressPercent = Math.round(goalProgress.progress);
        const hasCompletedAt = goal.completed_at !== null && goal.completed_at !== undefined;
        
        if (currentViewMode === 'active') {
          // Активные цели: нет completed_at или прогресс < 100%
          if (!hasCompletedAt || progressPercent < 100) {
            filteredGoals.push(goal);
          }
        } else if (currentViewMode === 'archive') {
          // Архивные цели: есть completed_at и прогресс == 100%
          if (hasCompletedAt && progressPercent === 100) {
            filteredGoals.push(goal);
          }
        }
      }
      
      return filteredGoals;
    };

    // Функция для обновления прогресса всех элементов
    const updateProgress = async () => {
      // Автоматическое управление completed_at для всех целей
      const allGoals = db.getAllGoals() || [];
      for (const goal of allGoals) {
        const goalProgress = await calculateGoalProgress(goal.id);
        const progressPercent = Math.round(goalProgress.progress);
        const hasCompletedAt = goal.completed_at !== null && goal.completed_at !== undefined;
        
        if (progressPercent === 100 && !hasCompletedAt) {
          db.setGoalCompletedAt(goal.id, currentDate);
        } else         if (progressPercent < 100 && hasCompletedAt) {
          db.setGoalCompletedAt(goal.id, null);
        }
      }

      for (const goal of allGoals) {
        const stages = db.getStagesByGoal(goal.id) || [];
        for (const stage of stages) {
          const stageProgress = await calculateStageProgress(stage.id);
          const stagePct = Math.round(stageProgress.progress);
          const stageHasAt =
            stage.completed_at !== null && stage.completed_at !== undefined && stage.completed_at !== '';
          if (stagePct === 100 && !stageHasAt) {
            db.setStageCompletedAt(stage.id, currentDate);
          } else if (stagePct < 100 && stageHasAt) {
            db.setStageCompletedAt(stage.id, null);
          }
          const tasks = db.getTasksByStage(stage.id) || [];
          for (const task of tasks) {
            const progress = db.getGoalTaskProgress(task.id, currentDate);
            const taskPct = Math.round(calculateTaskProgress(task, progress));
            const taskHasAt =
              task.completed_at !== null && task.completed_at !== undefined && task.completed_at !== '';
            if (taskPct === 100 && !taskHasAt) {
              db.setTaskCompletedAt(task.id, currentDate);
            } else if (taskPct < 100 && taskHasAt) {
              db.setTaskCompletedAt(task.id, null);
            }
          }
        }
      }

      const goals = await loadGoals();
      if (panelLevel === 'goals') {
        await renderGoals(goals);
      } else if (panelLevel === 'stages' && currentGoalId) {
        const stages = await loadStages(currentGoalId);
        await renderStages(stages);
      } else if (panelLevel === 'tasks' && currentStageId) {
        const tasks = await loadTasks(currentStageId);
        await renderTasks(tasks);
      }
      await syncNavChrome();
    };

    const syncNavChrome = async () => {
      const atRoot = panelLevel === 'goals';
      backTopBtn.disabled = atRoot;
      backTopBtn.setAttribute('aria-disabled', atRoot ? 'true' : 'false');
      backTopBtn.classList.toggle('goals-header-back-btn--disabled', atRoot);

      if (panelLevel === 'goals') {
        title.textContent = currentViewMode === 'archive' ? 'Архив целей' : 'Панель управления целями';
      } else if (panelLevel === 'stages' && currentGoalId) {
        const g = db.getById('cfg_goals', currentGoalId);
        title.textContent = g ? (g.title || 'Этапы цели') : 'Этапы цели';
      } else if (panelLevel === 'tasks' && currentStageId) {
        const s = db.getById('cfg_goal_stages', currentStageId);
        title.textContent = s ? (s.title || 'Задачи этапа') : 'Задачи этапа';
      }

      handlePanelAdd = async () => {
        if (panelLevel === 'goals') {
          await openGoalModal(null, async () => {
            const updatedGoals = await loadGoals();
            await renderGoals(updatedGoals);
          });
        } else if (panelLevel === 'stages') {
          await openStageModal(null, async () => {
            const updatedStages = await loadStages(currentGoalId);
            await renderStages(updatedStages);
          });
        } else {
          await openTaskModal(null, async () => {
            const updatedTasks = await loadTasks(currentStageId);
            await renderTasks(updatedTasks);
          });
        }
      };

      handlePanelBack = async () => {
        if (panelLevel === 'tasks') {
          panelLevel = 'stages';
          const stages = await loadStages(currentGoalId);
          await renderStages(stages);
        } else if (panelLevel === 'stages') {
          panelLevel = 'goals';
          currentGoalId = null;
          currentStageId = null;
          const gList = await loadGoals();
          await renderGoals(gList);
        }
        await syncNavChrome();
      };

    };

    const createAddCard = (label) => {
      const addCard = document.createElement('button');
      addCard.type = 'button';
      addCard.className = 'goals-add-dashed-card';
      const inner = document.createElement('span');
      inner.className = 'goals-add-dashed-card-inner';
      if (plusIconRaw) {
        const iconWrap = document.createElement('span');
        iconWrap.className = 'goals-add-dashed-card-icon';
        iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${plusIconRaw}</svg>`;
        inner.appendChild(iconWrap);
      }
      const lab = document.createElement('span');
      lab.className = 'goals-add-dashed-card-label';
      lab.textContent = label;
      inner.appendChild(lab);
      addCard.appendChild(inner);
      addCard.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handlePanelAdd();
      });
      return addCard;
    };

    // Функции для рендеринга
    const renderGoals = async (goals) => {
      panelList.innerHTML = '';

      if (goals.length === 0) {
        const emptyState = new EmptyState({ type: 'goals' });
        await emptyState.init();
        const emptyElement = emptyState.render();
        emptyElement.style.padding = 'var(--space-md)';
        emptyElement.style.minHeight = 'auto';
        panelList.appendChild(emptyElement);
        panelList.appendChild(createAddCard('Добавить цель'));
        return;
      }

      for (const goal of goals) {
        const card = await createGoalCard(goal);
        panelList.appendChild(card);
      }
      panelList.appendChild(createAddCard('Добавить цель'));
    };

    const renderStages = async (stages) => {
      panelList.innerHTML = '';

      if (!currentGoalId) {
        const emptyState = new EmptyState({ type: 'goals_select' });
        await emptyState.init();
        const emptyElement = emptyState.render();
        emptyElement.style.padding = 'var(--space-md)';
        emptyElement.style.minHeight = 'auto';
        panelList.appendChild(emptyElement);
        panelList.appendChild(createAddCard('Добавить этап'));
        return;
      }

      if (stages.length === 0) {
        const emptyState = new EmptyState({ type: 'stages' });
        await emptyState.init();
        const emptyElement = emptyState.render();
        emptyElement.style.padding = 'var(--space-md)';
        emptyElement.style.minHeight = 'auto';
        panelList.appendChild(emptyElement);
        panelList.appendChild(createAddCard('Добавить этап'));
        return;
      }

      let goalColor = null;
      if (currentGoalId) {
        const goal = db.getById('cfg_goals', currentGoalId);
        if (goal) {
          goalColor = goal.color;
        }
      }

      const stageStates = [];
      let allPreviousCompleted = true;
      for (const stage of stages) {
        const stageProgress = await calculateStageProgress(stage.id);
        const isCompleted = Math.round(stageProgress.progress) === 100;
        stageStates.push({
          stage,
          stageProgress,
          isCompleted,
          isInactive: !allPreviousCompleted
        });
        if (!isCompleted) {
          allPreviousCompleted = false;
        }
      }

      for (let i = 0; i < stageStates.length; i++) {
        const stageState = stageStates[i];
        const card = await createStageCard(stageState, goalColor);
        panelList.appendChild(card);

        if (i < stageStates.length - 1) {
          const shouldShowArrow = i === 0 || stageState.isCompleted;
          if (shouldShowArrow) {
            const arrow = document.createElement('div');
            arrow.className = 'goals-stage-flow-arrow goals-stage-flow-arrow--active';
            arrow.textContent = '↓';
            panelList.appendChild(arrow);
          }
        }
      }
      panelList.appendChild(createAddCard('Добавить этап'));
    };

    const renderTasks = async (tasks) => {
      panelList.innerHTML = '';

      if (!currentStageId) {
        const emptyState = new EmptyState({ type: 'tasks_select' });
        await emptyState.init();
        const emptyElement = emptyState.render();
        emptyElement.style.padding = 'var(--space-md)';
        emptyElement.style.minHeight = 'auto';
        panelList.appendChild(emptyElement);
        panelList.appendChild(createAddCard('Добавить задачу'));
        return;
      }

      if (tasks.length === 0) {
        const emptyState = new EmptyState({ type: 'tasks' });
        await emptyState.init();
        const emptyElement = emptyState.render();
        emptyElement.style.padding = 'var(--space-md)';
        emptyElement.style.minHeight = 'auto';
        emptyElement.style.gap = 'var(--space-sm)';
        const icon = emptyElement.querySelector('.empty-state-icon');
        if (icon) {
          icon.style.width = '40px';
          icon.style.height = '40px';
          icon.style.opacity = '0.3';
        }
        const title = emptyElement.querySelector('.empty-state-title');
        if (title) {
          title.style.fontSize = 'var(--font-sm)';
          title.style.opacity = '0.6';
        }
        panelList.appendChild(emptyElement);
        panelList.appendChild(createAddCard('Добавить задачу'));
        return;
      }

      let goalColor = null;
      if (currentGoalId) {
        const goal = db.getById('cfg_goals', currentGoalId);
        if (goal) {
          goalColor = goal.color;
        }
      }

      const tasksToShow = tasks;

      for (let i = 0; i < tasksToShow.length; i++) {
        const task = tasksToShow[i];
        const card = await createTaskCard(task, goalColor);
        panelList.appendChild(card);
      }
      panelList.appendChild(createAddCard('Добавить задачу'));
    };

    // Вспомогательные функции для создания элементов управления
    const createProgressSquare = (progressPercent) => {
      const progressSquare = document.createElement('div');
      progressSquare.className = 'goals-card-progress-square';
      if (progressPercent === 100) {
        if (checkIcon) {
          progressSquare.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="goals-progress-check-icon">${checkIcon}</svg>`;
        } else {
          progressSquare.innerHTML = '✓';
        }
        progressSquare.classList.add('completed');
      } else {
        progressSquare.textContent = `${progressPercent}%`;
      }
      return progressSquare;
    };

    const createControlDivider = () => {
      const divider = document.createElement('div');
      divider.className = 'goals-control-divider';
      return divider;
    };

    const addButtonsToGroup = (actionsGroup, buttons) => {
      buttons.forEach((btn, index) => {
        actionsGroup.appendChild(btn);
        if (index < buttons.length - 1) {
          actionsGroup.appendChild(createControlDivider());
        }
      });
    };

    const createProgressBarCells = (completed, total, color) => {
      const cellsContainer = document.createElement('div');
      cellsContainer.className = 'goals-progress-cells';
      
      const totalCells = total > 0 ? total : 1;
      const completedCells = Math.min(completed, total);
      
      const cellColor = color || getAccentColor();
      
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
    };

    // Функции создания карточек
    const createGoalCard = async (goal) => {
      const card = document.createElement('div');
      card.className = 'goals-column-card goals-panel-card';
      card.style.setProperty('--goal-color', goal.color || getAccentColor());

      // Вычисляем прогресс цели
      const goalProgress = await calculateGoalProgress(goal.id);
      const progressPercent = Math.round(goalProgress.progress);
      const isCompleted = progressPercent === 100;
      
      if (isCompleted) {
        card.classList.add('completed');
      }

      card.addEventListener('click', async () => {
        if (window.audioSystem) {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
          const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MENU_SELECT);
          if (sound) {
            window.audioSystem.play(sound);
          }
        }
        currentGoalId = goal.id;
        currentStageId = null;
        panelLevel = 'stages';
        const stages = await loadStages(currentGoalId);
        await renderStages(stages);
        await syncNavChrome();
      });

      // SECTION 1: Основная строка - иконка + название + прогресс-квадрат + кнопки
      const mainRow = document.createElement('div');
      mainRow.className = 'goals-card-main-row';
      
      const iconContainer = await createIconContainer(goal.icon, goal.color);
      mainRow.appendChild(iconContainer);

      appendCardTitleBlock(mainRow, goal.title, goal.completed_at, progressPercent);

      const goalProgressPercent = Math.round(goalProgress.progress);
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'goals-card-controls';
      
      const actions = document.createElement('div');
      actions.className = 'goals-card-actions-group';
      controlsContainer.appendChild(actions);
      
      mainRow.appendChild(controlsContainer);
      mainRow.appendChild(createProgressSquare(goalProgressPercent));
      card.appendChild(mainRow);

      // DIVIDER после основной строки
      const mainDivider = document.createElement('div');
      mainDivider.className = 'goals-card-inner-divider';
      card.appendChild(mainDivider);

      // SECTION 2: Описание + прогресс (две равные половины)
      const hasDescription = goal.description && goal.description.trim().length > 0;
      const splitRow = document.createElement('div');
      splitRow.className = `goals-card-split-row ${hasDescription ? 'has-description' : ''}`;

      if (hasDescription) {
        const descriptionSection = document.createElement('div');
        descriptionSection.className = 'goals-card-description-section';
        const description = document.createElement('div');
        description.className = 'goals-card-description-text';
        description.textContent = goal.description;
        descriptionSection.appendChild(description);
        splitRow.appendChild(descriptionSection);
      }

      const progressSection = document.createElement('div');
      progressSection.className = 'goals-card-progress-section';
      const progressTextContainer = document.createElement('div');
      progressTextContainer.className = 'goals-progress-text';
      progressTextContainer.textContent = `${goalProgress.completed}/${goalProgress.total}`;
      progressSection.appendChild(progressTextContainer);

      const progressBar = createProgressBarCells(goalProgress.completed, goalProgress.total, goal.color);
      progressSection.appendChild(progressBar);
      splitRow.appendChild(progressSection);
      card.appendChild(splitRow);

      // Кнопки управления
      const moveUpBtn = await new Button({
        iconName: 'chevron-up',
        onClick: async (e) => {
          e.stopPropagation();
          if (db.moveGoal(goal.id, 'up')) {
            const goals = await loadGoals();
            await renderGoals(goals);
          }
        }
      }).render();
      moveUpBtn.classList.add('goals-control-btn');

      const moveDownBtn = await new Button({
        iconName: 'chevron-down',
        onClick: async (e) => {
          e.stopPropagation();
          if (db.moveGoal(goal.id, 'down')) {
            const goals = await loadGoals();
            await renderGoals(goals);
          }
        }
      }).render();
      moveDownBtn.classList.add('goals-control-btn');

      const editBtn = await new Button({
        iconName: 'pencil',
        onClick: async (e) => {
          e.stopPropagation();
          await openGoalModal(goal, async () => {
            const updatedGoals = await loadGoals();
            await renderGoals(updatedGoals);
          });
        }
      }).render();
      editBtn.classList.add('goals-control-btn');

      const deleteBtn = await new Button({
        iconName: 'trash-2',
        onClick: async (e) => {
          e.stopPropagation();
          const goals = await loadGoals();
          if (goals.length <= 1) {
            const { customAlert } = await import('../../utils/customDialogs.js');
            await customAlert('Это последняя цель. Должна остаться хотя бы одна цель.');
            return;
          }
          const confirmed = await confirmWithSound('Удалить цель? Все этапы и задачи также будут удалены.');
          if (confirmed) {
            db.deleteGoal(goal.id);
            currentGoalId = null;
            currentStageId = null;
            panelLevel = 'goals';
            const goalsAfter = await loadGoals();
            await renderGoals(goalsAfter);
            await syncNavChrome();
          }
        }
      }).render();
      deleteBtn.classList.add('goals-control-btn');

      addButtonsToGroup(actions, [moveUpBtn, moveDownBtn, editBtn, deleteBtn]);

      return card;
    };

    const createStageCard = async (stageState, goalColor = null) => {
      const { stage, stageProgress, isCompleted, isInactive } = stageState;
      const card = document.createElement('div');
      card.className = 'goals-column-card goals-panel-card goals-stage-card';
      card.style.setProperty('--goal-color', goalColor || getAccentColor());
      const progressPercent = Math.round(stageProgress.progress);
      
      if (isCompleted) {
        card.classList.add('completed');
      }
      if (isInactive) {
        card.classList.add('goals-stage-card--inactive');
      } else {
        card.classList.add('goals-stage-card--active');
      }

      card.addEventListener('click', async () => {
        currentStageId = stage.id;
        panelLevel = 'tasks';
        const tasks = await loadTasks(currentStageId);
        await renderTasks(tasks);
        await syncNavChrome();
      });

      // SECTION 1: Основная строка - иконка + название + прогресс-квадрат + кнопки
      const mainRow = document.createElement('div');
      mainRow.className = 'goals-card-main-row';
      
      const iconContainer = await createIconContainer(stage.icon, goalColor);
      mainRow.appendChild(iconContainer);

      const stageRow = db.getById('cfg_goal_stages', stage.id);
      appendCardTitleBlock(
        mainRow,
        stage.title,
        stageRow ? stageRow.completed_at : stage.completed_at,
        progressPercent
      );

      const stageProgressPercent = Math.round(stageProgress.progress);
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'goals-card-controls';
      
      const actions = document.createElement('div');
      actions.className = 'goals-card-actions-group';
      
      const moveUpBtn = await new Button({
        iconName: 'chevron-up',
        onClick: async (e) => {
          e.stopPropagation();
          if (db.moveStage(stage.id, 'up')) {
            const stages = await loadStages(currentGoalId);
            await renderStages(stages);
          }
        }
      }).render();
      moveUpBtn.classList.add('goals-control-btn');

      const moveDownBtn = await new Button({
        iconName: 'chevron-down',
        onClick: async (e) => {
          e.stopPropagation();
          if (db.moveStage(stage.id, 'down')) {
            const stages = await loadStages(currentGoalId);
            await renderStages(stages);
          }
        }
      }).render();
      moveDownBtn.classList.add('goals-control-btn');

      const editBtn = await new Button({
        iconName: 'pencil',
        onClick: async (e) => {
          e.stopPropagation();
          await openStageModal(stage, async () => {
            const stages = await loadStages(currentGoalId);
            await renderStages(stages);
          });
        }
      }).render();
      editBtn.classList.add('goals-control-btn');

      const deleteBtn = await new Button({
        iconName: 'trash-2',
        onClick: async (e) => {
          e.stopPropagation();
          const confirmed = await confirmWithSound('Удалить этап?');
          if (confirmed) {
            db.deleteStage(stage.id);
            const stages = await loadStages(currentGoalId);
            if (currentStageId === stage.id) {
              currentStageId = stages.length > 0 ? stages[0].id : null;
            }
            await renderStages(stages);
            await syncNavChrome();
          }
        }
      }).render();
      deleteBtn.classList.add('goals-control-btn');

      addButtonsToGroup(actions, [moveUpBtn, moveDownBtn, editBtn, deleteBtn]);
      controlsContainer.appendChild(actions);
      
      mainRow.appendChild(controlsContainer);
      mainRow.appendChild(createProgressSquare(stageProgressPercent));
      card.appendChild(mainRow);

      // DIVIDER после основной строки
      const mainDivider = document.createElement('div');
      mainDivider.className = 'goals-card-inner-divider';
      card.appendChild(mainDivider);

      // SECTION 2: Описание + прогресс (две равные половины)
      const hasDescription = stage.description && stage.description.trim().length > 0;
      const splitRow = document.createElement('div');
      splitRow.className = `goals-card-split-row ${hasDescription ? 'has-description' : ''}`;

      if (hasDescription) {
        const descriptionSection = document.createElement('div');
        descriptionSection.className = 'goals-card-description-section';
        const description = document.createElement('div');
        description.className = 'goals-card-description-text';
        description.textContent = stage.description;
        descriptionSection.appendChild(description);
        splitRow.appendChild(descriptionSection);
      }

      const progressSection = document.createElement('div');
      progressSection.className = 'goals-card-progress-section';
      const progressTextContainer = document.createElement('div');
      progressTextContainer.className = 'goals-progress-text';
      progressTextContainer.textContent = `${stageProgress.completed}/${stageProgress.total}`;
      progressSection.appendChild(progressTextContainer);

      const progressBar = createProgressBarCells(stageProgress.completed, stageProgress.total, goalColor);
      progressSection.appendChild(progressBar);
      splitRow.appendChild(progressSection);
      card.appendChild(splitRow);

      return card;
    };

    const createTaskCard = async (task, goalColor = null) => {
      const card = document.createElement('div');
      card.className = 'goals-column-card goals-panel-task-card';
      card.style.setProperty('--goal-color', goalColor || getAccentColor());

      const progress = db.getGoalTaskProgress(task.id, currentDate);

      const mainRow = document.createElement('div');
      mainRow.className = 'goals-card-main-row';
      
      // Иконка с цветом цели
      const iconContainer = await createIconContainer(task.icon, goalColor);
      mainRow.appendChild(iconContainer);

      const taskProgress = calculateTaskProgress(task, progress);
      const taskPctRounded = Math.round(taskProgress);
      const taskFresh = db.getById('cfg_goal_tasks', task.id);
      appendCardTitleBlock(mainRow, task.title, taskFresh ? taskFresh.completed_at : task.completed_at, taskPctRounded);

      if (taskPctRounded === 100) {
        card.classList.add('completed');
      }

      // Квадрат прогресса (видна всегда!)
      // Контейнер для кнопок управления
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'goals-card-controls';
      
      // Компактная группа кнопок с разделителями
      const actions = document.createElement('div');
      actions.className = 'goals-card-actions-group';
      controlsContainer.appendChild(actions);
      
      mainRow.appendChild(controlsContainer);
      const taskProgressSquare = createProgressSquare(Math.round(taskProgress));
      if (taskPctRounded < 100) {
        taskProgressSquare.textContent = '';
        taskProgressSquare.classList.add('goals-card-progress-square--subtle');
      }
      mainRow.appendChild(taskProgressSquare);
      
      card.appendChild(mainRow);

      const divider = document.createElement('div');
      divider.className = 'goals-card-inner-divider';
      card.appendChild(divider);

      const hasDescription = task.description && String(task.description).trim();
      const splitRow = document.createElement('div');
      splitRow.className = `goals-card-split-row goals-task-split-row ${hasDescription ? 'has-description' : ''}`;

      if (hasDescription) {
        const descWrap = document.createElement('div');
        descWrap.className = 'goals-card-description-section';
        const descEl = document.createElement('p');
        descEl.className = 'goals-panel-task-description goals-card-description-text';
        descEl.textContent = task.description.trim();
        descWrap.appendChild(descEl);
        splitRow.appendChild(descWrap);
      }

      const taskRight = document.createElement('div');
      taskRight.className = 'goals-card-progress-section goals-task-progress-section';
      if (task.task_type === 'number') {
        taskRight.classList.add('goals-task-progress-section--number-minimal');
      }

      const controlCell = document.createElement('div');
      controlCell.className = 'tasks-task-control';
      controlCell.style.flex = '1 1 0';
      controlCell.style.minWidth = '0';
      controlCell.style.width = '100%';
      const tint = goalColor || getAccentColor();
      controlCell.style.setProperty('--task-control-border', hexToRgba(tint, 0.2));
      controlCell.style.setProperty('--task-control-bg', hexToRgba(tint, 0.05));
      controlCell.style.setProperty('--task-control-border-focus', tint);
      controlCell.style.setProperty('--task-control-bg-focus', hexToRgba(tint, 0.1));
      controlCell.style.setProperty('--task-control-border-hover', tint);
      controlCell.style.setProperty('--task-control-bg-hover', hexToRgba(tint, 0.08));
      controlCell.addEventListener('click', (e) => e.stopPropagation());

      let taskLinBar = null;

      if (task.task_type === 'checkbox') {
        const barBtn = document.createElement('button');
        barBtn.type = 'button';
        barBtn.className = 'goals-task-checkbox-bar';

        const syncBar = (completed) => {
          barBtn.textContent = completed ? 'Выполнено' : 'Не выполнено';
          barBtn.classList.toggle('is-done', !!completed);
        };
        syncBar(!!(progress && progress.completed === 1));

        barBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const currentProgress = db.getGoalTaskProgress(task.id, currentDate);
          const currentCompleted = currentProgress && currentProgress.completed === 1;
          const completed = !currentCompleted;
          db.saveGoalTaskProgress(task.id, currentDate, { completed });
          syncBar(completed);
          await updateProgress();
          const updatedProgress = db.getGoalTaskProgress(task.id, currentDate);
          const updatedTaskProgress = calculateTaskProgress(task, updatedProgress);
          const progressSquare = card.querySelector('.goals-card-progress-square');
          if (progressSquare) {
            if (updatedTaskProgress === 100) {
              if (checkIcon) {
                progressSquare.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="goals-progress-check-icon">${checkIcon}</svg>`;
              } else {
                progressSquare.innerHTML = '✓';
              }
              progressSquare.classList.add('completed');
            } else {
              progressSquare.textContent = `${Math.round(updatedTaskProgress)}%`;
              progressSquare.classList.remove('completed');
            }
          }
        });

        controlCell.appendChild(barBtn);
      } else if (task.task_type === 'number') {
        const linTotal = task.target_value > 0 ? task.target_value : 1;
        const linDone = Math.min(progress?.current_value || 0, linTotal);
        const progressPercent = Math.round((linDone / (linTotal > 0 ? linTotal : 1)) * 100);
        taskLinBar = createLinearProgressBar(linDone, linTotal, goalColor, { labelText: `${progressPercent}%` });
        taskLinBar.classList.add('goals-panel-task-linear', 'goals-panel-task-linear--compact');

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'tasks-number-input-wrapper';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'tasks-number-input';
        const currentValue = progress ? progress.current_value || 0 : 0;
        const numValue = parseFloat(currentValue) || 0;
        input.value = numValue;
        input.min = 0;
        input.step = task.unit === 'км' || task.unit === 'л' ? 0.1 : 1;

        const inputContent = document.createElement('div');
        inputContent.className = 'tasks-number-input-content';

        const unit = task.unit || '';
        const targetValue = task.target_value || 0;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'tasks-number-input-value';

        const suffixSpan = document.createElement('span');
        suffixSpan.className = 'tasks-number-input-suffix';

        const updateDisplay = (value) => {
          const val = parseFloat(value) || 0;
          if (targetValue > 0 && val === 0) {
            valueSpan.textContent = '';
            valueSpan.style.display = 'none';
            suffixSpan.textContent = unit ? `${targetValue} ${unit}`.trim() : `${targetValue}`;
            suffixSpan.style.opacity = '0.5';
            suffixSpan.style.color = 'var(--color-on-surface-secondary)';
          } else {
            valueSpan.textContent = String(val);
            valueSpan.style.display = 'inline';
            suffixSpan.textContent = unit;
            suffixSpan.style.opacity = '1';
            suffixSpan.style.color = 'var(--color-on-surface)';
          }
        };

        updateDisplay(numValue);

        inputContent.appendChild(valueSpan);
        inputContent.appendChild(suffixSpan);
        inputWrapper.appendChild(input);
        inputWrapper.appendChild(inputContent);

        const refreshAfterSave = async () => {
          await updateProgress();
          const updatedProgress = db.getGoalTaskProgress(task.id, currentDate);
          const updatedTaskProgress = calculateTaskProgress(task, updatedProgress);
          const progressSquare = card.querySelector('.goals-card-progress-square');
          if (progressSquare) {
            if (updatedTaskProgress === 100) {
              if (checkIcon) {
                progressSquare.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="goals-progress-check-icon">${checkIcon}</svg>`;
              } else {
                progressSquare.innerHTML = '✓';
              }
              progressSquare.classList.add('completed');
            } else {
              progressSquare.textContent = `${Math.round(updatedTaskProgress)}%`;
              progressSquare.classList.remove('completed');
            }
          }
        };

        input.addEventListener('focus', () => {
          inputWrapper.style.borderColor =
            'var(--task-control-border-focus, var(--task-color, var(--color-accent-ui, var(--color-accent))))';
          inputWrapper.style.backgroundColor =
            'var(--task-control-bg-focus, var(--task-control-bg-hover, rgba(255, 255, 255, 0.05)))';
          inputContent.style.opacity = '0';
          inputContent.style.pointerEvents = 'none';
        });

        input.addEventListener('input', (e) => {
          updateDisplay(e.target.value || '0');
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
          }
        });

        input.addEventListener('blur', async (e) => {
          e.stopPropagation();
          inputWrapper.style.borderColor = '';
          inputWrapper.style.backgroundColor = '';
          const newValue = parseFloat(e.target.value) || 0;
          input.value = newValue;
          updateDisplay(newValue);
          inputContent.style.opacity = '1';
          inputContent.style.pointerEvents = 'none';
          db.saveGoalTaskProgress(task.id, currentDate, { current_value: newValue });
          await refreshAfterSave();
        });

        controlCell.appendChild(inputWrapper);
      }

      taskRight.appendChild(controlCell);
      if (taskLinBar) {
        taskRight.appendChild(taskLinBar);
      }
      splitRow.appendChild(taskRight);
      card.appendChild(splitRow);

      // Кнопки перемещения
      const moveUpBtn = await new Button({
        iconName: 'chevron-up',
        onClick: async (e) => {
          e.stopPropagation();
          if (db.moveTask(task.id, 'up')) {
            const tasks = await loadTasks(currentStageId);
            await renderTasks(tasks);
          }
        }
      }).render();
      moveUpBtn.classList.add('goals-control-btn');

      const moveDownBtn = await new Button({
        iconName: 'chevron-down',
        onClick: async (e) => {
          e.stopPropagation();
          if (db.moveTask(task.id, 'down')) {
            const tasks = await loadTasks(currentStageId);
            await renderTasks(tasks);
          }
        }
      }).render();
      moveDownBtn.classList.add('goals-control-btn');

      const editBtn = await new Button({
        iconName: 'pencil',
        onClick: async (e) => {
          e.stopPropagation();
          await openTaskModal(task, async () => {
            const updatedTasks = await loadTasks(currentStageId);
            await renderTasks(updatedTasks);
          });
        }
      }).render();
      editBtn.classList.add('goals-control-btn');

      const deleteBtn = await new Button({
        iconName: 'trash-2',
        onClick: async (e) => {
          e.stopPropagation();
          const confirmed = await confirmWithSound('Удалить задачу?');
          if (confirmed) {
            db.deleteTask(task.id);
            const tasks = await loadTasks(currentStageId);
            await renderTasks(tasks);
          }
        }
      }).render();
      deleteBtn.classList.add('goals-control-btn');

      // Добавляем кнопки в группу с разделителями
      addButtonsToGroup(actions, [moveUpBtn, moveDownBtn, editBtn, deleteBtn]);

      return card;
    };

    // Функции для открытия модальных окон редактирования
    const openGoalModal = async (goal, onSave) => {
      const config = CFG_CONFIGS['goals'];
      await ConfigModal.open(config, goal, async (data) => {
        try {
          if (goal) {
            db.updateGoal(goal.id, data);
          } else {
            db.addGoal(data);
          }
          if (onSave) await onSave();
        } catch (error) {
          console.error('[GoalsModal] Ошибка сохранения цели:', error);
          alert('Ошибка при сохранении цели');
        }
      });
    };

    const openStageModal = async (stage, onSave) => {
      const config = CFG_CONFIGS['goal-stages'];
      const dataToEdit = stage ? { ...stage } : { goal_id: currentGoalId };
      await ConfigModal.open(config, dataToEdit, async (data) => {
        try {
          if (stage) {
            db.updateStage(stage.id, data);
          } else {
            data.goal_id = currentGoalId;
            db.addStage(data);
          }
          
          // Обновляем список этапов и автоматически выбираем первый, если это новый этап
          const updatedStages = await loadStages(currentGoalId);
          if (!stage && updatedStages.length > 0) {
            currentStageId = updatedStages[updatedStages.length - 1].id;
          }
          await renderStages(updatedStages);
          await syncNavChrome();

          if (onSave) await onSave();
        } catch (error) {
          console.error('[GoalsModal] Ошибка сохранения этапа:', error);
          alert('Ошибка при сохранении этапа: ' + error.message);
        }
      });
    };

    const openTaskModal = async (task, onSave) => {
      const config = CFG_CONFIGS['goal-tasks'];
      const dataToEdit = task ? { ...task } : { stage_id: currentStageId, task_type: 'checkbox' };
      await ConfigModal.open(config, dataToEdit, async (data) => {
        try {
          if (task) {
            db.updateTask(task.id, data);
          } else {
            data.stage_id = currentStageId;
            db.addTask(data);
          }
          
          // Обновляем список задач
          const updatedTasks = await loadTasks(currentStageId);
          await renderTasks(updatedTasks);
          
          if (onSave) await onSave();
        } catch (error) {
          console.error('[GoalsModal] Ошибка сохранения задачи:', error);
          alert('Ошибка при сохранении задачи: ' + error.message);
        }
      });
    };

    // Инициализация
    const goals = await loadGoals();

    if (selectedGoal) {
      currentGoalId = selectedGoal.id;
      currentStageId = null;
      panelLevel = 'stages';
      const stages = await loadStages(currentGoalId);
      await renderStages(stages);
    } else {
      currentGoalId = null;
      currentStageId = null;
      panelLevel = 'goals';
      await renderGoals(goals);
    }
    await syncNavChrome();

    // Функция для обновления заголовка в зависимости от режима
    const updateTitle = (mode) => {
      if (mode === 'archive') {
        title.textContent = 'Архив целей';
      } else {
        title.textContent = 'Панель управления целями';
      }
    };

    // Обработчик изменения режима просмотра
    const viewModeInputs = viewModeRadioElement.querySelectorAll('input[type="radio"]');
    viewModeInputs.forEach(input => {
      input.addEventListener('change', async () => {
        if (input.checked) {
          currentViewMode = input.value;
          updateTitle(currentViewMode);
          
          const updatedGoals = await loadGoals();
          currentGoalId = null;
          currentStageId = null;
          panelLevel = 'goals';
          await renderGoals(updatedGoals);
          await syncNavChrome();
        }
      });
    });

  const handleEscape = (e) => {
    if (e.key === 'Escape' && escapeGate()) {
      e.preventDefault();
      requestClose();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  const dispose = () => {
    document.removeEventListener('keydown', handleEscape);
  };

  return { content, dispose };
}
