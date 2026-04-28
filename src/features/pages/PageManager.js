import Section from '../../components/layout/Section.js';
import SettingsMenu from '../settings/SettingsMenu.js';
import SettingsContent from '../settings/SettingsContent.js';
import TransactionsSection from '../../components/act/TransactionsSection.js';
import DiaryEntrySection from '../../components/act/DiaryEntrySection.js';
import DiaryContentSection from '../../components/act/DiaryContentSection.js';
import RitualsSection from '../../components/act/RitualsSection.js';
import VowsSection from '../../components/act/VowsSection.js';
import GoalsSection from '../../components/act/GoalsSection.js';
import GoalsPanel from '../../components/act/GoalsPanel.js';
import DailyPlansSection from '../../components/act/DailyPlansSection.js';
import TimerTasksList from '../../components/act/TimerTasksList.js';
import TimerControl from '../../components/act/TimerControl.js';
import TimerSessionsList from '../../components/act/TimerSessionsList.js';
import GoalsModal from '../../components/act/GoalsModal.js';
import TasksCategoriesSection from '../../components/act/TasksCategoriesSection.js';
import RankSection from '../../components/act/RankSection.js';
import PointsHistoryTable from '../../components/act/PointsHistoryTable.js';
import CalendarModal from '../../components/display/CalendarModal.js';
import CategoryProgressChartSection from '../../components/act/CategoryProgressChartSection.js';
import pageSectionsVisibilityService from '../../system/services/PageSectionsVisibilityService.js';

class PageManager {
  constructor(container) {
    this.container = container;
    this.currentPage = null;
    this.currentPageId = null; // ID текущей страницы для проверки в BottomNavigation
    this.pages = new Map();
    this.init();
  }

  _wrapPageSection(sectionId, element, visible) {
    const wrap = document.createElement('div');
    wrap.className = 'page-section-wrap';
    wrap.dataset.pageSection = sectionId;
    if (!visible) wrap.classList.add('page-section--hidden');
    wrap.appendChild(element);
    return wrap;
  }

  _applySidebarColumnVisibility(pageEl, leftSection, rightSection, leftVisible, rightVisible) {
    leftSection.classList.toggle('page-section--hidden', !leftVisible);
    rightSection.classList.toggle('page-section--hidden', !rightVisible);
    pageEl.classList.toggle('layout-sidebar--single-column', !(leftVisible && rightVisible));
  }

  async init() {
    // Создаем страницы
    await this.createMainPage();
    await this.createRitualsPage();
    await this.createDiaryPage();
    await this.createTimerPage();
    await this.createRanksPage();
    await this.createStatsPage();
    await this.createSettingsPage();

    // Проверяем, есть ли сохраненная страница для перехода после перезагрузки
    const pendingPage = sessionStorage.getItem('aura_pending_page');
    if (pendingPage) {
      // Не показываем home, так как будет показана сохраненная страница из index.js
      // Просто устанавливаем currentPageId для корректной работы BottomNavigation
      this.currentPageId = pendingPage;
    } else {
      // По умолчанию показываем главную страницу
      this.showPage('home');
    }
  }

