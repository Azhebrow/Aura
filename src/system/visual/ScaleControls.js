import Slider from '../../components/form/Slider.js';

class ScaleControls {
  constructor() {
    this.element = null;
    this.scaleValue = 1.0; // Значение по умолчанию 100%
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'scale-controls';

    // Загружаем сохраненное значение из localStorage
    const savedScale = localStorage.getItem('aura-app-scale');
    if (savedScale) {
      const parsedValue = parseFloat(savedScale);
      if (!isNaN(parsedValue) && parsedValue >= 0.75 && parsedValue <= 1.25) {
        this.scaleValue = parsedValue;
        // Применяем сохраненное значение
        document.documentElement.style.setProperty('--app-scale', savedScale);
      }
    } else {
      // Если нет сохраненного значения, применяем значение по умолчанию
      const defaultScale = '1.0';
      document.documentElement.style.setProperty('--app-scale', defaultScale);
    }

    // Создаем контрол для масштаба (передаем числовое значение для слайдера, умноженное на 100 для процентов)
    const control = this.createScaleControl(this.scaleValue);
    this.element.appendChild(control);
  }

  createScaleControl(defaultValue) {
    const container = document.createElement('div');
    container.className = 'scale-control-item';

    // Используем Slider компонент с сохраненным значением
    // Слайдер работает с процентами от 75 до 125, но храним как десятичное число от 0.75 до 1.25
    const sliderValue = Math.round(defaultValue * 100); // Преобразуем в проценты для слайдера
    const slider = new Slider({
      min: 75,
      max: 125,
      value: sliderValue
    });

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'scale-value';
    const displayValue = Math.round(defaultValue * 100) + '%';
    valueDisplay.textContent = displayValue;

    // Находим input внутри Slider компонента и добавляем обработчик
    const sliderInput = slider.element.querySelector('input');
    if (sliderInput) {
      // Устанавливаем правильное значение если оно было сохранено
      sliderInput.value = sliderValue;
      
      sliderInput.addEventListener('input', (e) => {
        // Преобразуем проценты обратно в десятичное число
        const percentValue = parseInt(e.target.value, 10);
        const scaleValue = percentValue / 100;
        const displayPercent = percentValue + '%';
        valueDisplay.textContent = displayPercent;
        this.updateScale(scaleValue);
      });
    }

    container.appendChild(slider.render());
    container.appendChild(valueDisplay);

    return container;
  }

  updateScale(value) {
    // Применяем новый масштаб к CSS переменной
    const scaleString = value.toString();
    document.documentElement.style.setProperty('--app-scale', scaleString);

    // Сохраняем в localStorage
    localStorage.setItem('aura-app-scale', scaleString);

    console.log(`Масштаб приложения изменен на: ${Math.round(value * 100)}%`);
  }

  render() {
    return this.element;
  }
}

export default ScaleControls;
