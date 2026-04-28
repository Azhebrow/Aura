/**
 * Компактная панель целей питания (калории, БЖУ) для вкладки «Продукты».
 * Одна строка: Калории | Белки | Жиры | Углеводы.
 */
import InputSuffix from '../../composites/InputSuffix.js';

class NutritionGoalsCompact {
  constructor() {
    this.element = null;
    this.initialized = false;
    this.db = null;
    this.settings = null;
  }

  async init() {
    if (this.initialized) return;

    const getDB = typeof window !== 'undefined' && window.getDB;
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

    const wrap = document.createElement('div');
    wrap.className = 'nutrition-goals-compact';

    const row = document.createElement('div');
    row.className = 'nutrition-goals-compact-row';

    const fields = [
      { key: 'nutrition_target_calories', label: 'Калории', suffix: 'ккал' },
      { key: 'nutrition_target_proteins', label: 'Белки', suffix: 'г' },
      { key: 'nutrition_target_fats', label: 'Жиры', suffix: 'г' },
      { key: 'nutrition_target_carbs', label: 'Углеводы', suffix: 'г' }
    ];

    for (const f of fields) {
      const value = this.settings ? this.settings[f.key] : null;
      const inputSuffix = new InputSuffix({
        type: 'number',
        value: value ?? '',
        placeholder: '0',
        suffix: f.suffix,
        min: 0,
        step: 1
      });
      const controlEl = inputSuffix.render();
      const input = inputSuffix.getInput();

      input.addEventListener('input', () => {
        const v = parseFloat(input.value) || null;
        if (this.settings && this.db) {
          this.settings[f.key] = v;
          this.db.saveAppSettings(this.settings);
        }
      });

      const cell = document.createElement('div');
      cell.className = 'nutrition-goals-compact-cell';
      const label = document.createElement('span');
      label.className = 'nutrition-goals-compact-label';
      label.textContent = f.label;
      cell.appendChild(label);
      cell.appendChild(controlEl);
      row.appendChild(cell);
    }

    wrap.appendChild(row);
    this.element = wrap;
    this.initialized = true;
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

  async render() {
    if (!this.initialized) await this.init();
    return this.element;
  }
}

export default NutritionGoalsCompact;
