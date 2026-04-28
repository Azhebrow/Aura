const { app, BrowserWindow, globalShortcut, Menu, ipcMain, dialog, Tray, nativeImage, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Подсказки Chromium для композитинга (backdrop-filter, слои). Флаги безвредно игнорируются, если недоступны.
try {
  app.commandLine.appendSwitch('enable-gpu-rasterization');
} catch (_) {
  /* ignore */
}

// Инициализация базы данных
let getDB;
try {
  const dbPath = path.join(__dirname, 'src', 'system', 'database', 'Database.js');
  getDB = require(dbPath);
  console.log('[Main] База данных загружена');
} catch (e) {
  console.warn('[Main] База данных недоступна:', e.message);
  getDB = () => null;
}

let mainWindow;
let tray = null;
let timerState = {
  isRunning: false,
  elapsedTime: 0,
  targetDuration: 0,
  selectedTask: null,
  timerType: 'timer'
};
let trayUpdateInterval = null;
let devToolsTabShortcut = null;
let isQuitting = false;
const macTrayMode = process.env.AURA_MAC_TRAY_MODE || (process.platform === 'darwin' ? 'icon' : 'text');

function hideWindowToTray() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide();
    }
    updateTrayMenu();
  }
}

function showWindowFromTray() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
    app.focus();
    ensureWindowInWorkArea();
    if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('timer:sync-state');
    }
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}

/**
 * На macOS: проверяет, что окно не уходит под панель меню.
 * Исправляет позицию при переключении рабочих столов/Spaces.
 */
function ensureWindowInWorkArea() {
  if (process.platform !== 'darwin' || !mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFullScreen()) return; // В полноэкранном режиме всё ок

  try {
    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const workArea = display.workArea;

    // Если верхняя граница окна выше рабочей области (под меню-баром) — смещаем вниз
    if (bounds.y < workArea.y) {
      mainWindow.setBounds({
        x: bounds.x,
        y: workArea.y,
        width: bounds.width,
        height: Math.min(bounds.height, workArea.height)
      });
    }
  } catch (e) {
    console.warn('[Main] ensureWindowInWorkArea:', e.message);
  }
}

function resolveRendererTarget() {
  const legacyPath = path.join(__dirname, 'index.html');
  const viteBuiltPath = path.join(__dirname, 'renderer-build', 'index.html');

  if (process.env.AURA_LEGACY_UI === '1') {
    return { kind: 'file', filePath: legacyPath };
  }
  if (process.env.AURA_USE_VITE === '1') {
    return { kind: 'url', url: 'http://127.0.0.1:5173' };
  }
  if (fs.existsSync(viteBuiltPath)) {
    return { kind: 'file', filePath: viteBuiltPath };
  }
  console.warn(
    '[Main] renderer-build/index.html не найден — загружается legacy UI. Соберите: npm run build:renderer'
  );
  return { kind: 'file', filePath: legacyPath };
}

