import CalendarCell from '../display/CalendarCell.js';
import selectedDateState from '../../system/state/SelectedDateState.js';
import CalendarModal from '../display/CalendarModal.js';

class TopNavigation {
  constructor(options = {}) {
    this.element = null;
    this.calendarContainer = null;
    this.calendarCells = [];
    this.initialized = false;
    this.unsubscribe = null;
  }

  /**
   * Обработчик клика по ячейке календаря
   */
  handleCellClick = async (date) => {
    const isSelected = selectedDateState.isSelected(date);
    if (isSelected) {
      // Если клик по уже выбранной ячейке, переключаем модальное окно календаря
      if (CalendarModal.isOpen) {
        // Если модальное окно открыто, закрываем его
        CalendarModal.close();
      } else {
        // Если модальное окно закрыто, открываем его
        await CalendarModal.open();
      }
    } else {
      // Иначе просто выбираем дату
      selectedDateState.setSelectedDate(date);
    }
  }

  /**
   * Создает календарные ячейки вокруг выбранной даты
   */
  async createCalendarCells() {
    const selectedDate = selectedDateState.getSelectedDate();
    const daysOfWeek = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    
    // Очищаем старые ячейки
    this.calendarCells = [];
    if (this.calendarContainer) {
      this.calendarContainer.innerHTML = '';
    }

    // Получаем тип данных
    const dataType = localStorage.getItem('calendar_data_type') || 'completion';
    
    // Для income, expense, mood, points, finance и calories получаем данные месяца заранее
    let monthData = null;
    let pointsService = null;
    try {
      const getDB = window.getDB;
      if (getDB) {
        const db = getDB();
        if (db && (dataType === 'income' || dataType === 'expense' || dataType === 'mood' || dataType === 'points' || dataType === 'finance' || dataType === 'calories')) {
          if (!window.PointsService) {
            console.warn('[TopNavigation] PointsService недоступен в window, пропускаем загрузку данных месяца');
            return;
          }
          const PointsService = window.PointsService;
          pointsService = new PointsService(db);
          // Получаем месяц выбранной даты
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth() + 1; // getMonth возвращает 0-11, нам нужно 1-12
          monthData = pointsService.getMonthRange(year, month, dataType);
        }
      }
    } catch (e) {
      console.warn('[TopNavigation] Ошибка получения данных месяца:', e);
    }

    // Создаем ячейки: 3 дня до, выбранный день, 3 дня после (всего 7)
    for (let i = -3; i <= 3; i++) {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const calendarCell = new CalendarCell({
        date: date,
        dayOfWeek: daysOfWeek[date.getDay()],
        dayNumber: date.getDate().toString(),
        dataType: dataType, // Явно передаем тип данных
        monthData: monthData,
        onClick: this.handleCellClick
      });

      const cellElement = await calendarCell.render();
      this.calendarCells.push(calendarCell);
      
      if (this.calendarContainer) {
        this.calendarContainer.appendChild(cellElement);
      }
    }
  }

  /**
   * Обновляет стили всех ячеек календаря
   */
  updateCalendarStyles() {
    this.calendarCells.forEach(cell => {
      cell.updateStyle();
    });
  }

  /**
   * Обновляет иконки разворачивания во всех выбранных ячейках
   */
  async updateExpandIcons() {
    for (const cell of this.calendarCells) {
      if (cell.updateExpandIcon) {
        await cell.updateExpandIcon();
      }
    }
  }

  /**
   * Обновляет ячейку календаря для конкретной даты
   */
  async updateCalendarCellForDate(dateString) {
    if (!this.calendarCells || !this.calendarCells.length) {
      return;
    }

    // Находим ячейку с этой датой
    for (const cell of this.calendarCells) {
      if (cell.date) {
        // Форматируем дату ячейки для сравнения
        const year = cell.date.getFullYear();
        const month = String(cell.date.getMonth() + 1).padStart(2, '0');
        const day = String(cell.date.getDate()).padStart(2, '0');
        const cellDateString = `${year}-${month}-${day}`;

        if (cellDateString === dateString) {
          // Обновляем данные ячейки
          await cell.updateCompletionData();
          break;
        }
      }
    }
  }

