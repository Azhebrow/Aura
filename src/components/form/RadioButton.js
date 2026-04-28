class RadioButton {
  constructor(options = {}) {
    this.name = options.name || 'radio';
    this.items = options.items || [];
    this.iconOnly = options.iconOnly || false;
    /** Доп. классы на каждый label (например radio-button--nav) */
    this.modifierClass = (options.modifierClass || '').trim();
    this.value = options.value || null; // Текущее выбранное значение
    this.element = null;
    this.init();
  }

  init() {
    const group = document.createElement('div');
    group.className = 'radio-button-group';

    this.items.forEach((item, index) => {
      const label = document.createElement('label');
      label.className = 'radio-button';
      if (this.iconOnly) {
        label.className += ' radio-button-icon-only';
      }
      if (this.modifierClass) {
        label.className += ` ${this.modifierClass}`;
      }

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = this.name;
      input.value = item.value !== undefined ? item.value : '';
      const optionLabel = item.text || String(item.value ?? '');
      if (optionLabel) input.setAttribute('aria-label', optionLabel);
      
      // Устанавливаем checked если значение совпадает
      // Обрабатываем пустую строку как валидное значение
      const valueMatches = this.value !== null && this.value !== undefined && String(input.value) === String(this.value);
      // Если значение не установлено (null/undefined), всегда выбираем первую опцию (по умолчанию)
      // Если значение пустое (''), также выбираем первую опцию, если она тоже пустая
      const shouldSelectFirst = index === 0 && (
        this.value === null || 
        this.value === undefined || 
        (this.value === '' && input.value === '')
      );
      
      if (valueMatches || shouldSelectFirst) {
        input.checked = true;
      }

      const content = document.createElement('span');
      content.className = 'radio-button-content';
      
      if (item.icon && item.icon.trim() !== '') {
        const iconHtml = `<svg class="radio-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${item.icon}
          </svg>`;
        
        if (this.iconOnly) {
          content.innerHTML = iconHtml;
          if (optionLabel) label.title = optionLabel;
        } else {
          content.innerHTML = `${iconHtml}${item.text || ''}`;
        }
      } else if (item.text && !this.iconOnly) {
        content.textContent = item.text;
      }

      label.appendChild(input);
      label.appendChild(content);
      group.appendChild(label);
    });

    this.element = group;
  }

  render() {
    return this.element;
  }
}

export default RadioButton;