function createWindow() {
  const rendererTarget = resolveRendererTarget();
  const useViteDevServer = rendererTarget.kind === 'url';

  const iconPath = path.join(__dirname, 'public', 'icon.ico');
  
  // Для macOS используем стандартную шапку, для Windows - кастомную
  const isMac = process.platform === 'darwin';
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 350,
    minHeight: 800,
    icon: iconPath,
    frame: isMac, // Стандартная шапка для macOS
    titleBarStyle: isMac ? 'default' : 'hidden', // Стандартная шапка для macOS
    autoHideMenuBar: false,
    fullscreenable: true,
    show: false, // Показываем только по клику на иконку в трее
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Скрываем меню-бар
  mainWindow.setMenuBarVisibility(false);
  
  // Окно показывается только по клику на иконку в трее

  // После загрузки страницы: инъекция БД в renderer + настройка DevTools Tab
  mainWindow.webContents.on('did-finish-load', () => {
    const dbPath = path.join(__dirname, 'src', 'system', 'database', 'Database.js');
    const dbPathModule = path.join(__dirname, 'src', 'system', 'database', 'DBPath.js');
    const pointsServicePath = path.join(__dirname, 'src', 'system', 'services', 'PointsService.js');
    const pointsManagerPath = path.join(__dirname, 'src', 'system', 'services', 'PointsManager.js');
    const userDataPath = app.getPath('userData');
    const appPath = __dirname;

    mainWindow.webContents.executeJavaScript(`
      if (typeof window !== 'undefined') {
        try {
          const path = require('path');
          const dbPath = ${JSON.stringify(dbPath)};
          const dbPathModule = ${JSON.stringify(dbPathModule)};
          const pointsServicePath = ${JSON.stringify(pointsServicePath)};
          const pointsManagerPath = ${JSON.stringify(pointsManagerPath)};
          const userDataPath = ${JSON.stringify(userDataPath)};
          const appPath = ${JSON.stringify(appPath)};
          
          const dbPathManager = require(dbPathModule);
          dbPathManager.setUserDataPath(userDataPath);
          
          if (typeof process !== 'undefined') {
            process.__auraUserDataPath = userDataPath;
          }
          
          delete require.cache[require.resolve(dbPath)];
          const getDB = require(dbPath);
          window.getDB = typeof getDB === 'function' ? getDB : () => getDB;
          
          try {
            delete require.cache[require.resolve(pointsServicePath)];
            window.PointsService = require(pointsServicePath);
            
            delete require.cache[require.resolve(pointsManagerPath)];
            window.PointsManager = require(pointsManagerPath);
            
            console.log('[Renderer] ✅ PointsService и PointsManager загружены');
          } catch (e) {
            console.warn('[Renderer] ⚠️ Ошибка загрузки PointsService/PointsManager:', e.message);
          }
          
          window.__auraUserDataPath = userDataPath;
          window.__auraAppPath = appPath;
          
          console.log('[Renderer] ✅ База данных загружена из main процесса');
          console.log('[Renderer] 📍 Путь к данным:', userDataPath);
          console.log('[Renderer] 📍 Путь к приложению:', appPath);
          
          if (typeof window.dispatchEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aura-db-ready'));
          }
        } catch (e) {
          console.error('[Renderer] ❌ Ошибка загрузки БД:', e.message);
          console.error('[Renderer] Stack:', e.stack);
          window.getDB = () => {
            console.error('[Renderer] База данных недоступна');
            return null;
          };
        }
      }
    `);

    updateDevToolsTabShortcut(false);
    setTimeout(() => {
      try {
        if (getDB) {
          const db = getDB();
          if (db) {
            const settings = db.getAppSettings();
            const devToolsTabEnabled = settings && (settings.devtools_tab_enabled === 1 || settings.devtools_tab_enabled === true);
            updateDevToolsTabShortcut(devToolsTabEnabled);
          }
        }
      } catch (e) {
        console.warn('[Main] Ошибка загрузки настройки devtools_tab_enabled:', e);
      }
    }, 500);
  });

  // CSP: для Vite dev-сервера не навешиваем жёсткий CSP (HMR / ws). Для file:// — прежняя политика.
  if (!useViteDevServer) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' file:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' blob: data: file:; media-src 'self' file:; connect-src 'self' file:;"
          ]
        }
      });
    });
  }

  if (rendererTarget.kind === 'url') {
    mainWindow.loadURL(rendererTarget.url);
  } else {
    mainWindow.loadFile(rendererTarget.filePath);
  }

  // Функция для регистрации/отмены регистрации горячей клавиши Tab для DevTools
  function updateDevToolsTabShortcut(enabled) {
    // Отменяем предыдущую регистрацию, если есть
    if (devToolsTabShortcut) {
      try {
        globalShortcut.unregister('Tab');
        devToolsTabShortcut = null;
      } catch (e) {
        console.warn('[Main] Ошибка отмены регистрации Tab:', e);
      }
    }

    // Регистрируем только если включено
    if (enabled) {
      try {
        const registered = globalShortcut.register('Tab', () => {
          if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            if (mainWindow.webContents.isDevToolsOpened()) {
              mainWindow.webContents.closeDevTools();
            } else {
              mainWindow.webContents.openDevTools();
            }
          }
        });
        if (registered) {
          devToolsTabShortcut = 'Tab';
          console.log('[Main] Горячая клавиша Tab для DevTools зарегистрирована');
        } else {
          console.warn('[Main] Не удалось зарегистрировать горячую клавишу Tab');
        }
      } catch (e) {
        console.error('[Main] Ошибка регистрации Tab:', e);
      }
    } else {
      console.log('[Main] Горячая клавиша Tab для DevTools отключена');
    }
  }

  // Горячие клавиши для обновления страницы
  // Ctrl+R (стандартное обновление)
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  // F5 (стандартное обновление)
  globalShortcut.register('F5', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  // Ctrl+Alt+R
  globalShortcut.register('CommandOrControl+Alt+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  // Shift+Alt+R
  globalShortcut.register('Shift+Alt+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  // IPC обработчик для обновления горячей клавиши DevTools Tab
  ipcMain.on('devtools-tab-setting-changed', (event, enabled) => {
    updateDevToolsTabShortcut(enabled);
  });

  // IPC обработчики для управления окном (удаляем старый перед регистрацией нового)
  ipcMain.removeHandler('window-control');
  ipcMain.handle('window-control', async (event, action) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Window not available' };
    }

    try {
      switch (action) {
        case 'minimize':
          mainWindow.minimize();
          return { success: true };
        
        case 'maximize':
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
          } else {
            mainWindow.maximize();
          }
          return { success: true };
        
        case 'close':
          // Всегда сворачиваем в трей, не закрываем окно — чтобы при открытии не перезагружалось
          hideWindowToTray();
          return { success: true, minimizedToTray: true };
        
        case 'isMaximized':
          return { success: true, isMaximized: mainWindow.isMaximized() };
        
        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error('[Main] Ошибка управления окном:', error);
      return { success: false, error: error.message };
    }
  });

  // IPC обработчики для диалогов (удаляем старые перед регистрацией новых)
  ipcMain.removeHandler('dialog:showOpenDialog');
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return result;
    } catch (error) {
      console.error('[Main] Ошибка открытия диалога:', error);
      return { canceled: true, error: error.message };
    }
  });

  ipcMain.removeHandler('dialog:showSaveDialog');
  ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result;
    } catch (error) {
      console.error('[Main] Ошибка открытия диалога сохранения:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Перехват закрытия окна — сворачиваем в трей, кроме случая явного выхода
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideWindowToTray();
    }
  });

  // При показе окна синхронизируем состояние таймера и проверяем позицию (macOS)
  mainWindow.on('show', () => {
    ensureWindowInWorkArea();
    if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('timer:sync-state');
    }
  });

  // При выходе из полноэкранного режима проверяем позицию (macOS — окно может уйти под меню)
  mainWindow.on('leave-full-screen', () => {
    ensureWindowInWorkArea();
  });

  // При фокусе окна (переключение Cmd+Tab, клик в Dock) — проверяем позицию на macOS
  mainWindow.on('focus', () => {
    ensureWindowInWorkArea();
  });

  // Обработка клика на трей будет настроена после создания трея
}

