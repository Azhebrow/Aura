/**
 * Компонент переключателя для двух опций
 */

class ToggleSwitch {
  constructor(options = {}) {
    this.leftOption = options.leftOption || { value: 'left', text: 'Лево' };
    this.rightOption = options.rightOption || { value: 'right', text: 'Право' };
    this.value = options.value || this.leftOption.value;
    this.onChange = options.onChange || null;
    this.leftIcon = options.leftIcon || null;
    this.rightIcon = options.rightIcon || null;
    this.element = null;
    this.init();
  }

  init() {
    const wrapper = document.createElement('div');
    wrapper.className = 'toggle-switch-wrapper';

    const track = document.createElement('div');
    track.className = 'toggle-switch-track';
    
    const leftButton = document.createElement('button');
    leftButton.className = 'toggle-switch-option';
    leftButton.type = 'button';
    leftButton.dataset.value = this.leftOption.value;
    
    const leftContent = document.createElement('span');
    leftContent.className = 'toggle-switch-content';
    if (this.leftIcon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'toggle-switch-icon';
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${this.leftIcon}</svg>`;
      leftContent.appendChild(iconEl);
    }
    const leftText = document.createElement('span');
    leftText.className = 'toggle-switch-text';
    leftText.textContent = this.leftOption.text;
    leftContent.appendChild(leftText);
    leftButton.appendChild(leftContent);

    const rightButton = document.createElement('button');
    rightButton.className = 'toggle-switch-option';
    rightButton.type = 'button';
    rightButton.dataset.value = this.rightOption.value;
    
    const rightContent = document.createElement('span');
    rightContent.className = 'toggle-switch-content';
    if (this.rightIcon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'toggle-switch-icon';
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${this.rightIcon}</svg>`;
      rightContent.appendChild(iconEl);
    }
    const rightText = document.createElement('span');
    rightText.className = 'toggle-switch-text';
    rightText.textContent = this.rightOption.text;
    rightContent.appendChild(rightText);
    rightButton.appendChild(rightContent);

    track.appendChild(leftButton);
    track.appendChild(rightButton);

    // Устанавливаем начальное состояние
    this.updateState(track);

    // Обработчики кликов
    leftButton.addEventListener('click', () => {
      if (this.value !== this.leftOption.value) {
        this.value = this.leftOption.value;
        this.updateState(track);
        if (this.onChange) {
          this.onChange(this.value);
        }
      }
    });

    rightButton.addEventListener('click', () => {
      if (this.value !== this.rightOption.value) {
        this.value = this.rightOption.value;
        this.updateState(track);
        if (this.onChange) {
          this.onChange(this.value);
        }
      }
    });

    wrapper.appendChild(track);
    this.element = wrapper;
    this.track = track;
  }

  updateState(track) {
    const leftButton = track.querySelector(`[data-value="${this.leftOption.value}"]`);
    const rightButton = track.querySelector(`[data-value="${this.rightOption.value}"]`);
    
    if (this.value === this.leftOption.value) {
      leftButton?.classList.add('active');
      rightButton?.classList.remove('active');
    } else {
      leftButton?.classList.remove('active');
      rightButton?.classList.add('active');
    }
  }

  setValue(value) {
    if (value === this.leftOption.value || value === this.rightOption.value) {
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

export default ToggleSwitch;
