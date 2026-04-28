import { Button } from '../form/index.js';
import { iconLoader, colorConversion, formatCurrency, confirmWithSound } from '../../utils/index.js';
import ConfigModal from './ConfigModal.js';
import { getPermissions } from '../../system/database/cfg-permissions.js';
import { EmptyState } from '../display/index.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { CFG_CONFIGS } from '../../system/database/cfg-configs.js';
import eventBus from '../../system/core/EventBus.js';
import { settingsChangeTracker } from '../../system/services/index.js';
import { getGroupColor, getGroupIcon } from '../../design-system/tokens/NutritionGroupPalette.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';

const { hexToRgba, hslToHex, getCategoryColor, getIconBackgroundOpacity, applyIconBackground } = colorConversion;
const { formatBalance } = formatCurrency;

class CfgList {
  constructor(tableName, config, configKey = null) {
    this.tableName = tableName;
    this.config = config; // Конфиг из cfg-configs.js
    this.configKey = configKey; // Ключ конфига для получения разрешений
    // Получаем разрешения: сначала из config.permissions, затем через getPermissions
    this.permissions = getPermissions(configKey, config);
    this.items = [];
    this.element = null;
    this.getDB = null; // Функция для получения БД
    this.currencyUnsubscribe = null; // Функция для отписки от изменений валюты
  }

  // Устанавливаем функцию для получения БД (из Electron)
  setDB(getDBFunction) {
    this.getDB = getDBFunction;
  }

  async init() {
    if (!this.getDB) {
      console.error('[CfgList] DB функция не установлена');
      return;
    }

    const db = this.getDB();
    if (!db) {
      console.error('[CfgList] База данных недоступна');
      this.items = [];
      await this.render();
      return;
    }
    
    // Загружаем данные из БД с фильтрами если есть
    if (this.config.filters) {
      this.items = db.getAll(this.tableName, this.config.filters);
    } else {
      this.items = db.getAll(this.tableName);
    }
    
    // Подписываемся на изменения валюты
    const handleCurrencyChange = async () => {
      const { resetCurrencyCache } = formatCurrency;
      resetCurrencyCache();
      // Перерисовываем список с новой валютой
      await this.render();
    };
    window.addEventListener('currency-changed', handleCurrencyChange);
    this.currencyUnsubscribe = () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
    
    await this.render();
  }

