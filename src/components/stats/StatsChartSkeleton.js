/**
 * Skeleton для загрузки графика с shimmer анимацией
 */

class StatsChartSkeleton {
  constructor(chartType = 'line') {
    this.chartType = chartType;
    this.element = null;
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'stats-skeleton';

    const skeletonContent = document.createElement('div');
    skeletonContent.className = 'stats-skeleton-content';

    if (this.chartType === 'line') {
      this.createLineSkeleton(skeletonContent);
    } else if (this.chartType === 'bar') {
      this.createBarSkeleton(skeletonContent);
    } else if (this.chartType === 'pie') {
      this.createPieSkeleton(skeletonContent);
    }

    this.element.appendChild(skeletonContent);
  }

  createLineSkeleton(container) {
    // Создаем контейнер для линий
    const linesContainer = document.createElement('div');
    linesContainer.className = 'stats-skeleton-lines';
    linesContainer.style.position = 'relative';
    linesContainer.style.width = '100%';
    linesContainer.style.height = '300px';
    linesContainer.style.display = 'flex';
    linesContainer.style.alignItems = 'flex-end';
    linesContainer.style.justifyContent = 'space-around';
    linesContainer.style.padding = '20px';

    // Создаем волнистые линии
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('div');
      line.className = 'stats-skeleton-line';
      line.style.width = '100%';
      line.style.height = '2px';
      line.style.backgroundColor = 'var(--color-on-surface-secondary, rgba(127, 127, 127, 0.18))';
      line.style.borderRadius = '2px';
      line.style.position = 'absolute';
      line.style.bottom = `${40 + i * 60}px`;
      line.style.left = '20px';
      line.style.right = '20px';
      line.style.opacity = '0.3';
      
      // Волнистый эффект через SVG паттерн или просто прямая линия
      line.style.background = 'linear-gradient(90deg, transparent, var(--color-on-surface-secondary, rgba(127, 127, 127, 0.18)), transparent)';
      linesContainer.appendChild(line);
    }

    // Точки данных
    const pointsCount = 7;
    for (let i = 0; i < pointsCount; i++) {
      const point = document.createElement('div');
      point.className = 'stats-skeleton-point';
      point.style.width = '8px';
      point.style.height = '8px';
      point.style.borderRadius = '50%';
      point.style.backgroundColor = 'var(--color-on-surface-secondary, rgba(127, 127, 127, 0.26))';
      point.style.position = 'absolute';
      point.style.left = `${20 + (i * (100 / (pointsCount - 1)))}%`;
      point.style.bottom = `${Math.random() * 200 + 50}px`;
      linesContainer.appendChild(point);
    }

    container.appendChild(linesContainer);
  }

  createBarSkeleton(container) {
    const barsContainer = document.createElement('div');
    barsContainer.className = 'stats-skeleton-bars';
    barsContainer.style.width = '100%';
    barsContainer.style.height = '300px';
    barsContainer.style.display = 'flex';
    barsContainer.style.alignItems = 'flex-end';
    barsContainer.style.justifyContent = 'space-around';
    barsContainer.style.padding = '20px';
    barsContainer.style.gap = '10px';

    // Создаем столбцы разной высоты
    const barsCount = 7;
    for (let i = 0; i < barsCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'stats-skeleton-bar';
      const height = Math.random() * 60 + 20; // 20-80%
      bar.style.width = `${100 / barsCount}%`;
      bar.style.height = `${height}%`;
      bar.style.backgroundColor = 'var(--color-on-surface-secondary, rgba(127, 127, 127, 0.18))';
      bar.style.borderRadius = '4px 4px 0 0';
      bar.style.minHeight = '20px';
      barsContainer.appendChild(bar);
    }

    container.appendChild(barsContainer);
  }

  createPieSkeleton(container) {
    const pieContainer = document.createElement('div');
    pieContainer.className = 'stats-skeleton-pie';
    pieContainer.style.width = '100%';
    pieContainer.style.height = '300px';
    pieContainer.style.display = 'flex';
    pieContainer.style.alignItems = 'center';
    pieContainer.style.justifyContent = 'center';

    const circle = document.createElement('div');
    circle.className = 'stats-skeleton-circle';
    circle.style.width = '200px';
    circle.style.height = '200px';
    circle.style.borderRadius = '50%';
    circle.style.backgroundColor = 'var(--color-on-surface-secondary, rgba(127, 127, 127, 0.18))';
    circle.style.border = '4px solid var(--color-surface)';

    pieContainer.appendChild(circle);
    container.appendChild(pieContainer);
  }

  render() {
    if (!this.element) {
      this.init();
    }
    return this.element;
  }
}

export default StatsChartSkeleton;

