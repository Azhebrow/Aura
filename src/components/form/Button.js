import { iconLoader } from '../../utils/index.js';

class Button {
  constructor(options = {}) {
    this.text = options.text || '';
    this.icon = options.icon || null;
    this.iconName = options.iconName || null; // Имя иконки для загрузки из библиотеки
    this.variant = options.variant || null;
    this.onClick = options.onClick || null;
    this.element = null;
    this.initialized = false;
    this.options = options;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('button');
    this.element.className = 'btn';
    
    // Добавляем variant если указан
    if (this.variant) {
      this.element.className += ` btn-${this.variant}`;
    }
    
    let iconContent = this.icon;

    // Если указано имя иконки, загружаем из библиотеки
    if (this.iconName && !this.icon) {
      try {
        iconContent = await iconLoader.loadIcon(this.iconName);
        // Обертываем в SVG тег для правильного отображения
        iconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (error) {
        console.warn(`[Button] Не удалось загрузить иконку "${this.iconName}"`, error);
      }
    }
    
    if (iconContent) {
      // Создаем временный контейнер для парсинга SVG
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = iconContent;
      const svg = tempDiv.querySelector('svg');
      if (svg) {
        // Клонируем SVG, чтобы избежать проблем с DOM
        const clonedSvg = svg.cloneNode(true);
        clonedSvg.style.flexShrink = '0';
        this.element.appendChild(clonedSvg);
      } else {
        // Если это не SVG, вставляем как есть
        this.element.innerHTML = iconContent;
      }
      
      // Если есть и иконка, и текст, добавляем текст после иконки
      if (this.text) {
        const textSpan = document.createElement('span');
        textSpan.textContent = this.text;
        textSpan.style.marginLeft = 'var(--space-sm)';
        textSpan.style.flexShrink = '0';
        this.element.appendChild(textSpan);
        // Для кнопок с текстом и иконкой убираем width: 100%
        this.element.style.width = 'auto';
      } else {
        // Если только иконка, добавляем класс btn-icon
        this.element.className += ' btn-icon';
      }
    } else {
      this.element.textContent = this.text;
    }

    if (this.onClick) {
      this.element.addEventListener('click', this.onClick);
    }

    // Автоматическая привязка звука к кнопке через типизированную систему
    if (typeof window !== 'undefined' && window.audioSystem) {
      window.audioSystem.attachToButton(this.element);
    }

    this.initialized = true;
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default Button;
