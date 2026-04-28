class Input {
  constructor(options = {}) {
    this.type = options.type || 'text';
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.min = options.min;
    this.max = options.max;
    this.element = null;
    this.wrapper = null;
    this.init();
  }

  async init() {
    this.element = document.createElement('input');
    this.element.type = this.type;
    this.element.className = 'input';
    this.element.placeholder = this.placeholder;
    this.element.autocomplete = 'off';
    
    if (this.value) {
      this.element.value = this.value;
    }
    if (this.min !== undefined) {
      this.element.min = this.min;
    }
    if (this.max !== undefined) {
      this.element.max = this.max;
    }

    // Для полей даты добавляем кастомную иконку календаря
    if (this.type === 'date') {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'input-date-wrapper';
      this.wrapper.style.position = 'relative';
      this.wrapper.style.display = 'flex';
      this.wrapper.style.alignItems = 'center';
      this.wrapper.style.width = '100%';
      
      this.element.style.paddingRight = 'calc(var(--space-md) + 1rem + var(--space-xs))';
      
      const calendarIcon = document.createElement('span');
      calendarIcon.className = 'input-date-icon';
      calendarIcon.style.cssText = `
        position: absolute;
        right: var(--space-md);
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        color: var(--color-on-surface);
        opacity: 0.8;
        transition: opacity 0.2s ease;
      `;
      
      // SVG иконка календаря
      calendarIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      `;
      
      this.wrapper.appendChild(this.element);
      this.wrapper.appendChild(calendarIcon);
    }
  }

  render() {
    return this.wrapper || this.element;
  }
}

export default Input;

