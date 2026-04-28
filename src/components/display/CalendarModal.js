import CalendarModalCell from './CalendarModalCell.js';
import selectedDateState from '../../system/state/SelectedDateState.js';
import { iconLoader } from '../../utils/index.js';
import SelectWithIcons from '../../composites/SelectWithIcons.js';
import { audioSystem } from '../../system/services/index.js';
import Button from '../form/Button.js';

class CalendarModal {
  static isOpen = false;
  static currentOverlay = null;
  static taskProgressHandler = null;
  static gridElement = null;
  static currentDataType = localStorage.getItem('calendar_data_type') || 'completion'; // Загружаем из localStorage

  static async open() {
    // Проверяем, не открыто ли уже модальное окно
    if (CalendarModal.isOpen || CalendarModal.currentOverlay) {
      return;
    }

    const getDB = window.getDB;
    if (!getDB) {
      console.error('[CalendarModal] База данных недоступна');
      return;
    }
    const db = getDB();
    if (!db) {
      console.error('[CalendarModal] База данных не инициализирована');
      return;
    }

    CalendarModal.isOpen = true;

    // Воспроизводим звук открытия модального окна через типизированную систему
    if (audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
      const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_OPEN);
      if (sound) {
        audioSystem.play(sound);
      }
    }

    const selectedDate = selectedDateState.getSelectedDate();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    // Вычисляем высоты верхнего и нижнего меню
    const isMac = typeof process !== 'undefined' && process.platform === 'darwin';
    const topNavContainer = document.querySelector('.top-navigation-container');
    const bottomNavContainer = document.querySelector('.bottom-navigation-container');
    const titleBarHeight = isMac ? 0 : 36; // Высота кастомной шапки (на macOS скрыта)
    const topNavHeight = topNavContainer ? topNavContainer.offsetHeight : 0;
    
    // На мобилях bottom navigation может быть fixed, поэтому используем CSS переменную
    const bottomNavHeight = window.innerWidth <= 640 
      ? (12 + 44 + 12) // nav-mobile-inset-bottom + button height + padding
      : (bottomNavContainer ? bottomNavContainer.offsetHeight : 0);

    const SPACE_XS = 4;
    const SPACE_SM = 10;

    // Создаем overlay (совпадает с областью page-content)
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-modal-overlay calendar-modal-overlay';
    overlay.style.top = `${titleBarHeight + topNavHeight + SPACE_XS}px`;
    overlay.style.bottom = `${bottomNavHeight + SPACE_XS}px`;
    overlay.style.left = `${SPACE_SM}px`;
    overlay.style.right = `${SPACE_SM}px`;
    
    // Создаем content
    const content = document.createElement('div');
    content.className = 'fullscreen-modal-content calendar-modal-content';

    // Создаем header с навигацией и селектором данных
    const header = document.createElement('div');
    header.className = 'calendar-modal-header';

    // Левая часть: Навигация и название месяца и года
    const navSection = document.createElement('div');
    navSection.className = 'calendar-modal-header-section calendar-modal-nav-section';

    // Название месяца и года
    const monthTitle = document.createElement('div');
    monthTitle.className = 'calendar-modal-month-title';
    
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const updateMonthTitle = (month, year) => {
      monthTitle.textContent = `${monthNames[month]} ${year}`;
    };
    updateMonthTitle(currentMonth, currentYear);

    // Навигация по месяцам
    let displayMonth = currentMonth;
    let displayYear = currentYear;

    const updateCalendar = async () => {
      await generateCalendar(displayMonth, displayYear);
      updateMonthTitle(displayMonth, displayYear);
    };

    // Кнопка "Предыдущий месяц"
    const prevButton = await new Button({
      iconName: 'chevron-left'
    }).render();
    prevButton.classList.add('nav-arrow-button', 'nav-arrow-inline');
    prevButton.setAttribute('aria-label', 'Предыдущий месяц');
    
