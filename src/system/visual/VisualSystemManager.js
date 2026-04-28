import Section from '../../components/layout/Section.js';
import ThemeSwitcher from './ThemeSwitcher.js';
import AccentColorPicker from './AccentColorPicker.js';
import RadiusControls from './RadiusControls.js';

class VisualSystemManager {
  constructor() {
    this.section = null;
    this.currentTheme = 'light';
    this.init();
  }

  async init() {
    this.section = new Section({
      title: 'Визуальная система',
      titleLevel: 2
    });

    const content = await this.createContent();
    this.section.element.appendChild(content);
  }

  async createContent() {
    const container = document.createElement('div');
    container.className = 'visual-system-container';

    // Таблица с настройками
    const table = document.createElement('table');
    table.className = 'visual-system-table';

    const tbody = document.createElement('tbody');

    // Строка с переключателем тем
    const themeRow = await this.createTableRow('Тема', new ThemeSwitcher());
    tbody.appendChild(themeRow);

    // Строка с выбором акцентного цвета
    const accentRow = await this.createTableRow('Акцентный цвет', new AccentColorPicker());
    tbody.appendChild(accentRow);

    // Строка с контролами радиусов
    const radiusRow = await this.createTableRow('Радиусы округлений', new RadiusControls());
    tbody.appendChild(radiusRow);

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }

  async createTableRow(label, control) {
    const row = document.createElement('tr');
    row.className = 'visual-system-row';

    const labelCell = document.createElement('td');
    labelCell.className = 'visual-system-label';
    labelCell.textContent = label;

    const controlCell = document.createElement('td');
    controlCell.className = 'visual-system-control';
    const controlElement = await control.render();
    controlCell.appendChild(controlElement);

    row.appendChild(labelCell);
    row.appendChild(controlCell);

    return row;
  }

  async render() {
    if (!this.section) {
      await this.init();
    }
    return this.section.render();
  }

  // Метод для применения изменений
  applyChanges() {
    // Здесь будет логика применения визуальных изменений
    console.log('Применение визуальных изменений...');
  }
}

export default VisualSystemManager;