  async createMainPage() {
    const mainPage = document.createElement('div');
    mainPage.className = 'page-main layout-main';
    const sec = pageSectionsVisibilityService.getFromDb();

    // Первый ряд - одна секция на всю ширину
    const firstRow = document.createElement('div');
    firstRow.className = 'layout-row';

    // Секция категорий задач
    const selectedDateState = window.selectedDateState;
    const selectedDate = selectedDateState ? selectedDateState.getSelectedDateString() : null;
    const tasksCategoriesSection = new TasksCategoriesSection(selectedDate);
    await tasksCategoriesSection.init();
    firstRow.appendChild(this._wrapPageSection('home.tasksCategories', tasksCategoriesSection.element, sec.home.tasksCategories));
    this.tasksCategoriesSection = tasksCategoriesSection; // Сохраняем ссылку для обновления

    // Второй ряд - три секции равномерно
    const secondRow = document.createElement('div');
    secondRow.className = 'layout-row';

    // Секция транзакций
    const transactionsSection = new TransactionsSection(selectedDate);
    await transactionsSection.init();
    secondRow.appendChild(this._wrapPageSection('home.transactions', transactionsSection.element, sec.home.transactions));

    // Секция планов на день
    const dailyPlansSection = new DailyPlansSection(selectedDate);
    await dailyPlansSection.init();
    secondRow.appendChild(this._wrapPageSection('home.dailyPlans', dailyPlansSection.element, sec.home.dailyPlans));

    // Секция диаграммы прогресса категорий
    const categoryProgressChartSection = new CategoryProgressChartSection(selectedDate);
    await categoryProgressChartSection.init();
    secondRow.appendChild(this._wrapPageSection('home.categoryProgressChart', categoryProgressChartSection.element, sec.home.categoryProgressChart));
    this.categoryProgressChartSection = categoryProgressChartSection; // Сохраняем ссылку для обновления

    mainPage.appendChild(firstRow);
    mainPage.appendChild(secondRow);

    this.pages.set('home', mainPage);
  }

  async createRitualsPage() {
    const page = document.createElement('div');
    page.className = 'page-rituals';
    const sec = pageSectionsVisibilityService.getFromDb();

    const shell = document.createElement('div');
    shell.className = 'rituals-page-shell layout-sidebar';

    // Левая сторона - одна секция на всю высоту
    const leftSection = document.createElement('div');
    leftSection.className = 'layout-sidebar-left';

    // Секция ритуалов
    const ritualsSection = new RitualsSection();
    await ritualsSection.init();
    this.ritualsSection = ritualsSection;
    leftSection.appendChild(this._wrapPageSection('rituals.rituals', ritualsSection.element, sec.rituals.rituals));

    // Правая сторона: цели ~⅔ высоты, обеты ~⅓ (см. layout.css .page-rituals .layout-sidebar-right)
    const rightSection = document.createElement('div');
    rightSection.className = 'layout-sidebar-right';

    const goalsSection = new GoalsSection();
    await goalsSection.init();
    this.goalsSection = goalsSection;
    rightSection.appendChild(this._wrapPageSection('rituals.goals', goalsSection.element, sec.rituals.goals));

    const vowsSection = new VowsSection();
    await vowsSection.init();
    rightSection.appendChild(this._wrapPageSection('rituals.vows', vowsSection.element, sec.rituals.vows));

    const leftVis = sec.rituals.rituals;
    const rightVis = sec.rituals.vows || sec.rituals.goals;
    this._applySidebarColumnVisibility(shell, leftSection, rightSection, leftVis, rightVis);

    shell.appendChild(leftSection);
    shell.appendChild(rightSection);

    const goalsPanelHost = document.createElement('div');
    goalsPanelHost.className = 'rituals-goals-panel-host';
    goalsPanelHost.setAttribute('aria-hidden', 'true');

    const goalsPanel = new GoalsPanel(goalsPanelHost);
    this.goalsPanel = goalsPanel;

    page.appendChild(shell);
    page.appendChild(goalsPanelHost);

    // Сохраняем ссылки для управления
    this.ritualsPageElement = page;
    this.ritualsLayout = { leftSection, rightSection, page, shell, goalsPanelHost };

    this.pages.set('rituals', page);
  }

  async showGoalsPanel(selectedGoal = null) {
    if (!this.ritualsPageElement || !this.goalsPanel) return;

    const host = this.ritualsLayout.goalsPanelHost;
    if (host) host.setAttribute('aria-hidden', 'false');

    await this.goalsPanel.mount(selectedGoal, async () => {
      await this.hideGoalsPanel();
    });

    this.ritualsPageElement.classList.add('page-rituals--panel-open');
  }