    prevButton.addEventListener('click', async () => {
      // Воспроизводим звук переключения
      if (audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_PREV);
        if (sound) {
          audioSystem.play(sound);
        }
      }
      displayMonth--;
      if (displayMonth < 0) {
        displayMonth = 11;
        displayYear--;
      }
      await updateCalendar();
    });

    // Кнопка "Следующий месяц"
    const nextButton = await new Button({
      iconName: 'chevron-right'
    }).render();
    nextButton.classList.add('nav-arrow-button', 'nav-arrow-inline');
    nextButton.setAttribute('aria-label', 'Следующий месяц');
    
    nextButton.addEventListener('click', async () => {
      // Воспроизводим звук переключения
      if (audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_NEXT);
        if (sound) {
          audioSystem.play(sound);
        }
      }
      displayMonth++;
      if (displayMonth > 11) {
        displayMonth = 0;
        displayYear++;
      }
      await updateCalendar();
    });

    navSection.appendChild(prevButton);
    navSection.appendChild(monthTitle);
    navSection.appendChild(nextButton);

    // Правая часть: Селектор данных
    const dataSection = document.createElement('div');
    dataSection.className = 'calendar-modal-header-section calendar-modal-data-section';

    const targetIcon = await iconLoader.loadIcon('target');
    const awardIcon = await iconLoader.loadIcon('award');
    const sunIcon = await iconLoader.loadIcon('sun');
    const smileIcon = await iconLoader.loadIcon('smile');
    const arrowUpIcon = await iconLoader.loadIcon('arrow-up');
    const arrowDownIcon = await iconLoader.loadIcon('arrow-down');
    const banknoteIcon = await iconLoader.loadIcon('banknote');
    const flameIcon = await iconLoader.loadIcon('flame');

    const dataSelect = new SelectWithIcons({
      value: CalendarModal.currentDataType,
      items: [
        { value: 'completion', text: 'Прогресс', icon: targetIcon },
        { value: 'points', text: 'Очки', icon: awardIcon },
        { value: 'rituals', text: 'Ритуалы', icon: sunIcon },
        { value: 'mood', text: 'Настроение', icon: smileIcon },
        { value: 'income', text: 'Доходы', icon: arrowUpIcon },
        { value: 'expense', text: 'Расходы', icon: arrowDownIcon },
        { value: 'finance', text: 'Финансы', icon: banknoteIcon },
        { value: 'calories', text: 'Калории', icon: flameIcon }
      ]
    });

    const dataSelectElement = await dataSelect.render();
    dataSection.appendChild(dataSelectElement);

    // Обработчик изменения типа данных
    const select = dataSelectElement.querySelector('select');
    if (select) {
      select.addEventListener('change', async (e) => {
        CalendarModal.currentDataType = e.target.value;
        localStorage.setItem('calendar_data_type', e.target.value); // Сохраняем выбор
        
        // Оповещаем о смене типа данных (ячейки обновятся через подписки)
        window.dispatchEvent(new CustomEvent('calendarDataTypeChanged', { 
          detail: { dataType: e.target.value } 
        }));
        
        // Ячейки обновятся автоматически через подписки, календарь пересоздавать не нужно
      });
    }

    header.appendChild(navSection);
    header.appendChild(dataSection);

    // Заголовок с днями недели (с понедельника по воскресенье)
    const weekdays = document.createElement('div');
    weekdays.className = 'calendar-modal-weekdays';
    const weekdayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    weekdayNames.forEach(dayName => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-modal-weekday';
      dayEl.textContent = dayName;
      weekdays.appendChild(dayEl);
    });

    // Сетка календаря
    const grid = document.createElement('div');
    grid.className = 'calendar-modal-grid';

    // Функция для генерации календарной сетки
    const generateCalendar = async (month, year) => {
      grid.innerHTML = '';
      
      // Вычисляем первый день месяца и его день недели
      // getDay() возвращает: 0=ВС, 1=ПН, 2=ВТ, 3=СР, 4=ЧТ, 5=ПТ, 6=СБ
      // Нам нужно: 0=ПН, 1=ВТ, 2=СР, 3=ЧТ, 4=ПТ, 5=СБ, 6=ВС
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeekJS = firstDay.getDay(); // 0=ВС, 1=ПН, ..., 6=СБ
      const firstDayOfWeek = firstDayOfWeekJS === 0 ? 6 : firstDayOfWeekJS - 1; // 0=ПН, 1=ВТ, ..., 6=ВС
      
      // Вычисляем количество дней в текущем месяце
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Вычисляем предыдущий месяц
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
      
      // Вычисляем следующий месяц
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      
      // Создаем массив всех дат для календаря
      const calendarDates = [];
      
      // 1. Добавляем дни предыдущего месяца (если нужно)
      if (firstDayOfWeek > 0) {
        // Начинаем с последнего дня предыдущего месяца и идем назад
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
          const day = daysInPrevMonth - i;
          const date = new Date(prevYear, prevMonth, day);
          date.setHours(0, 0, 0, 0);
          calendarDates.push({
            date: date,
            dayNumber: day,
            isOtherMonth: true
          });
        }
      }
      
      // 2. Добавляем все дни текущего месяца
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        calendarDates.push({
          date: date,
          dayNumber: day,
          isOtherMonth: false
        });
      }
      
      // 3. Добавляем дни следующего месяца до конца недели
      const totalCells = calendarDates.length;
      const cellsInLastWeek = totalCells % 7;
      if (cellsInLastWeek > 0) {
        const remainingCells = 7 - cellsInLastWeek;
        for (let day = 1; day <= remainingCells; day++) {
          const date = new Date(nextYear, nextMonth, day);
          date.setHours(0, 0, 0, 0);
          calendarDates.push({
            date: date,
            dayNumber: day,
            isOtherMonth: true
          });
        }
      }
      
      // 4. Создаем ячейки для всех дат
      let pointsService = null;
      try {
        // Загружаем PointsService из window (передан из main процесса)
        if (!window.PointsService) {
          console.warn('[CalendarModal] PointsService недоступен в window');
          return;
        }
        const PointsService = window.PointsService;
        pointsService = new PointsService(db);
      } catch (e) {
        console.warn('[CalendarModal] PointsService недоступен:', e);
      }
      
      // Для income, expense, mood, points, finance и calories получаем данные месяца заранее
      let monthData = null;
      if (pointsService && (CalendarModal.currentDataType === 'income' || CalendarModal.currentDataType === 'expense' || CalendarModal.currentDataType === 'mood' || CalendarModal.currentDataType === 'points' || CalendarModal.currentDataType === 'finance' || CalendarModal.currentDataType === 'calories')) {
        const dataYear = year; // Используем параметр функции
        const dataMonth = month + 1; // getMonth возвращает 0-11, нам нужно 1-12
        monthData = pointsService.getMonthRange(dataYear, dataMonth, CalendarModal.currentDataType);
      }
      
      for (const dateInfo of calendarDates) {
        let displayData = { value: 0, text: '0%', color: 'var(--color-accent-ui, var(--color-accent))' };
        
        if (pointsService) {
          const year = dateInfo.date.getFullYear();
          const month = String(dateInfo.date.getMonth() + 1).padStart(2, '0');
          const day = String(dateInfo.date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          displayData = pointsService.getDayData(dateString, CalendarModal.currentDataType, monthData);
        }
        
        const cell = new CalendarModalCell({
          date: dateInfo.date,
          dayNumber: dateInfo.dayNumber.toString(),
          dataType: CalendarModal.currentDataType,
          displayData: displayData,
          monthData: monthData, // Передаем данные месяца для finance, mood, points
          isOtherMonth: dateInfo.isOtherMonth,
          onClick: handleCellClick
        });
        const cellElement = await cell.render();
        // Сохраняем ссылку на экземпляр ячейки для последующего обновления
        cellElement._calendarCellInstance = cell;
        
        grid.appendChild(cellElement);
      }
      
      // Сохраняем ссылку на grid для обновления ячеек
      CalendarModal.gridElement = grid;
      
      // 5. Устанавливаем количество строк динамически
      const finalCellCount = calendarDates.length;
      const finalWeeks = Math.ceil(finalCellCount / 7);
      grid.style.gridTemplateRows = `repeat(${finalWeeks}, 1fr)`;
    };

    // Обработчик клика по ячейке
    const handleCellClick = (date) => {
      // Просто выбираем дату, модальное окно не закрывается
      selectedDateState.setSelectedDate(date);
    };


    // Закрытие модального окна
    const closeModal = async () => {
      // Воспроизводим звук закрытия модального окна через типизированную систему
      if (audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_CLOSE);
        if (sound) {
          audioSystem.play(sound);
        }
      }
      
      console.log('[CalendarModal] Начало закрытия модального окна');
      // Анимация исчезновения - идентично появлению
      // Используем двойной requestAnimationFrame для гарантии, что браузер применил текущие стили
      requestAnimationFrame(() => {
        console.log('[CalendarModal] Первый requestAnimationFrame');
        requestAnimationFrame(() => {
          console.log('[CalendarModal] Второй requestAnimationFrame - добавляем класс закрытия');
          // Небольшая задержка перед добавлением класса закрытия, чтобы браузер успел применить текущие стили
          setTimeout(() => {
            // Добавляем класс закрытия - он переопределит стили открытия через CSS
            overlay.classList.add('fullscreen-modal-closing', 'calendar-modal-closing');
            console.log('[CalendarModal] Классы добавлены:', {
              hasClosing: overlay.classList.contains('fullscreen-modal-closing'),
              hasOpen: overlay.classList.contains('fullscreen-modal-open'),
              allClasses: Array.from(overlay.classList)
            });
          
          // Функция очистки после завершения анимации
          const cleanup = () => {
            console.log('[CalendarModal] Cleanup вызван');
            // Удаляем все классы после завершения анимации
            overlay.classList.remove('fullscreen-modal-open', 'calendar-modal-open', 'fullscreen-modal-closing', 'calendar-modal-closing');
            
            // Уничтожаем все ячейки для очистки подписок
            if (CalendarModal.gridElement) {
              const cells = CalendarModal.gridElement.querySelectorAll('.calendar-modal-cell');
              cells.forEach(cellEl => {
                if (cellEl._calendarCellInstance && typeof cellEl._calendarCellInstance.destroy === 'function') {
                  cellEl._calendarCellInstance.destroy();
                }
              });
            }
            
            if (overlay.parentNode) {
              document.body.removeChild(overlay);
            }
            document.body.style.overflow = '';
            CalendarModal.isOpen = false;
            CalendarModal.currentOverlay = null;
            CalendarModal.gridElement = null;
            CalendarModal.daySummaryElement = null;
            
            // Отписываемся от изменений даты
            if (CalendarModal.daySummaryUnsubscribe) {
              CalendarModal.daySummaryUnsubscribe();
              CalendarModal.daySummaryUnsubscribe = null;
            }
            
            // Удаляем обработчик событий
            if (CalendarModal.taskProgressHandler) {
              window.removeEventListener('taskProgressChanged', CalendarModal.taskProgressHandler);
              CalendarModal.taskProgressHandler = null;
            }
            
            // Обновляем иконки в ячейках календаря
            const topNav = window.topNav;
            if (topNav && topNav.updateExpandIcons) {
              topNav.updateExpandIcons();
            }
            console.log('[CalendarModal] Cleanup завершен');
          };
          
          // Используем transitionend для точного определения завершения анимации
          const content = overlay.querySelector('.fullscreen-modal-content');
          if (content) {
            console.log('[CalendarModal] Content найден, настраиваем transitionend');
            let cleanupCalled = false;
            const handleTransitionEnd = (e) => {
              console.log('[CalendarModal] transitionend сработал:', {
                target: e.target,
                propertyName: e.propertyName,
                elapsedTime: e.elapsedTime,
                cleanupCalled: cleanupCalled
              });
              // Проверяем, что это завершение анимации transform (последняя анимация)
              // и что cleanup еще не был вызван
              if (e.target === content && e.propertyName === 'transform' && !cleanupCalled) {
                console.log('[CalendarModal] Вызываем cleanup из transitionend');
                cleanupCalled = true;
                content.removeEventListener('transitionend', handleTransitionEnd);
                cleanup();
              }
            };
            content.addEventListener('transitionend', handleTransitionEnd);
            console.log('[CalendarModal] Обработчик transitionend добавлен');
            // Fallback на setTimeout на случай, если событие не сработает
            setTimeout(() => {
              console.log('[CalendarModal] setTimeout fallback сработал, cleanupCalled:', cleanupCalled);
              if (!cleanupCalled) {
                cleanupCalled = true;
                content.removeEventListener('transitionend', handleTransitionEnd);
                cleanup();
              }
            }, 750);
          } else {
            console.warn('[CalendarModal] Content не найден, используем setTimeout');
            // Если content не найден, используем setTimeout
            setTimeout(cleanup, 700);
          }
          }, 10); // Небольшая задержка перед началом анимации
        });
      });
    };

    // Сохраняем функцию closeModal для статического метода
    CalendarModal.close = closeModal;

    // Обработчик ESC для закрытия
    const handleEscape = (e) => {
      if (e.key === 'Escape' && CalendarModal.isOpen) {
        e.preventDefault();
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Собираем структуру
    // Секция сводки данных за выбранный день
    const daySummary = document.createElement('div');
    daySummary.className = 'calendar-modal-day-summary';
    CalendarModal.daySummaryElement = daySummary;

    content.appendChild(header);
    content.appendChild(weekdays);
    content.appendChild(grid);
    content.appendChild(daySummary);

    // Инициализируем сводку для текущей выбранной даты
    await CalendarModal.updateDaySummary(selectedDate);

    // Подписываемся на изменения выбранной даты для обновления сводки
    CalendarModal.daySummaryUnsubscribe = selectedDateState.subscribe(async (date) => {
      await CalendarModal.updateDaySummary(date);
    });

    overlay.appendChild(content);
    
    // Сохраняем ссылку на overlay
    CalendarModal.currentOverlay = overlay;

    // Добавляем на страницу
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Генерируем календарь
    await generateCalendar(displayMonth, displayYear);

    // Анимация появления - двойной requestAnimationFrame для плавности
    console.log('[CalendarModal] Начало открытия модального окна');
    requestAnimationFrame(() => {
      console.log('[CalendarModal] Первый requestAnimationFrame (открытие)');
      requestAnimationFrame(() => {
        console.log('[CalendarModal] Второй requestAnimationFrame (открытие) - добавляем класс открытия');
        overlay.classList.add('fullscreen-modal-open', 'calendar-modal-open');
        console.log('[CalendarModal] Классы открытия добавлены:', {
          hasOpen: overlay.classList.contains('fullscreen-modal-open'),
          allClasses: Array.from(overlay.classList)
        });
        
        // Обновляем иконки в ячейках календаря
        const topNav = window.topNav;
        if (topNav && topNav.updateExpandIcons) {
          topNav.updateExpandIcons();
        }
      });
    });
  }

  /**
   * Вычисляет процент выполнения для указанной даты
   */
  static async calculateCompletionPercent(db, date) {
    try {
      // Форматируем дату в YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Получаем все ритуалы
      const morningRituals = db.getAll('cfg_rituals_morning');
      const eveningRituals = db.getAll('cfg_rituals_evening');
      
      // Получаем статусы выполнения
      const morningStatuses = db.getRitualsMorning(dateString);
      const eveningStatuses = db.getRitualsEvening(dateString);
      
      // Подсчитываем выполненные ритуалы
      const completedMorning = morningStatuses.filter(s => s.completed === 1).length;
      const completedEvening = eveningStatuses.filter(s => s.completed === 1).length;
      const totalRituals = morningRituals.length + eveningRituals.length;
      const completedRituals = completedMorning + completedEvening;
      
      // Получаем все таймер-задачи
      const timerTasks = db.getAll('cfg_tasks').filter(t => t.task_type === 'timer');
      const leisureTimerTasks = db.getAll('cfg_leisure_tasks').filter(t => t.task_type === 'timer');
      const allTimerTasks = [...timerTasks, ...leisureTimerTasks];
      
      // Учитываем только задачи с целевым временем
      const timerTasksWithTarget = allTimerTasks.filter(t => t.cfg_target_hours && t.cfg_target_hours > 0);
      
      // Подсчитываем выполненные таймер-задачи
      let completedTimerTasks = 0;
      for (const task of timerTasksWithTarget) {
        const totalTime = db.getTaskTimerTotal(dateString, task.id);
        const targetHours = task.cfg_target_hours || 0;
        if (targetHours > 0 && totalTime >= targetHours * 60) { // targetHours в часах, totalTime в минутах
          completedTimerTasks++;
        }
      }
      
      // Общий процент: (выполненные ритуалы + выполненные таймер-задачи) / (всего ритуалов + всего таймер-задач с целевым временем) * 100
      const totalTasks = totalRituals + timerTasksWithTarget.length;
      const completedTasks = completedRituals + completedTimerTasks;
      
      if (totalTasks === 0) {
        return 0;
      }
      
      const percent = Math.round((completedTasks / totalTasks) * 100);
      return Math.min(100, Math.max(0, percent));
    } catch (error) {
      console.error('[CalendarModal] Ошибка вычисления процента выполнения:', error);
      return 0;
    }
  }

  /**
   * Создает элемент сводки данных
   */
  static async createSummaryItem(iconName, value, color = 'var(--color-on-surface)') {
    const item = document.createElement('div');
    item.className = 'calendar-modal-day-summary-item';

    const icon = await iconLoader.loadIcon(iconName);
    const iconEl = document.createElement('span');
    iconEl.className = 'calendar-modal-day-summary-icon';
    iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    iconEl.style.color = color;

    const valueEl = document.createElement('span');
    valueEl.className = 'calendar-modal-day-summary-value';
    valueEl.textContent = value;
    valueEl.style.color = color;

    item.appendChild(iconEl);
    item.appendChild(valueEl);

    return item;
  }

  /**
   * Обновляет сводку данных за выбранный день
   */
  static async updateDaySummary(date) {
    if (!CalendarModal.daySummaryElement) {
      return;
    }

    const getDB = window.getDB;
    if (!getDB) {
      return;
    }
    const db = getDB();
    if (!db) {
      return;
    }

    // Очищаем старые элементы
    CalendarModal.daySummaryElement.innerHTML = '';

    try {
      // Загружаем PointsService из window (передан из main процесса) или используем fallback
      if (!window.PointsService) {
        console.warn('[CalendarModal] PointsService недоступен в window, пропускаем обновление сводки');
        return;
      }
      const PointsService = window.PointsService;
      const pointsService = new PointsService(db);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // Получаем все данные за день
      const completionData = pointsService.getDayData(dateString, 'completion');
      const pointsData = pointsService.getDayData(dateString, 'points');
      const ritualsData = pointsService.getDayData(dateString, 'rituals');
      const moodData = pointsService.getDayData(dateString, 'mood');
      const incomeData = pointsService.getDayData(dateString, 'income');
      const expenseData = pointsService.getDayData(dateString, 'expense');
      const financeData = pointsService.getDayData(dateString, 'finance');
      const caloriesData = pointsService.getDayData(dateString, 'calories');

      // Добавляем элементы сводки (показываем все, включая нулевые значения)
      const items = [];

      // Прогресс выполнения
      const completionItem = await CalendarModal.createSummaryItem('target', `${completionData.value}%`, completionData.color);
      items.push(completionItem);

      // Очки
      const pointsItem = await CalendarModal.createSummaryItem('award', pointsData.text, pointsData.color);
      items.push(pointsItem);

      // Ритуалы
      const ritualsItem = await CalendarModal.createSummaryItem('sun', ritualsData.text, ritualsData.color);
      items.push(ritualsItem);

      // Настроение
      if (moodData.value !== null && moodData.value !== undefined) {
        const iconName = moodData.icon || 'smile';
        const moodItem = await CalendarModal.createSummaryItem(iconName, moodData.text, moodData.color);
        items.push(moodItem);
      }

      // Доходы
      const incomeItem = await CalendarModal.createSummaryItem('arrow-up', incomeData.text, incomeData.color);
      items.push(incomeItem);

      // Расходы
      const expenseItem = await CalendarModal.createSummaryItem('arrow-down', expenseData.text, expenseData.color);
      items.push(expenseItem);

      // Баланс (финансы)
      const financeItem = await CalendarModal.createSummaryItem('banknote', financeData.text, financeData.color);
      items.push(financeItem);

      // Калории
      const caloriesItem = await CalendarModal.createSummaryItem('flame', caloriesData.text, caloriesData.color);
      items.push(caloriesItem);

      // Добавляем все элементы в контейнер
      items.forEach(item => {
        CalendarModal.daySummaryElement.appendChild(item);
      });

    } catch (e) {
      console.warn('[CalendarModal] Ошибка обновления сводки данных:', e);
    }
  }
}

export default CalendarModal;

