import { mountGoalsManagement } from './goalsManagementRoot.js';

/**
 * Встроенная панель управления целями на странице «Ритуалы».
 * Делит реализацию с модальным окном через {@link mountGoalsManagement}.
 */
export default class GoalsPanel {
  /**
   * @param {HTMLElement} hostElement — `.rituals-goals-panel-host`
   */
  constructor(hostElement) {
    this.hostElement = hostElement;
    this.rootEl = document.createElement('div');
    this.rootEl.className = 'rituals-goals-panel-root';
    this.hostElement.appendChild(this.rootEl);
    this._disposeManagement = null;
  }

  unmountManagement() {
    if (this._disposeManagement) {
      this._disposeManagement();
      this._disposeManagement = null;
    }
    this.rootEl.innerHTML = '';
  }

  /**
   * @param {object|null} selectedGoal
   * @param {() => void|Promise<void>} onRequestPanelClose — скрыть панель и обновить превью (обычно PageManager.hideGoalsPanel)
   */
  async mount(selectedGoal, onRequestPanelClose) {
    this.unmountManagement();

    const { content, dispose } = await mountGoalsManagement({
      selectedGoal,
      requestClose: () => {
        Promise.resolve(onRequestPanelClose()).catch((err) => {
          console.error('[GoalsPanel] onRequestPanelClose', err);
        });
      },
      escapeGate: () => this.rootEl.childElementCount > 0,
      contentClassName: 'goals-embedded-management goals-modal-content'
    });

    this.rootEl.appendChild(content);
    this._disposeManagement = dispose;
  }
}
