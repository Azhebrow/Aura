/**
 * Компонент метки для заголовков секций
 * Отображает дополнительную информацию в минималистичном стиле
 */
class SectionBadge {
  constructor(options = {}) {
    this.text = options.text || '';
    this.value = options.value || null;
    this.element = null;
    this.init();
  }

  init() {
    this.element = document.createElement('span');
    this.element.className = 'section-badge';
    
    // Текст метки
    const textSpan = document.createElement('span');
    textSpan.className = 'section-badge-text';
    textSpan.textContent = this.text;
    this.element.appendChild(textSpan);
    
    // Значение (если есть)
    if (this.value !== null && this.value !== undefined) {
      const valueSpan = document.createElement('span');
      valueSpan.className = 'section-badge-value';
      valueSpan.textContent = this.value;
      this.element.appendChild(valueSpan);
    }
  }

  /**
   * Обновляет текст метки
   * @param {string} text - Новый текст
   */
  setText(text) {
    this.text = text;
    const textSpan = this.element.querySelector('.section-badge-text');
    if (textSpan) {
      textSpan.textContent = text;
    }
  }

  /**
   * Обновляет значение метки
   * @param {string|null} value - Новое значение
   */
  setValue(value) {
    this.value = value;
    const valueSpan = this.element.querySelector('.section-badge-value');
    
    if (value !== null && value !== undefined) {
      if (!valueSpan) {
        // Создаем элемент значения, если его нет
        const newValueSpan = document.createElement('span');
        newValueSpan.className = 'section-badge-value';
        newValueSpan.textContent = value;
        this.element.appendChild(newValueSpan);
      } else {
        valueSpan.textContent = value;
      }
    } else if (valueSpan) {
      // Удаляем элемент значения, если значение null
      valueSpan.remove();
    }
  }

  /**
   * Обновляет и текст, и значение
   * @param {string} text - Новый текст
   * @param {string|null} value - Новое значение
   */
  update(text, value = null) {
    this.setText(text);
    this.setValue(value);
  }

  render() {
    return this.element;
  }
}

export default SectionBadge;
