/**
 * Компонент переключателя для нескольких опций (2-4)
 */

class MultiToggleSwitch {
  constructor(options = {}) {
    this.options = options.options || [];
    this.value = options.value || (this.options[0]?.value);
    this.onChange = options.onChange || null;
    this.icons = options.icons || {};
    this.element = null;
    this.init();
  }

  init() {
    const wrapper = document.createElement('div');
    wrapper.className = 'toggle-switch-wrapper';

    const track = document.createElement('div');
    track.className = 'toggle-switch-track';
    
    this.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'toggle-switch-option';
      button.type = 'button';
      button.dataset.value = option.value;
      
      const content = document.createElement('span');
      content.className = 'toggle-switch-content';
      
      if (this.icons[option.value]) {
        const iconEl = document.createElement('span');
        iconEl.className = 'toggle-switch-icon';
        iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${this.icons[option.value]}</svg>`;
        content.appendChild(iconEl);
      }
      
      const text = document.createElement('span');
      text.className = 'toggle-switch-text';
      text.textContent = option.text;
      content.appendChild(text);
      
      button.appendChild(content);
      
      // Устанавливаем начальное состояние
      if (this.value === option.value) {
        button.classList.add('active');
      }
      
      // Обработчик клика
      button.addEventListener('click', () => {
        if (this.value !== option.value) {
          this.value = option.value;
          this.updateState(track);
          if (this.onChange) {
            this.onChange(this.value);
          }
        }
      });
      
      track.appendChild(button);
    });

    wrapper.appendChild(track);
    this.element = wrapper;
    this.track = track;
  }

  updateState(track) {
    const buttons = track.querySelectorAll('.toggle-switch-option');
    buttons.forEach(button => {
      if (button.dataset.value === this.value) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  setValue(value) {
    if (this.options.some(opt => opt.value === value)) {
      this.value = value;
      if (this.track) {
        this.updateState(this.track);
      }
    }
  }

  render() {
    return this.element;
  }
}

export default MultiToggleSwitch;