  async hideGoalsPanel() {
    if (!this.ritualsPageElement || !this.goalsPanel) return;

    this.goalsPanel.unmountManagement();
    this.ritualsPageElement.classList.remove('page-rituals--panel-open');

    const host = this.ritualsLayout.goalsPanelHost;
    if (host) host.setAttribute('aria-hidden', 'true');

    if (this.goalsSection) {
      await this.goalsSection.loadGoals();
      await this.goalsSection.render();
    }
  }

  async createDiaryPage() {
    const page = document.createElement('div');
    page.className = 'page-diary layout-sidebar';
    const sec = pageSectionsVisibilityService.getFromDb();

    // Левая сторона - одна секция на всю высоту
    const leftSection = document.createElement('div');
    leftSection.className = 'layout-sidebar-left';

    // Секция ввода записи дневника
    const diaryEntrySection = new DiaryEntrySection();
    await diaryEntrySection.init();
    leftSection.appendChild(this._wrapPageSection('diary.entryPanel', diaryEntrySection.element, sec.diary.entryPanel));

    // Правая сторона - одна секция с переключением режимов
    const rightSection = document.createElement('div');
    rightSection.className = 'layout-sidebar-right';

    // Объединенная секция с переключением между записями и питанием
    const diaryContentSection = new DiaryContentSection({
      contentEntriesEnabled: sec.diary.contentEntries,
      contentNutritionEnabled: sec.diary.contentNutrition
    });
    await diaryContentSection.init();
    rightSection.appendChild(diaryContentSection.element);

    const leftVis = sec.diary.entryPanel;
    const rightVis = sec.diary.contentEntries || sec.diary.contentNutrition;
    this._applySidebarColumnVisibility(page, leftSection, rightSection, leftVis, rightVis);

    page.appendChild(leftSection);
    page.appendChild(rightSection);

    this.pages.set('diary', page);
  }

