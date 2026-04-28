const fs = require('fs');
const path = require('path');

class BackupService {
  constructor(db) {
    this.db = db;
    this.backupIntervalDays = 2; // Каждые 2 дня
    this.backupsDirectory = null;
    this.initBackupsDirectory();
  }

  /**
   * Инициализация директории для бэкапов
   */
  initBackupsDirectory() {
    try {
      const userDataPath = this.getUserDataPath();
      this.backupsDirectory = path.join(userDataPath, 'backups');
      
      // Создаем директорию, если её нет
      if (!fs.existsSync(this.backupsDirectory)) {
        fs.mkdirSync(this.backupsDirectory, { recursive: true });
        console.log('[BackupService] Создана директория для бэкапов:', this.backupsDirectory);
      }
    } catch (error) {
      console.error('[BackupService] Ошибка инициализации директории бэкапов:', error);
    }
  }

  /**
   * Получить путь к userData
   */
  getUserDataPath() {
    if (typeof window !== 'undefined' && window.__auraUserDataPath) {
      return window.__auraUserDataPath;
    }
    
    if (typeof process !== 'undefined' && process.__auraUserDataPath) {
      return process.__auraUserDataPath;
    }
    
    // Fallback для main процесса
    if (typeof require !== 'undefined') {
      try {
        const { app } = require('electron');
        return app.getPath('userData');
      } catch (e) {
        // Не в Electron окружении
      }
    }
    
    throw new Error('Не удалось определить путь к userData');
  }

