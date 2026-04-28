import { Modal } from '../layout/index.js';
import { Button, Input, Textarea, Select, Checkbox, RadioButton } from '../form/index.js';
import InputSuffix from '../../composites/InputSuffix.js';
import IconPickerButton from './IconPickerButton.js';
import ColorPickerButton from './ColorPickerButton.js';
import ScheduleEditor from './ScheduleEditor.js';
import ListItemsEditor from './ListItemsEditor.js';
import NutritionPresetProductsEditor from './NutritionPresetProductsEditor.js';
import DescriptionEditorButton from './DescriptionEditorButton.js';
import { formatCurrency, iconLoader } from '../../utils/index.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import { CFG_CONFIGS } from '../../system/database/cfg-configs.js';

const { getCurrency } = formatCurrency;

class ConfigModal {
  /**
   * Определяет тип cfg из конфига
   * @param {Object} config - Конфиг из cfg-configs.js
   * @returns {string|null} Тип cfg или null
   */
  static detectCfgType(config) {
    if (!config) return null;

    // Сначала проверяем filters для точного определения типа
    if (config.filters) {
      // Категории задач
      if (config.filters.category_type === 'rituals') return 'tasks-rituals';
      if (config.filters.category_type === 'time') return 'tasks-time';
      if (config.filters.category_type === 'body') return 'tasks-body';
      if (config.filters.category_type === 'deps') return 'tasks-deps';
      
      // Типы досуга - проверяем ДО поиска по tableName
      if (config.filters.leisure_type === 'filling') return 'leisure-filling';
      if (config.filters.leisure_type === 'escape') return 'leisure-escape';
    }

    // Ищем в CFG_CONFIGS по tableName
    for (const [key, cfgConfig] of Object.entries(CFG_CONFIGS)) {
      if (cfgConfig.tableName === config.tableName) {
        // Если у конфига есть filters, проверяем их соответствие
        if (cfgConfig.filters && config.filters) {
          // Проверяем все фильтры
          let matches = true;
          for (const [filterKey, filterValue] of Object.entries(cfgConfig.filters)) {
            if (config.filters[filterKey] !== filterValue) {
              matches = false;
              break;
            }
          }
          if (matches) return key;
        } else if (!cfgConfig.filters && !config.filters) {
          // Если у обоих нет filters, это совпадение
          return key;
        }
      }
    }

    return null;
  }

  static async open(config, item, onSave) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Проверяем, открыт ли GoalsModal, и устанавливаем более высокий z-index
    const goalsModalOverlay = document.querySelector('.goals-modal-overlay');
    if (goalsModalOverlay) {
      modal.style.zIndex = '10001'; // Выше чем goals-modal-overlay (10000)
    }
    
    const content = document.createElement('div');
    content.className = 'modal-content cfg-modal-content';

    if (goalsModalOverlay) {
      content.style.zIndex = '10001';
    }

    const header = document.createElement('div');
    header.className = 'modal-header cfg-modal-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'cfg-modal-title-group';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = item ? 'Редактирование записи' : 'Новая запись';
    titleGroup.appendChild(titleEl);

