import { Button } from '../form/index.js';
import InputSuffix from '../../composites/InputSuffix.js';

class ListItemsEditor {
  constructor(options = {}) {
    // Парсим данные из config.items (если они в JSON строке) или используем массив
    let items = options.items || null;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = null;
      }
    }
    
    // Если нет элементов, создаем дефолтные: 0%, 50%, 100% с пресетами названий
    this.items = items && Array.isArray(items) && items.length > 0 
      ? items.map(item => ({
          title: item.title || '',
          percent: typeof item.percent === 'number' ? item.percent : parseInt(item.percent) || 0
        }))
      : [
          { title: 'Не выполнено', percent: 0 },
          { title: 'Частично', percent: 50 },
          { title: 'Выполнено', percent: 100 }
        ];
    
    this.onChange = options.onChange || null;
    this.element = null;
    this.initialized = false;
    this.itemElements = [];
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'cfg-list-items-editor';

    // Заголовок с кнопкой добавления (без дублирования, так как label уже есть)
    const header = document.createElement('div');
    header.className = 'cfg-list-items-header';
    
    // Кнопка добавления
    const addButton = new Button({
      iconName: 'plus',
      onClick: () => this.addItem()
    });
    await addButton.init();
    const addButtonElement = await addButton.render();
    header.appendChild(addButtonElement);

    this.element.appendChild(header);

    // Контейнер элементов
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'cfg-list-items-container';
    this.itemsContainer = itemsContainer;
    this.element.appendChild(itemsContainer);

    // Рендерим элементы
    await this.renderItems();

    this.initialized = true;
  }

  async renderItems() {
    // Очищаем контейнер
    this.itemsContainer.innerHTML = '';
    this.itemElements = [];

    // Создаем элементы для каждого элемента списка
    for (let i = 0; i < this.items.length; i++) {
      const itemElement = await this.createItemElement(i);
      this.itemsContainer.appendChild(itemElement);
      this.itemElements.push(itemElement);
    }
  }

  async createItemElement(index) {
    const item = this.items[index];
    
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'cfg-list-item';

    // Поле названия - используем InputSuffix
    const titleInputSuffix = new InputSuffix({
      type: 'text',
      placeholder: 'Название',
      value: item.title || '',
      suffix: ''
    });
    const titleWrapper = titleInputSuffix.render();
    titleWrapper.className = 'cfg-list-item-title-wrapper';
    const titleInput = titleInputSuffix.getInput();
    titleInput.dataset.index = index;
    titleInput.addEventListener('input', (e) => {
      this.items[index].title = e.target.value;
      this.notifyChange();
    });
    itemWrapper.appendChild(titleWrapper);

    // Поле процента - используем InputSuffix с суффиксом %
    const percentInputSuffix = new InputSuffix({
      type: 'number',
      placeholder: '0',
      value: item.percent || 0,
      suffix: '%',
      min: 0,
      max: 100,
      step: 1
    });
    const percentWrapper = percentInputSuffix.render();
    percentWrapper.className = 'cfg-list-item-percent-wrapper';
    const percentInput = percentInputSuffix.getInput();
    percentInput.dataset.index = index;
    percentInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 0;
      this.items[index].percent = Math.max(0, Math.min(100, value));
      this.notifyChange();
    });
    itemWrapper.appendChild(percentWrapper);

    // Кнопка удаления - используем Button компонент
    const deleteButton = new Button({
      iconName: 'trash-2',
      onClick: () => this.removeItem(index)
    });
    await deleteButton.init();
    const deleteButtonElement = await deleteButton.render();
    itemWrapper.appendChild(deleteButtonElement);

    return itemWrapper;
  }

  addItem() {
    this.items.push({ title: '', percent: 0 });
    this.renderItems();
    this.notifyChange();
  }

  removeItem(index) {
    if (this.items.length <= 1) {
      // Не удаляем последний элемент
      return;
    }
    this.items.splice(index, 1);
    this.renderItems();
    this.notifyChange();
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange([...this.items]);
    }
  }

  getValue() {
    return [...this.items];
  }

  async render() {
    if (!this.initialized) {
      await this.init();
    }
    return this.element;
  }
}

export default ListItemsEditor;
