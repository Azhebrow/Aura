import Slider from '../../components/form/Slider.js';

class SpacingControls {
  constructor() {
    this.element = null;
    this.spacingValues = {
      sm: 8
    };
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'spacing-controls';

    // Создаем контрол для отступа
    const control = this.createSpacingControl('sm', this.spacingValues.sm);
    this.element.appendChild(control);
  }

  createSpacingControl(key, defaultValue) {
    const container = document.createElement('div');
    container.className = 'spacing-control-item';

    const label = document.createElement('span');
    label.className = 'spacing-label';
    label.textContent = `--space-${key}`;

    // Используем Slider компонент
    const slider = new Slider({
      min: 4,
      max: 40,
      value: defaultValue
    });

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'spacing-value';
    valueDisplay.textContent = defaultValue + 'px';

    // Находим input внутри Slider компонента и добавляем обработчик
    const sliderInput = slider.element.querySelector('input');
    if (sliderInput) {
      sliderInput.addEventListener('input', (e) => {
        const newValue = e.target.value + 'px';
        valueDisplay.textContent = newValue;
        this.updateSpacing(key, newValue);
      });
    }

    container.appendChild(label);
    container.appendChild(slider.render());
    container.appendChild(valueDisplay);

    return container;
  }

  updateSpacing(key, value) {
    // Применяем новый отступ к CSS переменной
    document.documentElement.style.setProperty(`--space-${key}`, value);

    console.log(`Отступ --space-${key} изменен на: ${value}`);
  }

  render() {
    return this.element;
  }
}

export default SpacingControls;
