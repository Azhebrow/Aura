import Modal from '../layout/Modal.js';
import Button from '../form/Button.js';
import { iconLoader, confirmWithSound, setupDragScroll } from '../../utils/index.js';

// Маппинг таблиц с описаниями и иконками
const TABLE_INFO = {
  // CFG таблицы
  'cfg_accounts': { icon: 'wallet', desc: 'Счета' },
  'cfg_ambient_music': { icon: 'music', desc: 'Фоновая музыка' },
  'cfg_diary_categories': { icon: 'book', desc: 'Категории дневника' },
  'cfg_diary_moods': { icon: 'circle', desc: 'Настроения' },
  'cfg_expense_categories': { icon: 'circle-arrow-down', desc: 'Категории расходов' },
  'cfg_goal_stages': { icon: 'flag', desc: 'Этапы целей' },
  'cfg_goal_tasks': { icon: 'square-check', desc: 'Задачи целей' },
  'cfg_goals': { icon: 'target', desc: 'Цели' },
  'cfg_income_categories': { icon: 'circle-arrow-up', desc: 'Категории доходов' },
  'cfg_leisure_tasks': { icon: 'coffee', desc: 'Задачи досуга' },
  'cfg_rituals_evening': { icon: 'moon', desc: 'Вечерние ритуалы' },
  'cfg_rituals_morning': { icon: 'sun', desc: 'Утренние ритуалы' },
  'cfg_tasks': { icon: 'list-check', desc: 'Задачи' },
  'cfg_vows': { icon: 'heart', desc: 'Обеты' },
  // ACT таблицы
  'act_daily_plans': { icon: 'calendar', desc: 'Ежедневные планы' },
  'act_daily_points': { icon: 'star', desc: 'Очки за день' },
  'act_diary_entries': { icon: 'book-open', desc: 'Записи дневника' },
  'act_goal_tasks': { icon: 'square-check', desc: 'Выполнение задач целей' },
  'act_rituals_evening': { icon: 'moon', desc: 'Выполнение вечерних ритуалов' },
  'act_rituals_morning': { icon: 'sun', desc: 'Выполнение утренних ритуалов' },
  'act_task_completions': { icon: 'circle-check', desc: 'Выполнение задач' },
  'act_tasks': { icon: 'list-check', desc: 'Задачи' },
  'act_timer_sessions': { icon: 'clock', desc: 'Сессии таймера' },
  'act_transactions': { icon: 'wallet', desc: 'Транзакции' }
};

class DatabaseManagementModal {
  static isOpen = false;
  static currentModal = null;

