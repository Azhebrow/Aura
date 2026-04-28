import { Modal } from '../layout/index.js';
import { Button, Textarea } from '../form/index.js';

class DescriptionEditorButton {
  constructor(options = {}) {
    this.value = options.value || '';
    this.onChange = options.onChange || null;
    this.element = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Создаем кнопку
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn cfg-description-button';
    
    // Показываем превью или плейсхолдер
    const preview = this.value 
      ? this.value.length > 50 
        ? this.value.substring(0, 50) + '...' 
        : this.value
      : 'Добавить описание';
    
    button.textContent = preview;
    
    button.addEventListener('click', () => {
      this.openEditor();
    });

    this.element = button;
    this.initialized = true;
  }

  async openEditor() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    // Проверяем наличие других модальных окон и устанавливаем правильный z-index
    const configModalOverlay = document.querySelector('.modal-overlay[style*="z-index: 10001"]');
    const goalsModalOverlay = document.querySelector('.goals-modal-overlay');
    
    if (configModalOverlay) {
      // ConfigModal открыт из GoalsModal - устанавливаем z-index 10002
      modal.style.zIndex = '10002';
    } else if (goalsModalOverlay) {
      // Открыт только GoalsModal - устанавливаем z-index 10001
      modal.style.zIndex = '10001';
    }

    const content = document.createElement('div');
    content.className = 'modal-content cfg-description-modal';
    content.style.width = '60vw';
    content.style.maxWidth = '900px';
    content.style.minWidth = '500px';
    content.style.maxHeight = '80vh';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    
    // Устанавливаем z-index для content, если modal имеет повышенный z-index
    if (configModalOverlay || goalsModalOverlay) {
      content.style.zIndex = modal.style.zIndex || '1000';
    }

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">Описание</h3>
      <button class="modal-close">×</button>
    `;
    content.appendChild(header);

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.flex = '1';
    body.style.overflow = 'hidden';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';

    // Textarea для ввода
    const textarea = new Textarea({
      placeholder: 'Введите описание...',
      value: this.value || ''
    });
    const textareaElement = textarea.render();
    textareaElement.style.width = '100%';
    textareaElement.style.height = '100%';
    textareaElement.style.minHeight = '300px';
    textareaElement.style.resize = 'vertical';
    body.appendChild(textareaElement);

    content.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = new Button({
      text: 'Отмена',
      variant: 'secondary',
      onClick: () => {
        modalInstance.close();
        document.body.removeChild(modal);
      }
    });
    await cancelBtn.init();
    cancelBtn.element.setAttribute('data-cancel-button', 'true');
    footer.appendChild(cancelBtn.element);

    const saveBtn = new Button({
      text: 'Сохранить',
      variant: 'success',
      onClick: () => {
        const newValue = textareaElement.value;
        this.setValue(newValue);
        modalInstance.close();
        document.body.removeChild(modal);
      }
    });
    await saveBtn.init();
    saveBtn.element.setAttribute('data-confirm-button', 'true');
    footer.appendChild(saveBtn.element);

    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    const modalInstance = new Modal(modal);
    modalInstance.open();

    // Автофокус убран по запросу пользователя
  }

  setValue(value) {
    this.value = value || '';
    if (this.element) {
      const preview = this.value 
        ? this.value.length > 50 
          ? this.value.substring(0, 50) + '...' 
          : this.value
        : 'Добавить описание';
      this.element.textContent = preview;
    }
    if (this.onChange) {
      this.onChange(this.value);
    }
  }

  getValue() {
    return this.value || '';
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default DescriptionEditorButton;









