import CustomSelect from '../../composites/CustomSelect.js';

class Select {
  constructor(options = {}) {
    this.items = options.items || [];
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
      if (typeof item === 'string') {
        option.value = item;
        option.textContent = item;
      } else {
        option.value = item.value || '';
        option.textContent = item.text || '';
        // Устанавливаем selected, если указано
        if (item.selected) {
          option.selected = true;
        }
        // Передаем fontFamily через data-атрибут, если указан
        if (item.fontFamily) {
          option.dataset.fontFamily = item.fontFamily;
        }
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

export default Select;