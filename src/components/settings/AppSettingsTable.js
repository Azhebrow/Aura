import Input from '../form/Input.js';
import Select from '../form/Select.js';

class AppSettingsTable {
  constructor() {
    this.element = null;
    this.db = null;
    this.settings = null;
  }

  async init() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[AppSettingsTable] База данных недоступна');
      return;
    }
    
    this.db = getDB();
    if (!this.db) {
      console.error('[AppSettingsTable] База данных не инициализирована');
      return;
    }

    this.settings = this.db.getAppSettings();
    if (!this.settings) {
      this.settings = this.createDefaultSettings();
      this.db.saveAppSettings(this.settings);
    }
  }

  createDefaultSettings() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;

    return {
      currency: 'RUB',
      points_start_date: defaultDate,
      points_open_hours: 48,
      created_at: new Date().toISOString()
    };
  }

  async render() {
    if (!this.element) {
      this.element = document.createElement('table');
      this.element.className = 'cfg-form-table';
      
      const tbody = document.createElement('tbody');
      
      const currencyRow = await this.createCurrencyRow();
      tbody.appendChild(currencyRow);
      
      const pointsStartDateRow = await this.createPointsStartDateRow();
      tbody.appendChild(pointsStartDateRow);
      
      const pointsOpenHoursRow = await this.createPointsOpenHoursRow();
      tbody.appendChild(pointsOpenHoursRow);
      
      this.element.appendChild(tbody);
    }
    
    return this.element;
  }

  async createCurrencyRow() {
    const row = document.createElement('tr');
    row.className = 'cfg-form-row';
    
    const labelCell = document.createElement('td');
    labelCell.className = 'cfg-form-label';
    labelCell.textContent = 'Валюта';
    row.appendChild(labelCell);
    
    const controlCell = document.createElement('td');
    controlCell.className = 'cfg-form-control';
    
    const currencyOptions = [
      { value: 'RUB', text: 'Российский рубль (₽)' },
      { value: 'USD', text: 'Доллар США ($)' },
      { value: 'EUR', text: 'Евро (€)' },
      { value: 'GBP', text: 'Фунт стерлингов (£)' },
      { value: 'JPY', text: 'Японская иена (¥)' },
      { value: 'CNY', text: 'Китайский юань (¥)' },
      { value: 'KZT', text: 'Казахстанский тенге (₸)' },
      { value: 'BYN', text: 'Белорусский рубль (Br)' },
      { value: 'PLN', text: 'Польский злотый (zł)' }
    ];
    
    const select = new Select({
      items: currencyOptions
    });
    
    const selectElement = await select.render();
    
    const currentCurrency = this.settings.currency || 'RUB';
    if (select.customSelect) {
      const selectedIndex = currencyOptions.findIndex(opt => opt.value === currentCurrency);
      if (selectedIndex >= 0) {
        select.customSelect.selectOption(selectedIndex);
      }
      
      const originalSelectOption = select.customSelect.selectOption.bind(select.customSelect);
      select.customSelect.selectOption = (index) => {
        originalSelectOption(index);
        if (currencyOptions[index]) {
          this.settings.currency = currencyOptions[index].value;
          this.saveSettings();
        }
      };
    }
    
    controlCell.appendChild(selectElement);
    row.appendChild(controlCell);
    
    return row;
  }

  async createPointsStartDateRow() {
    const row = document.createElement('tr');
    row.className = 'cfg-form-row';
    
    const labelCell = document.createElement('td');
    labelCell.className = 'cfg-form-label';
    labelCell.textContent = 'Дата начала отчета очков';
    row.appendChild(labelCell);
    
    const controlCell = document.createElement('td');
    controlCell.className = 'cfg-form-control';
    
    let currentValue = this.settings.points_start_date;
    if (!currentValue && this.settings.created_at) {
      const date = new Date(this.settings.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      currentValue = `${year}-${month}-${day}`;
    }
    
    const input = new Input({
      type: 'date',
      value: currentValue || ''
    });
    const inputElement = input.render();
    
    inputElement.addEventListener('change', async (e) => {
      const oldValue = this.settings.points_start_date;
      this.settings.points_start_date = e.target.value || null;
      await this.saveSettings();
      
      // Отправляем событие об изменении даты начала отчета
      if (oldValue !== this.settings.points_start_date) {
        window.dispatchEvent(new CustomEvent('pointsStartDateChanged', {
          detail: { 
            oldValue: oldValue,
            newValue: this.settings.points_start_date 
          }
        }));
      }
    });
    
    controlCell.appendChild(inputElement);
    row.appendChild(controlCell);
    
    return row;
  }

  async createPointsOpenHoursRow() {
    const row = document.createElement('tr');
    row.className = 'cfg-form-row';
    
    const labelCell = document.createElement('td');
    labelCell.className = 'cfg-form-label';
    labelCell.textContent = 'Открытые часы для редактирования';
    row.appendChild(labelCell);
    
    const controlCell = document.createElement('td');
    controlCell.className = 'cfg-form-control';
    
    const input = new Input({
      type: 'number',
      value: this.settings.points_open_hours || 48,
      min: 1,
      max: 168
    });
    const inputElement = input.render();
    
    inputElement.addEventListener('change', async (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 1 && value <= 168) {
        this.settings.points_open_hours = value;
        await this.saveSettings();
      }
    });
    
    controlCell.appendChild(inputElement);
    row.appendChild(controlCell);
    
    return row;
  }

  async saveSettings() {
    try {
      this.db.saveAppSettings(this.settings);
    } catch (e) {
      console.error('[AppSettingsTable] Ошибка сохранения настроек:', e);
    }
  }
}

export default AppSettingsTable;
