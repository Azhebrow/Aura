import Section from '../layout/Section.js';
import Slider from '../form/Slider.js';
import SelectWithIcons from '../../composites/SelectWithIcons.js';
import { iconLoader } from '../../utils/index.js';
import eventBus from '../../system/core/EventBus.js';

class DiaryEntrySection {
  constructor() {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[DiaryEntrySection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[DiaryEntrySection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.section = null;
    this.moodSlider = null;
    this.categorySelect = null;
    this.textArea = null;
    this.currentDate = null;
    this.currentEntry = null;
    this.unsubscribe = null;
    this.isLoading = false; // Флаг для предотвращения сохранения при загрузке
  }

  async init() {
    // Получаем начальную дату
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.currentDate = selectedDateState.getSelectedDateString();
    } else {
      const now = new Date();
      this.currentDate = now.toISOString().split('T')[0];
    }

    // Создаем секцию без заголовка
    this.section = new Section({ title: '' });
    this.element = this.section.render();

    // Создаем контент
    await this.createContent();

    // Подписываемся на изменения даты
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        // Сохраняем текущую запись перед переключением даты (только если не загружаем)
        if (this.currentDate && this.currentDate !== dateString && !this.isLoading) {
          await this.saveEntry();
        }
        this.currentDate = dateString;
        await this.loadEntry();
      });
    }

    // Загружаем запись за текущий день
    await this.loadEntry();
  }

  async createContent() {
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--space-md)';
    content.style.height = '100%';

    // Верхняя панель с настроением и категорией
    const topPanel = document.createElement('div');
    topPanel.style.display = 'flex';
    topPanel.style.gap = 'var(--space-md)';
    topPanel.style.flexShrink = '0';

    // Ползунок настроения
    const moodContainer = document.createElement('div');
    moodContainer.style.flex = '1';
    moodContainer.style.display = 'flex';
    moodContainer.style.flexDirection = 'column';
    moodContainer.style.gap = 'var(--space-sm)';

    // Убрали label "Настроение" - и так все понятно

    // Загружаем настроения из БД
    const moods = this.db ? this.db.getAll('cfg_diary_moods') : [];
    const sortedMoods = moods.sort((a, b) => (a.level || 0) - (b.level || 0));
    const minLevel = sortedMoods.length > 0 ? sortedMoods[0].level : 0;
    const maxLevel = sortedMoods.length > 0 ? sortedMoods[sortedMoods.length - 1].level : 5;

    // Создаем контейнер для ползунка настроения в стиле select
    const moodSliderContainer = document.createElement('div');
    moodSliderContainer.className = 'mood-slider-wrapper';

    // Ползунок
    this.moodSlider = new Slider({
      min: minLevel,
      max: maxLevel,
      value: minLevel
    });
    const sliderElement = this.moodSlider.render();
    const sliderInput = sliderElement.querySelector('input[type="range"]');

    // Разделительная линия
    const divider = document.createElement('div');
    divider.className = 'mood-slider-divider';

    // Иконка настроения справа (показываем текущее настроение)
    const moodIcon = document.createElement('div');
    moodIcon.className = 'mood-slider-icon';
    if (sortedMoods.length > 0 && sortedMoods[0].icon) {
      this.loadMoodIcon(moodIcon, sortedMoods[0].icon);
    }

    // Обновляем иконку при изменении значения слайдера
    if (sliderInput) {
      sliderInput.addEventListener('input', async (e) => {
        const value = parseInt(e.target.value);
        const mood = sortedMoods.find(m => m.level === value) || sortedMoods[0];
        if (mood && mood.icon) {
          await this.loadMoodIcon(moodIcon, mood.icon);
        }
        // Уведомляем список об изменении настроения сразу с уровнем напрямую
        if (mood) {
          this.notifyListUpdate({ mood_id: mood.id, mood_level: mood.level }, true);
        }
        // Сохраняем моментально
        this.saveEntry();
      });
    }

    moodSliderContainer.appendChild(sliderElement);
    moodSliderContainer.appendChild(divider);
    moodSliderContainer.appendChild(moodIcon);

    // Сохраняем ссылку на иконку для обновления при загрузке записи
    this.moodIcon = moodIcon;
    this.sortedMoods = sortedMoods;

    moodContainer.appendChild(moodSliderContainer);

    // Выпадающий список категории
    const categoryContainer = document.createElement('div');
    categoryContainer.style.flex = '1';
    categoryContainer.style.display = 'flex';
    categoryContainer.style.flexDirection = 'column';
    categoryContainer.style.gap = 'var(--space-sm)';

    // Убрали label "Категория" - и так все понятно

    // Загружаем категории из БД
    const categories = this.db ? this.db.getAll('cfg_diary_categories') : [];
    const categoryItems = await Promise.all(categories.map(async (cat) => {
      let icon = '';
      if (cat.icon) {
        try {
          icon = await iconLoader.loadIcon(cat.icon);
        } catch (e) {
          console.warn(`[DiaryEntrySection] Не удалось загрузить иконку ${cat.icon}:`, e);
        }
      }
      return {
        value: cat.id,
        text: cat.title,
        icon: icon
      };
    }));

    this.categorySelect = new SelectWithIcons({
      items: categoryItems.length > 0 ? categoryItems : [{ value: '', text: 'Нет категорий' }]
    });
    const selectElement = await this.categorySelect.render();
    
    // Сохраняем моментально при изменении выбора категории
    if (this.categorySelect.customSelect) {
      // Сохраняем оригинальный метод selectOption
      const originalSelectOption = this.categorySelect.customSelect.selectOption.bind(this.categorySelect.customSelect);
      this.categorySelect.customSelect.selectOption = (index) => {
        originalSelectOption(index);
        // Сохраняем моментально
        this.saveEntry();
        // Уведомляем список об изменении категории сразу
        const categories = this.db.getAll('cfg_diary_categories');
        if (categories[index]) {
          this.notifyListUpdate({ category_id: categories[index].id }, true);
        }
      };
    }

    categoryContainer.appendChild(selectElement);

    topPanel.appendChild(moodContainer);
    topPanel.appendChild(categoryContainer);

    // Текстовое поле
    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';
    textContainer.style.display = 'flex';
    textContainer.style.flexDirection = 'column';
    textContainer.style.minHeight = '0';

    this.textArea = document.createElement('textarea');
    this.textArea.style.flex = '1';
    this.textArea.style.width = '100%';
    this.textArea.style.minHeight = '200px';
    this.textArea.style.padding = 'var(--space-md)';
    this.textArea.style.backgroundColor = 'var(--color-element)';
    this.textArea.style.border = 'var(--border-width) solid var(--color-border)';
    this.textArea.style.borderRadius = 'var(--radius)';
    this.textArea.style.color = 'var(--color-on-surface)';
    this.textArea.style.fontSize = 'var(--font-base)';
    this.textArea.style.fontFamily = 'inherit';
    this.textArea.style.resize = 'none';
    this.textArea.style.boxSizing = 'border-box';
    this.textArea.style.outline = 'none';
    this.textArea.style.transition = 'none';
    this.textArea.placeholder = 'Введите текст записи...';

    // Моментальное сохранение при вводе
    this.textArea.addEventListener('input', () => {
      this.saveEntry();
      // Уведомляем список об изменении текста мгновенно
      this.notifyListUpdate({ text: this.textArea.value }, true);
    });

    textContainer.appendChild(this.textArea);

    content.appendChild(topPanel);
    content.appendChild(textContainer);

    this.element.appendChild(content);
  }

  async loadMoodIcon(container, iconName) {
    try {
      const icon = await iconLoader.loadIcon(iconName);
      container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">${icon}</svg>`;
    } catch (e) {
      console.warn(`[DiaryEntrySection] Не удалось загрузить иконку настроения ${iconName}:`, e);
    }
  }

  async loadEntry() {
    if (!this.db) {
      return;
    }

    try {
      // Устанавливаем флаг загрузки, чтобы не сохранять при заполнении полей
      this.isLoading = true;
      
      const entry = this.db.getDiaryEntry(this.currentDate);
      this.currentEntry = entry;

      if (entry) {
        // Загружаем настроение
        if (entry.mood_id && this.moodSlider) {
          const mood = this.db.getById('cfg_diary_moods', entry.mood_id);
          if (mood && this.moodSlider.element) {
            const sliderInput = this.moodSlider.element.querySelector('input[type="range"]');
            if (sliderInput) {
              sliderInput.value = mood.level || 0;
              // Обновляем иконку настроения
              if (mood.icon && this.moodIcon) {
                await this.loadMoodIcon(this.moodIcon, mood.icon);
              }
            }
          }
        }

        // Загружаем категорию
        if (entry.category_id && this.categorySelect && this.categorySelect.customSelect) {
          // Находим индекс категории
          const categories = this.db.getAll('cfg_diary_categories');
          const index = categories.findIndex(cat => cat.id === entry.category_id);
          if (index >= 0) {
            // Временно отключаем сохранение при загрузке
            const originalSelectOption = this.categorySelect.customSelect.selectOption.bind(this.categorySelect.customSelect);
            this.categorySelect.customSelect.selectOption = originalSelectOption;
            this.categorySelect.customSelect.selectOption(index);
            // Восстанавливаем сохранение
            this.categorySelect.customSelect.selectOption = (idx) => {
              originalSelectOption(idx);
              // Сохраняем моментально
              this.saveEntry();
            };
          }
        }

        // Загружаем текст
        if (this.textArea) {
          this.textArea.value = entry.text || '';
        }
      } else {
        // Очищаем поля если записи нет
        if (this.moodSlider && this.moodSlider.element) {
          const sliderInput = this.moodSlider.element.querySelector('input[type="range"]');
          if (sliderInput && this.sortedMoods && this.sortedMoods.length > 0) {
            sliderInput.value = this.sortedMoods[0].level || 0;
            // Обновляем иконку на первую
            if (this.sortedMoods[0].icon && this.moodIcon) {
              await this.loadMoodIcon(this.moodIcon, this.sortedMoods[0].icon);
            }
          }
        }
        if (this.categorySelect && this.categorySelect.customSelect) {
          this.categorySelect.customSelect.selectOption(0);
        }
        if (this.textArea) {
          this.textArea.value = '';
        }
      }
      
      // Снимаем флаг загрузки после завершения
      this.isLoading = false;
    } catch (error) {
      console.error('[DiaryEntrySection] Ошибка загрузки записи:', error);
      this.isLoading = false;
    }
  }

  async saveEntry() {
    if (!this.db) {
      return;
    }

    // Не сохраняем во время загрузки записи
    if (this.isLoading) {
      return;
    }

    try {
      // Получаем значения
      let moodId = null;
      let moodLevel = null;
      if (this.moodSlider && this.moodSlider.element) {
        const sliderInput = this.moodSlider.element.querySelector('input[type="range"]');
        if (sliderInput) {
          const level = parseInt(sliderInput.value);
          moodLevel = level;
          const moods = this.db.getAll('cfg_diary_moods');
          const mood = moods.find(m => m.level === level);
          if (mood) {
            moodId = mood.id;
          }
        }
      }

      let categoryId = null;
      if (this.categorySelect && this.categorySelect.customSelect) {
        const selectedIndex = this.categorySelect.customSelect.selectedIndex;
        const categories = this.db.getAll('cfg_diary_categories');
        if (categories[selectedIndex]) {
          categoryId = categories[selectedIndex].id;
        }
      }

      const text = this.textArea ? this.textArea.value : '';

      // Сохраняем запись только если есть реальные данные:
      // - введен хотя бы один символ текста, ИЛИ
      // - выбрано настроение (не дефолтное), ИЛИ  
      // - выбрана категория
      const hasText = text.trim().length > 0;
      const hasMood = moodId !== null;
      const hasCategory = categoryId !== null;
      
      if (hasText || hasMood || hasCategory) {
        const id = this.currentEntry ? this.currentEntry.id : `diary_${this.currentDate.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.db.saveDiaryEntry({
          id: id,
          date: this.currentDate,
          mood_id: moodId,
          category_id: categoryId,
          text: text.trim() || null
        });

        // Обновляем текущую запись
        this.currentEntry = this.db.getDiaryEntry(this.currentDate);
        
        console.log(`[DiaryEntrySection] Запись сохранена для ${this.currentDate}:`, { moodId, categoryId, textLength: text.length });
        
        // Отправляем событие через eventBus для обновления календаря
        eventBus.emit('diaryEntryUpdated', {
          date: this.currentDate,
          data: {
            mood_id: moodId,
            category_id: categoryId,
            text: text.trim() || null
          },
          action: this.currentEntry ? 'update' : 'create'
        }, { immediate: true });
        
        // Уведомляем список записей об обновлении напрямую
        this.notifyListUpdate({
          mood_id: moodId,
          mood_level: moodLevel,
          category_id: categoryId,
          text: text.trim() || null
        });
      } else if (this.currentEntry) {
        // Удаляем запись если все поля пустые
        this.db.deleteDiaryEntry(this.currentDate);
        this.currentEntry = null;
        console.log(`[DiaryEntrySection] Запись удалена для ${this.currentDate}`);
        
        // Отправляем событие через eventBus для обновления календаря
        eventBus.emit('diaryEntryUpdated', {
          date: this.currentDate,
          data: null,
          action: 'delete'
        }, { immediate: true });
        
        // Уведомляем список записей об обновлении
        const selectedDateState = window.selectedDateState;
        if (selectedDateState) {
          setTimeout(() => {
            const currentDate = selectedDateState.getSelectedDate();
            selectedDateState.setSelectedDate(currentDate);
          }, 100);
        }
      }
    } catch (error) {
      console.error('[DiaryEntrySection] Ошибка сохранения записи:', error);
    }
  }

  /**
   * Уведомить список записей об обновлении
   */
  notifyListUpdate(changes, immediate = false) {
    // Ищем DiaryEntriesList через глобальный объект или событие
    if (window.diaryEntriesList && typeof window.diaryEntriesList.updateEntry === 'function') {
      window.diaryEntriesList.updateEntry(this.currentDate, changes);
    } else {
      // Альтернативный способ - через событие
      window.dispatchEvent(new CustomEvent('diaryEntryUpdated', {
        detail: {
          date: this.currentDate,
          changes: changes,
          immediate: immediate
        }
      }));
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export default DiaryEntrySection;

