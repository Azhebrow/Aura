/**
 * Главный компонент страницы статистики
 */

import { StatsControls, StatsContent } from './index.js';
import StatsChart from './StatsChart.js';
import StatsFilterControl from './StatsFilterControl.js';
import { getStatsData, getRankDailyPointsData } from '../../utils/stats/StatsDataService.js';
import { aggregateData } from '../../utils/stats/StatsDataAggregator.js';
import { getColumnOrder } from '../../utils/stats/StatsDataFormatter.js';
import { getStatsCache } from '../../utils/stats/StatsCache.js';
import Section from '../layout/Section.js';
import { taskCategoriesConfigService } from '../../system/services/index.js';
import { iconLoader, formatCurrency } from '../../utils/index.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { getMacroColor } from '../../design-system/tokens/UnifiedColorPalette.js';
import eventBus from '../../system/core/EventBus.js';

class StatsPage {
  constructor() {
    this.element = null;
    this.controls = null;
    this.content = null; // StatsContent для таблицы
    this.lineChart = null;
    this.pieChart = null;
    this.rightPanel = null; // Сохраняем ссылку на правую панель
    this.lineChartSection = null; // Ссылка на секцию первого графика для обновления заголовка
    this.secondLineChartSection = null; // Ссылка на секцию второго графика (для rank)
    this.pieChartSection = null; // Ссылка на секцию круговой диаграммы
    this.pieChartList = null; // Ссылка на список элементов круговой диаграммы
    this.db = null;
    this.cache = null;
    this.loading = false;
    this.eventHandlers = []; // Массив для хранения обработчиков событий (для обратной совместимости)
    this.eventUnsubscribes = []; // Массив функций отписки от событий EventBus
    this.filterControl = null; // Компонент фильтрации категорий/элементов
    this.filteredKeys = null; // null = все видимы, иначе Set с ключами
    this.lastMode = null; // Последний режим для отслеживания изменений
    this.lastGroupBy = null; // Последняя группировка для отслеживания изменений
    /** Ключ последней собранной правой панели: table | chart-pie | chart-rank */
    this._statsLayoutKey = null;
    this._pieInteractCleanups = [];
  }

  async init() {
    try {
      // Получаем БД
      const getDB = window.getDB;
      if (!getDB) {
        console.error('[StatsPage] База данных недоступна');
        this.createErrorElement('База данных недоступна');
        return this.element;
      }
      this.db = getDB();
      if (!this.db) {
        console.error('[StatsPage] База данных не инициализирована');
        this.createErrorElement('База данных не инициализирована');
        return this.element;
      }
      // Получаем кэш
      this.cache = getStatsCache();

      // Создаем контейнер
      this.element = document.createElement('div');
      this.element.className = 'layout-control-panel';

      // Левая панель управления
      const leftPanel = document.createElement('div');
      leftPanel.className = 'layout-panel-left';

      // Создаем панель управления
      this.controls = new StatsControls((state) => this.onControlsChange(state));
      const controlsElement = await this.controls.render();
      leftPanel.appendChild(controlsElement);

      // Правая панель контента
      this.rightPanel = document.createElement('div');
      this.rightPanel.className = 'layout-panel-right';

      // Создаем StatsContent для таблицы
      this.content = new StatsContent();
      await this.content.init();

      // Инициализируем отображение на основе начального viewType
      await this.updateView();

      this.element.appendChild(leftPanel);
      this.element.appendChild(this.rightPanel);

      // Загружаем начальные данные (не ждем, чтобы не блокировать рендеринг)
      this.loadData().catch(err => {
        console.error('[StatsPage] Ошибка загрузки данных:', err);
      });

      // Подписываемся на события изменений данных для инвалидации кэша
      this.setupEventListeners();

      return this.element;
    } catch (error) {
      console.error('[StatsPage] Ошибка инициализации:', error);
      this.createErrorElement(`Ошибка инициализации: ${error.message}`);
      return this.element;
    }
  }

