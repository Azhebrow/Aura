import { iconLoader } from '../../utils/index.js';
import IconPickerModal from './IconPickerModal.js';

class IconPickerButton {
  constructor(options = {}) {
    this.iconName = options.iconName || null;
    this.onChange = options.onChange || null;
    /** Если false — только иконка в кнопке (карточки категорий и т.п.), подпись в title/aria-label */
    this.showLabel = options.showLabel !== false;
    this.element = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('button');
    this.element.className = 'cfg-icon-picker-button';
    if (!this.showLabel) {
      this.element.classList.add('cfg-icon-picker-button--icon-only');
    }
    this.element.type = 'button';

    await this.updateIcon();

    this.element.addEventListener('click', () => {
      this.openPicker();
    });

    this.initialized = true;
  }

  /**
   * Форматирует имя иконки в читаемый формат
   * Например: "alarm-clock" -> "Alarm Clock"
   */
  formatIconName(iconName) {
    if (!iconName) return '';
    return iconName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async updateIcon() {
    if (!this.element) return;

    this.element.innerHTML = '';

    // Контейнер для иконки
    const iconContainer = document.createElement('span');
    iconContainer.className = 'cfg-icon-picker-icon';

    if (this.iconName) {
      try {
        const iconContent = await iconLoader.loadIcon(this.iconName);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.innerHTML = iconContent;
        iconContainer.appendChild(svg);
        this.element.appendChild(iconContainer);

        const readable = this.formatIconName(this.iconName);
        this.element.setAttribute('aria-label', `Иконка: ${readable}. Нажмите, чтобы выбрать`);
        this.element.title = readable;
        if (this.showLabel) {
          const label = document.createElement('span');
          label.className = 'cfg-icon-picker-label';
          label.textContent = readable;
          this.element.appendChild(label);
        }
      } catch (e) {
        // Если иконка не найдена, показываем плейсхолдер
        iconContainer.textContent = '?';
        this.element.appendChild(iconContainer);
        this.element.setAttribute('aria-label', 'Неизвестная иконка. Нажмите, чтобы выбрать');
        this.element.title = 'Неизвестная иконка';
        if (this.showLabel) {
          const label = document.createElement('span');
          label.className = 'cfg-icon-picker-label';
          label.textContent = 'Неизвестная иконка';
          this.element.appendChild(label);
        }
      }
    } else {
      this.element.setAttribute('aria-label', 'Выбрать иконку');
      this.element.title = 'Выбрать иконку';
      if (this.showLabel) {
        const label = document.createElement('span');
        label.className = 'cfg-icon-picker-label';
        label.textContent = 'Выбрать иконку';
        this.element.appendChild(label);
      }
    }
  }

  async openPicker() {
    await IconPickerModal.open(this.iconName, (iconName) => {
      this.setIcon(iconName);
    });
  }

  setIcon(iconName) {
    this.iconName = iconName;
    this.updateIcon();
    if (this.onChange) {
      this.onChange(iconName);
    }
  }

  getValue() {
    return this.iconName;
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default IconPickerButton;

