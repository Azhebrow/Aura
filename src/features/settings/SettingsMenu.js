import { iconLoader } from '../../utils/index.js';


class SettingsMenu {
  constructor(options = {}) {
    this.categories = options.categories || [];
    this.onSelect = options.onSelect || null;
    this.element = null;
    this.expandedCategories = new Set();
    this.selectedItemId = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return this.element;
    }

    const menu = document.createElement('nav');
    menu.className = 'settings-menu';

    // Собираем все иконки для загрузки
    const iconNames = [];
    this.categories.forEach(cat => {
      if (cat.icon) iconNames.push(cat.icon);
      if (cat.items) {
        cat.items.forEach(item => {
          if (item.icon) iconNames.push(item.icon);
        });
      }
    });
    
    const loadedIcons = iconNames.length > 0 
      ? await iconLoader.loadIcons(iconNames)
      : {};

    // Создаем элементы меню
    for (const category of this.categories) {
      const categoryElement = await this.createCategoryElement(
        category,
        loadedIcons
      );
      menu.appendChild(categoryElement);
    }

    // Устанавливаем element
    this.element = menu;

    this.initialized = true;
    
    // Выбираем первый элемент по умолчанию после создания всех элементов
    const firstItem = this.findFirstItem();
    if (firstItem) {
      this.selectItem(firstItem.id, firstItem.element);
    }
    
