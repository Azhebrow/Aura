import Section from '../layout/Section.js';
import RadioButton from '../form/RadioButton.js';
import { Button } from '../form/index.js';
import { iconLoader } from '../../utils/index.js';
import DiaryEntriesList from './DiaryEntriesList.js';
import NutritionSection from './NutritionSection.js';
import NutritionEntryModal from './NutritionEntryModal.js';
import eventBus from '../../system/core/EventBus.js';

class DiaryContentSection {
  constructor(options = {}) {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[DiaryContentSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[DiaryContentSection] База данных не инициализирована');
      }
    }
    this.contentEntriesEnabled = options.contentEntriesEnabled !== false;
    this.contentNutritionEnabled = options.contentNutritionEnabled !== false;
    this.element = null;
    this.section = null;
    if (this.contentNutritionEnabled && !this.contentEntriesEnabled) {
      this.mode = 'nutrition';
    } else if (this.contentEntriesEnabled && !this.contentNutritionEnabled) {
      this.mode = 'entries';
    } else {
      this.mode = 'nutrition'; // 'nutrition' или 'entries' — по умолчанию Питание
    }
    this.diaryEntriesList = null;
    this.nutritionSection = null;
    this.contentElement = null;
    this.modeRadio = null;
    this.diaryTabsSingleMode = !(this.contentEntriesEnabled && this.contentNutritionEnabled);
    this.titleMap = {
      entries: 'Записи',
      nutrition: 'Питание'
    };
  }

  async init() {
    const entriesIcon = await iconLoader.loadIcon('file-text');
    const nutritionIcon = await iconLoader.loadIcon('apple');

    const radioItems = [];
    if (this.contentNutritionEnabled) {
      radioItems.push({ value: 'nutrition', icon: nutritionIcon });
    }
    if (this.contentEntriesEnabled) {
      radioItems.push({ value: 'entries', icon: entriesIcon });
    }

    if (radioItems.length > 1) {
      this.modeRadio = new RadioButton({
        name: 'diary-content-tab',
        iconOnly: true,
        value: this.mode,
        items: radioItems
      });

      const radioInputs = this.modeRadio.element.querySelectorAll('input[type="radio"]');
      radioInputs.forEach(input => {
        input.addEventListener('change', async () => {
          if (input.checked) {
            this.mode = input.value;
            this.updateTitleActions();
            this.updateSectionTitle();
            await this.render();
          }
        });
      });
    } else {
      this.modeRadio = null;
    }

    // Создаем кнопку добавления для режима питания
    // Кнопка добавления для питания теперь в заголовке NutritionSection
    // Не создаем отдельную кнопку здесь, чтобы избежать дублирования

    // Создаем секцию с начальным названием
    const initialTitle = this.titleMap[this.mode] || this.titleMap.nutrition;
    this.section = new Section({ 
      title: initialTitle
    });
    this.element = this.section.render();
    
    // Устанавливаем элементы действий в заголовке (после создания секции и кнопки)
    // Вызываем после создания всех компонентов
    
    // Создаем контейнер для контента
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'diary-content-container';
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.flex = '1';
    this.contentElement.style.minHeight = '0';
    this.contentElement.style.overflow = 'hidden';
    this.element.appendChild(this.contentElement);

    // Инициализируем секции (обе могут быть нужны для данных; скрытие только через UI)
    this.diaryEntriesList = null;
    this.nutritionSection = null;
    if (this.contentEntriesEnabled) {
      this.diaryEntriesList = new DiaryEntriesList();
      await this.diaryEntriesList.init();
    }

    if (this.contentNutritionEnabled) {
      this.nutritionSection = new NutritionSection();
      await this.nutritionSection.init();
    }

    // Скрываем заголовки вложенных секций
    if (this.diaryEntriesList && this.diaryEntriesList.section) {
      const entriesHeader = this.diaryEntriesList.element.querySelector('.section-header');
      if (entriesHeader) {
        entriesHeader.style.display = 'none';
      }
    }

    if (this.nutritionSection && this.nutritionSection.section) {
      const nutritionHeader = this.nutritionSection.element.querySelector('.section-header');
      if (nutritionHeader) {
        // Переносим кнопку добавления из заголовка NutritionSection в заголовок родительской секции
        const nutritionHeaderRight = nutritionHeader.querySelector('.section-header-right');
        if (nutritionHeaderRight && this.mode === 'nutrition') {
          const addButton = nutritionHeaderRight.querySelector('.btn');
          if (addButton) {
            // Переносим кнопку в заголовок родительской секции
            const parentHeaderRight = this.section.getHeaderRight();
            if (parentHeaderRight) {
              parentHeaderRight.innerHTML = '';
              parentHeaderRight.appendChild(addButton);
            }
          }
        }
        nutritionHeader.style.display = 'none';
      }
    }

    // Извлекаем контент из секций (сначала Питание, потом Записи)
    let entriesContent = null;
    let nutritionContent = null;
    if (this.nutritionSection) {
      nutritionContent = this.nutritionSection.element.querySelector('.section-content') || this.nutritionSection.element;
    }
    if (this.diaryEntriesList) {
      entriesContent = this.diaryEntriesList.element.querySelector('.section-content') || this.diaryEntriesList.element;
    }

    // Убеждаемся, что контент имеет правильную flex-структуру; порядок в DOM: Питание, затем Записи
    if (nutritionContent) {
      if (!nutritionContent.style.display || nutritionContent.style.display === 'block') {
        nutritionContent.style.display = 'flex';
      }
      nutritionContent.style.flexDirection = 'column';
      nutritionContent.style.flex = '1';
      nutritionContent.style.minHeight = '0';
      nutritionContent.style.display = this.mode === 'nutrition' ? 'flex' : 'none';
      this.contentElement.appendChild(nutritionContent);
    }

    if (entriesContent) {
      if (!entriesContent.style.display || entriesContent.style.display === 'block') {
        entriesContent.style.display = 'flex';
      }
      entriesContent.style.flexDirection = 'column';
      entriesContent.style.flex = '1';
      entriesContent.style.minHeight = '0';
      entriesContent.style.display = this.mode === 'entries' ? 'flex' : 'none';
      this.contentElement.appendChild(entriesContent);
    }

    // Сохраняем ссылки для переключения
    this.entriesContent = entriesContent;
    this.nutritionContent = nutritionContent;

    // Подписываемся на события обновления для синхронизации контента
    this.setupEventListeners();

    // Устанавливаем элементы действий в заголовке после инициализации всех компонентов
    this.updateTitleActions();

    // Первоначальный рендер
    await this.render();
  }

  setupEventListeners() {
    this.eventUnsubscribes = this.eventUnsubscribes || [];
    // Подписка на события обновления записей дневника
    const unsubscribeDiaryEntry = eventBus.on('diaryEntryUpdated', async () => {
      if (this.mode === 'entries' && this.diaryEntriesList) {
        // Обновляем контент записей
        await this.diaryEntriesList.render();
        // Обновляем бейджи
        this.updateSectionTitle();
      }
    });
    this.eventUnsubscribes.push(unsubscribeDiaryEntry);

    // Подписка на события обновления питания
    const unsubscribeNutrition = eventBus.on('nutritionEntryAdded', async () => {
      if (this.mode === 'nutrition' && this.nutritionSection) {
        await this.nutritionSection.loadEntries();
        await this.nutritionSection.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeNutrition);

    const unsubscribeNutritionDeleted = eventBus.on('nutritionEntryDeleted', async () => {
      if (this.mode === 'nutrition' && this.nutritionSection) {
        await this.nutritionSection.loadEntries();
        await this.nutritionSection.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeNutritionDeleted);

    // Подписка на изменения даты для обновления бейджей
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      const unsubscribeDate = selectedDateState.subscribe(async () => {
        // Обновляем заголовок для обоих режимов
        this.updateSectionTitle();
        // Если режим питания, обновляем записи
        if (this.mode === 'nutrition' && this.nutritionSection) {
          await this.nutritionSection.loadEntries();
          await this.nutritionSection.render();
        }
      });
      this.eventUnsubscribes.push(unsubscribeDate);
    }
  }

  updateSectionTitle() {
    if (!this.section) return;
    const newTitle = this.titleMap[this.mode] || this.titleMap.nutrition;
    this.section.updateTitle(newTitle);
    
    // Обновляем бейджи в зависимости от режима
    if (this.mode === 'entries' && this.diaryEntriesList) {
      // Получаем метку месяца из DiaryEntriesList
      const monthLabel = this.diaryEntriesList.getMonthLabel ? this.diaryEntriesList.getMonthLabel() : null;
      if (monthLabel) {
        this.section.updateBadges([{ text: monthLabel }]);
      } else {
        this.section.updateBadges(null);
      }
    } else if (this.mode === 'nutrition' && this.nutritionSection) {
      // Для питания показываем дату выбранного дня
      const selectedDateState = window.selectedDateState;
      if (selectedDateState) {
        const date = selectedDateState.getSelectedDate();
        const dateLabel = date.toLocaleDateString('ru-RU', { 
          day: 'numeric', 
          month: 'long',
          year: 'numeric'
        });
        this.section.updateBadges([{ text: dateLabel }]);
      } else {
        this.section.updateBadges(null);
      }
    } else {
      this.section.updateBadges(null);
    }

    // Обновляем кнопки в заголовке
    this.updateTitleActions();
  }

  updateTitleActions() {
    if (!this.section) {
      return;
    }
    
    const headerRight = this.section.getHeaderRight();
    if (!headerRight) {
      return;
    }

    // Очищаем существующие элементы действий
    headerRight.innerHTML = '';

    // Переключатель Питание / Записи — только если доступны оба режима
    if (this.modeRadio && !this.diaryTabsSingleMode) {
      const radioElement = this.modeRadio.render();
      if (radioElement) {
        headerRight.appendChild(radioElement);
      }
    }

    // В режиме питания добавляем кнопку добавления из NutritionSection
    if (this.mode === 'nutrition' && this.nutritionSection) {
      const nutritionHeader = this.nutritionSection.element.querySelector('.section-header');
      if (nutritionHeader) {
        const nutritionHeaderRight = nutritionHeader.querySelector('.section-header-right');
        if (nutritionHeaderRight) {
          const addButton = nutritionHeaderRight.querySelector('.btn');
          if (addButton && !headerRight.contains(addButton)) {
            headerRight.appendChild(addButton);
          }
        }
      }
    }
  }

  updateContentActions() {
    // Кнопка добавления теперь в заголовке родительской секции (перенесена из NutritionSection)
    // Не нужно добавлять кнопку в контент
  }

  async render() {
    if (!this.contentElement) return;
    
    // Переключаем видимость контента
    if (this.entriesContent) {
      const showEntries = this.contentEntriesEnabled && this.mode === 'entries';
      this.entriesContent.style.display = showEntries ? 'flex' : 'none';
    }
    
    if (this.nutritionContent) {
      const showNutrition = this.contentNutritionEnabled && this.mode === 'nutrition';
      this.nutritionContent.style.display = showNutrition ? 'flex' : 'none';
    }

    // Обновляем заголовок
    this.updateSectionTitle();
    // Обновляем кнопки в заголовке
    this.updateTitleActions();
    // Обновляем кнопки в контенте секции
    this.updateContentActions();
  }

  destroy() {
    // Отписываемся от событий
    if (this.eventUnsubscribes) {
      this.eventUnsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      this.eventUnsubscribes = [];
    }

    if (this.diaryEntriesList && typeof this.diaryEntriesList.destroy === 'function') {
      this.diaryEntriesList.destroy();
    }
    if (this.nutritionSection && typeof this.nutritionSection.destroy === 'function') {
      this.nutritionSection.destroy();
    }
    this.diaryEntriesList = null;
    this.nutritionSection = null;
  }
}

export default DiaryContentSection;
