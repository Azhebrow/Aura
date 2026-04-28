/**
 * Исправление проблемы с блокировкой UI после alert/confirm в Electron
 * После закрытия нативных диалогов может оставаться блокирующий слой
 */

/**
 * Восстанавливает состояние UI после закрытия диалога
 */
function restoreUIState() {
  // Восстанавливаем overflow для body
  document.body.style.overflow = '';
  
  // КРИТИЧНО: Убираем все блокировки pointer-events со ВСЕХ элементов
  // Это важно, так как Electron может блокировать элементы после диалога
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    // Убираем блокировку pointer-events
    if (el.style.pointerEvents === 'none') {
      el.style.pointerEvents = '';
    }
    // Убираем блокировку user-select, если она была установлена
    if (el.style.userSelect === 'none' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
      // Не трогаем user-select для input/textarea, это может быть намеренно
    }
  });
  
  // Убираем все блокирующие overlay элементы, которые не должны быть видны
  const allOverlays = document.querySelectorAll('.modal-overlay, .fullscreen-modal-overlay');
  allOverlays.forEach(overlay => {
    // Проверяем, действительно ли overlay должен быть виден
    const computedDisplay = getComputedStyle(overlay).display;
    const inlineDisplay = overlay.style.display;
    
    // Если overlay скрыт через inline style, но должен быть виден - это проблема
    if (inlineDisplay === 'none' && computedDisplay !== 'none') {
      // Не трогаем, это нормально
      return;
    }
    
    // Если overlay виден, но модальное окно не существует - скрываем
    if ((computedDisplay === 'flex' || inlineDisplay === 'flex') && overlay.querySelector('.modal-content, .fullscreen-modal-content')) {
      // Модальное окно существует, проверяем его состояние
      const modal = overlay.querySelector('.modal-content, .fullscreen-modal-content');
      if (!modal || !modal.isConnected) {
        overlay.style.display = 'none';
      }
    }
  });
  
  // Восстанавливаем pointer-events для всех элементов формы
  const formElements = document.querySelectorAll('input, select, textarea, button, .custom-select-trigger, .custom-select-wrapper, label');
  formElements.forEach(el => {
    // Убираем блокировку pointer-events, если она была установлена
    if (el.style.pointerEvents === 'none') {
      el.style.pointerEvents = '';
    }
    // Убираем блокировку tabindex
    if (el.getAttribute('tabindex') === '-1' && !el.hasAttribute('data-tabindex-locked')) {
      el.removeAttribute('tabindex');
    }
  });
  
  // Восстанавливаем z-index для date picker и select
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    // Убеждаемся, что date input может получить фокус
    if (input.style.pointerEvents === 'none') {
      input.style.pointerEvents = '';
    }
    // Убеждаемся, что z-index достаточен
    const wrapper = input.closest('.input-date-wrapper');
    if (wrapper && wrapper.style.zIndex) {
      wrapper.style.zIndex = '';
    }
  });
  
  // Восстанавливаем фокус только для сохраненного элемента (если пользователь сам фокусировался)
  // Автоматический фокус на первый input убран по запросу пользователя
  const lastActiveElement = document.querySelector('[data-last-active]');
  if (lastActiveElement) {
    // Убеждаемся, что элемент может получить фокус
    if (lastActiveElement.style.pointerEvents === 'none') {
      lastActiveElement.style.pointerEvents = '';
    }
    // Убираем disabled, если он был установлен
    if (lastActiveElement.hasAttribute('disabled')) {
      lastActiveElement.removeAttribute('disabled');
    }
    // Пытаемся установить фокус только на сохраненный элемент
    setTimeout(() => {
      try {
        lastActiveElement.focus();
        lastActiveElement.removeAttribute('data-last-active');
      } catch (e) {
        console.warn('[dialogFix] Не удалось установить фокус на элемент:', e);
      }
    }, 50);
  }
  // Автоматический поиск и фокус первого input убран
  
  // КРИТИЧНО: Принудительно разблокируем body и document
  document.body.style.pointerEvents = '';
  if (document.documentElement) {
    document.documentElement.style.pointerEvents = '';
  }
}

/**
 * Перехватывает нативные alert и заменяет на кастомные диалоги
 */
function interceptAlert() {
  const originalAlert = window.alert;
  window.alert = async function(message) {
    // Сохраняем текущий активный элемент
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && activeElement !== document.documentElement) {
      activeElement.setAttribute('data-last-active', 'true');
    }
    
    // Используем кастомный диалог вместо нативного
    try {
      const { customAlert } = await import('./customDialogs.js');
      await customAlert(message);
      
      // Восстанавливаем фокус после закрытия
      setTimeout(() => {
        if (activeElement && activeElement.hasAttribute('data-last-active')) {
          try {
            activeElement.focus();
            activeElement.removeAttribute('data-last-active');
          } catch (e) {
            console.warn('[dialogFix] Не удалось восстановить фокус:', e);
          }
        }
        restoreUIState();
      }, 100);
    } catch (e) {
      // Fallback на нативный alert если кастомный не загрузился
      console.warn('[dialogFix] Ошибка загрузки кастомного диалога, используем нативный:', e);
      originalAlert.call(window, message);
      setTimeout(() => {
        restoreUIState();
      }, 100);
    }
  };
}

