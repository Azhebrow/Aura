import { iconLoader, colorConversion, formatCurrency } from '../../utils/index.js';

const { hexToRgba } = colorConversion;
const { formatBalance } = formatCurrency;

class Card {
  constructor(options = {}) {
    this.title = options.title || '';
    this.titlePrefixIcon = options.titlePrefixIcon || null; // Иконка в начале названия (напр. frown для импульсивных)
    this.icon = options.icon || null;
    this.iconName = options.iconName || null; // Имя иконки для загрузки из библиотеки
    this.backgroundColor = options.backgroundColor || null;
    this.checked = options.checked || false;
    this.onChange = options.onChange || null;
    // Дополнительная информация для счетов
    this.balance = options.balance !== undefined ? options.balance : null;
    this.target = options.target !== undefined ? options.target : null;
    this.element = null;
    this.initialized = false;
    this.infoElement = null; // Сохраняем ссылку на элемент с информацией для обновления
    this.progressElement = null; // Сохраняем ссылку на элемент прогресс-бара для обновления
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'card-item';
    this.element.tabIndex = 0;
    
    // Сохраняем цвет для применения только при активном состоянии и hover
    if (this.backgroundColor) {
      this.element.dataset.cardColor = this.backgroundColor;
      // Устанавливаем CSS переменные для hover эффекта (полупрозрачный цвет)
      const hoverRgba = hexToRgba(this.backgroundColor, 0.2);
      this.element.style.setProperty('--hover-bg-color', hoverRgba);
      // Устанавливаем CSS переменные для активного состояния (полупрозрачный цвет)
      const activeRgba = hexToRgba(this.backgroundColor, 0.3);
      this.element.style.setProperty('--active-bg-color', activeRgba);
      // Устанавливаем CSS переменную для границы активного состояния
      this.element.style.setProperty('--active-border-color', this.backgroundColor);
    }
    
    let iconContent = this.icon;

    // Если указано имя иконки и иконка еще не загружена, загружаем из библиотеки
    if (this.iconName && !this.icon) {
      try {
        iconContent = await iconLoader.loadIcon(this.iconName);
        // Обертываем в SVG тег для правильного отображения
        iconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (error) {
        console.warn(`[Card] Не удалось загрузить иконку "${this.iconName}"`, error);
      }
    }
    
    // Иконка слева (простая SVG, без фона)
    if (iconContent) {
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'card-icon';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = iconContent;
      const svg = tempDiv.querySelector('svg');
      if (svg) {
        const clonedSvg = svg.cloneNode(true);
        // Не устанавливаем fill="none" если у SVG уже есть fill (для залитых иконок)
        if (!clonedSvg.hasAttribute('fill') || clonedSvg.getAttribute('fill') === 'none') {
          clonedSvg.setAttribute('fill', 'none');
          if (!clonedSvg.hasAttribute('stroke')) {
            clonedSvg.setAttribute('stroke', 'currentColor');
          }
          if (!clonedSvg.hasAttribute('stroke-width')) {
            clonedSvg.setAttribute('stroke-width', '2');
          }
        }
        iconWrapper.appendChild(clonedSvg);
        this.element.appendChild(iconWrapper);
      }
    }

    // Контейнер для названия и дополнительной информации
    const titleContainer = document.createElement('div');
    titleContainer.className = 'card-title-container';
    titleContainer.style.display = 'flex';
    titleContainer.style.flexDirection = 'column';
    titleContainer.style.flex = '1';
    titleContainer.style.minWidth = '0';
    titleContainer.style.gap = '2px';
    
    // Название
    if (this.title) {
      const titleWrapper = document.createElement('span');
      titleWrapper.className = 'card-title';
      titleWrapper.style.display = 'inline-flex';
      titleWrapper.style.alignItems = 'center';
      titleWrapper.style.gap = '4px';
      if (this.titlePrefixIcon) {
        try {
          const prefixContent = await iconLoader.loadIcon(this.titlePrefixIcon);
          const iconSpan = document.createElement('span');
          iconSpan.className = 'card-title-prefix-icon';
          iconSpan.style.cssText = 'display: inline-flex; flex-shrink: 0; width: 14px; height: 14px; opacity: 0.8; color: var(--color-on-surface-secondary);';
          iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">${prefixContent}</svg>`;
          titleWrapper.appendChild(iconSpan);
        } catch (e) {
          console.warn(`[Card] Не удалось загрузить titlePrefixIcon "${this.titlePrefixIcon}"`, e);
        }
      }
      titleWrapper.appendChild(document.createTextNode(this.title));
      titleContainer.appendChild(titleWrapper);
    }
    
    // Дополнительная информация (баланс и прогресс-бар для накопительных счетов)
    if (this.balance !== null) {
      // Для накопительных счетов с целевым значением показываем прогресс-бар и информацию
      if (this.target !== null && this.target > 0) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'card-progress-container';
        progressContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
          margin-top: 4px;
        `;
        
        // Текстовая информация: текущее значение и проценты
        const progressInfo = document.createElement('div');
        progressInfo.className = 'card-progress-info';
        progressInfo.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--font-xs);
          opacity: 0.7;
          line-height: 1.2;
        `;
        
        const currentValue = document.createElement('span');
        currentValue.className = 'card-progress-current';
        currentValue.textContent = formatBalance(this.balance);
        
        const progressPercent = this.balance !== null ? Math.min(100, (this.balance / this.target) * 100) : 0;
        const percentValue = document.createElement('span');
        percentValue.className = 'card-progress-percent';
        percentValue.textContent = `${Math.round(progressPercent)}%`;
        
        progressInfo.appendChild(currentValue);
        progressInfo.appendChild(percentValue);
        progressContainer.appendChild(progressInfo);
        
        // Прогресс-бар
        const progressBar = document.createElement('div');
        progressBar.className = 'card-progress-bar';
        progressBar.style.cssText = `
          width: 100%;
          height: 4px;
          background-color: var(--color-element);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        `;
        
        const progressFill = document.createElement('div');
        progressFill.className = 'card-progress-fill';
        progressFill.style.cssText = `
          height: 100%;
          width: ${progressPercent}%;
          background-color: ${this.backgroundColor || 'var(--color-accent-ui, var(--color-accent))'};
          transition: width 0.3s ease;
        `;
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        
        this.progressElement = progressContainer; // Сохраняем ссылку для обновления
        this.progressInfoElement = progressInfo; // Сохраняем ссылку на текстовую информацию
        titleContainer.appendChild(progressContainer);
      } else {
        // Для обычных счетов показываем только баланс
        const infoElement = document.createElement('span');
        infoElement.className = 'card-info';
        infoElement.style.fontSize = 'var(--font-xs)';
        infoElement.style.opacity = '0.7';
        infoElement.style.lineHeight = '1.2';
        infoElement.textContent = formatBalance(this.balance);
        this.infoElement = infoElement; // Сохраняем ссылку для обновления
        titleContainer.appendChild(infoElement);
      }
    }
    
    this.element.appendChild(titleContainer);

    // Устанавливаем начальное состояние
    if (this.checked) {
      this.element.classList.add('active');
      this.updateBackground();
    }

    // Обработчик клика для переключения состояния
    this.element.addEventListener('click', () => {
      this.toggle();
    });

    // Обработчик клавиатуры
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.checked = !this.checked;
    if (this.checked) {
      this.element.classList.add('active');
      this.updateBackground();
    } else {
      this.element.classList.remove('active');
      this.clearBackground();
    }
    if (this.onChange) {
      this.onChange(this.checked);
    }
  }