// Функция форматирования времени для трея
function formatTimeForTray(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Функция получения отображаемого времени для трея
function getTrayDisplayTime() {
  if (timerState.timerType === 'stopwatch') {
    return formatTimeForTray(timerState.elapsedTime);
  } else {
    const remaining = Math.max(0, timerState.targetDuration - timerState.elapsedTime);
    return formatTimeForTray(remaining);
  }
}

// Подпись для времени в меню (Прошло / Осталось)
function getTrayTimeLabel() {
  return timerState.timerType === 'stopwatch' ? 'Прошло' : 'Осталось';
}

// Построение пунктов меню трея (возвращает массив для Menu.buildFromTemplate)
function getTrayMenuItems() {
  const menuItems = [];

  // Если таймер запущен, показываем информацию
  if (timerState.isRunning && timerState.selectedTask) {
    const taskTitle = timerState.selectedTask.title || 'Задача';
    const displayTime = getTrayDisplayTime();
    const timeLabel = getTrayTimeLabel();
    
    menuItems.push({
      label: taskTitle,
      enabled: false
    });
    
    menuItems.push({
      label: `${timeLabel}: ${displayTime}`,
      enabled: false
    });
    
    menuItems.push({ type: 'separator' });
    
    // Кнопка Остановить
    menuItems.push({
      label: 'Остановить таймер',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('timer:stop');
        }
      }
    });
  } else if (!timerState.isRunning && timerState.elapsedTime > 0 && timerState.selectedTask) {
    // Таймер на паузе
    const taskTitle = timerState.selectedTask.title || 'Задача';
    const displayTime = getTrayDisplayTime();
    const timeLabel = getTrayTimeLabel();
    
    menuItems.push({
      label: taskTitle,
      enabled: false
    });
    
    menuItems.push({
      label: `${timeLabel}: ${displayTime}`,
      enabled: false
    });
    
    menuItems.push({ type: 'separator' });
    
    // Кнопка Остановить
    menuItems.push({
      label: 'Остановить таймер',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('timer:stop');
        }
      }
    });
  }

  menuItems.push({ type: 'separator' });
  
  // Показать окно
  menuItems.push({
    label: 'Показать окно',
    click: () => {
      showWindowFromTray();
    }
  });
  
  // Выход
  menuItems.push({
    label: 'Выход',
    click: () => {
      isQuitting = true;
      if (tray) {
        tray.destroy();
        tray = null;
      }
      if (timerState.isRunning && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timer:stop');
        setTimeout(() => {
          app.quit();
        }, 100);
      } else {
        app.quit();
      }
    }
  });

  return menuItems;
}