  async render() {
    // Если элемент уже существует, очищаем его
    if (this.element) {
      this.element.innerHTML = '';
    } else {
      this.element = document.createElement('div');
      this.element.className = 'cfg-list';
    }
    
    const container = this.element;

    // Для продуктов питания группируем по группам
    if (this.tableName === 'cfg_nutrition_products') {
      if (this.items.length === 0) {
        const list = document.createElement('div');
        list.className = 'cfg-list-items';
        const emptyState = new EmptyState({ type: 'elements' });
        await emptyState.init();
        list.appendChild(emptyState.render());
        container.appendChild(list);
      } else {
        const { getGroupTitle, NUTRITION_GROUPS } = await import('../../design-system/tokens/NutritionGroupPalette.js');
        
        // Группируем продукты по группам
        const groupedItems = {};
        for (const item of this.items) {
          const groupId = item.group || 'other';
          if (!groupedItems[groupId]) {
            groupedItems[groupId] = [];
          }
          groupedItems[groupId].push(item);
        }
        
        const list = document.createElement('div');
        list.className = 'cfg-list-items';
        
        // Сортируем группы по порядку из NUTRITION_GROUPS
        const groupOrder = Object.keys(NUTRITION_GROUPS);
        const sortedGroups = Object.keys(groupedItems).sort((a, b) => {
          const indexA = groupOrder.indexOf(a);
          const indexB = groupOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        
        for (const groupId of sortedGroups) {
          const items = groupedItems[groupId];
          if (items.length === 0) continue;
          
          const group = document.createElement('div');
          group.className = 'cfg-list-group';
          
          const groupHeader = document.createElement('div');
          groupHeader.className = 'cfg-list-group-header';
          if (groupId === 'other') {
            groupHeader.textContent = 'Прочее';
          } else {
            groupHeader.textContent = getGroupTitle(groupId);
          }
          group.appendChild(groupHeader);
          
          const groupList = document.createElement('div');
          groupList.className = 'cfg-list-group-items';
          for (const item of items) {
            const card = await this.createCard(item);
            if (card && card instanceof Node) {
              groupList.appendChild(card);
            }
          }
          group.appendChild(groupList);
          list.appendChild(group);
        }
        
        container.appendChild(list);
      }
    }
    // Для категорий расходов группируем по типу
    else if (this.tableName === 'cfg_expense_categories' && this.items.length > 0) {
      // Разделяем на обычные и импульсивные
      const ordinaryItems = this.items.filter(item => !item.type || item.type === '');
      const impulsiveItems = this.items.filter(item => item.type === 'compulsive');
      
      const list = document.createElement('div');
      list.className = 'cfg-list-items';
      
      // Группа обычных расходов
      if (ordinaryItems.length > 0) {
        const ordinaryGroup = document.createElement('div');
        ordinaryGroup.className = 'cfg-list-group';
        
        const ordinaryHeader = document.createElement('div');
        ordinaryHeader.className = 'cfg-list-group-header';
        ordinaryHeader.textContent = 'Обычные расходы';
        ordinaryGroup.appendChild(ordinaryHeader);
        
        const ordinaryList = document.createElement('div');
        ordinaryList.className = 'cfg-list-group-items';
        for (const item of ordinaryItems) {
          const card = await this.createCard(item);
          if (card && card instanceof Node) {
            ordinaryList.appendChild(card);
          }
        }
        ordinaryGroup.appendChild(ordinaryList);
        list.appendChild(ordinaryGroup);
      }
      
      // Группа импульсивных расходов
      if (impulsiveItems.length > 0) {
        const impulsiveGroup = document.createElement('div');
        impulsiveGroup.className = 'cfg-list-group';
        
        const impulsiveHeader = document.createElement('div');
        impulsiveHeader.className = 'cfg-list-group-header';
        impulsiveHeader.textContent = 'Импульсивные расходы';
        impulsiveGroup.appendChild(impulsiveHeader);
        
        const impulsiveList = document.createElement('div');
        impulsiveList.className = 'cfg-list-group-items';
        for (const item of impulsiveItems) {
          const card = await this.createCard(item);
          if (card && card instanceof Node) {
            impulsiveList.appendChild(card);
          }
        }
        impulsiveGroup.appendChild(impulsiveList);
        list.appendChild(impulsiveGroup);
      }
      
      container.appendChild(list);
    } else {
      // Обычный список без группировки
      const list = document.createElement('div');
      list.className = 'cfg-list-items';
      
      if (this.items.length === 0) {
        const emptyState = new EmptyState({ type: 'elements' });
        await emptyState.init();
        list.appendChild(emptyState.render());
      } else {
        for (const item of this.items) {
          const card = await this.createCard(item);
          if (card && card instanceof Node) {
            list.appendChild(card);
          }
        }
      }
      
      container.appendChild(list);
    }
    
    return container;
  }

  // Метод для получения кнопки добавления (для вставки в заголовок секции)
  async getAddButton() {
    // Проверяем разрешение на добавление
    if (!this.permissions.canAdd) {
      return null;
    }
    
    // Проверка ограничений для категорий задач (мин 1, макс 3)
    const isTaskCategory = this.configKey && ['tasks-rituals', 'tasks-time', 'tasks-body', 'tasks-deps'].includes(this.configKey);
    const isMaxReached = isTaskCategory && this.items.length >= 3;
    
    const addBtn = new Button({
      iconName: 'plus',
      onClick: () => this.openModal(),
      disabled: isMaxReached
    });
    await addBtn.init();
    const addBtnElement = addBtn.render();
    if (addBtnElement && addBtnElement instanceof Node) {
      addBtnElement.style.display = 'flex';
      addBtnElement.style.visibility = 'visible';
      if (isMaxReached) {
        addBtnElement.disabled = true;
        addBtnElement.style.opacity = '0.5';
        addBtnElement.style.cursor = 'not-allowed';
        addBtnElement.setAttribute('title', 'Максимальное количество задач: 3');
      }
      return addBtnElement;
    } else {
      // Fallback: создаем простую кнопку если основной компонент не работает
      const fallbackBtn = document.createElement('button');
      fallbackBtn.className = 'btn btn-icon';
      fallbackBtn.textContent = '+';
      if (isMaxReached) {
        fallbackBtn.disabled = true;
        fallbackBtn.style.opacity = '0.5';
        fallbackBtn.style.cursor = 'not-allowed';
        fallbackBtn.setAttribute('title', 'Максимальное количество задач: 3');
      } else {
        fallbackBtn.addEventListener('click', () => this.openModal());
      }
      return fallbackBtn;
    }
  }

  async createCard(item) {
    const card = document.createElement('div');
    card.className = 'cfg-card';
    
    // Делаем карточку кликабельной для редактирования (только если разрешено)
    if (this.permissions.canEdit) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        // Не открываем модальное окно если клик был на кнопку
        if (!e.target.closest('.cfg-card-actions')) {
          this.openModal(item);
        }
      });
    }
    