  updateBackground() {
    // Устанавливаем фон активной карточки через CSS переменную
    if (this.backgroundColor) {
      const activeRgba = hexToRgba(this.backgroundColor, 0.3);
      this.element.style.setProperty('--active-bg-color', activeRgba);
      this.element.style.setProperty('--active-border-color', this.backgroundColor);
    }
  }

  clearBackground() {
    // Сбрасываем фон неактивной карточки
    if (this.backgroundColor) {
      this.element.style.removeProperty('--active-bg-color');
      this.element.style.removeProperty('--active-border-color');
    }
  }

  /**
   * Обновляет отображение валюты в карточке
   */
  updateCurrencyInfo() {
    // Обновляем баланс для обычных счетов
    if (this.infoElement && this.balance !== null && (this.target === null || this.target <= 0)) {
      this.infoElement.textContent = formatBalance(this.balance);
    }
    
    // Обновляем прогресс-бар и информацию для накопительных счетов
    if (this.progressElement && this.target !== null && this.target > 0) {
      const progressFill = this.progressElement.querySelector('.card-progress-fill');
      const currentValue = this.progressElement.querySelector('.card-progress-current');
      const percentValue = this.progressElement.querySelector('.card-progress-percent');
      
      if (this.balance !== null) {
        const progressPercent = Math.min(100, (this.balance / this.target) * 100);
        
        // Обновляем прогресс-бар
        if (progressFill) {
          progressFill.style.width = `${progressPercent}%`;
        }
        
        // Обновляем текущее значение
        if (currentValue) {
          currentValue.textContent = formatBalance(this.balance);
        }
        
        // Обновляем проценты
        if (percentValue) {
          percentValue.textContent = `${Math.round(progressPercent)}%`;
        }
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

export default Card;
