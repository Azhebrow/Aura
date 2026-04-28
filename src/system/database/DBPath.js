/**
 * Централизованное управление путем к базе данных
 * Гарантирует единый путь для всех процессов
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Кэш пути к базе данных
let cachedPath = null;
let cachedUserDataPath = null;

/**
 * Получает путь к директории userData
 * @returns {string} Путь к директории userData
 */
function getUserDataPath() {
  // Если путь уже определен, возвращаем его
  if (cachedUserDataPath) {
    return cachedUserDataPath;
  }

  let userDataPath = null;

  // Приоритет 1: Electron app.getPath (main процесс)
  try {
    const app = require('electron').app;
    if (app && typeof app.getPath === 'function') {
      userDataPath = app.getPath('userData');
      console.log('[DBPath] Путь из Electron app.getPath:', userDataPath);
    }
  } catch (e) {
    // Electron недоступен (renderer процесс или standalone)
  }

  // Приоритет 2: Путь, переданный из main процесса
  if (!userDataPath && typeof process !== 'undefined' && process.__auraUserDataPath) {
    userDataPath = process.__auraUserDataPath;
    console.log('[DBPath] Путь из process.__auraUserDataPath:', userDataPath);
  }

  // Приоритет 3: Стандартный путь для Windows
  if (!userDataPath) {
    const platform = process.platform || os.platform();
    const appName = 'aura';
    
    if (platform === 'win32') {
      userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', appName);
    } else if (platform === 'darwin') {
      userDataPath = path.join(os.homedir(), 'Library', 'Application Support', appName);
    } else {
      userDataPath = path.join(os.homedir(), '.config', appName);
    }
    
    console.log('[DBPath] Путь по умолчанию для', platform, ':', userDataPath);
  }

  // Создаем директорию, если её нет
  if (userDataPath && !fs.existsSync(userDataPath)) {
    try {
      fs.mkdirSync(userDataPath, { recursive: true });
      console.log('[DBPath] Директория создана:', userDataPath);
    } catch (mkdirError) {
      console.error('[DBPath] Ошибка создания директории:', mkdirError);
      throw mkdirError;
    }
  }

  cachedUserDataPath = userDataPath;
  return userDataPath;
}

/**
 * Получает полный путь к файлу базы данных
 * @returns {string} Полный путь к aura.db
 */
function getDatabasePath() {
  // Если путь уже определен, возвращаем его
  if (cachedPath) {
    return cachedPath;
  }

  const userDataPath = getUserDataPath();
  const dbPath = path.join(userDataPath, 'aura.db');
  
  cachedPath = dbPath;
  console.log('[DBPath] Путь к базе данных:', dbPath);
  
  return dbPath;
}

/**
 * Сбрасывает кэш путей (для тестирования)
 */
function resetCache() {
  cachedPath = null;
  cachedUserDataPath = null;
}

/**
 * Устанавливает путь к userData (для передачи из main процесса)
 * @param {string} userDataPath - Путь к userData
 */
function setUserDataPath(userDataPath) {
  if (userDataPath) {
    cachedUserDataPath = userDataPath;
    cachedPath = path.join(userDataPath, 'aura.db');
    console.log('[DBPath] Путь установлен вручную:', cachedPath);
  }
}

module.exports = {
  getUserDataPath,
  getDatabasePath,
  resetCache,
  setUserDataPath
};















