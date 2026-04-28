class Slider {
  constructor(options = {}) {
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.value = options.value || 50;
    this.element = null;
    this.init();
  }

  init() {
    const wrapper = document.createElement('div');
    wrapper.className = 'showcase-slider-wrapper';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = this.min;
    slider.max = this.max;
    slider.value = this.value;

    wrapper.appendChild(slider);
    this.element = wrapper;
  }

  render() {
    return this.element;
  }
}

export default Slider;

