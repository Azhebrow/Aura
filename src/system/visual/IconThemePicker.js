import RadioButton from '../../components/form/RadioButton.js';
import { iconLoader } from '../../utils/index.js';
import { hexToRgba } from '../../utils/colorConversion.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';

/**
 * Компонент для выбора темы иконок
 * Показывает маленький пример иконки inline с выбором темы
 */
class IconThemePicker {
  constructor() {
    this.element = null;
    this.currentTheme = 'minimal';
    this.initialized = false;
    this.db = null;
    this.previewIconWrapper = null;
    this.iconThemes = null;
    this.accentColorObserver = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Получаем доступ к базе данных
    const getDB = window.getDB;
    if (getDB) {
      this.db = getDB();
    }

    // Получаем текущую тему
    this.currentTheme = this.getCurrentTheme();

    // Загружаем иконку для превью
    const previewIcon = await iconLoader.loadIcon('star');

    // Определяем темы иконок - только минималистичная и градиент
    this.iconThemes = [
      {
        value: 'minimal',
        text: 'Минималистичная',
        opacity: 0.15,
        border: '1px solid rgba(0, 0, 0, 0.05)',
        shadow: 'none',
        borderRadius: 'var(--radius)',
        scale: 1
      },
      {
        value: 'gradient',
        text: 'Градиент',
        opacity: 0.25,
        border: 'none',
        shadow: 'none',
        borderRadius: 'var(--radius)',
        gradient: true,
        scale: 1
      }
    ];

    this.element = document.createElement('div');
    this.element.className = 'icon-theme-picker';

    // Контейнер с примером и выбором темы в одну строку
    const container = document.createElement('div');
    container.className = 'icon-theme-picker-container';

    // Маленький пример иконки
    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'icon-theme-preview-wrapper';

    this.previewIconWrapper = document.createElement('span');
    this.previewIconWrapper.className = 'act-card-icon has-color icon-theme-preview-icon';
    
    // Получаем акцентный цвет для превью
    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
    };
    const accentColor = getAccentColor();

    // Применяем текущую тему к превью
    this.updatePreview(this.currentTheme, accentColor);

    // Добавляем SVG иконку
    this.previewIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${previewIcon}</svg>`;
    
    previewWrapper.appendChild(this.previewIconWrapper);
    container.appendChild(previewWrapper);

    // Создаем RadioButton для выбора темы
    const radioButton = new RadioButton({
      name: 'icon-theme',
      value: this.currentTheme,
      items: this.iconThemes.map(theme => ({
        value: theme.value,
        text: theme.text
      }))
    });

    const radioContainer = document.createElement('div');
    radioContainer.className = 'icon-theme-radio-container';
    radioContainer.appendChild(radioButton.render());
    container.appendChild(radioContainer);

    this.element.appendChild(container);

    // Применяем тему сразу при инициализации
    this.applyThemeToDocument(this.currentTheme);

    // Добавляем обработчик изменения
    const radioInputs = this.element.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.switchTheme(e.target.value);
        }
      });
    });

    // Отслеживаем изменение акцентного цвета для обновления превью
    this.setupAccentColorObserver();

    this.initialized = true;
  }

  setupAccentColorObserver() {
    // Отслеживаем изменение CSS переменной --color-accent
    const observer = new MutationObserver(() => {
      if (this.previewIconWrapper) {
        const getAccentColor = () => {
          const style = getComputedStyle(document.documentElement);
          return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
        };
        const accentColor = getAccentColor();
        this.updatePreview(this.currentTheme, accentColor);
      }
    });

    // Наблюдаем за изменениями в documentElement
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-theme'],
      subtree: false
    });

    // Также проверяем периодически (на случай, если цвет меняется не через атрибуты)
    const checkInterval = setInterval(() => {
      if (this.previewIconWrapper) {
        const getAccentColor = () => {
          const style = getComputedStyle(document.documentElement);
          return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
        };
        const currentAccent = getAccentColor();
        const previewAccent = this.previewIconWrapper.style.getPropertyValue('--icon-color');
        if (currentAccent !== previewAccent) {
          this.updatePreview(this.currentTheme, currentAccent);
        }
      }
    }, 500);

    // Сохраняем ссылку для очистки при необходимости
    this.accentColorObserver = { observer, interval: checkInterval };
  }

  updatePreview(themeValue, accentColor) {
    if (!this.previewIconWrapper || !this.iconThemes) return;

    const theme = this.iconThemes.find(t => t.value === themeValue) || this.iconThemes[0];

    // Применяем стили темы к превью
    if (theme.gradient) {
      this.previewIconWrapper.style.backgroundImage = `linear-gradient(135deg, ${hexToRgba(accentColor, theme.opacity)}, ${hexToRgba(accentColor, theme.opacity * 0.6)})`;
      this.previewIconWrapper.style.backgroundColor = 'transparent';
    } else {
      this.previewIconWrapper.style.backgroundImage = 'none';
      this.previewIconWrapper.style.backgroundColor = hexToRgba(accentColor, theme.opacity);
    }
    
    this.previewIconWrapper.style.border = theme.border;
    this.previewIconWrapper.style.boxShadow = theme.shadow;
    this.previewIconWrapper.style.borderRadius = theme.borderRadius;
    this.previewIconWrapper.style.transform = `scale(${theme.scale})`;
    this.previewIconWrapper.style.setProperty('--icon-color', accentColor);
  }

  getCurrentTheme() {
    const validThemes = ['minimal', 'gradient'];
    
    // Проверяем настройки приложения
    if (this.db) {
      try {
        const settings = this.db.getAppSettings();
        if (settings && settings.icon_theme && validThemes.includes(settings.icon_theme)) {
          return settings.icon_theme;
        }
      } catch (e) {
        console.warn('[IconThemePicker] Ошибка получения настроек:', e);
      }
    }

    // Проверяем localStorage
    const savedTheme = localStorage.getItem('aura-icon-theme');
    if (savedTheme && validThemes.includes(savedTheme)) {
      return savedTheme;
    }

    // По умолчанию минималистичная тема
    return 'minimal';
  }

  switchTheme(theme) {
    this.currentTheme = theme;
    this.applyThemeToDocument(theme);
    this.saveTheme(theme);
    
    // Получаем акцентный цвет для обновления превью
    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
    };
    const accentColor = getAccentColor();
    this.updatePreview(theme, accentColor);

    console.log(`Тема иконок изменена на: ${theme}`);
  }

  applyThemeToDocument(theme) {
    // Устанавливаем CSS переменную для темы иконок
    document.documentElement.setAttribute('data-icon-theme', theme);
    
    // Отправляем событие для обновления всех иконок
    window.dispatchEvent(new CustomEvent('iconThemeChanged', {
      detail: { theme }
    }));
  }

  async saveTheme(theme) {
    // Сохраняем в localStorage
    localStorage.setItem('aura-icon-theme', theme);

    // Сохраняем в настройки приложения
    if (this.db) {
      try {
        const settings = this.db.getAppSettings();
        if (settings) {
          settings.icon_theme = theme;
          this.db.saveAppSettings(settings);
          
          // Отмечаем изменения для отслеживания
          const { settingsChangeTracker } = await import('../services/index.js');
          settingsChangeTracker.markChanged();
        }
      } catch (e) {
        console.error('[IconThemePicker] Ошибка сохранения темы:', e);
      }
    }
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default IconThemePicker;
