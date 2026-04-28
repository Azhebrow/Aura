import { iconLoader, colorConversion } from '../../utils/index.js';

const { hslToHex, hexToRgb } = colorConversion;
import BreakTimer from './BreakTimer.js';
import AmbientPlayer from './AmbientPlayer.js';
import Select from '../form/Select.js';
import { audioSystem } from '../../system/services/index.js';

const { applyIconBackground } = colorConversion;

class TimerFullscreen {
  constructor(timerControl) {
    this.timerControl = timerControl;
    this.overlay = null;
    this.content = null;
    this.isOpen = false;
    this.updateInterval = null;
    this.escapeHandler = null;
    
    // Элементы UI
    this.display = null;
    this.taskIconWrapper = null;
    this.taskName = null;
    this.pauseBtn = null;
    this.breakBtn = null;
    this.stopBtn = null;
    this.controlsContainer = null;
    
    // Иконки
    this.pauseIcon = null;
    this.playIcon = null;
    this.stopIcon = null;
    this.breakIcon = null;
    
    // Режим отображения: 'full', 'minutes', 'motivational'
    this.displayMode = 'full';
    
    // Перерыв
    this.breakTimer = new BreakTimer();
    this.breakTimer.setTimerType('timer');
    this.breakTimer.setDuration(15 * 60); // 15 минут по умолчанию для перерыва
    this.breakTimer.onComplete = async () => {
      await this.playCompletionSound();
      if (this.isBreakVisible && this.selectedAmbient) await this.stopAmbient();
      await this.hideBreakTimer();
    };
    
    // Элементы UI для перерыва
    this.breakContainer = null;
    this.breakDisplay = null;
    this.breakControls = null;
    this.breakUpdateInterval = null;
    this.isBreakVisible = false;
    
    // Ambient Music
    this.ambientPlayer = null;
    this.ambientPanel = null;
    this.ambientSelect = null;
    this.ambientSelectNative = null;
    this.ambientVolumeSlider = null;
    this.ambientList = [];
    this.selectedAmbient = null;
    this.ambientIcon = null;
    this.wasPlayingBeforePause = false; // Флаг для восстановления воспроизведения
    this.ambientPanelHideTimeout = null;
    
    // Particle animation (отключено по требованию — логика оставлена, но не используется)
    this.particlesCanvas = null;
    this.particlesCtx = null;
    this.particlesAnimationId = null;
    this.particles = [];
    this.particleColor = null;
    this.isBreakMode = false;
    this.resizeHandler = null;
    // Флаг для отладки анимации частиц (эффект отключен)
    this.particlesDebugLogged = false;
  }

  async create() {
    // Создаем overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'timer-fullscreen-overlay fullscreen-modal-overlay';
    
    // Создаем canvas для частиц
    this.particlesCanvas = document.createElement('canvas');
    this.particlesCanvas.className = 'timer-fullscreen-particles';
    this.particlesCanvas.style.position = 'absolute';
    this.particlesCanvas.style.top = '0';
    this.particlesCanvas.style.left = '0';
    this.particlesCanvas.style.width = '100%';
    this.particlesCanvas.style.height = '100%';
    this.particlesCanvas.style.pointerEvents = 'none';
    this.particlesCanvas.style.zIndex = '1';
    this.particlesCtx = this.particlesCanvas.getContext('2d');
    
    // Создаем content
    this.content = document.createElement('div');
    this.content.className = 'timer-fullscreen-content fullscreen-modal-content';
    this.content.style.position = 'relative';
    this.content.style.zIndex = '2';
    
    // Загружаем иконки
    const icons = await Promise.all([
      iconLoader.loadIcon('pause').catch(() => ''),
      iconLoader.loadIcon('play').catch(() => ''),
      iconLoader.loadIcon('x').catch(() => ''),
      iconLoader.loadIcon('coffee').catch(() => ''),
      iconLoader.loadIcon('music').catch(() => '')
    ]);
    
    this.pauseIcon = icons[0];
    this.playIcon = icons[1];
    this.stopIcon = icons[2];
    this.breakIcon = icons[3];
    this.ambientIcon = icons[4];
    
    // Контейнер
    const container = document.createElement('div');
    container.className = 'timer-fullscreen-container';
    
    // Контейнер для основного таймера
    this.mainTimerContainer = document.createElement('div');
    this.mainTimerContainer.className = 'timer-fullscreen-main-container';
    
    // Отображение времени
    this.display = document.createElement('div');
    this.display.className = 'timer-fullscreen-display';
    this.display.style.cursor = 'pointer';
    this.display.addEventListener('click', () => {
      this.cycleDisplayMode();
    });
    
    // Контейнер для иконки и названия задачи
    const taskContainer = document.createElement('div');
    taskContainer.className = 'timer-fullscreen-task-container';
    
    // Иконка задачи
    this.taskIconWrapper = document.createElement('span');
    this.taskIconWrapper.className = 'timer-fullscreen-task-icon act-card-icon has-color';
    
    // Название задачи
    this.taskName = document.createElement('div');
    this.taskName.className = 'timer-fullscreen-task';
    
    taskContainer.appendChild(this.taskIconWrapper);
    taskContainer.appendChild(this.taskName);
    
    // Контейнер для кнопок
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'timer-fullscreen-controls';
    this.controlsContainer = controlsContainer;
    
    // Кнопка Пауза/Продолжить
    this.pauseBtn = this.createButton('', this.pauseIcon, 'timer-fullscreen-btn-pause', false);
    this.pauseBtn.addEventListener('click', () => {
      if (this.timerControl.isRunning) {
        this.timerControl.pauseTimer();
        // Обновление состояния произойдет через updatePauseButton в pauseTimer
      } else {
        this.timerControl.startTimer();
        // Обновление состояния произойдет через updatePauseButton в startTimer
      }
    });
    
    // Кнопка Перерыв
    this.breakBtn = this.createButton('', this.breakIcon, 'timer-fullscreen-btn-break', false);
    this.breakBtn.addEventListener('click', async () => {
      if (this.isBreakVisible) {
        // Если перерыв виден, скрываем его и останавливаем
        await this.hideBreakTimer();
        // Возобновляем основной таймер если он был на паузе (но не если был остановлен)
        if (!this.timerControl.isRunning && this.timerControl.elapsedTime > 0) {
          this.timerControl.startTimer();
        }
      } else {
        // Если перерыв скрыт — показываем перерыв (таймер 15 мин запустится автоматически)
        if (this.timerControl.isRunning) {
          this.timerControl.pauseTimer();
        }
        this.showBreakTimer();
      }
    });
    
    // Кнопка Стоп
    this.stopBtn = this.createButton('', this.stopIcon, 'timer-fullscreen-btn-stop', false);
    this.stopBtn.addEventListener('click', async () => {
      // Останавливаем таймер если он запущен
      if (this.timerControl.isRunning) {
        this.timerControl.stopTimer();
      }
      // Завершаем сессию (преждевременное завершение)
      await this.timerControl.completeSession(false);
    });
    
    // Собираем структуру
    controlsContainer.appendChild(this.pauseBtn);
    controlsContainer.appendChild(this.breakBtn);
    controlsContainer.appendChild(this.stopBtn);
    
    // Добавляем элементы в контейнер основного таймера
    this.mainTimerContainer.appendChild(this.display);
    this.mainTimerContainer.appendChild(taskContainer);
    this.mainTimerContainer.appendChild(controlsContainer);
    
    // Создаем UI для ambient music (над таймером)
    await this.createAmbientControls(container);
    
    // Добавляем основной таймер в общий контейнер
    container.appendChild(this.mainTimerContainer);
    
    // Создаем UI для перерыва
    await this.createBreakTimerUI(container);
    
    // Загружаем список ambient
    await this.loadAmbientList();
    
    this.content.appendChild(container);
    this.overlay.appendChild(this.particlesCanvas);
    this.overlay.appendChild(this.content);
    
    // Инициализируем canvas размер
    this.resizeParticlesCanvas();
    this.resizeHandler = () => this.resizeParticlesCanvas();
    window.addEventListener('resize', this.resizeHandler);
    
    // Обработчик Escape
    this.escapeHandler = async (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        if (this.isBreakVisible) {
          await this.hideBreakTimer();
          return;
        }
        if (this.timerControl.isRunning) {
          this.timerControl.pauseTimer();
        }
        await this.close();
      }
    };
    