  static async open() {
    if (this.isOpen && this.currentModal) {
      return;
    }

    this.isOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay db-modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content db-modal';

    const header = document.createElement('div');
    header.className = 'modal-header db-modal__header';

    const instance = new DatabaseManagementModal();

    const title = document.createElement('h3');
    title.className = 'modal-title db-modal__title';
    title.textContent = 'Управление базой данных';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'modal-close';
    closeButton.setAttribute('aria-label', 'Закрыть');
    closeButton.innerHTML = '×';

    header.appendChild(title);
    header.appendChild(closeButton);

    const body = document.createElement('div');
    body.className = 'modal-body db-modal__body';

    await instance.init(body);

    const tagOpLabel = (buttonEl, titleAttr) => {
      if (titleAttr) {
        buttonEl.setAttribute('title', titleAttr);
        buttonEl.setAttribute('aria-label', titleAttr);
      }
      const span = buttonEl.querySelector('span');
      if (span) {
        span.classList.add('db-modal__btn-label');
      }
    };

    const footer = document.createElement('div');
    footer.className = 'modal-footer db-modal__footer';

    const footerStart = document.createElement('div');
    footerStart.className = 'db-modal__footer-group db-modal__footer-group--left';

    const refreshButton = new Button({
      iconName: 'refresh-cw',
      text: 'Обновить',
      onClick: async () => {
        await instance.loadStatistics();
      }
    });
    await refreshButton.init();
    refreshButton.element.className += ' db-modal__btn';
    tagOpLabel(refreshButton.element, 'Обновить статистику по таблицам');
    footerStart.appendChild(refreshButton.element);

    const reloadButton = new Button({
      iconName: 'database',
      text: 'Пресеты',
      onClick: async () => await instance.handleReloadPresets()
    });
    await reloadButton.init();
    reloadButton.element.className += ' db-modal__btn';
    tagOpLabel(reloadButton.element, 'Перезагрузить пресеты конфигурации');
    footerStart.appendChild(reloadButton.element);

    const footerEnd = document.createElement('div');
    footerEnd.className = 'db-modal__footer-group db-modal__footer-group--right';

    const exportButton = new Button({
      iconName: 'download',
      text: 'Экспорт',
      onClick: async () => await instance.handleExportDatabase()
    });
    await exportButton.init();
    exportButton.element.className += ' db-modal__btn';
    tagOpLabel(exportButton.element, 'Экспорт копии файла базы');
    footerEnd.appendChild(exportButton.element);

    const importButton = new Button({
      iconName: 'upload',
      text: 'Импорт',
      onClick: async () => await instance.handleImportDatabase()
    });
    await importButton.init();
    importButton.element.className += ' db-modal__btn';
    tagOpLabel(importButton.element, 'Импорт базы из файла');
    footerEnd.appendChild(importButton.element);

    const clearButton = new Button({
      iconName: 'trash-2',
      text: 'Очистить',
      onClick: async () => await instance.handleClearDatabase()
    });
    await clearButton.init();
    clearButton.element.className += ' db-modal__btn db-modal__btn--danger';
    tagOpLabel(clearButton.element, 'Очистить данные в таблицах');
    footerEnd.appendChild(clearButton.element);

    footer.appendChild(footerStart);
    footer.appendChild(footerEnd);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const modal = new Modal(overlay);
    this.currentModal = modal;

    modal.options.onClose = () => {
      this.isOpen = false;
      this.currentModal = null;
    };

    await modal.open();
  }

  static close() {
    if (this.currentModal) {
      this.currentModal.close();
    }
  }

  constructor() {
    this.db = null;
    this.topStatsRow = null;
    this.leftColumn = null;
    this.rightColumn = null;
    this.statisticsData = null;
  }

  async init(container) {
    const getDB = window.getDB;
    if (getDB) {
      this.db = getDB();
    }

    if (!this.db) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'db-modal__error';
      errorMsg.textContent = 'База данных недоступна';
      container.appendChild(errorMsg);
      return;
    }

    const scroll = document.createElement('div');
    scroll.className = 'db-modal__scroll';
    container.appendChild(scroll);

    const summary = document.createElement('section');
    summary.className = 'db-modal__summary';
    this.topStatsRow = document.createElement('div');
    this.topStatsRow.className = 'db-modal__stats';
    summary.appendChild(this.topStatsRow);
    scroll.appendChild(summary);

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'db-modal__tables';

    this.leftColumn = document.createElement('div');
    this.leftColumn.className = 'db-modal__column';

    this.rightColumn = document.createElement('div');
    this.rightColumn.className = 'db-modal__column';

    columnsContainer.appendChild(this.leftColumn);
    columnsContainer.appendChild(this.rightColumn);
    scroll.appendChild(columnsContainer);

    // Добавляем drag scroll к колонкам
    setupDragScroll(this.leftColumn, { speed: 2 });
    setupDragScroll(this.rightColumn, { speed: 2 });