  async createTimerPage() {
    const page = document.createElement('div');
    page.className = 'page-timer layout-sidebar';

    // Левая сторона - объединенная монолитная секция с таймером и задачами
    const leftSection = document.createElement('div');
    leftSection.className = 'layout-sidebar-left';
    leftSection.style.display = 'flex';
    leftSection.style.flexDirection = 'column';
    leftSection.style.height = '100%';

    // Инициализируем компоненты
    const timerTasksList = new TimerTasksList();
    await timerTasksList.init();
    
    const timerControl = new TimerControl();
    await timerControl.init();
    
    // Сохраняем ссылки для доступа из других компонентов
    this.timerTasksList = timerTasksList;
    this.timerControl = timerControl;

    // Создаем единую монолитную секцию
    const Section = (await import('../../components/layout/Section.js')).default;
    const unifiedSection = new Section({ title: 'Таймер' });
    const unifiedSectionElement = unifiedSection.render();
    unifiedSectionElement.className = 'section timer-unified-section';
    unifiedSectionElement.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    `;

    // Заголовок: только «Таймер» и радиокнопки таймер/секундомер справа
    const timerRadioButton = timerControl.radioButton?.render();
    const timerHeaderRight = unifiedSection.getHeaderRight();
    if (timerHeaderRight) {
      timerHeaderRight.style.marginLeft = 'auto';
      if (timerRadioButton) timerHeaderRight.appendChild(timerRadioButton);
    }
    const headerEl = unifiedSectionElement.querySelector('.section-header');
    if (headerEl) headerEl.style.justifyContent = 'space-between';

    const tasksRadioButton = timerTasksList.radioButton?.render();

    // Контейнер контента: grid 50/50 по высоте, без обрезки
    const contentContainer = document.createElement('div');
    contentContainer.className = 'timer-unified-content';
    contentContainer.style.cssText = `
      display: grid;
      grid-template-rows: 1fr 1fr;
      flex: 1 1 0%;
      min-height: 0;
      overflow: hidden;
      padding: 0;
    `;

    // Верхняя ячейка grid — контент таймера (ровно половина высоты, без скролла)
    const timerContent = timerControl.contentElement;
    if (timerContent && timerContent.parentNode) {
      timerContent.parentNode.removeChild(timerContent);
      timerContent.style.cssText = 'min-height: 0; overflow: hidden; padding: var(--space-sm); display: flex; flex-direction: column; align-items: center; justify-content: center;';
      contentContainer.appendChild(timerContent);
    }

    // Нижняя ячейка grid — обёртка: разделитель + блок задач
    const bottomWrapper = document.createElement('div');
    bottomWrapper.className = 'timer-unified-bottom';
    bottomWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    `;

    const divider = document.createElement('div');
    divider.style.cssText = `
      width: 100%;
      height: 1px;
      background: var(--color-border);
      flex-shrink: 0;
      margin: var(--space-sm) 0;
    `;
    bottomWrapper.appendChild(divider);

    const tasksBlock = document.createElement('div');
    tasksBlock.className = 'timer-tasks-block';
    tasksBlock.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
      overflow: hidden;
    `;
    const tasksSubheader = document.createElement('div');
    tasksSubheader.className = 'timer-tasks-subheader';
    tasksSubheader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding-bottom: var(--space-sm);
      margin-bottom: var(--space-xs);
      min-width: 0;
      flex-shrink: 0;
    `;
    const tasksTitleEl = document.createElement('span');
    tasksTitleEl.className = 'page-title';
    tasksTitleEl.style.cssText = 'font-size: var(--font-md); font-weight: var(--font-medium); margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    tasksTitleEl.textContent = timerTasksList.titleMap[timerTasksList.activeTab] || timerTasksList.titleMap.escape;
    timerTasksList.setExternalTitleElement(tasksTitleEl);
    tasksSubheader.appendChild(tasksTitleEl);
    if (tasksRadioButton) {
      const tasksRight = document.createElement('div');
      tasksRight.style.marginLeft = 'auto';
      tasksRight.style.flexShrink = '0';
      tasksRight.appendChild(tasksRadioButton);
      tasksSubheader.appendChild(tasksRight);
    }
    tasksBlock.appendChild(tasksSubheader);

    const tasksContent = timerTasksList.contentElement;
    if (tasksContent && tasksContent.parentNode) {
      tasksContent.parentNode.removeChild(tasksContent);
      tasksContent.style.cssText = 'flex: 1 1 0%; min-height: 0; overflow: auto; padding: 0;';
      tasksBlock.appendChild(tasksContent);
    }
    bottomWrapper.appendChild(tasksBlock);
    contentContainer.appendChild(bottomWrapper);

    unifiedSectionElement.appendChild(contentContainer);
    leftSection.appendChild(unifiedSectionElement);
    
    // Скрываем секции компонентов, так как мы используем только их контент
    if (timerControl.element) {
      timerControl.element.style.display = 'none';
    }
    if (timerTasksList.element) {
      timerTasksList.element.style.display = 'none';
    }

    // Правая сторона - история сессий (на всю высоту)
    const rightSection = document.createElement('div');
    rightSection.className = 'layout-sidebar-right';

    const timerSessionsList = new TimerSessionsList();
    await timerSessionsList.init();
    timerSessionsList.element.style.height = '100%';
    rightSection.appendChild(timerSessionsList.element);

    // Связываем компоненты
    timerTasksList.setOnTaskSelect((task) => {
      timerControl.setSelectedTask(task);
    });

    // Автоматически выбираем первую задачу
    const firstTask = timerTasksList.getFirstTask();
    if (firstTask) {
      timerTasksList.selectTask(firstTask);
    }

    timerControl.setOnSessionComplete(async (session) => {
      // Сессия уже сохранена в TimerControl.completeSession()
      // Здесь просто обновляем UI
      
      // Обновляем список сессий
      await timerSessionsList.loadSessions();
      await timerSessionsList.render();
      
      // Обновляем список задач (чтобы обновить текущие значения)
      await timerTasksList.loadTasks();
      await timerTasksList.render();
    });

    page.appendChild(leftSection);
    page.appendChild(rightSection);

    this.pages.set('timer', page);
  }

