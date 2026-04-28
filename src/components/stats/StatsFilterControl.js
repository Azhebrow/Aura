/**
 * Компонент фильтрации категорий/элементов с чекбоксами
 */

import { iconLoader } from '../../utils/index.js';
import Checkbox from '../form/Checkbox.js';

class StatsFilterControl {
  constructor(keys, meta, selectedKeys, onChange) {
    // Убираем дубликаты, сохраняем порядок (ключи уже отсортированы по категориям из StatsPage)
    const cleanKeys = (keys || []).filter(key => key && key.trim());
    this.keys = Array.from(new Set(cleanKeys));
    this.meta = meta || { icons: {}, colors: {} };
    this.selectedKeys = selectedKeys || null; // null = все выбраны, иначе Set
    this.onChange = onChange || null;
    this.element = null;
    this.dropdown = null;
    this.isOpen = false;
    this.isUpdating = false; // Флаг для предотвращения одновременных обновлений
  }

  async init() {
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-control-group';

    const label = document.createElement('div');
    label.textContent = 'Серии';
    label.style.fontSize = 'var(--font-size-sm, 0.875rem)';
    label.style.color = 'var(--color-on-surface-secondary, var(--color-on-surface))';
    wrapper.appendChild(label);

    // Кнопка-триггер
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'btn stats-filter-trigger';
    trigger.style.fontWeight = 'var(--font-weight-light, 300)';
    trigger.style.width = '100%';
    trigger.style.justifyContent = 'space-between';
    
    const chevronIcon = await iconLoader.loadIcon('chevron-down');
    const selectedCount = this.selectedKeys === null ? this.keys.length : this.selectedKeys.size;
    const span = document.createElement('span');
    span.textContent = `${selectedCount}/${this.keys.length}`;
    span.style.fontWeight = 'var(--font-weight-light, 300)';
    trigger.appendChild(span);
    
    const chevronSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevronSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    chevronSvg.setAttribute('viewBox', '0 0 24 24');
    chevronSvg.setAttribute('fill', 'none');
    chevronSvg.setAttribute('stroke', 'currentColor');
    chevronSvg.setAttribute('stroke-width', '2');
    chevronSvg.setAttribute('stroke-linecap', 'round');
    chevronSvg.setAttribute('stroke-linejoin', 'round');
    chevronSvg.style.width = '16px';
    chevronSvg.style.height = '16px';
    chevronSvg.style.flexShrink = '0';
    chevronSvg.innerHTML = chevronIcon;
    trigger.appendChild(chevronSvg);
    trigger.setAttribute('aria-label', 'Выбор серий на графике');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    wrapper.appendChild(trigger);
    this.trigger = trigger;

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'stats-filter-dropdown';

    wrapper.style.position = 'relative';
    wrapper.appendChild(this.dropdown);

    this.element = wrapper;
    this._onDocumentClick = (e) => {
      if (this.element && !this.element.contains(e.target)) {
        this.close();
      }
    };
    document.addEventListener('click', this._onDocumentClick);

    await this.updateCheckboxes();
  }

