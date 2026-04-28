class Checkbox {
  constructor(options = {}) {
    this.checked = options.checked || false;
    this.element = null;
    this.init();
  }

  init() {
    const label = document.createElement('label');
    label.className = 'checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = this.checked;

    label.appendChild(checkbox);
    this.element = label;
  }

  render() {
    return this.element;
  }
}

export default Checkbox;

