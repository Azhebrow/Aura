import CardGroup from '../../components/layout/CardGroup.js';
import { iconLoader } from '../../utils/index.js';
import ColorSystem from '../../design-system/tokens/ColorSystem.js';

class AccentColorPicker {
  constructor() {
    this.element = null;
    this.presets = ColorSystem.getPresets();
    this.currentColorIndex = 0;
  }

  async init() {
    this.element = document.createElement('div');
    this.element.className = 'accent-color-picker';

    // Загружаем сохраненный цвет из localStorage
    const savedColor = localStorage.getItem('aura-accent-color');
    const currentAccentColor = savedColor || ColorSystem.getDefaultAccent();
    
    // Находим индекс текущего цвета
    const colorIndex = this.presets.findIndex(p => p.value === currentAccentColor);
    this.currentColorIndex = colorIndex >= 0 ? colorIndex : 0;

    // Создаем контейнер для цветных кнопок
    const colorsContainer = document.createElement('div');
    colorsContainer.className = 'accent-color-picker-colors';

    const uiTheme =
      document.documentElement.getAttribute('data-theme') || 'dark';

    // Создаем компактные круглые кнопки для каждого цвета
    for (let index = 0; index < this.presets.length; index++) {
      const preset = this.presets[index];
      const colorButton = document.createElement('button');
      colorButton.className = 'accent-color-picker-button';
      colorButton.type = 'button';
      colorButton.setAttribute('aria-label', preset.name);
      colorButton.dataset.color = preset.value;
      
      if (index === this.currentColorIndex) {
        colorButton.classList.add('active');
      }

      // Круглый индикатор цвета — показываем тот же цвет, что и в интерфейсе (кнопки, границы),
      // т.е. accentUI, чтобы превью совпадало с применяемым
      const displayColor = ColorSystem.getAccentForUI(preset.value, uiTheme);
      const colorCircle = document.createElement('span');
      colorCircle.className = 'accent-color-picker-circle';
      colorCircle.style.backgroundColor = displayColor;
      
      // Загружаем иконку, если она указана
      if (preset.icon) {
        try {
          const iconSvg = await iconLoader.loadIcon(preset.icon);
          const iconElement = document.createElement('span');
          iconElement.className = 'accent-color-picker-icon';
          
          // Определяем контрастный цвет для иконки (по отображаемому цвету круга)
          const contrastColor = ColorSystem.getContrastColor(displayColor);
          const iconColor = contrastColor === '#000000' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)';
          const shadowColor = contrastColor === '#000000' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
          
          iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1px 1px ${shadowColor});">${iconSvg}</svg>`;
          colorCircle.appendChild(iconElement);
        } catch (error) {
          console.warn(`[AccentColorPicker] Не удалось загрузить иконку "${preset.icon}" для цвета "${preset.name}"`, error);
        }
      }
      
      colorButton.appendChild(colorCircle);
      
      colorButton.addEventListener('click', () => {
        // Убираем активный класс со всех кнопок
        colorsContainer.querySelectorAll('.accent-color-picker-button').forEach(btn => {
          btn.classList.remove('active');
        });
        // Добавляем активный класс к выбранной
        colorButton.classList.add('active');
        this.currentColorIndex = index;
        this.selectColor(preset.value);
      });

      colorsContainer.appendChild(colorButton);
    }

    this.element.appendChild(colorsContainer);
  }

  selectColor(color) {
    // Используем централизованную систему
    ColorSystem.setAccent(color);
    console.log(`Акцентный цвет изменен на: ${color}`);
  }

  async render() {
    if (!this.element) {
      await this.init();
    }
    return this.element;
  }
}

export default AccentColorPicker;
