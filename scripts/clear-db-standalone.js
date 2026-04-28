// Автономный скрипт для очистки базы данных (можно запустить без Electron)
const path = require('path');
const fs = require('fs');
const os = require('os');

// Определяем путь к userData в зависимости от ОС
function getUserDataPath() {
  const appName = 'AURA';
  const platform = process.platform;
  
  if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', appName);
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else {
    return path.join(os.homedir(), '.config', appName);
  }
}

const userDataPath = getUserDataPath();
const dbPath = path.join(userDataPath, 'aura.db');
const dbWalPath = path.join(userDataPath, 'aura.db-wal');
const dbShmPath = path.join(userDataPath, 'aura.db-shm');

console.log('🗑️  Очистка базы данных AURA...');
console.log('Путь к userData:', userDataPath);
console.log('Путь к БД:', dbPath);

// Удаляем файлы базы данных
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Файл базы данных удален:', dbPath);
  } else {
    console.log('ℹ️  Файл базы данных не найден');
  }

  if (fs.existsSync(dbWalPath)) {
    fs.unlinkSync(dbWalPath);
    console.log('✅ WAL файл удален:', dbWalPath);
  }

  if (fs.existsSync(dbShmPath)) {
    fs.unlinkSync(dbShmPath);
    console.log('✅ SHM файл удален:', dbShmPath);
  }

  console.log('✨ База данных успешно очищена!');
  console.log('При следующем запуске приложения будут загружены пресеты.');
} catch (error) {
  console.error('❌ Ошибка при удалении базы данных:', error.message);
  process.exit(1);
}















