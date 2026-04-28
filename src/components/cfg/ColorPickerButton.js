import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { hslToHex } from '../../utils/colorConversion.js';

class ColorPickerButton {
  constructor(options = {}) {
    this.cfgType = options.cfgType || null;
    this.showPalette = options.showPalette !== false; // По умолчанию true
    this.color = options.color || (this.cfgType ? CfgColorPalette.getDefaultColor(this.cfgType) : '#3b82f6');
    this.onChange = options.onChange || null;
    this.element = null;
    this.paletteContainer = null;
    this.button = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      return;
    }

    // Создаем контейнер для кнопки
    this.element = document.createElement('div');
    this.element.className = 'cfg-color-picker-container';

    // Кнопка выбора цвета
    this.button = document.createElement('button');
    this.button.className = 'cfg-color-picker-button';
    this.button.type = 'button';
    this.updateButtonColor(this.color);

    // Скрытый input для нативного color picker
    const input = document.createElement('input');
    input.type = 'color';
    input.value = this.hslToHexForInput(this.color) || this.color;
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.width = '0';
    input.style.height = '0';
    input.style.pointerEvents = 'none';

    input.addEventListener('change', (e) => {
      // Нативный color picker возвращает HEX, конвертируем обратно в HSL если нужно
      this.setColor(e.target.value);
    });

    this.button.addEventListener('click', () => {
      input.click();
    });

    this.button.appendChild(input);
    this.input = input;
    this.element.appendChild(this.button);

    // Создаем палитру если нужно (но не добавляем в element, она будет в отдельной строке)
    if (this.showPalette) {
      // Если cfgType не определен, используем fallback на общую палитру
      const paletteType = this.cfgType || 'tasks-categories';
      this.paletteContainer = this.createPalette(paletteType);
    }

    this.initialized = true;
  }

  createPalette(cfgType = null) {
    // Используем переданный тип или тип из конструктора, с fallback на общую палитру
    const paletteType = cfgType || this.cfgType || 'tasks-categories';

    const container = document.createElement('div');
    container.className = 'cfg-color-palette';

    const palette = CfgColorPalette.getPalette(paletteType);
    
    // Для ритуалов показываем только один цвет (не палитру)
    const isRitual = paletteType === 'rituals-morning' || paletteType === 'rituals-evening';
    const colorsToShow = isRitual ? palette.slice(0, 1) : palette;
    
    // Добавляем класс с количеством цветов для адаптивного CSS
    container.classList.add(`cfg-color-palette-count-${colorsToShow.length}`);
    
    colorsToShow.forEach((item) => {
      const swatch = document.createElement('button');
      swatch.className = 'cfg-color-swatch';
      swatch.type = 'button';
      swatch.style.backgroundColor = item.value;
      swatch.title = `Цвет ${item.index}`;
      swatch.setAttribute('data-color', item.value);
      swatch.setAttribute('data-index', item.index);
      
      // Выделяем текущий выбранный цвет
      if (this.isColorMatch(this.color, item.value)) {
        swatch.classList.add('active');
      }

      swatch.addEventListener('click', async () => {
        // Воспроизводим звук выбора цвета
        if (window.audioSystem) {
          const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
          const sound = getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_DEFAULT);
          if (sound) {
            window.audioSystem.play(sound);
          }
        }
        this.setColor(item.value);
        // Обновляем активное состояние
        container.querySelectorAll('.cfg-color-swatch').forEach(s => {
          s.classList.remove('active');
        });
        swatch.classList.add('active');
      });

      container.appendChild(swatch);
    });

    return container;
  }

  /**
   * Проверяет, совпадают ли два цвета
   */
  isColorMatch(color1, color2) {
    if (!color1 || !color2) return false;
    return CfgColorPalette.compareHSL(color1, color2);
  }

  /**
   * Обновляет цвет кнопки
   */
  updateButtonColor(color) {
    if (this.button && color) {
      this.button.style.backgroundColor = color;
      if (this.input) {
        this.input.value = this.hslToHexForInput(color) || color;
      }
    }
  }

  /**
   * Конвертирует HSL в HEX для нативного color picker
   */
  hslToHexForInput(hsl) {
    if (!hsl) return '';
    // Если уже HEX, возвращаем как есть
    if (hsl.startsWith('#')) {
      return hsl;
    }
    // Если HSL, конвертируем
    if (hsl.toLowerCase().startsWith('hsl')) {
      try {
        return hslToHex(hsl);
      } catch (e) {
        return '';
      }
    }
    return hsl;
  }

  setColor(color) {
    this.color = color;
    this.updateButtonColor(color);
    
    // Обновляем активное состояние в палитре
    if (this.paletteContainer) {
      const swatches = this.paletteContainer.querySelectorAll('.cfg-color-swatch');
      swatches.forEach(swatch => {
        const swatchColor = swatch.getAttribute('data-color');
        if (this.isColorMatch(color, swatchColor)) {
          swatch.classList.add('active');
        } else {
          swatch.classList.remove('active');
        }
      });
    }

    if (this.onChange) {
      this.onChange(color);
    }
  }

  getValue() {
    return this.color;
  }

  /**
   * Возвращает только кнопку выбора цвета
   */
  getButton() {
    if (!this.initialized) {
      this.init();
    }
    return this.element;
  }

  /**
   * Возвращает только палитру цветов
   */
  getPalette() {
    if (!this.initialized) {
      this.init();
    }
    return this.paletteContainer;
  }

  render() {
    if (!this.initialized) {
      this.init();
    }
    // Для обратной совместимости возвращаем контейнер с кнопкой
    return this.element;
  }
}

export default ColorPickerButton;



