class InputSuffix {
  constructor(options = {}) {
    this.type = options.type || 'text';
    this.value = options.value || '';
    this.suffix = options.suffix || '';
    this.placeholder = options.placeholder || '';
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this.element = null;
    this.inputElement = null;
    this.init();
  }

  init() {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-suffix-wrapper';

    const input = document.createElement('input');
    input.type = this.type;
    input.className = 'input';
    input.value = this.value;
    input.placeholder = this.placeholder;
    input.autocomplete = 'off';
    
    if (this.min !== undefined) {
      input.min = this.min;
    }
    if (this.max !== undefined) {
      input.max = this.max;
    }
    if (this.step !== undefined) {
      input.step = this.step;
    }

    // Добавляем суффикс только если он указан
    if (this.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'input-suffix';
      suffix.textContent = this.suffix;
      wrapper.appendChild(suffix);
    }

    wrapper.appendChild(input);
    this.inputElement = input;
    this.element = wrapper;
  }

  render() {
    return this.element;
  }
  
  // Метод для получения input элемента (для установки name, required и т.д.)
  getInput() {
    return this.inputElement;
  }
}

export default InputSuffix;
