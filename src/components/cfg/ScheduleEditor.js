import { Checkbox } from '../form/index.js';
import { Button } from '../form/index.js';

class ScheduleEditor {
  constructor(options = {}) {
    this.schedule = options.schedule || { enabled: true, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
    this.onChange = options.onChange || null;
    this.element = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'cfg-schedule-editor';

    // Переключатель включения
    const enabledWrapper = document.createElement('div');
    enabledWrapper.className = 'cfg-schedule-enabled';

    const enabledCheckbox = new Checkbox({
      checked: this.schedule.enabled
    });
    await enabledCheckbox.init();
    const checkboxElement = enabledCheckbox.render();
    const checkboxInput = checkboxElement.querySelector('input');
    
    checkboxInput.addEventListener('change', () => {
      this.schedule.enabled = checkboxInput.checked;
      this.updateDaysVisibility();
      this.notifyChange();
    });

    enabledWrapper.appendChild(checkboxElement);
    const enabledLabel = document.createElement('span');
    enabledLabel.textContent = 'Включено';
    enabledWrapper.appendChild(enabledLabel);
    this.element.appendChild(enabledWrapper);

    // Кнопки дней недели
    const daysContainer = document.createElement('div');
    daysContainer.className = 'cfg-schedule-days';
    daysContainer.style.display = this.schedule.enabled ? 'flex' : 'none';

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    this.dayButtons = [];
    for (let i = 0; i < 7; i++) {
      const dayButton = new Button({
        text: dayNames[i],
        onClick: () => this.toggleDay(i)
      });
      await dayButton.init();
      const buttonElement = dayButton.render();
      buttonElement.classList.add('cfg-schedule-day-button');
      
      if (this.schedule.daysOfWeek.includes(i)) {
        buttonElement.classList.add('active');
      }

      daysContainer.appendChild(buttonElement);
      this.dayButtons.push(buttonElement);
    }

    this.element.appendChild(daysContainer);
    this.daysContainer = daysContainer;
    this.initialized = true;
  }

  toggleDay(dayIndex) {
    const index = this.schedule.daysOfWeek.indexOf(dayIndex);
    if (index > -1) {
      this.schedule.daysOfWeek.splice(index, 1);
      this.dayButtons[dayIndex].classList.remove('active');
    } else {
      this.schedule.daysOfWeek.push(dayIndex);
      this.schedule.daysOfWeek.sort();
      this.dayButtons[dayIndex].classList.add('active');
    }
    this.notifyChange();
  }

  updateDaysVisibility() {
    if (this.daysContainer) {
      this.daysContainer.style.display = this.schedule.enabled ? 'flex' : 'none';
    }
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange({ ...this.schedule });
    }
  }

  getValue() {
    return { ...this.schedule };
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default ScheduleEditor;















