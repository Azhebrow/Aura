/**
 * Модальное окно настройки порядка страниц в нижнем меню
 */

import Modal from '../layout/Modal.js';
import Button from '../form/Button.js';
import { iconLoader } from '../../utils/index.js';
import { navOrderConfigService, settingsChangeTracker } from '../../system/services/index.js';

class NavOrderModal {
  static isOpen = false;
  static currentModal = null;

  static async open() {
    if (this.isOpen && this.currentModal) {
      return;
    }

    this.isOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay nav-order-modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content nav-order-modal-content';

    // Заголовок
    const header = document.createElement('div');
    header.className = 'modal-header nav-order-modal-header';

    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.textContent = 'Порядок страниц в нижнем меню';
    header.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    header.appendChild(closeButton);

    content.appendChild(header);

    // Тело — список страниц с кнопками вверх/вниз
    const body = document.createElement('div');
    body.className = 'modal-body nav-order-modal-body';

    const listContainer = document.createElement('div');
    listContainer.className = 'nav-order-modal-list';

    const renderList = async () => {
      listContainer.innerHTML = '';
      const pages = navOrderConfigService.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const row = document.createElement('div');
        row.className = 'nav-order-modal-item';

        const upBtn = new Button({ iconName: 'chevron-up' });
        await upBtn.init();
        const upEl = await upBtn.render();
        upEl.classList.add('nav-order-arrow-button');
        upEl.disabled = i === 0;

        const downBtn = new Button({ iconName: 'chevron-down' });
        await downBtn.init();
        const downEl = await downBtn.render();
        downEl.classList.add('nav-order-arrow-button');
        downEl.disabled = i === pages.length - 1;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'nav-order-modal-item-icon';
        try {
          const iconContent = await iconLoader.loadIcon(page.icon);
          iconSpan.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconContent}</svg>`;
        } catch (e) {
          iconSpan.textContent = '•';
        }

        const label = document.createElement('span');
        label.className = 'nav-order-modal-item-label';
        label.textContent = page.name;

        row.appendChild(iconSpan);
        row.appendChild(label);
        row.appendChild(upEl);
        row.appendChild(downEl);

        upEl.addEventListener('click', async () => {
          if (i === 0) return;
          const order = navOrderConfigService.getPagesOrder();
          [order[i - 1], order[i]] = [order[i], order[i - 1]];
          navOrderConfigService.savePagesOrder(order);
          settingsChangeTracker.markChanged();
          await renderList();
        });

        downEl.addEventListener('click', async () => {
          if (i === pages.length - 1) return;
          const order = navOrderConfigService.getPagesOrder();
          [order[i], order[i + 1]] = [order[i + 1], order[i]];
          navOrderConfigService.savePagesOrder(order);
          settingsChangeTracker.markChanged();
          await renderList();
        });

        listContainer.appendChild(row);
      }
    };

    await renderList();
    body.appendChild(listContainer);
    content.appendChild(body);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const modal = new Modal(overlay);
    this.currentModal = modal;

    modal.options.onClose = () => {
      this.isOpen = false;
      this.currentModal = null;
    };

    await modal.open();
  }

  static close() {
    if (this.currentModal) {
      this.currentModal.close();
    }
  }
}

export default NavOrderModal;
