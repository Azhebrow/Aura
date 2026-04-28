/**
 * Компонент графика на основе Chart.js
 */

import { formatForChart } from '../../utils/stats/StatsDataFormatter.js';

// Ленивая загрузка Chart.js для избежания ошибок при импорте
let Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend;
let LineController, BarController, PieController, DoughnutController;
let chartJSLoaded = false;

async function loadChartJS() {
  if (chartJSLoaded) {
    return Chart;
  }

  try {
    // В Electron используем require для загрузки модулей из node_modules
    if (typeof window !== 'undefined' && window.require && typeof process !== 'undefined') {
      // Electron окружение - используем require
      try {
        // Пробуем загрузить через прямой require (использует chart.cjs)
        const chartModule = window.require('chart.js');
        
        // Chart.js CommonJS экспортирует через default
        const chartDefault = chartModule.default || chartModule;
        
        Chart = chartDefault.Chart || chartDefault;
        
        // Все компоненты доступны через chartDefault
        CategoryScale = chartDefault.CategoryScale;
        LinearScale = chartDefault.LinearScale;
        PointElement = chartDefault.PointElement;
        LineElement = chartDefault.LineElement;
        BarElement = chartDefault.BarElement;
        ArcElement = chartDefault.ArcElement;
        Title = chartDefault.Title;
        Tooltip = chartDefault.Tooltip;
        Legend = chartDefault.Legend;
        LineController = chartDefault.LineController;
        BarController = chartDefault.BarController;
        PieController = chartDefault.PieController;
        DoughnutController = chartDefault.DoughnutController;
        
      } catch (requireError) {
        console.error('[StatsChart] Ошибка загрузки через require:', requireError);
        throw requireError;
      }
    } else {
      // Браузерное окружение - используем import
      const chartModule = await import('chart.js');
      Chart = chartModule.Chart;
      CategoryScale = chartModule.CategoryScale;
      LinearScale = chartModule.LinearScale;
      PointElement = chartModule.PointElement;
      LineElement = chartModule.LineElement;
      BarElement = chartModule.BarElement;
      ArcElement = chartModule.ArcElement;
      Title = chartModule.Title;
      Tooltip = chartModule.Tooltip;
      Legend = chartModule.Legend;
      LineController = chartModule.LineController;
      BarController = chartModule.BarController;
      PieController = chartModule.PieController;
      DoughnutController = chartModule.DoughnutController;
    }
    
    // Регистрируем все необходимые компоненты Chart.js
    if (Chart && Chart.register) {
      const componentsToRegister = [];
      
      // Добавляем компоненты только если они найдены
      if (CategoryScale) componentsToRegister.push(CategoryScale);
      if (LinearScale) componentsToRegister.push(LinearScale);
      if (PointElement) componentsToRegister.push(PointElement);
      if (LineElement) componentsToRegister.push(LineElement);
      if (BarElement) componentsToRegister.push(BarElement);
      if (ArcElement) componentsToRegister.push(ArcElement);
      if (Title) componentsToRegister.push(Title);
      if (Tooltip) componentsToRegister.push(Tooltip);
      if (Legend) componentsToRegister.push(Legend);
      if (LineController) componentsToRegister.push(LineController);
      if (BarController) componentsToRegister.push(BarController);
      if (PieController) componentsToRegister.push(PieController);
      if (DoughnutController) componentsToRegister.push(DoughnutController);
      
      Chart.register(...componentsToRegister);
    }

    chartJSLoaded = true;
    return Chart;
  } catch (error) {
    console.error('[StatsChart] Ошибка загрузки Chart.js:', error);
    throw error;
  }
}

class StatsChart {
  constructor() {
    this.element = null;
    this.canvas = null;
    this.chart = null;
    this.data = null;
    this.mode = 'tasks';
    this.chartType = 'line';
    this.groupBy = 'categories';
    this.meta = null; // Метаданные с иконками и цветами
    this.chartData = null; // Сохраняем данные графика для легенды
  }

  async init() {
    // Загружаем Chart.js при инициализации
    try {
      await loadChartJS();
    } catch (error) {
      console.error('[StatsChart] Не удалось загрузить Chart.js:', error);
    }

    this.element = document.createElement('div');
    this.element.className = 'stats-chart-container';

    this.canvas = document.createElement('canvas');
    this.element.appendChild(this.canvas);
  }