    // Иконка (всегда добавляем контейнер для иконки)
    const iconContainer = document.createElement('span');
    iconContainer.className = 'cfg-card-icon';
    
    // Получаем акцентный цвет из CSS переменной
    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      const accent = style.getPropertyValue('--color-accent').trim();
      // Используем дефолтный винный цвет если не задан
      return accent || DEFAULT_ACCENT;
    };
    
    // Определяем category_type из item или из config.filters
    const categoryType = item.category_type || (this.config.filters && this.config.filters.category_type);
    
    // Устанавливаем цвет фона и иконки
    // Определяем тип cfg для нормализации цвета
    let cfgType = null;
    if (this.configKey) {
      cfgType = this.configKey;
    } else if (this.tableName) {
      // Пытаемся определить тип по tableName
      for (const [key, cfgConfig] of Object.entries(CFG_CONFIGS)) {
        if (cfgConfig.tableName === this.tableName) {
          // Проверяем дополнительные признаки для точного определения
          if (this.config && this.config.filters) {
            if (this.config.filters.category_type === 'rituals' && key === 'tasks-rituals') {
              cfgType = key;
              break;
            }
            if (this.config.filters.category_type === 'time' && key === 'tasks-time') {
              cfgType = key;
              break;
            }
            if (this.config.filters.category_type === 'body' && key === 'tasks-body') {
              cfgType = key;
              break;
            }
            if (this.config.filters.category_type === 'deps' && key === 'tasks-deps') {
              cfgType = key;
              break;
            }
            if (this.config.filters.leisure_type === 'filling' && key === 'leisure-filling') {
              cfgType = key;
              break;
            }
            if (this.config.filters.leisure_type === 'escape' && key === 'leisure-escape') {
              cfgType = key;
              break;
            }
          }
          cfgType = key;
          break;
        }
      }
    }
    
    // Для продуктов питания и пресетов используем цвет из группы
    if ((this.tableName === 'cfg_nutrition_products' || this.tableName === 'cfg_nutrition_presets') && item.group) {
      const groupColor = getGroupColor(item.group);
      const colorForBg = groupColor.toLowerCase().startsWith('hsl') 
        ? hslToHex(groupColor)
        : groupColor;
      
      iconContainer.classList.add('has-color');
      applyIconBackground(iconContainer, colorForBg);
      iconContainer.style.setProperty('--icon-color', groupColor);
    } else if (item.color) {
      // Нормализуем цвет через CfgColorPalette
      const normalizedColor = cfgType 
        ? CfgColorPalette.normalizeColor(cfgType, item.color)
        : item.color;
      
      // Конвертируем HSL в HEX для использования в hexToRgba
      const colorForBg = normalizedColor.toLowerCase().startsWith('hsl') 
        ? hslToHex(normalizedColor) 
        : normalizedColor;
      
      iconContainer.classList.add('has-color');
      applyIconBackground(iconContainer, colorForBg);
      // Сохраняем нормализованный цвет для SVG
      iconContainer.style.setProperty('--icon-color', normalizedColor);
    } else if (categoryType) {
      // Если это категория задач, используем цвет категории
      const categoryColor = getCategoryColor(categoryType);
      if (categoryColor) {
        iconContainer.classList.add('has-color');
        applyIconBackground(iconContainer, categoryColor);
        iconContainer.style.setProperty('--icon-color', categoryColor);
      } else {
        // Fallback на акцентный цвет
        const accentColor = getAccentColor();
        iconContainer.classList.add('has-color');
        applyIconBackground(iconContainer, accentColor);
        iconContainer.style.setProperty('--icon-color', accentColor);
      }
    } else {
      // Для иконок без цвета используем акцентный цвет
      const accentColor = getAccentColor();
      iconContainer.style.setProperty('--icon-color', accentColor);
      iconContainer.classList.add('has-color');
      applyIconBackground(iconContainer, accentColor);
    }
    
    // Для продуктов и пресетов питания иконка берётся из группы, не из элемента
    const iconName = (this.tableName === 'cfg_nutrition_products' || this.tableName === 'cfg_nutrition_presets') && item.group
      ? getGroupIcon(item.group)
      : item.icon;
    if (iconName) {
      try {
        const iconContent = await iconLoader.loadIcon(iconName);
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    card.appendChild(iconContainer);
    
    // Контейнер для названия и данных
    const content = document.createElement('div');
    content.className = 'cfg-card-content';
    
    // Название
    const titleWrapper = document.createElement('span');
    titleWrapper.className = 'cfg-card-title';
    titleWrapper.style.display = 'inline-flex';
    titleWrapper.style.alignItems = 'center';
    titleWrapper.style.gap = '4px';
    const titleField = this.config.titleField || 'title';
    const titleText = item[titleField] || 'Без названия';
    const isImpulsive = this.tableName === 'cfg_expense_categories' && item.type === 'compulsive';
    if (isImpulsive) {
      try {
        const frownIcon = await iconLoader.loadIcon('frown');
        const iconSpan = document.createElement('span');
        iconSpan.className = 'cfg-card-impulsive-icon';
        iconSpan.style.cssText = 'display: inline-flex; flex-shrink: 0; width: 14px; height: 14px; opacity: 0.8; color: var(--color-on-surface-secondary);';
        iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">${frownIcon}</svg>`;
        titleWrapper.appendChild(iconSpan);
      } catch (e) {
        console.warn('[CfgList] Не удалось загрузить иконку impulsive:', e);
      }
    }
    titleWrapper.appendChild(document.createTextNode(titleText));
    content.appendChild(titleWrapper);
    
    // Данные элемента (после названия)
    const dataItems = await this.formatCardData(item);
    if (dataItems && dataItems.length > 0) {
      const dataContainer = document.createElement('div');
      dataContainer.className = 'cfg-card-data';
      dataContainer.innerHTML = dataItems.map(item => 
        `<span class="cfg-card-data-item">${item}</span>`
      ).join('');
      content.appendChild(dataContainer);
    }
    
    card.appendChild(content);
    
    // Кнопки действий
    const actions = document.createElement('div');
    actions.className = 'cfg-card-actions';
    
    const currentIndex = this.items.findIndex(i => i.id === item.id);
    const buttons = [];
    
    // Кнопки перемещения (только если разрешено)
    if (this.permissions.canReorder) {
      if (currentIndex > 0) {
        buttons.push({ 
          iconName: 'chevron-up', 
          onClick: async (e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            console.log('[CfgList] Перемещение вверх:', item.id);
            await this.moveItem(item.id, 'up'); 
          } 
        });
      }
      if (currentIndex < this.items.length - 1) {
        buttons.push({ 
          iconName: 'chevron-down', 
          onClick: async (e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            console.log('[CfgList] Перемещение вниз:', item.id);
            await this.moveItem(item.id, 'down'); 
          } 
        });
      }
    }
    
    // Кнопка удаления (только если разрешено)
    if (this.permissions.canDelete) {
      // Проверка ограничений для категорий задач (мин 1, макс 3)
      const isTaskCategory = this.configKey && ['tasks-rituals', 'tasks-time', 'tasks-body', 'tasks-deps'].includes(this.configKey);
      const isMinReached = isTaskCategory && this.items.length <= 1;
      
      buttons.push({ 
        iconName: 'trash-2',
        disabled: isMinReached,
        onClick: (e) => { 
          e.preventDefault();
          e.stopPropagation();
          if (!isMinReached) {
            this.deleteItem(item.id);
          }
        } 
      });
    }
    
    // Создаем кнопки
    for (const btnConfig of buttons) {
      try {
        // Сохраняем контекст this для обработчика
        const originalOnClick = btnConfig.onClick;
        const boundOnClick = originalOnClick ? originalOnClick.bind(this) : null;
        
        const btn = new Button({ ...btnConfig, onClick: boundOnClick });
        await btn.init();
        const element = btn.element;
        if (element && element instanceof Node) {
          // Применяем disabled если указано
          if (btnConfig.disabled) {
            element.disabled = true;
            element.style.opacity = '0.5';
            element.style.cursor = 'not-allowed';
            if (btnConfig.iconName === 'trash-2') {
              element.setAttribute('title', 'Минимальное количество задач: 1');
            }
          }
          actions.appendChild(element);
        } else {
          console.warn('[CfgList] Кнопка не является Node:', element, btnConfig);
        }
      } catch (error) {
        console.error('[CfgList] Ошибка создания кнопки:', error, btnConfig);
      }
    }
    
    card.appendChild(actions);
    return card;
  }
  
  async formatCardData(item) {
    // Специальная обработка для продуктов питания
    if (this.tableName === 'cfg_nutrition_products') {
      const dataItems = [];
      
      // Показываем порцию
      if (item.portion_weight) {
        dataItems.push(`${item.portion_weight}г`);
      }
      
      // Показываем калории и БЖУ в компактном виде
      const nutritionInfo = [];
      if (item.calories_per_100g !== null && item.calories_per_100g !== undefined) {
        nutritionInfo.push(`${Math.round(item.calories_per_100g)} ккал`);
      }
      if (item.proteins_per_100g !== null && item.proteins_per_100g !== undefined) {
        nutritionInfo.push(`Б: ${item.proteins_per_100g}г`);
      }
      if (item.fats_per_100g !== null && item.fats_per_100g !== undefined) {
        nutritionInfo.push(`Ж: ${item.fats_per_100g}г`);
      }
      if (item.carbs_per_100g !== null && item.carbs_per_100g !== undefined) {
        nutritionInfo.push(`У: ${item.carbs_per_100g}г`);
      }
      
      if (nutritionInfo.length > 0) {
        dataItems.push(nutritionInfo.join(' • '));
      }
      
      // Группу не показываем - она видна по цвету иконки
      
      return dataItems;
    }
    
    // Специальная обработка для пресетов питания
    if (this.tableName === 'cfg_nutrition_presets') {
      const dataItems = [];
      
      // Показываем количество продуктов в пресете
      if (item.products) {
        try {
          const products = typeof item.products === 'string' 
            ? JSON.parse(item.products) 
            : item.products;
          if (Array.isArray(products) && products.length > 0) {
            const uniqueProducts = new Set(products.map(p => p.product_id).filter(Boolean));
            dataItems.push(`${uniqueProducts.size} ${uniqueProducts.size === 1 ? 'продукт' : uniqueProducts.size < 5 ? 'продукта' : 'продуктов'}`);
          }
        } catch (e) {
          // Игнорируем ошибку парсинга
        }
      }
      
      // Показываем группу
      if (item.group) {
        try {
          const { getGroupTitle } = await import('../../design-system/tokens/NutritionGroupPalette.js');
          const groupTitle = getGroupTitle(item.group);
          if (groupTitle) {
            dataItems.push(groupTitle);
          }
        } catch (e) {
          // Игнорируем ошибку
        }
      }
      
      return dataItems;
    }
    
    // Обычная обработка для остальных типов
    const excludedFields = new Set(['id', 'title', 'icon', 'created_at', 'updated_at', 'level', 'category_type', 'category_id', 'leisure_type', 'portion_weight', 'calories_per_100g', 'proteins_per_100g', 'fats_per_100g', 'carbs_per_100g', 'group', 'products']);
    const dataItems = [];
    
    if (!this.config.fields) return dataItems;
    
    for (const field of this.config.fields) {
      if (excludedFields.has(field.name)) continue;
      
      const value = item[field.name];
      if (value === null || value === undefined || value === '') continue;
      
      let displayValue = '';
      
      if (field.type === 'checkbox') {
        displayValue = value ? 'Да' : 'Нет';
      } else if (field.type === 'select' && field.options) {
        // Проверяем, является ли options массивом (может быть строка для специальных типов)
        if (Array.isArray(field.options)) {
          const option = field.options.find(opt => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            return optValue === value;
          });
          
          if (option) {
            if (typeof option === 'string') {
              // Для строковых опций используем маппинг для красивых названий
              displayValue = this.getDisplayLabelForSelectValue(field.name, option);
            } else {
              displayValue = option.label || option.value;
            }
          } else {
            displayValue = value;
          }
        } else if (field.options === 'nutrition-groups' && field.name === 'group' && value) {
          // Специальная обработка для групп продуктов питания
          try {
            const { getGroupTitle } = await import('../../design-system/tokens/NutritionGroupPalette.js');
            displayValue = getGroupTitle(value) || value;
          } catch (e) {
            console.warn('[CfgList] Ошибка загрузки NutritionGroupPalette:', e);
            displayValue = value;
          }
        } else {
          displayValue = value;
        }
      } else if (field.type === 'number') {
        // Для денежных полей используем форматирование
        const { getCurrency } = formatCurrency;
        const currency = getCurrency();
        if (field.suffix === '₽' || field.suffix === currency.symbol) {
          displayValue = formatBalance(value);
        } else {
          displayValue = String(value) + (field.suffix ? ' ' + field.suffix : '');
        }
      } else if (field.type === 'textarea') {
        // Для описания показываем в одну строку, обрезаем если длинное
        const text = String(value);
        displayValue = text.length > 60 ? text.substring(0, 60) + '...' : text;
      } else {
        displayValue = String(value);
      }
      
      if (displayValue) {
        dataItems.push(`${field.label}: ${displayValue}`);
      }
    }
    
    return dataItems;
  }
  
  /**
   * Получает красивое название для значения select поля
   * @param {string} fieldName - Имя поля
   * @param {string} value - Значение
   * @returns {string} Красивое название
   */
  getDisplayLabelForSelectValue(fieldName, value) {
    // Маппинг для типов задач
    if (fieldName === 'task_type') {
      const taskTypeLabels = {
        'checkbox': 'Чекбокс',
        'number': 'Число',
        'timer': 'Таймер',
        'ritual': 'Ритуал',
        'list': 'Список'
      };
      return taskTypeLabels[value] || value;
    }
    
    // Маппинг для типов категорий расходов
    if (fieldName === 'type' && this.tableName === 'cfg_expense_categories') {
      const expenseTypeLabels = {
        '': 'Обычный',
        'compulsive': 'Импульсивный'
      };
      return expenseTypeLabels[value] || (value ? value : 'Обычный');
    }
    
    // Для других полей возвращаем значение как есть
    return value;
  }
  
  async moveItem(itemId, direction) {
    if (!this.getDB) {
      console.error('[CfgList] DB функция не установлена');
      return;
    }

    const db = this.getDB();
    if (!db) {
      console.error('[CfgList] База данных недоступна');
      return;
    }
    
    const currentIndex = this.items.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;
    
    let targetIndex;
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < this.items.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      return;
    }
    
    // Меняем местами элементы в массиве
    [this.items[currentIndex], this.items[targetIndex]] = [this.items[targetIndex], this.items[currentIndex]];
    
    // Обновляем DOM сразу для мгновенной визуальной обратной связи
    const listContainer = this.element.querySelector('.cfg-list-items');
    if (listContainer) {
      const cards = Array.from(listContainer.children);
      if (cards.length === this.items.length && cards[currentIndex] && cards[targetIndex]) {
        // Перемещаем существующие карточки в DOM
        const currentCard = cards[currentIndex];
        const targetCard = cards[targetIndex];
        
        if (direction === 'up') {
          // Перемещаем вверх: вставляем текущую карточку перед целевой
          listContainer.insertBefore(currentCard, targetCard);
        } else {
          // Перемещаем вниз: вставляем текущую карточку после целевой
          if (targetCard.nextSibling) {
            listContainer.insertBefore(currentCard, targetCard.nextSibling);
          } else {
            listContainer.appendChild(currentCard);
          }
        }
      } else {
        // Если количество не совпадает или элементы не найдены, пересоздаем
        listContainer.innerHTML = '';
        for (const item of this.items) {
          const card = await this.createCard(item);
          if (card && card instanceof Node) {
            listContainer.appendChild(card);
          }
        }
      }
    }
    
    // Обновляем level для всех элементов в правильном порядке в БД
    try {
      for (let i = 0; i < this.items.length; i++) {
        db.update(this.tableName, this.items[i].id, { level: i });
      }
    } catch (error) {
      console.error('[CfgList] Ошибка при обновлении level в БД:', error);
      // В случае ошибки перезагружаем список
      await this.init();
    }
  }

  async openModal(item = null) {
    // Проверка ограничений для категорий задач (мин 1, макс 3)
    const isTaskCategory = this.configKey && ['tasks-rituals', 'tasks-time', 'tasks-body', 'tasks-deps'].includes(this.configKey);
    
    if (isTaskCategory && !item) {
      // Проверяем максимальное количество при добавлении
      if (this.items.length >= 3) {
        const { customAlert } = await import('../../utils/customDialogs.js');
        await customAlert('Максимальное количество задач в категории: 3');
        return;
      }
    }
    
    // Если есть ограничение на редактируемые поля, фильтруем конфиг
    let configToUse = this.config;
    if (this.permissions.editableFields && item) {
      // Создаем ограниченный конфиг только с разрешенными полями
      configToUse = {
        ...this.config,
        fields: this.config.fields.filter(field => 
          this.permissions.editableFields.includes(field.name)
        )
      };
    }
    
    await ConfigModal.open(
      configToUse,
      item,
      (data) => {
        this.saveItem(item?.id, data);
      }
    );
  }

  saveItem(id, data) {
    if (!this.getDB) {
      console.error('[CfgList] DB функция не установлена');
      return;
    }

    const db = this.getDB();
    if (!db) {
      console.error('[CfgList] База данных недоступна');
      return;
    }
    
    // Добавляем фильтры если есть
    if (this.config.filters) {
      Object.assign(data, this.config.filters);
    }
    
    // Для продуктов и пресетов питания иконка и цвет берутся из группы
    if ((this.tableName === 'cfg_nutrition_products' || this.tableName === 'cfg_nutrition_presets') && data.group) {
      data.icon = getGroupIcon(data.group);
      data.color = getGroupColor(data.group);
    }
    
    // Для ритуалов устанавливаем active = 1 по умолчанию, если не указано
    if ((this.tableName === 'cfg_rituals_morning' || this.tableName === 'cfg_rituals_evening') && data.active === undefined) {
      data.active = 1;
    }
    
    // Для категорий расходов switch "Импульсивная покупка" хранится в поле type.
    if (this.tableName === 'cfg_expense_categories' && Object.prototype.hasOwnProperty.call(data, 'type')) {
      data.type = Number(data.type) === 1 || data.type === true ? 'compulsive' : '';
    }
    
    // Примечание: цвет для ритуалов (rituals-morning и rituals-evening) не сохраняется в БД,
    // так как в таблицах нет поля color. Цвет используется только для отображения через CfgColorPalette.
    // Если нужно сохранять цвет, его нужно добавить в схему таблиц.
    
    // Преобразуем schedule объект в JSON строку если нужно
    if (data.schedule && typeof data.schedule === 'object') {
      data.schedule = JSON.stringify(data.schedule);
    }
    
    try {
      if (id) {
        db.update(this.tableName, id, data);
      } else {
        db.create(this.tableName, data);
      }
      
      // Отправляем событие об изменении конфигурации для ритуалов
      if (this.tableName === 'cfg_rituals_morning' || this.tableName === 'cfg_rituals_evening') {
        eventBus.emit('ritualChanged', {
          action: id ? 'update' : 'create',
          data: {
            ritualId: id || data.id,
            ritualType: this.tableName === 'cfg_rituals_morning' ? 'morning' : 'evening'
          }
        });
      }

      // Отправляем событие об изменении продуктов/пресетов питания
      if (this.tableName === 'cfg_nutrition_products' || this.tableName === 'cfg_nutrition_presets') {
        eventBus.emit('nutritionCfgChanged', {
          action: id ? 'update' : 'create',
          data: {
            id: id || data.id,
            tableName: this.tableName
          }
        });
      }

      // Отмечаем изменения для отслеживания
      settingsChangeTracker.markChanged();
    } catch (error) {
      console.error('[CfgList] Ошибка при сохранении:', error);
      throw error;
    }
    
    // Перезагружаем список
    this.init();
  }

  async deleteItem(id) {
    // Проверка ограничений для категорий задач (мин 1, макс 3)
    const isTaskCategory = this.configKey && ['tasks-rituals', 'tasks-time', 'tasks-body', 'tasks-deps'].includes(this.configKey);
    
    if (isTaskCategory && this.items.length <= 1) {
      const { customAlert } = await import('../../utils/customDialogs.js');
      await customAlert('Минимальное количество задач в категории: 1. Нельзя удалить последнюю задачу.');
      return;
    }
    
    const confirmed = await confirmWithSound('Удалить этот элемент?');
    if (!confirmed) {
      return;
    }

    if (!this.getDB) {
      console.error('[CfgList] DB функция не установлена');
      return;
    }

    // Проверяем, что ID не пустой
    if (!id) {
      console.error('[CfgList] Нельзя удалить элемент без ID');
      alert('Ошибка: элемент не имеет ID. Возможно, он был создан некорректно.');
      return;
    }

    const db = this.getDB();
    try {
      db.delete(this.tableName, id);
      console.log(`[CfgList] Элемент ${id} удален из ${this.tableName}`);
      
      // Отправляем событие об удалении для ритуалов
      if (this.tableName === 'cfg_rituals_morning' || this.tableName === 'cfg_rituals_evening') {
        eventBus.emit('ritualChanged', {
          action: 'delete',
          data: {
            ritualId: id,
            ritualType: this.tableName === 'cfg_rituals_morning' ? 'morning' : 'evening'
          }
        });
      }

      // Отправляем событие об удалении продуктов/пресетов питания
      if (this.tableName === 'cfg_nutrition_products' || this.tableName === 'cfg_nutrition_presets') {
        eventBus.emit('nutritionCfgChanged', {
          action: 'delete',
          data: {
            id: id,
            tableName: this.tableName
          }
        });
      }

      // Отмечаем изменения для отслеживания
      settingsChangeTracker.markChanged();
    } catch (error) {
      console.error('[CfgList] Ошибка при удалении:', error);
      alert(`Ошибка при удалении: ${error.message}`);
      return;
    }
    
    // Перезагружаем список
    this.init();
  }
}

export default CfgList;

