import Section from '../layout/Section.js';
import { iconLoader, colorConversion } from '../../utils/index.js';
import { EmptyState } from '../display/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';

const { hexToRgba, getIconBackgroundOpacity, applyIconBackground } = colorConversion;

class DiaryEntriesList {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[DiaryEntriesList] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[DiaryEntriesList] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.entries = [];
    this.currentYear = null;
    this.currentMonth = null;
    this.unsubscribe = null;
    this.scrollContainer = null; // Контейнер для прокрутки
    this.selectedDate = null; // Текущая выбранная дата
    this.cards = new Map(); // Карта карточек по дате для быстрого обновления
    this.isRendering = false; // Флаг для предотвращения одновременных вызовов render()
  }

  async init() {
    // Получаем начальную дату
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      const date = selectedDateState.getSelectedDate();
      this.currentYear = date.getFullYear();
      this.currentMonth = date.getMonth() + 1; // getMonth() возвращает 0-11
      this.selectedDate = selectedDateState.getSelectedDateString();
    } else {
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth() + 1;
      this.selectedDate = now.toISOString().split('T')[0];
    }

    // Создаем секцию с меткой месяца
    const monthLabel = this.getMonthLabel();
    this.section = new Section({ 
      title: 'Записи',
      titleBadges: [{ text: monthLabel }]
    });
    this.element = this.section.render();

    // Подписываемся на изменения даты
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        const newYear = date.getFullYear();
        const newMonth = date.getMonth() + 1;
        
        // Сохраняем позицию прокрутки перед обновлением
        let scrollPosition = 0;
        if (this.scrollContainer) {
          scrollPosition = this.scrollContainer.scrollTop;
        }
        
        // Проверяем, изменился ли месяц
        const monthChanged = newYear !== this.currentYear || newMonth !== this.currentMonth;
        const dateChanged = dateString !== this.selectedDate;
        
        // Сохраняем старую выбранную дату
        const oldSelectedDate = this.selectedDate;
        
        this.currentYear = newYear;
        this.currentMonth = newMonth;
        this.selectedDate = dateString;
        
        // Перезагружаем записи только если изменился месяц
        if (monthChanged) {
          // Обновляем метку месяца
          this.updateMonthBadge();
          await this.loadEntries();
          await this.render();
        } else if (dateChanged) {
          // Если месяц не изменился, но дата изменилась - просто обновляем подсветку
          // НЕ перерисовываем весь список, только обновляем классы
          this.updateSelection(oldSelectedDate, dateString);
        }
      });
    }

    // Загружаем записи
    await this.loadEntries();
    await this.render();

    // Регистрируем себя в глобальном объекте для уведомлений
    window.diaryEntriesList = this;

    // Также подписываемся на события (альтернативный способ)
    this.diaryEntryHandler = (e) => {
      const { date, changes, immediate } = e.detail;
      this.updateEntry(date, changes);
    };
    window.addEventListener('diaryEntryUpdated', this.diaryEntryHandler);

    // Подписываемся на изменения акцентного цвета и темы
    this.accentColorHandler = () => {
      this.updateIcons();
    };
    this.themeHandler = () => {
      this.updateIcons();
    };
    window.addEventListener('accentColorChanged', this.accentColorHandler);
    window.addEventListener('themeChanged', this.themeHandler);
  }

  /**
   * Форматирует месяц для отображения в метке
   * @returns {string} Форматированная строка месяца (например, "Январь 2024")
   */
  getMonthLabel() {
    const date = new Date(this.currentYear, this.currentMonth - 1, 1);
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(date);
  }

  /**
   * Обновляет метку месяца в заголовке секции
   */
  updateMonthBadge() {
    if (this.section) {
      const monthLabel = this.getMonthLabel();
      this.section.updateBadges([{ text: monthLabel }]);
    }
  }

  async loadEntries() {
    if (!this.db) {
      this.entries = [];
      return;
    }

    try {
      const allEntries = this.db.getDiaryEntriesByMonth(this.currentYear, this.currentMonth);
      
      // Фильтруем записи - показываем только те, у которых есть текст (хотя бы один символ)
      this.entries = allEntries.filter(entry => {
        const hasText = entry.text && entry.text.trim().length > 0;
        return hasText;
      });
      
      console.log(`[DiaryEntriesList] Загружено записей за ${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}: ${this.entries.length} из ${allEntries.length} (с текстом)`);
      if (this.entries.length > 0) {
        console.log(`[DiaryEntriesList] Первая запись:`, this.entries[0]);
      }
    } catch (error) {
      console.error('[DiaryEntriesList] Ошибка загрузки записей:', error);
      this.entries = [];
    }
  }

  async render() {
    // Защита от одновременных вызовов render()
    if (this.isRendering) {
      console.warn('[DiaryEntriesList] render() уже выполняется, пропускаем повторный вызов');
      return;
    }
    
    this.isRendering = true;
    
    try {
      // Удаляем все старые списки если есть
      // Удаляем все элементы с классом act-list
      const oldLists = this.element.querySelectorAll('.act-list');
      if (oldLists.length > 0) {
        console.log(`[DiaryEntriesList] render() - удаляем ${oldLists.length} старых списков`);
        oldLists.forEach(list => list.remove());
      }
      
      // Альтернативный способ: удаляем все дочерние элементы после заголовка
      // (на случай, если querySelectorAll не находит все элементы)
      const children = Array.from(this.element.children);
      // Пропускаем первый элемент (заголовок) и удаляем остальные
      for (let i = 1; i < children.length; i++) {
        children[i].remove();
      }
      
      // Создаем список в стиле act-list
      const list = document.createElement('div');
      list.className = 'act-list';
      
      const listItems = document.createElement('div');
      listItems.className = 'act-list-items';
      
      if (this.entries.length === 0) {
        const emptyState = new EmptyState({ type: 'diary' });
        await emptyState.init();
        listItems.appendChild(emptyState.render());
      } else {
        // Очищаем карту карточек перед созданием новых
        this.cards.clear();
        
        // Создаем карточки для каждой записи
        for (const entry of this.entries) {
          const card = await this.createEntryCard(entry);
          listItems.appendChild(card);
          // Сохраняем ссылку на карточку по дате
          this.cards.set(entry.date, card);
        }
      }
      
      list.appendChild(listItems);
      this.element.appendChild(list);
      
      // Сохраняем ссылку на контейнер прокрутки
      this.scrollContainer = listItems;
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Получить акцентный цвет из CSS переменной
   */
  getAccentColor() {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT;
  }

  async createEntryCard(entry) {
    const card = document.createElement('div');
    card.className = 'act-card';
    card.style.cursor = 'pointer';
    card.dataset.date = entry.date; // Сохраняем дату в data-атрибуте для быстрого поиска
    
    // Подсвечиваем выбранную запись акцентным цветом
    this.applySelection(card, entry.date);

    // Получаем категорию для иконки и цвета
    let categoryIcon = null;
    let categoryColor = this.getAccentColor();
    let categoryTitle = 'Без категории';

    if (entry.category_id && this.db) {
      const category = this.db.getById('cfg_diary_categories', entry.category_id);
      if (category) {
        categoryIcon = category.icon || null;
        categoryColor = category.color || this.getAccentColor();
        categoryTitle = category.title;
      }
    }

    // Иконка категории слева
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color';
    iconWrapper.dataset.categoryId = entry.category_id || ''; // Сохраняем ID категории для обновления
    
    // Сохраняем ссылки на элементы для обновления
    card._iconWrapper = iconWrapper;
    card._categoryId = entry.category_id;
    
    // Устанавливаем иконку и цвет
    await this.updateCardCategory(card, entry.category_id);
    
    card.appendChild(iconWrapper);
    
    // Контент карточки - двухстрочный layout
    const content = document.createElement('div');
    content.className = 'act-card-content diary-entry-content';
    
    // Левая часть: текст записи (две строки)
    const textWrapper = document.createElement('div');
    textWrapper.className = 'diary-entry-text-wrapper';
    textWrapper.style.flex = '1';
    textWrapper.style.minWidth = '0';
    textWrapper.style.display = 'flex';
    textWrapper.style.flexDirection = 'column';
    
    const text = document.createElement('span');
    text.className = 'act-card-title diary-entry-title';
    card._textElement = text; // Сохраняем ссылку на элемент текста
    
    // Устанавливаем текст (теперь будет две строки)
    this.updateCardText(card, entry.text || '');
    
    textWrapper.appendChild(text);
    content.appendChild(textWrapper);
    
    // Правая часть: настроение и дата
    const rightWrapper = document.createElement('div');
    rightWrapper.className = 'diary-entry-right-wrapper';
    rightWrapper.style.display = 'flex';
    rightWrapper.style.flexDirection = 'column';
    rightWrapper.style.alignItems = 'flex-end';
    rightWrapper.style.gap = '2px';
    rightWrapper.style.flexShrink = '0';
    
    // Настроение в виде точек
    const moodWrapper = document.createElement('div');
    moodWrapper.className = 'diary-entry-mood';
    card._moodWrapper = moodWrapper; // Сохраняем ссылку для обновления
    card._moodId = entry.mood_id || null; // Сохраняем mood_id в карточке для актуальности
    
    // Получаем настроение из БД
    let moodLevel = 0;
    if (entry.mood_id && this.db) {
      const mood = this.db.getById('cfg_diary_moods', entry.mood_id);
      if (mood && mood.level) {
        moodLevel = mood.level;
      }
    }
    
    // Создаем точки для настроения (максимум 5)
    const maxMoodLevel = 5;
    for (let i = 1; i <= maxMoodLevel; i++) {
      const dot = document.createElement('span');
      dot.className = 'diary-entry-mood-dot';
      dot.style.opacity = i <= moodLevel ? '0.8' : '0.2';
      moodWrapper.appendChild(dot);
    }
    
    rightWrapper.appendChild(moodWrapper);
    
    // Дата
    const dateItem = document.createElement('span');
    dateItem.className = 'act-card-data-item diary-entry-date';
    // Форматируем дату: день.месяц
    const dateObj = new Date(entry.date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    dateItem.textContent = `${day}.${month}`;
    dateItem.style.color = 'var(--color-on-surface-secondary)';
    dateItem.style.fontSize = 'var(--font-sm)';
    rightWrapper.appendChild(dateItem);
    
    content.appendChild(rightWrapper);
    
    card.appendChild(content);
    
    // Обработчик клика - переключаем дату и выделяем запись
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Переключаем выбранную дату
      const selectedDateState = window.selectedDateState;
      if (selectedDateState) {
        selectedDateState.setSelectedDate(entry.date);
        // Подсветка обновится автоматически через подписку в init()
      }
    });

    return card;
  }

  /**
   * Применить подсветку к карточке
   */
  applySelection(card, entryDate) {
    const selectedDateState = window.selectedDateState;
    const isSelected = selectedDateState && entryDate === selectedDateState.getSelectedDateString();
    
    if (isSelected) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  }

  /**
   * Обновить подсветку выбранной записи без перерисовки
   */
  updateSelection(oldDate, newDate) {
    // Убираем подсветку со старой карточки
    if (oldDate && this.cards.has(oldDate)) {
      const oldCard = this.cards.get(oldDate);
      this.applySelection(oldCard, oldDate);
    }
    
    // Добавляем подсветку новой карточке
    if (newDate && this.cards.has(newDate)) {
      const newCard = this.cards.get(newDate);
      this.applySelection(newCard, newDate);
    }
  }

  /**
   * Обновить иконку и цвет категории в карточке
   */
  async updateCardCategory(card, categoryId) {
    if (!card || !card._iconWrapper) {
      return;
    }

    let categoryIcon = null;
    let categoryColor = this.getAccentColor();

    if (categoryId && this.db) {
      const category = this.db.getById('cfg_diary_categories', categoryId);
      if (category) {
        categoryIcon = category.icon || null;
        categoryColor = category.color || this.getAccentColor();
      }
    }

    card._iconWrapper.dataset.categoryId = categoryId || '';
    applyIconBackground(card._iconWrapper, categoryColor);

    // Загружаем иконку
    if (categoryIcon) {
      try {
        const iconContent = await iconLoader.loadIcon(categoryIcon);
        card._iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        // Дефолтная иконка
        card._iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      // Дефолтная иконка
      card._iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }

    card._categoryId = categoryId;
  }

  /**
   * Обновить текст в карточке (мгновенно)
   */
  updateCardText(card, text) {
    if (!card || !card._textElement) {
      return;
    }

    const entryText = text || '';
    // Теперь показываем две строки (до ~100 символов или 2 строки)
    card._textElement.textContent = entryText;
    // Стили для двух строк будут в CSS через line-clamp
    
    if (!entryText) {
      card._textElement.textContent = 'Пустая запись';
      card._textElement.style.color = 'var(--color-on-surface-secondary)';
      card._textElement.style.fontStyle = 'italic';
    } else {
      card._textElement.style.color = '';
      card._textElement.style.fontStyle = '';
    }
  }

  /**
   * Обновить все иконки записей при изменении акцентного цвета или темы
   */
  async updateIcons() {
    // Обновляем иконки для всех карточек
    for (const [date, card] of this.cards.entries()) {
      if (card && card._iconWrapper) {
        await this.updateCardCategory(card, card._categoryId);
      }
    }
  }

  /**
   * Обновить запись в списке (вызывается из DiaryEntrySection)
   */
  async updateEntry(date, changes) {
    if (!this.cards.has(date)) {
      // Если карточки нет, возможно нужно перезагрузить список
      // Но только если это текущий месяц
      const entryDate = new Date(date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1;
      
      if (entryYear === this.currentYear && entryMonth === this.currentMonth) {
        // Перезагружаем только если это текущий месяц
        await this.loadEntries();
        await this.render();
      }
      return;
    }

    const card = this.cards.get(date);

    // Обновляем категорию если изменилась
    if (changes.category_id !== undefined && changes.category_id !== card._categoryId) {
      await this.updateCardCategory(card, changes.category_id);
    }

    // Обновляем текст если изменился
    if (changes.text !== undefined) {
      this.updateCardText(card, changes.text); // Мгновенно
    }

    // Обновляем настроение если изменилось
    if (changes.mood_id !== undefined && card._moodWrapper) {
      // Используем mood_level напрямую, если он передан, иначе читаем из БД
      const moodLevel = changes.mood_level !== undefined ? changes.mood_level : null;
      this.updateCardMood(card, changes.mood_id, moodLevel);
    }
  }

  /**
   * Обновить отображение настроения в карточке
   */
  updateCardMood(card, moodId, moodLevel = null) {
    if (!card || !card._moodWrapper) {
      return;
    }

    // Если moodLevel передан напрямую, используем его, иначе читаем из БД
    if (moodLevel === null || moodLevel === undefined) {
      moodLevel = 0;
      if (moodId && this.db) {
        const mood = this.db.getById('cfg_diary_moods', moodId);
        if (mood && mood.level) {
          moodLevel = mood.level;
        }
      }
    }

    // Сохраняем актуальный mood_id в карточке для использования при открытии модального окна
    card._moodId = moodId;

    // Обновляем точки настроения
    const dots = card._moodWrapper.querySelectorAll('.diary-entry-mood-dot');
    const maxMoodLevel = 5;
    dots.forEach((dot, index) => {
      const level = index + 1;
      dot.style.opacity = level <= moodLevel ? '0.8' : '0.2';
    });
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.cards.clear();
    
    // Удаляем глобальную ссылку
    if (window.diaryEntriesList === this) {
      window.diaryEntriesList = null;
    }
    
    // Удаляем обработчик событий
    if (this.diaryEntryHandler) {
      window.removeEventListener('diaryEntryUpdated', this.diaryEntryHandler);
      this.diaryEntryHandler = null;
    }
    if (this.accentColorHandler) {
      window.removeEventListener('accentColorChanged', this.accentColorHandler);
      this.accentColorHandler = null;
    }
    if (this.themeHandler) {
      window.removeEventListener('themeChanged', this.themeHandler);
      this.themeHandler = null;
    }
  }
}

export default DiaryEntriesList;

