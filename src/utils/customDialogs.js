/**
 * Кастомные диалоги для замены нативных alert/confirm
 * Решают проблему блокировки UI после закрытия нативных диалогов в Electron
 */

import Modal from '../components/layout/Modal.js';
import { Button } from '../components/form/index.js';

/**
 * Кастомный alert - не блокирует рендерер процесс
 * @param {string} message - Сообщение для показа
 * @returns {Promise<void>}
 */
export async function customAlert(message) {
  return new Promise((resolve) => {
    // Воспроизводим звук предупреждения
    if (window.audioSystem) {
      (async () => {
        try {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../system/audio/soundConfig.js');
          const sound = getSoundByType(SOUND_CATEGORIES.SYSTEM_ERROR, UI_ELEMENT_TYPES.ALERT_WARNING);
          if (sound) {
            window.audioSystem.play(sound);
          }
        } catch (e) {
          console.warn('[customDialogs] Ошибка загрузки звука:', e);
        }
      })();
    }

    // Создаем overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay custom-dialog-overlay';
    overlay.style.zIndex = '99999';

    // Создаем content
    const content = document.createElement('div');
    content.className = 'modal-content custom-dialog-content';
    content.style.width = '400px';
    content.style.maxWidth = '90vw';

    // Создаем header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">Уведомление</h3>
    `;

    // Создаем body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.padding = 'var(--space-lg)';
    body.style.textAlign = 'center';
    body.textContent = message;

    // Создаем footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.justifyContent = 'center';
    footer.style.padding = 'var(--space-md)';

    // Создаем кнопку OK
    const okButton = document.createElement('button');
    okButton.className = 'btn btn-primary';
    okButton.textContent = 'OK';
    okButton.style.minWidth = '100px';
    okButton.setAttribute('data-confirm-button', 'true'); // Помечаем как кнопку подтверждения
    
    okButton.addEventListener('click', () => {
      modal.close();
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve();
      }, 300);
    });

    footer.appendChild(okButton);

    // Собираем структуру
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Создаем Modal экземпляр
    const modal = new Modal(overlay, {
      closeOnOutsideClick: false,
      closeOnEscape: true,
      onClose: () => {
        setTimeout(() => {
          if (overlay.parentNode) {
            document.body.removeChild(overlay);
          }
          resolve();
        }, 100);
      }
    });

    // Открываем модальное окно
    modal.open();

    // Фокус в модалке, чтобы Enter не срабатывал на кнопке под overlay и не открывал диалог повторно
    requestAnimationFrame(() => {
      okButton.focus();
    });
  });
}

/**
 * Кастомный confirm - не блокирует рендерер процесс
 * @param {string} message - Сообщение для подтверждения
 * @returns {Promise<boolean>} - true если подтверждено, false если отменено
 */
export async function customConfirm(message) {
  return new Promise((resolve) => {
    // Воспроизводим звук предупреждения
    if (window.audioSystem) {
      (async () => {
        try {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../system/audio/soundConfig.js');
          const sound = getSoundByType(SOUND_CATEGORIES.SYSTEM_ERROR, UI_ELEMENT_TYPES.ALERT_WARNING);
          if (sound) {
            window.audioSystem.play(sound);
          }
        } catch (e) {
          console.warn('[customDialogs] Ошибка загрузки звука:', e);
        }
      })();
    }

    let resolved = false;

    const closeDialog = (result) => {
      if (resolved) return;
      resolved = true;
      modal.close();
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        resolve(result);
      }, 300);
    };

    // Создаем overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay custom-dialog-overlay';
    overlay.style.zIndex = '99999';

    // Создаем content
    const content = document.createElement('div');
    content.className = 'modal-content custom-dialog-content';
    content.style.width = '400px';
    content.style.maxWidth = '90vw';

    // Создаем header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">Подтверждение</h3>
    `;

    // Создаем body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.padding = 'var(--space-lg)';
    body.style.textAlign = 'center';
    body.textContent = message;

    // Создаем footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.justifyContent = 'center';
    footer.style.gap = 'var(--space-md)';
    footer.style.padding = 'var(--space-md)';

    // Создаем кнопку Отмена
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn';
    cancelButton.textContent = 'Отмена';
    cancelButton.style.minWidth = '100px';
    cancelButton.setAttribute('data-cancel-button', 'true'); // Помечаем как кнопку отмены
    
    cancelButton.addEventListener('click', () => {
      closeDialog(false);
    });

    // Создаем кнопку OK
    const okButton = document.createElement('button');
    okButton.className = 'btn btn-primary';
    okButton.textContent = 'OK';
    okButton.style.minWidth = '100px';
    okButton.setAttribute('data-confirm-button', 'true'); // Помечаем как кнопку подтверждения
    
    okButton.addEventListener('click', () => {
      closeDialog(true);
    });

    footer.appendChild(cancelButton);
    footer.appendChild(okButton);

    // Собираем структуру
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Создаем Modal экземпляр
    const modal = new Modal(overlay, {
      closeOnOutsideClick: false,
      closeOnEscape: true,
      onClose: () => {
        closeDialog(false);
      }
    });

    // Открываем модальное окно
    modal.open();

    // Фокус на OK, чтобы Enter подтверждал диалог и не уходил на кнопку под overlay (повторное «Удалить»)
    requestAnimationFrame(() => {
      okButton.focus();
    });
  });
}

export default {
  alert: customAlert,
  confirm: customConfirm
};
