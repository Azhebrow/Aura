/**
 * Менеджер для управления MP3 файлами ambient музыки
 * Сканирует папку ambient/ и предоставляет список доступных файлов
 */

// Получаем модули в зависимости от окружения
let path, fs;
if (typeof window !== 'undefined' && window.require) {
  // Electron renderer процесс
  path = window.require('path');
  fs = window.require('fs');
} else if (typeof require !== 'undefined') {
  // Node.js окружение
  path = require('path');
  fs = require('fs');
} else {
  // Fallback (не должно произойти)
  console.error('[AmbientManager] Не удалось загрузить модули path и fs');
}

// Кэш для списка файлов
let cachedFiles = null;
let cachedAvailableFiles = null;

class AmbientManager {
  /**
   * Получает путь к папке ambient
   * @returns {string} Полный путь к папке ambient
   */
  static getAmbientPath() {
    try {
      let userDataPath = null;
      
      // Стратегия 1: Из window (установлено из main процесса)
      if (typeof window !== 'undefined' && window.__auraUserDataPath) {
        userDataPath = window.__auraUserDataPath;
      }
      
      // Стратегия 2: Из process (установлено из main процесса)
      if (!userDataPath && typeof process !== 'undefined' && process.__auraUserDataPath) {
        userDataPath = process.__auraUserDataPath;
      }
      
      // Стратегия 3: Через Electron API (если доступен)
      if (!userDataPath && typeof window !== 'undefined' && window.require) {
        try {
          const { app } = window.require('electron');
          if (app && typeof app.getPath === 'function') {
            userDataPath = app.getPath('userData');
          }
        } catch (e) {
          // Electron API недоступен
        }
      }
      
      // Стратегия 4: Стандартный путь (fallback)
      if (!userDataPath) {
        const os = typeof window !== 'undefined' && window.require 
          ? window.require('os') 
          : require('os');
        const pathModule = typeof window !== 'undefined' && window.require 
          ? window.require('path') 
          : path;
        const platform = (typeof process !== 'undefined' && process.platform) || os.platform();
        const appName = 'aura';
        
        if (platform === 'win32') {
          userDataPath = pathModule.join(os.homedir(), 'AppData', 'Roaming', appName);
        } else if (platform === 'darwin') {
          userDataPath = pathModule.join(os.homedir(), 'Library', 'Application Support', appName);
        } else {
          userDataPath = pathModule.join(os.homedir(), '.config', appName);
        }
      }
      
      if (!userDataPath) {
        throw new Error('Не удалось определить путь к userData');
      }
      
      const pathModule = typeof window !== 'undefined' && window.require 
        ? window.require('path') 
        : path;
      
      return pathModule.join(userDataPath, 'ambient');
    } catch (e) {
      console.error('[AmbientManager] Ошибка получения пути:', e);
      return null;
    }
  }

  /**
   * Создает папку ambient если её нет
   */
  static ensureAmbientDirectory() {
    try {
      const ambientPath = this.getAmbientPath();
      if (!ambientPath) {
        throw new Error('Не удалось получить путь к папке ambient');
      }

      if (!fs.existsSync(ambientPath)) {
        fs.mkdirSync(ambientPath, { recursive: true });
        console.log('[AmbientManager] Папка ambient создана:', ambientPath);
      }
      return ambientPath;
    } catch (e) {
      console.error('[AmbientManager] Ошибка создания папки ambient:', e);
      throw e;
    }
  }

  /**
   * Сканирует папку ambient и возвращает список аудио файлов (MP3, M4A, OGG, WAV)
   * @returns {Array<string>} Массив имен файлов (без пути)
   */
  static scanAmbientFiles() {
    try {
      if (!fs || !path) {
        console.error('[AmbientManager] Модули fs или path недоступны');
        cachedFiles = [];
        return [];
      }
      
      const ambientPath = this.ensureAmbientDirectory();
      
      if (!fs.existsSync(ambientPath)) {
        console.warn('[AmbientManager] Папка ambient не существует:', ambientPath);
        cachedFiles = [];
        return [];
      }

      const files = fs.readdirSync(ambientPath);
      const audioFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.m4a', '.ogg', '.wav'].includes(ext);
      });

