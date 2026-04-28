import { NUTRITION_GROUPS, getGroupColor } from '../../design-system/tokens/NutritionGroupPalette.js';
import { colorConversion } from '../../utils/index.js';

const { hslToHex, applyIconBackground } = colorConversion;

class NutritionGroupSelector {
  constructor(options = {}) {
    this.value = options.value || null;
    this.onChange = options.onChange || null;
    this.element = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'nutrition-group-selector';

    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'nutrition-group-selector-container';

    // Создаем карточки для каждой группы
    for (const [groupId, group] of Object.entries(NUTRITION_GROUPS)) {
      const groupCard = document.createElement('div');
      groupCard.className = 'nutrition-group-card';
      groupCard.dataset.groupId = groupId;
      
      if (this.value === groupId) {
        groupCard.classList.add('selected');
      }

      // Цветной индикатор
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'nutrition-group-color-indicator';
      const groupColor = getGroupColor(groupId);
      const colorForBg = groupColor.toLowerCase().startsWith('hsl') 
        ? hslToHex(groupColor)
        : groupColor;
      colorIndicator.style.backgroundColor = colorForBg;
      groupCard.appendChild(colorIndicator);

      // Название группы
      const groupTitle = document.createElement('span');
      groupTitle.className = 'nutrition-group-title';
      groupTitle.textContent = group.title;
      groupCard.appendChild(groupTitle);

      // Обработчик клика
      groupCard.addEventListener('click', () => {
        // Убираем выделение со всех карточек
        groupsContainer.querySelectorAll('.nutrition-group-card').forEach(card => {
          card.classList.remove('selected');
        });
        // Выделяем выбранную
        groupCard.classList.add('selected');
        this.value = groupId;
        if (this.onChange) {
          this.onChange(groupId);
        }
      });

      groupsContainer.appendChild(groupCard);
    }

    this.element.appendChild(groupsContainer);
    this.initialized = true;
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
    if (this.element) {
      // Обновляем визуальное выделение
      const cards = this.element.querySelectorAll('.nutrition-group-card');
      cards.forEach(card => {
        if (card.dataset.groupId === value) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    }
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default NutritionGroupSelector;
