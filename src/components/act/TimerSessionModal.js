import { Modal } from '../layout/index.js';
import Button from '../form/Button.js';
import SelectWithIcons from '../../composites/SelectWithIcons.js';
import InputSuffix from '../../composites/InputSuffix.js';
import RadioButton from '../form/RadioButton.js';
import { iconLoader } from '../../utils/index.js';

class TimerSessionModal {
  static async open(session, onSave) {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TimerSessionModal] База данных недоступна');
      return;
    }
    const db = getDB();
    if (!db) {
      console.error('[TimerSessionModal] База данных не инициализирована');
      return;
    }
    
    // Загружаем задачи из разных таблиц
    const timerTasks = db.getAll('cfg_tasks').filter(t => t.task_type === 'timer');
    const escapeTasks = db.getAll('cfg_leisure_tasks').filter(t => t.leisure_type === 'escape');
    const fillingTasks = db.getAll('cfg_leisure_tasks').filter(t => t.leisure_type === 'filling');
    const allTasks = [...timerTasks, ...escapeTasks, ...fillingTasks];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content timer-session-modal-content edit-modal-content';
    content.style.width = '40vw';
    content.style.maxWidth = '600px';
    content.style.minWidth = '400px';
    content.style.maxHeight = '85vh';
    
    const isCreateMode = !session || !session.id;
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">${isCreateMode ? 'Добавить сессию' : 'Изменить сессию'}</h3>
      <button class="modal-close">×</button>
    `;
    content.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    // Загружаем задачи для значений по умолчанию при создании
    const firstTaskId = allTasks.length > 0 ? allTasks[0].id : null;
    
    // Состояние формы (для создания — значения по умолчанию)
    const formState = {
      task_id: session?.task_id || firstTaskId,
      duration: session?.duration ?? 25 * 60,
      timer_type: session?.timer_type || 'timer'
    };
    
    // Тип таймера - ПЕРВЫМ в самом верху
    const typeSection = document.createElement('div');
    typeSection.style.display = 'flex';
    typeSection.style.flexDirection = 'column';
    typeSection.style.gap = 'var(--space-sm)';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Тип таймера';
    typeLabel.style.fontSize = 'var(--font-sm)';
    typeLabel.style.color = 'var(--color-on-surface-secondary)';
    
    let timerIcon = '';
    let stopwatchIcon = '';
    try {
      timerIcon = await iconLoader.loadIcon('timer');
    } catch (e) {
      console.warn('[TimerSessionModal] Не удалось загрузить иконку timer');
    }
    try {
      stopwatchIcon = await iconLoader.loadIcon('clock');
    } catch (e) {
      console.warn('[TimerSessionModal] Не удалось загрузить иконку clock');
    }
    
    const typeRadio = new RadioButton({
      name: 'session-timer-type',
      iconOnly: true,
      value: formState.timer_type,
      items: [
        { value: 'timer', icon: timerIcon },
        { value: 'stopwatch', icon: stopwatchIcon }
      ]
    });
    
    // Добавляем обработчики
    const typeInputs = typeRadio.element.querySelectorAll('input[type="radio"]');
    typeInputs.forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) {
          formState.timer_type = input.value;
        }
      });
    });
    
    typeSection.appendChild(typeLabel);
    typeSection.appendChild(typeRadio.render());
    body.appendChild(typeSection);
    
    // Выбор задачи
    const taskSection = document.createElement('div');
    taskSection.style.display = 'flex';
    taskSection.style.flexDirection = 'column';
    taskSection.style.gap = 'var(--space-sm)';
    
    const taskLabel = document.createElement('label');
    taskLabel.textContent = 'Задача';
    taskLabel.style.fontSize = 'var(--font-sm)';
    taskLabel.style.color = 'var(--color-on-surface-secondary)';
    
    // Загружаем иконки для задач
    const taskItems = await Promise.all(allTasks.map(async (task) => {
      let icon = '';
      if (task.icon) {
        try {
          icon = await iconLoader.loadIcon(task.icon);
        } catch (e) {
          console.warn(`[TimerSessionModal] Не удалось загрузить иконку ${task.icon}:`, e);
        }
      }
      return {
        value: task.id,
        text: task.title || 'Без названия',
        icon: icon
      };
    }));
    
    const taskSelect = new SelectWithIcons({
      items: taskItems.length > 0 ? taskItems : [{ value: '', text: 'Нет задач' }]
    });
    await taskSelect.init();
    await taskSelect.render(); // Инициализируем CustomSelect
    
    // Устанавливаем выбранное значение
    if (formState.task_id && taskSelect.customSelect) {
      const selectedIndex = taskItems.findIndex(item => item.value === formState.task_id);
      if (selectedIndex >= 0) {
        taskSelect.customSelect.selectOption(selectedIndex);
      }
    }
    
    // Сохраняем изменения при выборе задачи
    if (taskSelect.customSelect) {
      const originalSelectOption = taskSelect.customSelect.selectOption.bind(taskSelect.customSelect);
      taskSelect.customSelect.selectOption = (index) => {
        originalSelectOption(index);
        if (taskItems[index]) {
          formState.task_id = taskItems[index].value;
        }
      };
    }
    
    taskSection.appendChild(taskLabel);
    taskSection.appendChild(taskSelect.element);
    body.appendChild(taskSection);
    
    // Целевая продолжительность не нужна для уже завершенной сессии - убираем это поле
    
    // Продолжительность (в секундах)
    const durationSection = document.createElement('div');
    durationSection.style.display = 'flex';
    durationSection.style.flexDirection = 'column';
    durationSection.style.gap = 'var(--space-sm)';
    
    const durationLabel = document.createElement('label');
    durationLabel.textContent = 'Продолжительность';
    durationLabel.style.fontSize = 'var(--font-sm)';
    durationLabel.style.color = 'var(--color-on-surface-secondary)';
    
    // Конвертируем секунды в минуты:секунды для отображения
    const durationSeconds = formState.duration || 0;
    const totalMinutes = Math.floor(durationSeconds / 60);
    const totalSeconds = durationSeconds % 60;
    
    const durationMinutesInput = new InputSuffix({
      type: 'number',
      placeholder: '0',
      min: 0,
      step: 1,
      suffix: 'мин',
      value: totalMinutes
    });
    await durationMinutesInput.init();
    
    const durationSecondsInput = new InputSuffix({
      type: 'number',
      placeholder: '0',
      min: 0,
      max: 59,
      step: 1,
      suffix: 'сек',
      value: totalSeconds
    });
    await durationSecondsInput.init();
    
    // Обновляем общую продолжительность при изменении
    const updateDuration = () => {
      const minutes = parseInt(durationMinutesInput.element.querySelector('input').value) || 0;
      const seconds = parseInt(durationSecondsInput.element.querySelector('input').value) || 0;
      formState.duration = minutes * 60 + seconds;
    };
    
    durationMinutesInput.element.querySelector('input').addEventListener('input', updateDuration);
    durationSecondsInput.element.querySelector('input').addEventListener('input', updateDuration);
    
    const durationInputsContainer = document.createElement('div');
    durationInputsContainer.style.display = 'flex';
    durationInputsContainer.style.gap = 'var(--space-sm)';
    durationInputsContainer.appendChild(durationMinutesInput.render());
    durationInputsContainer.appendChild(durationSecondsInput.render());
    
    durationSection.appendChild(durationLabel);
    durationSection.appendChild(durationInputsContainer);
    body.appendChild(durationSection);
    
    content.appendChild(body);
    
    // Футер с кнопками
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const cancelBtn = new Button({
      text: 'Отмена',
      variant: 'secondary'
    });
    await cancelBtn.init();
    cancelBtn.element.setAttribute('data-cancel-button', 'true');
    cancelBtn.element.addEventListener('click', () => {
      modalInstance.close();
      document.body.removeChild(modal);
    });
    footer.appendChild(cancelBtn.element);
    
    const saveBtn = new Button({
      text: 'Сохранить',
      variant: 'success'
    });
    await saveBtn.init();
    saveBtn.element.setAttribute('data-confirm-button', 'true');
    saveBtn.element.addEventListener('click', async () => {
      try {
        // Валидация
        if (!formState.task_id) {
          alert('Выберите задачу');
          return;
        }
        
        if (!formState.duration || formState.duration <= 0) {
          alert('Введите корректную продолжительность');
          return;
        }
        
        if (onSave) {
          if (isCreateMode) {
            await onSave(null, { ...formState, date: session?.date });
          } else {
            await onSave(session.id, formState);
          }
          modalInstance.close();
          document.body.removeChild(modal);
        }
      } catch (error) {
        console.error('[TimerSessionModal] Ошибка при сохранении:', error);
        alert(`Ошибка при сохранении: ${error.message}`);
      }
    });
    footer.appendChild(saveBtn.element);
    
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    const modalInstance = new Modal(modal);
    modalInstance.open();
    
    // Автофокус на тип таймера
    setTimeout(() => {
      const firstRadio = typeRadio.element.querySelector('input[type="radio"]');
      if (firstRadio) {
        firstRadio.focus();
      }
    }, 100);
  }
}

export default TimerSessionModal;



