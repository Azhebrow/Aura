import Section from '../layout/Section.js';
import { colorConversion, iconLoader } from '../../utils/index.js';
import { DEFAULT_ACCENT } from '../../design-system/tokens/colorConstants.js';

const { hexToRgba } = colorConversion;

class RankSection {
  constructor() {
    this.element = null;
    this.section = null;
    this.points = 0; // Текущие очки (загружаются из базы)
    this.pointsService = null;
    this.db = null;
    this.isRendering = false; // Флаг для предотвращения одновременных вызовов render
    this.ranks = [
      {
        id: 1,
        name: 'НИКЧЁМНЫЙ',
        threshold: 0,
        description: 'Существо, едва именуемое человеком. Он есть, но словно в тени. Его дни серы, его поступки пусты. Он живёт на обочине собственной жизни, жалкий наблюдатель, который даже сам себе не нужен.',
        imageNumber: 1
      },
      {
        id: 2,
        name: 'ЛУЗЕР',
        threshold: 500,
        description: 'Он мечется, но всякое движение его бессильно. Он берётся за дело и бросает, обещает и предаёт слово. Жалкое подобие стремления — вечный проигравший, который хочет, но не умеет, да и не верит в себя.',
        imageNumber: 2
      },
      {
        id: 3,
        name: 'СЛАБАК',
        threshold: 1200,
        description: 'Он уже дерзает что-то начинать, но ломается при первом ударе. Его воля мягка, как сырая глина, его характер пуст. Он знает, что может больше, но трусость и лень душат его шаги.',
        imageNumber: 3
      },
      {
        id: 4,
        name: 'РАБОТЯГА',
        threshold: 2100,
        description: 'В нём просыпается грубая, но живая сила. Он ещё не владеет собой, но уже умеет терпеть. В поте лица, в мелких победах он куёт первый камень фундамента. Он ещё не велик, но перестал быть ничтожеством.',
        imageNumber: 4
      },
      {
        id: 5,
        name: 'УЧЕНИК',
        threshold: 3300,
        description: 'Он обретает уважение к дисциплине. Учит своё тело и ум подчиняться правилам, как солдат учит шагать в строю. Ему трудно, он спотыкается, но уже виден росток будущей силы.',
        imageNumber: 5
      },
      {
        id: 6,
        name: 'ВОИН',
        threshold: 4800,
        description: 'Каждый день для него — поле боя. Он сражается с ленью, со слабостью, с соблазнами, и хотя не всегда побеждает, он не сдаётся. В его глазах рождается сталь, в его поступках — порядок.',
        imageNumber: 6
      },
      {
        id: 7,
        name: 'ВОЛЯ',
        threshold: 6600,
        description: 'Это уже не просто человек, это орудие, закалённое в борьбе. Он не ищет оправданий — он ищет решения. Его слово имеет вес, его шаги несут уверенность. Его трудно сломать, почти невозможно остановить.',
        imageNumber: 7
      },
      {
        id: 8,
        name: 'СИЛА',
        threshold: 8700,
        description: 'Он перестаёт жить мелочами. Его движение становится поступью великана: он идёт вперёд, и всё вокруг вынуждено считаться с его волей. Он не доказывает — он существует как живая мощь.',
        imageNumber: 8
      },
      {
        id: 9,
        name: 'ЛЕГЕНДА',
        threshold: 11100,
        description: 'Он становится больше самого себя. Его образ — символ. Его жизнь — пример. Его имя уже не принадлежит ему одному: оно звучит в устах других как напоминание о том, что человек может быть выше слабости.',
        imageNumber: 9
      },
      {
        id: 10,
        name: 'АТЛАНТ',
        threshold: 13800,
        description: 'Он поднимает на плечи собственный мир и не дрогнет. В нём слились сталь и дух, привычка и честь, воля и судьба. Он — опора, несокрушимый столп, на котором держится смысл. Он не просто живёт — он стоит, и это стояние величественнее всякой победы.',
        imageNumber: 10
      }
    ];
  }

  getCurrentRank() {
    // Определяем текущий ранг на основе очков
    // Идём с конца массива, чтобы найти первый ранг, порог которого <= текущих очков
    for (let i = this.ranks.length - 1; i >= 0; i--) {
      if (this.points >= this.ranks[i].threshold) {
        return this.ranks[i];
      }
    }
    // Если очки меньше минимального порога, возвращаем первый ранг
    return this.ranks[0];
  }

