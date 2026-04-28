import Section from '../../components/layout/Section.js';
import { Input, Select } from '../../components/form/index.js';
import InputSuffix from '../../composites/InputSuffix.js';

class NutritionSettingsPanel {
  constructor() {
    this.element = null;
    this.initialized = false;
    this.db = null;
    this.settings = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Инициализация базы данных для настроек приложения
    const getDB = window.getDB;
    if (getDB) {
      this.db = getDB();
      if (this.db) {
        this.settings = this.db.getAppSettings();
        if (!this.settings) {
          this.settings = this.createDefaultSettings();
          this.db.saveAppSettings(this.settings);
        }
      }
    }

    // Создаем главную секцию
    const section = new Section({ title: 'Цели питания' });
    const sectionElement = section.render();
    sectionElement.className += ' nutrition-settings-panel';

    const content = document.createElement('div');
    content.className = 'nutrition-settings-content';

    // Основные цели
    const goalsSection = await this.createGoalsSection();
    content.appendChild(goalsSection);

    // Схема БЖУ
    const macrosSection = await this.createMacrosSection();
    content.appendChild(macrosSection);

    sectionElement.appendChild(content);
    this.element = sectionElement;
    this.initialized = true;
  }

  async createGoalsSection() {
    const section = document.createElement('div');
    section.className = 'nutrition-goals-section';

    const title = document.createElement('h3');
    title.className = 'nutrition-section-title';
    title.textContent = 'Основные цели';
    section.appendChild(title);

    const goalsGrid = document.createElement('div');
    goalsGrid.className = 'nutrition-goals-grid';

    // Целевые калории
    const targetCaloriesCard = await this.createGoalCard(
      'Целевые калории',
      'Суточная норма калорий для достижения цели',
      await this.createCaloriesControl('nutrition_target_calories', 'ккал'),
      'flame'
    );
    goalsGrid.appendChild(targetCaloriesCard);

    section.appendChild(goalsGrid);
    return section;
  }

  async createGoalCard(title, description, control, iconName) {
    const card = document.createElement('div');
    card.className = 'nutrition-goal-card';

    // Иконка
    try {
      const { iconLoader } = await import('../../utils/index.js');
      const iconContent = await iconLoader.loadIcon(iconName);
      const iconElement = document.createElement('div');
      iconElement.className = 'nutrition-goal-icon';
      iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      card.appendChild(iconElement);
    } catch (e) {
      console.warn(`[NutritionSettingsPanel] Не удалось загрузить иконку ${iconName}:`, e);
    }

    // Контент
    const content = document.createElement('div');
    content.className = 'nutrition-goal-content';

    const titleElement = document.createElement('h4');
    titleElement.className = 'nutrition-goal-title';
    titleElement.textContent = title;
    content.appendChild(titleElement);

    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'nutrition-goal-description';
    descriptionElement.textContent = description;
    content.appendChild(descriptionElement);

    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'nutrition-goal-control';
    if (control instanceof HTMLElement) {
      controlWrapper.appendChild(control);
    }
    content.appendChild(controlWrapper);

    card.appendChild(content);
    return card;
  }

