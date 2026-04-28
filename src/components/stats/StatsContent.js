/**
 * Компонент контента статистики (переключается между таблицей и графиком)
 */

import StatsTable from './StatsTable.js';
import StatsChart from './StatsChart.js';
import StatsChartSkeleton from './StatsChartSkeleton.js';

class StatsContent {
  constructor() {
    this.element = null;
    this.table = null;
    this.chart = null;
    this.skeleton = null;
    this.viewType = 'table';
    this.isLoading = false;
  }

  async init() {
    this.element = document.createElement('div');
    this.element.className = 'stats-content';
    this.element.style.width = '100%';
    this.element.style.height = '100%';

    // Инициализируем компоненты
    this.table = new StatsTable();
    await this.table.init();

    this.chart = new StatsChart();
    await this.chart.init();

    this.skeleton = new StatsChartSkeleton('line');
    this.skeleton.init();
  }

  setViewType(viewType) {
    this.viewType = viewType;
  }

  setLoading(loading) {
    this.isLoading = loading;
  }

  async render(data, mode, viewType, groupBy, chartType, meta, aggregation) {
    if (!this.element) {
      await this.init();
    }

    const previousViewType = this.viewType;
    this.viewType = viewType || this.viewType;

    // Уничтожаем предыдущий график при переключении вида
    if (previousViewType === 'chart' && this.viewType === 'table' && this.chart) {
      this.chart.destroy();
    }

    // Очищаем содержимое
    this.element.innerHTML = '';

    if (this.isLoading && this.viewType === 'chart') {
      // Показываем skeleton при загрузке графика
      const skeletonElement = this.skeleton.render();
      this.element.appendChild(skeletonElement);
      return this.element;
    }

    if (this.viewType === 'table') {
      // Отображаем таблицу
      this.table.setData(data, mode, groupBy, meta, aggregation);
      const tableElement = await this.table.render();
      this.element.appendChild(tableElement);
    } else {
      // Отображаем график
      this.chart.setData(data, mode, chartType, groupBy);
      const chartElement = await this.chart.render();
      this.element.appendChild(chartElement);
    }

    return this.element;
  }

  /**
   * Обновить данные
   */
  async update(data, mode, viewType, groupBy, chartType, meta, aggregation) {
    this.setViewType(viewType);
    await this.render(data, mode, viewType, groupBy, chartType, meta, aggregation);
  }

  /**
   * Уничтожить компоненты
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}

export default StatsContent;

