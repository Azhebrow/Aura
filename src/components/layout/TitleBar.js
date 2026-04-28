import windowController from '../../system/core/WindowController.js';

/**
 * Компонент кастомной шапки приложения
 * Минималистичный дизайн с названием и кнопками управления окном
 */
class TitleBar {
  constructor(config = {}) {
    this.title = config.title || 'AURA';
    this.element = null;
    this.initialized = false;
    this.isMaximized = false;
  }

  async init() {
    if (this.initialized) {
      return this.element;
    }

    const container = document.createElement('div');
    container.className = 'title-bar';
    
    const content = document.createElement('div');
    content.className = 'title-bar-content';
    
    // Название приложения
    const title = document.createElement('h1');
    title.className = 'title-bar-title';
    title.textContent = this.title;
    content.appendChild(title);
    
    // Контейнер для кнопок управления
    const controls = document.createElement('div');
    controls.className = 'title-bar-controls';
    
    // Кнопка минимизации
    const minimizeButton = this.createButton('minimize', this.getMinimizeIcon());
    controls.appendChild(minimizeButton);
    
    // Кнопка максимизации/восстановления
    const maximizeButton = this.createButton('maximize', this.getMaximizeIcon());
    controls.appendChild(maximizeButton);
    
    // Кнопка закрытия
    const closeButton = this.createButton('close', this.getCloseIcon(), 'title-bar-button-close');
    controls.appendChild(closeButton);
    
    // Обновляем состояние максимизации при загрузке
    this.updateMaximizeState();
    
    // Обновляем иконку максимизации при изменении размера окна
    window.addEventListener('resize', () => {
      this.updateMaximizeState();
    });
    
    content.appendChild(controls);
    container.appendChild(content);
    
    this.element = container;
    this.minimizeButton = minimizeButton;
    this.maximizeButton = maximizeButton;
    this.closeButton = closeButton;
    
    this.initialized = true;
    
    return this.element;
  }

  /**
   * Создает кнопку управления окном
   */
  createButton(action, iconContent, additionalClass = '') {
    const button = document.createElement('button');
    button.className = `title-bar-button title-bar-button-${action} ${additionalClass}`.trim();
    button.setAttribute('aria-label', action);
    
    const icon = document.createElement('div');
    icon.className = 'title-bar-button-icon';
    icon.innerHTML = iconContent;
    button.appendChild(icon);
    
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleButtonClick(action);
    });
    
    return button;
  }

  /**
   * Обрабатывает клик по кнопке
   */
  async handleButtonClick(action) {
    try {
      switch (action) {
        case 'minimize':
          await windowController.minimize();
          break;
        case 'maximize':
          await windowController.maximize();
          // Обновляем состояние после максимизации
          setTimeout(() => this.updateMaximizeState(), 100);
          break;
        case 'close':
          await windowController.close();
          break;
      }
    } catch (error) {
      console.error(`[TitleBar] Ошибка при выполнении действия "${action}":`, error);
    }
  }

  /**
   * Обновляет состояние максимизации и иконку
   */
  async updateMaximizeState() {
    try {
      this.isMaximized = await windowController.isMaximized();
      if (this.maximizeButton) {
        const icon = this.maximizeButton.querySelector('.title-bar-button-icon');
        if (icon) {
          icon.innerHTML = this.getMaximizeIcon();
        }
      }
    } catch (error) {
      console.warn('[TitleBar] Не удалось обновить состояние максимизации:', error);
    }
  }

  /**
   * Возвращает SVG иконку для минимизации
   */
  getMinimizeIcon() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
  }

  /**
   * Возвращает SVG иконку для максимизации/восстановления
   */
  getMaximizeIcon() {
    if (this.isMaximized) {
      // Иконка восстановления (два перекрывающихся квадрата)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      `;
    } else {
      // Иконка максимизации (один квадрат)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      `;
    }
  }

  /**
   * Возвращает SVG иконку для закрытия
   */
  getCloseIcon() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
  }

  /**
   * Рендерит компонент
   */
  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default TitleBar;
