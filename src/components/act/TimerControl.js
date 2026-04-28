import Section from '../layout/Section.js';
import RadioButton from '../form/RadioButton.js';
import InputSuffix from '../../composites/InputSuffix.js';
import { iconLoader, DayLockManager } from '../../utils/index.js';
import { getCategoryColor, hslToHex, applyIconBackground } from '../../utils/colorConversion.js';
import eventBus from '../../system/core/EventBus.js';
import TimerFullscreen from './TimerFullscreen.js';
import { audioSystem } from '../../system/services/index.js';

class TimerControl {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TimerControl] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
    }
    
    this.element = null;
    this.section = null;
    this.contentElement = null;
    this.selectedTask = null;
    this.timerType = 'timer'; // 'timer' или 'stopwatch'
    this.onSessionComplete = null;
    
    // Маппинг названий для динамического заголовка
    this.titleMap = {
      timer: 'Таймер',
      stopwatch: 'Секундомер'
    };
    this.dayLockManager = null;
    this.lockIcon = null;
    this.currentDate = null;
    
    // Состояние таймера
    this.isRunning = false;
    this.timerInterval = null;
    this.startTime = null;
    this.elapsedTime = 0; // в секундах
    this.targetDuration = 25 * 60; // 25 минут по умолчанию
    this.isEditingDuration = false; // Режим редактирования времени для таймера
    
    // Полноэкранный режим
    this.fullscreen = null;
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

    // Подписываемся на команды от main процесса для управления таймером
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      
      // Обработка команды паузы
      ipcRenderer.on('timer:pause', () => {
        if (this.isRunning) {
          this.pauseTimer();
        }
      });
      
      // Обработка команды возобновления
      ipcRenderer.on('timer:resume', () => {
        if (!this.isRunning && this.elapsedTime > 0) {
          this.startTimer();
        }
      });
      
      // Обработка команды остановки
      ipcRenderer.on('timer:stop', async () => {
        if (this.isRunning || this.elapsedTime > 0) {
          this.stopTimer();
          await this.completeSession(false);
        }
      });
      
      // Синхронизация состояния при показе окна
      ipcRenderer.on('timer:sync-state', () => {
        this.sendTimerState();
      });
    }

    // Загружаем иконки для radio buttons
    const timerIcon = await iconLoader.loadIcon('timer').catch(() => '');
    const stopwatchIcon = await iconLoader.loadIcon('clock').catch(() => '');
    
    this.radioButton = new RadioButton({
      name: 'timer-mode',
      iconOnly: true,
      value: this.timerType, // Устанавливаем текущий режим
      items: [
        { value: 'timer', icon: timerIcon },
        { value: 'stopwatch', icon: stopwatchIcon }
      ]
    });
    
    const radioButtonElement = this.radioButton.render();
    
    // Обработчик изменения режима
    const radioInputs = radioButtonElement.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked && !this.isLocked()) {
          this.timerType = input.value;
          this.updateSectionTitle();
          // При переключении на секундомер всегда сбрасываем на 0
          if (this.timerType === 'stopwatch') {
            this.elapsedTime = 0;
          }
          // При переключении на таймер сбрасываем elapsedTime, но сохраняем targetDuration
          if (this.timerType === 'timer') {
            this.elapsedTime = 0;
          }
          this.isEditingDuration = false; // Выходим из режима редактирования
          this.stopTimer(); // Останавливаем таймер при переключении режима
          this.renderContent();
          this.sendTimerState();
        }
      });
    });
    
    // Создаем секцию с начальным названием
    const initialTitle = this.titleMap[this.timerType] || this.titleMap.timer;
    this.section = new Section({ 
      title: initialTitle,
      titleActions: radioButtonElement
    });
    this.element = this.section.render();
    
    // Создаем иконку блокировки
    if (this.dayLockManager) {
      this.lockIcon = await this.dayLockManager.createLockIcon();
      this.lockIcon.style.display = 'none';
      this.section.setLockIcon(this.lockIcon);
    }
    
    // Создаем контейнер для контента
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'timer-control-content';
    // Оптимизируем высоту контента для равномерного распределения
    this.contentElement.style.flex = '1 1 0%';
    this.contentElement.style.minHeight = '0';
    this.contentElement.style.maxHeight = '100%';
    this.contentElement.style.overflow = 'hidden';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.element.appendChild(this.contentElement);
    
    // Подписываемся на изменения даты
    if (selectedDateState) {
      selectedDateState.subscribe(async (date, dateString) => {
        this.currentDate = dateString;
        await this.updateLockState();
      });
    }
    
    // Рендерим контент
    this.renderContent();
    await this.updateLockState();
    
    // Отправляем начальное состояние
    this.sendTimerState();
  }

  isLocked() {
    return this.dayLockManager?.getIsLocked() || false;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getDisplayTime() {
    if (this.timerType === 'stopwatch') {
      return this.formatTime(this.elapsedTime);
    } else {
      // Таймер: обратный отсчет
      const remaining = Math.max(0, this.targetDuration - this.elapsedTime);
      return this.formatTime(remaining);
    }
  }

  async startTimer() {
    if (this.isLocked() || this.isRunning) return;
    
    // Если таймер был на паузе, воспроизводим звук возобновления
    const wasPaused = this.elapsedTime > 0 && !this.isRunning;
    
    this.isRunning = true;
    this.startTime = Date.now() - (this.elapsedTime * 1000);
    
    // Воспроизводим звук запуска/возобновления таймера через типизированную систему
    if (audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES } = await import('../../system/audio/soundConfig.js');
      let sound;
      if (wasPaused) {
        // Возобновление после паузы
        sound = getSoundByType(SOUND_CATEGORIES.TIMER, 'timerResume');
      } else {
        // Обычный запуск
        sound = getSoundByType(SOUND_CATEGORIES.TIMER, 'timerStart');
      }
      if (sound) {
        audioSystem.play(sound);
      }
    }
    
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      
      // Для таймера: проверяем окончание
      if (this.timerType === 'timer' && this.elapsedTime >= this.targetDuration) {
        this.stopTimer();
        // При естественном завершении используем finished-timer
        this.completeSession(true);
        return;
      }
      
      this.updateDisplay();
      this.sendTimerState();
    }, 100);
    
    // Открываем полноэкранный режим
    if (!this.fullscreen) {
      this.fullscreen = new TimerFullscreen(this);
    }
    this.fullscreen.open();
    
    // Обновляем состояние кнопки паузы в полноэкранном режиме
    if (this.fullscreen) {
      this.fullscreen.updatePauseButton(true);
      // Возобновляем ambient при старте таймера (если был выбран)
      this.fullscreen.resumeAmbient();
    }
    
    this.renderContent();
    this.sendTimerState();
  }

  async pauseTimer() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Воспроизводим звук паузы через типизированную систему
    if (audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES } = await import('../../system/audio/soundConfig.js');
      const sound = getSoundByType(SOUND_CATEGORIES.TIMER, 'timerPause');
      if (sound) {
        audioSystem.play(sound);
      }
    }
    
    // Обновляем полноэкранный режим
    if (this.fullscreen) {
      this.fullscreen.updatePauseButton(false);
      // Приостанавливаем ambient при паузе таймера (но не если показывается перерыв)
      if (!this.fullscreen.isBreakVisible) {
        this.fullscreen.pauseAmbient();
      }
    }
    
    this.renderContent();
    this.sendTimerState();
  }

  stopTimer() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.sendTimerState();
  }

  resetTimer() {
    this.stopTimer();
    // Для секундомера всегда сбрасываем на 0
    if (this.timerType === 'stopwatch') {
      this.elapsedTime = 0;
    } else {
      // Для таймера сбрасываем прошедшее время, но сохраняем целевое время
      this.elapsedTime = 0;
    }
    this.isEditingDuration = false;
    this.renderContent();
    this.sendTimerState();
  }

  updateDisplay() {
    const display = this.contentElement?.querySelector('.timer-display');
    if (display) {
      display.textContent = this.getDisplayTime();
    }
  }

  async completeSession(isNaturalCompletion = false) {
    if (!this.selectedTask || !this.db) return;
    // Убираем проверку elapsedTime === 0 - пользователь должен иметь возможность завершить сессию в любой момент
    
    // Воспроизводим звук в зависимости от типа завершения через типизированную систему
    if (audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES } = await import('../../system/audio/soundConfig.js');
      let sound = null;
      
      if (isNaturalCompletion) {
        // Естественное завершение (таймер дошел до конца)
        sound = getSoundByType(SOUND_CATEGORIES.TIMER, 'timerFinish');
      } else {
        // Преждевременное завершение (кнопка Стоп)
        sound = getSoundByType(SOUND_CATEGORIES.TIMER, 'timerCancel');
      }
      
      if (sound) {
        audioSystem.play(sound);
      }
    }
    
    try {
      const sessionId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = {
        id: sessionId,
        date: this.currentDate,
        task_id: this.selectedTask.id,
        duration: this.elapsedTime,
        timer_type: this.timerType,
        target_duration: this.timerType === 'timer' ? this.targetDuration : null
      };
      
      // Сохраняем в БД
      this.db.addTimerSession(session);
      
      // Отправляем событие через EventBus с деталями ПОСЛЕ сохранения
      // Используем небольшую задержку для гарантии, что данные сохранены в БД
      setTimeout(() => {
        if (typeof eventBus !== 'undefined' && eventBus) {
          eventBus.emit('timerSessionAdded', {
            action: 'create',
            data: session,
            affectedIds: [session.id],
            date: session.date
          });
        }
      }, 10); // Небольшая задержка для гарантии сохранения в БД
      
      // Вызываем callback для обновления UI (список сессий и задач)
      if (this.onSessionComplete) {
        await this.onSessionComplete(session);
      }
      
      // Останавливаем ambient при завершении сессии
      if (this.fullscreen) {
        await this.fullscreen.stopAmbient();
      }
      
      // Закрываем полноэкранный режим
      if (this.fullscreen) {
        await this.fullscreen.close();
      }
      
      // Сбрасываем таймер после сохранения
      this.resetTimer();
      this.sendTimerState();
      
      // Отправляем событие завершения таймера в main процесс для уведомления
      if (typeof require !== 'undefined') {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('timer:completed', {
            isNaturalCompletion,
            taskTitle: this.selectedTask?.title || null
          });
        } catch (e) {
          console.warn('[TimerControl] Не удалось отправить событие завершения:', e);
        }
      }
    } catch (e) {
      console.error('[TimerControl] Ошибка сохранения сессии:', e);
    }
  }

  /**
   * Форматирует время в минутах для отображения в инпуте (целые числа)
   */
  formatDurationForInput(seconds) {
    return Math.round(seconds / 60).toString();
  }

  /**
   * Парсит время из инпута (минуты) в секунды
   */
  parseDurationFromInput(value) {
    const minutes = parseInt(value, 10) || 0;
    return Math.max(0, minutes * 60);
  }

  /**
   * Создает UI для редактирования времени таймера
   */
  createTimerDurationEditor() {
    const editor = document.createElement('div');
    editor.style.display = 'flex';
    editor.style.flexDirection = 'column';
    editor.style.gap = 'var(--space-sm)';
    editor.style.width = '100%';
    editor.style.maxWidth = '300px';
    editor.style.alignItems = 'center';

    // Минималистичный инпут для ввода времени
    const inputWrapper = document.createElement('div');
    inputWrapper.style.width = '100%';
    inputWrapper.style.display = 'flex';
    inputWrapper.style.gap = 'var(--space-xs)';
    inputWrapper.style.alignItems = 'center';
    inputWrapper.style.justifyContent = 'center';

    const durationInput = new InputSuffix({
      type: 'number',
      value: this.formatDurationForInput(this.targetDuration),
      suffix: 'мин',
      min: 1,
      step: 1,
      placeholder: '0'
    });

    const inputElement = durationInput.getInput();
    inputElement.style.textAlign = 'center';
    inputElement.style.fontSize = 'clamp(1rem, 3vh, 1.5rem)';
    inputElement.style.fontWeight = 'var(--font-medium)';
    inputElement.style.border = 'none';
    inputElement.style.background = 'transparent';
    inputElement.style.padding = '0';
    inputElement.style.width = '60px';
    inputElement.style.maxHeight = '100%';
    
    // Упрощаем суффикс
    const suffixElement = inputWrapper.querySelector('.input-suffix');
    if (suffixElement) {
      suffixElement.style.fontSize = 'var(--font-sm)';
      suffixElement.style.opacity = '0.5';
      suffixElement.style.marginLeft = 'var(--space-xs)';
    }

    inputElement.addEventListener('change', () => {
      const newDuration = this.parseDurationFromInput(inputElement.value);
      if (newDuration > 0) {
        this.targetDuration = newDuration;
        // Если таймер не запущен, обновляем отображение
        if (!this.isRunning) {
          this.updateDisplay();
        }
        this.sendTimerState();
      }
    });

    inputElement.addEventListener('blur', () => {
      // При потере фокуса валидируем и обновляем значение
      const newDuration = this.parseDurationFromInput(inputElement.value);
      if (newDuration <= 0) {
        // Если значение некорректное, возвращаем предыдущее
        inputElement.value = this.formatDurationForInput(this.targetDuration);
      } else {
        this.targetDuration = newDuration;
        this.sendTimerState();
      }
    });

    // Максимально минималистичные пресеты времени
    const quickSelect = document.createElement('div');
    quickSelect.style.display = 'flex';
    quickSelect.style.gap = 'var(--space-lg)';
    quickSelect.style.justifyContent = 'center';
    quickSelect.style.width = '100%';
    quickSelect.style.marginTop = 'var(--space-xs)';
    quickSelect.style.fontSize = 'var(--font-xs)';
    quickSelect.style.color = 'var(--color-on-surface-secondary)';
    quickSelect.style.opacity = '0.5';

    const quickTimes = [
      { label: '5', value: 5 * 60 },
      { label: '15', value: 15 * 60 },
      { label: '25', value: 25 * 60 },
      { label: '45', value: 45 * 60 },
      { label: '60', value: 60 * 60 },
      { label: '120', value: 2 * 60 * 60 }
    ];

    quickTimes.forEach(({ label, value }, index) => {
      const span = document.createElement('span');
      span.textContent = label;
      span.style.cssText = `
        cursor: pointer;
        transition: opacity 0.15s ease;
        user-select: none;
      `;
      
      // Активное состояние - просто чуть темнее
      if (this.targetDuration === value) {
        span.style.opacity = '1';
      } else {
        span.style.opacity = '0.4';
      }
      
      span.addEventListener('mouseenter', () => {
        if (this.targetDuration !== value) {
          span.style.opacity = '0.7';
        }
      });
      
      span.addEventListener('mouseleave', () => {
        if (this.targetDuration !== value) {
          span.style.opacity = '0.4';
        }
      });
      
      span.addEventListener('click', async () => {
        if (!this.isLocked() && !this.isRunning) {
          // Воспроизводим звук выбора времени
          if (window.audioSystem) {
            const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
            const sound = getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_DEFAULT);
            if (sound) {
              window.audioSystem.play(sound);
            }
          }
          this.targetDuration = value;
          inputElement.value = this.formatDurationForInput(value);
          // Обновляем opacity всех элементов
          quickSelect.querySelectorAll('span').forEach(s => {
            if (s === span) {
              s.style.opacity = '1';
            } else {
              s.style.opacity = '0.4';
            }
          });
          this.updateDisplay();
          this.sendTimerState();
        }
      });
      
      quickSelect.appendChild(span);
      
      // Добавляем разделитель (точка) между элементами, кроме последнего
      if (index < quickTimes.length - 1) {
        const separator = document.createElement('span');
        separator.textContent = '·';
        separator.style.cssText = `
          opacity: 0.3;
          user-select: none;
          pointer-events: none;
        `;
        quickSelect.appendChild(separator);
      }
    });

    editor.appendChild(inputWrapper);
    editor.appendChild(quickSelect);

    return editor;
  }

  /**
   * Цвет задачи для акцента в секции таймера
   */
  getTaskColor(task) {
    if (!task) return null;
    let color = task.color || getCategoryColor('time');
    if (color && typeof color === 'string' && color.toLowerCase().startsWith('hsl')) {
      color = hslToHex(color);
    }
    if (!color || !color.startsWith('#')) color = '#3b82f6';
    return color;
  }

  /**
   * Строка целевого времени: "25 мин" или "2ч"
   */
  formatTargetLabel() {
    if (this.timerType === 'stopwatch') return null;
    const mins = Math.round(this.targetDuration / 60);
    if (mins >= 60) return `${Math.floor(mins / 60)}ч`;
    return `${mins} мин`;
  }

  /**
   * Создаёт строку задачи: иконка + название + целевое время
   */
  async createTaskRow() {
    const row = document.createElement('div');
    row.className = 'timer-control-task-row';
    const task = this.selectedTask;
    const taskColor = this.getTaskColor(task);

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color timer-control-task-icon';
    if (taskColor) {
      applyIconBackground(iconWrapper, taskColor);
      iconWrapper.style.setProperty('--icon-color', taskColor);
    }
    if (task?.icon) {
      try {
        const iconContent = await iconLoader.loadIcon(task.icon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch {
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
      }
    } else {
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'timer-control-task-title';
    titleEl.textContent = task?.title || 'Задача';

    const targetLabel = this.formatTargetLabel();
    const targetEl = document.createElement('span');
    targetEl.className = 'timer-control-task-target';
    targetEl.textContent = targetLabel || '-';

    row.appendChild(iconWrapper);
    row.appendChild(titleEl);
    row.appendChild(targetEl);
    return row;
  }

  async renderContent() {
    if (!this.contentElement) return;
    
    this.contentElement.innerHTML = '';
    this.contentElement.classList.remove('timer-control-content-has-accent');
    this.contentElement.style.removeProperty('--timer-accent');
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.alignItems = 'center';
    this.contentElement.style.justifyContent = 'center';
    this.contentElement.style.flex = '1';
    this.contentElement.style.minHeight = '0';
    this.contentElement.style.overflow = 'hidden';
    this.contentElement.style.padding = 'var(--space-md)';
    this.contentElement.style.gap = 'var(--space-sm)';
    
    if (!this.selectedTask) {
      const message = document.createElement('div');
      message.style.color = 'var(--color-on-surface-secondary)';
      message.style.fontSize = 'var(--font-size-sm)';
      message.textContent = 'Выберите задачу для запуска таймера';
      this.contentElement.appendChild(message);
      return;
    }

    const taskColor = this.getTaskColor(this.selectedTask);
    if (taskColor) {
      this.contentElement.classList.add('timer-control-content-has-accent');
      this.contentElement.style.setProperty('--timer-accent', taskColor);
    }
    
    // Отображение времени
    const display = document.createElement('div');
    display.className = 'timer-display';
    display.textContent = this.getDisplayTime();
    display.style.fontSize = 'clamp(2rem, 8vh, 3.5rem)';
    display.style.fontWeight = 'bold';
    display.style.color = 'var(--color-on-surface)';
    display.style.lineHeight = '1';
    display.style.fontVariantNumeric = 'tabular-nums';
    display.style.flexShrink = '0';
    display.style.minHeight = '2.5rem';
    display.style.overflow = 'visible';
    
    // Строка задачи: иконка + название + целевое время
    const taskRow = await this.createTaskRow();
    
    // Для таймера: показываем редактор времени, если не запущен и не заблокирован
    if (this.timerType === 'timer' && !this.isRunning && !this.isLocked()) {
      const durationEditor = this.createTimerDurationEditor();
      this.contentElement.appendChild(display);
      this.contentElement.appendChild(taskRow);
      this.contentElement.appendChild(durationEditor);
    }
    
    // Кнопки управления
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = 'var(--space-sm)';
    controls.style.width = '100%';
    controls.style.maxWidth = '300px';
    
    if (this.isRunning) {
      // Кнопка Пауза
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'btn btn-primary';
      pauseBtn.textContent = 'Пауза';
      pauseBtn.style.flex = '1';
      pauseBtn.addEventListener('click', async () => {
        if (!this.isLocked()) await this.pauseTimer();
      });
      controls.appendChild(pauseBtn);
      
      // Кнопка Стоп (сохраняет сессию)
      const stopBtn = document.createElement('button');
      stopBtn.className = 'btn';
      stopBtn.textContent = 'Стоп';
      stopBtn.style.flex = '1';
      stopBtn.addEventListener('click', async () => {
        if (!this.isLocked()) {
          // Останавливаем таймер перед сохранением
          this.stopTimer();
          // Сохраняем сессию (преждевременное завершение)
          await this.completeSession(false);
        }
      });
      controls.appendChild(stopBtn);
    } else {
      // Кнопка Старт
      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary';
      startBtn.textContent = 'Старт';
      startBtn.style.flex = '1';
      startBtn.addEventListener('click', () => {
        if (!this.isLocked()) {
          // Для таймера проверяем, что время задано
          if (this.timerType === 'timer' && this.targetDuration <= 0) {
            alert('Пожалуйста, задайте время для таймера');
            return;
          }
          this.startTimer();
        }
      });
      controls.appendChild(startBtn);
      
      // Кнопка Сброс (если есть прошедшее время)
      if (this.elapsedTime > 0) {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn';
        resetBtn.textContent = 'Сброс';
        resetBtn.style.flex = '1';
        resetBtn.addEventListener('click', () => {
          if (!this.isLocked()) {
            // Просто сбрасываем без сохранения
            this.resetTimer();
          }
        });
        controls.appendChild(resetBtn);
      }
    }
    
    // Добавляем элементы в правильном порядке
    if (this.timerType === 'timer' && !this.isRunning && !this.isLocked()) {
      // Для таймера: display, taskRow, durationEditor уже добавлены выше
      this.contentElement.appendChild(controls);
    } else {
      // Для секундомера или запущенного таймера: display, taskRow, controls
      this.contentElement.appendChild(display);
      this.contentElement.appendChild(taskRow);
      this.contentElement.appendChild(controls);
    }
  }

  setSelectedTask(task) {
    this.selectedTask = task;
    
    // Устанавливаем целевое время из задачи только для таймера
    if (this.timerType === 'timer') {
      if (task && task.cfg_target_hours) {
        this.targetDuration = Math.floor(task.cfg_target_hours * 60 * 60); // конвертируем часы в секунды
      } else {
        this.targetDuration = 25 * 60; // по умолчанию 25 минут
      }
    }
    
    // Для секундомера всегда сбрасываем на 0
    if (this.timerType === 'stopwatch') {
      this.elapsedTime = 0;
    }
    
    this.resetTimer();
    this.sendTimerState();
  }

  setOnSessionComplete(callback) {
    this.onSessionComplete = callback;
  }

  updateSectionTitle() {
    if (!this.section) return;
    const newTitle = this.titleMap[this.timerType] || this.titleMap.timer;
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
    
    // Если день заблокирован, останавливаем таймер
    if (this.isLocked() && this.isRunning) {
      this.pauseTimer();
    }
  }

  // Отправка состояния таймера в main процесс для синхронизации с треем
  sendTimerState() {
    if (typeof require !== 'undefined') {
      try {
        const { ipcRenderer } = require('electron');
        const state = {
          isRunning: this.isRunning,
          elapsedTime: this.elapsedTime,
          targetDuration: this.targetDuration,
          selectedTask: this.selectedTask ? {
            id: this.selectedTask.id,
            title: this.selectedTask.title
          } : null,
          timerType: this.timerType,
          startTime: this.startTime
        };
        ipcRenderer.send('timer:state-changed', state);
      } catch (e) {
        // Игнорируем ошибки если IPC недоступен
        console.warn('[TimerControl] Не удалось отправить состояние таймера:', e);
      }
    }
  }
}

export default TimerControl;