  /**
   * Создать элемент с сообщением об ошибке
   */
  createErrorElement(message) {
    if (!this.element) {
      this.element = document.createElement('div');
    }
    this.element.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--color-on-surface);">
        <h2>Ошибка загрузки статистики</h2>
        <p>${message}</p>
        <p style="margin-top: 20px; font-size: 0.9em; color: var(--color-on-surface-secondary);">
          Проверьте консоль браузера для подробностей
        </p>
      </div>
    `;
  }

  /**
   * Настроить слушатели событий для инвалидации кэша
   */
  setupEventListeners() {
    // Инвалидация при изменении задач
    const unsubscribeTaskChange = eventBus.on('taskProgressChanged', () => {
      this.cache.invalidateByPrefix('tasks_');
      this.loadData();
    });
    this.eventUnsubscribes.push(unsubscribeTaskChange);

    // Инвалидация при изменении транзакций
    const handleTransactionChange = () => {
      this.cache.invalidateByPrefix('finance_');
      this.loadData();
    };
    const unsubscribeTransactionChanged = eventBus.on('transactionChanged', handleTransactionChange);
    const unsubscribeTransactionAdded = eventBus.on('transactionAdded', handleTransactionChange);
    const unsubscribeTransactionDeleted = eventBus.on('transactionDeleted', handleTransactionChange);
    this.eventUnsubscribes.push(unsubscribeTransactionChanged, unsubscribeTransactionAdded, unsubscribeTransactionDeleted);

    // Инвалидация при изменении сессий таймера
    const handleTimerChange = () => {
      this.cache.invalidateByPrefix('time_');
      this.cache.invalidateByPrefix('leisure_');
      this.loadData();
    };
    const unsubscribeTimerChanged = eventBus.on('timerSessionChanged', handleTimerChange);
    const unsubscribeTimerAdded = eventBus.on('timerSessionAdded', handleTimerChange);
    const unsubscribeTimerDeleted = eventBus.on('timerSessionDeleted', handleTimerChange);
    this.eventUnsubscribes.push(unsubscribeTimerChanged, unsubscribeTimerAdded, unsubscribeTimerDeleted);

    // Инвалидация при изменении ритуалов
    const handleRitualChange = () => {
      this.cache.invalidateByPrefix('rituals_');
      this.loadData();
    };
    const unsubscribeRitualChanged = eventBus.on('ritualChanged', handleRitualChange);
    const unsubscribeRitualCompleted = eventBus.on('ritualCompleted', handleRitualChange);
    this.eventUnsubscribes.push(unsubscribeRitualChanged, unsubscribeRitualCompleted);

    // Инвалидация при пересчете очков (изменение даты начала отчета)
    const unsubscribePointsRecalculated = eventBus.on('pointsRecalculated', () => {
      // Инвалидируем кэш для всех режимов, связанных с очками
      this.cache.invalidateByPrefix('rank_');
      this.cache.invalidateByPrefix('tasks_');
      this.loadData();
    });
    this.eventUnsubscribes.push(unsubscribePointsRecalculated);

    // Инвалидация при изменении записей питания
    const handleNutritionChange = () => {
      this.cache.invalidateByPrefix('nutrition_');
      this.loadData();
    };
    const unsubscribeNutritionAdded = eventBus.on('nutritionEntryAdded', handleNutritionChange);
    const unsubscribeNutritionDeleted = eventBus.on('nutritionEntryDeleted', handleNutritionChange);
    this.eventUnsubscribes.push(unsubscribeNutritionAdded, unsubscribeNutritionDeleted);

    const handleCategoriesConfigChanged = () => {
      this.cache.invalidateByPrefix('tasks_');
      this.loadData();
    };
    window.addEventListener('task-categories-config-changed', handleCategoriesConfigChanged);
    this.eventUnsubscribes.push(() => {
      window.removeEventListener('task-categories-config-changed', handleCategoriesConfigChanged);
    });
  }

  /**
   * Обработчик изменения контролов
   */
  async onControlsChange(state) {
    try {
      // Перестройка правой панели (таблица / графики) выполняется в loadData по ключу раскладки
      await this.loadData(state);
    } catch (error) {
      console.error('[StatsPage] Ошибка в onControlsChange:', error);
    }
  }

  /**
   * Получить описание для заголовка графика
   */
  getChartTitleDescription(mode, chartType, isSecondChart = false) {
    const modeNames = {
      'tasks': 'Задачи',
      'rituals': 'Ритуалы',
      'mood': 'Настроение',
      'finance': 'Финансы',
      'time': 'Время',
      'rank': isSecondChart ? 'Накопление очков' : 'Очки за день',
      'leisure': 'Досуг'
    };

    const chartTypeNames = {
      'line': 'Линейная диаграмма',
      'bar': 'Столбчатая диаграмма',
      'pie': 'Круговая диаграмма',
      'doughnut': 'Кольцевая диаграмма'
    };

    const modeName = modeNames[mode] || mode;
    const chartTypeName = chartTypeNames[chartType] || 'Диаграмма';

    return `${chartTypeName}: ${modeName}`;
  }

  /**
   * Собрать метаданные с иконками и цветами
   */
  async collectMeta(data, mode, groupBy) {
    const meta = { icons: {}, colors: {} };
    
    if (!data || data.length === 0) {
      return meta;
    }

    // Собираем все ключи (категории/элементы)
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item.values || {}).forEach(key => allKeys.add(key));
    });

    // Получаем иконки и цвета для каждого ключа
    if (mode === 'tasks') {
      if (groupBy === 'categories') {
        // Для категорий используем централизованные иконки
        const categories = ['rituals', 'time', 'body', 'deps'];
        categories.forEach(categoryType => {
          const categoryTitle = taskCategoriesConfigService.getTitle(categoryType);
          if (allKeys.has(categoryTitle)) {
            meta.icons[categoryTitle] = taskCategoriesConfigService.getIcon(categoryType);
            meta.colors[categoryTitle] = CfgColorPalette.getTaskCategoryColor(categoryType);
          }
        });
      } else {
        // Для элементов берем иконки из задач, цвета наследуются от категории
        const categories = ['rituals', 'time', 'body', 'deps'];
        categories.forEach(categoryType => {
          const tasks = this.db.getTasksByCategory(categoryType);
          const categoryColor = CfgColorPalette.getTaskCategoryColor(categoryType);
          tasks.forEach(task => {
            const taskTitle = task.title || task.id;
            if (allKeys.has(taskTitle)) {
              if (task.icon) {
                meta.icons[taskTitle] = task.icon;
              }
              // Цвет задачи наследуется от категории
              meta.colors[taskTitle] = categoryColor;
            }
          });
        });
      }
    } else if (mode === 'time' || mode === 'leisure') {
      // Объединенный режим времени и досуга
      const timeTasks = this.db.getTasksByCategory('time');
      const leisureTasks = this.db.getAll('cfg_leisure_tasks') || [];
      
      if (groupBy === 'categories') {
        // Для категорий: Фокус, Наполнение, Эскапизм
        const focusTitle = taskCategoriesConfigService.getTitle('time');
        if (allKeys.has(focusTitle)) {
          meta.icons[focusTitle] = taskCategoriesConfigService.getIcon('time');
          meta.colors[focusTitle] = CfgColorPalette.getTaskCategoryColor('time');
        }
        
        // Для категорий досуга
        const fillingTask = leisureTasks.find(t => t.leisure_type === 'filling');
        const escapeTask = leisureTasks.find(t => t.leisure_type === 'escape');
        
        if (allKeys.has('Наполнение')) {
          if (fillingTask && fillingTask.icon) {
            meta.icons['Наполнение'] = fillingTask.icon;
          }
          // Цвет для категории "Наполнение" - первый цвет из палитры filling
          meta.colors['Наполнение'] = CfgColorPalette.getDefaultColor('leisure-filling');
        }
        if (allKeys.has('Эскапизм')) {
          if (escapeTask && escapeTask.icon) {
            meta.icons['Эскапизм'] = escapeTask.icon;
          }
          // Цвет для категории "Эскапизм" - первый цвет из палитры escape
          meta.colors['Эскапизм'] = CfgColorPalette.getDefaultColor('leisure-escape');
        }
      } else {
        // Для элементов: сначала задачи времени, потом задачи досуга
        const categoryColor = CfgColorPalette.getTaskCategoryColor('time');
        
        // Задачи времени
        timeTasks.forEach(task => {
          const taskTitle = task.title || task.id;
          if (allKeys.has(taskTitle)) {
            if (task.icon) {
              meta.icons[taskTitle] = task.icon;
            }
            // Цвет задачи наследуется от категории
            meta.colors[taskTitle] = categoryColor;
          }
        });
        
        // Задачи досуга
        // Сортируем задачи: сначала filling, потом escape
        const sortedTasks = [...leisureTasks].sort((a, b) => {
          if (a.leisure_type === 'filling' && b.leisure_type === 'escape') return -1;
          if (a.leisure_type === 'escape' && b.leisure_type === 'filling') return 1;
          return 0;
        });
        
        // Сохраняем информацию о типах задач для разделителей
        meta.leisureTaskTypes = {};
        sortedTasks.forEach(task => {
          const taskTitle = task.title || task.id;
          meta.leisureTaskTypes[taskTitle] = task.leisure_type;
          if (allKeys.has(taskTitle)) {
            if (task.icon) {
              meta.icons[taskTitle] = task.icon;
            }
            if (task.color) {
              // Нормализуем цвет через CfgColorPalette в зависимости от типа досуга
              const cfgType = task.leisure_type === 'filling' ? 'leisure-filling' : 'leisure-escape';
              meta.colors[taskTitle] = CfgColorPalette.normalizeColor(cfgType, task.color);
            } else {
              // Если цвета нет, используем дефолтный для типа досуга
              const cfgType = task.leisure_type === 'filling' ? 'leisure-filling' : 'leisure-escape';
              meta.colors[taskTitle] = CfgColorPalette.getDefaultColor(cfgType);
            }
          }
        });
      }
    } else if (mode === 'finance') {
      if (groupBy === 'categories') {
        // Для финансовых категорий (Доходы и Расходы)
        // Используем стандартные иконки и цвета
        if (allKeys.has('Доходы')) {
          meta.icons['Доходы'] = 'trending-up';
          // Цвет для категории "Доходы" - первый цвет из палитры доходов
          meta.colors['Доходы'] = CfgColorPalette.getDefaultColor('finance-income');
        }
        if (allKeys.has('Расходы')) {
          meta.icons['Расходы'] = 'trending-down';
          // Цвет для категории "Расходы" - первый цвет из палитры расходов
          meta.colors['Расходы'] = CfgColorPalette.getDefaultColor('finance-expense');
        }
      } else {
        // Для элементов (категории доходов/расходов)
        // Ключи имеют формат "+ Категория" или "- Категория"
        const incomeCategories = this.db.getAll('cfg_income_categories');
        const expenseCategories = this.db.getAll('cfg_expense_categories');
        
        // Сохраняем информацию о типах категорий для разделителей
        meta.financeCategoryTypes = {};
        
        // Обрабатываем категории доходов
        incomeCategories.forEach(category => {
          const categoryTitle = category.title || category.id;
          const keyWithPrefix = `+ ${categoryTitle}`;
          meta.financeCategoryTypes[keyWithPrefix] = 'income';
          if (allKeys.has(keyWithPrefix)) {
            if (category.icon) {
              meta.icons[keyWithPrefix] = category.icon;
            }
            if (category.color) {
              // Нормализуем цвет через CfgColorPalette для доходов
              const normalizedColor = CfgColorPalette.normalizeColor('finance-income', category.color);
              meta.colors[keyWithPrefix] = normalizedColor;
            } else {
              // Если цвета нет, используем дефолтный для доходов
              meta.colors[keyWithPrefix] = CfgColorPalette.getDefaultColor('finance-income');
            }
          }
        });
        
        // Обрабатываем категории расходов
        expenseCategories.forEach(category => {
          const categoryTitle = category.title || category.id;
          const keyWithPrefix = `- ${categoryTitle}`;
          meta.financeCategoryTypes[keyWithPrefix] = 'expense';
          if (allKeys.has(keyWithPrefix)) {
            if (category.icon) {
              meta.icons[keyWithPrefix] = category.icon;
            }
            if (category.color) {
              // Нормализуем цвет через CfgColorPalette для расходов
              const normalizedColor = CfgColorPalette.normalizeColor('finance-expense', category.color);
              meta.colors[keyWithPrefix] = normalizedColor;
            } else {
              // Если цвета нет, используем дефолтный для расходов
              meta.colors[keyWithPrefix] = CfgColorPalette.getDefaultColor('finance-expense');
            }
          }
        });
      }
    } else if (mode === 'rituals') {
      if (groupBy === 'categories') {
        // Для категорий ритуалов (Утро/Вечер) можно использовать стандартные иконки
        // sun для утра, moon для вечера
        if (allKeys.has('Утро')) {
          meta.icons['Утро'] = 'sun';
          // Цвет для утренних ритуалов
          meta.colors['Утро'] = CfgColorPalette.getDefaultColor('rituals-morning');
        }
        if (allKeys.has('Вечер')) {
          meta.icons['Вечер'] = 'moon';
          // Цвет для вечерних ритуалов
          meta.colors['Вечер'] = CfgColorPalette.getDefaultColor('rituals-evening');
        }
      } else {
        // Для элементов ритуалов
        const morningRituals = this.db.getAll('cfg_rituals_morning');
        const eveningRituals = this.db.getAll('cfg_rituals_evening');
        
        // Сохраняем информацию о типах ритуалов для разделителей
        meta.ritualTypes = {};
        
        morningRituals.forEach(ritual => {
          const ritualTitle = ritual.title || ritual.id;
          meta.ritualTypes[ritualTitle] = 'morning';
          if (allKeys.has(ritualTitle)) {
            if (ritual.icon) {
              meta.icons[ritualTitle] = ritual.icon;
            }
            if (ritual.color) {
              // Нормализуем цвет через CfgColorPalette для утренних ритуалов
              meta.colors[ritualTitle] = CfgColorPalette.normalizeColor('rituals-morning', ritual.color);
            } else {
              // Если цвета нет, используем дефолтный для утренних ритуалов
              meta.colors[ritualTitle] = CfgColorPalette.getDefaultColor('rituals-morning');
            }
          }
        });
        
        eveningRituals.forEach(ritual => {
          const ritualTitle = ritual.title || ritual.id;
          meta.ritualTypes[ritualTitle] = 'evening';
          if (allKeys.has(ritualTitle)) {
            if (ritual.icon) {
              meta.icons[ritualTitle] = ritual.icon;
            }
            if (ritual.color) {
              // Нормализуем цвет через CfgColorPalette для вечерних ритуалов
              meta.colors[ritualTitle] = CfgColorPalette.normalizeColor('rituals-evening', ritual.color);
            } else {
              // Если цвета нет, используем дефолтный для вечерних ритуалов
              meta.colors[ritualTitle] = CfgColorPalette.getDefaultColor('rituals-evening');
            }
          }
        });
      }
    } else if (mode === 'rank') {
      // Режим очков ранга
      if (groupBy === 'categories') {
        // Для категории "Очки ранга"
        if (allKeys.has('Очки ранга')) {
          meta.icons['Очки ранга'] = 'award';
          // Цвет для очков ранга - золотой/желтый
          meta.colors['Очки ранга'] = CfgColorPalette.getDefaultColor('tasks-categories') || '#FFD700';
        }
      } else {
        // Для элементов (то же самое, так как только одна категория)
        if (allKeys.has('Очки ранга')) {
          meta.icons['Очки ранга'] = 'award';
          meta.colors['Очки ранга'] = CfgColorPalette.getDefaultColor('tasks-categories') || '#FFD700';
        }
      }
    } else if (mode === 'mood') {
      // Режим настроения - собираем метаданные для каждого уровня
      const moods = this.db.getAll('cfg_diary_moods') || [];
      const moodMap = new Map();
      moods.forEach(mood => {
        moodMap.set(mood.level, mood);
      });

      // Сохраняем названия настроений для использования в форматтере
      meta.moodNames = {};
      
      // Для круговой диаграммы создаем метаданные для каждого уровня (1-5)
      for (let level = 1; level <= 5; level++) {
        const mood = moodMap.get(level);
        const label = mood?.title ? String(mood.title) : `Уровень ${level}`;
        const key = label;
        meta.moodNames[level] = label;
        
        if (mood) {
          if (mood.icon) {
            meta.icons[key] = mood.icon;
          }
          // Используем цвет из настроения, если есть, иначе генерируем
          if (mood.color) {
            meta.colors[key] = mood.color;
          } else {
            // Генерируем цвет на основе уровня (градиент от красного к зеленому)
            const hue = 120 - (level - 1) * 30; // От красного (0) к зеленому (120)
            meta.colors[key] = `hsl(${hue}, 70%, 60%)`;
          }
        } else {
          // Если настроения нет в БД, используем дефолтные значения
          const defaultIcons = ['frown', 'meh', 'minus', 'smile', 'laugh'];
          if (defaultIcons[level - 1]) {
            meta.icons[key] = defaultIcons[level - 1];
          }
          const hue = 120 - (level - 1) * 30;
          meta.colors[key] = `hsl(${hue}, 70%, 60%)`;
        }
      }

      // Для обратной совместимости также добавляем метаданные для ключа "Настроение"
      if (allKeys.has('Настроение')) {
        meta.icons['Настроение'] = 'heart';
        meta.colors['Настроение'] = CfgColorPalette.getDefaultColor('tasks-categories') || '#FF69B4';
      }
    } else if (mode === 'nutrition') {
      // Режим питания
      const { NUTRITION_GROUPS, getGroupColor, getGroupIcon } = await import('../../design-system/tokens/NutritionGroupPalette.js');
      
      if (groupBy === 'categories') {
        // Для категорий - столбцы с суммарными БЖУ и калориями
        allKeys.forEach(key => {
          // Определяем иконку и цвет для каждого столбца (UnifiedColorPalette)
          if (key === 'Белки') {
            meta.icons[key] = 'dumbbell';
            meta.colors[key] = getMacroColor('proteins');
          } else if (key === 'Жиры') {
            meta.icons[key] = 'droplet';
            meta.colors[key] = getMacroColor('fats');
          } else if (key === 'Углеводы') {
            meta.icons[key] = 'zap';
            meta.colors[key] = getMacroColor('carbs');
          } else if (key === 'Калории') {
            meta.icons[key] = 'flame';
            meta.colors[key] = getMacroColor('calories');
          } else {
            // Fallback для других ключей (если появятся)
            meta.icons[key] = 'apple';
            meta.colors[key] = getGroupColor('dishes');
          }
        });
      } else {
        // Для элементов - конкретные продукты
        allKeys.forEach(key => {
          // Получаем иконку и цвет из продукта/пресета
          const products = this.db.getAll('cfg_nutrition_products') || [];
          const presets = this.db.getAll('cfg_nutrition_presets') || [];
          
          const product = products.find(p => p.title === key);
          const preset = presets.find(p => p.title === key);
          
          if (product) {
            // Иконка продукта берётся из группы
            meta.icons[key] = product.group ? getGroupIcon(product.group) : (product.icon || 'package');
            if (product.group) {
              meta.colors[key] = getGroupColor(product.group);
            } else {
              meta.colors[key] = getGroupColor('dishes');
            }
          } else if (preset) {
            // Иконка пресета берётся из группы
            meta.icons[key] = preset.group ? getGroupIcon(preset.group) : (preset.icon || 'layers');
            if (preset.group) {
              meta.colors[key] = getGroupColor(preset.group);
            } else {
              meta.colors[key] = getGroupColor('dishes');
            }
          } else {
            // Если продукт/пресет не найден, используем дефолтные значения
            meta.icons[key] = 'package';
            meta.colors[key] = getGroupColor('dishes');
          }
        });
      }
    }

    return meta;
  }

  /**
   * Загрузить данные
   */
  async loadData(state = null) {
    if (!this.db) {
      console.error('[StatsPage] loadData: база данных недоступна');
      return;
    }

    if (!this.controls) {
      console.error('[StatsPage] loadData: контролы не инициализированы');
      return;
    }


    const currentState = state || this.controls.getState();

    // Валидация состояния
    if (!currentState.mode || !currentState.startDate || !currentState.endDate) {
      console.error('[StatsPage] loadData: некорректное состояние', currentState);
      return;
    }
    
    // Генерируем ключ кэша
    const cacheKey = this.cache.generateKey(
      currentState.mode,
      currentState.viewType,
      currentState.groupBy,
      currentState.period,
      currentState.aggregation,
      currentState.startDate,
      currentState.endDate
    );

    // Проверяем кэш
    let data = this.cache.get(cacheKey);

    // Проверяем данные из кэша для питания при группировке по категориям
    // Если данные содержат старые группы продуктов (не "Белки", "Жиры", "Углеводы", "Калории"), инвалидируем кэш
    if (data && currentState.mode === 'nutrition' && currentState.groupBy === 'categories' && data.length > 0) {
      const expectedKeys = ['Белки', 'Жиры', 'Углеводы', 'Калории'];
      const firstItem = data[0];
      if (firstItem && firstItem.values) {
        const hasOldFormat = Object.keys(firstItem.values).some(key => 
          !expectedKeys.includes(key) && 
          typeof firstItem.values[key] === 'object' &&
          firstItem.values[key] !== null &&
          !Array.isArray(firstItem.values[key])
        );
        if (hasOldFormat) {
          this.cache.invalidate();
          data = null;
        }
      }
    }

    if (!data) {
      try {
        const rawData = getStatsData(
          this.db,
          currentState.mode,
          currentState.startDate,
          currentState.endDate,
          currentState.groupBy
        );

        // Агрегируем данные
        data = aggregateData(
          rawData,
          currentState.aggregation,
          currentState.startDate,
          currentState.endDate
        );

        // Сохраняем в кэш
        this.cache.set(cacheKey, data);
      } catch (error) {
        console.error('[StatsPage] Ошибка получения данных:', error);
        console.error('[StatsPage] Stack:', error.stack);
        // Используем пустой массив в случае ошибки
        data = [];
      }
    }

    // НЕ обновляем даты из агрегированных данных
    // Агрегация должна работать В РАМКАХ выбранного периода, а не изменять его
    // Если нужно обновлять даты, это должно происходить только из сырых данных (rawData)
    // и только если пользователь явно выбрал "Обновить из данных"

    // Собираем метаданные с иконками
    const meta = await this.collectMeta(data, currentState.mode, currentState.groupBy);

    // Собираем все ключи для фильтра ТОЛЬКО из текущих данных
    const allKeys = new Set();
    data.forEach(item => {
      if (item.values) {
        Object.keys(item.values).forEach(key => {
          if (key) { // Пропускаем пустые ключи
            allKeys.add(key);
          }
        });
      }
    });
    
    // Для режима питания добавляем все группы продуктов, даже если они не в данных
    if (currentState.mode === 'nutrition' && currentState.groupBy === 'categories') {
      const { NUTRITION_GROUPS, getGroupTitle } = await import('../../design-system/tokens/NutritionGroupPalette.js');
      Object.keys(NUTRITION_GROUPS).forEach(groupId => {
        const groupTitle = getGroupTitle(groupId);
        if (groupTitle) {
          allKeys.add(groupTitle);
        }
      });
    }
    
    // Преобразуем в массив с порядком по категориям (не по алфавиту)
    const keysArray = getColumnOrder(currentState.mode, currentState.groupBy, allKeys);
    
    // Дополнительная проверка на дубликаты (на всякий случай)
    const finalKeys = [];
    const seen = new Set();
    for (const key of keysArray) {
      if (key && !seen.has(key)) {
        seen.add(key);
        finalKeys.push(key);
      }
    }

    // Проверяем, изменился ли режим или группировка - если да, пересоздаем фильтр
    // Важно: проверяем ДО обновления lastMode/lastGroupBy
    const modeChanged = this.lastMode !== null && this.lastMode !== currentState.mode;
    const groupByChanged = this.lastGroupBy !== null && this.lastGroupBy !== currentState.groupBy;
    
    if (modeChanged || groupByChanged) {
      this.filteredKeys = null;
      if (this.filterControl) {
        this.filterControl.destroy();
        this.filterControl = null;
      }
    }
    
    // Обновляем lastMode и lastGroupBy ПОСЛЕ проверки изменений
    this.lastMode = currentState.mode;
    this.lastGroupBy = currentState.groupBy;

    // Создаем или обновляем фильтр
    if (!this.filterControl) {
      this.filterControl = new StatsFilterControl(
        finalKeys,
        meta,
        null, // Всегда начинаем с "все выбрано"
        (selectedKeys) => {
          this.filteredKeys = selectedKeys;
          // Всегда используем актуальное состояние из контролов, а не замыкание
          const actualState = this.controls.getState();
          this.loadData(actualState);
        }
      );
      const filterElement = await this.filterControl.render();
      const slot =
        this.controls.seriesFilterSlot ||
        this.controls.element?.querySelector?.('.stats-series-filter-slot');
      if (slot) {
        slot.replaceChildren(filterElement);
      } else {
        const controlsContent = this.controls.element?.querySelector('.stats-controls-content');
        if (controlsContent) {
          controlsContent.appendChild(filterElement);
        }
      }
    } else {
      // Обновляем существующий фильтр
      // Обновляем callback, чтобы он использовал актуальное состояние
      this.filterControl.onChange = (selectedKeys) => {
        this.filteredKeys = selectedKeys;
        // Всегда используем актуальное состояние из контролов
        const actualState = this.controls.getState();
        this.loadData(actualState);
      };
      await this.filterControl.update(finalKeys, meta);
      // Синхронизируем filteredKeys с состоянием фильтра
      this.filteredKeys = this.filterControl.getSelectedKeys();
    }

    // Фильтруем данные на основе выбранных ключей
    if (this.filteredKeys !== null && this.filteredKeys.size > 0) {
      data = data.map(item => {
        const filteredValues = {};
        Object.keys(item.values || {}).forEach(key => {
          if (this.filteredKeys.has(key)) {
            filteredValues[key] = item.values[key];
          }
        });
        return {
          ...item,
          values: filteredValues
        };
      });
    }

    const desiredLayoutKey = currentState.viewType === 'table'
      ? 'table'
      : (currentState.mode === 'rank' ? 'chart-rank' : 'chart-pie');
    if (desiredLayoutKey !== this._statsLayoutKey) {
      await this.updateView();
    }

    // Определяем тип графика для отображения
    // Для процентных режимов (tasks, rituals) - линейная
    // Для настроения (mood) - линейная
    // Для очков ранга (rank) - линейная (накопительный показатель)
    // Для остальных - столбчатая
    let chartType = 'line';
    if (currentState.mode === 'tasks' || currentState.mode === 'rituals' || 
        currentState.mode === 'mood' || currentState.mode === 'rank') {
      chartType = 'line';
    } else {
      chartType = 'bar';
    }

    // Отображаем данные (data уже отфильтрована выше)
    if (currentState.viewType === 'table') {
      // Отображаем таблицу
      this.content.setLoading(false);
      if (this.content.table && this.lineChart) {
        this.content.table.setLineChart(this.lineChart);
      }
      await this.content.render(data, currentState.mode, 'table', currentState.groupBy, chartType, meta, currentState.aggregation);
    } else {
      // Отображаем графики
      try {
        // Обновляем заголовок секции в зависимости от типа графика
        if (this.lineChartSection) {
          if (currentState.mode === 'rank') {
            // Для режима rank первая секция - очки за день
            this.lineChartSection.updateTitle(this.getChartTitleDescription(currentState.mode, 'line', false));
          } else {
            const isLineChartMode = currentState.mode === 'tasks' || currentState.mode === 'rituals' || 
                                     currentState.mode === 'mood';
            const chartType = isLineChartMode ? 'line' : 'bar';
            const chartTitle = this.getChartTitleDescription(currentState.mode, chartType, false);
            this.lineChartSection.updateTitle(chartTitle);
          }
        }

        // Обновляем заголовок второй секции (для rank или pie chart)
        if (currentState.mode === 'rank' && this.secondLineChartSection) {
          this.secondLineChartSection.updateTitle(this.getChartTitleDescription(currentState.mode, 'line', true));
        } else if (currentState.mode !== 'rank' && this.pieChartSection) {
          this.pieChartSection.updateTitle(this.getChartTitleDescription(currentState.mode, 'pie', false));
        }

        // Для режима rank: первая диаграмма - дневные очки, вторая - накопительные
        if (currentState.mode === 'rank') {
          // Загружаем дневные очки для первой диаграммы
          const dailyData = getRankDailyPointsData(
            this.db,
            currentState.startDate,
            currentState.endDate,
            currentState.groupBy
          );
          const aggregatedDailyData = aggregateData(
            dailyData,
            currentState.aggregation,
            currentState.startDate,
            currentState.endDate
          );
          
          // Первая диаграмма - дневные очки (line chart с диапазоном -100 до +100)
          await this.lineChart.update(aggregatedDailyData, currentState.mode, 'line', currentState.groupBy, meta);

          // Вторая диаграмма - накопительные очки (line chart с автоматическим диапазоном)
          await this.pieChart.update(data, currentState.mode, 'line', currentState.groupBy, meta);
        } else {
          // Для остальных режимов - стандартная логика
          // Первая диаграмма (line или bar в зависимости от режима)
          await this.lineChart.update(data, currentState.mode, chartType, currentState.groupBy, meta);

          // Круговая диаграмма (pie chart)
          await this.pieChart.update(data, currentState.mode, 'pie', currentState.groupBy, meta);

          // Обновляем список элементов круговой диаграммы
          await this.updatePieChartList(meta);

        }

      } catch (error) {
        console.error('[StatsPage] Ошибка отображения данных:', error);
        console.error('[StatsPage] Stack:', error.stack);
      }
    }
  }

  async render() {
    if (!this.element) {
      await this.init();
    }
    return this.element;
  }

  /**
   * Обновить отображение в зависимости от viewType
   */
  async updateView() {
    if (!this.rightPanel) {
      return;
    }

    this.teardownPieChartInteractivity();

    const currentState = this.controls ? this.controls.getState() : { viewType: 'table' };
    const viewType = currentState.viewType || 'table';

    // Очищаем правую панель
    this.rightPanel.innerHTML = '';

    if (viewType === 'table') {
      // Показываем таблицу
      const statsSection = new Section({ title: 'Статистика и графики' });
      const sectionElement = statsSection.render();
      sectionElement.appendChild(this.content.element);
      this.rightPanel.appendChild(sectionElement);

      // Очищаем ссылки на графики если были созданы
      if (this.lineChart) {
        this.lineChart.destroy();
        this.lineChart = null;
      }
      if (this.pieChart) {
        this.pieChart.destroy();
        this.pieChart = null;
      }
      this._statsLayoutKey = 'table';
    } else {
      // Показываем графики с легендой
      // Получаем текущий режим из состояния контролов
      const currentState = this.controls ? this.controls.getState() : { mode: 'tasks' };
      const currentMode = currentState.mode || 'tasks';
      
      // Создаем графики если еще не созданы
      if (!this.lineChart) {
        this.lineChart = new StatsChart();
        await this.lineChart.init();
      }
      if (!this.pieChart) {
        this.pieChart = new StatsChart();
        await this.pieChart.init();
      }


      // Первая секция - линейная или столбчатая диаграмма (в зависимости от режима)
      // Заголовок будет обновлен в loadData при загрузке данных
      // Для режима rank первая секция - очки за день
      const firstChartType = currentMode === 'rank' ? 'line' : (currentMode === 'tasks' || currentMode === 'rituals' || currentMode === 'mood' ? 'line' : 'bar');
      const firstSectionTitle = this.getChartTitleDescription(currentMode, firstChartType, false);
      const lineChartSection = new Section({ title: firstSectionTitle });
      this.lineChartSection = lineChartSection; // Сохраняем ссылку для обновления заголовка
      const lineChartSectionElement = lineChartSection.render();
      lineChartSectionElement.appendChild(this.lineChart.element);
      this.rightPanel.appendChild(lineChartSectionElement);

      // Вторая секция - для режима rank это вторая линейная диаграмма, для остальных - круговая
      if (currentMode === 'rank') {
        // Для режима rank - вторая линейная диаграмма (накопительные очки)
        const secondSectionTitle = this.getChartTitleDescription(currentMode, 'line', true);
        const secondLineChartSection = new Section({ title: secondSectionTitle });
        this.secondLineChartSection = secondLineChartSection; // Сохраняем ссылку для обновления заголовка
        const secondLineChartSectionElement = secondLineChartSection.render();
        // Используем pieChart как второй line chart для накопительных очков
        // Добавляем напрямую в секцию, как и первую диаграмму - БЕЗ всяких контейнеров
        secondLineChartSectionElement.appendChild(this.pieChart.element);
        this.rightPanel.appendChild(secondLineChartSectionElement);
        this.pieChartList = null; // Для rank нет списка элементов
        this.pieChartSection = null; // Для rank нет круговой диаграммы
      } else {
        // Для остальных режимов - круговая диаграмма с двухколоночным layout
        const pieSectionTitle = this.getChartTitleDescription(currentMode, 'pie', false);
        const pieChartSection = new Section({ title: pieSectionTitle });
        this.pieChartSection = pieChartSection; // Сохраняем ссылку для обновления заголовка
        const pieChartSectionElement = pieChartSection.render();
        
        // Создаем контейнер с двумя колонками
        const pieChartContainer = document.createElement('div');
        pieChartContainer.className = 'stats-pie-chart-container';
        
        // Левая колонка - диаграмма
        const pieChartWrapper = document.createElement('div');
        pieChartWrapper.className = 'stats-pie-chart-wrapper';
        pieChartWrapper.appendChild(this.pieChart.element);
        
        // Правая колонка - список элементов
        const pieChartList = document.createElement('div');
        pieChartList.className = 'stats-pie-chart-list';
        
        pieChartContainer.appendChild(pieChartWrapper);
        pieChartContainer.appendChild(pieChartList);
        pieChartSectionElement.appendChild(pieChartContainer);
        
        // Сохраняем ссылку на список для обновления
        this.pieChartList = pieChartList;
        
        // Если уже есть данные, обновляем список сразу
        if (this.pieChart && this.pieChart.chartData) {
          const metaFromChart = this.pieChart.getMeta();
          await this.updatePieChartList(metaFromChart);
        }
        
        this.rightPanel.appendChild(pieChartSectionElement);
      }

      this._statsLayoutKey = currentMode === 'rank' ? 'chart-rank' : 'chart-pie';
    }
  }

  /**
   * Обновить список элементов круговой диаграммы
   */
  async updatePieChartList(meta = null) {
    if (!this.pieChartList || !this.pieChart) {
      console.warn('[StatsPage] updatePieChartList: pieChartList или pieChart отсутствуют');
      return;
    }

    // Получаем данные из круговой диаграммы
    const chartData = this.pieChart.getChartData();
    if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
      console.warn('[StatsPage] updatePieChartList: нет данных в графике');
      this.pieChartList.innerHTML = '';
      return;
    }

    // Для pie chart данные находятся в первом dataset
    const dataset = chartData.datasets[0];
    const labels = chartData.labels || [];
    const values = dataset.data || [];

    // Создаем массив элементов с индексами для сортировки
    const items = labels.map((label, index) => ({
      label,
      value: values[index] || 0,
      index,
      color: this.getItemColor(dataset, index, label, meta)
    }));

    // Сортируем по убыванию значений
    items.sort((a, b) => b.value - a.value);

    // Очищаем список
    this.pieChartList.innerHTML = '';

    // Создаем контейнер с прокруткой
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'stats-pie-chart-list-scroll';

    // Создаем таблицу для элементов
    const table = document.createElement('table');
    table.className = 'stats-pie-chart-table';

    // Создаем строки для каждого элемента
    for (const item of items) {
      // Проверяем видимость элемента
      const isVisible = this.pieChart.isDatasetVisible(item.index);
      
      const row = document.createElement('tr');
      row.className = 'stats-pie-chart-row';
      row.dataset.index = item.index; // Сохраняем оригинальный индекс для интерактивности
      
      // Скрываем строку, если элемент не видим
      if (!isVisible) {
        row.style.display = 'none';
      }

      // Ячейка с иконкой и названием
      const labelCell = document.createElement('td');
      labelCell.className = 'stats-pie-chart-label';
      
      // Иконка
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'stats-pie-chart-icon';
      let iconSvg = null;
      if (meta && meta.icons && meta.icons[item.label]) {
        try {
          const iconContent = await iconLoader.loadIcon(meta.icons[item.label]);
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${item.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
        } catch (error) {
          console.warn(`[StatsPage] Не удалось загрузить иконку для "${item.label}"`, error);
        }
      }
      if (iconSvg) {
        iconWrapper.innerHTML = iconSvg;
      } else {
        // Fallback - цветной индикатор
        const colorIndicator = document.createElement('span');
        colorIndicator.className = 'stats-pie-chart-color-indicator';
        colorIndicator.style.backgroundColor = item.color;
        iconWrapper.appendChild(colorIndicator);
      }
      
      const labelText = document.createElement('span');
      labelText.className = 'stats-pie-chart-label-text';
      labelText.textContent = item.label;
      
      labelCell.appendChild(iconWrapper);
      labelCell.appendChild(labelText);

      // Ячейка со значением
      const valueCell = document.createElement('td');
      valueCell.className = 'stats-pie-chart-value';
      
      // Форматирование значения в зависимости от режима
      let formattedValue = '';
      if (this.controls) {
        const currentState = this.controls.getState();
        const mode = currentState ? currentState.mode : null;
        const value = item.value || 0;
        
        if (mode === 'nutrition') {
          // Для питания - объект с БЖУ
          if (typeof value === 'object' && value !== null) {
            const calories = Math.round(value.calories || 0);
            const proteins = Math.round(value.proteins || 0);
            const fats = Math.round(value.fats || 0);
            const carbs = Math.round(value.carbs || 0);
            formattedValue = `${calories} ккал / Б:${proteins}г Ж:${fats}г У:${carbs}г`;
          } else {
            formattedValue = `${Math.round(value)} ккал`;
          }
        } else if (mode === 'tasks' || mode === 'rituals') {
          // Для задач и ритуалов - проценты
          formattedValue = `${Math.round(value)}%`;
        } else if (mode === 'finance') {
          // Для финансов - валюта из настроек
          const { formatBalance } = formatCurrency;
          formattedValue = formatBalance(Math.round(value));
        } else if (mode === 'time' || mode === 'leisure') {
          // Для времени - минимально в минутах, если есть часы - часы и минуты
          const totalMinutes = Math.round(value * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          if (hours === 0) {
            formattedValue = `${minutes} м`;
          } else if (minutes === 0) {
            formattedValue = `${hours} ч`;
          } else {
            formattedValue = `${hours} ч ${minutes} м`;
          }
        } else if (mode === 'mood') {
          // Для настроения - баллы
          formattedValue = `${Math.round(value)} балл.`;
        } else if (mode === 'rank') {
          // Для ранга - очки
          formattedValue = `${Math.round(value)} очк.`;
        } else {
          // Для остальных режимов - число с единицей "шт" (штук)
          formattedValue = `${Math.round(value)} шт`;
        }
      } else {
        // Fallback - просто число с единицей
        formattedValue = `${Math.round(item.value || 0)} шт`;
      }
      
      valueCell.textContent = formattedValue;

      row.appendChild(labelCell);
      row.appendChild(valueCell);
      table.appendChild(row);
    }

    scrollContainer.appendChild(table);
    this.pieChartList.appendChild(scrollContainer);

    // Настраиваем интерактивность с графиком
    this.setupPieChartInteractivity();
  }

  /**
   * Получить цвет элемента
   */
  getItemColor(dataset, index, label, meta) {
    // Сначала проверяем метаданные (приоритет)
    if (meta && meta.colors && meta.colors[label]) {
      return meta.colors[label];
    }
    // Затем проверяем dataset
    if (dataset.backgroundColor && Array.isArray(dataset.backgroundColor)) {
      const color = dataset.backgroundColor[index];
      if (color) return color;
    }
    if (dataset.borderColor && Array.isArray(dataset.borderColor)) {
      const color = dataset.borderColor[index];
      if (color) return color;
    }
    // Fallback: используем дефолтный цвет из палитры категорий задач
    // Это должно быть редко, так как все цвета должны быть в meta
    return CfgColorPalette.getDefaultColor('tasks-categories');
  }

  /**
   * Настроить интерактивность между графиком и списком
   */
  teardownPieChartInteractivity() {
    if (this._pieInteractCleanups && this._pieInteractCleanups.length) {
      this._pieInteractCleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
      this._pieInteractCleanups = [];
    }
  }

  setupPieChartInteractivity() {
    if (!this.pieChart || !this.pieChart.chart || !this.pieChartList) {
      return;
    }

    this.teardownPieChartInteractivity();

    const chart = this.pieChart.chart;
    const canvas = chart.canvas;

    const onCanvasMove = (e) => {
      const rows = this.pieChartList.querySelectorAll('.stats-pie-chart-row');
      const activeElements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
      if (activeElements.length > 0) {
        const activeIndex = activeElements[0].index;
        rows.forEach((row) => {
          if (parseInt(row.dataset.index, 10) === activeIndex) {
            row.classList.add('highlighted');
          } else {
            row.classList.remove('highlighted');
          }
        });
      } else {
        rows.forEach((row) => row.classList.remove('highlighted'));
      }
    };

    const onCanvasLeave = () => {
      const rows = this.pieChartList.querySelectorAll('.stats-pie-chart-row');
      rows.forEach((row) => row.classList.remove('highlighted'));
      this.resetPieChartHighlight();
    };

    canvas.addEventListener('mousemove', onCanvasMove);
    canvas.addEventListener('mouseleave', onCanvasLeave);
    this._pieInteractCleanups.push(() => canvas.removeEventListener('mousemove', onCanvasMove));
    this._pieInteractCleanups.push(() => canvas.removeEventListener('mouseleave', onCanvasLeave));

    const rows = this.pieChartList.querySelectorAll('.stats-pie-chart-row');
    rows.forEach((row) => {
      const onRowEnter = (e) => {
        e.stopPropagation();
        const index = parseInt(row.dataset.index, 10);
        this.highlightPieChartSegment(index);
        row.classList.add('highlighted');
      };
      const onRowLeave = (e) => {
        e.stopPropagation();
        this.resetPieChartHighlight();
        row.classList.remove('highlighted');
      };
      row.addEventListener('mouseenter', onRowEnter);
      row.addEventListener('mouseleave', onRowLeave);
      this._pieInteractCleanups.push(() => row.removeEventListener('mouseenter', onRowEnter));
      this._pieInteractCleanups.push(() => row.removeEventListener('mouseleave', onRowLeave));
    });
  }

  /**
   * Подсветить сегмент на круговой диаграмме
   */
  highlightPieChartSegment(index) {
    if (!this.pieChart || !this.pieChart.chart) {
      return;
    }

    const chart = this.pieChart.chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.[index]) {
      return;
    }
    chart.setActiveElements([{ datasetIndex: 0, index }]);
    chart.update('none');
  }

  /**
   * Сбросить подсветку всех сегментов
   */
  resetPieChartHighlight() {
    if (!this.pieChart || !this.pieChart.chart) {
      return;
    }

    const chart = this.pieChart.chart;
    chart.setActiveElements([]);
    chart.update('none');
  }

  destroy() {
    this.teardownPieChartInteractivity();
    if (this.filterControl && typeof this.filterControl.destroy === 'function') {
      this.filterControl.destroy();
    }
    this.filterControl = null;
    if (this.content) {
      this.content.destroy();
    }
    if (this.lineChart) {
      this.lineChart.destroy();
    }
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    // Удаляем обработчики событий (для обратной совместимости)
    this.eventHandlers.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    this.eventHandlers = [];

    // Отписываемся от всех событий EventBus
    this.eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribes = [];
  }
}

export default StatsPage;

