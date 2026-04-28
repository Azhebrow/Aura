import Button from '../form/Button.js';
import { iconLoader, colorConversion } from '../../utils/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';

const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

class VowsSection {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[VowsSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[VowsSection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.vows = [];
    this.currentIndex = 0;
  }

  async init() {
    await this.loadVows();
    
    // Создаем элемент секции без заголовка
    this.element = document.createElement('div');
    this.element.className = 'section';
    
    await this.render();

    // Подписываемся на изменения акцентного цвета и темы
    this.accentColorHandler = () => {
      this.render();
    };
    this.themeHandler = () => {
      this.render();
    };
    window.addEventListener('accentColorChanged', this.accentColorHandler);
    window.addEventListener('themeChanged', this.themeHandler);
  }

  async loadVows() {
    try {
      if (!this.db) {
        this.vows = [];
        return;
      }
      
      // Загружаем обеты из базы данных, сортируем по level
      this.vows = this.db.getAll('cfg_vows') || [];
      this.vows.sort((a, b) => (a.level || 0) - (b.level || 0));
      
      // Если есть обеты, но индекс выходит за границы, сбрасываем на 0
      if (this.vows.length > 0 && this.currentIndex >= this.vows.length) {
        this.currentIndex = 0;
      }
    } catch (error) {
      console.error('[VowsSection] Ошибка загрузки обетов:', error);
      this.vows = [];
    }
  }

  async render() {
    // Очищаем содержимое секции
    this.element.innerHTML = '';

    // Создаем контейнер для контента
    const container = document.createElement('div');
    container.className = 'vows-section-container';

    if (this.vows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vows-empty';
      empty.textContent = 'Нет обетов';
      container.appendChild(empty);
      this.element.appendChild(container);
      return;
    }

    const currentVow = this.vows[this.currentIndex];

    // Кнопки навигации (справа в заголовке)
    const prevButton = await new Button({
      iconName: 'chevron-left'
    }).render();
    prevButton.classList.add('nav-arrow-button', 'nav-arrow-inline');
    prevButton.addEventListener('click', async () => {
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_PREV);
        if (sound) window.audioSystem.play(sound);
      }
      this.currentIndex = (this.currentIndex - 1 + this.vows.length) % this.vows.length;
      this.render();
    });

    const nextButton = await new Button({
      iconName: 'chevron-right'
    }).render();
    nextButton.classList.add('nav-arrow-button', 'nav-arrow-inline');
    nextButton.addEventListener('click', async () => {
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_NEXT);
        if (sound) window.audioSystem.play(sound);
      }
      this.currentIndex = (this.currentIndex + 1) % this.vows.length;
      this.render();
    });

    // Заголовок секции: слева иконка + название, справа кнопки переключения
    const header = document.createElement('div');
    header.className = 'vows-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'vows-header-left';

    if (currentVow.icon) {
      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'act-card-icon has-color';
      const getAccentColor = () => {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
      };
      const vowColor = currentVow.color || getAccentColor();
      applyIconBackground(iconWrapper, vowColor);
      iconWrapper.style.setProperty('--icon-color', vowColor);
      try {
        const iconContent = await iconLoader.loadIcon(currentVow.icon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        console.warn(`[VowsSection] Не удалось загрузить иконку "${currentVow.icon}"`, e);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
      headerLeft.appendChild(iconWrapper);
    }

    const title = document.createElement('h3');
    title.textContent = currentVow.title || 'Обет';
    headerLeft.appendChild(title);

    const headerRight = document.createElement('div');
    headerRight.className = 'vows-header-right';
    headerRight.appendChild(prevButton);
    headerRight.appendChild(nextButton);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);

    // Разделительная линия
    const divider = document.createElement('div');
    divider.className = 'vows-divider';

    // Контейнер для текста с прокруткой
    const textContainer = document.createElement('div');
    textContainer.className = 'vows-text-container';

    const text = document.createElement('div');
    text.className = 'vows-text';
    text.textContent = currentVow.description || 'Нет описания';
    textContainer.appendChild(text);

    // Собираем: заголовок → разделитель → контент (без нижней навигации и точек)
    container.appendChild(header);
    container.appendChild(divider);
    container.appendChild(textContainer);

    this.element.appendChild(container);
  }
}

export default VowsSection;

