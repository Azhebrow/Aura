import Section from '../../components/layout/Section.js';
import ModernSettingsPanel from '../../components/settings/ModernSettingsPanel.js';
import NutritionGoalsCompact from './NutritionGoalsCompact.js';
import CfgList from '../../components/cfg/CfgList.js';
import SettingsInfoBlock from '../../components/settings/SettingsInfoBlock.js';
import IconPickerButton from '../../components/cfg/IconPickerButton.js';
import ColorPickerButton from '../../components/cfg/ColorPickerButton.js';
import Checkbox from '../../components/form/Checkbox.js';
import { validateTaskCategoryColor } from '../../design-system/tokens/UnifiedColorPalette.js';
import { CFG_CONFIGS } from '../../system/database/cfg-configs.js';
import { SETTINGS_SECTIONS } from './settings-sections-config.js';
import { SETTINGS_INFO } from './settings-info-config.js';
import { settingsChangeTracker, taskCategoriesConfigService } from '../../system/services/index.js';
import pageSectionsVisibilityService from '../../system/services/PageSectionsVisibilityService.js';
import { iconLoader } from '../../utils/index.js';

class SettingsContent {
  constructor(options = {}) {
    this.sections = new Map();
    this.currentSectionId = null;
    this.element = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'settings-content';

    // Создаем секции
    await this.createSections();

    this.element = container;
    this.initialized = true;
  }

  async createSections() {
    // Современная панель "Настройки и внешний вид"
    const modernPanel = new ModernSettingsPanel();
    await modernPanel.init();
    const modernElement = await modernPanel.render();
    
    // Сохраняем панель под обоими ID для обратной совместимости
    this.sections.set('app-settings', modernElement);
    this.sections.set('appearance', modernElement);

    // Создаем CFG секции из декларативной конфигурации
    for (const sectionConfig of SETTINGS_SECTIONS) {
      await this.createCfgSection(
        sectionConfig.id,
        sectionConfig.title,
        sectionConfig.configKey
      );
    }

    await this.createPageSectionsVisibilitySection();
  }

