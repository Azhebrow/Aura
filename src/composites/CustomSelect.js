import { iconLoader } from '../utils/index.js';

class CustomSelect {
  constructor(element) {
    this.element = element;
    this.options = [];
    this.selectedIndex = 0;
    this.initialized = false;
    this.chevronIcon = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }
    
    // Загружаем иконку стрелки из библиотеки
    this.chevronIcon = await iconLoader.loadIcon('chevron-down');

    const select = this.element.querySelector('select');
    if (!select) {
      this.initialized = true;
      return;
    }

    // Собираем опции
    Array.from(select.options).forEach((option, index) => {
      const icon = option.dataset.icon || '';
      const text = option.textContent;
      const fontFamily = option.dataset.fontFamily || '';
      this.options.push({ icon, text, value: option.value, fontFamily });
      if (option.selected) {
        this.selectedIndex = index;
      }
    });

    // Создаем кастомный селект
    await this.createCustomSelect();
    
    // Скрываем оригинальный select
    select.style.display = 'none';
    
    this.initialized = true;
  }

  async createCustomSelect() {
    // Убеждаемся, что иконка стрелки загружена
    if (!this.chevronIcon) {
      this.chevronIcon = await iconLoader.loadIcon('chevron-down');
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.tabIndex = 0;
    
    const selectedOption = this.options[this.selectedIndex];
    trigger.innerHTML = `
      ${selectedOption.icon ? `<svg class="custom-select-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${selectedOption.icon}</svg>` : ''}
      <span class="custom-select-trigger-text">${selectedOption.text}</span>
      <svg class="custom-select-trigger-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${this.chevronIcon}</svg>
    `;
    // Применяем шрифт к триггеру, если указан
    if (selectedOption.fontFamily) {
      const triggerText = trigger.querySelector('.custom-select-trigger-text');
      if (triggerText) {
        triggerText.style.fontFamily = `'${selectedOption.fontFamily}', sans-serif`;
      }
    }

    // Создаем dropdown в body для правильного позиционирования поверх модального окна
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    dropdown.style.position = 'fixed';
    
    // Проверяем наличие открытых модальных окон и устанавливаем правильный z-index
    const configModalOverlay = document.querySelector('.modal-overlay[style*="z-index: 10001"]');
    const goalsModalOverlay = document.querySelector('.goals-modal-overlay');
    
    if (configModalOverlay) {
      // ConfigModal открыт из GoalsModal - устанавливаем z-index 10003
      dropdown.style.zIndex = '10003';
    } else if (goalsModalOverlay) {
      // Открыт только GoalsModal - устанавливаем z-index 10002
      dropdown.style.zIndex = '10002';
    } else {
      // Иначе используем текущий z-index
      dropdown.style.zIndex = '99999';
    }

    this.options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = `custom-select-option ${index === this.selectedIndex ? 'selected' : ''}`;
      optionElement.innerHTML = `
        ${option.icon ? `<svg class="custom-select-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${option.icon}</svg>` : ''}
        <span class="custom-select-option-text">${option.text}</span>
      `;
      // Применяем шрифт к опции, если указан
      if (option.fontFamily) {
        const optionText = optionElement.querySelector('.custom-select-option-text');
        if (optionText) {
          optionText.style.fontFamily = `'${option.fontFamily}', sans-serif`;
        }
      }
      optionElement.addEventListener('click', () => {
        this.selectOption(index);
      });
      dropdown.appendChild(optionElement);
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);

    // Обработчики событий
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevious();
      }
    });

    // Закрытие при клике вне элемента
    const handleClickOutside = (e) => {
      if (this.wrapper && this.wrapper.classList.contains('open')) {
        const target = e.target;
        const isClickInside = wrapper.contains(target) || dropdown.contains(target);
        if (!isClickInside) {
          this.close();
        }
      }
    };
    document.addEventListener('click', handleClickOutside, true);
    this.handleClickOutside = handleClickOutside;

    // Пересчитываем позицию при скролле или изменении размера окна
    const handleReposition = () => {
      if (this.wrapper && this.wrapper.classList.contains('open')) {
        this.positionDropdown();
      }
    };
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    this.handleReposition = handleReposition;

    this.element.appendChild(wrapper);
    this.wrapper = wrapper;
    this.trigger = trigger;
    this.dropdown = dropdown;
  }

  async toggle() {
    const isOpening = !this.wrapper.classList.contains('open');
    
    // Воспроизводим звук раскрытия/сворачивания
    if (window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../system/audio/soundConfig.js');
      const sound = getSoundByType(
        SOUND_CATEGORIES.UI_NAVIGATION,
        isOpening ? UI_ELEMENT_TYPES.LIST_EXPAND : UI_ELEMENT_TYPES.LIST_COLLAPSE
      );
      if (sound) {
        window.audioSystem.play(sound);
      }
    }
    
    if (isOpening) {
      this.wrapper.classList.add('open');
      // Перемещаем dropdown в body для правильного отображения поверх модального окна
      // Удаляем из текущего родителя, если он есть
      if (this.dropdown.parentNode) {
        this.dropdown.parentNode.removeChild(this.dropdown);
      }
      // Добавляем в body
      document.body.appendChild(this.dropdown);
      // Позиционируем dropdown
      this.positionDropdown();
    } else {
      this.wrapper.classList.remove('open');
      // Возвращаем dropdown обратно в wrapper при закрытии
      if (this.dropdown.parentNode === document.body) {
        document.body.removeChild(this.dropdown);
        this.wrapper.appendChild(this.dropdown);
      }
      // Сбрасываем все inline-стили позиционирования
      this.resetDropdownStyles();
    }
  }
  
  positionDropdown() {
    if (!this.dropdown || !this.trigger) return;
    
    // Получаем позицию trigger относительно viewport
    const triggerRect = this.trigger.getBoundingClientRect();
    const dropdown = this.dropdown;

    // В модалке календаря список растягиваем на всю внутреннюю ширину контента модалки
    const modalContent = this.element.closest('.calendar-modal-content');
    let anchorLeft = triggerRect.left;
    let anchorWidth = triggerRect.width;
    if (modalContent) {
      const modalRect = modalContent.getBoundingClientRect();
      const cs = getComputedStyle(modalContent);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      anchorLeft = modalRect.left + padL;
      anchorWidth = modalRect.width - padL - padR;
      const margin = 8;
      anchorWidth = Math.max(triggerRect.width, Math.min(anchorWidth, window.innerWidth - margin * 2));
      anchorLeft = Math.max(margin, Math.min(anchorLeft, window.innerWidth - anchorWidth - margin));
    }
    
    // Устанавливаем фиксированное позиционирование
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '99999';
    dropdown.style.left = `${anchorLeft}px`;
    dropdown.style.width = `${anchorWidth}px`;
    dropdown.style.display = 'block';
    dropdown.style.visibility = 'visible';
    dropdown.style.opacity = '1';
    
    const spaceBelow = window.innerHeight - triggerRect.bottom - 8;
    const spaceAbove = triggerRect.top - 8;
    const dropdownHeight = Math.min(dropdown.scrollHeight, 300);
    
    // Если не помещается снизу, но помещается сверху - показываем сверху
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = `${window.innerHeight - triggerRect.top + 4}px`;
      dropdown.style.marginTop = '0';
      dropdown.style.marginBottom = '0';
    } else {
      // Иначе показываем снизу
      dropdown.style.top = `${triggerRect.bottom + 4}px`;
      dropdown.style.bottom = 'auto';
      dropdown.style.marginTop = '0';
      dropdown.style.marginBottom = '0';
    }
    
    // Ограничиваем максимальную высоту
    const maxHeight = Math.min(
      spaceBelow > spaceAbove ? spaceBelow : spaceAbove,
      300
    );
    dropdown.style.maxHeight = `${maxHeight}px`;
  }

  resetDropdownStyles() {
    if (!this.dropdown) return;
    // Сбрасываем все inline-стили позиционирования
    this.dropdown.style.position = '';
    this.dropdown.style.top = '';
    this.dropdown.style.left = '';
    this.dropdown.style.bottom = '';
    this.dropdown.style.width = '';
    this.dropdown.style.display = '';
    this.dropdown.style.visibility = '';
    this.dropdown.style.opacity = '';
    this.dropdown.style.marginTop = '';
    this.dropdown.style.marginBottom = '';
    this.dropdown.style.maxHeight = '';
    this.dropdown.style.zIndex = '';
  }

  async close() {
    // Воспроизводим звук закрытия выпадающего списка через типизированную систему
    if (typeof window !== 'undefined' && window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../system/audio/soundConfig.js');
      const sound = getSoundByType(SOUND_CATEGORIES.FORM_INPUT, UI_ELEMENT_TYPES.INPUT_SELECT);
      if (sound) {
        window.audioSystem.play(sound);
      }
    }
    
    this.wrapper.classList.remove('open');
    // Возвращаем dropdown обратно в wrapper при закрытии
    if (this.dropdown && this.dropdown.parentNode === document.body) {
      document.body.removeChild(this.dropdown);
      this.wrapper.appendChild(this.dropdown);
    }
    // Сбрасываем все inline-стили позиционирования
    this.resetDropdownStyles();
  }

  async selectOption(index) {
    this.selectedIndex = index;
    const selectedOption = this.options[index];
    
    // Убеждаемся, что иконка стрелки загружена
    if (!this.chevronIcon) {
      this.chevronIcon = await iconLoader.loadIcon('chevron-down');
    }
    
    // Обновляем триггер
    this.trigger.innerHTML = `
      ${selectedOption.icon ? `<svg class="custom-select-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${selectedOption.icon}</svg>` : ''}
      <span class="custom-select-trigger-text">${selectedOption.text}</span>
      <svg class="custom-select-trigger-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${this.chevronIcon}</svg>
    `;
    // Применяем шрифт к триггеру, если указан
    if (selectedOption.fontFamily) {
      const triggerText = this.trigger.querySelector('.custom-select-trigger-text');
      if (triggerText) {
        triggerText.style.fontFamily = `'${selectedOption.fontFamily}', sans-serif`;
      }
    }

    // Обновляем опции
    Array.from(this.dropdown.children).forEach((option, i) => {
      if (i === index) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });

    // Обновляем оригинальный select
    const select = this.element.querySelector('select');
    if (select) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    this.close();
  }

  selectNext() {
    const nextIndex = (this.selectedIndex + 1) % this.options.length;
    this.selectOption(nextIndex);
  }

  selectPrevious() {
    const prevIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
    this.selectOption(prevIndex);
  }
}

export default CustomSelect;

