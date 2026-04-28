import { Modal } from '../layout/index.js';
import { iconLoader } from '../../utils/index.js';

const CATEGORIES = [
  { label: 'Все',          test: () => true },
  { label: 'Стрелки',     test: n => /arrow|chevron|corner|move|navigation/.test(n) },
  { label: 'Файлы',       test: n => /file|folder|document|archive|clipboard|paper/.test(n) },
  { label: 'Люди',        test: n => /user|person|users|contact|profile|avatar|human/.test(n) },
  { label: 'Время',       test: n => /clock|calendar|timer|watch|alarm|time|schedule/.test(n) },
  { label: 'Медиа',       test: n => /music|audio|camera|video|play|pause|image|film|mic|speaker|volume|radio|tv/.test(n) },
  { label: 'Природа',     test: n => /leaf|tree|sun|moon|star|cloud|rain|snow|flower|plant|sprout|mountain|wave|waves/.test(n) },
  { label: 'Транспорт',   test: n => /car|truck|bus|plane|train|ship|bike|vehicle|road/.test(n) },
  { label: 'Еда',         test: n => /coffee|tea|food|drink|cup|wine|beer|apple|grape|pizza|cake/.test(n) },
  { label: 'Настройки',   test: n => /settings|config|gear|tool|wrench|hammer|sliders|toggle|switch/.test(n) },
  { label: 'Интерфейс',   test: n => /button|menu|grid|layout|sidebar|panel|window|tab|list|table|search|filter/.test(n) },
  { label: 'Бизнес',      test: n => /chart|graph|analytics|money|dollar|bank|card|wallet|shopping|bag|box/.test(n) },
  { label: 'Связь',       test: n => /mail|message|chat|phone|wifi|bluetooth|signal|bell|notification|send/.test(n) },
  { label: 'Безопасность',test: n => /lock|unlock|shield|key|password|security|eye|hide|check|warning|alert/.test(n) },
];

class IconPickerModal {
  static async open(currentIcon, onSelect) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const configModalOverlay = document.querySelector('.modal-overlay[style*="z-index: 10001"]');
    const goalsModalOverlay = document.querySelector('.goals-modal-overlay');
    if (configModalOverlay) modal.style.zIndex = '10002';
    else if (goalsModalOverlay) modal.style.zIndex = '10001';

    const content = document.createElement('div');
    content.className = 'modal-content icon-picker-modal-content';
    if (configModalOverlay || goalsModalOverlay) content.style.zIndex = modal.style.zIndex || '1000';

    // ── Заголовок с поиском ────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'icon-picker-modal-header';
    
    const titleSection = document.createElement('div');
    titleSection.className = 'icon-picker-header-title-section';
    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.textContent = 'Выбор иконки';
    titleSection.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '×';
    titleSection.appendChild(closeBtn);
    
    header.appendChild(titleSection);

    // Поиск в заголовке
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'icon-picker-header-search';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'icon-picker-search-input';
    searchInput.placeholder = 'Поиск…';
    searchInput.autocomplete = 'off';

    searchWrapper.appendChild(searchInput);
    header.appendChild(searchWrapper);

    content.appendChild(header);

    // ── Основное тело (боковая панель + сетка) ────────────────────────────
    const body = document.createElement('div');
    body.className = 'icon-picker-modal-body';

    // Боковая панель категорий
    const sidebar = document.createElement('div');
    sidebar.className = 'icon-picker-sidebar';

    const categoryList = document.createElement('div');
    categoryList.className = 'icon-picker-category-list';

    const categoryButtons = new Map(); // label → button element

    CATEGORIES.forEach((cat, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-picker-category-item';
      if (idx === 0) btn.classList.add('active');
      btn.textContent = cat.label;
      btn.dataset.category = cat.label;
      categoryList.appendChild(btn);
      categoryButtons.set(cat.label, btn);
    });

    sidebar.appendChild(categoryList);
    body.appendChild(sidebar);

    // Основная область с сеткой
    const gridContainer = document.createElement('div');
    gridContainer.className = 'icon-picker-grid-container';

    const grid = document.createElement('div');
    grid.className = 'icon-picker-grid';

    // Скелетоны пока загружаются
    for (let i = 0; i < 24; i++) {
      const sk = document.createElement('div');
      sk.className = 'icon-picker-skeleton-item';
      grid.appendChild(sk);
    }

