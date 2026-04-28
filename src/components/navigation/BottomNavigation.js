import RadioButton from '../form/RadioButton.js';
import { iconLoader } from '../../utils/index.js';
import { settingsChangeTracker, navOrderConfigService } from '../../system/services/index.js';

class BottomNavigation {
  constructor(options = {}) {
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange || null;
    this.element = null;
    this.initialized = false;
    this.radioInputs = null;
    this.pages = null;
    this.radioButton = null;
    this._isProgrammaticUpdate = false; // Флаг для предотвращения вызова onChange при программном обновлении
    this.resizeHandler = null; // Обработчик изменения размера окна
    this.lastNarrowMode = null; // Последнее состояние узкого режима для отслеживания изменений
  }

  /**
   * Получает настройку отображения названий из базы данных
   * @returns {boolean} true если нужно показывать названия, false если только иконки
   */
  shouldShowLabels() {
    // В узком режиме (ширина окна ≤ 1100px) всегда скрываем названия
    const isNarrowMode = window.innerWidth <= 1100;
    if (isNarrowMode) {
      console.log('[BottomNavigation] Узкий режим активен, названия скрыты');
      return false;
    }

    try {
      const getDB = window.getDB;
      if (getDB) {
        const db = getDB();
        if (db) {
          const settings = db.getAppSettings();
          if (settings) {
            // SQLite хранит boolean как INTEGER (0 или 1)
            // Проверяем, что значение существует, иначе используем 0
            const value = settings.bottom_nav_show_labels !== undefined && settings.bottom_nav_show_labels !== null 
              ? settings.bottom_nav_show_labels 
              : 0;
            const showLabels = value === 1 || value === true;
            console.log('[BottomNavigation] Настройка bottom_nav_show_labels:', value, '->', showLabels);
            return showLabels;
          }
        }
      }
    } catch (e) {
      console.warn('[BottomNavigation] Ошибка получения настройки отображения:', e);
    }
    return false; // По умолчанию только иконки
  }

