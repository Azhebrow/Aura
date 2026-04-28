/**
 * Информационный блок-подсказка для секций настроек.
 * Принимает конфиг из settings-info-config.js, отображает описание и советы.
 */

class SettingsInfoBlock {
  constructor(config) {
    this.config = config || {};
  }

  render() {
    const { title, description, tips } = this.config;
    const hasDescription = description && (Array.isArray(description) ? description.length > 0 : true);
    if (!title && !hasDescription && (!tips || tips.length === 0)) {
      return null;
    }

    const block = document.createElement('div');
    block.className = 'settings-info-block';

    if (title) {
      const header = document.createElement('div');
      header.className = 'settings-info-header';
      header.innerHTML = `
        <span class="settings-info-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </span>
        <span class="settings-info-title">${escapeHtml(title)}</span>
      `;
      block.appendChild(header);
    }

    if (description) {
      const paragraphs = Array.isArray(description) ? description : [description];
      paragraphs.forEach((text) => {
        const p = document.createElement('p');
        p.className = 'settings-info-description';
        p.textContent = text;
        block.appendChild(p);
      });
    }

    if (tips && tips.length > 0) {
      const list = document.createElement('ul');
      list.className = 'settings-info-tips';
      tips.forEach((tip) => {
        const li = document.createElement('li');
        li.className = 'settings-info-tip';
        li.textContent = tip;
        list.appendChild(li);
      });
      block.appendChild(list);
    }

    return block;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default SettingsInfoBlock;
