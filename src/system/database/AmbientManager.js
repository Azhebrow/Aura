/**
 * Менеджер для управления ambient-аудио файлами.
 * Нужен только runtime-слою базы данных, поэтому держим его рядом с DB.
 */

const path = require('path');
const fs = require('fs');

let cachedFiles = null;
let cachedAvailableFiles = null;

class AmbientManager {
  static getAmbientPath() {
    try {
      let userDataPath = null;

      if (typeof window !== 'undefined' && window.__auraUserDataPath) {
        userDataPath = window.__auraUserDataPath;
      }

      if (!userDataPath && typeof process !== 'undefined' && process.__auraUserDataPath) {
        userDataPath = process.__auraUserDataPath;
      }

      if (!userDataPath && typeof window !== 'undefined' && window.require) {
        try {
          const { app } = window.require('electron');
          if (app && typeof app.getPath === 'function') {
            userDataPath = app.getPath('userData');
          }
        } catch {
          /* ignore */
        }
      }

      if (!userDataPath) {
        const os = typeof window !== 'undefined' && window.require ? window.require('os') : require('os');
        const pathModule = typeof window !== 'undefined' && window.require ? window.require('path') : path;
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

      const pathModule = typeof window !== 'undefined' && window.require ? window.require('path') : path;
      return pathModule.join(userDataPath, 'ambient');
    } catch (error) {
      console.error('[AmbientManager] Ошибка получения пути:', error);
      return null;
    }
  }

  static ensureAmbientDirectory() {
    const ambientPath = this.getAmbientPath();
    if (!ambientPath) {
      throw new Error('Не удалось получить путь к папке ambient');
    }

    if (!fs.existsSync(ambientPath)) {
      fs.mkdirSync(ambientPath, { recursive: true });
      console.log('[AmbientManager] Папка ambient создана:', ambientPath);
    }

    return ambientPath;
  }

  static scanAmbientFiles() {
    try {
      const ambientPath = this.ensureAmbientDirectory();

      if (!fs.existsSync(ambientPath)) {
        cachedFiles = [];
        return [];
      }

      const files = fs.readdirSync(ambientPath);
      const audioFiles = files.filter((file) => ['.mp3', '.m4a', '.ogg', '.wav'].includes(path.extname(file).toLowerCase()));
      cachedFiles = audioFiles;
      return audioFiles;
    } catch (error) {
      console.error('[AmbientManager] Ошибка сканирования файлов:', error);
      cachedFiles = [];
      return [];
    }
  }

  static getAvailableFiles(getDB) {
    try {
      if (!getDB) return this.scanAmbientFiles();

      const db = typeof getDB === 'function' ? getDB() : getDB;
      if (!db) return this.scanAmbientFiles();

      const allFiles = this.scanAmbientFiles();
      let usedFiles = [];

      try {
        const used = db.db.prepare('SELECT file_name FROM cfg_ambient_music').all();
        usedFiles = used.map((row) => row.file_name).filter(Boolean);
      } catch (error) {
        console.warn('[AmbientManager] Ошибка получения используемых файлов:', error);
      }

      const availableFiles = allFiles.filter((file) => !usedFiles.includes(file));
      cachedAvailableFiles = availableFiles;
      return availableFiles;
    } catch (error) {
      console.error('[AmbientManager] Ошибка получения доступных файлов:', error);
      return this.scanAmbientFiles();
    }
  }

  static getStockAmbientPath() {
    try {
      let appPath = null;

      if (typeof window !== 'undefined' && window.__auraAppPath) {
        appPath = window.__auraAppPath;
      }

      if (!appPath && typeof process !== 'undefined' && process.__auraAppPath) {
        appPath = process.__auraAppPath;
      }

      if (!appPath && typeof window !== 'undefined' && window.require) {
        try {
          const { app } = window.require('electron');
          if (app && typeof app.getAppPath === 'function') {
            appPath = app.getAppPath();
          }
        } catch {
          /* ignore */
        }
      }

      if (!appPath) {
        return null;
      }

      const pathModule = typeof window !== 'undefined' && window.require ? window.require('path') : path;
      return pathModule.join(appPath, 'public', 'ambient-stock');
    } catch (error) {
      console.error('[AmbientManager] Ошибка получения stock ambient пути:', error);
      return null;
    }
  }
}

module.exports = AmbientManager;
