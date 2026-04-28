import { Button } from '../form/index.js';
import InputSuffix from '../../composites/InputSuffix.js';
import { Select } from '../form/index.js';

class NutritionPresetProductsEditor {
  constructor(options = {}) {
    // Парсим данные из products (если они в JSON строке) или используем массив
    let products = options.products || null;
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        products = null;
      }
    }
    
    // Если нет элементов, создаем массив с одним пустым элементом для удобства
    this.products = products && Array.isArray(products) && products.length > 0 
      ? products.map(item => ({
          product_id: item.product_id || '',
          quantity: typeof item.portions === 'number' ? item.portions : parseFloat(item.portions) || 1,
          quantityType: 'portions'
        }))
      : [{ product_id: '', quantity: 1, quantityType: 'portions' }];
    
    this.onChange = options.onChange || null;
    this.element = null;
    this.initialized = false;
    this.itemElements = [];
    this.availableProducts = [];
    this.getDB = null;
  }

  setDB(getDBFunction) {
    this.getDB = getDBFunction;
  }

  async loadProducts() {
    if (!this.getDB) {
      return;
    }
    const db = this.getDB();
    if (!db) {
      return;
    }
    this.availableProducts = db.getAll('cfg_nutrition_products') || [];
  }

  getProductById(productId) {
    if (!productId) return null;
    return this.availableProducts.find(p => p.id === productId) || null;
  }

  toPortions(item) {
    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) {
      return 0;
    }

    if (item.quantityType === 'grams') {
      const product = this.getProductById(item.product_id);
      const portionWeight = Number(product?.portion_weight || 0);
      if (portionWeight <= 0) {
        return 0;
      }
      return quantity / portionWeight;
    }

    return quantity;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    // Загружаем продукты из БД
    await this.loadProducts();

    this.element = document.createElement('div');
    this.element.className = 'cfg-nutrition-preset-products-editor';

    // Заголовок с кнопкой добавления
    const header = document.createElement('div');
    header.className = 'cfg-nutrition-preset-products-header';

    const tableHeader = document.createElement('div');
    tableHeader.className = 'cfg-nutrition-preset-products-table-header';
    tableHeader.innerHTML = `
      <span class="cfg-nutrition-preset-products-col-title">Продукт</span>
      <span class="cfg-nutrition-preset-products-col-title">Ед.</span>
      <span class="cfg-nutrition-preset-products-col-title">Количество</span>
      <span class="cfg-nutrition-preset-products-col-title">Действие</span>
    `;
    
    // Кнопка добавления
    const addButton = new Button({
      text: 'Добавить продукт',
      onClick: () => this.addProduct()
    });
    await addButton.init();
    const addButtonElement = await addButton.render();
    addButtonElement.classList.add('cfg-nutrition-preset-add-btn');
    // Button с icon+text выставляет inline-стили, которые ломают макет — сбрасываем их.
    addButtonElement.style.width = '';
    const addButtonText = addButtonElement.querySelector('span');
    if (addButtonText) {
      addButtonText.style.marginLeft = '';
      addButtonText.style.flexShrink = '';
    }
    header.appendChild(addButtonElement);

    this.element.appendChild(header);
    this.element.appendChild(tableHeader);

    // Контейнер элементов
    const productsContainer = document.createElement('div');
    productsContainer.className = 'cfg-nutrition-preset-products-container';
    this.productsContainer = productsContainer;
    this.element.appendChild(productsContainer);

    // Рендерим элементы
    await this.renderProducts();

    this.initialized = true;
  }

  async renderProducts() {
    // Очищаем контейнер
    this.productsContainer.innerHTML = '';
    this.itemElements = [];

    // Создаем элементы для каждого продукта
    for (let i = 0; i < this.products.length; i++) {
      const productElement = await this.createProductElement(i);
      this.productsContainer.appendChild(productElement);
      this.itemElements.push(productElement);
    }
  }

  async createProductElement(index) {
    const product = this.products[index];
    
    const productWrapper = document.createElement('div');
    productWrapper.className = 'cfg-nutrition-preset-product';

    // Выбор продукта - используем Select
    // Сортируем продукты по популярности (usage_count)
    const sortedProducts = [...this.availableProducts].sort((a, b) => {
      const countA = a.usage_count || 0;
      const countB = b.usage_count || 0;
      return countB - countA; // По убыванию
    });
    
    const productSelect = new Select({
      items: [
        { value: '', text: '— Выберите продукт —', selected: !product.product_id },
        ...sortedProducts.map(p => ({
          value: p.id,
          text: p.title || p.id,
          selected: p.id === product.product_id
        }))
      ]
    });
    const selectElement = await productSelect.render();
    selectElement.classList.add('cfg-nutrition-preset-product-select');
    const selectNative = selectElement.querySelector('select');
    if (selectNative) {
      selectNative.dataset.index = index;
      selectNative.addEventListener('change', (e) => {
        this.products[index].product_id = e.target.value;
        if (this.products[index].quantityType === 'grams') {
          const selectedProduct = this.getProductById(e.target.value);
          if (selectedProduct && (!this.products[index].quantity || this.products[index].quantity <= 0)) {
            this.products[index].quantity = Number(selectedProduct.portion_weight || 100);
          }
        }
        this.notifyChange();
      });
    }
    productWrapper.appendChild(selectElement);

    // Переключатель единицы измерения (порции/граммы)
    const unitSelect = new Select({
      items: [
        { value: 'portions', text: 'Порции', selected: (product.quantityType || 'portions') === 'portions' },
        { value: 'grams', text: 'Граммы', selected: (product.quantityType || 'portions') === 'grams' }
      ]
    });
    const unitSelectElement = await unitSelect.render();
    unitSelectElement.classList.add('cfg-nutrition-preset-product-unit');
    const unitNative = unitSelectElement.querySelector('select');
    if (unitNative) {
      unitNative.dataset.index = index;
      unitNative.addEventListener('change', (e) => {
        const previousType = this.products[index].quantityType || 'portions';
        const nextType = e.target.value;
        const selectedProduct = this.getProductById(this.products[index].product_id);
        const portionWeight = Number(selectedProduct?.portion_weight || 0);
        const currentQty = Number(this.products[index].quantity || 0);

        if (previousType !== nextType && portionWeight > 0) {
          if (nextType === 'grams') {
            this.products[index].quantity = currentQty > 0 ? currentQty * portionWeight : portionWeight;
          } else {
            this.products[index].quantity = currentQty > 0 ? (currentQty / portionWeight) : 1;
          }
        }

        this.products[index].quantityType = nextType;
        this.renderProducts(); // Обновляем суффикс/ограничения поля количества
        this.notifyChange();
      });
    }
    productWrapper.appendChild(unitSelectElement);

    // Поле количества (динамический суффикс)
    const inputSuffixText = (product.quantityType === 'grams') ? ' г' : '';
    const inputMin = (product.quantityType === 'grams') ? 1 : 0.1;
    const inputStep = (product.quantityType === 'grams') ? 1 : 0.1;
    const portionsInputSuffix = new InputSuffix({
      type: 'number',
      placeholder: '1',
      value: Number(product.quantity || 0) > 0 ? product.quantity : 1,
      suffix: inputSuffixText,
      min: inputMin,
      step: inputStep
    });
    const portionsWrapper = portionsInputSuffix.render();
    portionsWrapper.className = 'cfg-nutrition-preset-product-quantity-wrapper';
    const portionsInput = portionsInputSuffix.getInput();
    portionsInput.dataset.index = index;
    portionsInput.addEventListener('input', (e) => {
      const parsed = parseFloat(e.target.value);
      const fallback = this.products[index].quantityType === 'grams' ? 100 : 1;
      const min = this.products[index].quantityType === 'grams' ? 1 : 0.1;
      const value = Number.isFinite(parsed) ? parsed : fallback;
      this.products[index].quantity = Math.max(min, value);
      this.notifyChange();
    });
    productWrapper.appendChild(portionsWrapper);

    // Кнопка удаления
    const deleteButton = new Button({
      iconName: 'trash-2',
      onClick: () => this.removeProduct(index)
    });
    await deleteButton.init();
    const deleteButtonElement = await deleteButton.render();
    productWrapper.appendChild(deleteButtonElement);

    return productWrapper;
  }

  async addProduct() {
    this.products.push({ product_id: '', quantity: 1, quantityType: 'portions' });
    await this.renderProducts();
    this.notifyChange();
  }

  async removeProduct(index) {
    this.products.splice(index, 1);
    if (this.products.length === 0) {
      this.products.push({ product_id: '', quantity: 1, quantityType: 'portions' });
    }
    await this.renderProducts();
    this.notifyChange();
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange(this.getValue());
    }
  }

  getValue() {
    return this.products
      .map(item => ({
        product_id: item.product_id || '',
        portions: this.toPortions(item)
      }))
      .filter(item => item.product_id && item.portions > 0);
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default NutritionPresetProductsEditor;