// Функция обновления меню трея
function updateTrayMenu() {
  if (!tray) return;

  // Не используем setContextMenu — на Windows левый клик тогда открывает меню вместо окна.
  // Меню показывается по правому клику через popUpContextMenu.

  if (timerState.isRunning && timerState.selectedTask) {
    const displayTime = getTrayDisplayTime();
    tray.setToolTip(`AURA - ${timerState.selectedTask.title || 'Задача'} - ${displayTime}`);
  } else {
    tray.setToolTip('AURA');
  }
}

// IPC обработчики для таймера
ipcMain.handle('timer:get-state', async () => {
  return timerState;
});

ipcMain.on('timer:state-changed', (event, state) => {
  const wasRunning = timerState.isRunning;
  const wasCompleted = timerState.timerType === 'timer' && 
                       timerState.isRunning && 
                       timerState.elapsedTime >= timerState.targetDuration;
  
  timerState = { ...timerState, ...state };
  updateTrayMenu();
  
  // Если таймер запущен, начинаем периодическое обновление меню
  if (timerState.isRunning && !wasRunning) {
    // Таймер только что запустился
    if (trayUpdateInterval) {
      clearInterval(trayUpdateInterval);
    }
    timerState.startTime = state.startTime || Date.now() - (timerState.elapsedTime * 1000);
    trayUpdateInterval = setInterval(() => {
      // Обновляем elapsedTime на основе времени
      if (timerState.isRunning && timerState.startTime) {
        timerState.elapsedTime = Math.floor((Date.now() - timerState.startTime) / 1000);
        updateTrayMenu();
        
        // Проверяем завершение таймера
        if (timerState.timerType === 'timer' && timerState.elapsedTime >= timerState.targetDuration) {
          clearInterval(trayUpdateInterval);
          trayUpdateInterval = null;
        }
      } else {
        clearInterval(trayUpdateInterval);
        trayUpdateInterval = null;
      }
    }, 1000);
  } else if (!timerState.isRunning && wasRunning) {
    // Таймер остановлен
    if (trayUpdateInterval) {
      clearInterval(trayUpdateInterval);
      trayUpdateInterval = null;
    }
  }
});

// Обработка события завершения таймера
ipcMain.on('timer:completed', (event, data) => {
  const { isNaturalCompletion, taskTitle } = data || {};
  
  // Показываем уведомление при завершении таймера
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: isNaturalCompletion ? 'Таймер завершен' : 'Таймер остановлен',
      body: taskTitle ? `Задача "${taskTitle}" завершена` : 'Сессия таймера завершена',
      icon: path.join(__dirname, 'public', 'icon.ico'),
      silent: false
    });
    
    notification.show();
    
    // При клике на уведомление показываем окно
    notification.on('click', () => {
      showWindowFromTray();
    });
  }
  
  // Обновляем меню трея
  updateTrayMenu();
});