  async createPageSectionsVisibilitySection() {
    const state = JSON.parse(JSON.stringify(pageSectionsVisibilityService.getFromDb()));

    const persist = () => {
      pageSectionsVisibilityService.saveVisibility(state);
      settingsChangeTracker.markChanged();
    };

    const addCheckboxRow = (parent, labelText, hintText, read, write, canUncheck = () => true) => {
      const checkbox = new Checkbox({ checked: !!read() });
      const checkboxElement = checkbox.render();
      const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');
      checkboxInput.addEventListener('change', () => {
        if (!checkboxInput.checked && !canUncheck()) {
          checkboxInput.checked = true;
          return;
        }
        write(checkboxInput.checked);
        persist();
      });

      const field = document.createElement('div');
      field.className = 'settings-field settings-inline-toggle-row';
      const textCol = document.createElement('div');
      textCol.className = 'settings-inline-toggle-text';
      const labelElement = document.createElement('div');
      labelElement.className = 'settings-field-label settings-inline-toggle-title';
      labelElement.textContent = labelText;
      textCol.appendChild(labelElement);
      if (hintText) {
        const hintEl = document.createElement('p');
        hintEl.className = 'settings-inline-toggle-hint';
        hintEl.textContent = hintText;
        textCol.appendChild(hintEl);
      }
      field.appendChild(textCol);
      const controlWrapper = document.createElement('div');
      controlWrapper.className = 'settings-field-control';
      controlWrapper.appendChild(checkboxElement);
      field.appendChild(controlWrapper);
      parent.appendChild(field);
    };

    const renderPageIcon = async (iconName) => {
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
    };

    const buildPageCard = async ({ title, subtitle, icon, rows }) => {
      const card = document.createElement('article');
      card.className = 'page-sections-page-card';
      const header = document.createElement('header');
      header.className = 'page-sections-page-header';
      header.appendChild(await renderPageIcon(icon));
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
      rows.forEach((row) => {
        addCheckboxRow(body, row.label, row.hint, row.read, row.write, row.canUncheck);
      });
      card.appendChild(body);
      return card;
    };

    const section = new Section({ title: 'Секции страниц' });
    const root = section.render();
    root.className = `${root.className} modern-settings-panel`.trim();

    const wrap = document.createElement('div');
    wrap.className = 'modern-settings-content page-sections-layout';

    const hero = document.createElement('div');
    hero.className = 'page-sections-hero';
    const heroTitle = document.createElement('h2');
    heroTitle.className = 'page-sections-hero-title';
    heroTitle.textContent = 'Что показывать на экранах';
    hero.appendChild(heroTitle);
    const heroLead = document.createElement('p');
    heroLead.className = 'page-sections-hero-lead';
    heroLead.textContent =
      'Ниже — по одной карточке на каждую вкладку нижнего меню. Переключатель скрывает только блок на экране; записи в базе не удаляются.';
    hero.appendChild(heroLead);
    const heroSteps = document.createElement('ol');
    heroSteps.className = 'page-sections-hero-steps';
    ['Сохранение срабатывает сразу при переключении.', 'Порядок вкладок меню настраивается в «Настройки и внешний вид» → «Порядок страниц».'].forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      heroSteps.appendChild(li);
    });
    hero.appendChild(heroSteps);
    wrap.appendChild(hero);

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'page-sections-cards page-sections-cards--quartet';

    cardsGrid.appendChild(await buildPageCard({
      title: 'Главная',
      subtitle: 'Сверху — категории задач. Ниже — карточки дня: планы, финансы, диаграмма.',
      icon: 'house',
      rows: [
        { label: 'Категории задач', hint: 'Рутина, фокус, тонус, детопс и т.д.', read: () => state.home.tasksCategories, write: (v) => { state.home.tasksCategories = v; } },
        { label: 'Планы на день', hint: 'Список дел и напоминаний на сегодня.', read: () => state.home.dailyPlans, write: (v) => { state.home.dailyPlans = v; } },
        { label: 'Финансы', hint: 'Сводка доходов и расходов за период.', read: () => state.home.transactions, write: (v) => { state.home.transactions = v; } },
        { label: 'Диаграмма прогресса', hint: 'Круговая диаграмма выполнения по категориям.', read: () => state.home.categoryProgressChart, write: (v) => { state.home.categoryProgressChart = v; } }
      ]
    }));

    cardsGrid.appendChild(await buildPageCard({
      title: 'Ритуалы',
      subtitle: 'Экран утренних и вечерних практик, обетов и целей.',
      icon: 'flame',
      rows: [
        { label: 'Ритуалы (утро / вечер)', hint: 'Чек-листы и тайминги ритуалов.', read: () => state.rituals.rituals, write: (v) => { state.rituals.rituals = v; } },
        { label: 'Обеты', hint: 'Список обетов и их статус.', read: () => state.rituals.vows, write: (v) => { state.rituals.vows = v; } },
        { label: 'Цели', hint: 'Цели с прогрессом и архивом.', read: () => state.rituals.goals, write: (v) => { state.rituals.goals = v; } }
      ]
    }));

    cardsGrid.appendChild(await buildPageCard({
      title: 'Дневник',
      subtitle: 'Поле ввода сверху и контент под вкладками «Записи» / «Питание».',
      icon: 'notebook',
      rows: [
        { label: 'Панель ввода записи', hint: 'Быстрый ввод настроения и текста.', read: () => state.diary.entryPanel, write: (v) => { state.diary.entryPanel = v; } },
        { label: 'Вкладка «Записи»', hint: 'Список дневниковых записей.', read: () => state.diary.contentEntries, write: (v) => { state.diary.contentEntries = v; }, canUncheck: () => state.diary.contentNutrition },
        { label: 'Вкладка «Питание»', hint: 'Журнал питания и цели КБЖУ.', read: () => state.diary.contentNutrition, write: (v) => { state.diary.contentNutrition = v; }, canUncheck: () => state.diary.contentEntries }
      ]
    }));

    cardsGrid.appendChild(await buildPageCard({
      title: 'Ранги',
      subtitle: 'Текущий уровень и история начисления очков.',
      icon: 'trophy',
      rows: [
        { label: 'Ранг', hint: 'Карточка уровня и до следующего ранга.', read: () => state.ranks.rank, write: (v) => { state.ranks.rank = v; }, canUncheck: () => state.ranks.pointsHistory },
        { label: 'История очков', hint: 'Таблица последних изменений очков.', read: () => state.ranks.pointsHistory, write: (v) => { state.ranks.pointsHistory = v; }, canUncheck: () => state.ranks.rank }
      ]
    }));

    wrap.appendChild(cardsGrid);

    const foot = document.createElement('div');
    foot.className = 'page-sections-footnote';
    const footP1 = document.createElement('p');
    footP1.className = 'page-sections-footnote-line';
    footP1.textContent = 'Таймер, статистика и настройки — отдельные экраны: здесь нет переключателей для их блоков.';
    const footP2 = document.createElement('p');
    footP2.className = 'page-sections-footnote-line';
    footP2.textContent = 'Порядок вкладок в нижнем меню: «Настройки и внешний вид» → поле «Порядок страниц в нижнем меню».';
    foot.appendChild(footP1);
    foot.appendChild(footP2);
    wrap.appendChild(foot);

    root.appendChild(wrap);
    this.sections.set('page-sections', root);
  }

  async createSingleTaskCategoryConfigBlock(categoryType) {
    const categoryLabels = { rituals: 'Рутина', time: 'Фокус', body: 'Тонус', deps: 'Детопс' };
    const config = taskCategoriesConfigService.getConfig();
    const rawColor = config[categoryType]?.color;
    const initialColor = validateTaskCategoryColor(rawColor);

    const wrapper = document.createElement('div');
    wrapper.className = 'task-category-cfg-block';

    // ── Как в ConfigModal.createEntityHeaderCard: иконка + название ──
    const headerCard = document.createElement('div');
    headerCard.className = 'cfg-entity-header-card';

    const headerRow = document.createElement('div');
    headerRow.className = 'cfg-entity-header-row';

    const iconPickerButton = new IconPickerButton({
      iconName: config[categoryType]?.icon || 'target',
      onChange: () => {}
    });
    await iconPickerButton.init();
    const iconButtonEl = await iconPickerButton.render();

    const iconContainer = document.createElement('button');
    iconContainer.className = 'cfg-entity-header-icon-btn';
    iconContainer.type = 'button';
    if (!config[categoryType]?.icon) {
      iconContainer.classList.add('empty');
    }
    if (iconButtonEl?.querySelector('svg')) {
      iconContainer.appendChild(iconButtonEl.querySelector('svg').cloneNode(true));
    }

    iconContainer.addEventListener('click', async () => {
      const currentIcon = iconPickerButton.getValue();
      const { default: IconPickerModal } = await import('../../components/cfg/IconPickerModal.js');
      IconPickerModal.open(currentIcon, (iconName) => {
        const oldSvg = iconContainer.querySelector('svg');
        if (oldSvg) oldSvg.remove();
        iconLoader.loadIcon(iconName).then((svgContent) => {
          const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          newSvg.setAttribute('viewBox', '0 0 24 24');
          newSvg.setAttribute('fill', 'none');
          newSvg.setAttribute('stroke', 'currentColor');
          newSvg.setAttribute('stroke-width', '2');
          newSvg.innerHTML = svgContent;
          iconContainer.appendChild(newSvg);
          if (iconName) {
            iconContainer.classList.remove('empty');
          } else {
            iconContainer.classList.add('empty');
          }
        });
        iconPickerButton.setIcon(iconName);
        saveField();
      });
    });

    const textSection = document.createElement('div');
    textSection.className = 'cfg-entity-header-text-section';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'cfg-entity-header-name';
    nameInput.placeholder = 'Название';
    nameInput.value = config[categoryType]?.title || categoryLabels[categoryType] || '';
    textSection.appendChild(nameInput);

    headerRow.appendChild(iconContainer);
    headerRow.appendChild(textSection);
    headerCard.appendChild(headerRow);
    wrapper.appendChild(headerCard);

    const saveField = () => {
      const newConfig = { ...taskCategoriesConfigService.getConfig() };
      newConfig[categoryType] = {
        title: nameInput.value?.trim() || newConfig[categoryType]?.title,
        icon: iconPickerButton.getValue() || newConfig[categoryType]?.icon,
        color: validateTaskCategoryColor(colorPicker.getValue())
      };
      taskCategoriesConfigService.saveConfig(newConfig);
      settingsChangeTracker.markChanged();
    };

    // ── Как в ConfigModal: строка «Цвет» + строка «Палитра» (ColorPickerButton) ──
    const colorPicker = new ColorPickerButton({
      cfgType: 'tasks-categories',
      showPalette: true,
      color: initialColor,
      onChange: () => {
        saveField();
      }
    });
    colorPicker.init();

    const table = document.createElement('table');
    table.className = 'cfg-form-table task-category-cfg-form-table';
    const tbody = document.createElement('tbody');

    const colorRow = document.createElement('tr');
    colorRow.className = 'cfg-form-row';
    const colorLabel = document.createElement('td');
    colorLabel.className = 'cfg-form-label';
    colorLabel.textContent = 'Цвет';
    const colorCell = document.createElement('td');
    colorCell.className = 'cfg-form-control';
    colorCell.appendChild(colorPicker.getButton());
    colorRow.appendChild(colorLabel);
    colorRow.appendChild(colorCell);
    tbody.appendChild(colorRow);

    const paletteEl = colorPicker.getPalette();
    if (paletteEl) {
      const paletteRow = document.createElement('tr');
      paletteRow.className = 'cfg-form-row cfg-form-row-palette';
      const paletteLabel = document.createElement('td');
      paletteLabel.className = 'cfg-form-label';
      paletteLabel.textContent = 'Палитра';
      const paletteCell = document.createElement('td');
      paletteCell.className = 'cfg-form-control';
      paletteCell.appendChild(paletteEl);
      paletteRow.appendChild(paletteLabel);
      paletteRow.appendChild(paletteCell);
      tbody.appendChild(paletteRow);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);

    nameInput.addEventListener('blur', saveField);
    nameInput.addEventListener('change', saveField);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
        saveField();
      }
    });
    let saveTimeout;
    nameInput.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveField, 400);
    });

    return wrapper;
  }

  async createCfgSection(sectionId, title, configKey) {
    if (CFG_CONFIGS && CFG_CONFIGS[configKey]) {
      const config = CFG_CONFIGS[configKey];
      const cfgList = new CfgList(config.tableName, config, configKey);
      cfgList.setDB(window.getDB);
      await cfgList.init();
      
      // Получаем кнопку добавления (если разрешено)
      const addButton = await cfgList.getAddButton();
      
      // Для ambient-music добавляем кнопку открытия папки
      let titleActions = addButton;
      if (configKey === 'ambient-music') {
        const openFolderBtn = document.createElement('button');
        openFolderBtn.className = 'btn';
        openFolderBtn.title = 'Открыть папку с файлами';
        openFolderBtn.style.cssText = `
          width: var(--height-control);
          height: var(--height-control);
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        
        // Загружаем иконку folder
        try {
          const { iconLoader } = await import('../../utils/index.js');
          const folderIcon = await iconLoader.loadIcon('folder').catch(() => '');
          if (folderIcon) {
            openFolderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${folderIcon}</svg>`;
          } else {
            openFolderBtn.textContent = '📁';
          }
        } catch (e) {
          openFolderBtn.textContent = '📁';
        }
        
        openFolderBtn.addEventListener('click', async () => {
          try {
            // Используем динамический импорт для ES модуля
            const AmbientManagerModule = await import('../../utils/AmbientManager.js');
            const AmbientManager = AmbientManagerModule.default || AmbientManagerModule;
            
            const ambientPath = AmbientManager.getAmbientPath();
            
            if (ambientPath && typeof window !== 'undefined' && window.require) {
              const { shell } = window.require('electron');
              // Открываем папку в проводнике
              await shell.openPath(ambientPath);
            } else {
              alert(`Путь к папке: ${ambientPath || 'не определен'}`);
            }
          } catch (e) {
            console.error('[SettingsContent] Ошибка открытия папки:', e);
            alert('Ошибка открытия папки. Проверьте консоль для деталей.');
          }
        });
        
        // Объединяем кнопки в массив
        if (addButton) {
          titleActions = [openFolderBtn, addButton];
        } else {
          titleActions = openFolderBtn;
        }
      }
      
      const section = new Section({ 
        title,
        titleActions: titleActions
      });
      const sectionElement = section.render();

      // Для категорий задач — сверху блок редактирования названия, иконки и цвета этой категории
      const taskCategoryMap = { 'tasks-rituals': 'rituals', 'tasks-time': 'time', 'tasks-body': 'body', 'tasks-deps': 'deps' };
      if (taskCategoryMap[sectionId]) {
        taskCategoriesConfigService.invalidateCache();
        const categoryBlock = await this.createSingleTaskCategoryConfigBlock(taskCategoryMap[sectionId]);
        sectionElement.appendChild(categoryBlock);
      }

      // Для «Продукты» добавляем компактную панель целей (калории, БЖУ) сверху
      if (sectionId === 'nutrition-products') {
        const goalsCompact = new NutritionGoalsCompact();
        const goalsEl = await goalsCompact.render();
        sectionElement.appendChild(goalsEl);
      }

      sectionElement.appendChild(cfgList.element);

      // Для ambient-music добавляем настройки музыки по умолчанию
      if (configKey === 'ambient-music') {
        const defaultMusicSettings = await this.createDefaultMusicSettings();
        if (defaultMusicSettings) {
          sectionElement.appendChild(defaultMusicSettings);
        }
      }

      // Информационный блок-подсказка (в нижней части секции)
      const infoConfig = SETTINGS_INFO[configKey];
      if (infoConfig) {
        const infoBlock = new SettingsInfoBlock(infoConfig);
        const infoEl = infoBlock.render();
        if (infoEl) {
          sectionElement.appendChild(infoEl);
        }
      }

      this.sections.set(sectionId, sectionElement);
    } else {
      // Fallback если конфиг не найден
      const section = new Section({ title });
      const sectionElement = section.render();
      this.sections.set(sectionId, sectionElement);
    }
  }

  async showSection(sectionId) {
    // Убеждаемся, что элемент инициализирован
    if (!this.element) {
      console.error('[SettingsContent] Элемент не инициализирован');
      return;
    }
    
    // Удаляем текущую секцию
    if (this.currentSectionId && this.sections.has(this.currentSectionId)) {
      const currentSection = this.sections.get(this.currentSectionId);
      if (currentSection && currentSection.parentNode === this.element) {
        this.element.removeChild(currentSection);
      }
    }

    // Для категорий задач — пересоздаём секцию при каждом показе (актуальные данные)
    // (отдельная вкладка "Название, иконка, цвет" убрана — редактор в каждой вкладке категории)

    // Показываем новую секцию
    if (this.sections.has(sectionId)) {
      const section = this.sections.get(sectionId);
      if (!section) {
        console.warn(`[SettingsContent] Секция "${sectionId}" ещё не создана`);
        return;
      }
      // Если секция уже в DOM, но не в нашем элементе, удаляем её оттуда
      if (section.parentNode && section.parentNode !== this.element) {
        section.parentNode.removeChild(section);
      }
      
      // Добавляем секцию, если её нет в DOM
      if (!section.parentNode) {
        this.element.appendChild(section);
      }
      
      this.currentSectionId = sectionId;
    } else {
      // Если секция не найдена, создаем пустую
      console.warn(`[SettingsContent] Секция "${sectionId}" не найдена`);
      const emptySection = new Section({ title: 'Секция не найдена' });
      this.element.appendChild(emptySection.render());
      this.currentSectionId = sectionId;
    }
  }

  async createDefaultMusicSettings() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[SettingsContent] База данных недоступна');
      return null;
    }
    
    const db = getDB();
    if (!db) {
      console.error('[SettingsContent] База данных не инициализирована');
      return null;
    }
    
    // Загружаем настройки приложения
    const settings = db.getAppSettings();
    if (!settings) {
      console.warn('[SettingsContent] Настройки приложения не найдены');
      return null;
    }
    
    // Загружаем список ambient музыки
    const ambientList = db.db.prepare('SELECT * FROM cfg_ambient_music ORDER BY name').all();
    
    // Создаем контейнер для настроек
    const container = document.createElement('div');
    container.className = 'ambient-default-settings';
    
    // Заголовок
    const title = document.createElement('h3');
    title.className = 'ambient-default-settings-title';
    title.textContent = 'Музыка по умолчанию';
    container.appendChild(title);
    
    // Импортируем компоненты
    const Select = (await import('../../components/form/Select.js')).default;
    
    // Создаем опции для селектов
    const selectItems = [
      { value: '', text: '-' },
      ...ambientList.map(ambient => ({
        value: String(ambient.id),
        text: ambient.name || `Ambient #${ambient.id}`
      }))
    ];
    
    // Функция для создания поля настройки
    const createSettingField = async (label, settingKey, currentValue) => {
      const field = document.createElement('div');
      field.className = 'ambient-default-setting-field';
      field.style.cssText = `
        flex: 1 1 0;
        min-width: 0;
      `;
      
      const labelEl = document.createElement('label');
      labelEl.className = 'ambient-default-setting-label';
      labelEl.textContent = label;
      field.appendChild(labelEl);
      
      const select = new Select({ items: selectItems });
      const selectElement = await select.render();
      selectElement.style.cssText = `
        width: 100%;
      `;
      
      // Устанавливаем текущее значение
      const selectNative = selectElement.querySelector('select');
      if (selectNative && currentValue) {
        selectNative.value = String(currentValue);
        if (select.customSelect) {
          const selectedIndex = selectItems.findIndex(item => item.value === String(currentValue));
          if (selectedIndex >= 0) {
            select.customSelect.selectOption(selectedIndex);
          }
        }
      }
      
      // Обработчик изменения
      if (selectNative) {
        selectNative.addEventListener('change', async () => {
          const newValue = selectNative.value ? parseInt(selectNative.value, 10) : null;
          if (settings) {
            settings[settingKey] = newValue;
            db.saveAppSettings(settings);
            console.log(`[SettingsContent] Сохранена настройка ${settingKey}:`, newValue);
            // Отмечаем изменения для отслеживания
            settingsChangeTracker.markChanged();
          }
        });
      }
      
      field.appendChild(selectElement);
      return field;
    };
    
    // Контейнер для полей (flex layout)
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'ambient-default-settings-fields';
    
    // Создаем поля для каждого типа
    const timerField = await createSettingField(
      'Для таймера',
      'ambient_default_timer',
      settings.ambient_default_timer
    );
    fieldsContainer.appendChild(timerField);
    
    const stopwatchField = await createSettingField(
      'Для секундомера',
      'ambient_default_stopwatch',
      settings.ambient_default_stopwatch
    );
    fieldsContainer.appendChild(stopwatchField);
    
    const breakField = await createSettingField(
      'Для перерыва',
      'ambient_default_break',
      settings.ambient_default_break
    );
    fieldsContainer.appendChild(breakField);
    
    container.appendChild(fieldsContainer);
    
    return container;
  }

  addSection(sectionId, sectionElement) {
    this.sections.set(sectionId, sectionElement);
  }

  render() {
    if (!this.initialized) {
      const container = document.createElement('div');
      container.className = 'settings-content';
      this.element = container;
    }
    return this.element;
  }
}

export default SettingsContent;