  async createMacrosSection() {
    const section = document.createElement('div');
    section.className = 'nutrition-macros-section';

    const title = document.createElement('h3');
    title.className = 'nutrition-section-title';
    title.textContent = 'Целевые значения БЖУ';
    section.appendChild(title);

    const description = document.createElement('p');
    description.className = 'nutrition-section-description';
    description.textContent = 'Укажите целевые значения белков, жиров и углеводов в граммах';
    section.appendChild(description);

    const macrosGrid = document.createElement('div');
    macrosGrid.className = 'nutrition-macros-grid';
    macrosGrid.style.display = 'grid';
    macrosGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    macrosGrid.style.gap = 'var(--space-md)';
    macrosGrid.style.marginTop = 'var(--space-md)';

    const currentProteins = this.settings?.nutrition_target_proteins || 0;
    const currentFats = this.settings?.nutrition_target_fats || 0;
    const currentCarbs = this.settings?.nutrition_target_carbs || 0;

    const proteinsCard = await this.createGoalCard(
      'Белки',
      'Целевое количество белков в граммах',
      await this.createMacrosControl('nutrition_target_proteins', 'г', currentProteins),
      'activity'
    );
    macrosGrid.appendChild(proteinsCard);

    const fatsCard = await this.createGoalCard(
      'Жиры',
      'Целевое количество жиров в граммах',
      await this.createMacrosControl('nutrition_target_fats', 'г', currentFats),
      'droplet'
    );
    macrosGrid.appendChild(fatsCard);

    const carbsCard = await this.createGoalCard(
      'Углеводы',
      'Целевое количество углеводов в граммах',
      await this.createMacrosControl('nutrition_target_carbs', 'г', currentCarbs),
      'wheat'
    );
    macrosGrid.appendChild(carbsCard);

    section.appendChild(macrosGrid);

    return section;
  }

  createDefaultSettings() {
    return {
      id: 'app_settings_1',
      nutrition_target_calories: 0,
      nutrition_target_proteins: 0,
      nutrition_target_fats: 0,
      nutrition_target_carbs: 0
    };
  }

  async createCategory(title, items) {
    const category = document.createElement('div');
    category.className = 'settings-category';

    const titleElement = document.createElement('h3');
    titleElement.className = 'settings-category-title';
    titleElement.textContent = title;
    category.appendChild(titleElement);

    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'settings-category-fields';

    for (const item of items) {
      const field = await this.createSettingField(item.label, item.control);
      fieldsContainer.appendChild(field);
    }

    category.appendChild(fieldsContainer);
    return category;
  }

  async createSettingField(label, control) {
    const field = document.createElement('div');
    field.className = 'settings-field';

    const labelElement = document.createElement('label');
    labelElement.className = 'settings-field-label';
    labelElement.textContent = label;
    field.appendChild(labelElement);

    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'settings-field-control';
    
    // Если control - это элемент, добавляем его напрямую
    if (control instanceof HTMLElement) {
      controlWrapper.appendChild(control);
    } else if (control && typeof control.then === 'function') {
      // Если это Promise, ждем его
      const resolvedControl = await control;
      if (resolvedControl instanceof HTMLElement) {
        controlWrapper.appendChild(resolvedControl);
      }
    } else if (control) {
      controlWrapper.appendChild(control);
    }

    field.appendChild(controlWrapper);
    return field;
  }

  async createCaloriesControl(settingKey, suffix) {
    const currentValue = this.settings ? this.settings[settingKey] : null;
    
    const inputSuffix = new InputSuffix({
      type: 'number',
      value: currentValue || '',
      placeholder: '0',
      suffix: suffix,
      min: 0,
      step: 1
    });
    
    const inputElement = inputSuffix.render();
    const input = inputSuffix.getInput();
    
    input.addEventListener('input', () => {
      const value = parseFloat(input.value) || null;
      if (this.settings && this.db) {
        this.settings[settingKey] = value;
        this.db.saveAppSettings(this.settings);
      }
    });
    
    return inputElement;
  }

  async createMacrosControl(settingKey, suffix, currentValue) {
    const inputSuffix = new InputSuffix({
      type: 'number',
      value: currentValue || '',
      placeholder: '0',
      suffix: suffix,
      min: 0,
      step: 1
    });
    
    const inputElement = inputSuffix.render();
    const input = inputSuffix.getInput();
    
    input.addEventListener('input', () => {
      const value = parseFloat(input.value) || null;
      if (this.settings && this.db) {
        this.settings[settingKey] = value;
        this.db.saveAppSettings(this.settings);
      }
    });
    
    return inputElement;
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default NutritionSettingsPanel;
