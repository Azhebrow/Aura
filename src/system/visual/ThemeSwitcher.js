import RadioButton from '../../components/form/RadioButton.js';
import { iconLoader } from '../../utils/index.js';
import ColorSystem from '../../design-system/tokens/ColorSystem.js';

class ThemeSwitcher {
  constructor() {
    this.element = null;
    // Определяем текущую тему из localStorage или атрибута data-theme
    this.currentTheme = this.getCurrentTheme();
    this.radioButton = null;
    this.initialized = false;
  }

  getCurrentTheme() {
    const validThemes = ['light', 'dim', 'dark'];
    // Сначала проверяем localStorage
    const savedTheme = localStorage.getItem('aura-theme');
    if (savedTheme && validThemes.includes(savedTheme)) {
      return savedTheme;
    }

    // Затем проверяем атрибут data-theme на html элементе
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme && validThemes.includes(htmlTheme)) {
      return htmlTheme;
    }

    // По умолчанию темная тема
    return 'dark';
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'theme-switcher';

    // Загружаем иконки из библиотеки
    const lightIcon = await iconLoader.loadIcon('sun');
    const dimIcon = await iconLoader.loadIcon('circle');
    const darkIcon = await iconLoader.loadIcon('moon');

    // Создаем RadioButton компонент с иконками и названиями
    this.radioButton = new RadioButton({
      name: 'theme',
      value: this.currentTheme, // Устанавливаем текущую тему
      items: [
        {
          value: 'light',
          text: 'Светлая',
          icon: lightIcon
        },
        {
          value: 'dim',
          text: 'Средняя',
          icon: dimIcon
        },
        {
          value: 'dark',
          text: 'Темная',
          icon: darkIcon
        }
      ]
    });

    // Добавляем элемент в DOM сначала
    this.element.appendChild(this.radioButton.render());

    // Применяем тему сразу при инициализации
    this.applyThemeToDocument(this.currentTheme);

    // Добавляем обработчик изменения
    this.setupEventListeners();
    
    this.initialized = true;
  }

  setupEventListeners() {
    // Добавляем обработчики на radio inputs
    const radioInputs = this.element.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.switchTheme(e.target.value);
        }
      });
    });
  }

  switchTheme(theme) {
    this.currentTheme = theme;
    this.applyThemeToDocument(theme);

    console.log(`Тема изменена на: ${theme}`);
  }

  applyThemeToDocument(theme) {
    // Используем централизованную систему для применения темы
    ColorSystem.setTheme(theme);
    console.log(`Тема применена: ${theme}`);
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default ThemeSwitcher;
