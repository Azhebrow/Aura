import Slider from '../../components/form/Slider.js';

class RadiusControls {
  constructor() {
    this.element = null;
    this.radiusValues = {
      default: 8
    };
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'radius-controls';

    // Загружаем сохраненные значения из localStorage
    const savedRadius = localStorage.getItem('aura-radius');
    if (savedRadius) {
      const parsedValue = parseInt(savedRadius.replace('px', ''), 10);
      if (!isNaN(parsedValue)) {
        this.radiusValues.default = parsedValue;
        // Применяем сохраненное значение
        document.documentElement.style.setProperty('--radius', savedRadius);
      }
    } else {
      // Если нет сохраненного значения, применяем значение по умолчанию
      const defaultRadius = this.radiusValues.default + 'px';
      document.documentElement.style.setProperty('--radius', defaultRadius);
    }

    // Создаем контрол для радиуса (передаем числовое значение для слайдера)
    const control = this.createRadiusControl('', this.radiusValues.default);
    this.element.appendChild(control);
  }

  createRadiusControl(key, defaultValue) {
    const container = document.createElement('div');
    container.className = 'radius-control-item';

    // Используем Slider компонент с сохраненным значением
    const slider = new Slider({
      min: 0,
      max: 20,
      value: defaultValue
    });

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'radius-value';
    const displayValue = typeof defaultValue === 'number' ? defaultValue + 'px' : defaultValue;
    valueDisplay.textContent = displayValue;

    // Находим input внутри Slider компонента и добавляем обработчик
    const sliderInput = slider.element.querySelector('input');
    if (sliderInput) {
      // Устанавливаем правильное значение если оно было сохранено
      if (typeof defaultValue === 'string' && defaultValue.includes('px')) {
        const numValue = parseInt(defaultValue.replace('px', ''), 10);
        if (!isNaN(numValue)) {
          sliderInput.value = numValue;
        }
      }
      
      sliderInput.addEventListener('input', (e) => {
        const newValue = e.target.value + 'px';
        valueDisplay.textContent = newValue;
        this.updateRadius(key, newValue);
      });
    }

    container.appendChild(slider.render());
    container.appendChild(valueDisplay);

    return container;
  }

  updateRadius(key, value) {
    // Применяем новый радиус к CSS переменной
    const varName = key ? `--radius-${key}` : '--radius';
    document.documentElement.style.setProperty(varName, value);

    // Сохраняем в localStorage
    const storageKey = key ? `aura-radius-${key}` : 'aura-radius';
    localStorage.setItem(storageKey, value);

    console.log(`Радиус ${varName} изменен на: ${value}`);
  }

  render() {
    return this.element;
  }
}

export default RadiusControls;
