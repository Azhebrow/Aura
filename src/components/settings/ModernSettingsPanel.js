import Section from '../layout/Section.js';
import ThemeSwitcher from '../../system/visual/ThemeSwitcher.js';
import AccentColorPicker from '../../system/visual/AccentColorPicker.js';
import RadiusControls from '../../system/visual/RadiusControls.js';
import ScaleControls from '../../system/visual/ScaleControls.js';
import FontPicker from '../../system/visual/FontPicker.js';
import Input from '../form/Input.js';
import Select from '../form/Select.js';
import Button from '../form/Button.js';
import Checkbox from '../form/Checkbox.js';
import ColorSystem from '../../design-system/tokens/ColorSystem.js';
import Slider from '../form/Slider.js';
import { settingsChangeTracker } from '../../system/services/index.js';
import { iconLoader } from '../../utils/index.js';

class ModernSettingsPanel {
  constructor() {
    this.element = null;
    this.initialized = false;
    this.db = null;
    this.settings = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Инициализация базы данных для настроек приложения
    const getDB = window.getDB;
    if (getDB) {
      this.db = getDB();
      if (this.db) {
        this.settings = this.db.getAppSettings();
        if (!this.settings) {
          this.settings = this.createDefaultSettings();
          this.db.saveAppSettings(this.settings);
        }
      }
    }

    // Создаем главную секцию
    const section = new Section({ title: 'Настройки и внешний вид' });
    const sectionElement = section.render();
    sectionElement.className += ' modern-settings-panel';

    const content = document.createElement('div');
    content.className = 'modern-settings-content page-sections-layout';

    const hero = document.createElement('div');
    hero.className = 'page-sections-hero';
    const heroTitle = document.createElement('h2');
    heroTitle.className = 'page-sections-hero-title';
    heroTitle.textContent = 'Оформление и поведение';
    hero.appendChild(heroTitle);
    const heroLead = document.createElement('p');
    heroLead.className = 'page-sections-hero-lead';
    heroLead.textContent =
      'Тема, акцент, шрифт, скругления, нижнее меню, валюта и очки, резервные копии. Каждое изменение сразу записывается в базу.';
    hero.appendChild(heroLead);
    const heroSteps = document.createElement('ol');
    heroSteps.className = 'page-sections-hero-steps';
    ['Состав блоков на главной и других экранах — вкладка «Секции страниц» слева.', 'Порядок иконок в нижнем меню — карточка «Порядок страниц» ниже.'].forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      heroSteps.appendChild(li);
    });
    hero.appendChild(heroSteps);
    content.appendChild(hero);

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'page-sections-cards page-sections-cards--bento';

    cardsGrid.appendChild(await this.createCategoryCard({
      title: 'Тема и цвет',
      subtitle: 'Режим интерфейса, акцент и гарнитура.',
      icon: 'palette',
      items: [
        { label: 'Тема оформления', hint: 'Светлая, тёмная или как в системе.', control: await this.createThemeControl() },
        { label: 'Цвет акцента', hint: 'Кнопки, переключатели и выделения.', control: await this.createAccentControl() },
        { label: 'Шрифт', hint: 'Текст интерфейса.', control: await this.createFontControl() }
      ]
    }));

    cardsGrid.appendChild(await this.createCategoryCard({
      title: 'Форма и масштаб',
      subtitle: 'Скругления, фон и размер окна.',
      icon: 'radius',
      items: [
        { label: 'Скругление углов', hint: 'Карточки, поля и кнопки.', control: await this.createRadiusControl() },
        { label: 'Свечение фона', hint: 'Градиент за контентом; 0% — выкл.', control: await this.createGradientIntensityControl() },
        { label: 'Масштаб приложения', hint: 'Единый масштаб окна.', control: await this.createScaleControl() }
      ]
    }));

    cardsGrid.appendChild(await this.createCategoryCard({
      title: 'Нижнее меню',
      subtitle: 'Подписи, порядок вкладок, смена экранов.',
      icon: 'layout-list',
      items: [
        { label: 'Названия под иконками', hint: 'Показывать подписи вкладок.', control: await this.createBottomNavControl(), rowLayout: 'toggle' },
        { label: 'Порядок страниц', hint: 'Окно с перетаскиванием вкладок.', control: await this.createNavOrderControl() },
        { label: 'Анимация переходов', hint: 'Плавность при смене экрана.', control: await this.createPageTransitionsControl(), rowLayout: 'toggle' }
      ]
    }));

    cardsGrid.appendChild(await this.createCategoryCard({
      title: 'Данные и правила',
      subtitle: 'Валюта, очки, карточки задач, отладка.',
      icon: 'coins',
      groups: [
        {
          heading: 'Валюта и очки',
          items: [
            { label: 'Валюта', hint: 'Формат сумм на главной и в финансах.', control: await this.createCurrencyControl() },
            { label: 'Дата начала отчёта', hint: 'Отсчёт очков и рангов с даты.', control: await this.createDateControl() },
            { label: 'Часы редактирования', hint: 'Окно правок записей, влияющих на очки.', control: await this.createHoursControl() }
          ]
        },
        {
          heading: 'Экран и система',
          items: [
            { label: 'Скрыть процент на карточках задач', hint: 'Без кольца и числа выполнения.', control: await this.createTasksHidePercentControl(), rowLayout: 'toggle' },
            { label: 'Подсветка процентов изменений', hint: 'Зелёный/красный цвет в бейдже изменений категорий.', control: await this.createCategoryPercentHighlightControl(), rowLayout: 'toggle' },
            { label: 'DevTools по Tab', hint: 'Отладка: Tab открывает инструменты.', control: await this.createDevToolsTabControl(), rowLayout: 'toggle' }
          ]
        }
      ]
    }));

    const dbCard = await this.createDatabaseCard();
    dbCard.classList.add('settings-bento-span-full');
    cardsGrid.appendChild(dbCard);

    content.appendChild(cardsGrid);

    const foot = document.createElement('div');
    foot.className = 'page-sections-footnote';
    const footP = document.createElement('p');
    footP.className = 'page-sections-footnote-line';
    footP.textContent = 'Состав блоков на главной, в ритуалах, дневнике и рангах — в отдельном разделе «Секции страниц».';
    foot.appendChild(footP);
    content.appendChild(foot);

    sectionElement.appendChild(content);
    this.element = sectionElement;
    this.initialized = true;
  }

  async renderCategoryCardIcon(iconName) {
    const wrap = document.createElement('div');
    wrap.className = 'page-sections-page-icon';
    wrap.setAttribute('aria-hidden', 'true');
    try {
      const inner = await iconLoader.loadIcon(iconName);
      wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    } catch {
      wrap.innerHTML = '';
    }
    return wrap;
  }

  async createCategoryCard({ title, subtitle, icon, items, groups }) {
    const card = document.createElement('article');
    card.className = 'page-sections-page-card';
    const header = document.createElement('header');
    header.className = 'page-sections-page-header';
    header.appendChild(await this.renderCategoryCardIcon(icon));
    const headText = document.createElement('div');
    headText.className = 'page-sections-page-head-text';
    const h = document.createElement('h3');
    h.className = 'page-sections-page-title';
    h.textContent = title;
    headText.appendChild(h);
    const sub = document.createElement('p');
    sub.className = 'page-sections-page-subtitle';
    sub.textContent = subtitle;
    headText.appendChild(sub);
    header.appendChild(headText);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'page-sections-page-body';

    if (groups && groups.length) {
      for (const g of groups) {
        const groupEl = document.createElement('section');
        groupEl.className = 'settings-card-group';
        const gh = document.createElement('h4');
        gh.className = 'settings-card-group-title';
        gh.textContent = g.heading;
        groupEl.appendChild(gh);
        const gb = document.createElement('div');
        gb.className = 'settings-card-group-body';
        for (const item of g.items) {
          gb.appendChild(await this.buildCardFieldRow(item));
        }
        groupEl.appendChild(gb);
        body.appendChild(groupEl);
      }
    } else if (items && items.length) {
      for (const item of items) {
        body.appendChild(await this.buildCardFieldRow(item));
      }
    }

    card.appendChild(body);
    return card;
  }

  async buildCardFieldRow(item) {
    if (item.rowLayout === 'toggle') {
      return this.createToggleFieldRow(item.label, item.hint, item.control);
    }
    return this.createSettingField(item.label, item.control, item.hint);
  }

  async createToggleFieldRow(label, hint, control) {
    let controlEl = control;
    if (control && typeof control.then === 'function') {
      controlEl = await control;
    }
    const field = document.createElement('div');
    field.className = 'settings-field settings-inline-toggle-row';

    const textCol = document.createElement('div');
    textCol.className = 'settings-inline-toggle-text';
    const titleEl = document.createElement('div');
    titleEl.className = 'settings-field-label settings-inline-toggle-title';
    titleEl.textContent = label;
    textCol.appendChild(titleEl);
    if (hint) {
      const hintEl = document.createElement('p');
      hintEl.className = 'settings-inline-toggle-hint';
      hintEl.textContent = hint;
      textCol.appendChild(hintEl);
    }
    field.appendChild(textCol);

    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'settings-field-control';
    if (controlEl instanceof HTMLElement) {
      controlWrapper.appendChild(controlEl);
    }
    field.appendChild(controlWrapper);
    return field;
  }

  async createSettingField(label, control, hint) {
    const field = document.createElement('div');
    field.className = 'settings-card-field';

    const head = document.createElement('div');
    head.className = 'settings-card-field-head';
    const titleEl = document.createElement('div');
    titleEl.className = 'settings-card-field-title';
    titleEl.textContent = label;
    head.appendChild(titleEl);
    if (hint) {
      const hintEl = document.createElement('p');
      hintEl.className = 'settings-card-field-hint';
      hintEl.textContent = hint;
      head.appendChild(hintEl);
    }
    field.appendChild(head);

    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'settings-card-field-control';

    if (control instanceof HTMLElement) {
      controlWrapper.appendChild(control);
    } else if (control && typeof control.then === 'function') {
      const resolvedControl = await control;
      if (resolvedControl instanceof HTMLElement) {
        controlWrapper.appendChild(resolvedControl);
      }
    } else if (control) {
      controlWrapper.appendChild(control);
    }

    field.appendChild(controlWrapper);
    return field;
  }

  async createThemeControl() {
    const themeSwitcher = new ThemeSwitcher();
    return await themeSwitcher.render();
  }

  async createAccentControl() {
    const accentPicker = new AccentColorPicker();
    return await accentPicker.render();
  }

  async createFontControl() {
    const fontPicker = new FontPicker();
    return await fontPicker.render();
  }

  async createRadiusControl() {
    const radiusControls = new RadiusControls();
    return radiusControls.render();
  }

  async createGradientIntensityControl() {
    const MAX_PERCENT = 500; // 0% = выкл, 100% = норма, 500% = максимальное свечение
    const value = this.settings?.gradient_intensity;
    const normalized = value != null && value !== '' ? Math.max(0, Math.min(MAX_PERCENT / 100, Number(value))) : 1;
    const percent = Math.round(normalized * 100);

    const container = document.createElement('div');
    container.className = 'gradient-intensity-control';

    const slider = new Slider({ min: 0, max: MAX_PERCENT, value: percent });
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'gradient-intensity-value';
    valueDisplay.textContent = percent + '%';

    const sliderInput = slider.element.querySelector('input');
    if (sliderInput) {
      sliderInput.addEventListener('input', async (e) => {
        const p = parseInt(e.target.value, 10);
        valueDisplay.textContent = p + '%';
        const intensity = p / 100;
        if (this.settings) {
          this.settings.gradient_intensity = intensity;
          await this.saveSettings();
          ColorSystem.apply();
        }
      });
    }

    container.appendChild(slider.render());
    container.appendChild(valueDisplay);
    return container;
  }

  async createScaleControl() {
    const scaleControls = new ScaleControls();
    return scaleControls.render();
  }

  async createBottomNavControl() {
    const checkbox = new Checkbox({
      checked: this.settings?.bottom_nav_show_labels === 1 || this.settings?.bottom_nav_show_labels === true
    });
    const checkboxElement = checkbox.render();
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');
    
    checkboxInput.addEventListener('change', async (e) => {
      if (this.settings) {
        // SQLite хранит boolean как INTEGER (0 или 1)
        const newValue = e.target.checked ? 1 : 0;
        this.settings.bottom_nav_show_labels = newValue;
        console.log('[ModernSettingsPanel] Изменение настройки bottom_nav_show_labels:', newValue);
        await this.saveSettings();
        
        // Отправляем событие об изменении настройки нижнего меню
        console.log('[ModernSettingsPanel] Отправка события bottomNavDisplayChanged');
        window.dispatchEvent(new CustomEvent('bottomNavDisplayChanged', {
          detail: { 
            showLabels: e.target.checked
          }
        }));
      } else {
        console.warn('[ModernSettingsPanel] Настройки не загружены');
      }
    });
    
    return checkboxElement;
  }

  async createNavOrderControl() {
    const { default: NavOrderModal } = await import('./NavOrderModal.js');
    const openButton = new Button({
      text: 'Настроить порядок',
      onClick: async () => {
        await NavOrderModal.open();
      }
    });
    await openButton.init();
    return openButton.render();
  }

  async createPageTransitionsControl() {
    const checkbox = new Checkbox({
      checked: this.settings?.page_transitions_enabled !== 0 && this.settings?.page_transitions_enabled !== false
    });
    const checkboxElement = checkbox.render();
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');

    checkboxInput.addEventListener('change', async (e) => {
      if (this.settings) {
        const newValue = e.target.checked ? 1 : 0;
        this.settings.page_transitions_enabled = newValue;
        await this.saveSettings();
        window.dispatchEvent(new CustomEvent('pageTransitionsChanged', {
          detail: { enabled: e.target.checked }
        }));
      }
    });

    return checkboxElement;
  }

  async createCurrencyControl() {
    const currencyOptions = [
      { value: 'RUB', text: 'Российский рубль (₽)' },
      { value: 'USD', text: 'Доллар США ($)' },
      { value: 'EUR', text: 'Евро (€)' },
      { value: 'GBP', text: 'Фунт стерлингов (£)' },
      { value: 'JPY', text: 'Японская иена (¥)' },
      { value: 'CNY', text: 'Китайский юань (¥)' },
      { value: 'KZT', text: 'Казахстанский тенге (₸)' },
      { value: 'BYN', text: 'Белорусский рубль (Br)' },
      { value: 'PLN', text: 'Польский злотый (zł)' }
    ];
    
    const select = new Select({
      items: currencyOptions
    });
    
    const selectElement = await select.render();
    
    const currentCurrency = this.settings?.currency || 'RUB';
    if (select.customSelect) {
      const selectedIndex = currencyOptions.findIndex(opt => opt.value === currentCurrency);
      if (selectedIndex >= 0) {
        select.customSelect.selectOption(selectedIndex);
      }
      
      const originalSelectOption = select.customSelect.selectOption.bind(select.customSelect);
      select.customSelect.selectOption = (index) => {
        originalSelectOption(index);
        if (currencyOptions[index]) {
          this.settings.currency = currencyOptions[index].value;
          this.saveSettings();
        }
      };
    }
    
    return selectElement;
  }

  async createDateControl() {
    let currentValue = this.settings?.points_start_date;
    if (!currentValue && this.settings?.created_at) {
      const date = new Date(this.settings.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      currentValue = `${year}-${month}-${day}`;
    }
    
    const input = new Input({
      type: 'date',
      value: currentValue || ''
    });
    const inputElement = input.render();
    
    inputElement.addEventListener('change', async (e) => {
      const oldValue = this.settings?.points_start_date;
      if (this.settings) {
        this.settings.points_start_date = e.target.value || null;
        await this.saveSettings();
        
        // Отправляем событие об изменении даты начала отчета
        if (oldValue !== this.settings.points_start_date) {
          window.dispatchEvent(new CustomEvent('pointsStartDateChanged', {
            detail: { 
              oldValue: oldValue,
              newValue: this.settings.points_start_date 
            }
          }));
        }
      }
    });
    
    return inputElement;
  }

  async createHoursControl() {
    const input = new Input({
      type: 'number',
      value: this.settings?.points_open_hours || 48,
      min: 1,
      max: 168
    });
    const inputElement = input.render();
    
    inputElement.addEventListener('change', async (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 1 && value <= 168 && this.settings) {
        this.settings.points_open_hours = value;
        await this.saveSettings();
      }
    });
    
    return inputElement;
  }

  async createDevToolsTabControl() {
    const checkbox = new Checkbox({
      checked: this.settings?.devtools_tab_enabled === 1 || this.settings?.devtools_tab_enabled === true
    });
    const checkboxElement = checkbox.render();
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');
    
    checkboxInput.addEventListener('change', async (e) => {
      if (this.settings) {
        // SQLite хранит boolean как INTEGER (0 или 1)
        const newValue = e.target.checked ? 1 : 0;
        this.settings.devtools_tab_enabled = newValue;
        console.log('[ModernSettingsPanel] Изменение настройки devtools_tab_enabled:', newValue);
        await this.saveSettings();
        
        // Отправляем событие об изменении настройки DevTools Tab
        console.log('[ModernSettingsPanel] Отправка события devtoolsTabEnabledChanged');
        window.dispatchEvent(new CustomEvent('devtoolsTabEnabledChanged', {
          detail: { 
            enabled: e.target.checked
          }
        }));
      } else {
        console.warn('[ModernSettingsPanel] Настройки не загружены');
      }
    });
    
    return checkboxElement;
  }

  async createTasksHidePercentControl() {
    const checkbox = new Checkbox({
      checked: this.settings?.tasks_hide_completion_percent === 1 || this.settings?.tasks_hide_completion_percent === true
    });
    const checkboxElement = checkbox.render();
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');

    checkboxInput.addEventListener('change', async (e) => {
      if (this.settings) {
        const newValue = e.target.checked ? 1 : 0;
        this.settings.tasks_hide_completion_percent = newValue;
        await this.saveSettings();
        settingsChangeTracker.markChanged();
        window.dispatchEvent(new CustomEvent('task-categories-config-changed'));
      }
    });

    return checkboxElement;
  }

  async createCategoryPercentHighlightControl() {
    const checkbox = new Checkbox({
      checked: this.settings?.category_percent_highlight_enabled !== 0 && this.settings?.category_percent_highlight_enabled !== false
    });
    const checkboxElement = checkbox.render();
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');

    checkboxInput.addEventListener('change', async (e) => {
      if (this.settings) {
        const newValue = e.target.checked ? 1 : 0;
        this.settings.category_percent_highlight_enabled = newValue;
        await this.saveSettings();
        settingsChangeTracker.markChanged();
        window.dispatchEvent(new CustomEvent('task-categories-config-changed'));
      }
    });

    return checkboxElement;
  }

  async createDatabaseCard() {
    const card = document.createElement('article');
    card.className = 'page-sections-page-card';
    const header = document.createElement('header');
    header.className = 'page-sections-page-header';
    header.appendChild(await this.renderCategoryCardIcon('database'));
    const headText = document.createElement('div');
    headText.className = 'page-sections-page-head-text';
    const h = document.createElement('h3');
    h.className = 'page-sections-page-title';
    h.textContent = 'База данных';
    headText.appendChild(h);
    const sub = document.createElement('p');
    sub.className = 'page-sections-page-subtitle';
    sub.textContent = 'Резервная копия, экспорт и обслуживание локального хранилища.';
    headText.appendChild(sub);
    header.appendChild(headText);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'page-sections-page-body settings-card-field-database-body';

    const { default: DatabaseManagementModal } = await import('./DatabaseManagementModal.js');
    const openModalButton = new Button({
      iconName: 'database',
      text: 'Управление базой данных',
      onClick: async () => {
        await DatabaseManagementModal.open();
      }
    });
    const openModalButtonElement = await openModalButton.render();
    openModalButtonElement.className += ' database-management-button';
    openModalButtonElement.style.width = '100%';

    body.appendChild(openModalButtonElement);
    card.appendChild(body);
    return card;
  }


  createDefaultSettings() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;

    return {
      currency: 'RUB',
      points_start_date: defaultDate,
      points_open_hours: 48,
      bottom_nav_show_labels: 0,
      devtools_tab_enabled: 0,
      shadow_level: 'subtle',
      created_at: new Date().toISOString()
    };
  }

  async saveSettings() {
    try {
      if (this.db && this.settings) {
        this.db.saveAppSettings(this.settings);
        // Отмечаем изменения для отслеживания
        settingsChangeTracker.markChanged();
      }
    } catch (e) {
      console.error('[ModernSettingsPanel] Ошибка сохранения настроек:', e);
    }
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default ModernSettingsPanel;