    return this.element;
  }

  findFirstItem() {
    for (const category of this.categories) {
      // Если категория standalone (без подкатегорий)
      if (!category.items || category.items.length === 0) {
        const element = this.element.querySelector(`[data-item-id="${category.id}"]`);
        if (element) {
          return { id: category.id, element };
        }
      }
      // Иначе берем первую подкатегорию
      if (category.items && category.items.length > 0) {
        const element = this.element.querySelector(`[data-item-id="${category.items[0].id}"]`);
        if (element) {
          return { id: category.items[0].id, element };
        }
      }
    }
    return null;
  }

  async createCategoryElement(category, loadedIcons) {
    const categoryWrapper = document.createElement('div');
    categoryWrapper.className = 'settings-menu-category';
    categoryWrapper.setAttribute('data-category-id', category.id);

    // Если категория standalone (без подкатегорий)
    if (!category.items || category.items.length === 0) {
      const standaloneButton = this.createItemButton(category.id, category.title, category.icon ? loadedIcons[category.icon] : null, loadedIcons, true);
      categoryWrapper.appendChild(standaloneButton);
      return categoryWrapper;
    }

    // Заголовок категории с подкатегориями
    const categoryHeader = document.createElement('button');
    categoryHeader.className = 'settings-menu-category-header';
    categoryHeader.type = 'button';

    const headerContent = document.createElement('span');
    headerContent.className = 'settings-menu-category-header-content';

    // Иконка категории
    if (category.icon && loadedIcons[category.icon]) {
      const icon = document.createElement('span');
      icon.className = 'settings-menu-category-icon';
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${loadedIcons[category.icon]}</svg>`;
      headerContent.appendChild(icon);
    }

    // Название категории
    const title = document.createElement('span');
    title.className = 'settings-menu-category-title';
    title.textContent = category.title;
    headerContent.appendChild(title);

    // Иконка раскрытия
    const expandIcon = document.createElement('span');
    expandIcon.className = 'settings-menu-category-expand-icon';
    expandIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>';
    headerContent.appendChild(expandIcon);

    categoryHeader.appendChild(headerContent);

    // Обработчик клика для раскрытия/сворачивания
    categoryHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasExpanded = this.expandedCategories.has(category.id);
      
      // Если категория была раскрыта впервые, выбираем первую подкатегорию ДО раскрытия
      if (!wasExpanded && category.items && category.items.length > 0) {
        const firstItemId = category.items[0].id;
        // Раскрываем категорию
        this.toggleCategory(category.id, categoryWrapper);
        // Небольшая задержка для того, чтобы элементы появились в DOM
        setTimeout(() => {
          const firstItemElement = categoryWrapper.querySelector(`[data-item-id="${firstItemId}"]`);
          if (firstItemElement) {
            this.selectItem(firstItemId, firstItemElement);
          }
        }, 0);
      } else {
        this.toggleCategory(category.id, categoryWrapper);
      }
    });

    categoryWrapper.appendChild(categoryHeader);

    // Контейнер для подкатегорий
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'settings-menu-items';
    
    if (category.items && category.items.length > 0) {
      const itemsInner = document.createElement('div');
      itemsInner.className = 'settings-menu-items-inner';
      
      category.items.forEach(item => {
        const itemButton = this.createItemButton(
          item.id,
          item.title,
          item.icon ? loadedIcons[item.icon] : null,
          loadedIcons,
          false
        );
        itemsInner.appendChild(itemButton);
      });
      
      itemsContainer.appendChild(itemsInner);
    }

    categoryWrapper.appendChild(itemsContainer);

    // Раскрываем первую категорию по умолчанию
    if (this.categories.indexOf(category) === 0 && category.items && category.items.length > 0) {
      this.expandedCategories.add(category.id);
      categoryWrapper.classList.add('expanded');
    }

    return categoryWrapper;
  }

  createItemButton(itemId, title, iconContent, loadedIcons, isStandalone) {
    const button = document.createElement('button');
    button.className = 'settings-menu-item';
    if (isStandalone) {
      button.className += ' settings-menu-item--standalone';
    }
    button.type = 'button';
    button.setAttribute('data-item-id', itemId);
    button.setAttribute('data-active', 'false');

    // Иконка элемента
    if (iconContent) {
      const icon = document.createElement('span');
      icon.className = 'settings-menu-item-icon';
      
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      button.appendChild(icon);
    }

    // Текст элемента
    const text = document.createElement('span');
    text.textContent = title;
    button.appendChild(text);

    // Обработчик клика
    button.addEventListener('click', () => {
      this.selectItem(itemId, button);
    });

    return button;
  }

  async toggleCategory(categoryId, categoryElement) {
    // Определяем, раскрывается или сворачивается категория
    const wasExpanded = this.expandedCategories.has(categoryId);
    const isExpanding = !wasExpanded;
    
    // Воспроизводим звук раскрытия/сворачивания
    if (window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
      const sound = getSoundByType(
        SOUND_CATEGORIES.UI_NAVIGATION,
        isExpanding ? UI_ELEMENT_TYPES.LIST_EXPAND : UI_ELEMENT_TYPES.LIST_COLLAPSE
      );
      if (sound) {
        window.audioSystem.play(sound);
      }
    }
    if (this.expandedCategories.has(categoryId)) {
      // Закрываем текущую категорию
      this.expandedCategories.delete(categoryId);
      categoryElement.classList.remove('expanded');
    } else {
      // Закрываем все другие категории
      this.expandedCategories.forEach(expandedId => {
        const expandedElement = this.element.querySelector(`[data-category-id="${expandedId}"]`);
        if (expandedElement) {
          this.expandedCategories.delete(expandedId);
          expandedElement.classList.remove('expanded');
        }
      });
      
      // Раскрываем выбранную категорию
      this.expandedCategories.add(categoryId);
      categoryElement.classList.add('expanded');
    }
  }

  async selectItem(itemId, element) {
    this.selectedItemId = itemId;

    // Убираем активное состояние со всех элементов
    const allItems = this.element.querySelectorAll('.settings-menu-item');
    allItems.forEach(item => {
      item.setAttribute('data-active', 'false');
    });

    // Устанавливаем активное состояние для выбранного элемента
    if (element) {
      element.setAttribute('data-active', 'true');
    } else {
      const itemElement = this.element.querySelector(`[data-item-id="${itemId}"]`);
      if (itemElement) {
        itemElement.setAttribute('data-active', 'true');
      }
    }

    // Воспроизводим звук переключения вкладки через типизированную систему
    if (window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
      const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.TAB_SWITCH);
      if (sound) {
        window.audioSystem.play(sound);
      }
    }

    // Вызываем callback
    if (this.onSelect) {
      this.onSelect(itemId);
    }
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default SettingsMenu;
