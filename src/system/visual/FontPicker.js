import Select from '../../components/form/Select.js';
import { STORAGE_KEYS } from '../../config/index.js';
import { APP_FONT_CHOICES } from '../../config/fontFamilies.js';

class FontPicker {
  constructor() {
    this.element = null;
    this.fonts = APP_FONT_CHOICES;
    this.select = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'font-picker';

    // Загружаем сохраненный шрифт из localStorage
    const savedFont = localStorage.getItem(STORAGE_KEYS.FONT);
    const currentFont = savedFont || 'Philosopher';

    // Создаем Select компонент
    // Определяем индекс текущего шрифта для установки selected
    const fontIndex = this.fonts.findIndex(f => f.value === currentFont);
    const defaultIndex = fontIndex >= 0 ? fontIndex : 0;
    
    const selectItems = this.fonts.map((font, index) => ({
      value: font.value,
      text: font.text,
      selected: index === defaultIndex,
      fontFamily: font.value // Добавляем имя шрифта для стилизации
    }));

    this.select = new Select({ items: selectItems });
    
    // Устанавливаем текущий шрифт ДО инициализации CustomSelect
    // Select.init() создает нативный select, но CustomSelect инициализируется в render()
    const selectNative = this.select.element.querySelector('select');
    if (selectNative && defaultIndex >= 0) {
      // Убеждаемся, что selectedIndex установлен правильно
      selectNative.selectedIndex = defaultIndex;
      selectNative.value = currentFont;
      // Устанавливаем selected атрибут на нужной опции (CustomSelect проверяет option.selected)
      // Также добавляем data-font-family для стилизации
      const options = selectNative.options;
      for (let i = 0; i < options.length; i++) {
        options[i].selected = (i === defaultIndex);
        if (this.fonts[i]) {
          options[i].dataset.fontFamily = this.fonts[i].value;
        }
      }
    }
    
    const selectElement = await this.select.render();
    this.element.appendChild(selectElement);

    // Добавляем обработчик изменения
    this.setupEventListeners();
    
    this.initialized = true;
  }

  setupEventListeners() {
    const selectNative = this.element.querySelector('select');
    if (selectNative) {
      selectNative.addEventListener('change', (e) => {
        this.selectFont(e.target.value);
      });
    }
  }


  selectFont(fontName) {
    // Сохраняем в localStorage
    localStorage.setItem(STORAGE_KEYS.FONT, fontName);
    
    // Применяем шрифт через CSS переменную
    document.documentElement.style.setProperty('--font-family', `'${fontName}', sans-serif`);
    
    // Обновляем шрифт в триггере через CustomSelect
    const customSelect = this.select?.customSelect;
    if (customSelect && customSelect.trigger) {
      const triggerText = customSelect.trigger.querySelector('.custom-select-trigger-text');
      if (triggerText) {
        triggerText.style.fontFamily = `'${fontName}', sans-serif`;
      }
    }
    
    console.log(`Шрифт изменен на: ${fontName}`);
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default FontPicker;
