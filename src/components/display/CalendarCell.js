import { iconLoader } from '../../utils/index.js';
import { syncCalendarPercentTextColor } from '../../utils/calendarMetricColor.js';
import selectedDateState from '../../system/state/SelectedDateState.js';
import CalendarModal from './CalendarModal.js';
import eventBus from '../../system/core/EventBus.js';

class CalendarCell {
  constructor(options = {}) {
    this.date = options.date || new Date(); // Полная дата для ячейки
    this.dayOfWeek = options.dayOfWeek || '';
    this.dayNumber = options.dayNumber || '';
    
    // Загружаем сохраненный тип данных (или используем переданный)
    this.dataType = options.dataType || localStorage.getItem('calendar_data_type') || 'completion';
    this.displayData = { value: 0, text: '0%', color: 'var(--color-accent-ui, var(--color-accent))' };
    this.monthData = options.monthData || null; // Данные месяца для finance
    
    this.onClick = options.onClick || null; // Обработчик клика
    this.element = null;
    this.initialized = false;
    this.isDayOpen = false; // Инициализируем для избежания ошибок
    this.isFutureDay = false; // Инициализируем для избежания ошибок
    this.isUpdating = false; // Флаг для предотвращения одновременных обновлений
    this.unsubscribeDate = null; // Функция отписки от изменений даты
    this.eventUnsubscribes = []; // Массив функций отписки от событий
    
    // Нормализуем дату на начало дня
    if (this.date instanceof Date) {
      this.date = new Date(this.date);
      this.date.setHours(0, 0, 0, 0);
    }
    
    // Подписываемся на изменение выбранной даты
    this.unsubscribeDate = selectedDateState.subscribe(() => {
      if (this.initialized) {
        this.updateStyle();
      }
    });
    
    // Подписываемся на изменение типа данных
    this.onDataTypeChanged = async (e) => {
      this.dataType = e.detail.dataType;
      await this.updateData();
    };
    window.addEventListener('calendarDataTypeChanged', this.onDataTypeChanged);
  }

  /**
   * Подписаться на события данных для обновления ячейки
   */
  setupEventListeners() {
    if (!this.initialized) return;

    const cellDateString = this.getDateString();
    
    // Список событий, которые влияют на данные дня
    const dataEvents = [
      'taskProgressChanged',
      'ritualCompleted',
      'transactionAdded',
      'transactionChanged',
      'transactionDeleted',
      'timerSessionAdded',
      'timerSessionChanged',
      'timerSessionDeleted',
      'pointsUpdated',
      'dailyPlanAdded',
      'dailyPlanChanged',
      'dailyPlanDeleted',
      'diaryEntryUpdated'
    ];

    dataEvents.forEach(eventName => {
      const unsubscribe = eventBus.on(eventName, async (detail) => {
        // Проверяем, относится ли изменение к дате этой ячейки
        const eventDate = detail.date || (detail.data && detail.data.date);
        if (!eventDate) return; // Если нет даты в событии, обновляем все ячейки

        // Получаем строку даты для сравнения
        const eventDateString = typeof eventDate === 'string' 
          ? eventDate 
          : new Date(eventDate).toISOString().split('T')[0];

        if (eventDateString === cellDateString) {
          // Для taskProgressChanged и timer сессий нужно убедиться, что очки пересчитаны
          if (eventName === 'taskProgressChanged' || 
              eventName === 'timerSessionAdded' || 
              eventName === 'timerSessionChanged' || 
              eventName === 'timerSessionDeleted') {
            // Используем requestAnimationFrame для гарантии, что все синхронные операции завершены
            await new Promise(resolve => {
              requestAnimationFrame(() => {
                setTimeout(resolve, 100); // Увеличиваем задержку для timer сессий (saveDailyPoints вызывается через 50ms)
              });
            });
          }
          
          // Обновляем данные только для затронутой даты
          await this.updateData();
        }
      });
      this.eventUnsubscribes.push(unsubscribe);
    });
  }