// Создание template-иконки для macOS (звезда как в CFG)
function createMacTrayIcon() {
  const customSymbolPngPath = path.join(__dirname, 'public', 'icons', 'tray-symbol.png');
  try {
    if (fs.existsSync(customSymbolPngPath)) {
      const customSymbolPngIcon = nativeImage.createFromPath(customSymbolPngPath);
      if (!customSymbolPngIcon.isEmpty()) {
        const icon = customSymbolPngIcon.resize({ width: 18, height: 18, quality: 'best' });
        icon.setTemplateImage(true);
        return icon;
      }
      console.warn('[Main] tray-symbol.png найден, но не удалось создать иконку');
    }
  } catch (e) {
    console.warn('[Main] Ошибка загрузки tray-symbol.png:', e.message);
  }

  const customSymbolPath = path.join(__dirname, 'public', 'icons', 'tray-symbol.svg');
  try {
    if (fs.existsSync(customSymbolPath)) {
      const customSymbolSvg = fs.readFileSync(customSymbolPath, 'utf8');
      const customSymbolDataUrl = `data:image/svg+xml;base64,${Buffer.from(customSymbolSvg).toString('base64')}`;
      const customSymbolIcon = nativeImage.createFromDataURL(customSymbolDataUrl);
      if (!customSymbolIcon.isEmpty()) {
        const icon = customSymbolIcon.resize({ width: 18, height: 18, quality: 'best' });
        icon.setTemplateImage(true);
        return icon;
      }
      console.warn('[Main] tray-symbol.svg найден, но не удалось создать иконку');
    } else {
      console.warn('[Main] tray-symbol.svg не найден:', customSymbolPath);
    }
  } catch (e) {
    console.warn('[Main] Ошибка загрузки tray-symbol.svg:', e.message);
  }

  const brandSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="#000000" fill-rule="evenodd" d="M12 1.75L14.88 9.12L22.25 12L14.88 14.88L12 22.25L9.12 14.88L1.75 12L9.12 9.12L12 1.75Z M12 10.3a1.7 1.7 0 1 0 0 3.4a1.7 1.7 0 0 0 0-3.4Z"/>
    </svg>
  `;
  const brandDataUrl = `data:image/svg+xml;base64,${Buffer.from(brandSvg).toString('base64')}`;
  const brandIcon = nativeImage.createFromDataURL(brandDataUrl);
  if (!brandIcon.isEmpty()) {
    const icon = brandIcon.resize({ width: 18, height: 18, quality: 'best' });
    icon.setTemplateImage(true);
    return icon;
  }

  const sparklesPath = path.join(__dirname, 'public', 'icons', 'sparkles.svg');
  const sparklesIcon = nativeImage.createFromPath(sparklesPath);
  if (!sparklesIcon.isEmpty()) {
    const icon = sparklesIcon.resize({ width: 18, height: 18, quality: 'best' });
    icon.setTemplateImage(true);
    return icon;
  }

  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  const cx = 7.5;
  const cy = 7.5;
  const outer = 6.2;
  const inner = 2.7;
  const points = [];

  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 5;
    const r = i % 2 === 0 ? outer : inner;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = pointInPolygon(x + 0.5, y + 0.5, points);
      if (inside) {
        buffer[i] = 0;
        buffer[i + 1] = 0;
        buffer[i + 2] = 0;
        buffer[i + 3] = 255;
      } else {
        buffer[i + 3] = 0;
      }
    }
  }
  const icon = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  icon.setTemplateImage(true);
  return icon;
}

function createTransparentTrayIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

// Создание системного трея
function createTray() {
  const isMac = process.platform === 'darwin';
  if (isMac && macTrayMode === 'hidden') {
    console.log('[Main] Tray отключен для macOS (AURA_MAC_TRAY_MODE=hidden)');
    return;
  }

  let icon;
  
  if (isMac) {
    icon = macTrayMode === 'icon' ? createMacTrayIcon() : createTransparentTrayIcon();
  } else {
    const iconPath = path.join(__dirname, 'public', 'icon.ico');
    icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(false);
  }
  
  tray = new Tray(icon);
  tray.setToolTip('AURA');
  if (isMac && macTrayMode !== 'icon') {
    tray.setTitle('AURA');
  }

  if (process.platform === 'darwin') {
    tray.setIgnoreDoubleClickEvents(true);
  }

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Если окно в полноэкранном режиме — показываем/переключаемся (как «Показать окно»)
    if (mainWindow.isFullScreen()) {
      showWindowFromTray();
      return;
    }
    if (mainWindow.isVisible()) {
      hideWindowToTray();
    } else {
      showWindowFromTray();
    }
  });

  tray.on('right-click', () => {
    const menu = Menu.buildFromTemplate(getTrayMenuItems());
    tray.popUpContextMenu(menu);
  });
  
  // Обновляем меню при создании
  updateTrayMenu();
  
  console.log('[Main] Системный трей создан');
}

app.whenReady().then(() => {
  // Убираем меню-бар
  Menu.setApplicationMenu(null);
  // Скрываем иконку из Dock — приложение живёт только в трее
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Не закрываем приложение если таймер активен - сворачиваем в трей
  if (timerState.isRunning) {
    return;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Если окно в полноэкранном режиме (свой Space) — не вызываем show(),
    // иначе окно «вытаскивается» на текущий рабочий стол вместо переключения на его Space
    if (mainWindow.isFullScreen()) {
      return; // macOS сам переключит на fullscreen Space приложения
    }
    showWindowFromTray();
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  if (devToolsTabShortcut) {
    try {
      globalShortcut.unregister('Tab');
    } catch (e) {
      console.warn('[Main] Ошибка отмены регистрации Tab при выходе:', e);
    }
  }
  globalShortcut.unregisterAll();
  if (trayUpdateInterval) {
    clearInterval(trayUpdateInterval);
    trayUpdateInterval = null;
  }
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
});