  async updateCheckboxes() {
    if (!this.dropdown || this.isUpdating) return;
    
    this.isUpdating = true;

    // Полностью очищаем dropdown
    while (this.dropdown.firstChild) {
      this.dropdown.removeChild(this.dropdown.firstChild);
    }

    // Кнопки "Выбрать все" / "Снять все"
    const actionsRow = document.createElement('div');
    actionsRow.className = 'stats-filter-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'btn';
    selectAllBtn.textContent = 'Все';
    selectAllBtn.addEventListener('click', () => {
      this.selectedKeys = null;
      // Обновляем чекбоксы и триггер
      this.updateCheckboxes();
      this.updateTrigger();
      if (this.onChange) {
        this.onChange(null);
      }
    });

    const deselectAllBtn = document.createElement('button');
    deselectAllBtn.type = 'button';
    deselectAllBtn.className = 'btn';
    deselectAllBtn.textContent = 'Ничего';
    deselectAllBtn.addEventListener('click', () => {
      this.selectedKeys = new Set();
      this.updateCheckboxes();
      this.updateTrigger();
      if (this.onChange) {
        this.onChange(new Set());
      }
    });

    actionsRow.appendChild(selectAllBtn);
    actionsRow.appendChild(deselectAllBtn);
    this.dropdown.appendChild(actionsRow);

    // Чекбоксы для каждого ключа (Set уже убирает дубликаты при создании)
    // Используем Set для отслеживания уже добавленных ключей на случай дубликатов
    const addedKeys = new Set();
    for (const key of this.keys) {
      // Пропускаем пустые ключи и дубликаты
      if (!key || addedKeys.has(key)) {
        continue;
      }
      addedKeys.add(key);
      const item = document.createElement('label');
      item.className = 'stats-filter-item';

      const checkbox = new Checkbox({
        checked: this.selectedKeys === null || this.selectedKeys.has(key)
      });
      const checkboxEl = checkbox.render();
      checkboxEl.style.margin = '0';
      
      checkboxEl.querySelector('input').addEventListener('change', (e) => {
        if (this.selectedKeys === null) {
          // Если все были выбраны, создаем Set со всеми кроме этого
          this.selectedKeys = new Set(this.keys);
          this.selectedKeys.delete(key);
        } else {
          if (e.target.checked) {
            this.selectedKeys.add(key);
          } else {
            this.selectedKeys.delete(key);
          }
        }
        
        // Если выбраны все, устанавливаем null
        if (this.selectedKeys.size === this.keys.length) {
          this.selectedKeys = null;
        }
        
        // Обновляем только триггер и вызываем callback, НЕ пересоздаем все чекбоксы
        this.updateTrigger();
        if (this.onChange) {
          this.onChange(this.selectedKeys);
        }
      });

      // Иконка
      if (this.meta.icons && this.meta.icons[key]) {
        try {
          const iconName = this.meta.icons[key];
          const iconContent = await iconLoader.loadIcon(iconName);
          const iconEl = document.createElement('span');
          iconEl.style.display = 'flex';
          iconEl.style.alignItems = 'center';
          iconEl.style.color = this.meta.colors && this.meta.colors[key] ? this.meta.colors[key] : 'var(--color-on-surface)';
          iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">${iconContent}</svg>`;
          item.appendChild(iconEl);
        } catch (e) {
          console.warn(`[StatsFilterControl] Не удалось загрузить иконку ${this.meta.icons[key]} для ключа ${key}:`, e);
          // Используем дефолтную иконку при ошибке
          const defaultIcon = await iconLoader.loadIcon('package');
          const iconEl = document.createElement('span');
          iconEl.style.display = 'flex';
          iconEl.style.alignItems = 'center';
          iconEl.style.color = this.meta.colors && this.meta.colors[key] ? this.meta.colors[key] : 'var(--color-on-surface)';
          iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">${defaultIcon}</svg>`;
          item.appendChild(iconEl);
        }
      }

      // Текст
      const text = document.createElement('span');
      text.textContent = key;
      text.style.fontSize = 'var(--font-size-sm, 0.875rem)';
      text.style.fontWeight = 'var(--font-weight-light, 300)';
      text.style.flex = '1';
      item.appendChild(text);

      item.appendChild(checkboxEl);
      this.dropdown.appendChild(item);
    }
    
    this.isUpdating = false;
  }

  updateTrigger() {
    if (!this.trigger) return;
    const selectedCount = this.selectedKeys === null ? this.keys.length : this.selectedKeys.size;
    const span = this.trigger.querySelector('span');
    if (span) {
      span.textContent = `${selectedCount}/${this.keys.length}`;
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.dropdown) {
      this.dropdown.style.display = this.isOpen ? 'block' : 'none';
    }
  }

  close() {
    this.isOpen = false;
    if (this.dropdown) {
      this.dropdown.style.display = 'none';
    }
  }

  async update(keys, meta) {
    // Предотвращаем одновременные обновления
    if (this.isUpdating) {
      console.warn('[StatsFilterControl] Обновление уже выполняется, пропускаем');
      return;
    }
    
    // Убираем пустые ключи и дубликаты (порядок сохраняем — ключи уже по категориям)
    const cleanKeys = (keys || []).filter(key => key && key.trim());
    const uniqueKeys = Array.from(new Set(cleanKeys));
    
    // Проверяем, изменились ли ключи
    const keysChanged = JSON.stringify(this.keys) !== JSON.stringify(uniqueKeys);
    if (!keysChanged && this.meta === meta) {
      // Ключи и метаданные не изменились, не обновляем
      return;
    }
    
    this.keys = uniqueKeys;
    this.meta = meta || { icons: {}, colors: {} };
    
    // Если ключи изменились, проверяем валидность выбранных ключей
    if (this.selectedKeys !== null && this.selectedKeys.size > 0) {
      const validKeys = new Set();
      this.selectedKeys.forEach(key => {
        if (this.keys.includes(key)) {
          validKeys.add(key);
        }
      });
      
      // Если все выбранные ключи валидны и их количество равно общему количеству, сбрасываем
      // Если ни один не валиден, сбрасываем
      // Иначе оставляем только валидные
      if (validKeys.size === 0 || validKeys.size === this.keys.length) {
        this.selectedKeys = null;
      } else {
        this.selectedKeys = validKeys;
      }
    }
    
    // Полностью пересоздаем чекбоксы
    await this.updateCheckboxes();
    this.updateTrigger();
  }

  getSelectedKeys() {
    return this.selectedKeys;
  }

  destroy() {
    if (this._onDocumentClick) {
      document.removeEventListener('click', this._onDocumentClick);
      this._onDocumentClick = null;
    }
    this.close();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.dropdown = null;
    this.trigger = null;
  }

  async render() {
    if (!this.element) {
      await this.init();
    }
    return this.element;
  }
}

export default StatsFilterControl;