  /**
   * Получить строку даты для сравнения
   */
  getDateString() {
    const year = this.date.getFullYear();
    const month = String(this.date.getMonth() + 1).padStart(2, '0');
    const day = String(this.date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Определяет вариант стиля ячейки
   */
  getVariant() {
    const isToday = selectedDateState.isToday(this.date);
    const isSelected = selectedDateState.isSelected(this.date);
    
    if (isSelected) {
      return 'selected';
    } else if (isToday) {
      return 'today';
    }
    return 'normal';
  }

  /**
   * Получает имя иконки для типа данных
   */
  getDataTypeIcon() {
    const iconMap = {
      'completion': 'target',
      'points': 'award',
      'rituals': 'sun',
      'mood': null, // Для настроения используется иконка из displayData
      'income': 'arrow-up',
      'expense': 'arrow-down',
      'finance': 'banknote',
      'calories': 'flame'
    };
    return iconMap[this.dataType] || null;
  }

  async init() {
    if (this.initialized) {
      return;
    }
    
    // Получаем реальные данные и статус дня
    await this.updateData();
    
    const cell = document.createElement('div');
    const variant = this.getVariant();
    cell.className = `calendar-cell calendar-cell-${variant}`;
    
    // Добавляем классы для будущих и заблокированных дней
    if (this.isFutureDay) {
      cell.classList.add('calendar-cell-future');
    } else if (!this.isDayOpen) {
      cell.classList.add('calendar-cell-locked');
    }
    
    // Делаем ячейку кликабельной только если это не будущий день
    if (this.onClick && !this.isFutureDay) {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        this.onClick(this.date);
      });
    } else if (this.isFutureDay) {
      // Для будущих дней явно отключаем курсор
      cell.style.cursor = 'not-allowed';
    }

    // Верхняя часть: день недели, число, иконка на одной линии
    const topRow = document.createElement('div');
    topRow.className = 'calendar-cell-top';

    // День недели (слева)
    const dayOfWeekEl = document.createElement('span');
    dayOfWeekEl.className = 'calendar-cell-day-of-week';
    dayOfWeekEl.textContent = this.dayOfWeek;
    topRow.appendChild(dayOfWeekEl);

    // Число месяца (по центру)
    const dayNumberEl = document.createElement('span');
    dayNumberEl.className = 'calendar-cell-day-number';
    dayNumberEl.textContent = this.dayNumber;
    topRow.appendChild(dayNumberEl);

    // Иконка статуса (справа) - зависит от статуса дня
    const iconEl = document.createElement('span');
    iconEl.className = 'calendar-cell-lock';
    
    // Определяем иконку в зависимости от статуса дня
    let iconName = 'lock';
    if (this.isFutureDay) {
      iconName = 'calendar';
    } else if (!this.isDayOpen) {
      iconName = 'lock';
    } else {
      // Для открытых дней (сегодня и вчера) показываем иконку карандаша
      iconName = 'pencil';
    }
    
    // Всегда показываем иконку
    const icon = await iconLoader.loadIcon(iconName);
    iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    topRow.appendChild(iconEl);

    // Нижняя часть: данные выбранного типа
    const bottomRow = document.createElement('div');
    bottomRow.className = 'calendar-cell-bottom';

    const percentEl = document.createElement('div');
    percentEl.className = 'calendar-cell-percent';
    await this.updateElementContent(percentEl);
    bottomRow.appendChild(percentEl);

    // Вертикальный прогресс-бар
    const progressBar = document.createElement('div');
    progressBar.className = 'calendar-cell-progress-bar';
    this.updateProgressBar(progressBar);
    cell.appendChild(progressBar);

    cell.appendChild(topRow);
    cell.appendChild(bottomRow);

    // Кнопка со стрелкой для выбранной ячейки (показывается при наведении)
    if (variant === 'selected') {
      const expandButton = document.createElement('button');
      expandButton.className = 'calendar-cell-expand-button';
      expandButton.type = 'button';
      
      // Сохраняем ссылку на кнопку для обновления
      this.expandButton = expandButton;
      
      // Функция обновления иконки в зависимости от состояния модального окна
      this.updateExpandIcon = async () => {
        if (!this.expandButton) return;
        const isOpen = CalendarModal.isOpen;
        const iconName = isOpen ? 'chevron-up' : 'chevron-down';
        const icon = await iconLoader.loadIcon(iconName);
        this.expandButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
      };
      
      // Инициализируем иконку
      await this.updateExpandIcon();
      
      // Обработчик клика - открываем/закрываем модальное окно календаря
      expandButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isOpening = !CalendarModal.isOpen;
        
        // Воспроизводим звук раскрытия/сворачивания
        if (window.audioSystem) {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
          const sound = getSoundByType(
            SOUND_CATEGORIES.UI_NAVIGATION,
            isOpening ? UI_ELEMENT_TYPES.LIST_EXPAND : UI_ELEMENT_TYPES.LIST_COLLAPSE
          );
          if (sound) {
            window.audioSystem.play(sound);
          }
        }
        
        if (CalendarModal.isOpen) {
          CalendarModal.close();
        } else {
          await CalendarModal.open();
        }
        // Обновляем иконку после изменения состояния
        await this.updateExpandIcon();
      });
      