    gridContainer.appendChild(grid);
    body.appendChild(gridContainer);

    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    const modalInstance = new Modal(modal);
    modalInstance.open();

    // ── Загружаем список иконок ────────────────────────────────────────────
    let allIcons = [];
    try {
      const res = await fetch('public/icons/icons.json');
      const data = await res.json();
      allIcons = data.icons || [];
    } catch (e) {
      console.warn('[IconPickerModal] Не удалось загрузить icons.json:', e);
      allIcons = ['plus', 'minus', 'check', 'x', 'edit', 'trash-2', 'save', 'settings', 'user', 'home'];
    }

    grid.innerHTML = '';

    // ── Состояние фильтрации ──────────────────────────────────────────────
    let currentSearchTerm = '';
    let currentCategory = 'Все';
    const displayedIcons = new Map(); // iconName → button element
    const BATCH_SIZE = 80;

    function getFilteredIcons() {
      const catDef = CATEGORIES.find(c => c.label === currentCategory);
      const catTest = catDef ? catDef.test : () => true;
      return allIcons.filter(name => {
        if (!catTest(name)) return false;
        if (!currentSearchTerm) return true;
        return name.toLowerCase().includes(currentSearchTerm);
      });
    }

    // ── Рендерим батч иконок ──────────────────────────────────────────────
    async function loadBatch(names) {
      const data = await iconLoader.loadIcons(names);
      names.forEach(iconName => {
        if (displayedIcons.has(iconName)) return;

        const btn = document.createElement('button');
        btn.className = 'icon-picker-item';
        btn.type = 'button';
        btn.dataset.iconName = iconName;
        btn.title = iconName;
        if (currentIcon === iconName) btn.classList.add('selected');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.innerHTML = data[iconName] || '';
        btn.appendChild(svg);

        btn.addEventListener('click', () => {
          if (onSelect) onSelect(iconName);
          modalInstance.close();
          document.body.removeChild(modal);
        });

        grid.appendChild(btn);
        displayedIcons.set(iconName, btn);
      });
    }

    // ── Применяем фильтр ──────────────────────────────────────────────────
    async function applyFilter() {
      const filtered = getFilteredIcons();

      // Скрываем все текущие
      displayedIcons.forEach((btn) => { btn.style.display = 'none'; });

      // Показываем совпадающие (уже загруженные)
      const toLoad = [];
      filtered.forEach(name => {
        const btn = displayedIcons.get(name);
        if (btn) {
          btn.style.display = 'flex';
        } else {
          toLoad.push(name);
        }
      });

      // Догружаем первый батч новых
      if (toLoad.length > 0) {
        await loadBatch(toLoad.slice(0, BATCH_SIZE));
      }

      grid.scrollTop = 0;
    }

    // ── Первоначальная загрузка первого батча ─────────────────────────────
    await loadBatch(allIcons.slice(0, BATCH_SIZE));

    // ── Поиск ──────────────────────────────────────────────────────────────
    searchInput.addEventListener('input', () => {
      currentSearchTerm = searchInput.value.toLowerCase().trim();
      applyFilter();
    });

    // ── Переключение категорий ────────────────────────────────────────────
    categoryButtons.forEach((btn, label) => {
      btn.addEventListener('click', () => {
        // Убираем active со всех категорий
        categoryButtons.forEach(b => b.classList.remove('active'));
        // Добавляем active к текущей
        btn.classList.add('active');
        currentCategory = label;
        applyFilter();
      });
    });

    // ── Бесконечный скролл ────────────────────────────────────────────────
    grid.addEventListener('scroll', async () => {
      const nearBottom = grid.scrollHeight - grid.scrollTop - grid.clientHeight < 600;
      if (!nearBottom) return;

      const filtered = getFilteredIcons();
      const toLoad = filtered.filter(name => !displayedIcons.has(name));
      if (toLoad.length > 0) {
        await loadBatch(toLoad.slice(0, BATCH_SIZE));
      }
    });

    // ── Закрытие модального ───────────────────────────────────────────────
    closeBtn.addEventListener('click', () => {
      modalInstance.close();
      document.body.removeChild(modal);
    });

    // Фокус на поиск после открытия
    setTimeout(() => searchInput.focus(), 50);
  }
}

export default IconPickerModal;