  async createRanksPage() {
    const page = document.createElement('div');
    page.className = 'page-ranks layout-sidebar';
    const sec = pageSectionsVisibilityService.getFromDb();

    // Левая сторона - одна секция на всю высоту
    const leftSection = document.createElement('div');
    leftSection.className = 'layout-sidebar-left';

    const rankSection = new RankSection();
    await rankSection.init();
    leftSection.appendChild(this._wrapPageSection('ranks.rank', rankSection.element, sec.ranks.rank));

    // Правая сторона - таблица истории очков
    const rightSection = document.createElement('div');
    rightSection.className = 'layout-sidebar-right';

    const pointsHistoryTable = new PointsHistoryTable();
    await pointsHistoryTable.init();
    if (pointsHistoryTable.element) {
      rightSection.appendChild(this._wrapPageSection('ranks.pointsHistory', pointsHistoryTable.element, sec.ranks.pointsHistory));
    }

    this._applySidebarColumnVisibility(page, leftSection, rightSection, sec.ranks.rank, sec.ranks.pointsHistory);

    page.appendChild(leftSection);
    page.appendChild(rightSection);

    this.pages.set('ranks', page);
  }

  async createStatsPage() {
    try {
      console.log('[PageManager] Создание страницы статистики...');
      
      // Импортируем компонент статистики
      console.log('[PageManager] Импорт StatsPage...');
      const StatsPageModule = await import('../../components/stats/StatsPage.js');
      const StatsPage = StatsPageModule.default;
      console.log('[PageManager] StatsPage импортирован:', StatsPage);

      const statsPage = new StatsPage();
      console.log('[PageManager] StatsPage экземпляр создан');
      
      const statsElement = await statsPage.render();
      console.log('[PageManager] StatsPage render завершен, элемент:', statsElement);

      if (statsElement) {
        // StatsPage уже создает структуру с layout-control-panel, просто добавляем класс страницы
        statsElement.className = 'page-stats layout-control-panel';
        this.pages.set('stats', statsElement);
        console.log('[PageManager] Страница статистики создана и добавлена в pages');
      } else {
        console.error('[PageManager] StatsPage не вернул элемент');
        // Создаем пустую страницу с ошибкой
        const page = document.createElement('div');
        page.className = 'page-stats layout-control-panel';
        page.innerHTML = '<div style="padding: 20px; color: red;">Ошибка загрузки страницы статистики. StatsPage не вернул элемент. Проверьте консоль.</div>';
        this.pages.set('stats', page);
      }
    } catch (error) {
      console.error('[PageManager] Ошибка создания страницы статистики:', error);
      console.error('[PageManager] Stack:', error.stack);
      const page = document.createElement('div');
      page.className = 'page-stats layout-control-panel';
      page.innerHTML = `<div style="padding: 20px; color: red;">Ошибка загрузки страницы статистики: ${error.message}<br>Проверьте консоль для подробностей</div>`;
      this.pages.set('stats', page);
    }
  }

  async getTaskCategoryItems() {
    const { taskCategoriesConfigService } = await import('../../system/services/index.js');

    const categoryMap = {
      'tasks-rituals': 'rituals',
      'tasks-time': 'time',
      'tasks-body': 'body',
      'tasks-deps': 'deps'
    };

    return Object.entries(categoryMap).map(([itemId, categoryType]) => ({
      id: itemId,
      title: taskCategoriesConfigService.getTitle(categoryType),
      icon: taskCategoriesConfigService.getIcon(categoryType)
    }));
  }