      // Проверяем состояние при наведении
      cell.addEventListener('mouseenter', () => {
        this.updateExpandIcon();
      });
      
      cell.appendChild(expandButton);
    }

    this.element = cell;
    this.initialized = true;

    // Подписываемся на события данных после инициализации
    this.setupEventListeners();
  }

  /**
   * Обновляет контент элемента (текст и цвет)
   */
  async updateElementContent(element) {
    if (!element) return;

    // Очищаем содержимое - используем textContent для полной очистки
    element.textContent = '';
    
    // Добавляем иконку для типа данных
    const iconName = this.getDataTypeIcon();
    
    if (this.dataType === 'mood' && this.displayData.icon) {
      // Для настроения используем иконку из данных
      const moodIcon = await iconLoader.loadIcon(this.displayData.icon);
      if (moodIcon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'calendar-cell-data-icon';
        iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${moodIcon}</svg>`;
        element.appendChild(iconEl);
      }
    } else if (iconName) {
      // Для остальных типов используем стандартные иконки
      const icon = await iconLoader.loadIcon(iconName);
      if (icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'calendar-cell-data-icon';
        iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
        element.appendChild(iconEl);
      }
    }
    
    // Добавляем текст только если он не пустой
    if (this.displayData.text) {
      const textEl = document.createElement('span');
      textEl.textContent = this.displayData.text;
      element.appendChild(textEl);
    }

    syncCalendarPercentTextColor(element, this.displayData, this.date);
  }

  /**
   * Обновляет прогресс-бар
   */
  updateProgressBar(progressBar) {
    if (!progressBar) return;

    const fillPercent = this.displayData.fillPercent || 0;
    const dataColor = this.displayData.color || 'var(--color-accent-ui, var(--color-accent))';
    const softNegativeBar = fillPercent > 0
      && typeof dataColor === 'string'
      && dataColor.includes('metric-negative');

    progressBar.style.setProperty('--fill-percent', `${fillPercent}%`);
    if (softNegativeBar) {
      progressBar.style.setProperty('--data-color', 'var(--color-element)');
    } else {
      progressBar.style.setProperty('--data-color', dataColor);
    }

    if (fillPercent === 0) {
      progressBar.style.display = 'none';
    } else {
      progressBar.style.display = 'block';
    }
  }

  /**
   * Обновляет данные дня (унифицировано с CalendarModalCell)
   */
  async updateData() {
    // Защита от одновременных обновлений
    if (this.isUpdating) {
      return;
    }
    
    this.isUpdating = true;
    try {
      const getDB = window.getDB;
      if (getDB) {
        const db = getDB();
        if (db) {
          // Загружаем PointsService из window (передан из main процесса)
          if (!window.PointsService) {
            console.warn('[CalendarCell] PointsService недоступен в window, пропускаем обновление данных');
            return;
          }
          const PointsService = window.PointsService;
          const pointsService = new PointsService(db);
          
          // Получаем данные месяца если нужно (всегда обновляем при изменении типа данных)
          // Используем месяц самой ячейки, а не текущий месяц календаря
          let monthData = null;
          if (this.dataType === 'income' || this.dataType === 'expense' || this.dataType === 'mood' || this.dataType === 'points' || this.dataType === 'finance' || this.dataType === 'calories') {
            const year = this.date.getFullYear();
            const month = this.date.getMonth() + 1; // Месяц ячейки (может быть из другого месяца)
            monthData = pointsService.getMonthRange(year, month, this.dataType);
            this.monthData = monthData; // Сохраняем для последующих обновлений
          } else {
            // Очищаем monthData для типов данных, которые не требуют его
            this.monthData = null;
          }
          
          const year = this.date.getFullYear();
          const month = String(this.date.getMonth() + 1).padStart(2, '0');
          const day = String(this.date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          
          // Получаем данные для текущего типа
          this.displayData = pointsService.getDayData(dateString, this.dataType, monthData || this.monthData);
          this.isDayOpen = pointsService.isDayOpen(dateString);
          this.isFutureDay = pointsService.isFutureDay(dateString);

          // Обновляем отображение если элемент уже создан и инициализирован
          if (this.element && this.initialized) {
            const percentEl = this.element.querySelector('.calendar-cell-percent');
            if (percentEl) {
              await this.updateElementContent(percentEl);
            }
            const progressBar = this.element.querySelector('.calendar-cell-progress-bar');
            if (progressBar) {
              this.updateProgressBar(progressBar);
            }
            this.updateStyle();
          }
        }
      }
    } catch (e) {
      console.warn('[CalendarCell] Ошибка обновления данных:', e);
      this.isDayOpen = false;
      this.isFutureDay = false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Старый метод для обратной совместимости
   */
  async updateCompletionData() {
    await this.updateData();
  }

  /**
   * Обновляет стиль ячейки в соответствии с текущим состоянием
   */
  updateStyle() {
    if (!this.element) return;

    // Удаляем старые классы вариантов
    this.element.classList.remove(
      'calendar-cell-normal',
      'calendar-cell-today',
      'calendar-cell-selected',
      'calendar-cell-future',
      'calendar-cell-locked'
    );
    
    // Добавляем новый класс варианта
    const variant = this.getVariant();
    this.element.classList.add(`calendar-cell-${variant}`);
    
    // Добавляем классы для будущих и заблокированных дней
    if (this.isFutureDay) {
      this.element.classList.add('calendar-cell-future');
    } else if (!this.isDayOpen) {
      this.element.classList.add('calendar-cell-locked');
    }

    const percentEl = this.element.querySelector('.calendar-cell-percent');
    if (percentEl) {
      syncCalendarPercentTextColor(percentEl, this.displayData, this.date);
    }
  }

  /**
   * Обновляет иконку статуса дня
   */
  async updateIcon() {
    if (!this.element) return;

    const iconEl = this.element.querySelector('.calendar-cell-lock');
    if (!iconEl) return;

    // Определяем иконку в зависимости от статуса дня
    let iconName = 'lock';
    if (this.isFutureDay) {
      iconName = 'calendar';
    } else if (!this.isDayOpen) {
      iconName = 'lock';
    } else {
      // Для открытых дней (сегодня и вчера) показываем иконку карандаша
      iconName = 'pencil';
    }

    try {
      const iconContent = await iconLoader.loadIcon(iconName);
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
    } catch (e) {
      console.warn(`[CalendarCell] Ошибка загрузки иконки ${iconName}:`, e);
    }
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    // Обновляем стиль при каждом рендере
    this.updateStyle();
    return this.element;
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    // Отписываемся от изменений даты
    if (this.unsubscribeDate) {
      this.unsubscribeDate();
      this.unsubscribeDate = null;
    }
    
    // Отписываемся от изменений типа данных
    if (this.onDataTypeChanged) {
      window.removeEventListener('calendarDataTypeChanged', this.onDataTypeChanged);
      this.onDataTypeChanged = null;
    }

    // Отписываемся от всех событий данных
    this.eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribes = [];
  }
}

export default CalendarCell;
