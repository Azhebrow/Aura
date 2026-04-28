import { iconLoader } from '../../utils/index.js';

/**
 * Компонент экрана загрузки в минималистичном японском стиле
 * Автоматически адаптируется к настройкам темы, цвета и шрифта
 */
class SplashScreen {
  constructor(config = {}) {
    this.title = config.title || 'AURA';
    this.subtitle = config.subtitle || ''; // без подписи по умолчанию
    this.minDisplayTime = config.minDisplayTime || 3000; // Минимальное время показа в мс
    this.element = null;
    this.initialized = false;
    this.startTime = null;
  }

  async init() {
    if (this.initialized) {
      return this.element;
    }

    this.startTime = Date.now();

    const container = document.createElement('div');
    container.className = 'splash-screen';
    
    // Добавляем класс для macOS, чтобы убрать отступ сверху
    const isMac = typeof process !== 'undefined' && process.platform === 'darwin';
    if (isMac) {
      container.classList.add('splash-screen-mac');
    }
    
    const content = document.createElement('div');
    content.className = 'splash-screen-content';
    
    /* Блок 1: название приложения */
    const titleBlock = document.createElement('div');
    titleBlock.className = 'splash-screen-block splash-screen-block-title';
    const title = document.createElement('h1');
    title.className = 'splash-screen-title';
    title.textContent = this.title;
    titleBlock.appendChild(title);
    content.appendChild(titleBlock);
    
    /* Блок 2: индикатор загрузки (три точки) */
    const loaderBlock = document.createElement('div');
    loaderBlock.className = 'splash-screen-block splash-screen-block-loader';
    const loader = document.createElement('div');
    loader.className = 'splash-screen-loader';
    loader.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'splash-screen-loader-dot';
      loader.appendChild(dot);
    }
    loaderBlock.appendChild(loader);
    content.appendChild(loaderBlock);
    
    if (this.subtitle) {
      const subtitleBlock = document.createElement('div');
      subtitleBlock.className = 'splash-screen-block splash-screen-block-subtitle';
      const subtitle = document.createElement('p');
      subtitle.className = 'splash-screen-subtitle';
      subtitle.textContent = this.subtitle;
      subtitleBlock.appendChild(subtitle);
      content.appendChild(subtitleBlock);
    }
    
    container.appendChild(content);
    
    this.element = container;
    this.initialized = true;
    
    return this.element;
  }

  /**
   * Показывает экран загрузки
   */
  show() {
    if (!this.initialized) {
      console.warn('[SplashScreen] Компонент не инициализирован, вызывайте init() сначала');
      return;
    }
    
    if (this.element) {
      this.element.classList.remove('hidden', 'fade-out');
      this.element.style.display = 'flex';
      this.startTime = Date.now();
      // Показываем контейнер (на случай повторного показа)
      const container = this.element.parentElement;
      if (container && container.id === 'splash-screen-container') {
        container.classList.remove('splash-container-hidden');
      }
    }
  }

  /**
   * Скрывает экран загрузки с плавной анимацией
   */
  async hide() {
    if (!this.initialized || !this.element) {
      return;
    }

    // Вычисляем оставшееся время для минимального показа
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.minDisplayTime - elapsed);

    // Ждем оставшееся время
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    // Добавляем класс для fade-out анимации
    this.element.classList.add('fade-out');
    
    // Ждем завершения анимации и скрываем элемент
    await new Promise(resolve => setTimeout(resolve, 600));
    
    this.element.classList.add('hidden');
    this.element.style.display = 'none';

    // Скрываем контейнер, чтобы не перекрывать страницу и убрать возможные вспышки
    const container = this.element.parentElement;
    if (container && container.id === 'splash-screen-container') {
      container.classList.add('splash-container-hidden');
    }
  }

  /**
   * Рендерит компонент
   */
  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default SplashScreen;