  async init() {
    if (this.initialized) {
      return this.element;
    }
    const nav = document.createElement('nav');
    nav.className = 'bottom-navigation';

    // Получаем страницы из настроек (порядок настраивается)
    const pages = navOrderConfigService.getPages();
    this.pages = pages;

    // Загружаем все иконки из библиотеки
    const iconNames = pages.map(page => page.icon);
    const loadedIcons = await iconLoader.loadIcons(iconNames);

    // Определяем, нужно ли показывать названия
    const showLabels = this.shouldShowLabels();

    // Создаем элементы для радиокнопок с загруженными иконками
    const radioItems = pages.map((page, index) => {
      const item = {
        value: page.id,
        icon: loadedIcons[page.icon] || ''
      };
      // Добавляем текст, если нужно показывать названия
      if (showLabels) {
        item.text = page.name;
      }
      return item;
    });

    // Создаем группу радиокнопок
    const radioButton = new RadioButton({
      name: 'bottom-navigation',
      iconOnly: !showLabels,
      modifierClass: 'radio-button--nav',
      value: pages[this.selectedIndex].id, // Устанавливаем текущую страницу
      items: radioItems
    });

    // Сохраняем ссылку на radioButton для последующего обновления
    this.radioButton = radioButton;

    // Обработчик изменения выбора
    const radioInputs = radioButton.render().querySelectorAll('input[type="radio"]');
    // Сохраняем ссылку на radioInputs для использования в других методах
    this.radioInputs = radioInputs;
    radioInputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        if (input.checked && this.onChange && !this._isProgrammaticUpdate) {
          const targetPage = pages[index];
          
          // Проверяем, были ли изменения на странице настроек
          if (settingsChangeTracker.getHasChanges()) {
            const currentPageId = window.pageManager
              ? window.pageManager.currentPageId || (this.pages[this.selectedIndex] && this.pages[this.selectedIndex].id)
              : (this.pages[this.selectedIndex] && this.pages[this.selectedIndex].id);
            
            // Перезагрузка только при уходе со страницы настроек
            if (currentPageId === 'settings') {
              const reloaded = settingsChangeTracker.checkAndReload(targetPage.id);
              if (reloaded) {
                return; // Перезагрузка была инициирована, прерываем выполнение
              }
            }
          }
          
          this.selectedIndex = index;
          this.onChange(index, targetPage);
        }
      });
    });

    nav.appendChild(radioButton.render());
    
    // Добавляем класс для CSS стилей
    if (showLabels) {
      nav.classList.add('bottom-navigation-with-labels');
    }
    
    // Сохраняем текущее состояние узкого режима
    this.lastNarrowMode = window.innerWidth <= 1100;
    
    // Добавляем обработчик изменения размера окна для автоматического обновления
    this.resizeHandler = () => {
      const currentNarrowMode = window.innerWidth <= 1100;
      // Обновляем только если состояние узкого режима изменилось
      if (this.lastNarrowMode !== currentNarrowMode) {
        this.lastNarrowMode = currentNarrowMode;
        this.updateDisplayMode();
      }
    };
    window.addEventListener('resize', this.resizeHandler);
    
    this.element = nav;
    this.initialized = true;
    return this.element;
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }

  /**
   * Программно устанавливает выбранную страницу по её ID
   * @param {string} pageId - ID страницы (например, 'rituals', 'home')
   */
  setSelectedPage(pageId) {
    if (!this.pages || !this.radioInputs) {
      console.warn('[BottomNavigation] Навигация не инициализирована');
      return;
    }

    // Находим индекс страницы по её ID
    const pageIndex = this.pages.findIndex(page => page.id === pageId);
    
    if (pageIndex === -1) {
      console.warn(`[BottomNavigation] Страница с ID "${pageId}" не найдена`);
      return;
    }

    // Проверяем, не выбрана ли уже эта страница
    if (this.selectedIndex === pageIndex) {
      return; // Уже выбрана, ничего не делаем
    }

    // Устанавливаем флаг для предотвращения вызова onChange
    this._isProgrammaticUpdate = true;

    // Обновляем выбранный индекс
    this.selectedIndex = pageIndex;

    // Обновляем состояние radio input
    this.radioInputs.forEach((input, index) => {
      input.checked = index === pageIndex;
    });

    // Сбрасываем флаг после небольшой задержки, чтобы событие change успело обработаться
    setTimeout(() => {
      this._isProgrammaticUpdate = false;
    }, 0);
  }

  /**
   * Обновляет режим отображения (с названиями или только иконки)
   */
  async updateDisplayMode() {
    if (!this.initialized || !this.element || !this.pages) {
      console.warn('[BottomNavigation] updateDisplayMode: компонент не инициализирован');
      return;
    }

    console.log('[BottomNavigation] Обновление режима отображения');
    const showLabels = this.shouldShowLabels();
    const nav = this.element;
    
    // Удаляем старую группу радиокнопок
    const oldGroup = nav.querySelector('.radio-button-group');
    if (oldGroup) {
      oldGroup.remove();
    }

    // Загружаем иконки
    const iconNames = this.pages.map(page => page.icon);
    const loadedIcons = await iconLoader.loadIcons(iconNames);

    // Создаем новые элементы для радиокнопок
    const radioItems = this.pages.map((page) => {
      const item = {
        value: page.id,
        icon: loadedIcons[page.icon] || ''
      };
      if (showLabels) {
        item.text = page.name;
      }
      return item;
    });

    // Создаем новую группу радиокнопок
    const radioButton = new RadioButton({
      name: 'bottom-navigation',
      iconOnly: !showLabels,
      modifierClass: 'radio-button--nav',
      value: this.pages[this.selectedIndex].id,
      items: radioItems
    });

    this.radioButton = radioButton;
    const radioButtonElement = radioButton.render();

    // Обновляем обработчики событий
    const radioInputs = radioButtonElement.querySelectorAll('input[type="radio"]');
    this.radioInputs = radioInputs;
    radioInputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        if (input.checked && this.onChange && !this._isProgrammaticUpdate) {
          this.selectedIndex = index;
          this.onChange(index, this.pages[index]);
        }
      });
    });

    // Добавляем новую группу в навигацию
    nav.appendChild(radioButtonElement);

    // Обновляем класс навигации для CSS стилей
    if (showLabels) {
      nav.classList.add('bottom-navigation-with-labels');
    } else {
      nav.classList.remove('bottom-navigation-with-labels');
    }
  }

  /**
   * Перестроить меню при изменении порядка страниц
   */
  async rebuildForNewOrder() {
    if (!this.initialized || !this.element) return;

    navOrderConfigService.invalidateCache();
    this.pages = navOrderConfigService.getPages();

    const currentPageId = this.pages[this.selectedIndex]?.id;
    const showLabels = this.shouldShowLabels();

    const oldGroup = this.element.querySelector('.radio-button-group');
    if (oldGroup) oldGroup.remove();

    const iconNames = this.pages.map(page => page.icon);
    const loadedIcons = await iconLoader.loadIcons(iconNames);

    const radioItems = this.pages.map((page) => {
      const item = { value: page.id, icon: loadedIcons[page.icon] || '' };
      if (showLabels) item.text = page.name;
      return item;
    });

    const newIndex = this.pages.findIndex(p => p.id === currentPageId);
    this.selectedIndex = newIndex >= 0 ? newIndex : 0;

    const radioButton = new RadioButton({
      name: 'bottom-navigation',
      iconOnly: !showLabels,
      modifierClass: 'radio-button--nav',
      value: this.pages[this.selectedIndex].id,
      items: radioItems
    });

    this.radioButton = radioButton;
    const radioButtonElement = radioButton.render();
    const radioInputs = radioButtonElement.querySelectorAll('input[type="radio"]');
    this.radioInputs = radioInputs;

    radioInputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        if (input.checked && this.onChange && !this._isProgrammaticUpdate) {
          this.selectedIndex = index;
          this.onChange(index, this.pages[index]);
        }
      });
    });

    this.element.appendChild(radioButtonElement);

    if (showLabels) {
      this.element.classList.add('bottom-navigation-with-labels');
    } else {
      this.element.classList.remove('bottom-navigation-with-labels');
    }
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.element = null;
    this.initialized = false;
    this.radioInputs = null;
    this.pages = null;
    this.radioButton = null;
    this.lastNarrowMode = null;
  }
}

export default BottomNavigation;