  async createSettingsPage() {
    const settingsPage = document.createElement('div');
    settingsPage.className = 'page-settings layout-control-panel';

    const leftPanel = document.createElement('div');
    leftPanel.className = 'layout-panel-left';

    const rightPanel = document.createElement('div');
    rightPanel.className = 'layout-panel-right';

    // Создаем контент для настроек
    const settingsContent = new SettingsContent();
    await settingsContent.init();

    // Создаем меню настроек
    const settingsMenu = new SettingsMenu({
      categories: [
        {
          id: 'app-settings',
          title: 'Настройки и внешний вид',
          icon: 'settings'
        },
        {
          id: 'page-sections',
          title: 'Секции страниц',
          icon: 'layout-list'
        },
        {
          id: 'tasks',
          title: 'Категории задач',
          icon: 'list',
          items: await this.getTaskCategoryItems()
        },
        {
          id: 'rituals',
          title: 'Ритуалы и Обеты',
          icon: 'flame',
          items: [
            { id: 'rituals-morning', title: 'Утренние ритуалы', icon: 'sun' },
            { id: 'rituals-evening', title: 'Вечерние ритуалы', icon: 'moon' },
            { id: 'rituals-vows', title: 'Обеты', icon: 'heart' }
          ]
        },
        {
          id: 'diary',
          title: 'Дневник',
          icon: 'notebook',
          items: [
            { id: 'diary-categories', title: 'Категории', icon: 'notebook' },
            { id: 'diary-moods', title: 'Настроения', icon: 'heart' }
          ]
        },
        {
          id: 'leisure',
          title: 'Досуг',
          icon: 'gamepad',
          items: [
            { id: 'leisure-filling', title: 'Наполнение', icon: 'book' },
            { id: 'leisure-escape', title: 'Эскапизм', icon: 'video' }
          ]
        },
        {
          id: 'finance',
          title: 'Финансы',
          icon: 'wallet',
          items: [
            { id: 'finance-accounts', title: 'Счета', icon: 'wallet' },
            { id: 'finance-income', title: 'Доходы', icon: 'banknote-arrow-up' },
            { id: 'finance-expense', title: 'Расходы', icon: 'banknote-arrow-down' }
          ]
        },
        {
          id: 'ambient-music',
          title: 'Фоновая музыка',
          icon: 'music'
        },
        {
          id: 'nutrition',
          title: 'Питание',
          icon: 'apple',
          items: [
            { id: 'nutrition-products', title: 'Продукты', icon: 'package' },
            { id: 'nutrition-presets', title: 'Блюда', icon: 'utensils-crossed' }
          ]
        }
      ],
      onSelect: async (sectionId) => {
        await settingsContent.showSection(sectionId);
      }
    });

    const menuElement = await settingsMenu.render();
    const navPanel = document.createElement('div');
    navPanel.className = 'settings-nav-panel';
    const navHeading = document.createElement('div');
    navHeading.className = 'settings-nav-panel-heading';
    navHeading.textContent = 'Разделы';
    navPanel.appendChild(navHeading);
    navPanel.appendChild(menuElement);
    leftPanel.appendChild(navPanel);

    // Добавляем контент в правую панель
    rightPanel.appendChild(settingsContent.render());

    // Показываем первую секцию по умолчанию
    const firstCategory = settingsMenu.categories[0];
    if (firstCategory) {
      let firstItemId;
      if (!firstCategory.items || firstCategory.items.length === 0) {
        // Standalone категория
        firstItemId = firstCategory.id;
      } else {
        // Категория с подкатегориями
        firstItemId = firstCategory.items[0].id;
      }
      await settingsContent.showSection(firstItemId);
    }

    settingsPage.appendChild(leftPanel);
    settingsPage.appendChild(rightPanel);

    this.pages.set('settings', settingsPage);
  }

