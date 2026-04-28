/**
 * Компонент легенды для графиков статистики
 * Использует Card компоненты для каждого датасета
 */

import Card from '../layout/Card.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { hslToHex } from '../../utils/colorConversion.js';
import { iconLoader } from '../../utils/index.js';

class StatsLegend {
  constructor(lineChart, pieChart, meta = null, table = null, onUpdatePieList = null, mode = null, groupBy = null) {
    this.lineChart = lineChart;
    this.pieChart = pieChart;
    this.table = table; // Ссылка на таблицу для обновления видимости
    this.onUpdatePieList = onUpdatePieList; // Callback для обновления списка круговой диаграммы
    this.meta = meta || { icons: {}, colors: {} };
    this.mode = mode; // Режим статистики (tasks, finance, time, rituals)
    this.groupBy = groupBy; // Тип группировки (categories, items)
    this.cards = [];
    this.element = null;
    this.container = null;
  }

  async init() {
    // Создаем основной контейнер
    this.element = document.createElement('div');
    this.element.className = 'stats-legend-container';

    this.container = document.createElement('div');
    this.container.className = 'stats-legend-items';
    // Карточки всегда равномерно распределяются через CSS

    this.element.appendChild(this.container);
  }

  /**
   * Проверяет, нужна ли прокрутка и обновляет классы
   * Карточки всегда равномерно распределяются, но если не помещаются - включаем прокрутку
   */
  checkScroll() {
    if (!this.container || this.cards.length === 0) return;
    
    // Принудительно обновляем layout для точных измерений
    void this.container.offsetHeight;
    
    // Проверяем, нужна ли прокрутка
    const needsScroll = this.container.scrollWidth > this.container.clientWidth;
    
    if (needsScroll) {
      // Нужна прокрутка - добавляем класс для отступа снизу
      this.container.classList.add('has-scroll');
    } else {
      // Всё помещается - убираем класс прокрутки
      this.container.classList.remove('has-scroll');
    }
  }

  /**
   * Обновить легенду с новыми метаданными
   */
  async update(meta = null) {
    if (meta) {
      this.meta = meta;
    }

    if (!this.element) {
      await this.init();
    }

    // Очищаем существующие карточки
    this.cards = [];
    this.container.innerHTML = '';
    // Сбрасываем класс прокрутки
    this.container.classList.remove('has-scroll');

    // Получаем данные из линейного графика (используем его как источник labels)
    const chartData = this.lineChart.getChartData();
    if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
      return this.element;
    }

    // Для line chart каждый dataset - это отдельный ключ (категория/элемент)
    // Для pie chart - один dataset с labels
    const keys = chartData.datasetKeys || chartData.datasets.map((ds, index) => ds.label);