  getNextRank() {
    const currentRank = this.getCurrentRank();
    const currentIndex = this.ranks.findIndex(r => r.id === currentRank.id);
    
    // Если это последний ранг, следующего нет
    if (currentIndex === this.ranks.length - 1) {
      return null;
    }
    
    return this.ranks[currentIndex + 1];
  }

  getProgressToNextRank() {
    const currentRank = this.getCurrentRank();
    const nextRank = this.getNextRank();
    
    if (!nextRank) {
      return { progress: 100, pointsNeeded: 0, percentage: 100 };
    }
    
    const currentPoints = this.points;
    const currentThreshold = currentRank.threshold;
    const nextThreshold = nextRank.threshold;
    
    const range = nextThreshold - currentThreshold;
    const progress = currentPoints - currentThreshold;
    const pointsNeeded = nextThreshold - currentPoints;
    const percentage = Math.min(100, Math.max(0, (progress / range) * 100));
    
    return { progress, pointsNeeded, percentage, range };
  }

  formatNumber(num) {
    // Округляем до целого числа перед форматированием
    const rounded = Math.round(num);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * Извлекает доминирующий цвет из изображения
   * @param {HTMLImageElement} img - Элемент изображения
   * @returns {Promise<string>} - Hex цвет в формате #RRGGBB
   */
  async extractDominantColor(img) {
    return new Promise((resolve) => {
      // Если изображение еще не загружено, ждем загрузки
      if (!img.complete || img.naturalWidth === 0) {
        img.onload = () => this.extractDominantColor(img).then(resolve);
        img.onerror = () => {
          // В случае ошибки возвращаем акцентный цвет
          const style = getComputedStyle(document.documentElement);
          resolve(style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT);
        };
        return;
      }

      try {
        // Создаем canvas для анализа изображения
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Ограничиваем размер для производительности
        const maxSize = 100;
        const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
        
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        
        // Рисуем изображение на canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Получаем данные пикселей
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Анализируем цвета (пропускаем прозрачные пиксели)
        const colorMap = new Map();
        let totalPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 128) continue; // Пропускаем прозрачные пиксели
          
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Квантуем цвета для группировки похожих
          const quantizedR = Math.floor(r / 10) * 10;
          const quantizedG = Math.floor(g / 10) * 10;
          const quantizedB = Math.floor(b / 10) * 10;
          
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
          totalPixels++;
        }
        
        // Находим наиболее часто встречающийся цвет
        let maxCount = 0;
        let dominantColor = null;
        
        for (const [colorKey, count] of colorMap.entries()) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = colorKey;
          }
        }
        
        if (dominantColor) {
          const [r, g, b] = dominantColor.split(',').map(Number);
          // Конвертируем в hex
          const hex = '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');
          resolve(hex);
        } else {
          // Fallback на акцентный цвет
          const style = getComputedStyle(document.documentElement);
          resolve(style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT);
        }
      } catch (error) {
        console.warn('[RankSection] Ошибка извлечения цвета:', error);
        // Fallback на акцентный цвет
        const style = getComputedStyle(document.documentElement);
        resolve(style.getPropertyValue('--color-accent').trim() || DEFAULT_ACCENT);
      }
    });
  }

  async init() {
    // Инициализируем базу данных и сервис очков
    const getDB = window.getDB;
    if (getDB) {
      this.db = getDB();
      if (this.db) {
        try {
          if (!window.PointsService) {
            console.warn('[RankSection] PointsService недоступен в window');
            this.pointsService = null;
            this.points = 0;
            return;
          }
          const PointsService = window.PointsService;
          this.pointsService = new PointsService(this.db);
          this.points = this.pointsService.getTotalPoints();
        } catch (e) {
          console.warn('[RankSection] Ошибка инициализации PointsService:', e);
        }
      }
    }

    // Создаем секцию с заголовком
    this.section = new Section({ 
      title: 'Ранг'
    });
    this.element = this.section.render();
    
    // Устанавливаем стили для секции, чтобы она правильно работала с высотой и шириной
    // Важно: используем setProperty для важных свойств, чтобы они не перезаписывались
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.minHeight = '0';
    this.element.style.maxHeight = '100%';
    this.element.style.overflow = 'hidden';
    this.element.style.height = '100%';
    this.element.style.width = '100%';
    this.element.style.minWidth = '0';
    this.element.style.maxWidth = '100%';
    this.element.style.boxSizing = 'border-box';
    this.element.style.flexShrink = '1';
    this.element.style.flexGrow = '1';
    this.element.style.flexBasis = '0%';
    this.element.style.contain = 'layout style size';
    // Убираем gap для секции, чтобы контент мог правильно занимать пространство
    this.element.style.gap = '0';
    
    // Убеждаемся, что заголовок не растягивается
    const titleElement = this.element.querySelector('.page-title') || 
                        this.element.querySelector('div:has(.page-title)') ||
                        this.element.firstElementChild;
    if (titleElement) {
      titleElement.style.flexShrink = '0';
      titleElement.style.flexGrow = '0';
    }
    
    // Подписываемся на изменения задач для обновления очков
    this.taskProgressHandler = () => {
      if (this.pointsService) {
        this.points = this.pointsService.getTotalPoints();
        this.render();
      }
    };
    window.addEventListener('taskProgressChanged', this.taskProgressHandler);

    // Подписываемся на изменения даты для обновления очков
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.dateUnsubscribe = selectedDateState.subscribe(() => {
        if (this.pointsService) {
          this.points = this.pointsService.getTotalPoints();
          this.render();
        }
      });
    }

    // Подписываемся на события обновления очков из PointsManager
    this.pointsUpdatedHandler = () => {
      if (this.pointsService) {
        this.points = this.pointsService.getTotalPoints();
        this.render();
      }
    };
    window.addEventListener('pointsUpdated', this.pointsUpdatedHandler);
    window.addEventListener('pointsRecalculated', this.pointsUpdatedHandler);

    // Подписываемся на изменения акцентного цвета и темы
    this.accentColorHandler = () => {
      this.render();
    };
    this.themeHandler = () => {
      this.render();
    };
    window.addEventListener('accentColorChanged', this.accentColorHandler);
    window.addEventListener('themeChanged', this.themeHandler);

    // Создаем контент
    await this.render();
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this.taskProgressHandler) {
      window.removeEventListener('taskProgressChanged', this.taskProgressHandler);
      this.taskProgressHandler = null;
    }
    if (this.dateUnsubscribe) {
      this.dateUnsubscribe();
      this.dateUnsubscribe = null;
    }
    if (this.pointsUpdatedHandler) {
      window.removeEventListener('pointsUpdated', this.pointsUpdatedHandler);
      window.removeEventListener('pointsRecalculated', this.pointsUpdatedHandler);
      this.pointsUpdatedHandler = null;
    }
    if (this.accentColorHandler) {
      window.removeEventListener('accentColorChanged', this.accentColorHandler);
      this.accentColorHandler = null;
    }
    if (this.themeHandler) {
      window.removeEventListener('themeChanged', this.themeHandler);
      this.themeHandler = null;
    }
    this.element = null;
    this.section = null;
    this.pointsService = null;
    this.db = null;
  }

  async render() {
    // Защита от одновременных вызовов render
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;
    
    try {
      // Удаляем ВСЕ старые контенты, если есть (на случай дублирования)
      const oldContents = this.element.querySelectorAll('.rank-content');
      oldContents.forEach(content => {
        content.remove();
      });

    // Получаем акцентный цвет динамически из темы
    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      const color = style.getPropertyValue('--color-accent-ui').trim() || style.getPropertyValue('--color-accent').trim();
      // Если цвет не найден, пробуем получить из computed style
      if (!color || color === '') {
        const testEl = document.createElement('div');
        testEl.style.color = 'var(--color-accent-ui, var(--color-accent))';
        document.body.appendChild(testEl);
        const computedColor = getComputedStyle(testEl).color;
        document.body.removeChild(testEl);
        return computedColor || DEFAULT_ACCENT;
      }
      return color;
    };
    const accentColor = getAccentColor();

    // Создаем контейнер для контента
    const content = document.createElement('div');
    content.className = 'rank-content';
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      max-height: 100%;
      padding: var(--space-md) var(--space-md) var(--space-lg);
      gap: var(--space-lg);
      overflow-y: auto;
      overflow-x: visible;
      box-sizing: border-box;
    `;

    // Получаем текущий ранг и прогресс
    const currentRank = this.getCurrentRank();
    const nextRank = this.getNextRank();
    const progress = this.getProgressToNextRank();

    // === БЛОК ОЧКОВ И ПРОГРЕССА ===
    const statsSection = document.createElement('div');
    statsSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      width: 100%;
      flex-shrink: 0;
      padding-top: var(--space-xs);
      padding-bottom: var(--space-md);
      margin-bottom: var(--space-md);
    `;

    // Очки: число и подпись «очков» (минималистично, без иконок)
    const pointsWrapper = document.createElement('div');
    pointsWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-xs);
    `;

    const pointsValue = document.createElement('span');
    pointsValue.textContent = this.formatNumber(this.points);
    pointsValue.style.cssText = `
      font-size: clamp(1.5rem, 3vw, 2.5rem);
      font-weight: var(--font-bold);
      color: var(--color-on-surface);
      letter-spacing: -0.02em;
      line-height: 1;
    `;

    const pointsLabel = document.createElement('div');
    pointsLabel.textContent = 'очков';
    pointsLabel.style.cssText = `
      font-size: var(--font-sm);
      color: var(--color-on-surface-secondary);
      font-weight: var(--font-normal);
      text-transform: lowercase;
    `;

    pointsWrapper.appendChild(pointsValue);
    pointsWrapper.appendChild(pointsLabel);
    statsSection.appendChild(pointsWrapper);

    // Прогресс до следующего ранга
    if (nextRank) {
      const progressWrapper = document.createElement('div');
      progressWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
        width: 100%;
        max-width: 320px;
      `;

      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        width: 100%;
        height: 3px;
        background: var(--color-border);
        border-radius: var(--radius-full);
        overflow: hidden;
      `;

      const progressFill = document.createElement('div');
      progressFill.style.cssText = `
        height: 100%;
        width: ${progress.percentage}%;
        background: var(--color-accent-ui, var(--color-accent));
        border-radius: var(--radius-full);
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      progressBar.appendChild(progressFill);

      const progressText = document.createElement('div');
      progressText.textContent = `${Math.round(progress.percentage)}%`;
      progressText.style.cssText = `
        font-size: var(--font-xs);
        color: var(--color-on-surface-secondary);
        font-weight: var(--font-medium);
      `;

      progressWrapper.appendChild(progressBar);
      progressWrapper.appendChild(progressText);
      statsSection.appendChild(progressWrapper);
    } else {
      const maxBadge = document.createElement('div');
      maxBadge.textContent = 'МАКСИМАЛЬНЫЙ РАНГ';
      maxBadge.style.cssText = `
        font-size: var(--font-xs);
        color: var(--color-accent-ui, var(--color-accent));
        font-weight: var(--font-bold);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      `;
      statsSection.appendChild(maxBadge);
    }

    content.appendChild(statsSection);

    // === БЛОК ИЗОБРАЖЕНИЯ И ОПИСАНИЯ РАНГА ===
    const rankSection = document.createElement('div');
    rankSection.className = 'rank-section';
    rankSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
      width: 100%;
      flex: 1 1 0;
      min-height: 0;
      max-height: 100%;
      overflow: visible;
      padding: var(--space-lg) 0;
    `;

    // Изображение ранга с эффектами
    const imageWrapper = document.createElement('div');
    imageWrapper.style.cssText = `
      position: relative;
      width: 100%;
      max-width: min(300px, 40vh, 40vw);
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 40px;
      overflow: visible;
    `;

    // Свечение вокруг изображения
    const imageGlow = document.createElement('div');
    imageGlow.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, ${hexToRgba(accentColor, 0.35)} 0%, transparent 72%);
      border-radius: 50%;
      z-index: 0;
      animation: pulse 3s ease-in-out infinite;
      transition: background 0.5s ease;
    `;

    // Добавляем анимацию пульсации
    if (!document.getElementById('rank-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'rank-pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `;
      document.head.appendChild(style);
    }

    const rankImage = document.createElement('img');
    rankImage.src = `public/ranks/${currentRank.imageNumber}.png`;
    rankImage.alt = currentRank.name;
    rankImage.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 10px 30px ${hexToRgba(accentColor, 0.3)});
      transition: transform 0.3s ease, filter 0.5s ease;
    `;
    
    rankImage.onmouseenter = () => {
      rankImage.style.transform = 'scale(1.05)';
    };
    rankImage.onmouseleave = () => {
      rankImage.style.transform = 'scale(1)';
    };
    
    rankImage.onerror = () => {
      console.warn(`[RankSection] Не удалось загрузить изображение ранга: ${rankImage.src}`);
      rankImage.style.display = 'none';
    };

    // Извлекаем доминирующий цвет из изображения и обновляем свечение
    rankImage.onload = async () => {
      try {
        const dominantColor = await this.extractDominantColor(rankImage);
        imageGlow.style.background = `radial-gradient(circle, ${hexToRgba(dominantColor, 0.4)} 0%, transparent 70%)`;
        rankImage.style.filter = `drop-shadow(0 10px 30px ${hexToRgba(dominantColor, 0.4)})`;
        console.log(`[RankSection] Доминирующий цвет ранга "${currentRank.name}": ${dominantColor}`);
      } catch (error) {
        console.warn('[RankSection] Ошибка при извлечении цвета изображения:', error);
      }
    };

    imageWrapper.appendChild(imageGlow);
    imageWrapper.appendChild(rankImage);
    rankSection.appendChild(imageWrapper);

    // Название ранга
    const rankName = document.createElement('h2');
    rankName.textContent = currentRank.name;
    rankName.style.cssText = `
      font-size: clamp(1.25rem, 2.5vw, 2rem);
      font-weight: var(--font-bold);
      color: var(--color-on-surface);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
      flex-shrink: 0;
    `;
    rankSection.appendChild(rankName);

    // Описание ранга
    const description = document.createElement('p');
    description.textContent = currentRank.description;
    description.style.cssText = `
      font-size: var(--font-sm);
      color: var(--color-on-surface-secondary);
      line-height: 1.5;
      margin: 0;
      text-align: center;
      max-width: min(62ch, 90vw);
      width: min(62ch, 90vw);
      font-style: italic;
      flex-shrink: 0;
      text-wrap: balance;
      overflow-wrap: break-word;
    `;
    rankSection.appendChild(description);

    content.appendChild(rankSection);

    // === СПИСОК ВСЕХ РАНГОВ ===
    const ranksListSection = document.createElement('div');
    ranksListSection.style.cssText = `
      width: 100%;
      flex-shrink: 0;
      position: relative;
      margin-top: auto;
    `;

    const ranksListScrollContainer = document.createElement('div');
    ranksListScrollContainer.style.cssText = `
      overflow: hidden;
      position: relative;
      width: 100%;
    `;

    const ranksList = document.createElement('div');
    ranksList.style.cssText = `
      display: flex;
      gap: var(--space-md);
      overflow-x: auto;
      overflow-y: hidden;
      padding: var(--space-md) 0;
      scroll-behavior: smooth;
      scrollbar-width: none;
      -ms-overflow-style: none;
    `;

    // Скрываем полосу прокрутки для WebKit
    if (!document.getElementById('ranks-list-scrollbar-hide')) {
      const style = document.createElement('style');
      style.id = 'ranks-list-scrollbar-hide';
      style.textContent = `
        .ranks-list::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
    ranksList.className = 'ranks-list';

    // Создаем элементы для каждого ранга
    this.ranks.forEach((rank) => {
      const isReached = this.points >= rank.threshold;
      const isCurrent = currentRank.id === rank.id;
      
      const rankItem = document.createElement('div');
      rankItem.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-sm) var(--space-md);
        min-width: 80px;
        flex-shrink: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: var(--radius);
      `;

      // Стили в зависимости от статуса ранга
      if (isCurrent) {
        rankItem.style.cssText += `
          background: ${hexToRgba(accentColor, 0.08)};
        `;
      } else if (isReached) {
        rankItem.style.cssText += `
          opacity: 0.7;
        `;
      } else {
        rankItem.style.cssText += `
          opacity: 0.32;
          pointer-events: none;
        `;
      }

      // Номер ранга
      const rankNumber = document.createElement('div');
      rankNumber.textContent = rank.id;
      rankNumber.style.cssText = `
        font-size: var(--font-sm);
        font-weight: var(--font-bold);
        color: ${isCurrent ? accentColor : isReached ? 'var(--color-on-surface)' : 'var(--color-on-surface-secondary)'};
        line-height: 1;
      `;

      // Название ранга
      const rankNameItem = document.createElement('div');
      rankNameItem.textContent = rank.name;
      rankNameItem.style.cssText = `
        font-size: var(--font-xs);
        font-weight: ${isCurrent ? 'var(--font-bold)' : 'var(--font-medium)'};
        color: ${isCurrent ? accentColor : isReached ? 'var(--color-on-surface)' : 'var(--color-on-surface-secondary)'};
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        line-height: 1.2;
      `;

      rankItem.appendChild(rankNumber);
      rankItem.appendChild(rankNameItem);
      ranksList.appendChild(rankItem);
    });

    ranksListScrollContainer.appendChild(ranksList);

    // Кнопки навигации
    const [chevronLeft, chevronRight] = await Promise.all([
      iconLoader.loadIcon('chevron-left'),
      iconLoader.loadIcon('chevron-right')
    ]);

    const leftButton = document.createElement('button');
    leftButton.className = 'nav-arrow-button nav-arrow-left';
    leftButton.style.display = 'none';
    leftButton.style.zIndex = '10';
    leftButton.style.pointerEvents = 'auto';
    leftButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chevronLeft}</svg>`;
    leftButton.setAttribute('aria-label', 'Прокрутить влево');
    
    const rightButton = document.createElement('button');
    rightButton.className = 'nav-arrow-button nav-arrow-right';
    rightButton.style.display = 'none';
    rightButton.style.zIndex = '10';
    rightButton.style.pointerEvents = 'auto';
    rightButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chevronRight}</svg>`;
    rightButton.setAttribute('aria-label', 'Прокрутить вправо');

    // Функция прокрутки
    const scrollRanks = (direction) => {
      const scrollAmount = 200;
      const currentScroll = ranksList.scrollLeft || 0;
      const newScroll = currentScroll + (scrollAmount * direction);
      ranksList.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
      setTimeout(updateNavButtons, 100);
    };

    // Функция обновления видимости кнопок
    const updateNavButtons = () => {
      const canScrollLeft = ranksList.scrollLeft > 0;
      const canScrollRight = ranksList.scrollLeft < (ranksList.scrollWidth - ranksList.clientWidth - 1);
      leftButton.style.display = canScrollLeft ? 'flex' : 'none';
      rightButton.style.display = canScrollRight ? 'flex' : 'none';
    };

    leftButton.addEventListener('click', async () => {
      // Воспроизводим звук переключения
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_PREV);
        if (sound) {
          window.audioSystem.play(sound);
        }
      }
      scrollRanks(-1);
    });
    rightButton.addEventListener('click', async () => {
      // Воспроизводим звук переключения
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_NEXT);
        if (sound) {
          window.audioSystem.play(sound);
        }
      }
      scrollRanks(1);
    });
    ranksList.addEventListener('scroll', updateNavButtons);

    const resizeObserver = new ResizeObserver(() => {
      updateNavButtons();
    });
    resizeObserver.observe(ranksList);

    setTimeout(updateNavButtons, 100);

    ranksListSection.appendChild(leftButton);
    ranksListSection.appendChild(ranksListScrollContainer);
    ranksListSection.appendChild(rightButton);

    content.appendChild(ranksListSection);

    // Добавляем контент в секцию
    this.element.appendChild(content);
    } finally {
      this.isRendering = false;
    }
  }

  createInfoCard(title, value, accentColor) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: ${hexToRgba(accentColor, 0.08)};
      border: 1px solid ${hexToRgba(accentColor, 0.2)};
      border-radius: var(--radius);
      padding: clamp(var(--space-sm), 1.5vh, var(--space-md));
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;

    card.onmouseenter = () => {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = `0 4px 12px ${hexToRgba(accentColor, 0.2)}`;
    };
    card.onmouseleave = () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    };

    const cardTitle = document.createElement('div');
    cardTitle.textContent = title;
    cardTitle.style.cssText = `
      font-size: var(--font-xs);
      color: var(--color-on-surface-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: var(--space-xs);
    `;

    const cardValue = document.createElement('div');
    cardValue.textContent = value;
    cardValue.style.cssText = `
      font-size: clamp(0.875rem, 2vh, var(--font-md));
      font-weight: var(--font-bold);
      color: ${accentColor};
    `;

    card.appendChild(cardTitle);
    card.appendChild(cardValue);

    return card;
  }
}

export default RankSection;