  /**
   * Определяет количество ячеек для отображения на основе ширины экрана
   * Всегда возвращает нечетное число
   */
  getVisibleCellsCount() {
    const width = window.innerWidth;
    if (width <= 480) {
      return 1; // Очень узкий экран - только центральная ячейка
    } else if (width <= 640) {
      return 3; // Узкий экран - 3 ячейки
    } else if (width <= 768) {
      return 5; // Средний экран - 5 ячеек
    } else {
      return 7; // Широкий экран - все 7 ячеек
    }
  }

  /**
   * Управляет видимостью ячеек календаря на основе ширины экрана
   */
  updateVisibleCells() {
    if (!this.calendarContainer || !this.calendarCells) return;
    
    const visibleCount = this.getVisibleCellsCount();
    const totalCells = this.calendarCells.length;
    const centerIndex = Math.floor(totalCells / 2); // Индекс центральной ячейки (3 из 7)
    const halfVisible = Math.floor(visibleCount / 2);
    
    // Показываем ячейки вокруг центра
    const startIndex = Math.max(0, centerIndex - halfVisible);
    const endIndex = Math.min(totalCells - 1, centerIndex + halfVisible);
    
    this.calendarCells.forEach((cell, index) => {
      if (cell.element) {
        if (index >= startIndex && index <= endIndex) {
          cell.element.style.display = 'flex';
        } else {
          cell.element.style.display = 'none';
        }
      }
    });
  }

  async init() {
    if (this.initialized) {
      return this.element;
    }

    const nav = document.createElement('nav');
    nav.className = 'top-navigation';

    // Создаем контейнер для ячеек календаря
    this.calendarContainer = document.createElement('div');
    this.calendarContainer.className = 'top-navigation-calendar';

    // Создаем ячейки календаря
    await this.createCalendarCells();

    // Управляем видимостью ячеек на основе ширины экрана
    this.updateVisibleCells();

    // Слушаем изменения размера окна
    this.resizeHandler = () => {
      this.updateVisibleCells();
    };
    window.addEventListener('resize', this.resizeHandler);

    nav.appendChild(this.calendarContainer);
    this.element = nav;

    // Подписываемся на изменения выбранной даты
    this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
      // Пересоздаем календарь с новым центром
      await this.createCalendarCells();
      this.updateVisibleCells();
    });

    // Подписываемся на изменения задач для обновления процентов в календаре
    this.taskProgressHandler = (e) => {
      // Проверяем, есть ли date в detail, если нет - используем текущую дату
      let date;
      if (e.detail && e.detail.date) {
        date = e.detail.date;
      } else {
        // Если detail отсутствует, используем текущую выбранную дату
        const selectedDateState = window.selectedDateState;
        if (selectedDateState) {
          date = selectedDateState.getSelectedDateString();
        } else {
          // Fallback на сегодняшнюю дату
          const now = new Date();
          date = now.toISOString().split('T')[0];
        }
      }
      // Обновляем ячейки календаря для этой даты
      this.updateCalendarCellForDate(date);
    };
    window.addEventListener('taskProgressChanged', this.taskProgressHandler);

    // Ячейки уже подписаны на calendarDataTypeChanged в своем конструкторе
    // и обновляются автоматически, поэтому здесь ничего не нужно делать

    this.initialized = true;
    return this.element;
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.taskProgressHandler) {
      window.removeEventListener('taskProgressChanged', this.taskProgressHandler);
      this.taskProgressHandler = null;
    }
    // dataTypeChangedHandler больше не используется, ячейки обновляются сами
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.calendarCells.forEach(cell => cell.destroy?.());
    this.calendarCells = [];
    this.calendarContainer = null;
    this.element = null;
    this.initialized = false;
  }
}

export default TopNavigation;

