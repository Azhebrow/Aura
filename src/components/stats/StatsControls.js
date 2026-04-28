/**
 * Левая панель управления статистикой
 */

import Section from '../layout/Section.js';
import ToggleSwitch from '../form/ToggleSwitch.js';
import MultiToggleSwitch from '../form/MultiToggleSwitch.js';
import Select from '../form/Select.js';
import SelectWithIcons from '../../composites/SelectWithIcons.js';
import Input from '../form/Input.js';
import { iconLoader } from '../../utils/index.js';

class StatsControls {
  constructor(onChange) {
    this.onChange = onChange || null;
    this.element = null;
    this.section = null;

    // Значения по умолчанию
    this.state = {
      mode: 'tasks',
      viewType: 'table',
      groupBy: 'categories',
      period: 30, // дней
      aggregation: 'day',
      startDate: null,
      endDate: null,
      visibleKeys: null // null = все видимы, иначе Set с ключами
    };

    // Ссылки на элементы ввода дат для обновления
    this.startDateInput = null;
    this.endDateInput = null;

    // Вычисляем даты по умолчанию
    this.updateDefaultDates();
  }

  /**
   * Обновить даты по умолчанию
   */
  updateDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.state.period);

    this.state.endDate = endDate.toISOString().split('T')[0];
    this.state.startDate = startDate.toISOString().split('T')[0];
    
    // Обновляем значения в полях ввода, если они уже созданы
    if (this.startDateInput && this.startDateInput.element) {
      this.startDateInput.element.value = this.state.startDate;
    }
    if (this.endDateInput && this.endDateInput.element) {
      this.endDateInput.element.value = this.state.endDate;
    }
  }

  async init() {
    // Создаем секцию
    this.section = new Section({ title: 'Управление' });
    this.element = this.section.render();

    // Контейнер для контента
    const content = document.createElement('div');
    content.className = 'stats-controls-content';

    // Режимы (вверху)
    await this.createModeControl(content);

    // Вид отображения
    await this.createViewTypeControl(content);

    // Группировка
    await this.createGroupByControl(content);

    // Слот под фильтр серий (монтируется из StatsPage после загрузки данных)
    this.seriesFilterSlot = document.createElement('div');
    this.seriesFilterSlot.className = 'stats-series-filter-slot';
    content.appendChild(this.seriesFilterSlot);

    // Агрегация
    await this.createAggregationControl(content);

    // Период (даты)
    await this.createPeriodControl(content);

    // Фильтр категорий/элементов (будет создан после загрузки данных)
    this.filterControl = null;

    this.element.appendChild(content);
  }

  /**
   * Создать контроль вида отображения
   */
  async createViewTypeControl(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-control-group';

    const label = document.createElement('div');
    label.textContent = 'Вид отображения';
    label.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    label.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    wrapper.appendChild(label);

    const chartIcon = await iconLoader.loadIcon('chart-bar');
    const tableIcon = await iconLoader.loadIcon('table');

    const toggleSwitch = new ToggleSwitch({
      leftOption: { value: 'chart', text: 'Графики' },
      rightOption: { value: 'table', text: 'Таблица' },
      value: this.state.viewType,
      leftIcon: chartIcon,
      rightIcon: tableIcon,
      onChange: (value) => {
        this.state.viewType = value;
        this.notifyChange();
      }
    });

    wrapper.appendChild(toggleSwitch.render());
    container.appendChild(wrapper);
  }

  /**
   * Создать контроль группировки
   */
  async createGroupByControl(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-control-group';

    const label = document.createElement('div');
    label.textContent = 'Группировка';
    label.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    label.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    wrapper.appendChild(label);

    const categoriesIcon = await iconLoader.loadIcon('layers');
    const listIcon = await iconLoader.loadIcon('list');

    const toggleSwitch = new ToggleSwitch({
      leftOption: { value: 'categories', text: 'Категории' },
      rightOption: { value: 'items', text: 'Элементы' },
      value: this.state.groupBy,
      leftIcon: categoriesIcon,
      rightIcon: listIcon,
      onChange: (value) => {
        this.state.groupBy = value;
        this.notifyChange();
      }
    });

    wrapper.appendChild(toggleSwitch.render());
    container.appendChild(wrapper);
  }

  /**
   * Создать контроль режимов
   */
  async createModeControl(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-control-group';

    const label = document.createElement('div');
    label.textContent = 'Режим';
    label.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    label.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    wrapper.appendChild(label);

    // Загружаем иконки для режимов
    const modeIcons = await iconLoader.loadIcons([
      'square-check', // tasks
      'wallet', // finance
      'clock', // time
      'sun', // rituals
      'award', // rank
      'smile', // mood
      'apple' // nutrition
    ]);

    const select = new SelectWithIcons({
      items: [
        { value: 'tasks', text: 'Задачи', icon: modeIcons['square-check'] },
        { value: 'finance', text: 'Финансы', icon: modeIcons['wallet'] },
        { value: 'time', text: 'Время', icon: modeIcons['clock'] },
        { value: 'rituals', text: 'Ритуалы', icon: modeIcons['sun'] },
        { value: 'rank', text: 'Очки', icon: modeIcons['award'] },
        { value: 'mood', text: 'Настроение', icon: modeIcons['smile'] },
        { value: 'nutrition', text: 'Питание', icon: modeIcons['apple'] }
      ],
      value: this.state.mode
    });

    await select.init();
    const selectElement = await select.render();
    const selectNative = selectElement.querySelector('select');
    
    // Устанавливаем текущее значение
    if (selectNative) {
      selectNative.value = this.state.mode;
      
      // Обработчик изменения через CustomSelect
      if (select.customSelect) {
        const items = [
          { value: 'tasks' },
          { value: 'finance' },
          { value: 'time' },
          { value: 'rituals' },
          { value: 'rank' },
          { value: 'mood' },
          { value: 'nutrition' }
        ];
        
        const originalSelectOption = select.customSelect.selectOption.bind(select.customSelect);
        select.customSelect.selectOption = (index) => {
          originalSelectOption(index);
          if (items[index]) {
            this.state.mode = items[index].value;
            selectNative.value = this.state.mode;
            // Обновляем UI контролов
            this.updateControlsUI();
            this.notifyChange();
          }
        };
      }
      
      // Fallback обработчик для нативного select
      selectNative.addEventListener('change', () => {
        this.state.mode = selectNative.value;
        // Обновляем UI контролов
        this.updateControlsUI();
        this.notifyChange();
      });
    }

    wrapper.appendChild(selectElement);
    container.appendChild(wrapper);
  }

  /**
   * Создать контроль периода
   */
  async createPeriodControl(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-control-group';

    const label = document.createElement('div');
    label.textContent = 'Период';
    label.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    label.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    wrapper.appendChild(label);

    // Переключатель для стандартных периодов
    const periodToggle = new MultiToggleSwitch({
      options: [
        { value: '7', text: '7' },
        { value: '30', text: '30' },
        { value: '120', text: '120' },
        { value: '365', text: '365' }
      ],
      value: String(this.state.period),
      onChange: (value) => {
        this.state.period = parseInt(value);
        this.updateDefaultDates();
        this.notifyChange();
      }
    });

    wrapper.appendChild(periodToggle.render());

    // Кастомные даты (монолитный элемент)
    const customDatesWrapper = document.createElement('div');
    customDatesWrapper.style.marginTop = 'var(--space-md)';
    customDatesWrapper.className = 'stats-dates-monolith';

    const datesLabel = document.createElement('label');
    datesLabel.textContent = 'Период';
    datesLabel.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    datesLabel.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    datesLabel.style.marginBottom = 'var(--space-xs)';
    datesLabel.style.display = 'block';
    customDatesWrapper.appendChild(datesLabel);

    const datesContainer = document.createElement('div');
    datesContainer.className = 'stats-dates-container';
    datesContainer.style.display = 'flex';
    datesContainer.style.flexDirection = 'column';
    datesContainer.style.gap = '0';
    datesContainer.style.background = 'var(--color-element)';
    datesContainer.style.border = 'var(--border-width) solid var(--color-border)';
    datesContainer.style.borderRadius = 'var(--radius)';
    datesContainer.style.padding = '0';
    datesContainer.style.overflow = 'hidden';

    this.startDateInput = new Input({
      type: 'date',
      value: this.state.startDate
    });
    this.startDateInput.element.style.border = 'none';
    this.startDateInput.element.style.borderRadius = '0';
    this.startDateInput.element.style.borderBottom = '1px solid var(--color-border)';
    this.startDateInput.element.style.flex = '1';
    this.startDateInput.element.style.background = 'transparent';
    this.startDateInput.element.addEventListener('change', (e) => {
      const newStartDate = e.target.value;
      
      // Валидация: максимум 2 года (730 дней)
      if (this.state.endDate) {
        const start = new Date(newStartDate + 'T00:00:00');
        const end = new Date(this.state.endDate + 'T00:00:00');
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 730) {
          // Устанавливаем максимальный период
          const maxStartDate = new Date(end);
          maxStartDate.setDate(maxStartDate.getDate() - 730);
          this.state.startDate = maxStartDate.toISOString().split('T')[0];
          this.startDateInput.element.value = this.state.startDate;
          return;
        }
      }

      this.state.startDate = newStartDate;
      if (this.state.endDate && this.state.startDate > this.state.endDate) {
        this.state.endDate = this.state.startDate;
        this.endDateInput.element.value = this.state.endDate;
      }
      this.updatePeriodFromDates();
      this.notifyChange();
    });

    this.endDateInput = new Input({
      type: 'date',
      value: this.state.endDate
    });
    this.endDateInput.element.style.border = 'none';
    this.endDateInput.element.style.borderRadius = '0';
    this.endDateInput.element.style.flex = '1';
    this.endDateInput.element.style.background = 'transparent';
    this.endDateInput.element.addEventListener('change', (e) => {
      const newEndDate = e.target.value;
      
      // Валидация: максимум 2 года (730 дней)
      if (this.state.startDate) {
        const start = new Date(this.state.startDate + 'T00:00:00');
        const end = new Date(newEndDate + 'T00:00:00');
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 730) {
          // Устанавливаем максимальный период
          const maxEndDate = new Date(start);
          maxEndDate.setDate(maxEndDate.getDate() + 730);
          this.state.endDate = maxEndDate.toISOString().split('T')[0];
          this.endDateInput.element.value = this.state.endDate;
          return;
        }
      }

      this.state.endDate = newEndDate;
      if (this.state.startDate && this.state.endDate < this.state.startDate) {
        this.state.startDate = this.state.endDate;
        this.startDateInput.element.value = this.state.startDate;
      }
      this.updatePeriodFromDates();
      this.notifyChange();
    });

    datesContainer.appendChild(this.startDateInput.render());
    datesContainer.appendChild(this.endDateInput.render());
    customDatesWrapper.appendChild(datesContainer);

    wrapper.appendChild(customDatesWrapper);
    container.appendChild(wrapper);
  }

  /**
   * Обновить период из дат
   */
  updatePeriodFromDates() {
    if (this.state.startDate && this.state.endDate) {
      const start = new Date(this.state.startDate + 'T00:00:00');
      const end = new Date(this.state.endDate + 'T00:00:00');
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.state.period = diffDays;
    }
  }

  /**
   * Обновить даты на основе реальных данных
   */
  updateDatesFromData(data) {
    if (!data || data.length === 0) return;

    // Находим минимальную и максимальную даты из данных
    let minDate = null;
    let maxDate = null;

    data.forEach(item => {
      const dateStr = item.date;
      if (dateStr) {
        if (!minDate || dateStr < minDate) {
          minDate = dateStr;
        }
        if (!maxDate || dateStr > maxDate) {
          maxDate = dateStr;
        }
      }
    });

    if (minDate && maxDate) {
      this.state.startDate = minDate;
      this.state.endDate = maxDate;

      // Обновляем значения в полях ввода
      if (this.startDateInput && this.startDateInput.element) {
        this.startDateInput.element.value = minDate;
      }
      if (this.endDateInput && this.endDateInput.element) {
        this.endDateInput.element.value = maxDate;
      }

      // Обновляем период
      this.updatePeriodFromDates();
    }
  }

  /**
   * Создать контроль агрегации
   */
  async createAggregationControl(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-control-group';

    const label = document.createElement('div');
    label.textContent = 'Агрегация';
    label.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    label.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    wrapper.appendChild(label);

    const multiToggle = new MultiToggleSwitch({
      options: [
        { value: 'day', text: '1' },
        { value: 'week', text: '7' },
        { value: 'month', text: '30' },
        { value: 'year', text: '365' }
      ],
      value: this.state.aggregation,
      onChange: (value) => {
        this.state.aggregation = value;
        this.notifyChange();
      }
    });

    wrapper.appendChild(multiToggle.render());
    container.appendChild(wrapper);
  }

  /**
   * Уведомить об изменении
   */
  notifyChange() {
    if (this.onChange) {
      this.onChange({ ...this.state });
    }
  }

  /**
   * Обновить UI контролов в соответствии с текущим состоянием
   */
  updateControlsUI() {
    if (!this.element) return;
    
    // Обновляем выбранные значения в радио-кнопках
    // ViewType
    const viewTypeInputs = this.element.querySelectorAll('input[name="stats-view-type"]');
    viewTypeInputs.forEach(input => {
      input.checked = (input.value === this.state.viewType);
    });
    
    // GroupBy
    const groupByInputs = this.element.querySelectorAll('input[name="stats-group-by"]');
    groupByInputs.forEach(input => {
      input.checked = (input.value === this.state.groupBy);
    });
    
    // Aggregation
    const aggregationInputs = this.element.querySelectorAll('input[name="stats-aggregation"]');
    aggregationInputs.forEach(input => {
      input.checked = (input.value === this.state.aggregation);
    });
  }

  /**
   * Получить текущее состояние
   */
  getState() {
    return { ...this.state };
  }

  async render() {
    if (!this.element) {
      await this.init();
    }
    return this.element;
  }
}

export default StatsControls;