  // Вспомогательный метод для создания страниц с layout
  createPageWithLayout(pageClass, rowsConfig) {
    const page = document.createElement('div');
    page.className = `${pageClass} layout-container`;

    rowsConfig.forEach(rowConfig => {
      const row = document.createElement('div');
      row.className = 'layout-row';

      rowConfig.sections.forEach(sectionTitle => {
        const section = new Section({ title: sectionTitle });
        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'layout-section';
        sectionWrapper.appendChild(section.render());
        row.appendChild(sectionWrapper);
      });

      page.appendChild(row);
    });

    return page;
  }

  showPage(pageId, options = {}) {
    console.log('[PageManager] showPage вызван для:', pageId);
    
    // Проверяем изменения в БД при переходе на другую страницу
    // Перезагрузка нужна только при выходе со страницы настроек
    // (не проверяем если переходим на ту же страницу или это восстановление после перезагрузки)
    if (
      this.currentPageId &&
      this.currentPageId === 'settings' &&
      pageId !== 'settings' &&
      !options.skipReloadCheck
    ) {
      if (window.settingsChangeTracker && window.settingsChangeTracker.getHasChanges()) {
        const reloaded = window.settingsChangeTracker.checkAndReload(pageId);
        if (reloaded) {
          return; // Перезагрузка была инициирована, прерываем выполнение
        }
      }
    }
    
    // Закрываем модальное окно целей при смене страницы
    if (GoalsModal && GoalsModal.isOpen) {
      GoalsModal.close();
    }
    
    // Закрываем календарное модальное окно при смене страницы
    if (CalendarModal && CalendarModal.isOpen && CalendarModal.close) {
      CalendarModal.close();
    }
    
    const pageElement = this.pages.get(pageId);
    console.log('[PageManager] Найдена страница:', pageId, pageElement ? 'да' : 'нет');
    if (pageElement) {
      const transitionsEnabled = this.isPageTransitionsEnabled();
      // Очищаем контейнер и добавляем новую страницу
      this.container.innerHTML = '';
      this.container.appendChild(pageElement);
      this.currentPage = pageElement;
      this.currentPageId = pageId; // Сохраняем ID текущей страницы для проверки в BottomNavigation
      console.log('[PageManager] Страница добавлена в контейнер');

      if (transitionsEnabled) {
        this.container.classList.add('page-content--transitions');
        pageElement.classList.add('page-enter');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            pageElement.classList.add('page-enter-active');
          });
        });
        const onEnd = () => {
          pageElement.removeEventListener('transitionend', onEnd);
          pageElement.classList.remove('page-enter', 'page-enter-active');
          this.container.classList.remove('page-content--transitions');
        };
        pageElement.addEventListener('transitionend', onEnd);
        // fallback: убрать классы через 250ms, если transitionend не сработал
        setTimeout(onEnd, 260);
      }
      
      // Обновляем навигацию при программном переходе на страницу
      if (window.bottomNav && typeof window.bottomNav.setSelectedPage === 'function') {
        window.bottomNav.setSelectedPage(pageId);
      }
      
      // Обрабатываем специальные параметры для страниц
      if (pageId === 'rituals' && options.ritualType && this.ritualsSection) {
        // Устанавливаем тип ритуала при переходе на страницу ритуалов
        this.ritualsSection.setRitualType(options.ritualType);
      }

      // Если переходим на страницу настроек, не очищаем флаг изменений
      // (изменения остаются актуальными, если пользователь вернулся на страницу)
      // Флаг очищается только после перезагрузки в index.js
    }
  }

  isPageTransitionsEnabled() {
    try {
      const getDB = window.getDB;
      if (!getDB) return true;
      const db = getDB();
      const settings = db && db.getAppSettings ? db.getAppSettings() : null;
      const v = settings?.page_transitions_enabled;
      return v === undefined || v === null || v === 1 || v === true;
    } catch {
      return true;
    }
  }

  getPageElement(pageId) {
    return this.pages.get(pageId);
  }
}

export default PageManager;