    // Определяем, где нужно вставить разделители
    let separatorIndex = -1;
    if (this.mode === 'finance' && this.groupBy === 'categories') {
      // Между "Доходы" и "Расходы"
      const incomeIndex = keys.indexOf('Доходы');
      const expenseIndex = keys.indexOf('Расходы');
      if (incomeIndex !== -1 && expenseIndex !== -1 && expenseIndex === incomeIndex + 1) {
        separatorIndex = expenseIndex;
      }
    } else if (this.mode === 'finance' && this.groupBy !== 'categories') {
      // Между последним доходом и первым расходом
      // Ключи имеют формат "+ Категория" (доходы) или "- Категория" (расходы)
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].startsWith('- ')) {
          separatorIndex = i;
          break;
        }
      }
    } else if (this.mode === 'time' && this.groupBy === 'categories') {
      // В объединенном режиме: Фокус, Наполнение, Эскапизм
      // Разделитель между "Фокус" и "Наполнение"
      const focusIndex = keys.indexOf('Фокус');
      const fillingIndex = keys.indexOf('Наполнение');
      if (focusIndex !== -1 && fillingIndex !== -1 && fillingIndex === focusIndex + 1) {
        separatorIndex = fillingIndex;
      }
      // Также может быть разделитель между "Наполнение" и "Эскапизм"
      // Но для простоты используем только один разделитель
    } else if (this.mode === 'time' && this.groupBy !== 'categories') {
      // В объединенном режиме: сначала задачи времени, потом задачи досуга
      // Нужно найти первую задачу досуга (filling или escape)
      // Используем информацию из meta
      if (this.meta && this.meta.leisureTaskTypes) {
        // Если в meta есть информация о типах задач досуга
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (this.meta.leisureTaskTypes[key]) {
            // Нашли первую задачу досуга
            separatorIndex = i;
            break;
          }
        }
      } else {
        // Fallback: ищем по названиям или используем эвристику
        // Если не нашли, разделитель не добавляем
      }
    } else if (this.mode === 'rituals' && this.groupBy === 'categories') {
      // Между "Утро" и "Вечер"
      const morningIndex = keys.indexOf('Утро');
      const eveningIndex = keys.indexOf('Вечер');
      if (morningIndex !== -1 && eveningIndex !== -1 && eveningIndex === morningIndex + 1) {
        separatorIndex = eveningIndex;
      }
    } else if (this.mode === 'rituals' && this.groupBy !== 'categories') {
      // Между последним утренним и первым вечерним
      // Ритуалы уже отсортированы: сначала утренние, потом вечерние
      // Проверяем по ключам - если у нас есть доступ к информации о ритуалах
      if (this.meta && this.meta.ritualTypes) {
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (this.meta.ritualTypes[key] === 'evening') {
            separatorIndex = i;
            break;
          }
        }
      }
    }

    // Собираем все имена иконок и загружаем их параллельно
    const iconNames = keys
      .map(key => this.meta.icons && this.meta.icons[key] ? this.meta.icons[key] : null)
      .filter(name => name !== null);
    
    // Загружаем все иконки параллельно
    const loadedIcons = iconNames.length > 0 ? await iconLoader.loadIcons(iconNames) : {};

    // Создаем все карточки и добавляем их в DocumentFragment для быстрого добавления
    const fragment = document.createDocumentFragment();
    const cardPromises = [];

    // Создаем карточку для каждого датасета
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      
      // Вставляем разделитель перед текущим элементом, если нужно
      if (i === separatorIndex) {
        const separator = document.createElement('div');
        separator.className = 'stats-legend-separator';
        fragment.appendChild(separator);
      }

      // Получаем цвет из dataset
      let color = null;
      // Если есть цвет в meta, используем его (приоритет)
      if (this.meta.colors && this.meta.colors[key]) {
        color = this.meta.colors[key];
      } else if (chartData.datasets.length > i) {
        const ds = chartData.datasets[i];
        // borderColor обычно в формате rgba(r, g, b, a) или HSL
        const borderColor = ds.borderColor || ds.backgroundColor;
        if (borderColor) {
          // Если это массив, берем элемент по индексу
          const colorValue = Array.isArray(borderColor) ? borderColor[i] : borderColor;
          if (colorValue) {
            // Конвертируем rgba в hex, если нужно
            color = this.extractHexFromRgba(colorValue) || colorValue;
          }
        }
      }
      // Если цвет все еще не найден, используем дефолтный из палитры
      // Это должно быть редко, так как все цвета должны быть в meta
      if (!color) {
        color = CfgColorPalette.getDefaultColor('tasks-categories');
      }

      // Конвертируем HSL в HEX для Card компонента (если нужно)
      let hexColor = color;
      if (color && color.toLowerCase().startsWith('hsl')) {
        try {
          hexColor = hslToHex(color);
        } catch (e) {
          console.warn(`[StatsLegend] Ошибка конвертации HSL цвета ${color}:`, e);
          hexColor = '#3b82f6'; // Fallback
        }
      } else if (!color.startsWith('#')) {
        // Если не HSL и не HEX, пытаемся использовать как есть или fallback
        hexColor = '#3b82f6';
      }

      // Получаем иконку из meta
      let iconName = this.meta.icons && this.meta.icons[key] ? this.meta.icons[key] : null;

      // Создаем карточку с улучшенным дизайном
      const card = new Card({
        title: key,
        iconName: iconName,
        icon: loadedIcons[iconName] ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${loadedIcons[iconName]}</svg>` : null,
        backgroundColor: hexColor,
        checked: this.lineChart.isDatasetVisible(i) && (!this.pieChart || this.pieChart.isDatasetVisible(i)),
        onChange: async (checked) => {
          // Переключаем видимость датасета в обоих графиках
          this.lineChart.toggleDataset(i);
          if (this.pieChart) {
            this.pieChart.toggleDataset(i);
          }
          // Обновляем таблицу, если она есть
          if (this.table) {
            await this.table.render();
          }
          // Обновляем список элементов круговой диаграммы
          if (this.onUpdatePieList) {
            await this.onUpdatePieList(this.meta);
          }
        }
      });

      // Сохраняем промис рендеринга карточки
      cardPromises.push(card.render().then(async () => {
        this.cards.push(card);
        fragment.appendChild(card.element);
        
        // Добавляем звук при клике на карточку легенды (используем capture phase для раннего срабатывания)
        card.element.addEventListener('click', async (e) => {
          if (window.audioSystem) {
            try {
              const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
              const sound = getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_DEFAULT);
              if (sound) {
                window.audioSystem.play(sound);
              }
            } catch (e) {
              console.warn('[StatsLegend] Ошибка загрузки звука:', e);
            }
          }
        }, true); // Используем capture phase
      }));
    }

    // Ждем рендеринга всех карточек параллельно
    await Promise.all(cardPromises);
    
    // Добавляем все элементы в DOM за один раз
    this.container.appendChild(fragment);

    // Проверяем сразу после добавления всех карточек
    // Используем requestAnimationFrame для проверки после рендеринга, но без видимой задержки
    requestAnimationFrame(() => {
      this.checkScroll();
    });

    // Добавляем обработчик изменения размера для динамической проверки
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkScroll();
      });
      this.resizeObserver.observe(this.container);
    }

    return this.element;
  }

  /**
   * Извлечь hex цвет из rgba строки (упрощенная версия)
   */
  extractHexFromRgba(rgba) {
    if (!rgba) return null;
    // Если уже hex формат
    if (rgba.startsWith('#')) {
      return rgba;
    }
    // Пытаемся извлечь из rgba(r, g, b, a)
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return null;
  }

  async render() {
    if (!this.element) {
      await this.init();
    }
    await this.update();
    return this.element;
  }

  destroy() {
    this.cards = [];
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default StatsLegend;

