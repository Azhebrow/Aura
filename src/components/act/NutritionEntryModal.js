import { Modal } from '../layout/index.js';
import Button from '../form/Button.js';
import InputSuffix from '../../composites/InputSuffix.js';
import { ToggleSwitch } from '../form/index.js';
import { iconLoader } from '../../utils/index.js';
import { EmptyState } from '../display/index.js';
import { getGroupIcon, NUTRITION_GROUPS } from '../../design-system/tokens/NutritionGroupPalette.js';

class NutritionEntryModal {
  static calculateProductNutrition(product, value, isGrams = false) {
    // Если граммы - используем значение напрямую, иначе умножаем на вес порции
    const totalWeight = isGrams ? value : (product.portion_weight * value);
    const multiplier = totalWeight / 100;
    
    return {
      calories: product.calories_per_100g * multiplier,
      proteins: product.proteins_per_100g * multiplier,
      fats: product.fats_per_100g * multiplier,
      carbs: product.carbs_per_100g * multiplier,
      weight: totalWeight
    };
  }

  static calculatePresetNutrition(preset, value, productsById = {}) {
    let ingredients = [];
    try {
      ingredients = JSON.parse(preset.products || '[]');
      if (!Array.isArray(ingredients)) {
        ingredients = [];
      }
    } catch (e) {
      ingredients = [];
    }

    const totalsPerPresetPortion = ingredients.reduce((acc, ingredient) => {
      const ingredientPortions = Number(ingredient?.portions || 0);
      const productId = ingredient?.product_id;
      const product = productId ? productsById[productId] : null;
      if (!product || ingredientPortions <= 0) {
        return acc;
      }

      const nutrition = NutritionEntryModal.calculateProductNutrition(product, ingredientPortions, false);
      acc.calories += nutrition.calories;
      acc.proteins += nutrition.proteins;
      acc.fats += nutrition.fats;
      acc.carbs += nutrition.carbs;
      acc.weight += nutrition.weight;
      return acc;
    }, { calories: 0, proteins: 0, fats: 0, carbs: 0, weight: 0 });

    const multiplier = Number(value || 0);
    return {
      calories: totalsPerPresetPortion.calories * multiplier,
      proteins: totalsPerPresetPortion.proteins * multiplier,
      fats: totalsPerPresetPortion.fats * multiplier,
      carbs: totalsPerPresetPortion.carbs * multiplier,
      weight: totalsPerPresetPortion.weight * multiplier
    };
  }

  static async open(date, onSave, existingEntry = null) {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[NutritionEntryModal] База данных недоступна');
      return;
    }
    const db = getDB();
    if (!db) {
      console.error('[NutritionEntryModal] База данных не инициализирована');
      return;
    }
    
    // Загружаем продукты и блюда, сортируем: сначала по usage_count, потом по названию
    const products = db.getAll('cfg_nutrition_products').sort((a, b) => {
      const countA = a.usage_count || 0;
      const countB = b.usage_count || 0;
      const countDiff = countB - countA;
      if (countDiff !== 0) return countDiff;
      return (a.title || '').localeCompare(b.title || '', 'ru');
    });
    const presets = db.getAll('cfg_nutrition_presets').sort((a, b) => {
      const countA = a.usage_count || 0;
      const countB = b.usage_count || 0;
      const countDiff = countB - countA;
      if (countDiff !== 0) return countDiff;
      return (a.title || '').localeCompare(b.title || '', 'ru');
    });
    const productsById = products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content nutrition-entry-modal-content';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    const isEditMode = Boolean(existingEntry);
    header.innerHTML = `
      <h3 class="modal-title">${isEditMode ? 'Изменить запись' : 'Добавить запись'}</h3>
      <button class="modal-close">×</button>
    `;
    content.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    // Состояние формы
    const formState = {
      entryType: 'product',
      product_id: null,
      preset_id: null,
      quantity: 1,
      quantityType: 'portions', // 'portions' или 'grams'
      searchQuery: '', // Поисковый запрос
      selectedGroup: null // null = все группы, иначе ID группы
    };
    
    // Предзаполнение при редактировании
    if (isEditMode && existingEntry.product_id) {
      const product = db.getById('cfg_nutrition_products', existingEntry.product_id);
      if (product) {
        formState.entryType = 'product';
        formState.product_id = existingEntry.product_id;
        const portions = existingEntry.portions != null ? existingEntry.portions : 1;
        formState.quantity = portions * (product.portion_weight || 100);
        formState.quantityType = 'grams';
      }
    } else if (isEditMode && existingEntry.preset_id) {
      const preset = db.getById('cfg_nutrition_presets', existingEntry.preset_id);
      if (preset) {
        formState.entryType = 'preset';
        formState.preset_id = existingEntry.preset_id;
        formState.quantity = existingEntry.portions != null ? existingEntry.portions : 1;
        formState.quantityType = 'portions';
      }
    }
    