    // Загружаем статистику при создании
    await this.loadStatistics();
  }

  async loadStatistics() {
    if (!this.db || !this.topStatsRow) return;

    try {
      const info = this.db.getInfo();
      const fs = require('fs');
      const path = require('path');

      let fileSize = 0;
      let fileSizeFormatted = 'Неизвестно';
      
      if (info.path && fs.existsSync(info.path)) {
        const stats = fs.statSync(info.path);
        fileSize = stats.size;
        fileSizeFormatted = this.formatFileSize(fileSize);
      }

      // Группируем таблицы
      const cfgTables = [];
      const actTables = [];
      let totalRecords = 0;

      if (info.tables && Array.isArray(info.tables)) {
        info.tables.forEach(table => {
          totalRecords += table.rowCount || 0;
          if (table.name.startsWith('cfg_')) {
            cfgTables.push(table);
          } else if (table.name.startsWith('act_')) {
            actTables.push(table);
          }
        });
      }

      // Очищаем колонки
      if (this.leftColumn) this.leftColumn.innerHTML = '';
      if (this.rightColumn) this.rightColumn.innerHTML = '';

      // Верхняя строка: Путь | Размер | Всего записей
      this.topStatsRow.innerHTML = '';
      
      // Путь
      const pathItem = document.createElement('div');
      pathItem.className = 'db-modal__stat db-modal__stat--full';
      
      const pathLabel = document.createElement('span');
      pathLabel.className = 'db-modal__stat-label';
      try {
        const folderIcon = await iconLoader.loadIcon('folder-open');
        pathLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${folderIcon}</svg> Путь:`;
      } catch (e) {
        pathLabel.textContent = 'Путь:';
      }
      
      const pathValueContainer = document.createElement('div');
      pathValueContainer.className = 'db-modal__stat-value-wrap';
      
      const pathValue = document.createElement('span');
      pathValue.className = 'db-modal__stat-value db-modal__stat-value--link';
      pathValue.textContent = info.path || 'Неизвестно';
      pathValue.title = 'Открыть папку с файлом БД';
      
      if (info.path) {
        pathValue.addEventListener('click', async () => {
          await this.openDatabaseFolder(info.path);
        });
        
        const copyButton = document.createElement('button');
        copyButton.className = 'btn btn-icon db-modal__copy';
        copyButton.title = 'Копировать путь';
        
        try {
          const copyIcon = await iconLoader.loadIcon('copy');
          copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${copyIcon}</svg>`;
        } catch (e) {
          copyButton.textContent = '📋';
        }
        
        copyButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.copyToClipboard(info.path);
        });
        
        pathValueContainer.appendChild(pathValue);
        pathValueContainer.appendChild(copyButton);
      } else {
        pathValueContainer.appendChild(pathValue);
      }
      
      pathItem.appendChild(pathLabel);
      pathItem.appendChild(pathValueContainer);
      this.topStatsRow.appendChild(pathItem);

      // Размер файла
      const sizeItem = document.createElement('div');
      sizeItem.className = 'db-modal__stat';
      
      const sizeLabel = document.createElement('span');
      sizeLabel.className = 'db-modal__stat-label';
      sizeLabel.textContent = 'Размер:';
      
      const sizeValue = document.createElement('span');
      sizeValue.className = 'db-modal__stat-value';
      sizeValue.textContent = fileSizeFormatted;
      
      sizeItem.appendChild(sizeLabel);
      sizeItem.appendChild(sizeValue);
      this.topStatsRow.appendChild(sizeItem);

      // Всего записей
      const totalItem = document.createElement('div');
      totalItem.className = 'db-modal__stat';
      
      const totalLabel = document.createElement('span');
      totalLabel.className = 'db-modal__stat-label';
      totalLabel.textContent = 'Всего записей:';
      
      const totalValue = document.createElement('span');
      totalValue.className = 'db-modal__stat-value';
      totalValue.textContent = totalRecords.toLocaleString();
      
      totalItem.appendChild(totalLabel);
      totalItem.appendChild(totalValue);
      this.topStatsRow.appendChild(totalItem);

      // Таблицы CFG - левая колонка
      if (cfgTables.length > 0 && this.leftColumn) {
        const cfgTitle = document.createElement('div');
        cfgTitle.className = 'db-modal__section-title';
        cfgTitle.textContent = `Конфигурация (${cfgTables.length})`;
        this.leftColumn.appendChild(cfgTitle);

        const cfgList = document.createElement('div');
        cfgList.className = 'db-modal__list';
        
        const iconPromises = cfgTables.map(async (table) => {
          const tableInfo = TABLE_INFO[table.name] || {};
          const iconName = tableInfo.icon || 'file';
          try {
            const icon = await iconLoader.loadIcon(iconName);
            return { table, icon, tableInfo };
          } catch (e) {
            return { table, icon: null, tableInfo };
          }
        });
        
        const tablesWithIcons = await Promise.all(iconPromises);
        
        tablesWithIcons.forEach(({ table, icon, tableInfo }) => {
          const row = document.createElement('div');
          row.className = 'db-modal__row';
          
          const leftPart = document.createElement('div');
          leftPart.className = 'db-modal__row-main';
          
          if (icon) {
            const iconEl = document.createElement('span');
            iconEl.className = 'db-modal__row-icon';
            iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
            leftPart.appendChild(iconEl);
          }
          
          const nameContainer = document.createElement('div');
          nameContainer.className = 'db-modal__row-text';
          
          if (tableInfo.desc) {
            const desc = document.createElement('span');
            desc.className = 'db-modal__row-title';
            desc.textContent = tableInfo.desc;
            nameContainer.appendChild(desc);
          }
          
          const name = document.createElement('span');
          name.className = 'db-modal__row-meta';
          name.textContent = table.name.replace('cfg_', '').replace('act_', '');
          nameContainer.appendChild(name);
          
          leftPart.appendChild(nameContainer);
          
          const count = document.createElement('span');
          count.className = 'db-modal__row-count';
          count.textContent = table.rowCount.toLocaleString();
          
          row.appendChild(leftPart);
          row.appendChild(count);
          cfgList.appendChild(row);
        });
        
        this.leftColumn.appendChild(cfgList);
      }

      // Таблицы ACT - правая колонка
      if (actTables.length > 0 && this.rightColumn) {
        const actTitle = document.createElement('div');
        actTitle.className = 'db-modal__section-title';
        actTitle.textContent = `Активность (${actTables.length})`;
        this.rightColumn.appendChild(actTitle);

        const actList = document.createElement('div');
        actList.className = 'db-modal__list';
        
        const actIconPromises = actTables.map(async (table) => {
          const tableInfo = TABLE_INFO[table.name] || {};
          const iconName = tableInfo.icon || 'file';
          try {
            const icon = await iconLoader.loadIcon(iconName);
            return { table, icon, tableInfo };
          } catch (e) {
            return { table, icon: null, tableInfo };
          }
        });
        
        const actTablesWithIcons = await Promise.all(actIconPromises);
        
        actTablesWithIcons.forEach(({ table, icon, tableInfo }) => {
          const row = document.createElement('div');
          row.className = 'db-modal__row';
          
          const leftPart = document.createElement('div');
          leftPart.className = 'db-modal__row-main';
          
          if (icon) {
            const iconEl = document.createElement('span');
            iconEl.className = 'db-modal__row-icon';
            iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
            leftPart.appendChild(iconEl);
          }
          
          const nameContainer = document.createElement('div');
          nameContainer.className = 'db-modal__row-text';
          
          if (tableInfo.desc) {
            const desc = document.createElement('span');
            desc.className = 'db-modal__row-title';
            desc.textContent = tableInfo.desc;
            nameContainer.appendChild(desc);
          }
          
          const name = document.createElement('span');
          name.className = 'db-modal__row-meta';
          name.textContent = table.name.replace('cfg_', '').replace('act_', '');
          nameContainer.appendChild(name);
          
          leftPart.appendChild(nameContainer);
          
          const count = document.createElement('span');
          count.className = 'db-modal__row-count';
          count.textContent = table.rowCount.toLocaleString();
          
          row.appendChild(leftPart);
          row.appendChild(count);
          actList.appendChild(row);
        });
        
        this.rightColumn.appendChild(actList);
      }

      this.statisticsData = {
        path: info.path,
        fileSize,
        fileSizeFormatted,
        totalRecords,
        cfgTables,
        actTables
      };
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка загрузки статистики:', error);
      if (this.topStatsRow) {
        this.topStatsRow.innerHTML = `<div class="db-modal__error db-modal__error--inline">Ошибка загрузки статистики: ${error.message}</div>`;
      }
    }
  }

  async handleReloadPresets() {
    try {
      if (!this.db) {
        alert('База данных недоступна');
        return;
      }

      const confirmed = await confirmWithSound('Перезагрузить пресеты? Текущие настройки будут заменены значениями по умолчанию.');
      if (!confirmed) {
        return;
      }

      if (this.db.reloadPresets) {
        this.db.reloadPresets();
        alert('Пресеты успешно перезагружены. Приложение будет перезагружено.');
        window.location.reload();
      } else {
        alert('Метод reloadPresets не найден в базе данных');
      }
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка перезагрузки пресетов:', error);
      alert(`Ошибка: ${error.message}`);
    }
  }

  async handleClearDatabase() {
    try {
      if (!this.db) {
        alert('База данных недоступна');
        return;
      }

      const confirmed = await confirmWithSound('Вы уверены, что хотите очистить базу данных? Это действие необратимо! Все данные будут удалены.');
      if (!confirmed) {
        return;
      }

      if (this.db.clearDatabase) {
        this.db.clearDatabase();
        alert('База данных успешно очищена. Приложение будет перезагружено.');
        window.location.reload();
      } else {
        alert('Метод clearDatabase не найден в базе данных');
      }
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка очистки базы данных:', error);
      alert(`Ошибка: ${error.message}`);
    }
  }

  async handleExportDatabase() {
    try {
      // Используем IPC напрямую, так как contextIsolation: false
      let ipcRenderer;
      try {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
      } catch (e) {
        // Пробуем через window.electronAPI если доступно
        if (window.electronAPI && window.electronAPI.dialog) {
          ipcRenderer = null; // Будем использовать window.electronAPI
        } else {
          alert('API диалогов недоступно. Убедитесь, что приложение запущено в Electron.');
          return;
        }
      }

      if (!this.db || !this.db.dbPath) {
        alert('База данных недоступна или путь к БД не определен');
        return;
      }

      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(this.db.dbPath)) {
        alert('Файл базы данных не найден');
        return;
      }

      // Получаем имя файла для экспорта
      const defaultFileName = `aura-backup-${new Date().toISOString().split('T')[0]}.db`;
      
      // Используем IPC напрямую или через window.electronAPI
      let result;
      if (ipcRenderer) {
        result = await ipcRenderer.invoke('dialog:showSaveDialog', {
          title: 'Экспорт базы данных',
          defaultPath: defaultFileName,
          filters: [
            { name: 'База данных SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
            { name: 'Все файлы', extensions: ['*'] }
          ]
        });
      } else {
        result = await window.electronAPI.dialog.showSaveDialog({
          title: 'Экспорт базы данных',
          defaultPath: defaultFileName,
          filters: [
            { name: 'База данных SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
            { name: 'Все файлы', extensions: ['*'] }
          ]
        });
      }

      if (result.canceled || !result.filePath) {
        return;
      }

      const targetPath = result.filePath;
      
      console.log('[DatabaseManagementModal] ========== ЭКСПОРТ БАЗЫ ДАННЫХ ==========');
      console.log('[DatabaseManagementModal] Путь к исходной БД:', this.db.dbPath);
      console.log('[DatabaseManagementModal] Путь для экспорта:', targetPath);
      
      // Получаем информацию о таблицах для отладки
      try {
        const tables = this.db.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `).all();
        console.log('[DatabaseManagementModal] Найдено таблиц в БД:', tables.length);
        console.log('[DatabaseManagementModal] Список таблиц:', tables.map(t => t.name).join(', '));
        
        // Подсчитываем общее количество записей
        let totalRecords = 0;
        tables.forEach(table => {
          try {
            const count = this.db.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
            totalRecords += count.count;
            console.log(`[DatabaseManagementModal]   ${table.name}: ${count.count} записей`);
          } catch (e) {
            console.warn(`[DatabaseManagementModal]   ${table.name}: не удалось подсчитать записи`, e);
          }
        });
        console.log('[DatabaseManagementModal] Всего записей в БД:', totalRecords);
      } catch (e) {
        console.warn('[DatabaseManagementModal] ⚠️ Не удалось получить информацию о таблицах:', e);
      }
      
      // ВАЖНО: Выполняем checkpoint для переноса всех данных из WAL в основной файл
      try {
        console.log('[DatabaseManagementModal] Выполняю checkpoint для переноса данных из WAL...');
        this.db.db.pragma('wal_checkpoint(FULL)');
        console.log('[DatabaseManagementModal] ✅ Checkpoint выполнен успешно');
      } catch (e) {
        console.warn('[DatabaseManagementModal] ⚠️ Ошибка checkpoint (продолжаем):', e);
      }
      
      // Получаем размер исходного файла
      const sourceStats = fs.statSync(this.db.dbPath);
      console.log('[DatabaseManagementModal] Размер исходного файла:', this.formatFileSize(sourceStats.size), `(${sourceStats.size} байт)`);
      
      // Копируем основной файл БД
      console.log('[DatabaseManagementModal] Копирую основной файл БД...');
      fs.copyFileSync(this.db.dbPath, targetPath);
      const targetStats = fs.statSync(targetPath);
      console.log('[DatabaseManagementModal] ✅ Основной файл скопирован. Размер:', this.formatFileSize(targetStats.size), `(${targetStats.size} байт)`);
      
      // Проверяем и копируем WAL и SHM файлы, если они существуют
      const walPath = this.db.dbPath + '-wal';
      const shmPath = this.db.dbPath + '-shm';
      const targetWalPath = targetPath + '-wal';
      const targetShmPath = targetPath + '-shm';
      
      let copiedFiles = ['основной файл БД'];
      
      if (fs.existsSync(walPath)) {
        try {
          const walStats = fs.statSync(walPath);
          console.log('[DatabaseManagementModal] Найден WAL файл. Размер:', this.formatFileSize(walStats.size), `(${walStats.size} байт)`);
          if (walStats.size > 0) {
            fs.copyFileSync(walPath, targetWalPath);
            const targetWalStats = fs.statSync(targetWalPath);
            console.log('[DatabaseManagementModal] ✅ WAL файл скопирован. Размер:', this.formatFileSize(targetWalStats.size), `(${targetWalStats.size} байт)`);
            copiedFiles.push('WAL файл');
          } else {
            console.log('[DatabaseManagementModal] ℹ️ WAL файл пустой (после checkpoint), не копируем');
          }
        } catch (e) {
          console.error('[DatabaseManagementModal] ❌ Ошибка копирования WAL файла:', e);
        }
      } else {
        console.log('[DatabaseManagementModal] ℹ️ WAL файл не найден (это нормально после checkpoint)');
      }
      
      if (fs.existsSync(shmPath)) {
        try {
          const shmStats = fs.statSync(shmPath);
          console.log('[DatabaseManagementModal] Найден SHM файл. Размер:', this.formatFileSize(shmStats.size), `(${shmStats.size} байт)`);
          if (shmStats.size > 0) {
            fs.copyFileSync(shmPath, targetShmPath);
            const targetShmStats = fs.statSync(targetShmPath);
            console.log('[DatabaseManagementModal] ✅ SHM файл скопирован. Размер:', this.formatFileSize(targetShmStats.size), `(${targetShmStats.size} байт)`);
            copiedFiles.push('SHM файл');
          } else {
            console.log('[DatabaseManagementModal] ℹ️ SHM файл пустой, не копируем');
          }
        } catch (e) {
          console.error('[DatabaseManagementModal] ❌ Ошибка копирования SHM файла:', e);
        }
      } else {
        console.log('[DatabaseManagementModal] ℹ️ SHM файл не найден (это нормально)');
      }
      
      console.log('[DatabaseManagementModal] ========== ЭКСПОРТ ЗАВЕРШЕН ==========');
      console.log('[DatabaseManagementModal] Скопированные файлы:', copiedFiles.join(', '));
      
      alert(`База данных успешно экспортирована в:\n${targetPath}\n\nСкопировано файлов: ${copiedFiles.length}\n${copiedFiles.join('\n')}`);
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка экспорта базы данных:', error);
      alert(`Ошибка экспорта: ${error.message}`);
    }
  }

  async handleImportDatabase() {
    try {
      // Используем IPC напрямую, так как contextIsolation: false
      let ipcRenderer;
      try {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
      } catch (e) {
        // Пробуем через window.electronAPI если доступно
        if (window.electronAPI && window.electronAPI.dialog) {
          ipcRenderer = null; // Будем использовать window.electronAPI
        } else {
          alert('API диалогов недоступно. Убедитесь, что приложение запущено в Electron.');
          return;
        }
      }

      if (!this.db) {
        alert('База данных недоступна');
        return;
      }

      const fs = require('fs');
      const path = require('path');

      // Открываем диалог выбора файла
      // Используем IPC напрямую или через window.electronAPI
      let result;
      if (ipcRenderer) {
        result = await ipcRenderer.invoke('dialog:showOpenDialog', {
        title: 'Выберите файл базы данных для импорта',
        filters: [
          { name: 'База данных SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
          { name: 'Все файлы', extensions: ['*'] }
        ],
        properties: ['openFile']
        });
      } else {
        result = await window.electronAPI.dialog.showOpenDialog({
          title: 'Выберите файл базы данных для импорта',
          filters: [
            { name: 'База данных SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
            { name: 'Все файлы', extensions: ['*'] }
          ],
          properties: ['openFile']
        });
      }

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      
      // Проверяем существование файла
      if (!fs.existsSync(filePath)) {
        alert('Выбранный файл не существует');
        return;
      }

      // Подтверждение импорта
      const confirmed = await confirmWithSound('Импорт базы данных заменит текущую базу данных. Продолжить?');
      if (!confirmed) {
        return;
      }

      // Получаем путь к текущей базе данных
      let dbPath;
      
      if (this.db.dbPath) {
        dbPath = this.db.dbPath;
      } else if (window.__auraUserDataPath) {
        dbPath = path.join(window.__auraUserDataPath, 'aura.db');
      } else {
        try {
          const { getDatabasePath } = require('../../system/database/DBPath.js');
          dbPath = getDatabasePath();
        } catch (e) {
          alert('Не удалось определить путь к базе данных');
          return;
        }
      }
      
      console.log('[DatabaseManagementModal] ========== ИМПОРТ БАЗЫ ДАННЫХ ==========');
      console.log('[DatabaseManagementModal] Путь к файлу для импорта:', filePath);
      console.log('[DatabaseManagementModal] Путь к текущей БД:', dbPath);
      
      // Получаем размер импортируемого файла
      const importStats = fs.statSync(filePath);
      console.log('[DatabaseManagementModal] Размер импортируемого файла:', this.formatFileSize(importStats.size), `(${importStats.size} байт)`);
      
      // Закрываем текущее соединение с БД
      console.log('[DatabaseManagementModal] Закрываю текущее соединение с БД...');
      try {
        if (this.db && this.db.db) {
          // Выполняем checkpoint перед закрытием для переноса всех данных из WAL
          console.log('[DatabaseManagementModal] Выполняю checkpoint перед закрытием...');
          this.db.db.pragma('wal_checkpoint(FULL)');
          console.log('[DatabaseManagementModal] ✅ Checkpoint выполнен');
          
          // Закрываем соединение
          this.db.close();
          console.log('[DatabaseManagementModal] ✅ Соединение с БД закрыто');
          
          // Даем время на полное закрытие файлов
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (e) {
        console.warn('[DatabaseManagementModal] ⚠️ Ошибка при закрытии БД (продолжаем):', e);
      }

      // Создаем резервную копию текущей базы данных (если существует)
      const filesToBackup = [];
      if (fs.existsSync(dbPath)) {
        const backupPath = dbPath + '.backup.' + Date.now();
        const currentStats = fs.statSync(dbPath);
        console.log('[DatabaseManagementModal] Создаю резервную копию текущей БД...');
        console.log('[DatabaseManagementModal] Размер текущей БД:', this.formatFileSize(currentStats.size), `(${currentStats.size} байт)`);
        fs.copyFileSync(dbPath, backupPath);
        filesToBackup.push(`Основной файл: ${backupPath}`);
        console.log('[DatabaseManagementModal] ✅ Резервная копия создана:', backupPath);
      }
      
      // Удаляем старые файлы БД (основной, WAL, SHM)
      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';
      const filesToDelete = [];
      
      if (fs.existsSync(dbPath)) {
        filesToDelete.push('основной файл БД');
        fs.unlinkSync(dbPath);
        console.log('[DatabaseManagementModal] ✅ Удален основной файл БД');
      }
      
      if (fs.existsSync(walPath)) {
        filesToDelete.push('WAL файл');
        const walBackupPath = walPath + '.backup.' + Date.now();
        fs.copyFileSync(walPath, walBackupPath);
        filesToBackup.push(`WAL файл: ${walBackupPath}`);
        fs.unlinkSync(walPath);
        console.log('[DatabaseManagementModal] ✅ Удален WAL файл (создана резервная копия)');
      }
      
      if (fs.existsSync(shmPath)) {
        filesToDelete.push('SHM файл');
        const shmBackupPath = shmPath + '.backup.' + Date.now();
        fs.copyFileSync(shmPath, shmBackupPath);
        filesToBackup.push(`SHM файл: ${shmBackupPath}`);
        fs.unlinkSync(shmPath);
        console.log('[DatabaseManagementModal] ✅ Удален SHM файл (создана резервная копия)');
      }
      
      console.log('[DatabaseManagementModal] Удалено файлов:', filesToDelete.length, filesToDelete.join(', '));
      console.log('[DatabaseManagementModal] Создано резервных копий:', filesToBackup.length);

      // Копируем только основной файл БД (после checkpoint он содержит все данные)
      // WAL и SHM от источника не копируем — могут быть от другой сессии и вызвать повреждение
      console.log('[DatabaseManagementModal] Копирую новый файл БД...');
      fs.copyFileSync(filePath, dbPath);
      const newStats = fs.statSync(dbPath);
      console.log('[DatabaseManagementModal] ✅ Новый файл скопирован. Размер:', this.formatFileSize(newStats.size), `(${newStats.size} байт)`);
      
      // Проверка целостности импортированной БД
      try {
        const Database = require('better-sqlite3');
        const verifyDb = new Database(dbPath, { readonly: true });
        const result = verifyDb.pragma('integrity_check');
        verifyDb.close();
        const ok = Array.isArray(result) ? result[0]?.integrity_check === 'ok' : result === 'ok';
        if (!ok) {
          throw new Error(typeof result === 'string' ? result : 'Проверка целостности не пройдена');
        }
        console.log('[DatabaseManagementModal] ✅ Проверка целостности пройдена');
      } catch (verifyErr) {
        console.error('[DatabaseManagementModal] ❌ Ошибка проверки целостности:', verifyErr);
        // Восстанавливаем резервную копию основного файла
        const backupMatch = filesToBackup.find(b => b.includes('Основной файл'));
        const restorePath = backupMatch ? backupMatch.replace('Основной файл: ', '') : null;
        if (restorePath && fs.existsSync(restorePath)) {
          fs.copyFileSync(restorePath, dbPath);
          console.log('[DatabaseManagementModal] Восстановлена резервная копия:', restorePath);
        }
        alert(`Ошибка импорта: проверка целостности базы данных не пройдена.\n\n${verifyErr.message}\n\nВозможно, файл повреждён или не является базой AURA.`);
        return;
      }
      
      console.log('[DatabaseManagementModal] ========== ИМПОРТ ЗАВЕРШЕН ==========');
      console.log('[DatabaseManagementModal] Резервные копии сохранены:');
      filesToBackup.forEach(backup => console.log('[DatabaseManagementModal]   -', backup));
      
      alert(`База данных успешно импортирована!\n\nРазмер импортированного файла: ${this.formatFileSize(importStats.size)}\n\nПриложение будет перезагружено.`);
      window.location.reload();
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка импорта базы данных:', error);
      alert(`Ошибка импорта: ${error.message}`);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  async openDatabaseFolder(dbPath) {
    try {
      const path = require('path');
      const folderPath = path.dirname(dbPath);
      
      if (typeof window !== 'undefined' && window.require) {
        const { shell } = window.require('electron');
        // Открываем папку в проводнике
        await shell.openPath(folderPath);
      } else {
        alert(`Путь к папке: ${folderPath}`);
      }
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка открытия папки:', error);
      alert(`Ошибка открытия папки: ${error.message}`);
    }
  }

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        // Показываем временное уведомление
        const notification = document.createElement('div');
        notification.textContent = 'Путь скопирован';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = 'var(--space-sm) var(--space-md)';
        notification.style.backgroundColor = 'var(--color-surface)';
        notification.style.border = '1px solid var(--color-border)';
        notification.style.borderRadius = 'var(--radius)';
        notification.style.zIndex = '10001';
        notification.style.fontSize = 'var(--font-sm)';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 2000);
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Путь скопирован в буфер обмена');
      }
    } catch (error) {
      console.error('[DatabaseManagementModal] Ошибка копирования:', error);
      alert(`Ошибка копирования: ${error.message}`);
    }
  }
}

export default DatabaseManagementModal;
