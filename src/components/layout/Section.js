import Heading from '../display/Heading.js';
import SectionBadge from '../display/SectionBadge.js';

class Section {
  constructor(options = {}) {
    this.title = options.title || '';
    this.titleLevel = options.titleLevel || 2;
    this.titleActions = options.titleActions || null; // Элементы для добавления в заголовок
    this.titleBadges = options.titleBadges || null; // Метки для добавления в заголовок
    this.element = null;
    this.headerElement = null;
    this.headerLeft = null;
    this.headerRight = null;
    this.badgesContainer = null;
    this.badges = [];
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'section';
    
    if (this.title) {
      this.createHeader();
    }
  }

  /**
   * Создает единую структуру заголовка секции
   */
  createHeader() {
    // Создаем контейнер заголовка
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'section-header';
    
    // Левая часть: иконки + название
    this.headerLeft = document.createElement('div');
    this.headerLeft.className = 'section-header-left';
    
    // Создаем заголовок
    const heading = new Heading({ text: this.title, level: this.titleLevel });
    const headingElement = heading.render();
    this.headerLeft.appendChild(headingElement);
    
    // Контейнер для меток (если есть)
    if (this.titleBadges) {
      this.badgesContainer = document.createElement('div');
      this.badgesContainer.className = 'section-header-badges';
      
      if (Array.isArray(this.titleBadges)) {
        this.titleBadges.forEach(badgeConfig => {
          const badge = new SectionBadge(badgeConfig);
          this.badges.push(badge);
          this.badgesContainer.appendChild(badge.render());
        });
      } else if (this.titleBadges instanceof SectionBadge) {
        this.badges.push(this.titleBadges);
        this.badgesContainer.appendChild(this.titleBadges.render());
      }
      
      this.headerLeft.appendChild(this.badgesContainer);
    }
    
    this.headerElement.appendChild(this.headerLeft);
    
    // Правая часть: элементы действий (если есть)
    if (this.titleActions) {
      this.headerRight = document.createElement('div');
      this.headerRight.className = 'section-header-right';
      
      // Добавляем элементы действий
      if (Array.isArray(this.titleActions)) {
        this.titleActions.forEach(action => {
          if (action && action instanceof Node) {
            this.headerRight.appendChild(action);
          }
        });
      } else if (this.titleActions instanceof Node) {
        this.headerRight.appendChild(this.titleActions);
      }
      
      this.headerElement.appendChild(this.headerRight);
    }
    
    this.element.appendChild(this.headerElement);
  }

  /**
   * Устанавливает иконку блокировки в заголовок секции (слева от названия)
   * @param {HTMLElement} lockIcon - Элемент иконки блокировки
   */
  setLockIcon(lockIcon) {
    if (!lockIcon || !this.element) {
      return;
    }

    // Если заголовка еще нет, создаем его
    if (!this.headerElement) {
      this.createHeader();
    }

    // Получаем левую часть заголовка
    if (!this.headerLeft) {
      this.headerLeft = this.headerElement.querySelector('.section-header-left');
    }

    if (this.headerLeft) {
      // Проверяем, нет ли уже иконки блокировки
      const existingLockIcon = this.headerLeft.querySelector('.section-lock-icon');
      if (existingLockIcon) {
        existingLockIcon.replaceWith(lockIcon);
      } else {
        // Вставляем иконку в начало левой части (перед всеми элементами)
        this.headerLeft.insertBefore(lockIcon, this.headerLeft.firstChild);
      }
    }
  }

  /**
   * Обновляет текст заголовка секции
   * @param {string} newTitle - Новый текст заголовка
   */
  updateTitle(newTitle) {
    if (!this.element || !newTitle) {
      return;
    }

    const headingElement = this.element.querySelector('.page-title');
    if (headingElement) {
      headingElement.textContent = newTitle;
    }
  }

  /**
   * Получает левую часть заголовка для добавления элементов (например, иконки категории)
   * @returns {HTMLElement|null}
   */
  getHeaderLeft() {
    if (!this.headerElement) {
      this.createHeader();
    }
    return this.headerLeft || this.headerElement?.querySelector('.section-header-left');
  }

  /**
   * Получает правую часть заголовка для добавления элементов (например, процента выполнения)
   * @returns {HTMLElement|null}
   */
  getHeaderRight() {
    if (!this.headerElement) {
      this.createHeader();
    }
    if (!this.headerRight) {
      this.headerRight = this.headerElement.querySelector('.section-header-right');
      if (!this.headerRight) {
        this.headerRight = document.createElement('div');
        this.headerRight.className = 'section-header-right';
        this.headerElement.appendChild(this.headerRight);
      }
    }
    return this.headerRight;
  }

  /**
   * Устанавливает метки в заголовок секции
   * @param {Array<{text: string, value?: string}>|null} badgesConfig - Массив конфигураций меток или null для удаления
   */
  setBadges(badgesConfig) {
    if (!this.headerElement) {
      this.createHeader();
    }

    // Удаляем старые метки
    if (this.badgesContainer) {
      this.badgesContainer.remove();
      this.badgesContainer = null;
      this.badges = [];
    }

    // Добавляем новые метки
    if (badgesConfig && Array.isArray(badgesConfig) && badgesConfig.length > 0) {
      this.badgesContainer = document.createElement('div');
      this.badgesContainer.className = 'section-header-badges';
      
      badgesConfig.forEach(badgeConfig => {
        const badge = new SectionBadge(badgeConfig);
        this.badges.push(badge);
        this.badgesContainer.appendChild(badge.render());
      });
      
      // Вставляем контейнер меток после заголовка
      const headerLeft = this.headerLeft || this.headerElement.querySelector('.section-header-left');
      if (headerLeft) {
        const headingElement = headerLeft.querySelector('.page-title');
        if (headingElement && headingElement.nextSibling) {
          headerLeft.insertBefore(this.badgesContainer, headingElement.nextSibling);
        } else {
          headerLeft.appendChild(this.badgesContainer);
        }
      }
    }
  }

  /**
   * Обновляет существующие метки (если они есть)
   * @param {Array<{text: string, value?: string}>} badgesConfig - Массив конфигураций меток
   */
  updateBadges(badgesConfig) {
    if (!badgesConfig || !Array.isArray(badgesConfig)) {
      return;
    }

    // Если меток еще нет, создаем их
    if (!this.badgesContainer || this.badges.length === 0) {
      this.setBadges(badgesConfig);
      return;
    }

    // Обновляем существующие метки
    badgesConfig.forEach((badgeConfig, index) => {
      if (index < this.badges.length) {
        this.badges[index].update(badgeConfig.text, badgeConfig.value);
      } else {
        // Создаем новую метку, если её нет
        const badge = new SectionBadge(badgeConfig);
        this.badges.push(badge);
        this.badgesContainer.appendChild(badge.render());
      }
    });

    // Удаляем лишние метки, если их стало меньше
    while (this.badges.length > badgesConfig.length) {
      const removedBadge = this.badges.pop();
      if (removedBadge && removedBadge.element) {
        removedBadge.element.remove();
      }
    }
  }

  render() {
    return this.element;
  }
}

export default Section;
