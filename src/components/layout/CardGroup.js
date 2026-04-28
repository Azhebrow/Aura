import Card from './Card.js';
import { iconLoader } from '../../utils/index.js';

class CardGroup {
  constructor(options = {}) {
    this.items = options.items || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange || null;
    this.cards = [];
    this.element = null;
    this.initialized = false;
    this.scrollContainer = null;
    this.leftButton = null;
    this.rightButton = null;
    this.currencyUnsubscribe = null; // Функция для отписки от изменений валюты
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Создаем основной контейнер
    const container = document.createElement('div');
    container.className = 'card-group-container';
    container.style.position = 'relative';

    // Создаем контейнер для прокрутки
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'card-group-scroll';

    const group = document.createElement('div');
    group.className = 'card-group';
    
    // Создаем все карточки и загружаем их асинхронно
    const cardPromises = this.items.map(async (item, index) => {
      const card = new Card({
        title: item.title || '',
        titlePrefixIcon: item.titlePrefixIcon || null,
        icon: item.icon || null,
        iconName: item.iconName || null,
        backgroundColor: item.backgroundColor || null,
        balance: item.balance !== undefined ? item.balance : null,
        target: item.target !== undefined ? item.target : null,
        checked: index === this.selectedIndex,
        onChange: (checked) => {
          if (checked) {
            // Воспроизводим звук выбора карточки
            if (window.audioSystem) {
              (async () => {
                try {
                  const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
                  const sound = getSoundByType(SOUND_CATEGORIES.UI_INTERACTION, UI_ELEMENT_TYPES.BUTTON_DEFAULT);
                  if (sound) {
                    window.audioSystem.play(sound);
                  }
                } catch (e) {
                  console.warn('[CardGroup] Ошибка загрузки звука:', e);
                }
              })();
            }
            
            // Деактивируем все остальные карточки
            this.cards.forEach((c, i) => {
              if (i !== index && c.checked) {
                c.checked = false;
                c.element.classList.remove('active');
                c.clearBackground();
              }
            });
            this.selectedIndex = index;
            if (this.onChange) {
              this.onChange(index, item);
            }
            // Прокручиваем к выбранной карточке
            this.scrollToCard(index);
          }
        }
      });
      
      // Переопределяем toggle для работы в группе
      const originalToggle = card.toggle.bind(card);
      card.toggle = () => {
        // В группе карточек всегда переключаем, даже если уже выбрана
        // Это позволяет переключиться на другую карточку
        if (!card.checked) {
          originalToggle();
        } else {
          // Если карточка уже выбрана, ничего не делаем (нельзя снять выбор в группе)
          // Но это не должно мешать выбору других карточек
        }
      };
      
      this.cards.push(card);
      const cardElement = await card.render();
      return cardElement;
    });

    const cardElements = await Promise.all(cardPromises);
    cardElements.forEach(element => group.appendChild(element));

    scrollContainer.appendChild(group);
    this.scrollContainer = scrollContainer;
    
    // Загружаем иконки для кнопок
    const [chevronLeft, chevronRight] = await Promise.all([
      iconLoader.loadIcon('chevron-left'),
      iconLoader.loadIcon('chevron-right')
    ]);

    // Создаем кнопку "влево"
    const leftButton = document.createElement('button');
    leftButton.className = 'nav-arrow-button nav-arrow-left card-group-nav-button card-group-nav-left';
    leftButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chevronLeft}</svg>`;
    leftButton.setAttribute('aria-label', 'Прокрутить влево');
    leftButton.style.display = 'none';
    leftButton.addEventListener('click', async () => {
      // Воспроизводим звук переключения
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_PREV);
        if (sound) {
          window.audioSystem.play(sound);
        }
      }
      this.scroll(-1);
    });
    
    // Создаем кнопку "вправо"
    const rightButton = document.createElement('button');
    rightButton.className = 'nav-arrow-button nav-arrow-right card-group-nav-button card-group-nav-right';
    rightButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chevronRight}</svg>`;
    rightButton.setAttribute('aria-label', 'Прокрутить вправо');
    rightButton.style.display = 'none';
    rightButton.addEventListener('click', async () => {
      // Воспроизводим звук переключения
      if (window.audioSystem) {
        const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES } = await import('../../system/audio/soundConfig.js');
        const sound = getSoundByType(SOUND_CATEGORIES.UI_NAVIGATION, UI_ELEMENT_TYPES.NAV_ARROW_NEXT);
        if (sound) {
          window.audioSystem.play(sound);
        }
      }
      this.scroll(1);
    });

    this.leftButton = leftButton;
    this.rightButton = rightButton;

    container.appendChild(leftButton);
    container.appendChild(scrollContainer);
    container.appendChild(rightButton);

    this.element = container;
    this.initialized = true;

    // Проверяем необходимость прокрутки после рендера
    setTimeout(() => {
      this.updateNavigationButtons();
      // Прокручиваем к выбранной карточке при инициализации
      if (this.selectedIndex >= 0) {
        this.scrollToCard(this.selectedIndex);
      }
    }, 0);

    // Обновляем кнопки при изменении размера
    const resizeObserver = new ResizeObserver(() => {
      this.updateNavigationButtons();
    });
    resizeObserver.observe(scrollContainer);

    // Подписываемся на изменения валюты
    const handleCurrencyChange = () => {
      // Обновляем все карточки с балансами
      this.cards.forEach(card => {
        if (card.updateCurrencyInfo) {
          card.updateCurrencyInfo();
        }
      });
    };
    window.addEventListener('currency-changed', handleCurrencyChange);
    this.currencyUnsubscribe = () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }

  scroll(direction) {
    if (!this.scrollContainer) return;
    
    const group = this.scrollContainer.querySelector('.card-group');
    if (!group) return;

    const scrollAmount = 200; // пикселей за раз
    const currentScroll = group.scrollLeft || 0;
    const newScroll = currentScroll + (scrollAmount * direction);
    
    group.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });

    // Обновляем кнопки после прокрутки
    setTimeout(() => {
      this.updateNavigationButtons();
    }, 300);
  }

  scrollToCard(index) {
    if (!this.scrollContainer || index < 0 || index >= this.cards.length) return;
    
    const group = this.scrollContainer.querySelector('.card-group');
    if (!group) return;

    const cardElement = this.cards[index]?.element;
    if (!cardElement) return;

    const cardRect = cardElement.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    const scrollContainerRect = this.scrollContainer.getBoundingClientRect();

    // Вычисляем позицию для центрирования карточки
    const cardLeft = cardElement.offsetLeft;
    const cardWidth = cardRect.width;
    const containerWidth = scrollContainerRect.width;
    const scrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);

    group.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });

    setTimeout(() => {
      this.updateNavigationButtons();
    }, 300);
  }

  updateNavigationButtons() {
    if (!this.scrollContainer || !this.leftButton || !this.rightButton) return;

    const group = this.scrollContainer.querySelector('.card-group');
    if (!group) return;

    const canScrollLeft = group.scrollLeft > 0;
    const canScrollRight = group.scrollLeft < (group.scrollWidth - group.clientWidth - 1);

    this.leftButton.style.display = canScrollLeft ? 'flex' : 'none';
    this.rightButton.style.display = canScrollRight ? 'flex' : 'none';
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default CardGroup;