  setData(data, mode, chartType, groupBy, meta = null) {
    this.data = data;
    this.mode = mode;
    this.chartType = chartType;
    this.groupBy = groupBy;
    this.meta = meta;
  }

  /**
   * Определить тип графика на основе режима
   */
  determineChartType(mode) {
    switch (mode) {
      case 'tasks':
      case 'rituals':
      case 'mood':
      case 'rank':
        return 'line';
      case 'finance':
        return 'bar';
      case 'time':
        return 'line'; // Можно также использовать 'pie' для распределения
      default:
        return 'line';
    }
  }

  async render() {
    if (!this.element) {
      await this.init();
    }

    // Определяем тип графика, если не указан явно
    if (!this.chartType) {
      this.chartType = this.determineChartType(this.mode);
    }

    // Уничтожаем предыдущий график, если существует
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (!this.data || this.data.length === 0) {
      this.canvas.style.display = 'none';
      this.element.classList.remove('stats-chart-container--pie');
      return this.element;
    }

    this.canvas.style.display = 'block';

    // Получаем семейство шрифтов один раз
    const fontFamily = this.getFontFamily();

    // Форматируем данные для Chart.js (datasetKeys / moodLevels нужны легенде и списку pie)
    const formattedChartData = formatForChart(this.data, this.mode, this.chartType, this.groupBy, this.meta);
    this.chartData = { ...formattedChartData };
    const chartData = formattedChartData;

    // Вычисляем min и max для режима rank на основе данных
    let rankMin = undefined;
    let rankMax = undefined;
    if (this.mode === 'rank' && chartData && chartData.datasets) {
      let allValues = [];
      chartData.datasets.forEach(dataset => {
        if (dataset.data && Array.isArray(dataset.data)) {
          dataset.data.forEach(point => {
            if (point !== null && point !== undefined && !isNaN(point.y)) {
              allValues.push(point.y);
            } else if (typeof point === 'number' && !isNaN(point)) {
              allValues.push(point);
            }
          });
        }
      });
      if (allValues.length > 0) {
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        
        // Если значения в диапазоне примерно от -100 до +100, это дневные очки
        // Если значения больше (например, сотни или тысячи), это накопительные очки
        if (minValue >= -150 && maxValue <= 150) {
          // Дневные очки - фиксированный диапазон -100 до +100
          rankMin = -100;
          rankMax = 100;
        } else {
          // Накопительные очки - автоматический диапазон с отступом
          rankMin = minValue;
          rankMax = maxValue;
          const range = rankMax - rankMin;
          const padding = range > 0 ? range * 0.1 : 10; // 10% отступ или минимум 10 единиц
          rankMin = rankMin - padding;
          rankMax = rankMax + padding;
        }
      }
    }

    // Получаем цвета темы из CSS переменных
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const textColor = computedStyle.getPropertyValue('--color-on-surface').trim() || '#ffffff';
    const textSecondaryColor = computedStyle.getPropertyValue('--color-on-surface-secondary').trim() || 'var(--color-on-surface-secondary)';
    const borderColor = computedStyle.getPropertyValue('--color-border').trim() || 'var(--color-border)';
    const backgroundColor = computedStyle.getPropertyValue('--color-section-background').trim() || 'transparent';
    const surfaceElevated = computedStyle.getPropertyValue('--color-surface-elevated').trim() || 'rgba(0, 0, 0, 0.8)';
    
    // Полупрозрачный фон для tooltip с размытием
    // Преобразуем backgroundColor в rgba с альфа-каналом для полупрозрачности
    let tooltipBackgroundColor = 'rgba(0, 0, 0, 0.7)'; // Дефолтное значение
    if (backgroundColor && backgroundColor !== 'transparent') {
      // Если цвет в формате hex, конвертируем в rgba
      if (backgroundColor.startsWith('#')) {
        const hex = backgroundColor.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        tooltipBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`; // 70% непрозрачности
      } else if (backgroundColor.startsWith('rgba')) {
        // Если уже rgba, изменяем альфа-канал
        const match = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
          const r = match[1];
          const g = match[2];
          const b = match[3];
          tooltipBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
      } else if (backgroundColor.startsWith('rgb')) {
        // Если rgb, добавляем альфа-канал
        const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = match[1];
          const g = match[2];
          const b = match[3];
          tooltipBackgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
      }
    }

    // Функция для обновления стилей индикаторов в tooltip
    const updateTooltipIndicators = (tooltipEl) => {
      if (!tooltipEl) return;

      // Убираем белый фон у цветных индикаторов
      const colorIndicators = tooltipEl.querySelectorAll('.chartjs-tooltip-color, .chartjs-tooltip-color-box');
      colorIndicators.forEach((indicator) => {
        // Получаем цвет из borderColor или backgroundColor inline стилей
        const borderColor = indicator.style.borderColor || 
                           indicator.style.backgroundColor ||
                           getComputedStyle(indicator).borderColor ||
                           getComputedStyle(indicator).color;
        
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
          // Используем цвет обводки для фона
          indicator.style.backgroundColor = borderColor;
          indicator.style.border = 'none';
        } else {
          // Если цвет не найден, пытаемся получить из родительского элемента или использовать прозрачный
          const computedColor = getComputedStyle(indicator).color;
          if (computedColor && computedColor !== 'rgba(0, 0, 0, 0)') {
            indicator.style.backgroundColor = computedColor;
          } else {
            indicator.style.backgroundColor = 'transparent';
          }
          indicator.style.border = 'none';
        }
      });
    };

    // Плагин: стили индикаторов tooltip (без backdrop-filter)
    const tooltipBlurPlugin = {
      id: 'tooltipBlur',
      afterDraw: (chart) => {
        // Находим tooltip элемент
        const tooltipEl = chart.canvas.parentElement?.querySelector('.chartjs-tooltip') ||
                         document.querySelector('.chartjs-tooltip');
        updateTooltipIndicators(tooltipEl);
      }
    };

    // Добавляем глобальный стиль для tooltip с размытием и цветными индикаторами
    if (!document.getElementById('chart-tooltip-blur-style')) {
      const style = document.createElement('style');
      style.id = 'chart-tooltip-blur-style';
      style.textContent = `
        /* Убираем белый фон у цветных индикаторов, делаем полностью цветными */
        .chartjs-tooltip .chartjs-tooltip-color,
        .chartjs-tooltip-color {
          background-color: transparent !important;
          border: none !important;
          border-radius: 50% !important;
          width: 12px !important;
          height: 12px !important;
        }
        /* Для квадратных индикаторов тоже убираем белый фон */
        .chartjs-tooltip .chartjs-tooltip-color-box,
        .chartjs-tooltip-color-box {
          background-color: transparent !important;
          border: none !important;
          border-radius: 2px !important;
          width: 12px !important;
          height: 12px !important;
        }
        /* Переопределяем inline стили, которые устанавливает Chart.js - используем цвет из borderColor */
        .chartjs-tooltip .chartjs-tooltip-color[style],
        .chartjs-tooltip-color[style] {
          background-color: var(--chartjs-tooltip-color, currentColor) !important;
        }
        .chartjs-tooltip .chartjs-tooltip-color-box[style],
        .chartjs-tooltip-color-box[style] {
          background-color: var(--chartjs-tooltip-color, currentColor) !important;
        }
      `;
      document.head.appendChild(style);
    }

    const isPie = this.chartType === 'pie' || this.chartType === 'doughnut';
    if (isPie) {
      this.element.classList.add('stats-chart-container--pie');
    } else {
      this.element.classList.remove('stats-chart-container--pie');
    }

    // Конфигурация графика
    const config = {
      type: this.chartType,
      data: chartData,
      plugins: [tooltipBlurPlugin],
      options: {
        responsive: true,
        // Круг: фиксируем соотношение сторон, иначе canvas тянется в прямоугольник и эллипс искажается
        maintainAspectRatio: isPie ? true : false,
        aspectRatio: isPie ? 1 : undefined,
        ...(isPie ? { layout: { padding: 6 } } : {}),
        backgroundColor: 'transparent', // Прозрачный фон графика
        plugins: {
          legend: {
            display: false, // Отключаем встроенную легенду, используем кастомную
          },
          tooltip: {
            backgroundColor: tooltipBackgroundColor,
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: borderColor,
            borderWidth: 1,
            padding: 12,
            displayColors: true, // Показываем цветные индикаторы
            usePointStyle: false, // Не используем стиль точки
            boxPadding: 6, // Отступ для цветных индикаторов
            // Показывать tooltip при наведении вблизи точки, а не только при точном попадании
            intersect: false,
            titleFont: {
              family: fontFamily,
              size: 15,
              weight: '300'
            },
            bodyFont: {
              family: fontFamily,
              size: 14,
              weight: '300'
            },
            cornerRadius: 6,
            callbacks: {
              labelColor: (context) => {
                const ds = context.dataset;
                const i = context.dataIndex;
                const pick = (v) => (Array.isArray(v) ? v[i] ?? v[0] : v);
                let color = pick(ds.borderColor) || pick(ds.backgroundColor);
                if (!color || typeof color !== 'string') {
                  color = '#6b7280';
                }
                if (context.chart && context.chart.canvas) {
                  const tooltipEl = context.chart.canvas.parentElement?.querySelector('.chartjs-tooltip');
                  if (tooltipEl) {
                    tooltipEl.style.setProperty('--chartjs-tooltip-color', color);
                  }
                }
                return {
                  borderColor: color,
                  backgroundColor: color,
                  borderWidth: 0
                };
              },
              title: (context) => {
                if (isPie) {
                  // У pie/doughnut подпись сегмента и так в строке label — заголовок не дублируем
                  return '';
                }
                if (context && context.length > 0) {
                  return context[0].label || '';
                }
                return '';
              },
              label: (context) => {
                const parsed = isPie
                  ? context.parsed
                  : (context.parsed.y !== null && context.parsed.y !== undefined
                    ? context.parsed.y
                    : context.parsed);
                const value = typeof parsed === 'number' ? parsed : Number(parsed?.y ?? parsed ?? 0);

                let valueStr = '';
                if (this.mode === 'tasks' || this.mode === 'rituals') {
                  valueStr = `${Math.round(value)}%`;
                } else if (this.mode === 'finance') {
                  valueStr = `${Math.round(value).toLocaleString('ru-RU')} ₽`;
                } else if (this.mode === 'time' || this.mode === 'leisure') {
                  const totalMinutes = Math.round(value * 60);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  if (hours === 0) {
                    valueStr = `${minutes} м`;
                  } else if (minutes === 0) {
                    valueStr = `${hours} ч`;
                  } else {
                    valueStr = `${hours} ч ${minutes} м`;
                  }
                } else if (this.mode === 'rank') {
                  valueStr = Math.round(value).toLocaleString('ru-RU');
                } else if (this.mode === 'mood') {
                  valueStr = Math.round(value).toString();
                } else {
                  valueStr = Math.round(value).toString();
                }

                if (isPie) {
                  const segmentLabel = context.label || '';
                  const dsLabel = context.dataset?.label;
                  if (segmentLabel) {
                    return `${segmentLabel}: ${valueStr}`;
                  }
                  return dsLabel ? `${dsLabel}: ${valueStr}` : valueStr;
                }

                const seriesLabel = context.dataset.label || '';
                return seriesLabel ? `${seriesLabel}: ${valueStr}` : valueStr;
              }
            }
          }
        },
        interaction: isPie
          ? { intersect: true, mode: 'nearest' }
          : {
            intersect: false,
            mode: this.chartType === 'line' ? 'index' : 'nearest',
            axis: this.chartType === 'line' ? 'x' : 'xy'
          },
        scales: this.chartType !== 'pie' && this.chartType !== 'doughnut' ? {
          x: {
            stacked: this.chartType === 'bar', // Накопительные столбцы для bar chart
            ticks: {
              color: textSecondaryColor,
              font: {
                family: fontFamily,
                weight: '300',
                size: 12
              },
              maxRotation: 45,
              minRotation: 0,
              padding: 8
            },
            grid: {
              color: borderColor,
              drawBorder: false,
              lineWidth: 1,
              drawOnChartArea: true,
              display: false // Скрываем вертикальные линии сетки для чистоты
            },
            border: {
              color: borderColor,
              display: true,
              width: 1
            }
          },
          y: {
            stacked: this.chartType === 'bar', // Накопительные столбцы для bar chart
            min: this.mode === 'rank' ? rankMin : 0, // Для rank используем вычисленный min, для остальных - начинаем с 0
            max: this.mode === 'rank' ? rankMax : undefined, // Для rank используем вычисленный max
            ticks: {
              maxTicksLimit: 6, // Оптимальное количество делений
              color: textSecondaryColor,
              font: {
                family: fontFamily,
                weight: '300',
                size: 12
              },
              includeBounds: true,
              stepSize: undefined,
              padding: 8,
              callback: (value) => {
                // Форматирование значений на оси Y - округленные числа
                if (this.mode === 'tasks' || this.mode === 'rituals') {
                  return `${Math.round(value)}%`;
                } else if (this.mode === 'finance') {
                  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
                } else if (this.mode === 'time' || this.mode === 'leisure') {
                  // Форматирование времени - минимально в минутах, если есть часы - часы и минуты
                  const totalMinutes = Math.round(value * 60);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  if (hours === 0) {
                    return `${minutes} м`;
                  } else if (minutes === 0) {
                    return `${hours} ч`;
                  } else {
                    return `${hours} ч ${minutes} м`;
                  }
                } else if (this.mode === 'rank') {
                  return Math.round(value).toLocaleString('ru-RU');
                } else if (this.mode === 'mood') {
                  return Math.round(value).toString();
                }
                return Math.round(value);
              }
            },
            grid: {
              drawBorder: false,
              lineWidth: (context) => {
                if (context.tick && context.tick.value === 0) {
                  return 1.5; // Чуть толще для нулевой линии
                }
                return 0.5; // Тонкие линии сетки
              },
              color: (context) => {
                // Адаптивная прозрачность в зависимости от темы
                const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
                const gridAlpha = isLightTheme ? 0.15 : 0.2;
                
                if (context.tick && context.tick.value === 0) {
                  // Нулевая линия более заметна
                  const zeroAlpha = isLightTheme ? 0.3 : 0.4;
                  let zeroLineColor = borderColor;
                  if (borderColor.startsWith('#')) {
                    const hex = borderColor.slice(1);
                    const r = parseInt(hex.slice(0, 2), 16);
                    const g = parseInt(hex.slice(2, 4), 16);
                    const b = parseInt(hex.slice(4, 6), 16);
                    zeroLineColor = `rgba(${r}, ${g}, ${b}, ${zeroAlpha})`;
                  } else if (borderColor.startsWith('rgba')) {
                    const match = borderColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (match) {
                      const r = match[1];
                      const g = match[2];
                      const b = match[3];
                      zeroLineColor = `rgba(${r}, ${g}, ${b}, ${zeroAlpha})`;
                    }
                  }
                  return zeroLineColor;
                }
                // Обычные линии сетки с адаптивной прозрачностью
                let gridColor = borderColor;
                if (borderColor.startsWith('#')) {
                  const hex = borderColor.slice(1);
                  const r = parseInt(hex.slice(0, 2), 16);
                  const g = parseInt(hex.slice(2, 4), 16);
                  const b = parseInt(hex.slice(4, 6), 16);
                  gridColor = `rgba(${r}, ${g}, ${b}, ${gridAlpha})`;
                } else if (borderColor.startsWith('rgba')) {
                  const match = borderColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                  if (match) {
                    const r = match[1];
                    const g = match[2];
                    const b = match[3];
                    gridColor = `rgba(${r}, ${g}, ${b}, ${gridAlpha})`;
                  }
                }
                return gridColor;
              },
              drawOnChartArea: true,
              drawTicks: false,
              offset: false
            },
            border: {
              color: borderColor,
              display: true,
              width: 1
            }
          }
        } : undefined,
        elements: this.chartType === 'line' ? {
          point: {
            radius: 3.5,
            hoverRadius: 6,
            borderWidth: 2,
            hoverBorderWidth: 2.5,
            backgroundColor: 'transparent'
          },
          line: {
            tension: 0.35, // Плавные кривые
            borderWidth: 2.5, // Оптимальная толщина линии
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
            spanGaps: false
          }
        } : this.chartType === 'bar' ? {
          bar: {
            borderRadius: 0, // Без округления для четких границ
            borderSkipped: false,
            borderWidth: 0,
            // Добавляем небольшой отступ между группами столбцов
            barPercentage: 0.85, // Ширина столбца относительно доступного пространства
            categoryPercentage: 0.9 // Ширина группы столбцов относительно категории
          }
        } : isPie ? {
          arc: {
            hoverBorderWidth: 0,
            hoverBorderColor: 'transparent',
            hoverOffset: 6
          }
        } : undefined
      }
    };

    // Создаем график
    try {
      const ChartClass = await loadChartJS();
      if (!ChartClass) {
        throw new Error('Chart.js не загружен');
      }
      const ctx = this.canvas.getContext('2d');
      
      // Проверяем, есть ли уже график на этом canvas
      const existingChart = ChartClass.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }
      
      // Уничтожаем предыдущий график, если существует (дополнительная проверка)
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      
      this.chart = new ChartClass(ctx, config);
      
      // Сохраняем данные графика для легенды и списка (сохраняем datasetKeys из formatForChart)
      if (this.chart && this.chart.data) {
        this.chartData = {
          labels: this.chart.data.labels || [],
          datasets: this.chart.data.datasets || [],
          datasetKeys: formattedChartData.datasetKeys,
          moodLevels: formattedChartData.moodLevels
        };
      }
      
      // Отслеживаем изменения tooltip в реальном времени для убирания белого фона
      const canvasParent = this.canvas.parentElement;
      if (canvasParent) {
        const updateIndicators = () => {
          const tooltipEl = canvasParent.querySelector('.chartjs-tooltip') ||
                           document.querySelector('.chartjs-tooltip');
          if (tooltipEl) {
            updateTooltipIndicators(tooltipEl);
          }
        };
        
        const observer = new MutationObserver(updateIndicators);
        
        observer.observe(canvasParent, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
        
        // Также обновляем при каждом движении мыши (для надежности)
        this.canvas.addEventListener('mousemove', updateIndicators);
        
        // Сохраняем observer и обработчик для очистки
        this._tooltipObserver = observer;
        this._tooltipMouseHandler = updateIndicators;
      }
    } catch (error) {
      console.error('[StatsChart] Ошибка создания графика:', error);
      this.canvas.style.display = 'none';
      // Показываем сообщение об ошибке вместо графика
      if (this.element && !this.element.querySelector('.chart-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.color = 'var(--color-error, #f44336)';
        errorDiv.textContent = 'Ошибка загрузки графика. Проверьте консоль.';
        this.element.appendChild(errorDiv);
      }
    }

    return this.element;
  }

  /**
   * Обновить данные графика
   */
  async update(data, mode, chartType, groupBy, meta = null) {
    this.setData(data, mode, chartType, groupBy, meta);
    await this.render();
  }

  /**
   * Переключить видимость датасета
   */
  toggleDataset(index) {
    if (this.chart) {
      // Для pie/doughnut chart скрываем сегмент через meta.data
      if (this.chartType === 'pie' || this.chartType === 'doughnut') {
        const meta = this.chart.getDatasetMeta(0);
        if (meta && meta.data[index]) {
          meta.data[index].hidden = !meta.data[index].hidden;
          this.chart.update();
        }
      } else {
        // Для line/bar chart скрываем весь датасет
        const meta = this.chart.getDatasetMeta(index);
        if (meta) {
          meta.hidden = !meta.hidden;
          this.chart.update();
        }
      }
    }
  }

  /**
   * Проверить, видим ли датасет
   */
  isDatasetVisible(index) {
    if (this.chart) {
      // Для pie/doughnut chart проверяем видимость сегмента
      if (this.chartType === 'pie' || this.chartType === 'doughnut') {
        const meta = this.chart.getDatasetMeta(0);
        if (meta && meta.data[index]) {
          return !meta.data[index].hidden;
        }
      } else {
        // Для line/bar chart проверяем видимость датасета
        const meta = this.chart.getDatasetMeta(index);
        return meta ? !meta.hidden : true;
      }
    }
    return true;
  }

  /**
   * Получить семейство шрифтов из CSS переменной
   */
  getFontFamily() {
    try {
      const style = getComputedStyle(document.documentElement);
      const fontFamily = style.getPropertyValue('--font-family').trim();
      // Убираем кавычки если они есть
      return fontFamily ? fontFamily.replace(/['"]/g, '') : 'Philosopher, sans-serif';
    } catch (e) {
      console.warn('[StatsChart] Не удалось получить шрифт из CSS переменной:', e);
      return 'Philosopher, sans-serif';
    }
  }

  /**
   * Получить данные графика для легенды
   */
  getChartData() {
    return this.chartData;
  }

  /**
   * Получить метаданные
   */
  getMeta() {
    return this.meta;
  }

  /**
   * Уничтожить график
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    // Очищаем observer и обработчик для tooltip
    if (this._tooltipObserver) {
      this._tooltipObserver.disconnect();
      this._tooltipObserver = null;
    }
    if (this._tooltipMouseHandler && this.canvas) {
      this.canvas.removeEventListener('mousemove', this._tooltipMouseHandler);
      this._tooltipMouseHandler = null;
    }
  }
}

export default StatsChart;

