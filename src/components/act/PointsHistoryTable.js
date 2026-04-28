import Section from '../layout/Section.js';
import RadioButton from '../form/RadioButton.js';
import { iconLoader, setupDragScroll } from '../../utils/index.js';
import { taskCategoriesConfigService } from '../../system/services/index.js';

/**
 * Компонент таблицы истории очков
 */
class PointsHistoryTable {
  constructor() {
    this.element = null;
    this.section = null;
    this.db = null;
    this.pointsService = null;
    this.isRendering = false;
  }

  async init() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[PointsHistoryTable] База данных недоступна');
      return;
    }
    
    this.db = getDB();
    if (!this.db) {
      console.error('[PointsHistoryTable] База данных не инициализирована');
      return;
    }

    // Инициализируем сервис очков
    // Сначала пробуем загрузить из window (передан из main процесса)
    let PointsService;
    if (typeof window !== 'undefined' && window.PointsService) {
      PointsService = window.PointsService;
    } else {
      // Fallback - пробуем require с относительным путем (только в dev режиме)
      try {
        PointsService = require('../../system/services/PointsService.js');
      } catch (e) {
        console.error('[PointsHistoryTable] Ошибка загрузки PointsService:', e);
        throw new Error('PointsService недоступен');
      }
    }
    this.pointsService = new PointsService(this.db);

    this.section = new Section({ title: 'История очков' });
    this.element = this.section.render();
    
    // Создаем кнопку для показа подсказки и добавляем в заголовок
    const infoButton = await this.createInfoButton();
    const headerRight = this.section.getHeaderRight();
    if (headerRight) {
      headerRight.appendChild(infoButton);
    }
    
    // Создаем popover окно
    this.popover = await this.createPopover();
    document.body.appendChild(this.popover);
    
    // Принудительно пересчитываем очки для текущего дня при загрузке
    // чтобы убедиться, что данные инициализированы
    try {
      const selectedDateState = window.selectedDateState;
      if (selectedDateState) {
        const currentDate = selectedDateState.getSelectedDateString();
        console.log('[PointsHistoryTable] Инициализация: пересчет очков для текущего дня', currentDate);
        this.pointsService.saveDailyPoints(currentDate, true); // force = true для принудительного пересчета
      }
    } catch (error) {
      console.error('[PointsHistoryTable] Ошибка при инициализации очков:', error);
    }
    
    // Подписываемся на события обновления очков из PointsManager
    this.pointsUpdatedHandler = async () => {
      await this.render();
    };
    window.addEventListener('pointsUpdated', this.pointsUpdatedHandler);
    window.addEventListener('pointsRecalculated', this.pointsUpdatedHandler);
    this.categoriesConfigHandler = () => this.render();
    window.addEventListener('task-categories-config-changed', this.categoriesConfigHandler);
    
    await this.render();
  }

  async render() {
    // Защита от одновременных вызовов render
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;

    try {
      const oldContent = this.element.querySelector('.points-history-content');
      if (oldContent) oldContent.remove();

      const content = document.createElement('div');
      content.className = 'points-history-content';

    // Получаем данные
    const points = this.pointsService.getAllPoints();
    console.log('[PointsHistoryTable] Загружено записей очков:', points.length);
    if (points.length > 0) {
      console.log('[PointsHistoryTable] Первая запись:', points[0]);
    }

    if (points.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'points-history-empty';
      empty.textContent = 'Нет данных';
      content.appendChild(empty);
      this.element.appendChild(content);
      return;
    }

    // Создаем таблицу
    const table = document.createElement('table');
    table.className = 'points-history-table';

    // Заголовок
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'points-history-header-row';

    // Дата
    const dateHeader = document.createElement('th');
    dateHeader.className = 'points-history-header';
    dateHeader.textContent = 'Дата';
    headerRow.appendChild(dateHeader);

    // Номер дня (относительно начала отчёта)
    const dayNumHeader = document.createElement('th');
    dayNumHeader.className = 'points-history-header';
    dayNumHeader.textContent = 'День';
    headerRow.appendChild(dayNumHeader);

    // Категории - отдельные колонки с иконками в заголовке (из настроек)
    const categoryTypes = ['rituals', 'time', 'body', 'deps'];
    const categories = categoryTypes.map(type => ({
      key: `${type}_percent`,
      icon: taskCategoriesConfigService.getIcon(type),
      name: taskCategoriesConfigService.getTitle(type)
    }));

    for (const cat of categories) {
      const categoryHeader = document.createElement('th');
      categoryHeader.className = 'points-history-header';
      const headerContent = document.createElement('div');
      headerContent.className = 'points-history-header-content';
      
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'points-history-header-icon';
      try {
        const iconContent = await iconLoader.loadIcon(cat.icon);
        iconWrapper.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        iconWrapper.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
      headerContent.appendChild(iconWrapper);
      categoryHeader.appendChild(headerContent);
      headerRow.appendChild(categoryHeader);
    }

    // Очки за день
    const dailyHeader = document.createElement('th');
    dailyHeader.className = 'points-history-header';
    dailyHeader.textContent = 'Очки';
    headerRow.appendChild(dailyHeader);

    // Накопительно
    const cumulativeHeader = document.createElement('th');
    cumulativeHeader.className = 'points-history-header';
    cumulativeHeader.textContent = 'Накоп.';
    headerRow.appendChild(cumulativeHeader);

    // Статус - только иконка
    const statusHeader = document.createElement('th');
    statusHeader.className = 'points-history-header';
    const statusIconWrapper = document.createElement('div');
    statusIconWrapper.className = 'points-history-status-header-icon';
    try {
      const lockIcon = await iconLoader.loadIcon('lock');
      statusIconWrapper.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${lockIcon}</svg>`;
    } catch (e) {
      // Fallback
    }
    statusHeader.appendChild(statusIconWrapper);
    headerRow.appendChild(statusHeader);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тело таблицы
    const tbody = document.createElement('tbody');
    const startDateStr = this.pointsService.getPointsStartDate();
    const startTime = startDateStr ? new Date(startDateStr + 'T00:00:00').getTime() : null;

    for (const point of points) {
      const row = document.createElement('tr');
      row.className = 'points-history-row';

      // Дата (сокращенная)
      const dateCell = document.createElement('td');
      dateCell.className = 'points-history-cell points-history-cell-date';
      dateCell.textContent = this.formatDateShort(point.date);
      row.appendChild(dateCell);

      // Номер дня относительно начала отчёта
      const dayNumCell = document.createElement('td');
      dayNumCell.className = 'points-history-cell points-history-cell-day-num';
      if (startTime) {
        const pointTime = new Date(point.date + 'T00:00:00').getTime();
        const daysDiff = Math.round((pointTime - startTime) / (24 * 60 * 60 * 1000));
        dayNumCell.textContent = daysDiff + 1;
      } else {
        dayNumCell.textContent = '—';
      }
      row.appendChild(dayNumCell);

      // Категории - отдельные ячейки только с процентами (без иконок)
      const completion = this.getCompletionForDate(point.date);
      
      for (const cat of categories) {
        const categoryCell = document.createElement('td');
        categoryCell.className = 'points-history-cell points-history-cell-category';
        
        const percent = completion ? completion[cat.key] ?? null : null;
        const value = percent != null ? `${percent.toFixed(0)}%` : `${(point.completion_percent || 0).toFixed(0)}%`;
        
        categoryCell.textContent = value;
        row.appendChild(categoryCell);
      }

      // Очки за день
      const dailyCell = document.createElement('td');
      dailyCell.className = `points-history-cell points-history-points-daily ${point.daily_points >= 0 ? 'positive' : 'negative'}`;
      dailyCell.textContent = point.daily_points >= 0 
        ? `+${point.daily_points.toFixed(1)}` 
        : point.daily_points.toFixed(1);
      row.appendChild(dailyCell);

      // Накопительно
      const cumulativeCell = document.createElement('td');
      cumulativeCell.className = 'points-history-cell points-history-points-cumulative';
      cumulativeCell.textContent = point.cumulative_points.toFixed(1);
      row.appendChild(cumulativeCell);

      // Статус - только иконка
      const statusCell = document.createElement('td');
      statusCell.className = 'points-history-cell points-history-status';
      await this.createStatusCellIconOnly(statusCell, point.date);
      row.appendChild(statusCell);

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    content.appendChild(table);

    this.element.appendChild(content);
    
    // Добавляем drag scroll
    setupDragScroll(content, { speed: 2 });
    
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Создает кнопку для показа подсказки в стиле радиокнопки
   */
  async createInfoButton() {
    let infoIcon = '';
    try {
      infoIcon = (await iconLoader.loadIcon('info')) || '';
    } catch (e) {
      infoIcon = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
    }

    const radioButton = new RadioButton({
      name: 'points-history-info-toggle',
      iconOnly: true,
      modifierClass: 'points-history-info-radio',
      items: [{ value: 'info', icon: infoIcon }],
    });
    const buttonGroup = radioButton.render();
    const button = buttonGroup.querySelector('.radio-button.points-history-info-radio');
    if (!button) return buttonGroup;
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');

    // Обработчик клика
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Воспроизводим звук для radio button
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES, DEFAULT_VOLUME } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.FORM_INPUT, UI_ELEMENT_TYPES.INPUT_RADIO);
        if (sound) {
          // Громкость для радиокнопок в 6 раз меньше общей (очень тихо)
          window.audioSystem.play(sound, { volume: DEFAULT_VOLUME / 6 });
        }
      }
      this.togglePopover();
    });
    
    // Обработчик клавиатуры
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.togglePopover();
      }
    });
    
    return buttonGroup;
  }

  /**
   * Создает popover окно с информацией о системе очков
   */
  async createPopover() {
    const popover = document.createElement('div');
    popover.className = 'points-history-popover';
    popover.style.display = 'none';
    
    const popoverContent = document.createElement('div');
    popoverContent.className = 'points-history-popover-content';
    
    const infoTitle = document.createElement('div');
    infoTitle.className = 'points-history-info-title';
    
    // Загружаем иконку info асинхронно
    try {
      const infoIcon = await iconLoader.loadIcon('info');
      if (infoIcon) {
        const iconWrapper = document.createElement('span');
        iconWrapper.className = 'points-history-info-icon';
        iconWrapper.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${infoIcon}</svg>`;
        infoTitle.appendChild(iconWrapper);
      }
    } catch (e) {
      // Иконка не критична, продолжаем без неё
    }
    
    const titleText = document.createElement('span');
    titleText.textContent = 'Как работают очки';
    infoTitle.appendChild(titleText);
    popoverContent.appendChild(infoTitle);

    const infoContent = document.createElement('div');
    infoContent.className = 'points-history-info-content';

    // Получаем дату начала отчета для отображения
    let startDateText = 'не установлена';
    try {
      const startDate = this.pointsService.getPointsStartDate();
      if (startDate) {
        const date = new Date(startDate + 'T00:00:00');
        startDateText = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      // Игнорируем ошибку
    }

    const explanation = document.createElement('div');
    explanation.className = 'points-history-info-text';
    explanation.innerHTML = `
      <p><strong>Расчет дневных очков:</strong></p>
      <p>Очки за день рассчитываются на основе процента выполнения задач в четырех категориях:</p>
      <ul>
        <li>Ритуалы: выполнение утренних и вечерних ритуалов</li>
        <li>Время: выполнение задач с таймером</li>
        <li>Тело: выполнение задач категории "Тело"</li>
        <li>Отношения: выполнение задач категории "Отношения"</li>
      </ul>
      <p>Средний процент выполнения = (Ритуалы + Время + Тело + Отношения) / 4</p>
      <p>Дневные очки = (Средний процент × 2) - 100</p>
      <p>Например: при 50% выполнения = (50 × 2) - 100 = 0 очков</p>
      <p>При 100% выполнения = (100 × 2) - 100 = +100 очков</p>
      
      <p style="margin-top: var(--space-md);"><strong>Накопительные очки:</strong></p>
      <p>Накопительные очки суммируются день за днем, начиная с даты начала отчета.</p>
      <p>Если накопительные очки становятся отрицательными, они обнуляются (минимум 0).</p>
      <p>Дата начала отчета: ${startDateText}</p>
      
      <p style="margin-top: var(--space-md);"><strong>Статус дня:</strong></p>
      <ul>
        <li>🔓 Открыт: день можно редактировать (сегодня и вчера)</li>
        <li>🔒 Заблокирован: день закрыт для редактирования</li>
        <li>📅 Будущий: день еще не наступил</li>
      </ul>
    `;
    infoContent.appendChild(explanation);
    popoverContent.appendChild(infoContent);
    
    popover.appendChild(popoverContent);
    
    // Сохраняем ссылку на обработчики для последующего удаления
    this.popoverClickHandler = (e) => {
      if (this.popover && this.popover.style.display !== 'none') {
        if (!popover.contains(e.target) && !e.target.closest('.points-history-info-radio')) {
          this.hidePopover();
        }
      }
    };
    
    this.popoverKeyHandler = (e) => {
      if (e.key === 'Escape' && this.popover && this.popover.style.display !== 'none') {
        this.hidePopover();
      }
    };
    
    // Закрытие при клике вне popover
    document.addEventListener('click', this.popoverClickHandler);
    
    // Закрытие по Escape
    document.addEventListener('keydown', this.popoverKeyHandler);
    
    return popover;
  }

  /**
   * Показывает/скрывает popover
   */
  togglePopover() {
    if (!this.popover) return;
    
    if (this.popover.style.display === 'none') {
      this.showPopover();
    } else {
      this.hidePopover();
    }
  }

  /**
   * Показывает popover
   */
  showPopover() {
    if (!this.popover) return;
    
    // Получаем позицию кнопки
    const button = this.element.querySelector('.points-history-info-radio');
    if (!button) return;
    
    const buttonRect = button.getBoundingClientRect();
    const popoverContent = this.popover.querySelector('.points-history-popover-content');
    
    if (!popoverContent) return;
    
    this.popover.style.display = 'block';
    
    // Получаем размеры popover после отображения
    const popoverWidth = 400; // Ширина из CSS
    const spaceRight = window.innerWidth - buttonRect.right;
    const spaceLeft = buttonRect.left;
    
    // Определяем позицию по горизонтали
    if (spaceRight >= popoverWidth + 8 || spaceRight >= spaceLeft) {
      // Справа от кнопки
      popoverContent.style.left = `${buttonRect.right + 8}px`;
      popoverContent.style.right = 'auto';
    } else {
      // Слева от кнопки
      popoverContent.style.right = `${window.innerWidth - buttonRect.left + 8}px`;
      popoverContent.style.left = 'auto';
    }
    
    // Выравниваем по верхнему краю кнопки
    popoverContent.style.top = `${buttonRect.top}px`;
    popoverContent.style.bottom = 'auto';
    
    // Обновляем состояние кнопки
    const input = button.querySelector('input[type="radio"]');
    if (input) {
      input.checked = true;
    }
  }

  /**
   * Скрывает popover
   */
  hidePopover() {
    if (!this.popover) return;
    
    this.popover.style.display = 'none';
    
    // Обновляем состояние кнопки
    const button = this.element.querySelector('.points-history-info-radio');
    if (button) {
      const input = button.querySelector('input[type="radio"]');
      if (input) {
        input.checked = false;
      }
    }
  }

  /**
   * Создает пояснительный блок с информацией о системе очков (deprecated - используется popover)
   */
  async createInfoBlock() {
    const infoBlock = document.createElement('div');
    infoBlock.className = 'points-history-info';

    const infoTitle = document.createElement('div');
    infoTitle.className = 'points-history-info-title';
    
    // Загружаем иконку info асинхронно
    try {
      const infoIcon = await iconLoader.loadIcon('info');
      if (infoIcon) {
        const iconWrapper = document.createElement('span');
        iconWrapper.className = 'points-history-info-icon';
        iconWrapper.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${infoIcon}</svg>`;
        infoTitle.appendChild(iconWrapper);
      }
    } catch (e) {
      // Иконка не критична, продолжаем без неё
    }
    
    const titleText = document.createElement('span');
    titleText.textContent = 'Как работают очки';
    infoTitle.appendChild(titleText);
    infoBlock.appendChild(infoTitle);

    const infoContent = document.createElement('div');
    infoContent.className = 'points-history-info-content';

    // Получаем дату начала отчета для отображения
    let startDateText = 'не установлена';
    try {
      const startDate = this.pointsService.getPointsStartDate();
      if (startDate) {
        const date = new Date(startDate + 'T00:00:00');
        startDateText = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      // Игнорируем ошибку
    }

    const explanation = document.createElement('div');
    explanation.className = 'points-history-info-text';
    explanation.innerHTML = `
      <p><strong>Расчет дневных очков:</strong></p>
      <p>Очки за день рассчитываются на основе процента выполнения задач в четырех категориях:</p>
      <ul>
        <li>Ритуалы: выполнение утренних и вечерних ритуалов</li>
        <li>Время: выполнение задач с таймером</li>
        <li>Тело: выполнение задач категории "Тело"</li>
        <li>Отношения: выполнение задач категории "Отношения"</li>
      </ul>
      <p>Средний процент выполнения = (Ритуалы + Время + Тело + Отношения) / 4</p>
      <p>Дневные очки = (Средний процент × 2) - 100</p>
      <p>Например: при 50% выполнения = (50 × 2) - 100 = 0 очков</p>
      <p>При 100% выполнения = (100 × 2) - 100 = +100 очков</p>
      
      <p style="margin-top: var(--space-md);"><strong>Накопительные очки:</strong></p>
      <p>Накопительные очки суммируются день за днем, начиная с даты начала отчета.</p>
      <p>Если накопительные очки становятся отрицательными, они обнуляются (минимум 0).</p>
      <p>Дата начала отчета: ${startDateText}</p>
      
      <p style="margin-top: var(--space-md);"><strong>Статус дня:</strong></p>
      <ul>
        <li>🔓 Открыт: день можно редактировать (сегодня и вчера)</li>
        <li>🔒 Заблокирован: день закрыт для редактирования</li>
        <li>📅 Будущий: день еще не наступил</li>
      </ul>
    `;
    infoContent.appendChild(explanation);
    infoBlock.appendChild(infoContent);

    return infoBlock;
  }

  /**
   * Получает проценты категорий по дате
   */
  getCompletionForDate(date) {
    const dbInstance = this.db.db || this.db;
    try {
      return dbInstance.prepare(`
        SELECT rituals_percent, time_percent, body_percent, deps_percent
        FROM act_task_completions
        WHERE date = ?
      `).get(date) || null;
    } catch (e) {
      console.warn('[PointsHistoryTable] Не удалось получить проценты категорий', e);
      return null;
    }
  }


  formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  formatDateShort(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month}`;
  }

  /**
   * Создает ячейку статуса только с иконкой (без текста)
   */
  async createStatusCellIconOnly(cell, date) {
    const isFuture = this.pointsService.isFutureDay(date);
    const isOpen = this.pointsService.isDayOpen(date);
    
    let iconName;
    if (isFuture) {
      iconName = 'calendar';
    } else if (isOpen) {
      iconName = 'pencil';
    } else {
      iconName = 'lock';
    }
    
    try {
      const iconContent = await iconLoader.loadIcon(iconName);
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'points-history-status-icon-only';
      iconWrapper.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      cell.appendChild(iconWrapper);
    } catch (e) {
      // Fallback
    }
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this.pointsUpdatedHandler) {
      window.removeEventListener('pointsUpdated', this.pointsUpdatedHandler);
      window.removeEventListener('pointsRecalculated', this.pointsUpdatedHandler);
      this.pointsUpdatedHandler = null;
    }
    if (this.categoriesConfigHandler) {
      window.removeEventListener('task-categories-config-changed', this.categoriesConfigHandler);
      this.categoriesConfigHandler = null;
    }
    
    // Удаляем обработчики popover
    if (this.popoverClickHandler) {
      document.removeEventListener('click', this.popoverClickHandler);
      this.popoverClickHandler = null;
    }
    
    if (this.popoverKeyHandler) {
      document.removeEventListener('keydown', this.popoverKeyHandler);
      this.popoverKeyHandler = null;
    }
    
    // Удаляем popover из DOM
    if (this.popover && this.popover.parentNode) {
      this.popover.parentNode.removeChild(this.popover);
      this.popover = null;
    }
  }
}

export default PointsHistoryTable;