    const recordLabel = item && item.title && String(item.title).trim();
    if (recordLabel) {
      const sub = document.createElement('p');
      sub.className = 'cfg-modal-header-record';
      sub.textContent = String(item.title).trim();
      titleGroup.appendChild(sub);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.textContent = '×';

    header.appendChild(titleGroup);
    header.appendChild(closeBtn);
    content.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    // Создаем таблицу для полей
    const table = document.createElement('table');
    table.className = 'cfg-form-table';
    const tbody = document.createElement('tbody');
    
    // Контейнер для специальных полей (list-items и т.д.)
    const specialFieldsContainer = document.createElement('div');
    specialFieldsContainer.className = 'cfg-form-special-fields';
    
    const fieldComponents = new Map();
    let firstField = null;
    
    // Сохраняем fieldComponents в модальном окне для доступа в collectFormData
    modal._fieldComponents = fieldComponents;
    
    // Проверяем, нужна ли компактная карточка entity-header
    // Применяем по умолчанию если есть хотя бы title или description + icon
    const hasTitle = config.fields.some(f => f.name === 'title');
    const hasDescription = config.fields.some(f => f.name === 'description');
    const hasIcon = config.fields.some(f => f.name === 'icon');
    const shouldUseCompactHeader = config.compact_entity_header !== false && (hasTitle || (hasDescription && hasIcon));
    
    let skippedHeaderFields = new Set();
    if (shouldUseCompactHeader) {
      const entityHeaderResult = await ConfigModal.createEntityHeaderCard(config.fields, config, item);
      if (entityHeaderResult.container.children.length > 0) {
        body.appendChild(entityHeaderResult.container);
        
        // Добавляем компоненты header card в fieldComponents
        entityHeaderResult.fieldComponents.forEach((component, fieldName) => {
          fieldComponents.set(fieldName, component);
        });
        
        skippedHeaderFields = entityHeaderResult.skippedFields;
        
        if (entityHeaderResult.firstInput && !firstField) {
          firstField = entityHeaderResult.firstInput;
        }
      }
    }
    
    // Функция для проверки, должно ли поле показываться
    const shouldShowField = (field) => {
      if (!field.showWhen) {
        return true; // Поле без условий всегда показывается
      }
      
      const dependentField = config.fields.find(f => f.name === field.showWhen.field);
      if (!dependentField) {
        return true; // Если зависимое поле не найдено, показываем
      }
      
      // Для существующих элементов берем значение из item, для новых - пустая строка (не показываем)
      const dependentValue = item ? item[dependentField.name] : '';
      return dependentValue === field.showWhen.value;
    };

    // Создаем строки для каждого поля
    for (const field of config.fields) {
      // Пропускаем поля, которые уже обработаны в entity-header card
      if (skippedHeaderFields.has(field.name)) {
        continue;
      }
      
      // Пропускаем поля, которые не должны показываться
      if (!shouldShowField(field)) {
        continue;
      }
      
      // Поля типа list-items, nutrition-preset-products и textarea идут в отдельный контейнер или обрабатываются отдельно
      if (field.type === 'list-items' || field.type === 'nutrition-preset-products') {
        const specialField = await ConfigModal.createSpecialField(field, item);
        if (specialField) {
          specialField.container.setAttribute('data-field-name', field.name);
          specialFieldsContainer.appendChild(specialField.container);
          fieldComponents.set(field.name, specialField.component);
        }
      } else {
        // Обычные поля идут в таблицу
        const row = await ConfigModal.createFieldRow(field, item ? item[field.name] : null, item, config);
        if (row) {
          // Добавляем data-атрибут для поиска
          row.row.setAttribute('data-field-name', field.name);
          
          tbody.appendChild(row.row);
          fieldComponents.set(field.name, row.component);
          if (!firstField) {
            firstField = row.firstInput;
          }
          
          // Если это поле цвета, добавляем отдельную строку для палитры
          if (field.type === 'color' && row.row._colorPaletteComponent) {
            const colorPicker = row.row._colorPaletteComponent;
            // Убеждаемся, что компонент инициализирован
            if (!colorPicker.initialized) {
              colorPicker.init();
            }
            
            const paletteElement = colorPicker.getPalette();
            if (paletteElement) {
              const paletteRow = document.createElement('tr');
              paletteRow.className = 'cfg-form-row cfg-form-row-palette';
              
              const paletteLabelCell = document.createElement('td');
              paletteLabelCell.className = 'cfg-form-label';
              paletteLabelCell.textContent = 'Палитра';
              
              const paletteControlCell = document.createElement('td');
              paletteControlCell.className = 'cfg-form-control';
              
              paletteControlCell.appendChild(paletteElement);
              
              paletteRow.appendChild(paletteLabelCell);
              paletteRow.appendChild(paletteControlCell);
              tbody.appendChild(paletteRow);
            }
          }
        }
      }
    }
    
    table.appendChild(tbody);
    body.appendChild(table);
    
    // Добавляем контейнер для специальных полей после таблицы
    if (specialFieldsContainer.children.length > 0) {
      body.appendChild(specialFieldsContainer);
    }
    
    // Информационная плашка о типе задачи (только для задач)
    let taskTypeInfoPanel = null;
    const taskTypeField = config.fields?.find(f => f.name === 'task_type');
    if (taskTypeField) {
      taskTypeInfoPanel = document.createElement('div');
      taskTypeInfoPanel.className = 'cfg-task-type-info';
      body.appendChild(taskTypeInfoPanel);
    }
    
    content.appendChild(body);
    
    // Footer с кнопками
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    // Создаем переменную для modalInstance, которая будет инициализирована позже
    let modalInstance = null;
    
    // Функция для закрытия модального окна с анимацией
    const closeModal = () => {
      if (!modalInstance) return;
      // Устанавливаем обработчик onClose для удаления из DOM после анимации
      const originalOnClose = modalInstance.options?.onClose;
      modalInstance.options = modalInstance.options || {};
      modalInstance.options.onClose = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        if (originalOnClose) {
          originalOnClose();
        }
      };
      modalInstance.close();
    };
    
    const cancelBtn = new Button({
      text: 'Отмена',
      onClick: () => {
        closeModal();
      }
    });
    await cancelBtn.init();
    const cancelBtnElement = cancelBtn.render();
    if (cancelBtnElement && cancelBtnElement instanceof Node) {
      cancelBtnElement.setAttribute('data-cancel-button', 'true');
      footer.appendChild(cancelBtnElement);
    }
    
    const saveBtn = new Button({
      text: 'Сохранить',
      variant: 'success',
      onClick: () => {
        try {
          const data = ConfigModal.collectFormData(modal, config, item);
          
          // Валидация обязательных полей
          const missingFields = config.fields
            .filter(f => f.required)
            .filter(f => {
              const value = data[f.name];
              return value === null || value === undefined || value === '' || 
                     (typeof value === 'string' && value.trim() === '');
            })
            .map(f => f.label);
          
          if (missingFields.length > 0) {
            alert(`Пожалуйста, заполните обязательные поля:\n${missingFields.join('\n')}`);
            return;
          }
          
          if (onSave) {
            onSave(data);
            closeModal();
          }
        } catch (error) {
          console.error('[ConfigModal] Ошибка при сохранении:', error);
          alert(`Ошибка при сохранении: ${error.message}`);
        }
      }
    });
    await saveBtn.init();
    const saveBtnElement = saveBtn.render();
    if (saveBtnElement && saveBtnElement instanceof Node) {
      saveBtnElement.setAttribute('data-confirm-button', 'true');
      footer.appendChild(saveBtnElement);
    } else {
      // Fallback кнопка
      const fallbackSaveBtn = document.createElement('button');
      fallbackSaveBtn.className = 'btn';
      fallbackSaveBtn.textContent = 'Сохранить';
      fallbackSaveBtn.setAttribute('data-confirm-button', 'true');
      // Привязываем звук к fallback кнопке
      if (typeof window !== 'undefined' && window.audioSystem) {
        window.audioSystem.attachToButton(fallbackSaveBtn);
      }
      fallbackSaveBtn.addEventListener('click', () => {
        try {
          const data = ConfigModal.collectFormData(modal, config, item);
          if (config.filters) {
            Object.assign(data, config.filters);
          }
          if (onSave) {
            onSave(data);
            closeModal();
          }
        } catch (error) {
          console.error('[ConfigModal] Ошибка при сохранении:', error);
          alert(`Ошибка при сохранении: ${error.message}`);
        }
      });
      footer.appendChild(fallbackSaveBtn);
    }
    
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Создаем экземпляр Modal после добавления в DOM
    // enterSubmitsFromInputs: Enter в input/select активирует «Сохранить»
    modalInstance = new Modal(modal, { enterSubmitsFromInputs: true });
    
