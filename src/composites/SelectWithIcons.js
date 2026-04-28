import CustomSelect from './CustomSelect.js';

class SelectWithIcons {
  constructor(options = {}) {
    this.items = options.items || [];
    this.value = options.value || null;
    this.element = null;
    this.customSelect = null;
    this.init();
  }

  init() {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    const select = document.createElement('select');
    this.items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.value || '';
      option.textContent = item.text || '';
      if (item.icon) {
        option.dataset.icon = item.icon;
      }
      if (this.value !== null && option.value === this.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    wrapper.appendChild(select);
    this.element = wrapper;
  }

  async render() {
    // Инициализируем CustomSelect после рендера
    if (!this.customSelect) {
      this.customSelect = new CustomSelect(this.element);
      await this.customSelect.init();
    }
    return this.element;
  }
}

export default SelectWithIcons;