      console.log(`[AmbientManager] Найдено ${audioFiles.length} аудио файлов в папке ambient`);
      cachedFiles = audioFiles;
      return audioFiles;
    } catch (e) {
      console.error('[AmbientManager] Ошибка сканирования файлов:', e);
      cachedFiles = [];
      return [];
    }
  }

  /**
   * Возвращает список файлов, которые еще не используются в БД
   * @param {Function} getDB - Функция для получения экземпляра БД
   * @returns {Array<string>} Массив имен неиспользуемых файлов
   */
  static getAvailableFiles(getDB) {
    try {
      if (!getDB) {
        console.warn('[AmbientManager] getDB не предоставлен');
        return this.scanAmbientFiles();
      }

      const db = typeof getDB === 'function' ? getDB() : getDB;
      if (!db) {
        console.warn('[AmbientManager] БД недоступна');
        return this.scanAmbientFiles();
      }

      // Получаем список всех файлов
      const allFiles = this.scanAmbientFiles();
      
      // Получаем список используемых файлов из БД
      let usedFiles = [];
      try {
        const used = db.db.prepare('SELECT file_name FROM cfg_ambient_music').all();
        usedFiles = used.map(row => row.file_name).filter(Boolean);
      } catch (e) {
        console.warn('[AmbientManager] Ошибка получения используемых файлов:', e);
      }

      // Возвращаем файлы, которые не используются
      const availableFiles = allFiles.filter(file => !usedFiles.includes(file));
      
      console.log(`[AmbientManager] Доступно ${availableFiles.length} неиспользуемых файлов из ${allFiles.length} всего`);
      cachedAvailableFiles = availableFiles;
      return availableFiles;
    } catch (e) {
      console.error('[AmbientManager] Ошибка получения доступных файлов:', e);
      return this.scanAmbientFiles();
    }
  }

  /**
   * Получает путь к папке со стоковыми файлами ambient
   * @returns {string|null} Полный путь к папке ambient-stock или null
   */
  static getStockAmbientPath() {
    try {
      if (!fs || !path) {
        console.error('[AmbientManager] Модули fs или path недоступны');
        return null;
      }

      let appPath = null;
      
      // Стратегия 1: Из window (установлено из main процесса)
      if (typeof window !== 'undefined' && window.__auraAppPath) {
        appPath = window.__auraAppPath;
      }
      
      // Стратегия 2: Из process (установлено из main процесса)
      if (!appPath && typeof process !== 'undefined' && process.__auraAppPath) {
        appPath = process.__auraAppPath;
      }
      
      // Стратегия 3: Через Electron API
      if (!appPath && typeof window !== 'undefined' && window.require) {
        try {
          const { app } = window.require('electron');
          if (app && typeof app.getAppPath === 'function') {
            // В режиме разработки app.getAppPath() возвращает папку проекта
            appPath = app.getAppPath();
          }
        } catch (e) {
          // Electron API недоступен
        }
      }
      
      // Стратегия 4: Через __dirname (если доступен)
      if (!appPath && typeof __dirname !== 'undefined') {
        // От src/utils/AmbientManager.js до корня проекта (public/ambient-stock/)
        appPath = path.join(__dirname, '..', '..', '..');
      }
      
      // Стратегия 5: Относительный путь от текущего файла
      if (!appPath) {
        const pathModule = typeof window !== 'undefined' && window.require 
          ? window.require('path') 
          : path;
        appPath = pathModule.resolve(process.cwd());
      }
      
      if (appPath) {
        const stockPath = path.join(appPath, 'public', 'ambient-stock');
        if (fs.existsSync(stockPath)) {
          return stockPath;
        }
      }
      
      return null;
    } catch (e) {
      console.error('[AmbientManager] Ошибка получения пути к стоковым файлам:', e);
      return null;
    }
  }

  /**
   * Получает полный путь к стоковому файлу по его имени
   * @param {string} fileName - Имя файла
   * @returns {string|null} Полный путь к файлу или null
   */
  static getStockFilePath(fileName) {
    try {
      if (!fs || !path) {
        console.error('[AmbientManager] Модули fs или path недоступны');
        return null;
      }
      
      const stockPath = this.getStockAmbientPath();
      if (!stockPath || !fileName) {
        return null;
      }
      const filePath = path.join(stockPath, fileName);
      
      // Проверяем существование файла
      if (fs.existsSync(filePath)) {
        return filePath;
      }
      return null;
    } catch (e) {
      console.error('[AmbientManager] Ошибка получения пути к стоковому файлу:', e);
      return null;
    }
  }

  /**
   * Получает полный путь к файлу по его имени
   * Сначала проверяет стоковые файлы, потом пользовательские
   * @param {string} fileName - Имя файла
   * @returns {string|null} Полный путь к файлу или null
   */
  static getFilePath(fileName) {
    try {
      if (!fs || !path) {
        console.error('[AmbientManager] Модули fs или path недоступны');
        return null;
      }
      
      if (!fileName) {
        return null;
      }
      
      // Сначала проверяем стоковые файлы
      const stockFilePath = this.getStockFilePath(fileName);
      if (stockFilePath) {
        return stockFilePath;
      }
      
      // Если стокового файла нет, проверяем пользовательские
      const ambientPath = this.getAmbientPath();
      if (!ambientPath) {
        return null;
      }
      const filePath = path.join(ambientPath, fileName);
      
      // Проверяем существование файла
      if (fs.existsSync(filePath)) {
        return filePath;
      }
      return null;
    } catch (e) {
      console.error('[AmbientManager] Ошибка получения пути к файлу:', e);
      return null;
    }
  }

  /**
   * Проверяет существование файла
   * @param {string} fileName - Имя файла
   * @returns {boolean} true если файл существует
   */
  static fileExists(fileName) {
    const filePath = this.getFilePath(fileName);
    return filePath !== null;
  }

  /**
   * Импортирует пользовательский аудиофайл в папку ambient.
   * Возвращает имя файла, под которым он сохранен.
   * @param {string} sourcePath
   * @returns {string}
   */
  static importAmbientFile(sourcePath) {
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new Error('Путь к файлу не указан');
    }
    if (!fs || !path) {
      throw new Error('Файловая система недоступна');
    }

    const ext = path.extname(sourcePath).toLowerCase();
    const allowed = ['.mp3', '.m4a', '.ogg', '.wav'];
    if (!allowed.includes(ext)) {
      throw new Error('Поддерживаются только MP3, M4A, OGG и WAV');
    }
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Файл не найден');
    }

    const ambientPath = this.ensureAmbientDirectory();
    const originalName = path.basename(sourcePath);
    const parsed = path.parse(originalName);
    let targetName = originalName;
    let targetPath = path.join(ambientPath, targetName);
    let i = 1;

    while (fs.existsSync(targetPath)) {
      targetName = `${parsed.name}-${i}${parsed.ext}`;
      targetPath = path.join(ambientPath, targetName);
      i += 1;
    }

    fs.copyFileSync(sourcePath, targetPath);
    this.resetCache();
    this.scanAmbientFiles();
    return targetName;
  }

  /**
   * Сбрасывает кэш (для тестирования или принудительного обновления)
   */
  static resetCache() {
    cachedFiles = null;
    cachedAvailableFiles = null;
  }
}

// CommonJS (main process и require); для renderer — dynamic import даёт default из module.exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbientManager;
}