  /**
   * Проверить, нужно ли создать бэкап (каждые 2 дня)
   */
  shouldCreateBackup() {
    try {
      if (!this.db || !this.db.db) {
        return false;
      }

      // Получаем последний бэкап из истории
      const lastBackup = this.getLastBackup();
      
      if (!lastBackup) {
        // Если бэкапов нет, создаем первый
        return true;
      }

      // Проверяем, прошло ли 2 дня с последнего бэкапа
      const lastBackupDate = new Date(lastBackup.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now - lastBackupDate) / (1000 * 60 * 60 * 24));
      
      return daysDiff >= this.backupIntervalDays;
    } catch (error) {
      console.error('[BackupService] Ошибка проверки необходимости бэкапа:', error);
      return false;
    }
  }

  /**
   * Создать бэкап базы данных
   */
  async createBackup() {
    try {
      if (!this.db || !this.db.dbPath) {
        throw new Error('База данных недоступна');
      }

      if (!fs.existsSync(this.db.dbPath)) {
        throw new Error('Файл базы данных не найден');
      }

      // Генерируем имя файла с датой и временем
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const fileName = `aura-backup-${dateStr}-${timeStr}.db`;
      const backupPath = path.join(this.backupsDirectory, fileName);

      // Копируем основной файл БД
      fs.copyFileSync(this.db.dbPath, backupPath);

      // Копируем WAL и SHM файлы, если они существуют
      const walPath = this.db.dbPath + '-wal';
      const shmPath = this.db.dbPath + '-shm';
      
      if (fs.existsSync(walPath)) {
        try {
          fs.copyFileSync(walPath, backupPath + '-wal');
        } catch (e) {
          console.warn('[BackupService] Не удалось скопировать WAL файл:', e);
        }
      }
      
      if (fs.existsSync(shmPath)) {
        try {
          fs.copyFileSync(shmPath, backupPath + '-shm');
        } catch (e) {
          console.warn('[BackupService] Не удалось скопировать SHM файл:', e);
        }
      }

      // Получаем размер файла
      const stats = fs.statSync(backupPath);
      const fileSize = stats.size;

      // Сохраняем информацию о бэкапе в БД
      const backupId = `backup_${Date.now()}`;
      this.saveBackupHistory({
        id: backupId,
        file_name: fileName,
        file_path: backupPath,
        file_size: fileSize,
        created_at: now.toISOString()
      });

      console.log('[BackupService] ✅ Бэкап создан:', backupPath);
      return {
        id: backupId,
        file_name: fileName,
        file_path: backupPath,
        file_size: fileSize,
        created_at: now.toISOString()
      };
    } catch (error) {
      console.error('[BackupService] Ошибка создания бэкапа:', error);
      throw error;
    }
  }

  /**
   * Сохранить историю бэкапа в БД
   */
  saveBackupHistory(backup) {
    try {
      if (!this.db || !this.db.db) {
        return;
      }

      // Проверяем существование таблицы
      const tableExists = this.db.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='backup_history'
      `).get();

      if (!tableExists) {
        // Создаем таблицу, если её нет
        this.db.db.exec(`
          CREATE TABLE IF NOT EXISTS backup_history (
            id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            created_at DATETIME NOT NULL
          )
        `);
        this.db.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_backup_history_created_at 
          ON backup_history(created_at DESC)
        `);
      }

      // Сохраняем бэкап
      const stmt = this.db.db.prepare(`
        INSERT OR REPLACE INTO backup_history 
        (id, file_name, file_path, file_size, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        backup.id,
        backup.file_name,
        backup.file_path,
        backup.file_size,
        backup.created_at
      );
    } catch (error) {
      console.error('[BackupService] Ошибка сохранения истории бэкапа:', error);
    }
  }

  /**
   * Получить последний бэкап
   */
  getLastBackup() {
    try {
      if (!this.db || !this.db.db) {
        return null;
      }

      const tableExists = this.db.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='backup_history'
      `).get();

      if (!tableExists) {
        return null;
      }

      const backup = this.db.db.prepare(`
        SELECT * FROM backup_history 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get();

      return backup || null;
    } catch (error) {
      console.error('[BackupService] Ошибка получения последнего бэкапа:', error);
      return null;
    }
  }

  /**
   * Получить всю историю бэкапов
   */
  getBackupHistory(limit = 50) {
    try {
      if (!this.db || !this.db.db) {
        return [];
      }

      const tableExists = this.db.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='backup_history'
      `).get();

      if (!tableExists) {
        return [];
      }

      const backups = this.db.db.prepare(`
        SELECT * FROM backup_history 
        ORDER BY created_at DESC 
        LIMIT ?
      `).all(limit);

      return backups || [];
    } catch (error) {
      console.error('[BackupService] Ошибка получения истории бэкапов:', error);
      return [];
    }
  }

  /**
   * Восстановить базу данных из бэкапа
   */
  async restoreFromBackup(backupId) {
    try {
      if (!this.db || !this.db.db) {
        throw new Error('База данных недоступна');
      }

      // Получаем информацию о бэкапе
      const backup = this.db.db.prepare(`
        SELECT * FROM backup_history WHERE id = ?
      `).get(backupId);

      if (!backup) {
        throw new Error('Бэкап не найден');
      }

      // Проверяем существование файла бэкапа
      if (!fs.existsSync(backup.file_path)) {
        throw new Error('Файл бэкапа не найден');
      }

      // Создаем резервную копию текущей БД перед восстановлением
      const currentBackupPath = this.db.dbPath + '.pre-restore.' + Date.now();
      if (fs.existsSync(this.db.dbPath)) {
        fs.copyFileSync(this.db.dbPath, currentBackupPath);
        console.log('[BackupService] Создана резервная копия перед восстановлением:', currentBackupPath);
      }

      // Закрываем текущее соединение
      if (this.db.db && this.db.db.open) {
        this.db.db.close();
      }

      // Копируем файл бэкапа
      fs.copyFileSync(backup.file_path, this.db.dbPath);

      // Копируем WAL и SHM файлы, если они существуют
      const walBackupPath = backup.file_path + '-wal';
      const shmBackupPath = backup.file_path + '-shm';
      const walPath = this.db.dbPath + '-wal';
      const shmPath = this.db.dbPath + '-shm';

      if (fs.existsSync(walBackupPath)) {
        try {
          fs.copyFileSync(walBackupPath, walPath);
        } catch (e) {
          console.warn('[BackupService] Не удалось скопировать WAL файл:', e);
        }
      }

      if (fs.existsSync(shmBackupPath)) {
        try {
          fs.copyFileSync(shmBackupPath, shmPath);
        } catch (e) {
          console.warn('[BackupService] Не удалось скопировать SHM файл:', e);
        }
      }

      console.log('[BackupService] ✅ База данных восстановлена из бэкапа:', backup.file_name);
      return true;
    } catch (error) {
      console.error('[BackupService] Ошибка восстановления из бэкапа:', error);
      throw error;
    }
  }

  /**
   * Удалить бэкап
   */
  async deleteBackup(backupId) {
    try {
      if (!this.db || !this.db.db) {
        throw new Error('База данных недоступна');
      }

      // Получаем информацию о бэкапе
      const backup = this.db.db.prepare(`
        SELECT * FROM backup_history WHERE id = ?
      `).get(backupId);

      if (!backup) {
        throw new Error('Бэкап не найден');
      }

      // Удаляем файл бэкапа
      if (fs.existsSync(backup.file_path)) {
        fs.unlinkSync(backup.file_path);
        
        // Удаляем WAL и SHM файлы, если они существуют
        const walPath = backup.file_path + '-wal';
        const shmPath = backup.file_path + '-shm';
        
        if (fs.existsSync(walPath)) {
          try {
            fs.unlinkSync(walPath);
          } catch (e) {
            console.warn('[BackupService] Не удалось удалить WAL файл:', e);
          }
        }
        
        if (fs.existsSync(shmPath)) {
          try {
            fs.unlinkSync(shmPath);
          } catch (e) {
            console.warn('[BackupService] Не удалось удалить SHM файл:', e);
          }
        }
      }

      // Удаляем запись из истории
      this.db.db.prepare(`DELETE FROM backup_history WHERE id = ?`).run(backupId);

      console.log('[BackupService] ✅ Бэкап удален:', backup.file_name);
      return true;
    } catch (error) {
      console.error('[BackupService] Ошибка удаления бэкапа:', error);
      throw error;
    }
  }

  /**
   * Очистить старые бэкапы (оставить только последние N)
   */
  async cleanupOldBackups(keepCount = 10) {
    try {
      if (!this.db || !this.db.db) {
        return;
      }

      const backups = this.getBackupHistory(1000); // Получаем все бэкапы
      
      if (backups.length <= keepCount) {
        return; // Нечего удалять
      }

      // Удаляем старые бэкапы
      const backupsToDelete = backups.slice(keepCount);
      
      for (const backup of backupsToDelete) {
        try {
          await this.deleteBackup(backup.id);
        } catch (e) {
          console.warn('[BackupService] Не удалось удалить старый бэкап:', backup.id, e);
        }
      }

      console.log(`[BackupService] ✅ Удалено старых бэкапов: ${backupsToDelete.length}`);
    } catch (error) {
      console.error('[BackupService] Ошибка очистки старых бэкапов:', error);
    }
  }

  /**
   * Форматировать размер файла
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = BackupService;
