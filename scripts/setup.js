#!/usr/bin/env node

const { execSync } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

const PORTS = {
  server: 8787,
  vite: 5173,
};

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function killPortProcess(port) {
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      execSync(`lsof -i :${port} | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null || true`);
    } else if (process.platform === 'win32') {
      execSync(`netstat -ano | findstr :${port} | findstr LISTENING | awk '{print $5}' | xargs taskkill /PID /F 2>/dev/null || true`);
    }
    console.log(`✓ Освобожден порт ${port}`);
  } catch (err) {
    console.log(`⚠ Не удалось очистить порт ${port}`);
  }
}

async function setup() {
  console.log('🚀 Инициализация AURA...\n');

  // Проверка портов
  console.log('📋 Проверка портов...');
  for (const [name, port] of Object.entries(PORTS)) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      console.log(`⚠ Порт ${port} (${name}) занят. Освобождаю...`);
      await killPortProcess(port);
    } else {
      console.log(`✓ Порт ${port} (${name}) свободен`);
    }
  }

  // Установка зависимостей основного проекта
  console.log('\n📦 Установка зависимостей основного проекта...');
  try {
    execSync('npm install', { cwd: __dirname + '/..', stdio: 'inherit' });
    console.log('✓ Зависимости установлены');
  } catch (err) {
    console.error('✗ Ошибка установки зависимостей');
    process.exit(1);
  }

  // Установка зависимостей server-mini-app
  console.log('\n📦 Установка зависимостей сервера...');
  try {
    execSync('npm install', { cwd: path.join(__dirname, '..', 'server-mini-app'), stdio: 'inherit' });
    console.log('✓ Зависимости сервера установлены');
  } catch (err) {
    console.error('✗ Ошибка установки зависимостей сервера');
    process.exit(1);
  }

  // Пересборка native модулей для Electron
  console.log('\n🔧 Пересборка native модулей для Electron...');
  try {
    execSync('npm run rebuild-native', { cwd: __dirname + '/..', stdio: 'inherit' });
    console.log('✓ Native модули пересобраны');
  } catch (err) {
    console.warn('⚠ Не удалось пересобрать native модули, это может потребоваться позже');
  }

  console.log('\n✨ Готово! Запусти: npm run desktop');
}

setup().catch(err => {
  console.error('Ошибка инициализации:', err);
  process.exit(1);
});
