import Section from '../layout/Section.js';
import { taskCategoriesConfigService } from '../../system/services/index.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';
import eventBus from '../../system/core/EventBus.js';
import iconLoader from '../../utils/iconLoader.js';

// Ленивая загрузка Chart.js для избежания ошибок при импорте
let Chart, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Title, Tooltip, Legend;
let RadarController;
let Filler; // Плагин для заливки графиков
let chartJSLoaded = false;

async function loadChartJS() {
  if (chartJSLoaded) {
    return Chart;
  }

  try {
    // В Electron используем require для загрузки модулей из node_modules
    if (typeof window !== 'undefined' && window.require && typeof process !== 'undefined') {
      // Electron окружение - используем require
      try {
        const chartModule = window.require('chart.js');
        const chartDefault = chartModule.default || chartModule;
        
        Chart = chartDefault.Chart || chartDefault;
        
        // Все компоненты доступны через chartDefault
        CategoryScale = chartDefault.CategoryScale;
        LinearScale = chartDefault.LinearScale;
        RadialLinearScale = chartDefault.RadialLinearScale;
        PointElement = chartDefault.PointElement;
        LineElement = chartDefault.LineElement;
        Title = chartDefault.Title;
        Tooltip = chartDefault.Tooltip;
        Legend = chartDefault.Legend;
        RadarController = chartDefault.RadarController;
        Filler = chartDefault.Filler; // Плагин для заливки
        
        console.log('[CategoryProgressChartSection] Chart.js загружен через require("chart.js")');
      } catch (requireError) {
        console.error('[CategoryProgressChartSection] Ошибка загрузки через require:', requireError);
        throw requireError;
      }
    } else {
      // Браузерное окружение - используем import
      const chartModule = await import('chart.js');
      Chart = chartModule.Chart;
      CategoryScale = chartModule.CategoryScale;
      LinearScale = chartModule.LinearScale;
      RadialLinearScale = chartModule.RadialLinearScale;
      PointElement = chartModule.PointElement;
      LineElement = chartModule.LineElement;
      Title = chartModule.Title;
      Tooltip = chartModule.Tooltip;
      Legend = chartModule.Legend;
      RadarController = chartModule.RadarController;
      Filler = chartModule.Filler; // Плагин для заливки
    }
    
    // Регистрируем все необходимые компоненты Chart.js
    if (Chart && Chart.register) {
      const componentsToRegister = [];
      
      if (CategoryScale) componentsToRegister.push(CategoryScale);
      if (LinearScale) componentsToRegister.push(LinearScale);
      if (RadialLinearScale) componentsToRegister.push(RadialLinearScale);
      if (PointElement) componentsToRegister.push(PointElement);
      if (LineElement) componentsToRegister.push(LineElement);
      if (Title) componentsToRegister.push(Title);
      if (Tooltip) componentsToRegister.push(Tooltip);
      if (Legend) componentsToRegister.push(Legend);
      if (RadarController) componentsToRegister.push(RadarController);
      if (Filler) componentsToRegister.push(Filler); // Регистрируем плагин для заливки
      
      Chart.register(...componentsToRegister);
      console.log('[CategoryProgressChartSection] Зарегистрировано компонентов:', componentsToRegister.length);
    }

    chartJSLoaded = true;
    console.log('[CategoryProgressChartSection] Chart.js успешно загружен');
    return Chart;
  } catch (error) {
    console.error('[CategoryProgressChartSection] Ошибка загрузки Chart.js:', error);
    throw error;
  }
}

class CategoryProgressChartSection {
  // Статический массив рангов для переиспользования
  static RANKS = [
    { id: 1, name: 'НИКЧЁМНЫЙ', threshold: 0, imageNumber: 1 },
    { id: 2, name: 'ЛУЗЕР', threshold: 500, imageNumber: 2 },
    { id: 3, name: 'СЛАБАК', threshold: 1200, imageNumber: 3 },
    { id: 4, name: 'РАБОТЯГА', threshold: 2100, imageNumber: 4 },
    { id: 5, name: 'УЧЕНИК', threshold: 3300, imageNumber: 5 },
    { id: 6, name: 'ВОИН', threshold: 4800, imageNumber: 6 },
    { id: 7, name: 'ВОЛЯ', threshold: 6600, imageNumber: 7 },
    { id: 8, name: 'СИЛА', threshold: 8700, imageNumber: 8 },
    { id: 9, name: 'ЛЕГЕНДА', threshold: 11100, imageNumber: 9 },
    { id: 10, name: 'АТЛАНТ', threshold: 13800, imageNumber: 10 }
  ];

