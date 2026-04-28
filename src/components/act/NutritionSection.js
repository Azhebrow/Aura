import Section from '../layout/Section.js';
import Button from '../form/Button.js';
import { EmptyState } from '../display/index.js';
import { iconLoader, colorConversion, confirmWithSound } from '../../utils/index.js';
import eventBus from '../../system/core/EventBus.js';
import NutritionEntryModal from './NutritionEntryModal.js';
import { getGroupColor, getGroupIcon } from '../../design-system/tokens/NutritionGroupPalette.js';
import { getMacroColor } from '../../design-system/tokens/UnifiedColorPalette.js';

const { applyIconBackground, hslToHex } = colorConversion;

class NutritionSection {
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
      console.error('[NutritionSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[NutritionSection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.entries = [];
    this.section = null;
    this.unsubscribe = null;
    this.eventUnsubscribes = [];
    this.isRendering = false;
    this.settings = null;
  }

  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  async init() {
    // Загружаем настройки приложения
    if (this.db) {
      this.settings = this.db.getAppSettings();
    }

    // Создаем кнопку добавления (будет в списке)
    this.addButton = new Button({
      iconName: 'plus',
      text: 'Добавить',
      onClick: async () => {
        const selectedDateState = window.selectedDateState;
        const currentDate = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
        await NutritionEntryModal.open(currentDate, async (entryData, entryId) => {
          if (entryId) {
            await this.updateEntry(entryId, entryData);
          } else {
            await this.addEntry(entryData);
          }
        });
      }
    });
    await this.addButton.init();
    this.addButton.element.classList.add('nutrition-add-btn');
    
    // Создаем секцию без кнопки в заголовке
    this.section = new Section({ 
      title: 'Питание'
    });
    this.element = this.section.render();
    
    // Подписываемся на изменения выбранной даты
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.date = dateString;
        await this.loadEntries();
        await this.render();
      });
    }
    
    // Загружаем записи
    await this.loadEntries();
    
    // Создаем контент
    await this.render();

    // Подписываемся на события обновления записей
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Подписка на добавление записей
    const unsubscribeEntryAdded = eventBus.on('nutritionEntryAdded', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      await this.loadEntries();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribeEntryAdded);

    // Подписка на удаление записей
    const unsubscribeEntryDeleted = eventBus.on('nutritionEntryDeleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      await this.loadEntries();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribeEntryDeleted);

    // Подписка на изменение продуктов/пресетов (для реактивности при переименовании)
    const unsubscribeCfgChanged = eventBus.on('nutritionCfgChanged', async () => {
      await this.loadEntries();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribeCfgChanged);

    // Подписка на обновление записей
    const unsubscribeEntryUpdated = eventBus.on('nutritionEntryUpdated', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      await this.loadEntries();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribeEntryUpdated);
  }

  async loadEntries() {
    try {
      if (!this.db) {
        console.warn('[NutritionSection] База данных недоступна для загрузки записей');
        this.entries = [];
        return;
      }
      
      const selectedDateState = window.selectedDateState;
      const dateToLoad = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      
      this.entries = this.db.getNutritionEntries(dateToLoad);
      this.date = dateToLoad;
    } catch (error) {
      console.error('[NutritionSection] Ошибка загрузки записей:', error);
      this.entries = [];
    }
  }

  calculateDailyNutrition() {
    if (!this.db || !this.entries) {
      return { calories: 0, proteins: 0, fats: 0, carbs: 0 };
    }
    
    return this.entries.reduce((total, entry) => {
      total.calories += entry.total_calories || 0;
      total.proteins += entry.total_proteins || 0;
      total.fats += entry.total_fats || 0;
      total.carbs += entry.total_carbs || 0;
      return total;
    }, { calories: 0, proteins: 0, fats: 0, carbs: 0 });
  }

  normalizeEntryData(entryData) {
    const isProduct = Boolean(entryData.product_id);
    const isPreset = Boolean(entryData.preset_id);
    if (isProduct === isPreset) {
      throw new Error('Запись питания должна ссылаться либо на продукт, либо на блюдо');
    }

    return {
      product_id: isProduct ? entryData.product_id : null,
      preset_id: isPreset ? entryData.preset_id : null,
      portions: entryData.portions,
      total_calories: entryData.total_calories,
      total_proteins: entryData.total_proteins,
      total_fats: entryData.total_fats,
      total_carbs: entryData.total_carbs
    };
  }

  calculateProductNutrition(product, portions) {
    const totalWeight = (product.portion_weight || 0) * portions;
    const multiplier = totalWeight / 100;
    return {
      total_calories: (product.calories_per_100g || 0) * multiplier,
      total_proteins: (product.proteins_per_100g || 0) * multiplier,
      total_fats: (product.fats_per_100g || 0) * multiplier,
      total_carbs: (product.carbs_per_100g || 0) * multiplier
    };
  }

  buildNutritionEntry(date, entryData, idSuffix = '') {
    const id = `nutrition_${date.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${idSuffix}`;
    return {
      id,
      date,
      ...entryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async addEntry(entryData) {
    try {
      const selectedDateState = window.selectedDateState;
      const currentDate = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;

      const normalizedData = this.normalizeEntryData(entryData);
      const entry = this.buildNutritionEntry(currentDate, normalizedData);
      this.db.addNutritionEntry(entry);

      setTimeout(() => {
        eventBus.emit('nutritionEntryAdded', {
          action: 'create',
          data: entry,
          affectedIds: [entry.id],
          date: entry.date
        });
      }, 0);

      return entry;
    } catch (error) {
      console.error('[NutritionSection] Ошибка добавления записи:', error);
      throw error;
    }
  }

  async updateEntry(entryId, entryData) {
    try {
      const entry = this.entries.find(e => e.id === entryId);
      if (!entry) {
        throw new Error('Запись не найдена');
      }
      const updateData = this.normalizeEntryData(entryData);
      this.db.updateNutritionEntry(entryId, updateData);
      const updatedEntry = { ...entry, ...updateData };
      setTimeout(() => {
        eventBus.emit('nutritionEntryUpdated', {
          action: 'update',
          data: updatedEntry,
          affectedIds: [entryId],
          date: entry.date
        });
      }, 0);
    } catch (error) {
      console.error('[NutritionSection] Ошибка обновления записи:', error);
      throw error;
    }
  }

  async deleteEntry(entryId) {
    try {
      const entry = this.entries.find(e => e.id === entryId);
      if (!entry) {
        throw new Error('Запись не найдена');
      }

      const confirmed = await confirmWithSound('Удалить эту запись?');
      if (!confirmed) {
        return;
      }

      this.db.deleteNutritionEntry(entryId);
      
      setTimeout(() => {
        eventBus.emit('nutritionEntryDeleted', {
          action: 'delete',
          data: entry,
          affectedIds: [entryId],
          date: entry.date
        });
      }, 0);
    } catch (error) {
      console.error('[NutritionSection] Ошибка удаления записи:', error);
      throw error;
    }
  }

  async render() {
    if (this.isRendering) {
      return;
    }
    
    this.isRendering = true;
    
    try {
      // Находим или создаем контейнер списка (как в TransactionsSection)
      let list = this.element.querySelector('.act-list');
      let listItems = list ? list.querySelector('.act-list-items') : null;
      
      if (!list) {
        list = document.createElement('div');
        list.className = 'act-list';
        this.element.appendChild(list);
      }
      
      const existingSummary = list.querySelector(':scope > .nutrition-summary-card');
      if (existingSummary) existingSummary.remove();
      
      if (!listItems) {
        listItems = document.createElement('div');
        listItems.className = 'act-list-items';
        list.appendChild(listItems);
      } else {
        listItems.innerHTML = '';
      }
      
      const summaryCard = await this.createProgressCard();
      list.insertBefore(summaryCard, listItems);
      
      if (this.entries.length === 0) {
        const emptyState = new EmptyState({ type: 'nutrition' });
        await emptyState.init();
        listItems.appendChild(emptyState.render());
      } else {
        for (const entry of this.entries) {
          const card = await this.createEntryCard(entry);
          listItems.appendChild(card);
        }
      }
    } finally {
      this.isRendering = false;
    }
  }

  // Получение целевых значений БЖУ в граммах
  calculateMacrosTargets() {
    return {
      proteins: this.settings?.nutrition_target_proteins || 0,
      fats: this.settings?.nutrition_target_fats || 0,
      carbs: this.settings?.nutrition_target_carbs || 0
    };
  }

  async createProgressCard() {
    const card = document.createElement('div');
    card.className = 'nutrition-summary-card';
    
    const daily = this.calculateDailyNutrition();
    const targetCalories = this.settings?.nutrition_target_calories || 2000;
    const macrosTargets = this.calculateMacrosTargets();
    
    // Калории отдельно на всю ширину
    const caloriesSection = await this.createMacroSection(
      'flame',
      'Калории',
      Math.round(daily.calories),
      targetCalories,
      'ккал',
      targetCalories > 0 ? Math.min(100, (daily.calories / targetCalories) * 100) : 0,
      getMacroColor('calories'),
      true // isCalories
    );
    card.appendChild(caloriesSection);
    
    // БЖУ в одну строку
    const macrosGrid = document.createElement('div');
    macrosGrid.className = 'nutrition-macros-grid';
    
    const macros = [
      { icon: 'activity', label: 'Белки', value: Math.round(daily.proteins), target: macrosTargets.proteins, color: getMacroColor('proteins') },
      { icon: 'droplet', label: 'Жиры', value: Math.round(daily.fats), target: macrosTargets.fats, color: getMacroColor('fats') },
      { icon: 'wheat', label: 'Углеводы', value: Math.round(daily.carbs), target: macrosTargets.carbs, color: getMacroColor('carbs') }
    ];
    
    for (const macro of macros) {
      const macroSection = await this.createMacroSection(
        macro.icon,
        macro.label,
        macro.value,
        macro.target,
        'г',
        macro.target > 0 ? Math.min(100, (macro.value / macro.target) * 100) : 0,
        macro.color,
        false // isCalories
      );
      macrosGrid.appendChild(macroSection);
    }
    
    card.appendChild(macrosGrid);
    
    // Кнопка добавления внизу на всю ширину
    const addButtonWrapper = document.createElement('div');
    addButtonWrapper.className = 'nutrition-add-button-wrapper';
    addButtonWrapper.appendChild(this.addButton.element);
    card.appendChild(addButtonWrapper);
    
    return card;
  }

  async createMacroSection(iconName, label, current, target, unit, percent, color, isCalories = false) {
    const section = document.createElement('div');
    section.className = 'nutrition-summary-macro-section' + (isCalories ? ' nutrition-calories-section' : '');
    
    const header = document.createElement('div');
    header.className = 'nutrition-summary-macro-header';
    
    const leftPart = document.createElement('div');
    leftPart.className = 'nutrition-summary-macro-left';
    
    try {
      const iconContent = await iconLoader.loadIcon(iconName);
      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'act-card-icon has-color nutrition-macro-icon';
      const colorHex = color.toLowerCase().startsWith('hsl') ? hslToHex(color) : color;
      applyIconBackground(iconWrapper, colorHex);
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      leftPart.appendChild(iconWrapper);
    } catch (e) {
      console.warn(`[NutritionSection] Не удалось загрузить иконку ${iconName}:`, e);
    }
    
    const textPart = document.createElement('div');
    textPart.className = 'nutrition-summary-macro-text';
    if (label) {
      const labelEl = document.createElement('span');
      labelEl.className = 'nutrition-summary-macro-label';
      labelEl.textContent = label;
      textPart.appendChild(labelEl);
    }
    const valueEl = document.createElement('span');
    valueEl.className = 'nutrition-summary-value';
    valueEl.textContent = `${current}/${target} ${unit}`;
    textPart.appendChild(valueEl);
    leftPart.appendChild(textPart);
    header.appendChild(leftPart);
    
    const percentEl = document.createElement('span');
    percentEl.className = 'nutrition-summary-percent';
    percentEl.textContent = target > 0 ? `${Math.round(percent)}%` : '—';
    header.appendChild(percentEl);
    
    section.appendChild(header);
    
    const progressBar = document.createElement('div');
    progressBar.className = 'nutrition-summary-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'nutrition-summary-progress-fill';
    progressFill.style.width = `${percent}%`;
    progressFill.style.backgroundColor = color;
    progressBar.appendChild(progressFill);
    section.appendChild(progressBar);
    
    return section;
  }

  createMacroCell(value, unit, prefix = '') {
    const cell = document.createElement('div');
    cell.className = 'nutrition-entry-cell';
    if (prefix) {
      const prefixEl = document.createElement('span');
      prefixEl.className = 'nutrition-entry-prefix';
      prefixEl.textContent = prefix + '\u00A0';
      cell.appendChild(prefixEl);
    }
    const valueEl = document.createElement('span');
    valueEl.className = 'nutrition-entry-value';
    valueEl.textContent = value;
    valueEl.appendChild(document.createTextNode('\u00A0'));
    const unitEl = document.createElement('span');
    unitEl.className = 'nutrition-entry-unit';
    unitEl.textContent = unit.trim();
    valueEl.appendChild(unitEl);
    cell.appendChild(valueEl);
    return cell;
  }

  async createEntryCard(entry) {
    const card = document.createElement('div');
    card.className = 'act-card';
    card.dataset.entryId = entry.id;
    
    // Получаем данные продукта/пресета
    let product = null;
    let preset = null;
    let icon = null;
    let color = null;
    let title = '';
    
    if (entry.product_id) {
      product = this.db.getById('cfg_nutrition_products', entry.product_id);
      if (product) {
        icon = product.group ? getGroupIcon(product.group) : product.icon;
        if (product.group) {
          color = getGroupColor(product.group);
        } else {
          color = product.color || getGroupColor('dishes');
        }
        title = product.title;
      }
    } else if (entry.preset_id) {
      preset = this.db.getById('cfg_nutrition_presets', entry.preset_id);
      if (preset) {
        icon = getGroupIcon('dishes');
        color = getGroupColor('dishes');
        title = preset.title;
      }
    }
    
    // Иконка слева (цветная, как в транзакциях)
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color';
    
    const colorForBg = color && color.toLowerCase().startsWith('hsl') 
      ? hslToHex(color)
      : color;
    
    if (colorForBg) {
      applyIconBackground(iconWrapper, colorForBg);
    }
    
    if (icon) {
      try {
        const iconContent = await iconLoader.loadIcon(icon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    // Используем grid для фиксированных секций
    card.className = 'act-card nutrition-entry-card';
    
    // Иконка (фиксированная секция)
    card.appendChild(iconWrapper);
    
    // Правая контентная часть: сверху название, снизу метрики
    const contentWrap = document.createElement('div');
    contentWrap.className = 'nutrition-entry-content';

    const titleWrapEl = document.createElement('div');
    titleWrapEl.className = 'nutrition-entry-title-wrap';
    const titleEl = document.createElement('div');
    titleEl.className = 'nutrition-entry-title';
    titleEl.textContent = title || 'Продукт';
    titleWrapEl.appendChild(titleEl);
    contentWrap.appendChild(titleWrapEl);

    // Нижняя строка карточки: граммы/порции + БЖУ + ккал
    const detailsRow = document.createElement('div');
    detailsRow.className = 'nutrition-entry-details-row';

    const gramsEl = document.createElement('div');
    gramsEl.className = 'nutrition-entry-cell nutrition-entry-grams';
    const totalGrams = product && entry.portions != null ? entry.portions * product.portion_weight : null;
    if (totalGrams != null) {
      const prefixG = document.createElement('span');
      prefixG.className = 'nutrition-entry-prefix';
      prefixG.textContent = 'Г ';
      gramsEl.appendChild(prefixG);
      const gramsValueEl = document.createElement('span');
      gramsValueEl.className = 'nutrition-entry-grams-value';
      gramsValueEl.textContent = `${Math.round(totalGrams)} г`;
      gramsEl.appendChild(gramsValueEl);
    } else if (preset && entry.portions != null) {
      const prefixP = document.createElement('span');
      prefixP.className = 'nutrition-entry-prefix';
      prefixP.textContent = 'П ';
      gramsEl.appendChild(prefixP);
      const portionsValueEl = document.createElement('span');
      portionsValueEl.className = 'nutrition-entry-grams-value';
      portionsValueEl.textContent = `${Number(entry.portions).toFixed(1)} порц.`;
      gramsEl.appendChild(portionsValueEl);
    }
    detailsRow.appendChild(gramsEl);

    const macrosWrap = document.createElement('div');
    macrosWrap.className = 'nutrition-entry-macros-wrap';
    
    const proteinsSection = this.createMacroCell(Math.round(entry.total_proteins), 'г', 'Б');
    proteinsSection.className = 'nutrition-entry-cell nutrition-entry-proteins';
    macrosWrap.appendChild(proteinsSection);
    
    const fatsSection = this.createMacroCell(Math.round(entry.total_fats), 'г', 'Ж');
    fatsSection.className = 'nutrition-entry-cell nutrition-entry-fats';
    macrosWrap.appendChild(fatsSection);
    
    const carbsSection = this.createMacroCell(Math.round(entry.total_carbs), 'г', 'У');
    carbsSection.className = 'nutrition-entry-cell nutrition-entry-carbs';
    macrosWrap.appendChild(carbsSection);
    
    const caloriesSection = this.createMacroCell(Math.round(entry.total_calories), '', 'ккал');
    caloriesSection.className = 'nutrition-entry-cell nutrition-entry-calories';
    macrosWrap.appendChild(caloriesSection);
    
    detailsRow.appendChild(macrosWrap);
    contentWrap.appendChild(detailsRow);
    card.appendChild(contentWrap);
    
    // Действия (кнопка удаления) - фиксированная секция
    const actions = document.createElement('div');
    actions.className = 'act-card-actions nutrition-entry-actions';
    
    const deleteBtn = new Button({
      iconName: 'trash-2',
      onClick: (e) => {
        e.stopPropagation();
        this.deleteEntry(entry.id);
      }
    });
    await deleteBtn.init();
    deleteBtn.element.className = 'btn btn-icon';
    actions.appendChild(deleteBtn.element);
    
    card.appendChild(actions);
    
    // Клик по карточке открывает редактирование (кроме кнопки удаления)
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.nutrition-entry-actions')) return;
      const selectedDateState = window.selectedDateState;
      const currentDate = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      await NutritionEntryModal.open(currentDate, async (entryData, entryId) => {
        if (entryId) {
          await this.updateEntry(entryId, entryData);
        } else {
          await this.addEntry(entryData);
        }
      }, entry);
    });
    
    return card;
  }
}

export default NutritionSection;