    document.addEventListener('keydown', this.escapeHandler);
    
    return this.overlay;
  }

  createButton(text, icon, className, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `timer-fullscreen-btn ${className}`;
    if (isActive) {
      btn.classList.add('timer-fullscreen-btn-active');
    }
    
    const iconEl = document.createElement('span');
    iconEl.className = 'timer-fullscreen-btn-icon';
    if (icon) {
      iconEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>`;
    }
    btn.appendChild(iconEl);
    if (text) {
      const textEl = document.createElement('span');
      textEl.className = 'timer-fullscreen-btn-text';
      textEl.textContent = text;
      btn.appendChild(textEl);
    }
    return btn;
  }

  async open() {
    if (this.isOpen) return;
    
    if (!this.overlay) {
      await this.create();
    }
    
    // Сбрасываем режим отображения при открытии
    this.displayMode = 'full';
    
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Добавляем в DOM если еще не добавлен
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay);
    }
    
    // Обновляем размер canvas после добавления в DOM
    requestAnimationFrame(() => {
      this.resizeParticlesCanvas();
      
      // Обновляем контент
      this.update();
      this.updatePauseButton(this.timerControl.isRunning);
      
      // Запускаем обновление времени
      this.startUpdateInterval();
      
      // Запускаем музыку по умолчанию, если таймер работает
      if (this.timerControl.isRunning) {
        this.startDefaultAmbient();
      }
      
      // Запускаем анимацию частиц если таймер работает
      if (this.timerControl.isRunning) {
        this.startParticles();
      }
    });
    
    // Анимация открытия с GPU ускорением
    requestAnimationFrame(() => {
      this.overlay.classList.add('timer-fullscreen-open');
    });
  }

  async close() {
    if (!this.isOpen || !this.overlay) return;
    
    this.isOpen = false;
    this.stopUpdateInterval();
    this.stopBreakUpdateInterval();
    
    // Останавливаем анимацию частиц
    this.stopParticles();
    
    // Останавливаем перерыв если он активен
    if (this.isBreakVisible) {
      this.breakTimer.stop();
      this.breakTimer.reset();
      this.isBreakVisible = false;
    }
    
    // Останавливаем ambient при закрытии окна
    await this.stopAmbient();
    
    // Анимация закрытия с GPU ускорением
    this.overlay.classList.add('fullscreen-modal-closing');
    this.overlay.classList.remove('timer-fullscreen-open');
    
    const cleanup = () => {
      this.overlay.classList.remove('timer-fullscreen-open', 'fullscreen-modal-closing');
      if (this.overlay.parentNode) {
        document.body.removeChild(this.overlay);
      }
      document.body.style.overflow = '';
    };
    
    // Используем transitionend для более точного определения завершения анимации
    const handleTransitionEnd = (e) => {
      if (e.target === this.overlay || e.target === this.content) {
        this.overlay.removeEventListener('transitionend', handleTransitionEnd);
        cleanup();
      }
    };
    
    this.overlay.addEventListener('transitionend', handleTransitionEnd);
    // Fallback на случай если transitionend не сработает
    setTimeout(() => {
      cleanup();
    }, 300);
  }

  cycleDisplayMode() {
    const modes = ['full', 'minutes', 'motivational'];
    const currentIndex = modes.indexOf(this.displayMode);
    this.displayMode = modes[(currentIndex + 1) % modes.length];
    this.update();
  }

  getDisplayText() {
    const timerType = this.timerControl.timerType;
    
    if (this.displayMode === 'full') {
      return this.timerControl.getDisplayTime();
    }
    
    if (this.displayMode === 'minutes') {
      if (timerType === 'stopwatch') {
        const mins = Math.floor(this.timerControl.elapsedTime / 60);
        return `${mins} мин`;
      } else {
        const remaining = Math.max(0, this.timerControl.targetDuration - this.timerControl.elapsedTime);
        const mins = Math.floor(remaining / 60);
        return `${mins} мин`;
      }
    }
    
    if (this.displayMode === 'motivational') {
      return this.getMotivationalMessage();
    }
    
    return this.timerControl.getDisplayTime();
  }

  async update() {
    if (!this.display || !this.taskName) return;
    
    // Обновляем время в зависимости от режима
    const displayText = this.getDisplayText();
    
    // Используем requestAnimationFrame для обновления DOM только когда нужно
    if (this.display.textContent !== displayText) {
      this.display.textContent = displayText;
    }
    
    // Удаляем все классы режимов
    const hasMotivational = this.display.classList.contains('timer-fullscreen-display-motivational');
    const hasMinutes = this.display.classList.contains('timer-fullscreen-display-minutes');
    
    if (this.displayMode === 'motivational' && !hasMotivational) {
      this.display.classList.remove('timer-fullscreen-display-minutes');
      this.display.classList.add('timer-fullscreen-display-motivational');
    } else if (this.displayMode === 'minutes' && !hasMinutes) {
      this.display.classList.remove('timer-fullscreen-display-motivational');
      this.display.classList.add('timer-fullscreen-display-minutes');
    } else if (this.displayMode === 'full' && (hasMotivational || hasMinutes)) {
      this.display.classList.remove('timer-fullscreen-display-motivational', 'timer-fullscreen-display-minutes');
    }
    
    // Обновляем название задачи только если изменилось
    const task = this.timerControl.selectedTask;
    const taskText = task ? (task.title || 'Задача') : 'Задача';
    if (this.taskName.textContent !== taskText) {
      this.taskName.textContent = taskText;
    }
    
    // Обновляем иконку задачи
    await this.updateTaskIcon(task);
    
    // Обновляем состояние кнопки паузы на основе текущего состояния таймера
    this.updatePauseButton(this.timerControl.isRunning);
    
    // Обновляем анимацию частиц
    if (this.timerControl.isRunning && !this.isBreakVisible) {
      this.startParticles();
    } else {
      this.stopParticles();
    }
  }

  async updateTaskIcon(task) {
    if (!this.taskIconWrapper) return;
    
    if (!task) {
      this.taskIconWrapper.innerHTML = '';
      return;
    }
    
    const taskColor = this.timerControl.getTaskColor(task) || '#3b82f6';
    applyIconBackground(this.taskIconWrapper, taskColor);
    this.taskIconWrapper.style.setProperty('--icon-color', taskColor);
    
    if (task.icon) {
      try {
        const iconContent = await iconLoader.loadIcon(task.icon);
        this.taskIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        this.taskIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      this.taskIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }

  getMotivationalMessage() {
    const timerType = this.timerControl.timerType;
    
    if (timerType === 'timer') {
      // Таймер: обратный отсчет, считаем сколько осталось
      const remaining = Math.max(0, this.timerControl.targetDuration - this.timerControl.elapsedTime);
      const percent = this.timerControl.targetDuration > 0 
        ? (remaining / this.timerControl.targetDuration) * 100 
        : 0;
      
      if (percent > 70) {
        return 'Ты только начал';
      } else if (percent > 50) {
        return 'Сфокусируйся';
      } else if (percent > 30) {
        return 'Продолжай!';
      } else if (percent > 10) {
        return 'Почти готово!';
      } else {
        return 'Не сдавайся!';
      }
    } else {
      // Секундомер: прямой отсчет, считаем сколько прошло
      // Для секундомера используем целевое время из задачи или дефолтное
      const targetDuration = this.timerControl.selectedTask?.cfg_target_hours 
        ? Math.floor(this.timerControl.selectedTask.cfg_target_hours * 60 * 60)
        : 25 * 60; // 25 минут по умолчанию
      
      const percent = targetDuration > 0 
        ? (this.timerControl.elapsedTime / targetDuration) * 100 
        : 0;
      
      if (percent < 30) {
        return 'Ты только начал';
      } else if (percent < 50) {
        return 'Хороший темп';
      } else if (percent < 70) {
        return 'Продолжай!';
      } else if (percent < 100) {
        return 'Ты молодец!';
      } else {
        return 'Отличная работа!';
      }
    }
  }

  updatePauseButton(isRunning) {
    if (!this.pauseBtn) return;
    
    const iconEl = this.pauseBtn.querySelector('.timer-fullscreen-btn-icon');
    
    // Обновляем только иконку, без изменения активного состояния
    if (isRunning) {
      // Показываем паузу
      if (iconEl && this.pauseIcon) {
        iconEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${this.pauseIcon}</svg>`;
      }
      // Запускаем частицы если не перерыв
      if (!this.isBreakVisible) {
        this.startParticles();
      }
    } else {
      // Показываем продолжить
      if (iconEl && this.playIcon) {
        iconEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${this.playIcon}</svg>`;
      }
      // Останавливаем частицы
      this.stopParticles();
    }
  }

  startUpdateInterval() {
    this.stopUpdateInterval();
    // Используем requestAnimationFrame для более плавных обновлений
    let lastUpdate = 0;
    const updateLoop = (timestamp) => {
      if (!this.isOpen) {
        this.stopUpdateInterval();
        return;
      }
      
      // Обновляем каждые ~100ms для плавности
      if (timestamp - lastUpdate >= 100) {
        this.update();
        lastUpdate = timestamp;
      }
      
      if (this.isOpen) {
        this.updateInterval = requestAnimationFrame(updateLoop);
      }
    };
    this.updateInterval = requestAnimationFrame(updateLoop);
  }

  stopUpdateInterval() {
    if (this.updateInterval) {
      cancelAnimationFrame(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async createBreakTimerUI(container) {
    // Контейнер для перерыва (скрыт по умолчанию). Минималистичный режим: только таймер 15 мин и кнопка «Завершить».
    this.breakContainer = document.createElement('div');
    this.breakContainer.className = 'timer-fullscreen-break-container';
    this.breakContainer.style.display = 'none';
    
    const breakTitle = document.createElement('div');
    breakTitle.className = 'timer-fullscreen-break-title';
    breakTitle.textContent = 'Перерыв';
    
    this.breakDisplay = document.createElement('div');
    this.breakDisplay.className = 'timer-fullscreen-break-display';
    
    this.breakControls = document.createElement('div');
    this.breakControls.className = 'timer-fullscreen-controls timer-fullscreen-break-controls-single';
    
    // Единственная кнопка: завершить таймер (стиль как у остальных кнопок полноэкранного режима)
    this.breakStopBtn = this.createButton('', this.stopIcon, 'timer-fullscreen-btn-stop');
    this.breakStopBtn.title = 'Завершить таймер';
    this.breakStopBtn.addEventListener('click', async () => {
      await this.playCompletionSound();
      this.breakTimer.stop();
      this.breakTimer.reset();
      await this.hideBreakTimer();
    });
    
    this.breakControls.appendChild(this.breakStopBtn);
    
    this.breakContainer.appendChild(breakTitle);
    this.breakContainer.appendChild(this.breakDisplay);
    this.breakContainer.appendChild(this.breakControls);
    container.appendChild(this.breakContainer);
  }

  async showBreakTimer() {
    if (!this.breakContainer || !this.mainTimerContainer) return;
    this.isBreakVisible = true;
    this.isBreakMode = true;
    
    this.stopParticles();
    this.mainTimerContainer.style.display = 'none';
    this.breakContainer.style.display = 'flex';
    
    // Один ambient за раз: останавливаем музыку задачи перед запуском перерыва
    await this.stopAmbient();
    
    // Перерыв всегда таймер на 15 минут, запускается автоматически
    this.breakTimer.setTimerType('timer');
    this.breakTimer.setDuration(15 * 60);
    this.breakTimer.reset();
    this.breakTimer.start();
    this.updateBreakDisplay();
    this.startBreakUpdateInterval();
    this.startParticles();
    
    this.startDefaultAmbient();
    
    if (this.ambientPanel) {
      this.ambientPanel.style.opacity = '1';
      this.ambientPanel.style.visibility = 'visible';
      this.ambientPanel.style.pointerEvents = 'auto';
    }
  }

  async hideBreakTimer() {
    if (!this.breakContainer || !this.mainTimerContainer) return;
    this.isBreakVisible = false;
    this.isBreakMode = false;
    
    this.breakTimer.stop();
    this.breakTimer.reset();
    this.stopParticles();
    // Всегда останавливаем ambient при выходе из перерыва (гарантированно)
    await this.stopAmbient();
    
    // Скрываем перерыв
    this.breakContainer.style.display = 'none';
    
    // Показываем основной таймер
    this.mainTimerContainer.style.display = 'flex';
    
    this.stopBreakUpdateInterval();
    
    // Запускаем частицы таймера если он работает
    if (this.timerControl.isRunning) {
      this.startParticles();
    }
    
    // Обновляем отображение
    this.update();
  }

  updateBreakDisplay() {
    if (!this.breakDisplay) return;
    this.breakDisplay.textContent = this.breakTimer.getDisplayTime();
  }

  updateBreakControls() {
    // В минималистичном режиме перерыва только одна кнопка «Завершить», обновлять нечего
  }

  startBreakUpdateInterval() {
    this.stopBreakUpdateInterval();
    this.breakUpdateInterval = setInterval(() => {
      if (this.isBreakVisible && this.breakTimer.isRunning) {
        this.updateBreakDisplay();
      } else {
        this.stopBreakUpdateInterval();
      }
    }, 100);
  }

  stopBreakUpdateInterval() {
    if (this.breakUpdateInterval) {
      clearInterval(this.breakUpdateInterval);
      this.breakUpdateInterval = null;
    }
  }

  async destroy() {
    // Останавливаем музыку перед уничтожением
    await this.stopAmbient();
    
    // Останавливаем частицы
    this.stopParticles();
    
    // Удаляем обработчик resize
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    this.close();
    this.stopUpdateInterval();
    this.stopBreakUpdateInterval();
    
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    
    if (this.breakTimer) {
      this.breakTimer.stop();
      this.breakTimer.reset();
    }
    
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    this.overlay = null;
    this.content = null;
    this.display = null;
    this.taskIconWrapper = null;
    this.taskName = null;
    this.mainTimerContainer = null;
    this.pauseBtn = null;
    this.breakBtn = null;
    this.stopBtn = null;
    this.breakContainer = null;
    this.breakDisplay = null;
    this.breakControls = null;
    
    // Ambient Music
    if (this.ambientPlayer) {
      try {
        this.ambientPlayer.stop();
        this.ambientPlayer.destroy();
      } catch (e) {
        console.error('[TimerFullscreen] Ошибка при уничтожении ambient плеера:', e);
      }
    }
    if (this.ambientPanelHideTimeout) {
      clearTimeout(this.ambientPanelHideTimeout);
      this.ambientPanelHideTimeout = null;
    }
    this.ambientPlayer = null;
    this.ambientPanel = null;
    this.ambientSelect = null;
    this.ambientSelectNative = null;
    this.ambientVolumeSlider = null;
    this.ambientList = [];
    this.selectedAmbient = null;
    this.wasPlayingBeforePause = false;
  }

  async createAmbientControls(container) {
    // Монолитная панель управления ambient (всегда видна, над таймером)
    this.ambientPanel = document.createElement('div');
    this.ambientPanel.className = 'timer-fullscreen-ambient-panel';
    
    // Загружаем иконки
    const musicIcon = await iconLoader.loadIcon('music').catch(() => '');
    const volumeIcon = await iconLoader.loadIcon('volume-2').catch(() => '');
    
    // Секция выбора ambient с иконкой
    const selectSection = document.createElement('div');
    selectSection.className = 'timer-fullscreen-ambient-section';
    
    const selectIcon = document.createElement('span');
    selectIcon.className = 'timer-fullscreen-ambient-icon';
    selectIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${musicIcon}</svg>`;
    
    // Выбор ambient - используем компонент Select
    const selectItems = [{ value: '', text: '-- Выберите ambient --' }];
    this.ambientSelect = new Select({ items: selectItems });
    const selectElement = await this.ambientSelect.render();
    selectElement.className = 'timer-fullscreen-ambient-select-wrapper';
    
    // Обработчик изменения выбора
    const selectNative = selectElement.querySelector('select');
    if (selectNative) {
      this.isHandlingSelection = false; // Флаг для предотвращения рекурсии
      selectNative.addEventListener('change', async () => {
        if (this.isHandlingSelection) return; // Предотвращаем рекурсию
        
        try {
          this.isHandlingSelection = true;
          const selectedId = parseInt(selectNative.value);
          if (selectedId) {
            const ambient = this.ambientList.find(a => a.id === selectedId);
            if (ambient) {
              await this.handleAmbientSelection(ambient);
            }
          } else {
            await this.stopAmbient();
          }
        } catch (e) {
          console.error('[TimerFullscreen] Ошибка в обработчике выбора:', e);
        } finally {
          this.isHandlingSelection = false;
        }
      });
      this.ambientSelectNative = selectNative;
    }
    
    selectSection.appendChild(selectIcon);
    selectSection.appendChild(selectElement);
    
    // Разделитель
    const divider = document.createElement('div');
    divider.className = 'timer-fullscreen-ambient-divider';
    
    // Секция громкости с иконкой
    const volumeSection = document.createElement('div');
    volumeSection.className = 'timer-fullscreen-ambient-section';
    
    const volumeIconEl = document.createElement('span');
    volumeIconEl.className = 'timer-fullscreen-ambient-icon';
    volumeIconEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${volumeIcon}</svg>`;
    
    // Слайдер громкости
    const volumeWrapper = document.createElement('div');
    volumeWrapper.className = 'timer-fullscreen-ambient-volume-wrapper';
    
    this.ambientVolumeSlider = document.createElement('input');
    this.ambientVolumeSlider.type = 'range';
    this.ambientVolumeSlider.min = '0';
    this.ambientVolumeSlider.max = '100';
    
    // Загружаем сохранённую громкость из localStorage
    let savedVolume = 50; // Значение по умолчанию
    try {
      const saved = localStorage.getItem('timer-ambient-volume');
      if (saved !== null) {
        savedVolume = Math.round(parseFloat(saved) * 100);
        savedVolume = Math.max(0, Math.min(100, savedVolume)); // Ограничиваем от 0 до 100
      }
    } catch (e) {
      console.warn('[TimerFullscreen] Не удалось загрузить сохранённую громкость:', e);
    }
    
    this.ambientVolumeSlider.value = savedVolume.toString();
    this.ambientVolumeSlider.className = 'timer-fullscreen-ambient-volume';
    this.ambientVolumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100;
      this.handleVolumeChange(volume);
    });
    
    volumeWrapper.appendChild(this.ambientVolumeSlider);
    
    volumeSection.appendChild(volumeIconEl);
    volumeSection.appendChild(volumeWrapper);
    
    // Собираем панель (горизонтальный layout)
    this.ambientPanel.appendChild(selectSection);
    this.ambientPanel.appendChild(divider);
    this.ambientPanel.appendChild(volumeSection);
    
    // Добавляем в начало контейнера (над таймером)
    container.insertBefore(this.ambientPanel, container.firstChild);
    
    // Логика автоматического скрытия панели и элементов управления
    this.ambientPanelHideTimeout = null;
    this.setupAutoHide(container);
  }
  
  setupAutoHide(container) {
    if (!this.ambientPanel || !this.controlsContainer) return;
    
    const getActiveControls = () => this.isBreakVisible ? this.breakControls : this.controlsContainer;
    
    const showElements = () => {
      if (this.ambientPanelHideTimeout) {
        clearTimeout(this.ambientPanelHideTimeout);
        this.ambientPanelHideTimeout = null;
      }
      this.ambientPanel.style.opacity = '1';
      this.ambientPanel.style.visibility = 'visible';
      this.ambientPanel.style.pointerEvents = 'auto';
      const controls = getActiveControls();
      if (controls) {
        controls.style.opacity = '1';
        controls.style.visibility = 'visible';
        controls.style.pointerEvents = 'auto';
      }
    };
    
    const hideElements = () => {
      this.ambientPanelHideTimeout = setTimeout(() => {
        this.ambientPanel.style.opacity = '0';
        this.ambientPanel.style.visibility = 'hidden';
        this.ambientPanel.style.pointerEvents = 'none';
        const controls = getActiveControls();
        if (controls) {
          controls.style.opacity = '0';
          controls.style.visibility = 'hidden';
          controls.style.pointerEvents = 'none';
        }
        this.ambientPanelHideTimeout = null;
      }, 2000);
    };
    
    container.addEventListener('mousemove', () => {
      showElements();
      hideElements();
    });
    
    this.ambientPanel.addEventListener('mouseenter', showElements);
    this.ambientPanel.addEventListener('mouseleave', hideElements);
    this.controlsContainer.addEventListener('mouseenter', showElements);
    this.controlsContainer.addEventListener('mouseleave', hideElements);
    if (this.breakControls) {
      this.breakControls.addEventListener('mouseenter', showElements);
      this.breakControls.addEventListener('mouseleave', hideElements);
    }
  }

  async loadAmbientList() {
    try {
      const getDB = window.getDB;
      if (!getDB) {
        console.warn('[TimerFullscreen] БД недоступна для загрузки ambient');
        return;
      }

      const db = typeof getDB === 'function' ? getDB() : getDB;
      if (!db) {
        console.warn('[TimerFullscreen] БД недоступна');
        return;
      }

      // Загружаем список ambient из БД
      const ambientList = db.db.prepare('SELECT * FROM cfg_ambient_music ORDER BY name').all();
      this.ambientList = ambientList;
      
      // Обновляем select через компонент Select
      if (this.ambientSelect && this.ambientSelectNative) {
        // Сохраняем текущее выбранное значение
        const currentValue = this.ambientSelectNative.value;
        
        // Очищаем существующие опции
        this.ambientSelectNative.innerHTML = '';
        
        // Добавляем опцию по умолчанию
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Выберите ambient --';
        this.ambientSelectNative.appendChild(defaultOption);
        
        // Добавляем ambient из БД с иконками
        // Загружаем все иконки параллельно для ускорения
        const iconPromises = ambientList.map(async (ambient) => {
          let iconSvg = '';
          if (ambient.icon) {
            try {
              iconSvg = await iconLoader.loadIcon(ambient.icon);
            } catch (e) {
              console.warn(`[TimerFullscreen] Не удалось загрузить иконку ${ambient.icon} для ambient ${ambient.name}:`, e);
            }
          }
          return { ambient, iconSvg };
        });
        
        const ambientWithIcons = await Promise.all(iconPromises);
        
        // Создаем опции с уже загруженными иконками
        ambientWithIcons.forEach(({ ambient, iconSvg }) => {
          const option = document.createElement('option');
          option.value = ambient.id;
          option.textContent = ambient.name || `Ambient #${ambient.id}`;
          if (iconSvg) {
            option.dataset.icon = iconSvg;
          }
          this.ambientSelectNative.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение если оно было
        if (currentValue) {
          this.ambientSelectNative.value = currentValue;
        }
        
        // Обновляем CustomSelect: пересоздаем опции и обновляем отображение
        if (this.ambientSelect.customSelect) {
          const customSelect = this.ambientSelect.customSelect;
          
          // Убеждаемся, что chevronIcon загружен
          if (!customSelect.chevronIcon) {
            customSelect.chevronIcon = await iconLoader.loadIcon('chevron-down').catch(() => '');
          }
          
          // Обновляем массив опций
          customSelect.options = [];
          Array.from(this.ambientSelectNative.options).forEach((option, index) => {
            customSelect.options.push({
              icon: option.dataset.icon || '',
              text: option.textContent,
              value: option.value
            });
            if (option.selected) {
              customSelect.selectedIndex = index;
            }
          });
          
          // Обновляем dropdown опции
          if (customSelect.dropdown) {
            customSelect.dropdown.innerHTML = '';
            customSelect.options.forEach((option, index) => {
              const optionElement = document.createElement('div');
              optionElement.className = `custom-select-option ${index === customSelect.selectedIndex ? 'selected' : ''}`;
              optionElement.innerHTML = `
                ${option.icon ? `<svg class="custom-select-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${option.icon}</svg>` : ''}
                <span class="custom-select-option-text">${option.text}</span>
              `;
              optionElement.addEventListener('click', () => {
                customSelect.selectOption(index);
              });
              customSelect.dropdown.appendChild(optionElement);
            });
          }
          
          // Обновляем trigger
          if (customSelect.trigger && customSelect.options[customSelect.selectedIndex]) {
            const selectedOption = customSelect.options[customSelect.selectedIndex];
            customSelect.trigger.innerHTML = `
              ${selectedOption.icon ? `<svg class="custom-select-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${selectedOption.icon}</svg>` : ''}
              <span class="custom-select-trigger-text">${selectedOption.text}</span>
              <svg class="custom-select-trigger-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${customSelect.chevronIcon || ''}</svg>
            `;
          }
        }
      }
      
      console.log(`[TimerFullscreen] Загружено ${ambientList.length} ambient`);
    } catch (e) {
      console.error('[TimerFullscreen] Ошибка загрузки списка ambient:', e);
      // Не прерываем выполнение, просто логируем ошибку
      this.ambientList = [];
    }
  }

  async handleAmbientSelection(ambient) {
    if (!ambient) {
      console.error('[TimerFullscreen] handleAmbientSelection вызван без ambient');
      return;
    }
    
    try {
      // Останавливаем текущий ambient если есть
      if (this.ambientPlayer) {
        await this.stopAmbient();
      }
      
      // Создаем новый плеер
      this.selectedAmbient = ambient;
      this.ambientPlayer = new AmbientPlayer(ambient);
      await this.ambientPlayer.init();
      
      // Устанавливаем громкость из слайдера (или сохранённое значение)
      let volume = 0.5; // По умолчанию
      if (this.ambientVolumeSlider) {
        volume = parseInt(this.ambientVolumeSlider.value) / 100;
      } else {
        // Если слайдер ещё не создан, загружаем из localStorage
        try {
          const saved = localStorage.getItem('timer-ambient-volume');
          if (saved !== null) {
            volume = parseFloat(saved);
            volume = Math.max(0, Math.min(1, volume)); // Ограничиваем от 0 до 1
          }
        } catch (e) {
          console.warn('[TimerFullscreen] Не удалось загрузить сохранённую громкость:', e);
        }
      }
      this.ambientPlayer.setVolume(volume);
      
      // Обновляем выбранное значение в CustomSelect
      if (this.ambientSelectNative && this.ambientSelect.customSelect) {
        const selectedIndex = Array.from(this.ambientSelectNative.options).findIndex(
          opt => parseInt(opt.value) === ambient.id
        );
        if (selectedIndex >= 0) {
          // Временно отключаем обработчик, чтобы избежать рекурсии
          const wasHandling = this.isHandlingSelection;
          this.isHandlingSelection = true;
          
          try {
            // Обновляем нативный select
            this.ambientSelectNative.selectedIndex = selectedIndex;
            // Используем метод selectOption для правильного обновления
            await this.ambientSelect.customSelect.selectOption(selectedIndex);
          } catch (e) {
            console.error('[TimerFullscreen] Ошибка обновления выбора:', e);
            // Продолжаем выполнение даже если обновление выбора не удалось
          } finally {
            this.isHandlingSelection = wasHandling;
          }
        }
      }
      
      // Автоматически запускаем воспроизведение: основной таймер или перерыв
      const shouldPlay = (this.timerControl.isRunning && !this.isBreakVisible) ||
        (this.isBreakVisible && this.breakTimer && this.breakTimer.isRunning);
      if (shouldPlay) {
        try {
          await this.ambientPlayer.play();
        } catch (e) {
          console.error('[TimerFullscreen] Ошибка воспроизведения ambient:', e);
        }
      }
      
      console.log('[TimerFullscreen] Ambient выбран:', ambient.name);
    } catch (e) {
      console.error('[TimerFullscreen] Ошибка выбора ambient:', e);
      // Показываем alert только для критических ошибок
      if (e.message && !e.message.includes('Таймаут')) {
        alert(`Ошибка загрузки ambient: ${e.message}`);
      }
    }
  }

  handleVolumeChange(volume) {
    if (this.ambientPlayer) {
      this.ambientPlayer.setVolume(volume);
    }
    // Сохраняем громкость в localStorage
    try {
      localStorage.setItem('timer-ambient-volume', volume.toString());
    } catch (e) {
      console.warn('[TimerFullscreen] Не удалось сохранить громкость:', e);
    }
  }

  pauseAmbient() {
    if (this.ambientPlayer && this.ambientPlayer.isPlaying()) {
      this.ambientPlayer.pause();
      this.wasPlayingBeforePause = true;
      console.log('[TimerFullscreen] Ambient приостановлен');
    }
  }

  async startDefaultAmbient() {
    // Получаем настройки приложения
    const getDB = window.getDB;
    if (!getDB) {
      return;
    }
    
    const db = typeof getDB === 'function' ? getDB() : getDB;
    if (!db) {
      return;
    }
    
    const settings = db.getAppSettings();
    if (!settings) {
      return;
    }
    
    // Определяем, какая настройка использовать в зависимости от типа таймера
    let defaultAmbientId = null;
    if (this.isBreakVisible) {
      // Для перерыва
      defaultAmbientId = settings.ambient_default_break;
      console.log('[TimerFullscreen] Запуск ambient для перерыва, ID:', defaultAmbientId);
    } else {
      // Для таймера или секундомера
      // Проверяем, не выбран ли уже ambient вручную (только для основного таймера)
      if (this.selectedAmbient || this.ambientPlayer) {
        return; // Если уже выбран, не переопределяем
      }
      
      if (this.timerControl.timerType === 'timer') {
        defaultAmbientId = settings.ambient_default_timer;
      } else if (this.timerControl.timerType === 'stopwatch') {
        defaultAmbientId = settings.ambient_default_stopwatch;
      }
    }
    
    // Если настройка не задана, ничего не делаем
    if (!defaultAmbientId) {
      console.log('[TimerFullscreen] Музыка по умолчанию не настроена для', this.isBreakVisible ? 'перерыва' : 'таймера');
      return;
    }
    
    // Загружаем список ambient
    await this.loadAmbientList();
    
    // Находим ambient по ID
    const ambient = this.ambientList.find(a => a.id === defaultAmbientId);
    if (!ambient) {
      console.warn(`[TimerFullscreen] Ambient с ID ${defaultAmbientId} не найден`);
      return;
    }
    
    // Для перерыва: если уже играет другая музыка, останавливаем её
    if (this.isBreakVisible && this.ambientPlayer && this.selectedAmbient) {
      const currentAmbientId = this.selectedAmbient.id;
      if (currentAmbientId !== defaultAmbientId) {
        console.log('[TimerFullscreen] Останавливаем текущую музыку для запуска музыки перерыва');
        await this.stopAmbient();
      } else {
        // Та же музыка уже играет, просто продолжаем
        console.log('[TimerFullscreen] Музыка для перерыва уже играет');
        return;
      }
    }
    
    // Устанавливаем выбранный ambient в select
    if (this.ambientSelectNative) {
      this.ambientSelectNative.value = String(defaultAmbientId);
      // Обновляем CustomSelect
      if (this.ambientSelect.customSelect) {
        const customSelect = this.ambientSelect.customSelect;
        const selectedIndex = customSelect.options.findIndex(opt => opt.value === String(defaultAmbientId));
        if (selectedIndex >= 0) {
          customSelect.selectOption(selectedIndex);
        }
      }
    }
    
    // Запускаем ambient
    await this.handleAmbientSelection(ambient);
    console.log(`[TimerFullscreen] Автоматически запущен ambient по умолчанию: ${ambient.name} (${this.isBreakVisible ? 'для перерыва' : 'для таймера'})`);
  }

  resumeAmbient() {
    if (this.ambientPlayer) {
      // Если был запущен до паузы - возобновляем
      if (this.wasPlayingBeforePause) {
        this.ambientPlayer.play().catch(e => {
          console.error('[TimerFullscreen] Ошибка возобновления ambient:', e);
        });
        this.wasPlayingBeforePause = false;
        console.log('[TimerFullscreen] Ambient возобновлен (старт таймера)');
      } else if (!this.ambientPlayer.isPlaying() && this.timerControl.isRunning) {
        // Если не был запущен, но таймер работает - запускаем
        this.ambientPlayer.play().catch(e => {
          console.error('[TimerFullscreen] Ошибка запуска ambient:', e);
        });
        console.log('[TimerFullscreen] Ambient запущен (старт таймера)');
      }
    } else {
      // Если ambient не выбран, пробуем запустить по умолчанию
      this.startDefaultAmbient();
    }
  }

  async playCompletionSound() {
    if (audioSystem) {
      try {
        const { getSoundByType, SOUND_CATEGORIES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.TIMER, 'timerFinish');
        if (sound) audioSystem.play(sound);
      } catch (e) {
        console.warn('[TimerFullscreen] Не удалось воспроизвести звук завершения:', e);
      }
    }
  }

  async stopAmbient() {
    if (this.ambientPlayer) {
      try {
        this.ambientPlayer.stop();
        this.ambientPlayer.destroy();
      } catch (e) {
        console.error('[TimerFullscreen] Ошибка при остановке ambient:', e);
      }
      this.ambientPlayer = null;
    }
    this.selectedAmbient = null;
    this.wasPlayingBeforePause = false;
    
    // Сбрасываем выбор в select
    if (this.ambientSelectNative) {
      this.ambientSelectNative.value = '';
      // Обновляем отображение CustomSelect
      if (this.ambientSelect.customSelect) {
        const customSelect = this.ambientSelect.customSelect;
        customSelect.selectedIndex = 0;
        // Убеждаемся, что chevronIcon загружен
        if (!customSelect.chevronIcon) {
          customSelect.chevronIcon = await iconLoader.loadIcon('chevron-down').catch(() => '');
        }
        // Обновляем trigger напрямую
        if (customSelect.trigger && customSelect.options[0]) {
          const defaultOption = customSelect.options[0];
          customSelect.trigger.innerHTML = `
            ${defaultOption.icon ? `<svg class="custom-select-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${defaultOption.icon}</svg>` : ''}
            <span class="custom-select-trigger-text">${defaultOption.text}</span>
            <svg class="custom-select-trigger-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${customSelect.chevronIcon || ''}</svg>
          `;
        }
        // Обновляем классы selected в dropdown
        if (customSelect.dropdown) {
          Array.from(customSelect.dropdown.children).forEach((option, i) => {
            if (i === 0) {
              option.classList.add('selected');
            } else {
              option.classList.remove('selected');
            }
          });
        }
      }
    }
  }
  
  // ============================================
  // PARTICLE ANIMATION
  // ============================================
  
  resizeParticlesCanvas() {
    if (!this.particlesCanvas || !this.overlay) return;
    
    // Используем window размеры если overlay еще не в DOM
    const width = this.overlay.parentNode 
      ? this.overlay.getBoundingClientRect().width 
      : window.innerWidth;
    const height = this.overlay.parentNode 
      ? this.overlay.getBoundingClientRect().height 
      : window.innerHeight;
    
    this.particlesCanvas.width = width;
    this.particlesCanvas.height = height;
    
    // Пересоздаем частицы если они уже были созданы
    if (this.particles.length > 0 && this.particlesAnimationId) {
      this.initParticles();
    }
  }
  
  getParticleColor() {
    if (this.isBreakMode) {
      // Нейтральный цвет для перерыва (чётко читаемый, но мягкий серый)
      return 'rgba(128, 128, 128, 0.4)';
    }
    
    // Получаем цвет задачи
    const task = this.timerControl.selectedTask;
    if (task && task.color) {
      let color = task.color;
      
      // Конвертируем HSL в HEX если нужно
      if (color.toLowerCase().startsWith('hsl')) {
        color = hslToHex(color);
      }
      
      // Конвертируем HEX в RGB
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        // Существенно повышенная базовая прозрачность, чтобы эффект был однозначно заметен
        return `rgba(${r}, ${g}, ${b}, 0.6)`;
      }
      
      // Если уже RGB, добавляем прозрачность
      if (color.startsWith('rgb')) {
        return color.replace('rgb', 'rgba').replace(')', ', 0.18)');
      }
    }
    
    // Дефолтный цвет (ярче и заметнее)
    return 'rgba(59, 130, 246, 0.6)';
  }
  
  initParticles() {
    if (!this.particlesCanvas || !this.particlesCtx) return;
    
    // Проверяем, что canvas имеет размер
    if (this.particlesCanvas.width === 0 || this.particlesCanvas.height === 0) {
      this.resizeParticlesCanvas();
    }
    
    // Если размер все еще 0, откладываем инициализацию
    if (this.particlesCanvas.width === 0 || this.particlesCanvas.height === 0) {
      setTimeout(() => this.initParticles(), 100);
      return;
    }
    
    this.particles = [];
    // Увеличиваем количество частиц, чтобы фон был явно живым
    const particleCount = this.isBreakMode ? 72 : 140;
    const color = this.getParticleColor();
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.particlesCanvas.width,
        y: Math.random() * this.particlesCanvas.height,
        // Увеличиваем скорость, чтобы движение было заметно даже боковым зрением
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        // Увеличиваем размер частиц — мягкие «световые» пятна
        radius: Math.random() * 3.5 + 3.0,
        color: color,
        // Делаем частицы достаточно плотными по непрозрачности
        opacity: Math.random() * 0.3 + 0.7
      });
    }

    if (!this.particlesDebugLogged) {
      console.log('[TimerFullscreen] Частицы инициализированы:', {
        count: this.particles.length,
        isBreakMode: this.isBreakMode,
        canvasWidth: this.particlesCanvas.width,
        canvasHeight: this.particlesCanvas.height
      });
      this.particlesDebugLogged = true;
    }
  }
  
  animateParticles() {
    if (!this.particlesCanvas || !this.particlesCtx || this.particles.length === 0) return;

    // Однократный лог, чтобы убедиться, что анимация реально запускается
    if (!this.particlesDebugLogged) {
      console.log('[TimerFullscreen] Анимация частиц запущена');
      this.particlesDebugLogged = true;
    }
    
    const ctx = this.particlesCtx;
    const width = this.particlesCanvas.width;
    const height = this.particlesCanvas.height;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Обновляем и рисуем частицы
    this.particles.forEach(particle => {
      // Обновляем позицию
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Отскок от краев
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      
      // Ограничиваем позицию
      particle.x = Math.max(0, Math.min(width, particle.x));
      particle.y = Math.max(0, Math.min(height, particle.y));
      
      // Рисуем частицу
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      
      // Используем цвет с учетом opacity частицы (делаем итоговую альфу выше)
      const colorParts = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (colorParts) {
        const r = colorParts[1];
        const g = colorParts[2];
        const b = colorParts[3];
        const baseOpacity = colorParts[4] ? parseFloat(colorParts[4]) : 0.4;
        // Ограничиваем максимум, чтобы не было полностью залитого фона
        const finalOpacity = Math.min(0.85, baseOpacity * particle.opacity);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
      } else {
        ctx.fillStyle = particle.color;
      }
      
      ctx.fill();
    });
    
    // Для перерыва - добавляем волновой эффект
    if (this.isBreakMode) {
      this.drawBreakWaves(ctx, width, height);
    }
    
    this.particlesAnimationId = requestAnimationFrame(() => this.animateParticles());
  }
  
  drawBreakWaves(ctx, width, height) {
    const time = Date.now() * 0.001;
    const color = this.getParticleColor();
    
    // Рисуем несколько волн
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const waveY = height / 2 + Math.sin(time + i * 2) * 100;
      const waveAmplitude = 50 + Math.sin(time * 0.5 + i) * 20;
      
      for (let x = 0; x < width; x += 2) {
        const y = waveY + Math.sin((x / width) * Math.PI * 4 + time * 2 + i) * waveAmplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      const colorParts = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (colorParts) {
        const r = colorParts[1];
        const g = colorParts[2];
        const b = colorParts[3];
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
      } else {
        ctx.strokeStyle = color;
      }
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  startParticles() {
    // Эффект частиц отключён — метод оставлен как no-op,
    // чтобы не ломать существующую логику вызовов.
    return;
  }
  
  stopParticles() {
    // Эффект частиц отключён — ничего не делаем.
    return;
  }
}

export default TimerFullscreen;
