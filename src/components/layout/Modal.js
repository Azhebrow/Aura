// Импортируем типизированную систему звуков
let soundSystem = null;
async function getSoundSystem() {
  if (!soundSystem) {
    soundSystem = await import('../../system/audio/soundConfig.js');
  }
  return soundSystem;
}

// Глобальный backdrop для всех модальных окон
let globalBackdrop = null;
let modalCount = 0;

function getOrCreateGlobalBackdrop() {
  if (!globalBackdrop) {
    globalBackdrop = document.createElement('div');
    globalBackdrop.className = 'modal-global-backdrop';
    document.body.appendChild(globalBackdrop);
  }
  return globalBackdrop;
}

class Modal {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      closeOnOutsideClick: options.closeOnOutsideClick !== false,
      closeOnEscape: options.closeOnEscape !== false,
      enterSubmitsFromInputs: options.enterSubmitsFromInputs !== false,
      ...options
    };
    this.isOpen = false;
    this.hasBackdrop = true;
    this.init();
  }

  init() {
    // Убеждаемся, что элемент имеет правильную структуру
    if (!this.element.classList.contains('modal-overlay')) {
      this.element.classList.add('modal-overlay');
    }

    // Находим кнопку закрытия
    const closeBtn = this.element.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Закрытие по клику вне модала (на overlay)
    if (this.options.closeOnOutsideClick) {
      this.element.addEventListener('mousedown', (e) => {
        // Закрываем только если клик был именно на overlay, а не на content
        if (e.target === this.element) {
          e.preventDefault();
          this.close();
        }
      });
    }

    // Обработка клавиатуры (Enter и Escape)
    this.keyboardHandler = (e) => {
      if (!this.isOpen) return;
      
      const focusInside = this.element.contains(document.activeElement);
      // Когда фокус вне модалки (например на кнопке «Удалить»), Enter перехватываем — иначе сработает кнопка под overlay и диалог откроется повторно
      if (e.key === 'Enter' && !focusInside) {
        const confirmButton = this.findConfirmButton();
        if (confirmButton) {
          e.preventDefault();
          e.stopPropagation();
          confirmButton.click();
          return;
        }
      }
      
      if (!focusInside && document.activeElement !== document.body) {
        return;
      }
      
      // Если фокус на input, textarea или других элементах ввода
      const activeElement = document.activeElement;
      const isInputElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable ||
        activeElement.closest('textarea') ||
        activeElement.closest('input')
      );
      const isTextarea = activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.closest('textarea'));
      const shouldSubmitOnEnter = this.options.enterSubmitsFromInputs
        ? (isTextarea ? false : true)
        : !isInputElement;
      
      if (e.key === 'Enter' && shouldSubmitOnEnter) {
        const confirmButton = this.findConfirmButton();
        if (confirmButton) {
          e.preventDefault();
          e.stopPropagation();
          confirmButton.click();
        }
      } else if (e.key === 'Escape' && this.options.closeOnEscape) {
        // Находим кнопку отмены (Отмена, Cancel)
        const cancelButton = this.findCancelButton();
        if (cancelButton) {
          e.preventDefault();
          e.stopPropagation();
          cancelButton.click();
        } else {
          // Если кнопки отмены нет, просто закрываем
          this.close();
        }
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Находит кнопку подтверждения в модальном окне
   * Ищет кнопки с текстом: Сохранить, Подтвердить, Да, OK, Создать, Добавить
   */
  findConfirmButton() {
    // Сначала ищем по data-атрибуту
    const dataConfirmButton = this.element.querySelector('[data-confirm-button="true"]');
    if (dataConfirmButton && dataConfirmButton.offsetParent !== null && !dataConfirmButton.disabled) {
      return dataConfirmButton;
    }
    
    const confirmTexts = ['сохранить', 'подтвердить', 'да', 'ok', 'создать', 'добавить', 'применить'];
    const buttons = this.element.querySelectorAll('button, .btn');
    
    for (const button of buttons) {
      const text = (button.textContent || '').trim().toLowerCase();
      // Проверяем текст кнопки или класс btn-primary, btn-success
      if (confirmTexts.some(confirmText => text.includes(confirmText)) ||
          button.classList.contains('btn-primary') ||
          button.classList.contains('btn-success')) {
        // Убеждаемся, что кнопка не скрыта и не disabled
        if (button.offsetParent !== null && !button.disabled) {
          return button;
        }
      }
    }
    
    return null;
  }

  /**
   * Находит кнопку отмены в модальном окне
   * Ищет кнопки с текстом: Отмена, Cancel, Закрыть
   */
  findCancelButton() {
    // Сначала ищем по data-атрибуту
    const dataCancelButton = this.element.querySelector('[data-cancel-button="true"]');
    if (dataCancelButton && dataCancelButton.offsetParent !== null && !dataCancelButton.disabled) {
      return dataCancelButton;
    }
    
    const cancelTexts = ['отмена', 'cancel', 'закрыть', 'close'];
    const buttons = this.element.querySelectorAll('button, .btn');
    
    for (const button of buttons) {
      const text = (button.textContent || '').trim().toLowerCase();
      // Проверяем текст кнопки или класс btn-secondary
      if (cancelTexts.some(cancelText => text.includes(cancelText)) ||
          (button.classList.contains('btn-secondary') && !button.classList.contains('btn-primary'))) {
        // Убеждаемся, что кнопка не скрыта и не disabled
        if (button.offsetParent !== null && !button.disabled) {
          return button;
        }
      }
    }
    
    // Если не нашли, ищем кнопку закрытия
    const closeBtn = this.element.querySelector('.modal-close');
    if (closeBtn && closeBtn.offsetParent !== null && !closeBtn.disabled) {
      return closeBtn;
    }
    
    return null;
  }

  async open() {
    // Размываем все остальные открытые модальные окна
    const allModals = document.querySelectorAll('.modal-overlay.modal-open');
    allModals.forEach(modal => {
      modal.classList.add('modal-blurred');
    });
    
    // Показываем глобальный backdrop
    const backdrop = getOrCreateGlobalBackdrop();
    if (modalCount === 0) {
      backdrop.classList.add('modal-backdrop-active');
      // Размываем всё содержимое приложения
      document.body.classList.add('modal-content-blurred');
    }
    modalCount++;
    
    this.element.style.display = 'flex';
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    // Воспроизводим звук открытия модального окна через типизированную систему
    // С более тихим звуком и более высоким тоном
    if (typeof window !== 'undefined' && window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await getSoundSystem();
      const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_OPEN);
      if (sound) {
        window.audioSystem.play(sound);
      }
    }
    
    // Анимация появления - двойной requestAnimationFrame для плавности
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.element.classList.add('modal-open');
      });
    });
  }

  async close() {
    // Воспроизводим звук закрытия модального окна через типизированную систему
    if (typeof window !== 'undefined' && window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await getSoundSystem();
      const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_CLOSE);
      if (sound) {
        window.audioSystem.play(sound);
      }
    }
    
    // Удаляем класс открытия и добавляем класс закрытия
    this.element.classList.remove('modal-open');
    this.element.classList.add('modal-closing');
    this.isOpen = false;
    
    // Удаляем обработчик клавиатуры при закрытии
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
    
    // Ждем завершения анимации перед скрытием
    const handleTransitionEnd = (e) => {
      // Проверяем, что событие относится к overlay, а не к дочерним элементам
      if (e.target === this.element) {
        this.element.removeEventListener('transitionend', handleTransitionEnd);
        this.element.style.display = 'none';
        this.element.classList.remove('modal-closing');
        this.element.classList.remove('modal-blurred');
        
        // Убираем размутие с предыдущего модального окна если оно есть
        const previousModal = document.querySelector('.modal-overlay.modal-open');
        if (previousModal) {
          previousModal.classList.remove('modal-blurred');
        }
        
        // Скрываем глобальный backdrop если нет открытых модалей
        modalCount--;
        if (modalCount === 0) {
          const backdrop = getOrCreateGlobalBackdrop();
          backdrop.classList.remove('modal-backdrop-active');
          // Убираем размутие содержимого
          document.body.classList.remove('modal-content-blurred');
          document.body.style.overflow = '';
        }
        
        // Вызываем callback, если он есть
        if (this.options.onClose) {
          this.options.onClose();
        }
      }
    };
    
    this.element.addEventListener('transitionend', handleTransitionEnd);
    
    // Fallback на случай, если transitionend не сработает
    setTimeout(() => {
      if (this.element.classList.contains('modal-closing')) {
        this.element.removeEventListener('transitionend', handleTransitionEnd);
        this.element.style.display = 'none';
        this.element.classList.remove('modal-closing');
        this.element.classList.remove('modal-blurred');
        
        // Убираем размутие с предыдущего модального окна если оно есть
        const previousModal = document.querySelector('.modal-overlay.modal-open');
        if (previousModal) {
          previousModal.classList.remove('modal-blurred');
        }
        
        // Скрываем глобальный backdrop если нет открытых модалей
        modalCount--;
        if (modalCount === 0) {
          const backdrop = getOrCreateGlobalBackdrop();
          backdrop.classList.remove('modal-backdrop-active');
          // Убираем размутие содержимого
          document.body.classList.remove('modal-content-blurred');
          document.body.style.overflow = '';
        }
        
        if (this.options.onClose) {
          this.options.onClose();
        }
      }
    }, 300); // Немного больше времени анимации (250ms + запас)
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  destroy() {
    // Удаляем обработчик клавиатуры
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
    // Очистка обработчиков событий при необходимости
    this.close();
  }
}

export default Modal;