  constructor(date) {
    // Получаем выбранную дату из глобального состояния
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.date = date || selectedDateState.getSelectedDateString();
    } else {
      this.date = date || this.getCurrentDate();
    }
    
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[CategoryProgressChartSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[CategoryProgressChartSection] База данных не инициализирована');
      }
    }
    
    this.element = null;
    this.section = null;
    this.canvas = null;
    this.chart = null;
    this.chartData = null;
    this.previousChartData = null;
    this.unsubscribe = null;
    this.eventUnsubscribes = [];
    this.updateTimeout = null;
    this.updateIndicator = null;
    this.isUpdating = false;
    this.isRendering = false; // Защита от одновременных рендеров
    // Удалено: iconElements больше не нужны, иконки рендерятся на canvas через плагин
    this.resizeTimeout = null; // Таймаут для debounce resize
    this.resizeObserver = null; // ResizeObserver для отслеживания изменения размера
    
    // Кэш для конвертированных цветов
    this.colorCache = new Map();
    
    // Кэш для загруженных иконок как Image объекты для canvas
    this.iconImageCache = new Map();
    
    // Кеш для данных информации
    this.previousInfoData = null;
    this.leisureTasksCache = null;
    this.cachedLeisureTasksDate = null;
    
    // Инициализация PointsService один раз
    if (this.db) {
      try {
        if (!window.PointsService) {
          console.warn('[CategoryProgressChartSection] PointsService недоступен в window');
          this.pointsService = null;
          return;
        }
        const PointsService = window.PointsService;
        this.pointsService = new PointsService(this.db);
      } catch (e) {
        console.warn('[CategoryProgressChartSection] Не удалось инициализировать PointsService:', e);
        this.pointsService = null;
      }
    } else {
      this.pointsService = null;
    }
    
    // Константы
    this.CATEGORIES = ['rituals', 'time', 'body', 'deps'];
    this.DEBOUNCE_DELAY = 300;
    this.MIN_CHANGE_THRESHOLD = 0.1;
  }

  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  // Централизованная нормализация даты
  normalizeDate(date) {
    if (!date) return null;
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return String(date).split('T')[0];
  }

  // Централизованный метод обновления с debounce
  scheduleUpdate(eventDate = null) {
    // Проверяем дату события
    if (eventDate) {
      const normalizedEventDate = this.normalizeDate(eventDate);
      const normalizedCurrentDate = this.normalizeDate(this.date);
      if (normalizedEventDate !== normalizedCurrentDate) {
        return; // Игнорируем события для других дат
      }
    }

    // Очищаем предыдущий timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Планируем обновление
    this.updateTimeout = setTimeout(async () => {
      if (this.isRendering) {
        return; // Пропускаем, если уже идет рендеринг
      }
      await this.refresh();
    }, this.DEBOUNCE_DELAY);
  }

  // Централизованный метод обновления данных и рендеринга
  async refresh() {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    try {
      await this.loadData();
      
      // Предзагружаем иконки перед обновлением графика
      await this.preloadIcons();
      
      // Если график уже существует, обновляем только данные без полного рендера
      if (this.chart && this.chartData) {
        await this.updateChartWithAnimation();
      } else {
        // Только при первом создании или если графика нет - полный рендер
        await this.render();
      }
    } finally {
      this.isRendering = false;
    }
  }

  async init() {
    // Создаем секцию без названия
    this.section = new Section({ 
      title: ''
    });
    this.element = this.section.render();
    
    // Загружаем Chart.js
    try {
      await loadChartJS();
    } catch (error) {
      console.error('[CategoryProgressChartSection] Не удалось загрузить Chart.js:', error);
      this.element.innerHTML = '<div style="padding: var(--space-md); color: var(--color-on-surface-secondary);">Не удалось загрузить график</div>';
      return;
    }
    
    // Создаем единый монолитный контейнер
    this.unifiedContainer = document.createElement('div');
    this.unifiedContainer.className = 'category-progress-unified-container';
    
    // Создаем контейнер для верхней информации (ранг, очки, траты)
    this.topInfoContainer = document.createElement('div');
    this.topInfoContainer.className = 'category-progress-top-grid';
    this.unifiedContainer.appendChild(this.topInfoContainer);
    
    // Создаем обертку для графика
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'category-progress-chart-wrapper';
    chartWrapper.style.willChange = 'opacity, transform';
    chartWrapper.style.transform = 'translateZ(0)';
    
    // Создаем индикатор обновления
    this.updateIndicator = document.createElement('div');
    this.updateIndicator.className = 'chart-update-indicator';
    this.updateIndicator.style.display = 'none';
    chartWrapper.appendChild(this.updateIndicator);
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.willChange = 'opacity';
    this.canvas.style.transform = 'translateZ(0)';
    chartWrapper.appendChild(this.canvas);
    
    this.unifiedContainer.appendChild(chartWrapper);
    
    // Создаем контейнер для статистики времени
    this.statsContainer = document.createElement('div');
    this.statsContainer.className = 'category-progress-stats-section';
    this.unifiedContainer.appendChild(this.statsContainer);
    
    // Инициализируем массив для tooltips
    this.tooltips = [];
    
    // Добавляем единый контейнер в секцию
    this.element.appendChild(this.unifiedContainer);
    
    // Настраиваем обработчики событий
    this.setupEventListeners();
    
    // Настраиваем отслеживание изменения размера для обновления позиций иконок
    this.setupResizeObserver();
    
    // Загружаем данные и рендерим
    await this.refresh();
  }

  // Настройка отслеживания изменения размера контейнера
  // Упрощено: плагин Chart.js автоматически обновляется при изменении размера
  setupResizeObserver() {
    // Плагин Chart.js автоматически обрабатывает изменение размера,
    // дополнительная логика не требуется
  }

  /**
   * Загружает SVG иконку и конвертирует её в Image объект для рендеринга на canvas
   * @param {string} iconName - имя иконки
   * @param {string} color - цвет иконки в формате rgba
   * @returns {Promise<HTMLImageElement>} - Image объект с загруженной иконкой
   */
  async loadIconAsImage(iconName, color) {
    const cacheKey = `${iconName}_${color}`;
    
    // Проверяем кэш
    if (this.iconImageCache.has(cacheKey)) {
      return this.iconImageCache.get(cacheKey);
    }

    try {
      // Загружаем SVG содержимое через iconLoader
      const svgContent = await iconLoader.loadIcon(iconName);
      
      if (!svgContent) {
        console.warn(`[CategoryProgressChartSection] Иконка ${iconName} не загружена`);
        return null;
      }

      // Создаем полный SVG документ с цветом
      const fullSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${svgContent}
        </svg>
      `.trim();

      // Используем data URL вместо blob (CSP может блокировать blob:)
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fullSvg);

      // Создаем Image объект
      const img = new Image();
      
      // Ждем загрузки изображения
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Не удалось загрузить иконку ${iconName}`));
        img.src = dataUrl;
      });

      // Кэшируем результат
      this.iconImageCache.set(cacheKey, img);
      
      return img;
    } catch (error) {
      console.error(`[CategoryProgressChartSection] Ошибка загрузки иконки ${iconName}:`, error);
      return null;
    }
  }

  // Удалено: updateIconsPositions больше не нужен, иконки рендерятся на canvas через плагин

  setupEventListeners() {
    // Подписка на изменения выбранной даты
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.date = dateString;
        // Сбрасываем предыдущие данные при смене даты, чтобы избежать дублирования
        this.previousInfoData = null;
        this.cachedLeisureTasksDate = null;
        this.leisureTasksCache = null;
        await this.refresh();
      });
    }
    
    // Централизованный обработчик для событий прогресса задач
    const handleTaskProgressChanged = (detail) => {
      const eventDate = detail?.date || detail?.data?.date;
      this.scheduleUpdate(eventDate);
    };
    
    eventBus.on('taskProgressChanged', handleTaskProgressChanged);
    this.eventUnsubscribes.push(() => {
      eventBus.off('taskProgressChanged', handleTaskProgressChanged);
    });
    
    // Централизованный обработчик для событий таймера
    const handleTimerSessionEvent = (detail) => {
      const eventDate = detail?.date || detail?.data?.date;
      this.scheduleUpdate(eventDate);
    };
    
    const timerEvents = ['timerSessionChanged', 'timerSessionAdded', 'timerSessionDeleted'];
    timerEvents.forEach(eventName => {
      eventBus.on(eventName, handleTimerSessionEvent);
      this.eventUnsubscribes.push(() => {
        eventBus.off(eventName, handleTimerSessionEvent);
      });
    });
    
    // Обработчик для событий транзакций
    const handleTransactionEvent = (detail) => {
      const eventDate = detail?.date || detail?.data?.date;
      this.scheduleUpdate(eventDate);
    };
    
    const transactionEvents = ['transactionAdded', 'transactionChanged', 'transactionDeleted'];
    transactionEvents.forEach(eventName => {
      eventBus.on(eventName, handleTransactionEvent);
      this.eventUnsubscribes.push(() => {
        eventBus.off(eventName, handleTransactionEvent);
      });
    });
    
    // Обработчик для пересчета очков
    const handlePointsRecalculated = (detail) => {
      const eventDate = detail?.date || detail?.data?.date;
      this.scheduleUpdate(eventDate);
    };
    
    eventBus.on('pointsRecalculated', handlePointsRecalculated);
    this.eventUnsubscribes.push(() => {
      eventBus.off('pointsRecalculated', handlePointsRecalculated);
    });

    const handleCategoriesConfigChanged = () => {
      this.scheduleUpdate(this.date);
    };
    window.addEventListener('task-categories-config-changed', handleCategoriesConfigChanged);
    this.eventUnsubscribes.push(() => {
      window.removeEventListener('task-categories-config-changed', handleCategoriesConfigChanged);
    });
  }

  // Получение иконки категории (из настроек)
  getCategoryIcon(categoryType) {
    return taskCategoriesConfigService.getIcon(categoryType);
  }

  // Удалено: clearIcons больше не нужен, иконки рендерятся на canvas через плагин

  async loadData() {
    if (!this.db) {
      return;
    }

    const data = [];

    for (const categoryType of this.CATEGORIES) {
      try {
        const progress = this.db.getCategoryProgress(categoryType, this.date);
        const categoryTitle = taskCategoriesConfigService.getTitle(categoryType);
        const color = CfgColorPalette.getTaskCategoryColor(categoryType);
        const icon = this.getCategoryIcon(categoryType);
        
        data.push({
          category: categoryTitle,
          value: progress !== null && progress !== undefined ? progress : 0,
          color: color,
          categoryType: categoryType,
          icon: icon
        });
      } catch (e) {
        console.warn(`[CategoryProgressChartSection] Ошибка получения прогресса категории ${categoryType} за ${this.date}:`, e);
        const categoryTitle = taskCategoriesConfigService.getTitle(categoryType);
        data.push({
          category: categoryTitle,
          value: 0,
          color: CfgColorPalette.getTaskCategoryColor(categoryType),
          categoryType: categoryType,
          icon: this.getCategoryIcon(categoryType)
        });
      }
    }

    // Сохраняем предыдущие данные для отслеживания изменений
    this.previousChartData = this.chartData ? [...this.chartData] : null;
    this.chartData = data;
    
    // Обновляем дополнительную информацию
    await this.renderInfo();
  }

  // Проверка наличия изменений
  hasDataChanges() {
    if (!this.previousChartData || !this.chartData) {
      return false;
    }

    return this.previousChartData.some((prev, index) => {
      const current = this.chartData[index];
      return current && Math.abs(prev.value - current.value) > this.MIN_CHANGE_THRESHOLD;
    });
  }

  // Получение измененных категорий
  getChangedCategories() {
    if (!this.previousChartData || !this.chartData) {
      return [];
    }

    const changed = [];
    this.chartData.forEach((current, index) => {
      const previous = this.previousChartData[index];
      if (previous && Math.abs(previous.value - current.value) > this.MIN_CHANGE_THRESHOLD) {
        changed.push({
          index: index,
          categoryType: current.categoryType,
          color: current.color,
          oldValue: previous.value,
          newValue: current.value
        });
      }
    });

    return changed;
  }

  async render() {
    if (!this.element || !this.canvas || !Chart) {
      return;
    }

    // render() вызывается только при первом создании графика
    // Не показываем индикатор при обычном рендере, только при обновлении данных

    // Предзагружаем иконки перед созданием графика
    await this.preloadIcons();

    // Уничтожаем предыдущий график, если существует
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (!this.chartData || this.chartData.length === 0) {
      this.canvas.style.display = 'none';
      const chartWrapper = this.canvas.parentElement;
      if (chartWrapper) chartWrapper.classList.add('chart-loaded');
      return;
    }

    this.canvas.style.display = 'block';

    // Получаем конфигурацию графика (анимация появления — через CSS от центра)
    const config = this.createChartConfig();

    // При первом создании отключаем анимацию Chart.js, чтобы не было «сбоку» — появление только через CSS от центра
    const isFirstCreate = !this.canvas.parentElement.classList.contains('chart-loaded');
    if (isFirstCreate) {
      const opt = config.options || {};
      opt.animation = false;
      opt.animations = { radius: { duration: 0 }, colors: { duration: 0 }, numbers: { duration: 0 }, r: { duration: 0 } };
    }

    // Создаем график
    try {
      console.log('[CategoryProgressChartSection] ===== СОЗДАНИЕ ГРАФИКА =====');
      console.log('[CategoryProgressChartSection] Canvas:', {
        width: this.canvas.width,
        height: this.canvas.height,
        styleWidth: this.canvas.style.width,
        styleHeight: this.canvas.style.height
      });
      console.log('[CategoryProgressChartSection] Config dataset:', config.data.datasets[0]);
      
      this.chart = new Chart(this.canvas, config);
      
      // Убеждаемся, что canvas получает события мыши для tooltip
      if (this.canvas) {
        this.canvas.style.pointerEvents = 'auto';
      }
      
      // Принудительно включаем и настраиваем tooltip после создания графика
      if (this.chart) {
        // Включаем tooltip
        if (this.chart.options && this.chart.options.plugins && this.chart.options.plugins.tooltip) {
          this.chart.options.plugins.tooltip.enabled = true;
          this.chart.options.plugins.tooltip.intersect = false;
        }
        
        // Настраиваем interaction
        if (this.chart.options && this.chart.options.interaction) {
          this.chart.options.interaction.intersect = false;
          this.chart.options.interaction.mode = 'point';
        }
        
        // Обновляем график без анимации
        this.chart.update('none');
      }
      
      console.log('[CategoryProgressChartSection] График создан:', {
        chart: this.chart,
        datasets: this.chart.data.datasets,
        dataset0: this.chart.data.datasets[0],
        backgroundColor: this.chart.data.datasets[0].backgroundColor,
        fill: this.chart.data.datasets[0].fill
      });
      
      // Проверяем настройки после создания
      setTimeout(() => {
        console.log('[CategoryProgressChartSection] Проверка после создания (500ms):', {
          chart: this.chart,
          datasets: this.chart.data.datasets,
          backgroundColor: this.chart.data.datasets[0]?.backgroundColor,
          fill: this.chart.data.datasets[0]?.fill,
          optionsElements: this.chart.options?.elements?.line
        });
      }, 500);
      
      // Иконки рендерятся автоматически через плагин Chart.js после отрисовки графика
      // Дополнительная логика не требуется
      
      const chartWrapper = this.canvas.parentElement;
      if (chartWrapper) {
        chartWrapper.classList.add('chart-loaded');
      }
    } catch (error) {
      console.error('[CategoryProgressChartSection] Ошибка создания графика:', error);
      const chartWrapper = this.canvas?.parentElement;
      if (chartWrapper) chartWrapper.classList.add('chart-loaded');
    }
  }

  // Удалено: renderIconsPlugin больше не нужен, иконки рендерятся на canvas через плагин

  /**
   * Предзагружает все иконки для графика в Image объекты
   */
  async preloadIcons() {
    if (!this.chartData || this.chartData.length === 0) {
      return;
    }

    const loadPromises = this.chartData.map(async (categoryData) => {
      if (!categoryData || !categoryData.icon) {
        return;
      }
      
      const iconColor = this.hslToRgba(categoryData.color, 1);
      await this.loadIconAsImage(categoryData.icon, iconColor);
    });

    await Promise.all(loadPromises);
  }

  /**
   * Предзагружает все иконки для графика в Image объекты
   */
  async preloadIcons() {
    if (!this.chartData || this.chartData.length === 0) {
      return;
    }

    const loadPromises = this.chartData.map(async (categoryData) => {
      if (!categoryData || !categoryData.icon) {
        return;
      }
      
      const iconColor = this.hslToRgba(categoryData.color, 1);
      await this.loadIconAsImage(categoryData.icon, iconColor);
    });

    await Promise.all(loadPromises);
  }

  /**
   * Создает кастомный плагин Chart.js для рендеринга иконок на canvas
   */
  createCategoryIconsPlugin() {
    const self = this;
    
    return {
      id: 'categoryIcons',
      afterDraw: async (chart) => {
        const scale = chart.scales.r;
        if (!scale || !self.chartData || self.chartData.length === 0) {
          return;
        }

        const ctx = chart.ctx;
        const categoryCount = self.chartData.length;
        
        // Адаптивный размер иконки в зависимости от размера графика
        const drawingArea = scale.drawingArea || 0;
        const minIconSize = 20;
        const maxIconSize = 32;
        const baseIconSize = Math.max(minIconSize, Math.min(maxIconSize, drawingArea * 0.12));
        const iconSize = Math.round(baseIconSize);
        const iconHalfSize = iconSize / 2;
        
        // Расстояние от центра до иконок (снаружи области графика)
        const iconOffset = Math.max(20, drawingArea * 0.15);
        const iconDistance = drawingArea + iconOffset;

        // Рендерим иконки для каждой категории
        for (let index = 0; index < categoryCount; index++) {
          const categoryData = self.chartData[index];
          if (!categoryData || !categoryData.icon) {
            continue;
          }

          try {
            // Получаем цвет категории
            const iconColor = self.hslToRgba(categoryData.color, 1);
            
            // Получаем загруженную иконку из кэша (должна быть загружена заранее через preloadIcons)
            const cacheKey = `${categoryData.icon}_${iconColor}`;
            const iconImage = self.iconImageCache.get(cacheKey);
            
            if (!iconImage) {
              // Если иконка не загружена, пропускаем (она загрузится при следующем рендере)
              continue;
            }

            // Вычисляем угол для этой категории
            const angleStep = (2 * Math.PI) / categoryCount;
            const startAngle = -Math.PI / 2; // -90 градусов (вверху)
            const angle = startAngle + (index * angleStep);

            // Получаем позицию точки на максимальном значении (100%) для размещения иконки снаружи
            const position = scale.getPointPositionForValue(index, 100);
            
            // Вычисляем позицию иконки снаружи области графика
            const centerX = scale.xCenter;
            const centerY = scale.yCenter;
            const iconX = centerX + Math.cos(angle) * iconDistance;
            const iconY = centerY + Math.sin(angle) * iconDistance;

            // Рендерим иконку на canvas
            ctx.save();
            ctx.translate(iconX, iconY);
            ctx.drawImage(iconImage, -iconHalfSize, -iconHalfSize, iconSize, iconSize);
            ctx.restore();
          } catch (error) {
            console.error(`[CategoryProgressChartSection] Ошибка рендеринга иконки для категории ${categoryData.categoryType}:`, error);
          }
        }
      }
    };
  }

  createChartConfig() {
    // Получаем цвета темы из CSS переменных
    const themeColors = this.getThemeColors();

    // Подготавливаем данные для radar chart
    const labels = this.chartData.map(item => item.category);
    const values = this.chartData.map(item => item.value);
    const icons = this.chartData.map(item => item.icon);
    
    // Используем акцентный цвет для границы
    const accentRgb = themeColors.accentRgb || 'rgba(114, 47, 55, 1)';
    const borderRgbColors = this.chartData.map(item => this.hslToRgba(item.color, 1));
    
    // Создаем полупрозрачный фон из акцентного цвета
    // Используем явный цвет для гарантии работы
    let backgroundColorRgba;
    if (accentRgb.startsWith('rgba')) {
      // Если уже RGBA, заменяем альфа
      backgroundColorRgba = accentRgb.replace(/,\s*[\d.]+\)$/, ', 0.3)');
    } else if (accentRgb.startsWith('rgb')) {
      // Если RGB, добавляем альфа
      backgroundColorRgba = accentRgb.replace('rgb', 'rgba').replace(')', ', 0.3)');
    } else {
      // Fallback - явный цвет
      backgroundColorRgba = 'rgba(114, 47, 55, 0.3)';
    }
    
    console.log('[CategoryProgressChartSection] ===== ОТЛАДКА ФОНА ДИАГРАММЫ =====');
    console.log('[CategoryProgressChartSection] accentRgb:', accentRgb);
    console.log('[CategoryProgressChartSection] backgroundColorRgba:', backgroundColorRgba);
    console.log('[CategoryProgressChartSection] themeColors:', themeColors);
    console.log('[CategoryProgressChartSection] Данные графика:', {
      labels,
      values,
      valuesLength: values.length
    });
    
    const config = {
      type: 'radar',
      data: {
        labels: labels, // Оставляем для tooltip, но скроем в pointLabels
        datasets: [{
          label: 'Прогресс категорий',
          data: values,
          backgroundColor: backgroundColorRgba, // Полупрозрачная заливка акцентным цветом
          borderColor: accentRgb, // Акцентный цвет для границы
          borderWidth: 2,
          pointBackgroundColor: borderRgbColors,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: borderRgbColors,
          pointHoverBorderColor: '#fff',
          pointRadius: 6,
          pointHoverRadius: 10,
          pointHitRadius: 24, // Увеличенная зона наведения для удобного hover по точкам
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
          fill: 'origin' // Включаем заливку от центра для radar chart
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1, // Фиксируем соотношение сторон 1:1 для круглой диаграммы
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: themeColors.tooltipBackgroundColor,
            titleColor: themeColors.textColor,
            bodyColor: themeColors.textColor,
            borderColor: themeColors.borderColor,
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            intersect: false,
            // Одна подсказка по одной точке — без дублей и без повтора «Прогресс категорий»
            filter: (tooltipItem, index) => index === 0,
            callbacks: {
              title: (items) => (items.length ? [items[0].label] : []),
              label: (ctx) => `Прогресс: ${Math.round(Number(ctx.raw))}%`,
              afterLabel: () => null
            }
          },
          // Кастомный плагин для рендеринга иконок на canvas
          categoryIcons: this.createCategoryIconsPlugin()
        },
        interaction: {
          intersect: false,
          mode: 'point'
        },
        events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
        elements: {
          line: {
            fill: 'origin' // Включаем заливку от центра для radar chart
          },
          point: {
            hoverRadius: 8,
            hoverBorderWidth: 3
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              color: themeColors.textSecondaryColor,
              font: {
                family: this.getFontFamily(),
                size: 11
              },
              backdropColor: 'transparent'
            },
            grid: {
              color: themeColors.borderColor,
              lineWidth: 1
            },
            pointLabels: {
              display: false, // Скрываем текстовые метки, рендерим иконки через плагин
              color: themeColors.textColor,
              font: {
                family: this.getFontFamily(),
                size: 13,
                weight: '300'
              }
            },
            angleLines: {
              color: themeColors.borderColor,
              lineWidth: 1
            }
          }
        },
        animation: {
          duration: 700,
          easing: 'easeOutCubic',
          animateRotate: true,
          animateScale: true
        },
        animations: {
          // Анимация данных: точки и линия расходятся от центра (как «павлин»)
          radius: {
            duration: 700,
            easing: 'easeOutCubic'
          },
          colors: {
            duration: 700,
            easing: 'easeOutCubic'
          },
          numbers: {
            duration: 700,
            easing: 'easeOutCubic'
          },
          // Радиальная шкала: анимация от центра (сетка и ось растут из центра)
          r: {
            duration: 600,
            easing: 'easeOutCubic'
          }
        }
      }
    };
    
    console.log('[CategoryProgressChartSection] Конфигурация графика:', {
      type: config.type,
      datasetsCount: config.data.datasets.length,
      datasetConfig: config.data.datasets[0],
      fill: config.data.datasets[0].fill,
      backgroundColor: config.data.datasets[0].backgroundColor,
      elementsLineFill: config.options.elements?.line?.fill
    });
    console.log('[CategoryProgressChartSection] ===== КОНЕЦ ОТЛАДКИ =====');
    
    return config;
  }

  getFontFamily() {
    try {
      const style = getComputedStyle(document.documentElement);
      const fontFamily = style.getPropertyValue('--font-family').trim();
      // Убираем кавычки если они есть
      return fontFamily ? fontFamily.replace(/['"]/g, '') : 'Philosopher, sans-serif';
    } catch (e) {
      console.warn('[CategoryProgressChartSection] Не удалось получить шрифт из CSS переменной:', e);
      return 'Philosopher, sans-serif';
    }
  }

  getThemeColors() {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const textColor = computedStyle.getPropertyValue('--color-on-surface').trim() || '#ffffff';
    const textSecondaryColor = computedStyle.getPropertyValue('--color-on-surface-secondary').trim() || 'rgba(255, 255, 255, 0.6)';
    const borderColor = computedStyle.getPropertyValue('--color-border').trim() || 'rgba(255, 255, 255, 0.2)';
    const accentColor = computedStyle.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
    const backgroundColor = computedStyle.getPropertyValue('--color-section-background').trim() || 'transparent';
    
    // Преобразуем backgroundColor в rgba для tooltip
    let tooltipBackgroundColor = 'rgba(0, 0, 0, 0.7)';
    if (backgroundColor && backgroundColor !== 'transparent') {
      if (backgroundColor.startsWith('#')) {
        const hex = backgroundColor.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        tooltipBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
      } else if (backgroundColor.startsWith('rgba')) {
        const match = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
          const r = match[1];
          const g = match[2];
          const b = match[3];
          tooltipBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
      } else if (backgroundColor.startsWith('rgb')) {
        const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = match[1];
          const g = match[2];
          const b = match[3];
          tooltipBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
      }
    }

    // Конвертируем accentColor в RGB для Chart.js
    const accentRgb = this.colorToRgb(accentColor);

    return {
      textColor,
      textSecondaryColor,
      borderColor,
      accentColor,
      accentRgb,
      tooltipBackgroundColor
    };
  }

  colorToRgb(color) {
    // Если уже RGB/RGBA, возвращаем как есть
    if (color.startsWith('rgb')) {
      return color;
    }
    
    // Если HEX
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Если HSL
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      return this.hslToRgba(color, 1);
    }
    
    return color;
  }

  // Создает RGBA цвет с заданной прозрачностью из любого формата цвета
  createRgbaWithAlpha(color, alpha) {
    if (!color) {
      return `rgba(114, 47, 55, ${alpha})`;
    }

    // Если уже RGBA, заменяем альфа-канал
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
      // Fallback: заменяем последнее число перед закрывающей скобкой
      return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }

    // Если RGB, добавляем альфа-канал
    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
    }

    // Если HEX, конвертируем в RGBA
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Если HSL, конвертируем через hslToRgba
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      return this.hslToRgba(color, alpha);
    }

    // Fallback
    return `rgba(114, 47, 55, ${alpha})`;
  }

  async updateChartWithAnimation() {
    if (!this.chart || !this.chartData) {
      return;
    }

    // Показываем индикатор только при обновлении данных
    this.showUpdateIndicator();

    // Получаем измененные категории
    const changedCategories = this.getChangedCategories();

    // Обновляем данные графика
    const labels = this.chartData.map(item => item.category);
    const values = this.chartData.map(item => item.value);
    const themeColors = this.getThemeColors();
    const accentRgb = themeColors.accentRgb || 'rgba(114, 47, 55, 1)';

    // Конвертируем цвета (с кэшированием)
    const borderRgbColors = this.chartData.map(item => this.hslToRgba(item.color, 1));

    // Обновляем данные с анимацией
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = values;
    // Обновляем фон с явным цветом
    let backgroundColorRgba;
    if (accentRgb.startsWith('rgba')) {
      backgroundColorRgba = accentRgb.replace(/,\s*[\d.]+\)$/, ', 0.3)');
    } else if (accentRgb.startsWith('rgb')) {
      backgroundColorRgba = accentRgb.replace('rgb', 'rgba').replace(')', ', 0.3)');
    } else {
      backgroundColorRgba = 'rgba(114, 47, 55, 0.3)';
    }
    
    this.chart.data.datasets[0].borderColor = accentRgb; // Акцентный цвет для границы
    this.chart.data.datasets[0].backgroundColor = backgroundColorRgba; // Полупрозрачная заливка (30%)
    this.chart.data.datasets[0].fill = 'origin'; // ЯВНО включаем заливку от центра
    this.chart.data.datasets[0].pointBackgroundColor = borderRgbColors;
    this.chart.data.datasets[0].pointHoverBackgroundColor = borderRgbColors;

    // Добавляем эффект подсветки для измененных категорий
    if (changedCategories.length > 0) {
      this.highlightChangedCategories(changedCategories);
    }

    // Иконки статичны и НЕ обновляются при изменении данных
    // Они остаются на своих фиксированных позициях по углам диаграммы

    // Обновляем график с анимацией только для данных
    this.chart.update({
      duration: 900,
      easing: 'easeOutCubic',
      lazy: false
    });

    // Иконки не нужно перерисовывать - они статичны
    // Просто скрываем индикатор обновления после завершения анимации графика
    setTimeout(() => {
      this.hideUpdateIndicator();
    }, 900); // Ждем завершения анимации графика
  }

  hslToRgba(hsl, alpha = 1) {
    // Проверяем кэш
    const cacheKey = `${hsl}_${alpha}`;
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey);
    }

    const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) {
      const result = `rgba(255, 255, 255, ${alpha})`;
      this.colorCache.set(cacheKey, result);
      return result;
    }
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const result = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
    this.colorCache.set(cacheKey, result);
    return result;
  }

  highlightChangedCategories(changedCategories) {
    const chartContainer = this.canvas.parentElement;
    if (!chartContainer) return;

    changedCategories.forEach(({ index, color }) => {
      chartContainer.style.setProperty(`--highlight-color-${index}`, color);
    });

    chartContainer.classList.add('chart-updating');
    
    setTimeout(() => {
      chartContainer.classList.remove('chart-updating');
    }, 1200);
  }

  showUpdateIndicator() {
    if (this.updateIndicator) {
      this.isUpdating = true;
      this.updateIndicator.style.display = 'flex';
      this.updateIndicator.classList.add('active');
    }
  }

  hideUpdateIndicator() {
    if (this.updateIndicator) {
      this.isUpdating = false;
      this.updateIndicator.classList.remove('active');
      setTimeout(() => {
        if (!this.isUpdating) {
          this.updateIndicator.style.display = 'none';
        }
      }, 300);
    }
  }

  // Получение задач досуга с кешированием
  getLeisureTasks() {
    // Кешируем задачи досуга, если дата не изменилась
    if (this.leisureTasksCache && this.cachedLeisureTasksDate === this.date) {
      return this.leisureTasksCache;
    }
    
    if (!this.db) return [];
    try {
      this.leisureTasksCache = this.db.getAll('cfg_leisure_tasks');
      this.cachedLeisureTasksDate = this.date;
      return this.leisureTasksCache;
    } catch (e) {
      console.warn('[CategoryProgressChartSection] Ошибка получения задач досуга:', e);
      return [];
    }
  }

  // Получение топ-3 задач эскапизма за день
  getTopEscapeTasks() {
    if (!this.db) return [];
    try {
      const leisureTasks = this.getLeisureTasks();
      const escapeTasks = leisureTasks.filter(task => 
        task.task_type === 'timer' && task.leisure_type === 'escape'
      );
      
      // Получаем время для каждой задачи и сортируем
      const tasksWithTime = escapeTasks.map(task => {
        try {
          const totalSeconds = this.db.getTaskTimerTotal(this.date, task.id) || 0;
          return {
            ...task,
            timeSeconds: totalSeconds,
            timeHours: totalSeconds / 3600
          };
        } catch (e) {
          console.warn(`[CategoryProgressChartSection] Ошибка получения времени для задачи ${task.id}:`, e);
          return null;
        }
      }).filter(task => task !== null && task.timeSeconds > 0) // Только задачи с временем > 0
        .sort((a, b) => b.timeSeconds - a.timeSeconds) // Сортируем по убыванию
        .slice(0, 3); // Берем топ-3
      
      return tasksWithTime;
    } catch (e) {
      console.warn('[CategoryProgressChartSection] Ошибка получения топ-3 задач эскапизма:', e);
      return [];
    }
  }

  // Получение топ-3 задач наполнения за день
  getTopFillingTasks() {
    if (!this.db) return [];
    try {
      const leisureTasks = this.getLeisureTasks();
      const fillingTasks = leisureTasks.filter(task => 
        task.task_type === 'timer' && task.leisure_type === 'filling'
      );
      
      // Получаем время для каждой задачи и сортируем
      const tasksWithTime = fillingTasks.map(task => {
        try {
          const totalSeconds = this.db.getTaskTimerTotal(this.date, task.id) || 0;
          return {
            ...task,
            timeSeconds: totalSeconds,
            timeHours: totalSeconds / 3600
          };
        } catch (e) {
          console.warn(`[CategoryProgressChartSection] Ошибка получения времени для задачи ${task.id}:`, e);
          return null;
        }
      }).filter(task => task !== null && task.timeSeconds > 0) // Только задачи с временем > 0
        .sort((a, b) => b.timeSeconds - a.timeSeconds) // Сортируем по убыванию
        .slice(0, 3); // Берем топ-3
      
      return tasksWithTime;
    } catch (e) {
      console.warn('[CategoryProgressChartSection] Ошибка получения топ-3 задач наполнения:', e);
      return [];
    }
  }

  // Получение очков за день и текущего ранга
  getDayPointsAndRank() {
    if (!this.db || !this.pointsService) return { points: 0, pointsText: '0', rank: null };
    try {
      const pointsData = this.pointsService.getDayData(this.date, 'points');
      const cumulativePoints = this.pointsService.calculateCumulativePoints(this.date);
      
      // Определяем текущий ранг на основе накопительных очков
      let currentRank = CategoryProgressChartSection.RANKS[0];
      for (let i = CategoryProgressChartSection.RANKS.length - 1; i >= 0; i--) {
        if (cumulativePoints >= CategoryProgressChartSection.RANKS[i].threshold) {
          currentRank = CategoryProgressChartSection.RANKS[i];
          break;
        }
      }
      
      return {
        points: pointsData.value || 0,
        pointsText: pointsData.text || '0',
        rank: currentRank
      };
    } catch (e) {
      console.warn('[CategoryProgressChartSection] Ошибка получения очков и ранга:', e);
      return { points: 0, pointsText: '0', rank: null };
    }
  }

  // Форматирование времени в читаемый вид
  formatTime(hours) {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} мин`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) {
      return `${h} ч`;
    }
    return `${h} ч ${m} мин`;
  }

  // Получение импульсивных трат за день
  getDayExpenses() {
    if (!this.db) return { amount: 0, text: '0 ₽' };
    try {
      const transactions = this.db.getAllTransactions();
      const dayTransactions = transactions.filter(t => 
        t.date === this.date && t.type === 'expense'
      );
      
      let totalExpense = 0;
      dayTransactions.forEach(t => {
        // Учитываем только импульсивные траты
        if (t.category_id) {
          const category = this.db.getById('cfg_expense_categories', t.category_id);
          if (category && category.type === 'compulsive') {
            totalExpense += (t.amount || 0);
          }
        }
      });
      
      // Получаем валюту из настроек
      let currencySymbol = '₽';
      try {
        const settings = this.db.prepare('SELECT currency FROM app_settings LIMIT 1').get();
        if (settings && settings.currency) {
          const symbols = {
            'RUB': '₽', 'USD': '$', 'EUR': '€', 'GBP': '£',
            'JPY': '¥', 'CNY': '¥', 'KZT': '₸', 'BYN': 'Br', 'PLN': 'zł'
          };
          currencySymbol = symbols[settings.currency] || '₽';
        }
      } catch (e) {
        // Используем значение по умолчанию
      }
      
      return {
        amount: totalExpense,
        text: totalExpense === 0 ? `0 ${currencySymbol}` : `-${Math.round(totalExpense)} ${currencySymbol}`
      };
    } catch (e) {
      console.warn('[CategoryProgressChartSection] Ошибка получения трат:', e);
      return { amount: 0, text: '0 ₽' };
    }
  }

  // Создание верхней секции (ранг, очки, имп траты) с иконками
  async createTopInfoSection(points, pointsText, rank, expenses) {
    const [trophySvg, awardSvg, frownSvg] = await Promise.all([
      iconLoader.loadIcon('trophy').catch(() => ''),
      iconLoader.loadIcon('award').catch(() => ''),
      iconLoader.loadIcon('frown').catch(() => '')  // иконка импульсивных трат
    ]);

    const cards = [];
    if (rank) {
      cards.push(this.createRankCard(rank, trophySvg));
    }
    cards.push(this.createPointsCard(points, pointsText, awardSvg));
    cards.push(this.createExpensesCard(expenses, frownSvg));

    return cards;
  }

  // Создание карточки ранга (иконка + подпись + значение, монолитно)
  createRankCard(rank, iconSvg) {
    const card = document.createElement('div');
    card.className = 'info-card info-card-rank';
    card.title = rank.name;

    const header = document.createElement('div');
    header.className = 'info-card-header info-card-header-text';

    const labelWrap = document.createElement('div');
    labelWrap.className = 'info-card-label-wrap';
    if (iconSvg) {
      const iconEl = document.createElement('span');
      iconEl.className = 'info-card-icon-inline';
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
      labelWrap.appendChild(iconEl);
    }
    const label = document.createElement('span');
    label.className = 'info-card-label';
    label.textContent = 'Ранг';
    labelWrap.appendChild(label);

    const value = document.createElement('div');
    value.className = 'info-card-value';
    value.textContent = rank.name || '-';

    header.appendChild(labelWrap);
    header.appendChild(value);
    card.appendChild(header);

    return card;
  }

  // Создание карточки очков (иконка + подпись + значение, монолитно)
  createPointsCard(points, pointsText, iconSvg) {
    const card = document.createElement('div');
    card.className = 'info-card info-card-points';
    card.title = `Очки за день: ${pointsText}`;

    const header = document.createElement('div');
    header.className = 'info-card-header info-card-header-text';

    const labelWrap = document.createElement('div');
    labelWrap.className = 'info-card-label-wrap';
    if (iconSvg) {
      const iconEl = document.createElement('span');
      iconEl.className = 'info-card-icon-inline';
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
      labelWrap.appendChild(iconEl);
    }
    const label = document.createElement('span');
    label.className = 'info-card-label';
    label.textContent = 'Очки';
    labelWrap.appendChild(label);

    const value = document.createElement('div');
    value.className = 'info-card-value';
    value.textContent = pointsText ?? '0';

    header.appendChild(labelWrap);
    header.appendChild(value);
    card.appendChild(header);

    return card;
  }

  // Создание карточки имп трат (иконка + подпись + значение, монолитно)
  createExpensesCard(expenses, iconSvg) {
    const card = document.createElement('div');
    card.className = 'info-card info-card-expenses';
    card.title = `Импульсивные траты: ${expenses.text}`;

    const header = document.createElement('div');
    header.className = 'info-card-header info-card-header-text';

    const labelWrap = document.createElement('div');
    labelWrap.className = 'info-card-label-wrap';
    if (iconSvg) {
      const iconEl = document.createElement('span');
      iconEl.className = 'info-card-icon-inline';
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
      labelWrap.appendChild(iconEl);
    }
    const label = document.createElement('span');
    label.className = 'info-card-label';
    label.textContent = 'Имп траты';
    labelWrap.appendChild(label);

    const value = document.createElement('div');
    value.className = 'info-card-value';
    value.textContent = expenses.text ?? '-';

    header.appendChild(labelWrap);
    header.appendChild(value);
    card.appendChild(header);

    return card;
  }

  // Рендеринг дополнительной информации
  async renderInfo() {
    try {
      const escapeTasks = this.getTopEscapeTasks();
      const fillingTasks = this.getTopFillingTasks();
      const { points, pointsText, rank } = this.getDayPointsAndRank();
      const expenses = this.getDayExpenses();
      
      // Вычисляем общее время для проверки изменений
      const totalFilling = fillingTasks.reduce((sum, task) => sum + task.timeHours, 0);
      const totalEscape = escapeTasks.reduce((sum, task) => sum + task.timeHours, 0);
      const totalTime = totalFilling + totalEscape;
      
      // Проверяем, изменились ли данные
      const currentInfoData = {
        escapeTasks: escapeTasks.map(t => ({ id: t.id, time: t.timeSeconds })),
        fillingTasks: fillingTasks.map(t => ({ id: t.id, time: t.timeSeconds })),
        points,
        rankId: rank?.id,
        expensesAmount: expenses.amount,
        totalFilling,
        totalEscape,
        totalTime
      };
      
      const hasInfoChanged = !this.previousInfoData || 
        JSON.stringify(this.previousInfoData) !== JSON.stringify(currentInfoData);
      
      if (!hasInfoChanged) {
        return; // Данные не изменились, пропускаем рендеринг
      }
      
      // Определяем, что именно изменилось
      const previous = this.previousInfoData || {};
      const rankChanged = previous.rankId !== currentInfoData.rankId;
      const pointsChanged = previous.points !== currentInfoData.points;
      const expensesChanged = previous.expensesAmount !== currentInfoData.expensesAmount;
      const timeStatsChanged = previous.totalFilling !== currentInfoData.totalFilling ||
        previous.totalEscape !== currentInfoData.totalEscape ||
        previous.totalTime !== currentInfoData.totalTime;
      const tasksChanged = JSON.stringify(previous.escapeTasks) !== JSON.stringify(currentInfoData.escapeTasks) ||
        JSON.stringify(previous.fillingTasks) !== JSON.stringify(currentInfoData.fillingTasks);
      
      this.previousInfoData = currentInfoData;
      
      // Обновляем только измененные элементы
      if (this.topInfoContainer) {
        // Проверяем, существуют ли уже карточки
        const existingCards = this.topInfoContainer.querySelectorAll('.info-card');
        
        if (existingCards.length === 0) {
          const topCards = await this.createTopInfoSection(points, pointsText, rank, expenses);
          topCards.forEach(card => {
            this.topInfoContainer.appendChild(card);
          });
        } else {
          if (rankChanged) this.updateRankCard(rank);
          if (pointsChanged) this.updatePointsCard(points, pointsText);
          if (expensesChanged) this.updateExpensesCard(expenses);
        }
      }
      
      // Статистика времени
      if (this.statsContainer) {
        // Проверяем, существует ли уже блок статистики времени
        const existingSection = this.statsContainer.querySelector('.time-stats-container');
        
        if (!existingSection) {
          // Первый рендер - создаем блок
          const statsSection = this.createTimeStatsSection(totalFilling, totalEscape, totalTime);
          this.statsContainer.appendChild(statsSection);
        } else if (timeStatsChanged || !previous.totalTime) {
          // Обновляем статистику времени (включая случай переключения дней)
          // Удаляем старый блок перед созданием нового
          existingSection.remove();
          const statsSection = this.createTimeStatsSection(totalFilling, totalEscape, totalTime);
          this.statsContainer.appendChild(statsSection);
        }
      }
      
      // Сохраняем задачи для tooltip (не рендерим нижнюю часть)
      this.fillingTasks = fillingTasks;
      this.escapeTasks = escapeTasks;
    } catch (e) {
      console.error('[CategoryProgressChartSection] Ошибка рендеринга информации:', e);
    }
  }

  // Создание секции со списком задач
  async createTaskListSection(title, tasks, type) {
    const section = document.createElement('div');
    section.className = `info-section info-section-${type}`;
    
    const header = document.createElement('div');
    header.className = 'info-section-header';
    
    const icon = document.createElement('div');
    icon.className = 'info-section-icon';
    try {
      const iconName = type === 'filling' ? 'zap' : 'clock';
      const iconContent = await iconLoader.loadIcon(iconName);
      const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      iconSvg.setAttribute('viewBox', '0 0 24 24');
      iconSvg.setAttribute('fill', 'none');
      iconSvg.setAttribute('stroke', 'currentColor');
      iconSvg.setAttribute('stroke-width', '2');
      iconSvg.setAttribute('stroke-linecap', 'round');
      iconSvg.setAttribute('stroke-linejoin', 'round');
      iconSvg.innerHTML = iconContent;
      icon.appendChild(iconSvg);
    } catch (e) {
      console.warn(`[CategoryProgressChartSection] Ошибка загрузки иконки для ${type}:`, e);
    }
    
    const titleEl = document.createElement('div');
    titleEl.className = 'info-section-title';
    titleEl.textContent = title;
    
    header.appendChild(icon);
    header.appendChild(titleEl);
    section.appendChild(header);
    
    const list = document.createElement('div');
    list.className = 'info-task-list';
    
    tasks.forEach((task, index) => {
      const item = document.createElement('div');
      item.className = 'info-task-item';
      
      const rank = document.createElement('span');
      rank.className = 'info-task-rank';
      rank.textContent = `${index + 1}`;
      
      const name = document.createElement('span');
      name.className = 'info-task-name';
      name.textContent = task.title || task.id;
      
      const time = document.createElement('span');
      time.className = 'info-task-time';
      time.textContent = this.formatTime(task.timeHours);
      
      item.appendChild(rank);
      item.appendChild(name);
      item.appendChild(time);
      list.appendChild(item);
    });
    
    section.appendChild(list);
    return section;
  }

  // Создание секции со статистикой времени (соотношение и сумма)
  createTimeStatsSection(totalFilling, totalEscape, totalTime) {
    const fillingPercent = totalTime > 0 ? (totalFilling / totalTime) * 100 : 0;
    const escapePercent = totalTime > 0 ? (totalEscape / totalTime) * 100 : 0;
    
    const container = document.createElement('div');
    container.className = 'time-stats-container';
    
    // Левая часть - Наполнение
    const fillingBlock = document.createElement('div');
    fillingBlock.className = 'time-stats-block time-stats-filling';
    fillingBlock.dataset.type = 'filling';
    
    const fillingLabel = document.createElement('div');
    fillingLabel.className = 'time-stats-label';
    fillingLabel.textContent = 'Наполнение';
    
    const fillingValue = document.createElement('div');
    fillingValue.className = 'time-stats-value';
    fillingValue.textContent = this.formatTime(totalFilling);
    
    fillingBlock.appendChild(fillingLabel);
    fillingBlock.appendChild(fillingValue);
    
    // Добавляем обработчики hover для tooltip
    this.setupStatsBlockTooltip(fillingBlock, 'filling');
    
    // Центральная часть - Общее время
    const totalBlock = document.createElement('div');
    totalBlock.className = 'time-stats-block time-stats-total';
    if (totalTime > 0) {
      totalBlock.classList.add('time-stats-total-has-data');
    }
    
    const totalValue = document.createElement('div');
    totalValue.className = 'time-stats-value time-stats-total-value';
    totalValue.textContent = this.formatTime(totalTime);
    
    // Визуальная полоса соотношения (наполнение / эскапизм)
    const ratioBar = document.createElement('div');
    ratioBar.className = 'time-stats-ratio-bar';
    ratioBar.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      margin: 0;
    `;
    
    // Используем семантические цвета: зеленый для наполнения (позитивный), красный для эскапизма (негативный)
    const fillingColor = 'var(--color-success, #10b981)';
    const escapeColor = 'var(--color-error, #ef4444)';
    
    // Левая часть - Наполнение (зеленый)
    const fillingBar = document.createElement('div');
    fillingBar.style.cssText = `
      height: 100%;
      background: ${fillingColor};
      width: ${fillingPercent}%;
      transition: width 0.3s ease;
    `;
    
    // Правая часть - Эскапизм (красный)
    const escapeBar = document.createElement('div');
    escapeBar.style.cssText = `
      height: 100%;
      background: ${escapeColor};
      width: ${escapePercent}%;
      transition: width 0.3s ease;
    `;
    
    ratioBar.appendChild(fillingBar);
    ratioBar.appendChild(escapeBar);
    
    totalBlock.appendChild(totalValue);
    totalBlock.appendChild(ratioBar);
    
    // Правая часть - Эскапизм
    const escapeBlock = document.createElement('div');
    escapeBlock.className = 'time-stats-block time-stats-escape';
    escapeBlock.dataset.type = 'escape';
    
    const escapeLabel = document.createElement('div');
    escapeLabel.className = 'time-stats-label';
    escapeLabel.textContent = 'Эскапизм';
    
    const escapeValue = document.createElement('div');
    escapeValue.className = 'time-stats-value';
    escapeValue.textContent = this.formatTime(totalEscape);
    
    escapeBlock.appendChild(escapeLabel);
    escapeBlock.appendChild(escapeValue);
    
    // Добавляем обработчики hover для tooltip
    this.setupStatsBlockTooltip(escapeBlock, 'escape');
    
    container.appendChild(fillingBlock);
    container.appendChild(totalBlock);
    container.appendChild(escapeBlock);
    
    return container;
  }

  // Настройка tooltip для блока статистики
  setupStatsBlockTooltip(block, type) {
    let tooltip = null;
    let hideTimeout = null;
    
    const showTooltip = (e) => {
      // Отменяем скрытие, если оно запланировано
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Если tooltip уже существует и в DOM, просто показываем его
      if (tooltip && tooltip.parentElement) {
        tooltip.style.display = 'block';
        this.positionTooltip(tooltip, block, e);
        return;
      }
      
      // Получаем задачи
      const tasks = type === 'filling' ? this.fillingTasks : this.escapeTasks;
      const hasTasks = tasks && tasks.length > 0;
      
      // Создаем tooltip
      tooltip = document.createElement('div');
      tooltip.className = 'time-stats-tooltip';
      
      const title = document.createElement('div');
      title.className = 'time-stats-tooltip-title';
      title.textContent = type === 'filling' ? 'Наполнение' : 'Эскапизм';
      tooltip.appendChild(title);
      
      const list = document.createElement('div');
      list.className = 'time-stats-tooltip-list';
      
      if (hasTasks) {
        // Показываем топ-3 задачи
        tasks.slice(0, 3).forEach((task, index) => {
          const item = document.createElement('div');
          item.className = 'time-stats-tooltip-item';
          
          const rank = document.createElement('span');
          rank.className = 'time-stats-tooltip-rank';
          rank.textContent = `${index + 1}`;
          
          const name = document.createElement('span');
          name.className = 'time-stats-tooltip-name';
          name.textContent = task.title || task.id;
          
          const time = document.createElement('span');
          time.className = 'time-stats-tooltip-time';
          time.textContent = this.formatTime(task.timeHours);
          
          item.appendChild(rank);
          item.appendChild(name);
          item.appendChild(time);
          list.appendChild(item);
        });
      } else {
        // Показываем сообщение о пустоте
        const emptyItem = document.createElement('div');
        emptyItem.className = 'time-stats-tooltip-empty';
        emptyItem.textContent = 'Пусто';
        list.appendChild(emptyItem);
      }
      
      tooltip.appendChild(list);
      
      // Добавляем в DOM и сразу показываем для правильного вычисления размеров
      document.body.appendChild(tooltip);
      tooltip.style.display = 'block';
      
      // Позиционируем после того, как элемент виден и размеры вычислены
      // Используем requestAnimationFrame для гарантии, что браузер успел отрендерить
      requestAnimationFrame(() => {
        if (tooltip && tooltip.parentElement) {
          this.positionTooltip(tooltip, block, e);
        }
      });
    };
    
    const hideTooltip = () => {
      if (tooltip) {
        hideTimeout = setTimeout(() => {
          if (tooltip && tooltip.parentElement) {
            tooltip.style.display = 'none';
          }
        }, 100);
      }
    };
    
    const removeTooltip = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      if (tooltip && tooltip.parentElement) {
        tooltip.remove();
        tooltip = null;
      }
    };
    
    block.addEventListener('mouseenter', showTooltip);
    block.addEventListener('mouseleave', hideTooltip);
    block.addEventListener('mousemove', (e) => {
      if (tooltip && tooltip.parentElement && tooltip.style.display !== 'none') {
        this.positionTooltip(tooltip, block, e);
      }
    });
    
    // Сохраняем ссылку на tooltip для очистки
    if (!this.tooltips) {
      this.tooltips = [];
    }
    this.tooltips.push({ element: tooltip, remove: removeTooltip });
  }

  // Позиционирование tooltip
  positionTooltip(tooltip, block, e) {
    if (!tooltip || !block) return;
    
    const rect = block.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Позиционируем tooltip над блоком по центру
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    
    // Если tooltip выходит за левую границу экрана
    if (left < 8) {
      left = 8;
    }
    
    // Если tooltip выходит за правую границу экрана
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    
    // Если tooltip выходит за верхнюю границу экрана, показываем снизу
    if (top < 8) {
      top = rect.bottom + 8;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  // Метод для обновления отдельных элементов с анимацией
  async updateElementWithAnimation(element, newContent, animationClass = 'fade-update') {
    if (!element) return;
    
    // Если newContent - это Node, заменяем элемент
    if (newContent instanceof Node) {
      element.classList.add(animationClass);
      await new Promise(resolve => {
        const handleAnimationEnd = () => {
          element.removeEventListener('animationend', handleAnimationEnd);
          element.classList.remove(animationClass);
          resolve();
        };
        element.addEventListener('animationend', handleAnimationEnd);
        setTimeout(() => {
          element.removeEventListener('animationend', handleAnimationEnd);
          element.classList.remove(animationClass);
          resolve();
        }, 300);
      });
      element.replaceWith(newContent);
      return;
    }
    
    // Для текстового контента
    const oldContent = element.textContent;
    if (oldContent === newContent) return;
    
    // Добавляем класс анимации
    element.classList.add(animationClass);
    
    // Ждем завершения анимации
    await new Promise(resolve => {
      const handleAnimationEnd = () => {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.classList.remove(animationClass);
        resolve();
      };
      element.addEventListener('animationend', handleAnimationEnd);
      
      // Fallback timeout
      setTimeout(() => {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.classList.remove(animationClass);
        resolve();
      }, 300);
    });
    
    // Обновляем содержимое
    element.textContent = newContent;
  }

  updateRankCard(rank) {
    const rankCard = this.topInfoContainer?.querySelector('.info-card-rank');
    if (!rankCard) return;
    rankCard.title = rank.name;
    const valueEl = rankCard.querySelector('.info-card-value');
    if (valueEl) valueEl.textContent = rank.name || '-';
  }

  updatePointsCard(points, pointsText) {
    const pointsCard = this.topInfoContainer?.querySelector('.info-card-points');
    if (!pointsCard) return;
    pointsCard.title = `Очки за день: ${pointsText}`;
    const valueEl = pointsCard.querySelector('.info-card-value');
    if (valueEl) valueEl.textContent = pointsText ?? '0';
  }

  updateExpensesCard(expenses) {
    const expensesCard = this.topInfoContainer?.querySelector('.info-card-expenses');
    if (!expensesCard) return;
    expensesCard.title = `Импульсивные траты: ${expenses.text}`;
    const valueEl = expensesCard.querySelector('.info-card-value');
    if (valueEl) valueEl.textContent = expenses.text ?? '-';
  }

  // Метод для обновления статистики времени
  async updateTimeStats(totalFilling, totalEscape, totalTime) {
    if (!this.statsContainer) return;
    
    const fillingPercent = totalTime > 0 ? (totalFilling / totalTime) * 100 : 0;
    const escapePercent = totalTime > 0 ? (totalEscape / totalTime) * 100 : 0;
    
    // Обновляем значения
    const fillingValue = this.statsContainer.querySelector('.time-stats-filling .time-stats-value');
    const fillingPercentEl = this.statsContainer.querySelector('.time-stats-filling .time-stats-percent');
    const escapeValue = this.statsContainer.querySelector('.time-stats-escape .time-stats-value');
    const escapePercentEl = this.statsContainer.querySelector('.time-stats-escape .time-stats-percent');
    const totalValue = this.statsContainer.querySelector('.time-stats-total .time-stats-value');
    
    if (fillingValue) {
      const newText = this.formatTime(totalFilling);
      if (fillingValue.textContent !== newText) {
        await this.updateElementWithAnimation(fillingValue, newText);
      }
    }
    if (fillingPercentEl) {
      const newPercent = `${fillingPercent.toFixed(0)}%`;
      if (fillingPercentEl.textContent !== newPercent) {
        fillingPercentEl.textContent = newPercent;
      }
    }
    if (escapeValue) {
      const newText = this.formatTime(totalEscape);
      if (escapeValue.textContent !== newText) {
        await this.updateElementWithAnimation(escapeValue, newText);
      }
    }
    if (escapePercentEl) {
      const newPercent = `${escapePercent.toFixed(0)}%`;
      if (escapePercentEl.textContent !== newPercent) {
        escapePercentEl.textContent = newPercent;
      }
    }
    if (totalValue) {
      const newText = this.formatTime(totalTime);
      if (totalValue.textContent !== newText) {
        await this.updateElementWithAnimation(totalValue, newText);
      }
    }
  }

  // Метод для обновления списков задач
  async updateTaskLists(fillingTasks, escapeTasks) {
    if (!this.bottomInfoContainer) return;
    
    // Обновляем секцию наполнения
    const fillingSection = this.bottomInfoContainer.querySelector('.info-section-filling');
    if (fillingSection) {
      const list = fillingSection.querySelector('.info-task-list');
      if (list) {
        const newList = document.createElement('div');
        newList.className = 'info-task-list';
        
        fillingTasks.forEach((task, index) => {
          const item = document.createElement('div');
          item.className = 'info-task-item';
          
          const rank = document.createElement('span');
          rank.className = 'info-task-rank';
          rank.textContent = `${index + 1}`;
          
          const name = document.createElement('span');
          name.className = 'info-task-name';
          name.textContent = task.title || task.id;
          
          const time = document.createElement('span');
          time.className = 'info-task-time';
          time.textContent = this.formatTime(task.timeHours);
          
          item.appendChild(rank);
          item.appendChild(name);
          item.appendChild(time);
          newList.appendChild(item);
        });
        
        await this.updateElementWithAnimation(list, newList);
      }
    }
    
    // Обновляем секцию эскапизма
    const escapeSection = this.bottomInfoContainer.querySelector('.info-section-escape');
    if (escapeSection) {
      const list = escapeSection.querySelector('.info-task-list');
      if (list) {
        const newList = document.createElement('div');
        newList.className = 'info-task-list';
        
        escapeTasks.forEach((task, index) => {
          const item = document.createElement('div');
          item.className = 'info-task-item';
          
          const rank = document.createElement('span');
          rank.className = 'info-task-rank';
          rank.textContent = `${index + 1}`;
          
          const name = document.createElement('span');
          name.className = 'info-task-name';
          name.textContent = task.title || task.id;
          
          const time = document.createElement('span');
          time.className = 'info-task-time';
          time.textContent = this.formatTime(task.timeHours);
          
          item.appendChild(rank);
          item.appendChild(name);
          item.appendChild(time);
          newList.appendChild(item);
        });
        
        await this.updateElementWithAnimation(list, newList);
      }
    }
  }

  destroy() {
    try {
      
      // Отписываемся от событий
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      
      this.eventUnsubscribes.forEach(unsubscribe => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (e) {
          console.warn('[CategoryProgressChartSection] Ошибка при отписке от события:', e);
        }
      });
      this.eventUnsubscribes = [];
      
      // Очищаем timeout
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = null;
      }
      
      // Очищаем resize timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = null;
      }
      
      // Отключаем ResizeObserver
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      
      // Очищаем tooltips
      if (this.tooltips) {
        this.tooltips.forEach(({ remove }) => {
          if (remove) remove();
        });
        this.tooltips = [];
      }
      
      // Очищаем кэш
      this.colorCache.clear();
    this.leisureTasksCache = null;
    this.cachedLeisureTasksDate = null;
    this.previousInfoData = null;
    this.fillingTasks = [];
    this.escapeTasks = [];
      
      // Уничтожаем график
      if (this.chart) {
        try {
          this.chart.destroy();
        } catch (e) {
          console.warn('[CategoryProgressChartSection] Ошибка при уничтожении графика:', e);
        }
        this.chart = null;
      }
      
      // Очищаем ссылки
      this.pointsService = null;
      this.db = null;
    } catch (e) {
      console.error('[CategoryProgressChartSection] Ошибка при уничтожении компонента:', e);
    }
  }
}

export default CategoryProgressChartSection;