    const inner = document.createElement('div');
    inner.className = 'nutrition-modal-inner';

    // Табы для фильтрации по группам
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'nutrition-modal-tabs';
    let allTab = null;
    let updateItemsList = async () => {};
    let updatePreview = async () => {};
    let updateQuantityInput = () => {};
    
    const createTab = async (groupId, groupData = null) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'nutrition-modal-tab';
      tab.dataset.groupId = groupId || 'all';
      
      if (groupId === null || groupId === 'all') {
        try {
          const gridIcon = await iconLoader.loadIcon('grid-2x2');
          tab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${gridIcon}</svg>`;
        } catch (e) {
          tab.innerHTML = '•';
        }
      } else {
        const groupIconName = getGroupIcon(groupId);
        try {
          const icon = await iconLoader.loadIcon(groupIconName);
          tab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
        } catch (e) {
          tab.innerHTML = '•';
        }
      }
      
      tab.addEventListener('click', async () => {
        tabsContainer.querySelectorAll('.nutrition-modal-tab').forEach(t => t.classList.remove('nutrition-modal-tab-active'));
        tab.classList.add('nutrition-modal-tab-active');
        formState.selectedGroup = groupId === 'all' ? null : groupId;
        await updateItemsList();
      });
      
      return tab;
    };
    
    // Создаем таб "Все" и делаем его активным по умолчанию
    allTab = await createTab(null);
    allTab.classList.add('nutrition-modal-tab-active');
    tabsContainer.appendChild(allTab);
    
    // Создаем табы для каждой группы
    for (const [groupId, groupData] of Object.entries(NUTRITION_GROUPS)) {
      const tab = await createTab(groupId, groupData);
      tabsContainer.appendChild(tab);
    }
    
    inner.appendChild(tabsContainer);
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'nutrition-modal-search';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'input nutrition-modal-search-input';
    searchInput.placeholder = 'Поиск...';
    searchInput.autocomplete = 'off';
    
    try {
      const searchIcon = await iconLoader.loadIcon('search');
      const searchIconWrapper = document.createElement('div');
      searchIconWrapper.className = 'nutrition-modal-search-icon';
      searchIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${searchIcon}</svg>`;
      searchContainer.appendChild(searchIconWrapper);
    } catch (e) {
      console.warn('[NutritionEntryModal] Не удалось загрузить иконку search:', e);
    }
    
    searchContainer.appendChild(searchInput);
    
    // Реактивный поиск
    searchInput.addEventListener('input', async () => {
      formState.searchQuery = searchInput.value.toLowerCase().trim();
      await updateItemsList();
    });
    
    inner.appendChild(searchContainer);
    
    const productsList = document.createElement('div');
    productsList.className = 'nutrition-modal-list nutrition-products-list';

    const combinedItems = [
      ...products.map(product => ({ ...product, itemType: 'product', itemKey: `product:${product.id}` })),
      ...presets.map(preset => ({
        ...preset,
        group: 'dishes',
        itemType: 'preset',
        itemKey: `preset:${preset.id}`
      }))
    ];
    const getCurrentItems = () => combinedItems;
    const getSelectedId = () => {
      if (formState.preset_id) return `preset:${formState.preset_id}`;
      if (formState.product_id) return `product:${formState.product_id}`;
      return null;
    };
    const setSelectedItem = (item) => {
      if (!item) {
        formState.entryType = 'product';
        formState.product_id = null;
        formState.preset_id = null;
        return;
      }

      formState.entryType = item.itemType === 'preset' ? 'preset' : 'product';
      if (item.itemType === 'preset') {
        formState.preset_id = item.id;
        formState.product_id = null;
      } else {
        formState.product_id = item.id;
        formState.preset_id = null;
      }
    };

    updateItemsList = async () => {
      productsList.innerHTML = '';
      
      // Фильтруем список по группе и поисковому запросу
      const allItems = getCurrentItems();
      let filteredItems = allItems;
      
      // Фильтр по группе
      if (formState.selectedGroup !== null) {
        filteredItems = filteredItems.filter(item => 
          item.group === formState.selectedGroup
        );
      }
      
      // Фильтр по поисковому запросу
      if (formState.searchQuery) {
        filteredItems = filteredItems.filter(item => 
          item.title.toLowerCase().includes(formState.searchQuery)
        );
      }
      
      if (filteredItems.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'nutrition-modal-list-empty';
        emptyMessage.textContent = allItems.length === 0
          ? 'Нет продуктов и блюд'
          : 'Ничего не найдено';
        productsList.appendChild(emptyMessage);
        setSelectedItem(null);
        return;
      }
      
      for (const item of filteredItems) {
        const row = document.createElement('button');
        row.className = 'nutrition-product-row';
        row.type = 'button';
        row.dataset.itemId = item.itemKey;
        if (getSelectedId() === item.itemKey) {
          row.classList.add('is-selected');
        }
        
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'nutrition-product-row-icon';
        const itemIcon = item.itemType === 'preset'
          ? getGroupIcon('dishes')
          : (item.group ? getGroupIcon(item.group) : item.icon);
        if (itemIcon) {
          try {
            const iconContent = await iconLoader.loadIcon(itemIcon);
            iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
          } catch (e) {
            console.warn(`[NutritionEntryModal] Не удалось загрузить иконку ${itemIcon}:`, e);
          }
        }
        row.appendChild(iconWrapper);
        
        const titleEl = document.createElement('div');
        titleEl.className = 'nutrition-product-row-title';
        titleEl.textContent = item.title;
        row.appendChild(titleEl);
        
        const perPortionNutrition = item.itemType === 'preset'
          ? NutritionEntryModal.calculatePresetNutrition(item, 1, productsById)
          : null;

        const macrosEl = document.createElement('div');
        macrosEl.className = 'nutrition-product-row-macros';
        if (item.itemType === 'preset') {
          macrosEl.textContent = `Б:${Math.round(perPortionNutrition.proteins)}г Ж:${Math.round(perPortionNutrition.fats)}г У:${Math.round(perPortionNutrition.carbs)}г`;
        } else {
          macrosEl.textContent = `Б:${Math.round(item.proteins_per_100g)}г Ж:${Math.round(item.fats_per_100g)}г У:${Math.round(item.carbs_per_100g)}г`;
        }
        row.appendChild(macrosEl);
        
        if (item.itemType === 'product' && item.portion_weight) {
          const portionEl = document.createElement('div');
          portionEl.className = 'nutrition-product-portion nutrition-product-row-portion';
          portionEl.textContent = `${item.portion_weight} г`;
          row.appendChild(portionEl);
        }
        
        const caloriesEl = document.createElement('div');
        caloriesEl.className = 'nutrition-product-row-calories';
        caloriesEl.textContent = `${Math.round(item.itemType === 'preset' ? perPortionNutrition.calories : item.calories_per_100g)} ккал`;
        row.appendChild(caloriesEl);
        
        row.addEventListener('click', async () => {
          if (typeof window !== 'undefined' && window.audioSystem) {
            window.audioSystem.play('select', { volume: 0.15 });
          }
          productsList.querySelectorAll('.nutrition-product-row').forEach(r => r.classList.remove('is-selected'));
          row.classList.add('is-selected');
          setSelectedItem(item);
          if (item.itemType === 'product' && formState.quantityType === 'grams') {
            formState.quantity = item.portion_weight;
          } else if (item.itemType === 'preset') {
            formState.quantityType = 'portions';
          }
          updateQuantityInput();
          await updatePreview();
        });
        
        productsList.appendChild(row);
      }
      
      // Если элемент еще не выбран или выбранный элемент не найден в отфильтрованном списке
      const selectedItem = getSelectedId() 
        ? filteredItems.find(p => p.itemKey === getSelectedId())
        : null;
      
      if (!selectedItem && filteredItems.length > 0) {
        setSelectedItem(filteredItems[0]);
        const firstRow = productsList.querySelector(`[data-item-id="${filteredItems[0].itemKey}"]`);
        if (firstRow) firstRow.classList.add('is-selected');
        updateQuantityInput();
        await updatePreview();
      } else if (selectedItem) {
        const selectedRow = productsList.querySelector(`[data-item-id="${getSelectedId()}"]`);
        if (selectedRow) selectedRow.classList.add('is-selected');
        updateQuantityInput();
        await updatePreview();
      }
    };
    
    inner.appendChild(productsList);
    
    const selectionBlock = document.createElement('div');
    selectionBlock.className = 'nutrition-modal-selection';
    
    const controlsRow = document.createElement('div');
    controlsRow.className = 'nutrition-modal-controls';
    
    // Переключатель порции/граммы
    const quantityTypeToggle = new ToggleSwitch({
      leftOption: { value: 'portions', text: 'Порции' },
      rightOption: { value: 'grams', text: 'Граммы' },
      value: formState.quantityType,
      onChange: async (value) => {
        // Воспроизводим звук переключения
        if (typeof window !== 'undefined' && window.audioSystem) {
          const sound = value === 'grams' ? 'toggle_on' : 'toggle_off';
          window.audioSystem.play(sound, { volume: 0.15 });
        }
        
        const product = formState.product_id ? db.getById('cfg_nutrition_products', formState.product_id) : null;

        if (formState.entryType === 'preset') {
          formState.quantityType = 'portions';
          formState.quantity = formState.quantity > 0 ? formState.quantity : 1;
          updateQuantityInput();
          await updatePreview();
          return;
        }
        
        // Конвертируем значение при переключении
        if (value === 'grams' && formState.quantityType === 'portions' && product) {
          // Порции -> граммы: умножаем на вес порции
          formState.quantity = formState.quantity * product.portion_weight;
        } else if (value === 'portions' && formState.quantityType === 'grams' && product) {
          // Граммы -> порции: делим на вес порции
          formState.quantity = formState.quantity / product.portion_weight;
        } else if (value === 'grams' && product) {
          // Если переключаемся на граммы впервые, используем вес порции
          formState.quantity = product.portion_weight;
        }
        
        formState.quantityType = value;
        updateQuantityInput();
        await updatePreview();
      }
    });
    controlsRow.appendChild(quantityTypeToggle.render());
    
    const quantityInputContainer = document.createElement('div');
    quantityInputContainer.className = 'nutrition-modal-quantity-wrap';
    
    let quantityInputSuffix = null;
    let quantityInput = null;
    
    updateQuantityInput = () => {
      quantityInputContainer.innerHTML = '';
      
      const product = formState.product_id ? db.getById('cfg_nutrition_products', formState.product_id) : null;
      const isPreset = formState.entryType === 'preset';
      
      if (formState.quantityType === 'portions' || isPreset) {
        quantityInputSuffix = new InputSuffix({
          type: 'number',
          value: formState.quantity,
          placeholder: '1',
          suffix: isPreset ? 'порц. блюда' : 'порций',
          min: 0.1,
          step: 0.1
        });
      } else {
        // Для граммов используем текущее значение или вес порции как начальное
        const initialGrams = product ? product.portion_weight : 100;
        const gramsValue = formState.quantity >= 1 ? formState.quantity : initialGrams;
        
        quantityInputSuffix = new InputSuffix({
          type: 'number',
          value: gramsValue,
          placeholder: '100',
          suffix: ' г',
          min: 1,
          step: 1
        });
      }
      
      const quantityInputElement = quantityInputSuffix.render();
      const inputWrapper = quantityInputElement;
      inputWrapper.classList.toggle('nutrition-grams-input', formState.quantityType === 'grams' && !isPreset);
      const input = quantityInputSuffix.getInput();
      quantityInput = input;
      quantityInput.addEventListener('input', async () => {
        formState.quantity = parseFloat(quantityInput.value) || (formState.quantityType === 'portions' ? 1 : 100);
        await updatePreview();
      });
      
      quantityInputContainer.appendChild(quantityInputElement);
    };
    
    updateQuantityInput();
    controlsRow.appendChild(quantityInputContainer);
    selectionBlock.appendChild(controlsRow);
    
    const previewContent = document.createElement('div');
    previewContent.className = 'nutrition-modal-preview';
    
    updatePreview = async () => {
      previewContent.innerHTML = '';
      
      let nutrition = null;
      if (formState.entryType === 'product' && formState.product_id) {
        const product = db.getById('cfg_nutrition_products', formState.product_id);
        if (product) {
          const isGrams = formState.quantityType === 'grams';
          nutrition = NutritionEntryModal.calculateProductNutrition(product, formState.quantity, isGrams);
        }
      } else if (formState.entryType === 'preset' && formState.preset_id) {
        const preset = db.getById('cfg_nutrition_presets', formState.preset_id);
        if (preset) {
          nutrition = NutritionEntryModal.calculatePresetNutrition(preset, formState.quantity, productsById);
        }
      }

      if (!nutrition) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'nutrition-modal-preview-empty';
        emptyMessage.textContent = formState.entryType === 'preset' ? 'Выберите блюдо' : 'Выберите продукт';
        previewContent.appendChild(emptyMessage);
        return;
      }

      const items = [
        { label: 'ккал', value: Math.round(nutrition.calories), icon: 'flame' },
        { label: 'Б', value: Math.round(nutrition.proteins), icon: 'activity' },
        { label: 'Ж', value: Math.round(nutrition.fats), icon: 'droplet' },
        { label: 'У', value: Math.round(nutrition.carbs), icon: 'wheat' }
      ];
      const previewRow = document.createElement('div');
      previewRow.className = 'nutrition-modal-preview-row';
      for (const item of items) {
        const itemEl = document.createElement('div');
        itemEl.className = 'nutrition-modal-preview-item';
        try {
          const itemIcon = await iconLoader.loadIcon(item.icon);
          const iconEl = document.createElement('span');
          iconEl.className = 'nutrition-modal-preview-icon';
          iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${itemIcon}</svg>`;
          itemEl.appendChild(iconEl);
        } catch (e) {
          console.warn(`[NutritionEntryModal] Не удалось загрузить иконку ${item.icon}:`, e);
        }
        const valueEl = document.createElement('span');
        valueEl.textContent = `${item.value} ${item.label}`;
        itemEl.appendChild(valueEl);
        previewRow.appendChild(itemEl);
      }
      previewContent.appendChild(previewRow);
    };
    
    selectionBlock.appendChild(previewContent);
    inner.appendChild(selectionBlock);
    body.appendChild(inner);
    
    // Инициализация: обновляем список и превью (включая режим редактирования)
    await updateItemsList();
    await updatePreview();
    
    content.appendChild(body);
    
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const cancelBtn = new Button({
      text: 'Отмена',
      variant: 'secondary',
      onClick: () => {
        modalInstance.close();
        document.body.removeChild(modal);
      }
    });
    await cancelBtn.init();
    cancelBtn.element.setAttribute('data-cancel-button', 'true');
    footer.appendChild(cancelBtn.element);
    
    const saveBtn = new Button({
      text: isEditMode ? 'Сохранить' : 'Добавить',
      variant: 'success',
      onClick: async () => {
        try {
          // Валидация
          if (!formState.quantity || formState.quantity <= 0) {
            alert('Введите корректное количество');
            return;
          }

          let entryData = null;

          if (formState.entryType === 'preset') {
            if (!formState.preset_id) {
              alert('Выберите блюдо');
              return;
            }

            const preset = db.getById('cfg_nutrition_presets', formState.preset_id);
            if (!preset) {
              alert('Блюдо не найдено');
              return;
            }

            const nutrition = NutritionEntryModal.calculatePresetNutrition(preset, formState.quantity, productsById);
            entryData = {
              type: 'dish',
              product_id: null,
              preset_id: formState.preset_id,
              portions: formState.quantity,
              total_calories: nutrition.calories,
              total_proteins: nutrition.proteins,
              total_fats: nutrition.fats,
              total_carbs: nutrition.carbs
            };
          } else {
            if (!formState.product_id) {
              alert('Выберите продукт');
              return;
            }

            const product = db.getById('cfg_nutrition_products', formState.product_id);
            if (!product) {
              alert('Продукт не найден');
              return;
            }

            const isGrams = formState.quantityType === 'grams';
            const nutrition = NutritionEntryModal.calculateProductNutrition(product, formState.quantity, isGrams);
            const portions = isGrams ? (formState.quantity / product.portion_weight) : formState.quantity;

            entryData = {
              type: 'product',
              product_id: formState.product_id,
              preset_id: null,
              portions: portions,
              total_calories: nutrition.calories,
              total_proteins: nutrition.proteins,
              total_fats: nutrition.fats,
              total_carbs: nutrition.carbs
            };
          }
          
          if (onSave) {
            await onSave(entryData, isEditMode ? existingEntry.id : undefined);
            modalInstance.close();
            document.body.removeChild(modal);
          }
        } catch (error) {
          console.error('[NutritionEntryModal] Ошибка при сохранении:', error);
          alert(`Ошибка при сохранении: ${error.message}`);
        }
      }
    });
    await saveBtn.init();
    saveBtn.element.setAttribute('data-confirm-button', 'true');
    footer.appendChild(saveBtn.element);
    
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    const modalInstance = new Modal(modal, { enterSubmitsFromInputs: true });
    modalInstance.open();
    
    // Автофокус убран по запросу пользователя
  }
}

export default NutritionEntryModal;
