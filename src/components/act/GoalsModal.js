import { mountGoalsManagement } from './goalsManagementRoot.js';

class GoalsModal {
  static isOpen = false;
  static currentOverlay = null;

  static async open(selectedGoal = null, onClose = null) {
    if (GoalsModal.isOpen) {
      console.log('[GoalsModal] Модальное окно уже открыто.');
      return;
    }

    const getDB = window.getDB;
    if (!getDB) {
      console.error('[GoalsModal] База данных недоступна');
      return;
    }
    const db = getDB();
    if (!db) {
      console.error('[GoalsModal] База данных не инициализирована');
      return;
    }

    GoalsModal.isOpen = true;

    if (typeof window !== 'undefined' && window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
      const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_OPEN);
      if (sound) {
        window.audioSystem.play(sound);
      }
    }

    const isMac = typeof process !== 'undefined' && process.platform === 'darwin';
    const titleBarHeight = isMac ? 0 : 36;
    const bottomNavContainer = document.querySelector('.bottom-navigation-container');
    const bottomNavHeight = bottomNavContainer ? bottomNavContainer.offsetHeight : 0;

    const SPACE_XS = 4;
    const SPACE_SM = 10;

    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-modal-overlay goals-modal-overlay';
    overlay.style.top = `${titleBarHeight + SPACE_XS}px`;
    overlay.style.bottom = `${bottomNavHeight + SPACE_XS}px`;
    overlay.style.left = `${SPACE_SM}px`;
    overlay.style.right = `${SPACE_SM}px`;

    const requestClose = () => {
      GoalsModal.close();
      if (onClose) onClose();
    };

    const { content, dispose } = await mountGoalsManagement({
      selectedGoal,
      requestClose,
      escapeGate: () => GoalsModal.isOpen,
      contentClassName: 'fullscreen-modal-content goals-modal-content'
    });

    overlay.appendChild(content);
    document.body.appendChild(overlay);
    GoalsModal.currentOverlay = overlay;
    overlay._goalsDispose = dispose;

    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-content-blurred');

    console.log('[GoalsModal] Начало открытия модального окна');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('fullscreen-modal-open', 'goals-modal-open');
      });
    });
  }

  static async close() {
    if (typeof window !== 'undefined' && window.audioSystem) {
      const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
      const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.MODAL_CLOSE);
      if (sound) {
        window.audioSystem.play(sound);
      }
    }

    if (!GoalsModal.isOpen || !GoalsModal.currentOverlay) {
      console.log('[GoalsModal] Модальное окно уже закрыто или overlay отсутствует');
      return;
    }

    const overlay = GoalsModal.currentOverlay;
    if (overlay._goalsDispose) {
      overlay._goalsDispose();
      overlay._goalsDispose = null;
    }

    console.log('[GoalsModal] Начало закрытия модального окна');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          overlay.classList.add('fullscreen-modal-closing', 'goals-modal-closing');

          const cleanup = () => {
            console.log('[GoalsModal] Cleanup вызван');
            overlay.classList.remove('fullscreen-modal-open', 'goals-modal-open', 'fullscreen-modal-closing', 'goals-modal-closing');

            if (overlay.parentNode) {
              document.body.removeChild(overlay);
            }
            document.body.classList.remove('modal-content-blurred');
            document.body.style.overflow = '';
            GoalsModal.isOpen = false;
            GoalsModal.currentOverlay = null;
            console.log('[GoalsModal] Cleanup завершен');
          };

          const content = overlay.querySelector('.fullscreen-modal-content');
          if (content) {
            let cleanupCalled = false;
            const handleTransitionEnd = (e) => {
              if (e.target === content && e.propertyName === 'transform' && !cleanupCalled) {
                cleanupCalled = true;
                content.removeEventListener('transitionend', handleTransitionEnd);
                cleanup();
              }
            };
            content.addEventListener('transitionend', handleTransitionEnd);
            setTimeout(() => {
              if (!cleanupCalled) {
                cleanupCalled = true;
                content.removeEventListener('transitionend', handleTransitionEnd);
                cleanup();
              }
            }, 750);
          } else {
            setTimeout(cleanup, 700);
          }
        }, 10);
      });
    });
  }

  static async renderContent() {
    return null;
  }
}

export default GoalsModal;