/**
 * Перехватывает нативные confirm и заменяет на кастомные диалоги
 */
function interceptConfirm() {
  const originalConfirm = window.confirm;
  window.confirm = async function(message) {
    // Сохраняем текущий активный элемент
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && activeElement !== document.documentElement) {
      activeElement.setAttribute('data-last-active', 'true');
    }
    
    // Используем кастомный диалог вместо нативного
    try {
      const { customConfirm } = await import('./customDialogs.js');
      const result = await customConfirm(message);
      
      // Восстанавливаем фокус после закрытия
      setTimeout(() => {
        if (activeElement && activeElement.hasAttribute('data-last-active')) {
          try {
            activeElement.focus();
            activeElement.removeAttribute('data-last-active');
          } catch (e) {
            console.warn('[dialogFix] Не удалось восстановить фокус:', e);
          }
        }
        restoreUIState();
      }, 100);
      
      return result;
    } catch (e) {
      // Fallback на нативный confirm если кастомный не загрузился
      console.warn('[dialogFix] Ошибка загрузки кастомного диалога, используем нативный:', e);
      const result = originalConfirm.call(window, message);
      setTimeout(() => {
        restoreUIState();
      }, 100);
      return result;
    }
  };
}

/**
 * Инициализация исправления диалогов
 */
export function initDialogFix() {
  // Перехватываем alert и confirm
  interceptAlert();
  interceptConfirm();
  
  // Также слушаем события фокуса для восстановления состояния
  window.addEventListener('focus', () => {
    // При возврате фокуса в окно проверяем состояние
    setTimeout(() => {
      restoreUIState();
    }, 50);
  });
  
  // Слушаем события blur для сохранения активного элемента
  document.addEventListener('blur', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
      e.target.setAttribute('data-last-active', 'true');
    }
  }, true);
  
  // Слушаем события клика для восстановления состояния
  document.addEventListener('click', (e) => {
    // Если клик был на input/select/textarea, но элемент не получил фокус
    if ((e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || 
         e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('label')) &&
        document.activeElement !== e.target) {
      // Убеждаемся, что элемент не заблокирован
      const targetElement = e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' 
        ? e.target 
        : (e.target.closest('input, select, textarea') || e.target);
      
      if (targetElement && targetElement.style.pointerEvents === 'none') {
        targetElement.style.pointerEvents = '';
      }
      
      // Пытаемся восстановить фокус
      setTimeout(() => {
        try {
          if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'SELECT' || targetElement.tagName === 'TEXTAREA')) {
            targetElement.focus();
          }
          restoreUIState();
        } catch (err) {
          console.warn('[dialogFix] Ошибка при восстановлении фокуса:', err);
          restoreUIState();
        }
      }, 10);
    }
  }, true); // Используем capture phase для раннего перехвата
  
  // Слушаем события mousedown для раннего восстановления состояния
  document.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      // Восстанавливаем состояние перед кликом
      if (e.target.style.pointerEvents === 'none') {
        e.target.style.pointerEvents = '';
      }
    }
  }, true);
  
  // Специальная обработка для date input - календарный picker может не открываться
  document.addEventListener('mousedown', (e) => {
    if (e.target.type === 'date' || e.target.classList.contains('input') && e.target.type === 'date') {
      // Восстанавливаем состояние перед открытием календаря
      restoreUIState();
      
      // Убеждаемся, что элемент может получить фокус
      setTimeout(() => {
        if (document.activeElement !== e.target) {
          e.target.focus();
        }
      }, 10);
    }
  }, true);
  
  // Обработчик для события visibilitychange - когда окно становится видимым
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Когда окно снова становится видимым, восстанавливаем состояние
      setTimeout(() => {
        restoreUIState();
      }, 100);
    }
  });
  
  // Обработчик для события focus на window - когда окно получает фокус
  window.addEventListener('focus', () => {
    // Восстанавливаем состояние при получении фокуса окном
    setTimeout(() => {
      restoreUIState();
    }, 50);
  });
  
  // Периодическая проверка состояния (как последняя линия защиты)
  // Проверяем каждые 2 секунды, не заблокированы ли элементы
  setInterval(() => {
    // Проверяем только если нет активных модальных окон
    const activeModals = document.querySelectorAll('.modal-overlay:not([style*="display: none"])');
    if (activeModals.length === 0) {
      // Проверяем, не заблокированы ли основные элементы формы
      const testInput = document.querySelector('input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])');
      if (testInput && testInput.style.pointerEvents === 'none') {
        console.warn('[dialogFix] Обнаружена блокировка элементов, восстанавливаем состояние');
        restoreUIState();
      }
    }
  }, 2000);
}

export default initDialogFix;
