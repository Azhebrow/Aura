import { Modal } from '../layout/index.js';
import Button from '../form/Button.js';
import Slider from '../form/Slider.js';
import SelectWithIcons from '../../composites/SelectWithIcons.js';
import Textarea from '../form/Textarea.js';
import { iconLoader } from '../../utils/index.js';

class DiaryEntryModal {
  static async open(entry, onSave) {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[DiaryEntryModal] База данных недоступна');
      return;
    }
    const db = getDB();
    if (!db) {
      console.error('[DiaryEntryModal] База данных не инициализирована');
      return;
    }
    
    // Загружаем актуальные данные из БД по дате, чтобы получить последние изменения
    const actualEntry = db.getDiaryEntry(entry.date) || entry;
    
    // Загружаем настроения и категории из БД
    const moods = db.getAll('cfg_diary_moods');
    const sortedMoods = moods.sort((a, b) => (a.level || 0) - (b.level || 0));
    const categories = db.getAll('cfg_diary_categories');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content diary-entry-modal-content edit-modal-content';
    content.style.width = '40vw';
    content.style.maxWidth = '600px';
    content.style.minWidth = '400px';
    content.style.maxHeight = '85vh';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">Изменить запись</h3>
      <button class="modal-close">×</button>
    `;
    content.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = 'var(--space-md)';
    
    // Состояние формы - используем актуальные данные из БД
    const formState = {
      mood_id: actualEntry.mood_id || null,
      category_id: actualEntry.category_id || null,
      text: actualEntry.text || ''
    };
    
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
    
    const moodLabel = document.createElement('label');
    moodLabel.textContent = 'Настроение';
    moodLabel.style.fontSize = 'var(--font-sm)';
    moodLabel.style.color = 'var(--color-on-surface-secondary)';
    
    const moodSliderContainer = document.createElement('div');
    moodSliderContainer.className = 'mood-slider-wrapper';
    
    const minLevel = sortedMoods.length > 0 ? sortedMoods[0].level : 0;
    const maxLevel = sortedMoods.length > 0 ? sortedMoods[sortedMoods.length - 1].level : 5;
    // Используем актуальные данные из БД
    const currentMood = actualEntry.mood_id ? sortedMoods.find(m => m.id === actualEntry.mood_id) : sortedMoods[0];
    const currentMoodLevel = currentMood ? currentMood.level : minLevel;
    
    const moodSlider = new Slider({
      min: minLevel,
      max: maxLevel,
      value: currentMoodLevel
    });
    const sliderElement = moodSlider.render();
    const sliderInput = sliderElement.querySelector('input[type="range"]');
    
    // Разделительная линия
    const divider = document.createElement('div');
    divider.className = 'mood-slider-divider';
    
    // Иконка настроения справа (показываем текущее настроение)
    const moodIcon = document.createElement('div');
    moodIcon.className = 'mood-slider-icon';
    if (currentMood && currentMood.icon) {
      try {
        const iconContent = await iconLoader.loadIcon(currentMood.icon);
        moodIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        console.warn(`[DiaryEntryModal] Не удалось загрузить иконку настроения ${currentMood.icon}:`, e);
      }
    } else if (sortedMoods.length > 0 && sortedMoods[0].icon) {
      try {
        const iconContent = await iconLoader.loadIcon(sortedMoods[0].icon);
        moodIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        console.warn(`[DiaryEntryModal] Не удалось загрузить иконку настроения:`, e);
      }
    }
    
    if (sliderInput) {
      sliderInput.addEventListener('input', async (e) => {
        const value = parseInt(e.target.value);
        const mood = sortedMoods.find(m => m.level === value) || sortedMoods[0];
        if (mood) {
          formState.mood_id = mood.id;
          if (mood.icon) {
            try {
              const iconContent = await iconLoader.loadIcon(mood.icon);
              moodIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
            } catch (e) {
              console.warn(`[DiaryEntryModal] Не удалось загрузить иконку настроения ${mood.icon}:`, e);
            }
          }
        }
      });
    }
    
    moodSliderContainer.appendChild(sliderElement);
    moodSliderContainer.appendChild(divider);
    moodSliderContainer.appendChild(moodIcon);
    
    moodContainer.appendChild(moodLabel);
    moodContainer.appendChild(moodSliderContainer);
    
    // Выпадающий список категории
    const categoryContainer = document.createElement('div');
    categoryContainer.style.flex = '1';
    categoryContainer.style.display = 'flex';
    categoryContainer.style.flexDirection = 'column';
    categoryContainer.style.gap = 'var(--space-sm)';
    
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = 'Категория';
    categoryLabel.style.fontSize = 'var(--font-sm)';
    categoryLabel.style.color = 'var(--color-on-surface-secondary)';
    
    // Загружаем иконки для категорий
    const categoryItems = await Promise.all(categories.map(async (cat) => {
      let icon = '';
      if (cat.icon) {
        try {
          icon = await iconLoader.loadIcon(cat.icon);
        } catch (e) {
          console.warn(`[DiaryEntryModal] Не удалось загрузить иконку ${cat.icon}:`, e);
        }
      }
      return {
        value: cat.id,
        text: cat.title,
        icon: icon
      };
    }));
    
    const categorySelect = new SelectWithIcons({
      items: categoryItems.length > 0 ? categoryItems : [{ value: '', text: 'Нет категорий' }]
    });
    await categorySelect.init();
    
    // Устанавливаем выбранное значение - используем актуальные данные из БД
    if (actualEntry.category_id && categorySelect.customSelect) {
      const selectedIndex = categoryItems.findIndex(item => item.value === actualEntry.category_id);
      if (selectedIndex >= 0) {
        categorySelect.customSelect.selectOption(selectedIndex);
      }
    }
    
    // Сохраняем изменения при выборе категории
    if (categorySelect.customSelect) {
      const originalSelectOption = categorySelect.customSelect.selectOption.bind(categorySelect.customSelect);
      categorySelect.customSelect.selectOption = (index) => {
        originalSelectOption(index);
        if (categoryItems[index]) {
          formState.category_id = categoryItems[index].value;
        }
      };
    }
    
    categoryContainer.appendChild(categoryLabel);
    categoryContainer.appendChild(categorySelect.element);
    
    topPanel.appendChild(moodContainer);
    topPanel.appendChild(categoryContainer);
    body.appendChild(topPanel);
    
    // Поле ввода текста
    const textContainer = document.createElement('div');
    textContainer.style.display = 'flex';
    textContainer.style.flexDirection = 'column';
    textContainer.style.gap = 'var(--space-sm)';
    textContainer.style.flex = '1';
    textContainer.style.minHeight = '200px';
    
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Текст записи';
    textLabel.style.fontSize = 'var(--font-sm)';
    textLabel.style.color = 'var(--color-on-surface-secondary)';
    
    const textArea = new Textarea({
      placeholder: 'Введите текст записи...',
      value: actualEntry.text || ''
    });
    await textArea.init();
    textArea.element.style.flex = '1';
    textArea.element.style.minHeight = '200px';
    textArea.element.addEventListener('input', (e) => {
      formState.text = e.target.value;
    });
    
    textContainer.appendChild(textLabel);
    textContainer.appendChild(textArea.element);
    body.appendChild(textContainer);
    
    content.appendChild(body);
    
    // Футер с кнопками
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const cancelBtn = new Button({
      text: 'Отмена',
      variant: 'secondary'
    });
    await cancelBtn.init();
    cancelBtn.element.setAttribute('data-cancel-button', 'true');
    cancelBtn.element.addEventListener('click', () => {
      modalInstance.close();
      document.body.removeChild(modal);
    });
    footer.appendChild(cancelBtn.element);
    
    const saveBtn = new Button({
      text: 'Сохранить',
      variant: 'success'
    });
    await saveBtn.init();
    saveBtn.element.setAttribute('data-confirm-button', 'true');
    saveBtn.element.addEventListener('click', async () => {
      try {
        if (onSave) {
          // Используем дату из актуальной записи
          await onSave(actualEntry.date || entry.date, formState);
          modalInstance.close();
          document.body.removeChild(modal);
        }
      } catch (error) {
        console.error('[DiaryEntryModal] Ошибка при сохранении:', error);
        alert(`Ошибка при сохранении: ${error.message}`);
      }
    });
    footer.appendChild(saveBtn.element);
    
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    const modalInstance = new Modal(modal);
    modalInstance.open();
    
    // Автофокус на поле текста
    setTimeout(() => {
      const textAreaElement = textArea.element.querySelector('textarea');
      if (textAreaElement) {
        textAreaElement.focus();
      }
    }, 100);
  }
}

export default DiaryEntryModal;

