#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🍎 ARM64 Сборка macOS установщика для Apple Silicon...\n');

const root = path.resolve(__dirname, '..');
process.chdir(root);

try {
  // Step 1: Build renderer
  console.log('📦 Сборка renderer...');
  execSync('vite build', { stdio: 'inherit' });

  // Step 2: Build for ARM64
  console.log('\n🔨 Сборка DMG для ARM64...');
  execSync('electron-builder --mac --arm64', { stdio: 'inherit' });

  console.log('\n✅ ARM64 установщик успешно создан!');
  console.log('📁 Установщик находится в папке: dist/');
  console.log('\n💡 Для универсального установщика (Intel + ARM) используйте: npm run build:mac:universal');
} catch (error) {
  console.error('❌ Ошибка сборки:', error.message);
  process.exit(1);
}
