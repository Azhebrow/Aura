class Heading {
  constructor(options = {}) {
    this.text = options.text || '';
    this.level = options.level || 2;
    this.element = null;
    this.init();
  }

  init() {
    this.element = document.createElement(`h${this.level}`);
    this.element.className = 'page-title';
    this.element.textContent = this.text;
    this.element.style.margin = '0';
  }

  render() {
    return this.element;
  }
}

export default Heading;