    // Открываем модальное окно с анимацией
    modalInstance.open();
    
    // Сканируем ambient файлы при открытии модального окна (если это ambient-music)
    if (config.tableName === 'cfg_ambient_music') {
      try {
        const AmbientManagerModule = await import('../../utils/AmbientManager.js');
        const AmbientManager = AmbientManagerModule.default || AmbientManagerModule;
        AmbientManager.scanAmbientFiles();
      } catch (e) {
        console.warn('[ConfigModal] Ошибка сканирования ambient файлов:', e);
      }
    }
    
    // Обработчик закрытия модального окна
    const handleClose = async () => {
      // Сканируем ambient файлы при закрытии модального окна (если это ambient-music)
      if (config.tableName === 'cfg_ambient_music') {
        try {
          const AmbientManagerModule = await import('../../utils/AmbientManager.js');
          const AmbientManager = AmbientManagerModule.default || AmbientManagerModule;
          AmbientManager.scanAmbientFiles();
        } catch (e) {
          console.warn('[ConfigModal] Ошибка сканирования ambient файлов:', e);
        }
      }
    };
    
    // Добавляем обработчики закрытия
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        handleClose();
        closeModal();
      });
    }
    
    // Переопределяем метод close для вызова handleClose
    // Удаление из DOM уже обрабатывается в closeModal через onClose
    const originalClose = modalInstance.close;
    modalInstance.close = function() {
      handleClose();
      originalClose.call(this);
    };
    
    // Динамическое обновление полей при изменении task_type
    const taskTypeSelect = modal.querySelector('select[name="task_type"]');
    if (taskTypeSelect) {
      // Функция для обновления информационной плашки
      const updateTaskTypeInfo = (taskType) => {
        if (!taskTypeInfoPanel) return;
        
        const infoText = ConfigModal.getTaskTypeInfo(taskType);
        if (infoText) {
          taskTypeInfoPanel.textContent = infoText;
          taskTypeInfoPanel.style.display = 'block';
        } else {
          taskTypeInfoPanel.style.display = 'none';
        }
      };
      
      taskTypeSelect.addEventListener('change', async (e) => {
        const selectedType = e.target.value;
        await ConfigModal.updateConditionalFields(modal, selectedType, config, item, fieldComponents);
        updateTaskTypeInfo(selectedType);
      });
      
      // Устанавливаем начальное состояние с небольшой задержкой,
      // чтобы CustomSelect успел инициализироваться
      setTimeout(() => {
        const initialType = taskTypeSelect.value || taskTypeSelect.options[0]?.value;
        if (initialType) {
          ConfigModal.updateConditionalFields(modal, initialType, config, item, fieldComponents);
          updateTaskTypeInfo(initialType);
        }
      }, 100);
    }
    
    // Автофокус убран по запросу пользователя
  }
  
  static collectFormData(modal, config, item = null) {
    const data = {};
    
    // Получаем fieldComponents из модального окна
    const fieldComponents = modal._fieldComponents || new Map();
    
    // Собираем значения из select элементов
    modal.querySelectorAll('select').forEach(select => {
      const fieldName = select.name || select.dataset.fieldName;
      if (fieldName) {
        const selectedIndex = select.selectedIndex;
        if (selectedIndex >= 0 && selectedIndex < select.options.length) {
          data[fieldName] = select.options[selectedIndex].value;
        } else if (select.value) {
          data[fieldName] = select.value;
        } else if (select.options.length > 0) {
          data[fieldName] = select.options[0].value;
        }
      }
    });
    
    // Собираем значения из radio элементов (отдельно, чтобы обработать группы)
    const radioGroups = new Map();
    modal.querySelectorAll('input[type="radio"]').forEach(input => {
      const fieldName = input.name;
      if (fieldName) {
        if (!radioGroups.has(fieldName)) {
          radioGroups.set(fieldName, []);
        }
        radioGroups.get(fieldName).push(input);
      }
    });
    
    // Обрабатываем каждую группу radio
    radioGroups.forEach((inputs, fieldName) => {
      const checkedInput = inputs.find(input => input.checked);
      if (checkedInput) {
        // Сохраняем значение, включая пустую строку для "Обычный"
        data[fieldName] = checkedInput.value !== undefined ? checkedInput.value : '';
      } else if (inputs.length > 0) {
        // Если ни одна не выбрана, берем первую (по умолчанию "Обычный")
        // Тип всегда должен быть выбран
        data[fieldName] = inputs[0].value !== undefined ? inputs[0].value : '';
      }
    });
    
    // Собираем значения из остальных input элементов
    modal.querySelectorAll('input, textarea').forEach(input => {
      const fieldName = input.name;
      if (fieldName && input.type !== 'radio') {
        // Пропускаем только если значение уже есть в data (из select или radio)
        if (data[fieldName] !== undefined) {
          return;
        }
        
        if (input.type === 'checkbox') {
          data[fieldName] = input.checked ? 1 : 0;
        } else if (input.type === 'number') {
          // Для числовых полей проверяем, является ли поле обязательным
          const field = config.fields.find(f => f.name === fieldName);
          if (input.value && input.value !== '') {
            data[fieldName] = parseFloat(input.value);
          } else if (field && field.required) {
            // Для обязательных числовых полей используем 0 вместо null
            data[fieldName] = 0;
          } else {
            // Для необязательных полей не добавляем в data (чтобы не обновлять их)
            // data[fieldName] = null; // Не добавляем null, чтобы не обновлять поле
          }
        } else if (input.type === 'hidden' || input.value) {
          // Скрытые поля и обычные поля
          data[fieldName] = input.value;
        }
      }
    });
    
    // Собираем значения из кастомных компонентов (IconPickerButton, ColorPickerButton, ScheduleEditor, ListItemsEditor, DescriptionEditorButton)
    config.fields.forEach(field => {
      if (field.type === 'icon' || field.type === 'color' || field.type === 'schedule' || field.type === 'list-items' || field.type === 'textarea' || field.type === 'nutrition-preset-products') {
        const component = fieldComponents.get(field.name);
        if (component && typeof component.getValue === 'function') {
          const value = component.getValue();
          if (value !== null && value !== undefined && value !== '') {
            // Для list-items сохраняем как JSON строку в config.items
            if (field.type === 'list-items') {
              // Получаем текущее значение config из item или создаем новый объект
              let configValue = {};
              if (item && item.config) {
                try {
                  configValue = typeof item.config === 'string' ? JSON.parse(item.config) : item.config;
                } catch (e) {
                  configValue = {};
                }
              }
              configValue.items = value;
              data.config = JSON.stringify(configValue);
            } else if (field.type === 'nutrition-preset-products') {
              // Для nutrition-preset-products сохраняем как JSON строку
              data[field.name] = JSON.stringify(value);
            } else {
              data[field.name] = value;
            }
          }
        }
      }
      
      // Обработка select полей (включая nutrition-groups)
      if (field.type === 'select') {
        const input = modal.querySelector(`[name="${field.name}"]`);
        if (input && input.value) {
          data[field.name] = input.value;
        }
      }
      
      // Для обязательных полей убеждаемся, что значение есть
      // Если поле обязательное и его нет в data, пытаемся получить из формы
      if (field.required && !data[field.name] && field.type !== 'icon' && field.type !== 'color' && field.type !== 'schedule' && field.type !== 'list-items' && field.type !== 'textarea' && field.type !== 'nutrition-preset-products') {
        const input = modal.querySelector(`[name="${field.name}"]`);
        if (input) {
          if (input.type === 'number') {
            data[field.name] = input.value ? parseFloat(input.value) : 0;
          } else if (input.value !== undefined && input.value !== null) {
            data[field.name] = input.value;
          }
        }
      }
    });
    
    // Пресеты питания всегда относятся к группе "Блюда"
    if (config && config.tableName === 'cfg_nutrition_presets') {
      data.group = 'dishes';
    }

    return data;
  }
  
  static async updateConditionalFields(modal, taskType, config, item, fieldComponents) {
    const specialFieldsContainer = modal.querySelector('.cfg-form-special-fields');
    const tableBody = modal.querySelector('.cfg-form-table tbody');
    
    for (const field of config.fields) {
      if (field.showWhen && field.showWhen.field === 'task_type') {
        const shouldShow = field.showWhen.value === taskType;
        const existingElement = modal.querySelector(`[data-field-name="${field.name}"]`);
        
        if (shouldShow && !existingElement) {
          // Поле должно показываться, но его нет - создаем
          if (field.type === 'list-items' || field.type === 'nutrition-preset-products') {
            const specialField = await ConfigModal.createSpecialField(field, item);
            if (specialField && specialFieldsContainer) {
              specialField.container.setAttribute('data-field-name', field.name);
              specialFieldsContainer.appendChild(specialField.container);
              if (fieldComponents) {
                fieldComponents.set(field.name, specialField.component);
              }
            }
          } else {
            const row = await ConfigModal.createFieldRow(field, item ? item[field.name] : null, item, config);
            if (row && tableBody) {
              row.row.setAttribute('data-field-name', field.name);
              tableBody.appendChild(row.row);
              if (fieldComponents) {
                fieldComponents.set(field.name, row.component);
              }
            }
          }
        } else if (!shouldShow && existingElement) {
          // Поле не должно показываться, но оно есть - удаляем
          existingElement.remove();
          if (fieldComponents) {
            fieldComponents.delete(field.name);
          }
        }
      }
    }
  }
  
  static async createSpecialField(field, item) {
    const container = document.createElement('div');
    container.className = 'cfg-form-special-field';
    
    // Для состава пресета заголовок "Продукты *" дублирует контекст модалки — скрываем его.
    if (field.type !== 'nutrition-preset-products') {
      const label = document.createElement('div');
      label.className = 'cfg-form-special-field-label';
      label.textContent = field.label + (field.required ? ' *' : '');
      container.appendChild(label);
    }
    
    // Контент поля
    const content = document.createElement('div');
    content.className = 'cfg-form-special-field-content';
    
    let component = null;
    
    try {
      if (field.type === 'list-items') {
        // Получаем items из config
        let items = null;
        if (item && item.config) {
          try {
            const configObj = typeof item.config === 'string' ? JSON.parse(item.config) : item.config;
            items = configObj.items || null;
          } catch (e) {
            items = null;
          }
        }
        const listItemsEditor = new ListItemsEditor({
          items: items,
          onChange: (items) => {
            // Обновление уже обрабатывается внутри компонента
          }
        });
        const listItemsElement = await listItemsEditor.render();
        component = listItemsEditor;
        content.appendChild(listItemsElement);
      }
      
      if (field.type === 'nutrition-preset-products') {
        // Получаем products из item
        let products = null;
        if (item && item.products) {
          try {
            products = typeof item.products === 'string' ? JSON.parse(item.products) : item.products;
          } catch (e) {
            products = null;
          }
        }
        const presetProductsEditor = new NutritionPresetProductsEditor({
          products: products,
          onChange: (products) => {
            // Обновление уже обрабатывается внутри компонента
          }
        });
        // Устанавливаем функцию для получения БД
        if (window.getDB) {
          presetProductsEditor.setDB(window.getDB);
        }
        const presetProductsElement = await presetProductsEditor.render();
        component = presetProductsEditor;
        content.appendChild(presetProductsElement);
      }
      
      if (component) {
        container.appendChild(content);
        return { container, component };
      }
    } catch (e) {
      console.error(`Ошибка создания специального поля ${field.name}:`, e);
      return null;
    }
    
    return null;
  }
  
  static async createFieldRow(field, currentValue, item = null, config = null) {
    const row = document.createElement('tr');
    row.className = 'cfg-form-row';
    
    const labelCell = document.createElement('td');
    labelCell.className = 'cfg-form-label';
    labelCell.textContent = field.label + (field.required ? ' *' : '');
    
    const controlCell = document.createElement('td');
    controlCell.className = 'cfg-form-control';
    
    let component = null;
    let firstInput = null;
    
    try {
      if (field.type === 'text') {
        const inputSuffix = new InputSuffix({
          type: 'text',
          placeholder: field.placeholder || '',
          value: currentValue || '',
          suffix: field.suffix || ''
        });
        const inputWrapper = inputSuffix.render();
        const inputElement = inputSuffix.getInput();
        inputElement.name = field.name;
        if (field.required) {
          inputElement.required = true;
        }
        component = inputWrapper;
        firstInput = inputElement;
      } else if (field.type === 'number') {
        // Для денежных полей используем валюту из настроек
        let suffix = field.suffix || '';
        if (suffix === '₽') {
          const currency = getCurrency();
          suffix = currency.symbol;
        }
        
        const inputSuffix = new InputSuffix({
          type: 'number',
          value: currentValue || '',
          suffix: suffix,
          min: field.min,
          max: field.max,
          step: field.step
        });
        const inputWrapper = inputSuffix.render();
        const inputElement = inputSuffix.getInput();
        inputElement.name = field.name;
        if (field.required) {
          inputElement.required = true;
        }
        component = inputWrapper;
        firstInput = inputElement;
      } else if (field.type === 'textarea') {
        // Используем кнопку с модальным окном для описания
        const descriptionButton = new DescriptionEditorButton({
          value: currentValue || ''
        });
        await descriptionButton.init();
        const buttonElement = await descriptionButton.render();
        component = buttonElement;
        // Сохраняем сам компонент для доступа к getValue()
        row._descriptionButtonComponent = descriptionButton;
      } else if (field.type === 'select') {
        // Специальная обработка для nutrition-groups - используем обычный select
        if (field.options === 'nutrition-groups' && field.name === 'group') {
          try {
            const { NUTRITION_GROUPS_ARRAY } = await import('../../design-system/tokens/NutritionGroupPalette.js');
            // Устанавливаем selected для текущего значения
            const options = NUTRITION_GROUPS_ARRAY.map(opt => ({
              value: opt.value,
              text: opt.label,
              selected: opt.value === currentValue
            }));
            const select = new Select({ items: options });
            const selectWrapper = await select.render();
            const selectElement = selectWrapper.querySelector('select');
            selectElement.name = field.name;
            // Убеждаемся, что значение установлено
            if (currentValue) {
              selectElement.value = currentValue;
              // Также устанавливаем selectedIndex для нативного select
              const optionIndex = Array.from(selectElement.options).findIndex(opt => opt.value === currentValue);
              if (optionIndex >= 0) {
                selectElement.selectedIndex = optionIndex;
              }
            }
            component = selectWrapper;
            firstInput = selectElement;
          } catch (e) {
            console.error('[ConfigModal] Ошибка загрузки групп питания:', e);
            // Fallback на пустой select
            const select = new Select({ items: [{ value: '', text: 'Выберите группу' }] });
            const selectWrapper = await select.render();
            const selectElement = selectWrapper.querySelector('select');
            selectElement.name = field.name;
            component = selectWrapper;
            firstInput = selectElement;
          }
        } else {
          // Обычный select для других случаев
          // Преобразуем опции в формат, который ожидает Select компонент
          // Select ожидает либо строки, либо объекты с { value, text }
          let selectOptions = field.options;
          
          let defaultValue = null;
          if (currentValue) {
            // Находим текущее значение в опциях
            const foundOption = selectOptions.find(opt => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              return optValue === currentValue || String(optValue) === String(currentValue);
            });
            if (foundOption) {
              defaultValue = typeof foundOption === 'string' ? foundOption : foundOption.value;
            }
          }
          
          const options = selectOptions.map((opt, index) => {
            if (typeof opt === 'string') {
              const isSelected = !defaultValue && index === 0 || opt === defaultValue;
              return isSelected ? { value: opt, text: opt, selected: true } : opt;
            } else {
              // Преобразуем { value, label } в { value, text }
              const optValue = opt.value || '';
              const isSelected = !defaultValue && index === 0 || optValue === defaultValue;
              return {
                value: optValue,
                text: opt.label || opt.text || String(optValue),
                selected: isSelected
              };
            }
          });
          
          const select = new Select({ items: options });
          const selectWrapper = await select.render();
          if (!selectWrapper) {
            throw new Error(`Не удалось создать select для поля ${field.name}`);
          }
          
          const selectElement = selectWrapper.querySelector('select');
          if (!selectElement) {
            throw new Error(`Не удалось найти select элемент для поля ${field.name}`);
          }
          
          selectElement.name = field.name;
          
          // Устанавливаем значение по умолчанию, если оно не было установлено через selected
          if (defaultValue) {
            const optionIndex = options.findIndex(opt => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              return optValue === defaultValue || String(optValue) === String(defaultValue);
            });
            if (optionIndex >= 0) {
              selectElement.selectedIndex = optionIndex;
              selectElement.value = defaultValue;
            }
          } else if (options.length > 0) {
            const firstOption = options[0];
            defaultValue = typeof firstOption === 'string' ? firstOption : firstOption.value;
            selectElement.value = defaultValue;
            selectElement.selectedIndex = 0;
          }
          
          selectElement.dataset.fieldName = field.name;
          if (defaultValue) {
            selectElement.dataset.defaultValue = defaultValue;
          }
          
          component = selectWrapper;
          firstInput = selectElement;
        }
      } else if (field.type === 'radio') {
        // Обработка radio-группы
        const options = field.options || [];
        const radioItems = options.map(opt => {
          if (typeof opt === 'string') {
            return { value: opt, text: opt };
          } else {
            return { value: opt.value || '', text: opt.label || opt.text || String(opt.value || '') };
          }
        });
        
        // Для пустого значения используем пустую строку, а не null
        // Тип всегда должен быть выбран - по умолчанию "Обычный" (пустая строка)
        const radioValue = currentValue !== null && currentValue !== undefined ? currentValue : '';
        const radioButton = new RadioButton({
          name: field.name,
          items: radioItems,
          value: radioValue || '' // Гарантируем, что всегда есть значение
        });
        
        const radioWrapper = document.createElement('div');
        radioWrapper.className = 'cfg-form-radio-wrapper';
        radioWrapper.appendChild(radioButton.render());
        
        // Добавляем информационный блок для типов категорий расходов
        // Проверяем по tableName из config или по наличию опции 'compulsive'
        const isExpenseCategoryType = field.name === 'type' && (
          (config && config.tableName === 'cfg_expense_categories') ||
          (options.some(opt => {
            const optValue = typeof opt === 'string' ? opt : (opt.value || '');
            return optValue === 'compulsive';
          }))
        );
        
        if (isExpenseCategoryType) {
          const infoBlock = document.createElement('div');
          infoBlock.className = 'cfg-form-field-info';
          
          // Обновляем информацию при изменении выбора
          const updateInfo = (selectedValue) => {
            const info = ConfigModal.getExpenseTypeInfo(selectedValue);
            if (info) {
              infoBlock.textContent = info;
              infoBlock.style.display = 'block';
            } else {
              infoBlock.style.display = 'none';
            }
          };
          
          // Слушаем изменения в radio-группе
          const radioInputs = radioWrapper.querySelectorAll('input[type="radio"]');
          radioInputs.forEach(input => {
            input.addEventListener('change', () => {
              if (input.checked) {
                updateInfo(input.value);
              }
            });
          });
          
          // Показываем информацию для текущего значения (включая пустую строку)
          // Тип всегда выбран - либо "Обычный" (пустая строка), либо "Импульсивный"
          const valueToShow = currentValue !== null && currentValue !== undefined ? currentValue : '';
          updateInfo(valueToShow);
          
          radioWrapper.appendChild(infoBlock);
        }
        
        component = radioWrapper;
        firstInput = radioWrapper.querySelector('input[type="radio"]');
      } else if (field.type === 'file') {
        // Кастомное поле для выбора MP3 файлов (ambient music)
        // Используем динамический импорт для ES модуля
        const AmbientManagerModule = await import('../../utils/AmbientManager.js');
        const AmbientManager = AmbientManagerModule.default || AmbientManagerModule;
        const getDB = window.getDB;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'cfg-file-field';
        wrapper.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

        const select = new Select({ items: [] });
        const selectWrapper = await select.render();
        if (!selectWrapper) {
          throw new Error(`Не удалось создать select для поля ${field.name}`);
        }
        const selectElement = selectWrapper.querySelector('select');
        if (!selectElement) {
          throw new Error(`Не удалось найти select элемент для поля ${field.name}`);
        }
        selectElement.name = field.name;
        selectElement.dataset.fieldName = field.name;
        wrapper.appendChild(selectWrapper);

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex; gap:8px; align-items:center;';
        const importBtn = document.createElement('button');
        importBtn.type = 'button';
        importBtn.className = 'button button--secondary';
        importBtn.textContent = 'Выбрать файл...';
        actions.appendChild(importBtn);

        const hint = document.createElement('span');
        hint.className = 'cfg-form-field-info';
        hint.textContent = 'Поддержка: MP3, M4A, OGG, WAV';
        actions.appendChild(hint);
        wrapper.appendChild(actions);

        const fillSelectOptions = (options, selectedValue = null) => {
          selectElement.innerHTML = '';
          if (!options.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Файлы не добавлены';
            selectElement.appendChild(opt);
            selectElement.value = '';
            return;
          }
          options.forEach((name) => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            selectElement.appendChild(opt);
          });
          if (selectedValue && options.includes(selectedValue)) {
            selectElement.value = selectedValue;
          } else {
            selectElement.selectedIndex = 0;
          }
        };

        const getOptions = () => {
          AmbientManager.scanAmbientFiles();
          const availableFiles = AmbientManager.getAvailableFiles(getDB);
          const options = [...availableFiles];
          if (item && currentValue && AmbientManager.fileExists(currentValue) && !options.includes(currentValue)) {
            options.unshift(currentValue);
          }
          return options;
        };

        fillSelectOptions(getOptions(), currentValue || null);

        importBtn.addEventListener('click', async () => {
          try {
            const electron = window.require ? window.require('electron') : null;
            const ipc = electron?.ipcRenderer;
            if (!ipc) {
              window.alert('Выбор файла доступен только в Electron среде.');
              return;
            }
            const result = await ipc.invoke('dialog:showOpenDialog', {
              title: 'Выберите аудиофайл',
              filters: [
                { name: 'Аудио', extensions: ['mp3', 'm4a', 'ogg', 'wav'] },
                { name: 'Все файлы', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            const src = result?.filePaths?.[0];
            if (result?.canceled || !src) return;

            const importedName = AmbientManager.importAmbientFile(src);
            const nextOptions = getOptions();
            if (!nextOptions.includes(importedName)) {
              nextOptions.unshift(importedName);
            }
            fillSelectOptions(nextOptions, importedName);
          } catch (e) {
            window.alert(`Не удалось импортировать файл: ${e.message}`);
          }
        });

        component = wrapper;
        firstInput = selectElement;
      } else if (field.type === 'checkbox') {
        const checkbox = new Checkbox({
          checked: currentValue ? Boolean(currentValue) : false
        });
        const checkboxElement = checkbox.render();
        const checkboxInput = checkboxElement.querySelector('input');
        checkboxInput.name = field.name;
        checkboxInput.value = '1';
        component = checkboxElement;
        firstInput = checkboxInput;
      } else if (field.type === 'icon') {
        const iconPicker = new IconPickerButton({
          iconName: currentValue || null,
          onChange: (iconName) => {
            // Обновление уже обрабатывается внутри компонента
          }
        });
        await iconPicker.init();
        const iconElement = await iconPicker.render();
        // Сохраняем сам компонент для доступа к getValue()
        row._iconPickerComponent = iconPicker;
        component = iconElement;
      } else if (field.type === 'color') {
        // Определяем тип cfg для палитры
        const cfgType = config ? ConfigModal.detectCfgType(config) : null;
        const defaultColor = cfgType 
          ? CfgColorPalette.getDefaultColor(cfgType)
          : '#3b82f6';
        
        const colorPicker = new ColorPickerButton({
          cfgType: cfgType,
          showPalette: true,
          color: currentValue || defaultColor,
          onChange: (color) => {
            // Обновление уже обрабатывается внутри компонента
          }
        });
        
        // Сохраняем сам компонент для доступа к getValue()
        row._colorPickerComponent = colorPicker;
        
        // Кнопка выбора цвета в первой строке
        const colorButtonElement = colorPicker.getButton();
        component = colorButtonElement;
        
        // Палитра будет добавлена в отдельной строке ниже
        row._colorPaletteComponent = colorPicker;
      } else if (field.type === 'schedule') {
        let scheduleValue = currentValue;
        if (typeof scheduleValue === 'string') {
          try {
            scheduleValue = JSON.parse(scheduleValue);
          } catch (e) {
            scheduleValue = { enabled: true, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
          }
        }
        if (!scheduleValue || typeof scheduleValue !== 'object') {
          scheduleValue = { enabled: true, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
        }
        const scheduleEditor = new ScheduleEditor({
          schedule: scheduleValue,
          onChange: (schedule) => {
            // Обновление уже обрабатывается внутри компонента
          }
        });
        const scheduleElement = await scheduleEditor.render();
        // Сохраняем сам компонент для доступа к getValue()
        row._scheduleEditorComponent = scheduleEditor;
        component = scheduleElement;
      }
      
      if (component && component instanceof Node) {
        controlCell.appendChild(component);
      } else if (component && component.querySelector) {
        // Если это обертка (например, select wrapper)
        controlCell.appendChild(component);
      }
    } catch (e) {
      console.error(`Ошибка создания поля ${field.name}:`, e);
      return null;
    }
    
    row.appendChild(labelCell);
    row.appendChild(controlCell);
    
    // Сохраняем компонент в row для доступа через fieldComponents
    let componentInstance = component;
    if (field.type === 'icon' && row._iconPickerComponent) {
      componentInstance = row._iconPickerComponent;
    } else if (field.type === 'color' && row._colorPickerComponent) {
      componentInstance = row._colorPickerComponent;
    } else if (field.type === 'schedule' && row._scheduleEditorComponent) {
      componentInstance = row._scheduleEditorComponent;
    } else if (field.type === 'textarea' && row._descriptionButtonComponent) {
      componentInstance = row._descriptionButtonComponent;
    }
    
    return { row, component: componentInstance, firstInput };
  }
  
  /**
   * Создает компактную карточку entity-header (название + иконка + описание)
   * Адаптируется к наличию полей - отображает только те что есть
   * @param {Array} fields - Массив полей конфига
   * @param {Object} config - Конфигурация
   * @param {Object} item - Существующий элемент
   * @returns {Object} { container, fieldComponents, firstInput, skippedFields }
   */
  static async createEntityHeaderCard(fields, config, item) {
    const fieldComponents = new Map();
    const skippedFields = new Set();
    let firstInput = null;

    const card = document.createElement('div');
    card.className = 'cfg-entity-header-card';
    
    // Находим поля для header card
    const titleField = fields.find(f => f.name === 'title');
    const descriptionField = fields.find(f => f.name === 'description');
    const iconField = fields.find(f => f.name === 'icon');
    
    // Проверяем есть ли хотя бы одно из ключевых полей
    if (!titleField && !descriptionField && !iconField) {
      // Если нет основных полей, возвращаем пустую карточку
      return { container: card, fieldComponents, firstInput, skippedFields };
    }

    // ── Строка 1: Иконка + Название ──────────────
    if (titleField || iconField) {
      const headerRow = document.createElement('div');
      headerRow.className = 'cfg-entity-header-row';
      
      // Кнопка иконки (если есть)
      if (iconField) {
        const iconPickerButton = new IconPickerButton({
          iconName: item ? item.icon : null,
          onChange: () => {}
        });
        await iconPickerButton.init();
        const iconButtonEl = await iconPickerButton.render();
        
        const iconContainer = document.createElement('button');
        iconContainer.className = 'cfg-entity-header-icon-btn';
        iconContainer.type = 'button';
        iconContainer.dataset.fieldName = 'icon';
        if (!item || !item.icon) {
          iconContainer.classList.add('empty');
        }
        
        // Копируем SVG иконку
        if (iconButtonEl && iconButtonEl.querySelector('svg')) {
          const svg = iconButtonEl.querySelector('svg').cloneNode(true);
          iconContainer.appendChild(svg);
        }
        
        // Click - открыть picker
        iconContainer.addEventListener('click', async () => {
          const currentIcon = iconPickerButton.getValue();
          const { default: IconPickerModal } = await import('./IconPickerModal.js');
          IconPickerModal.open(currentIcon, (iconName) => {
            // Обновляем UI
            const oldSvg = iconContainer.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            
            // Загружаем новую иконку
            iconLoader.loadIcon(iconName).then(svgContent => {
              const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              newSvg.setAttribute('viewBox', '0 0 24 24');
              newSvg.setAttribute('fill', 'none');
              newSvg.setAttribute('stroke', 'currentColor');
              newSvg.setAttribute('stroke-width', '2');
              newSvg.innerHTML = svgContent;
              iconContainer.appendChild(newSvg);
              
              if (iconName) {
                iconContainer.classList.remove('empty');
              } else {
                iconContainer.classList.add('empty');
              }
            });
            
            iconPickerButton.setIcon(iconName);
          });
        });
        
        headerRow.appendChild(iconContainer);
        fieldComponents.set('icon', iconPickerButton);
        skippedFields.add('icon');
      }
      
      // Название (если есть)
      if (titleField) {
        const textSection = document.createElement('div');
        textSection.className = 'cfg-entity-header-text-section';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'cfg-entity-header-name';
        nameInput.name = titleField.name;
        nameInput.placeholder = 'Название' + (titleField.required ? ' *' : '');
        nameInput.value = (item && item.title) || '';
        if (titleField.required) {
          nameInput.required = true;
        }
        
        textSection.appendChild(nameInput);
        headerRow.appendChild(textSection);
        
        firstInput = nameInput;
        skippedFields.add('title');
      } else if (iconField) {
        // Если нет названия но есть иконка, добавим spacer
        const spacer = document.createElement('div');
        spacer.className = 'cfg-entity-header-text-section';
        headerRow.appendChild(spacer);
      }
      
      card.appendChild(headerRow);
    }
    
    // ── Строка 2: Описание (если есть) ──────────────
    if (descriptionField) {
      const descriptionTextarea = document.createElement('textarea');
      descriptionTextarea.className = 'cfg-entity-header-description';
      descriptionTextarea.name = descriptionField.name;
      descriptionTextarea.placeholder = 'Добавить описание…';
      descriptionTextarea.value = (item && item.description) || '';
      if (!descriptionTextarea.value) {
        descriptionTextarea.classList.add('empty');
      }
      
      descriptionTextarea.addEventListener('input', () => {
        if (descriptionTextarea.value) {
          descriptionTextarea.classList.remove('empty');
        } else {
          descriptionTextarea.classList.add('empty');
        }
      });
      
      card.appendChild(descriptionTextarea);
      
      // Создаем фейковый компонент для collectFormData
      const descriptionComponent = {
        getValue: () => descriptionTextarea.value
      };
      fieldComponents.set('description', descriptionComponent);
      skippedFields.add('description');
    }
    
    // ── Нижний border как разделитель ──────────────
    // Уже в CSS через border-bottom на .cfg-entity-header-card
    
    return { container: card, fieldComponents, firstInput, skippedFields };
  }
  
  /**
   * Получает информационный текст о типе задачи
   * @param {string} taskType - Тип задачи (checkbox, number, timer, ritual, list)
   * @returns {string|null} Информационный текст или null
   */
  static getTaskTypeInfo(taskType) {
    const taskTypeInfo = {
      'checkbox': 'Чекбокс: простая задача с ответом "да" или "нет". Отмечается выполненной или невыполненной одним кликом. Подходит для задач, которые либо выполнены полностью, либо не выполнены.',
      'number': 'Число: задача с количественным измерением. Указываете целевое значение и единицу измерения (шт, л, км и т.д.). Вводите фактическое значение, прогресс рассчитывается автоматически на основе достигнутого количества относительно цели.',
      'timer': 'Таймер: задача отслеживается на странице "Таймер". Указываете целевое время в часах. На странице таймера есть три вкладки: "Эскапизм" (досуг для отдыха), "Наполнение" (развивающий досуг) и "Время" (рабочие задачи). Выбираете задачу, запускаете таймер, прогресс рассчитывается автоматически.',
      'ritual': 'Ритуал: специальный тип задачи для утренних и вечерних ритуалов. Выполнение ритуалов происходит на странице "Ритуалы". Есть два вида: утренние (sunrise) и вечерние (sunset). Помогают структурировать ежедневные практики и привычки.',
      'list': 'Список: задача с выбором из нескольких вариантов. Создаете список элементов, пользователь кликает на задачу и выбирает один из вариантов. Подходит для задач, где нужно выбрать один вариант из нескольких возможных.'
    };
    
    return taskTypeInfo[taskType] || null;
  }

  /**
   * Получает информационный текст о типе категории расходов
   * @param {string} expenseType - Тип категории расходов ('', 'compulsive')
   * @returns {string|null} Информационный текст или null
   */
  static getExpenseTypeInfo(expenseType) {
    const expenseTypeInfo = {
      '': 'Обычный: стандартные расходы без особых пометок.',
      'compulsive': 'Импульсивный: расходы, совершенные под влиянием эмоций или импульса, без обдумывания. Такие покупки часто приводят к сожалению и не приносят долгосрочного удовлетворения. Рекомендуется воздержаться от таких трат.'
    };
    
    return expenseTypeInfo[expenseType] || null;
  }
}

export default ConfigModal;

