import { iconLoader, colorConversion } from '../../utils/index.js';

const { hexToRgba } = colorConversion;

class Icon {
  constructor(options = {}) {
    this.icon = options.icon || '';
    this.iconName = options.iconName || null; // Имя иконки для загрузки из библиотеки
    this.color = options.color || null;
    this.onClick = options.onClick || null;
    this.element = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'icon';
    
    // Иконки всегда цвета текста (белые)
    this.element.style.color = 'var(--color-on-surface)';
    
    // Цветной фон если указан цвет
    if (this.color) {
      this.element.style.backgroundColor = this.color;
    }

    let iconContent = this.icon;

    // Если указано имя иконки, загружаем из библиотеки
    if (this.iconName && !this.icon) {
      try {
        iconContent = await iconLoader.loadIcon(this.iconName);
        // Обертываем в SVG тег для правильного отображения
        iconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (error) {
        console.warn(`[Icon] Не удалось загрузить иконку "${this.iconName}"`, error);
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
        // Делаем SVG контурным (только stroke)
        clonedSvg.setAttribute('fill', 'none');
        if (!clonedSvg.hasAttribute('stroke')) {
          clonedSvg.setAttribute('stroke', 'currentColor');
        }
        if (!clonedSvg.hasAttribute('stroke-width')) {
          clonedSvg.setAttribute('stroke-width', '2');
        }
        this.element.appendChild(clonedSvg);
      } else {
        // Если это не SVG, вставляем как есть
        this.element.innerHTML = iconContent;
      }
    }

    if (this.onClick) {
      this.element.style.cursor = 'pointer';
      this.element.addEventListener('click', this.onClick);
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

export default Icon;
