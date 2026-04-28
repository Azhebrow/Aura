class Textarea {
  constructor(options = {}) {
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.element = null;
    this.init();
  }

  init() {
    this.element = document.createElement('textarea');
    this.element.className = 'textarea';
    this.element.placeholder = this.placeholder;
    this.element.autocomplete = 'off';
    
    if (this.value) {
      this.element.value = this.value;
    }
  }

  render() {
    return this.element;
  }
}

export default Textarea;

