# Создание установщика macOS для ARM

## Быстрый старт

### ARM64 (Apple Silicon - M1/M2/M3)
```bash
npm run build:mac:arm64
```
Создает установщик для компьютеров с Apple Silicon.

### Intel x64
```bash
npm run build:mac
```
Создает установщик для Intel-процессоров.

### Универсальный (Intel + ARM)
```bash
npm run build:mac:universal
```
Один установщик для всех типов Mac.

---

## Подробное описание

### 1. Только ARM64 (Рекомендуется для М-серии)
Для MacBook Pro/Air с M1, M2, M3:
```bash
npm run build:mac:arm64
```
- Выход: `Aura-1.1.0-arm64.dmg`
- Размер: ~200MB
- Максимальная производительность на Apple Silicon

### 2. Только x64 (для Intel Mac)
Для старых MacBook с Intel:
```bash
npm run build:mac
```
- Выход: `Aura-1.1.0.dmg`
- Размер: ~200MB

### 3. Универсальный (обе архитектуры)
Один установщик работает на Intel и Apple Silicon:
```bash
npm run build:mac:universal
```
- Выход: `Aura-1.1.0.dmg`
- Размер: ~400MB (содержит обе версии)

---

## Что было сделано

### 1. Конфигурация package.json
✅ Добавлены новые скрипты:
- `build:mac:arm64` — для Apple Silicon
- `build:mac:universal` — для обоих типов
  
✅ Обновлена конфигурация macOS:
- Поддержка ARM64 архитектуры
- Добавлен ZIP формат для ARM
- Настройки подписей и полномочий

### 2. Файл entitlements.mac.plist
✅ Создан файл полномочий для правильной работы:
- Разрешение на файловый доступ
- Поддержка сетевых соединений
- JIT компиляция для JavaScript

### 3. Build скрипт
✅ Создан `scripts/build-mac-arm64.js` для удобной сборки

### 4. Документация
✅ Полный гайд на английском: `docs/BUILD_MAC.md`
✅ Этот гайд на русском: `docs/BUILD_MAC_RU.md`

---

## Как использовать

### Для локальной разработки на ARM Mac
```bash
npm run build:mac:arm64
# Установщик создается в папке dist/
```

### Для отправки друзьям/пользователям
```bash
npm run build:mac:universal
# Один файл работает на любом Mac
```

### Требования
- **macOS** 10.13 или новее
- **Node.js** 18+
- **Xcode Command Line Tools** (установить: `xcode-select --install`)

---

## Результаты сборки

После успешной сборки в папке `dist/` будут:
```
Aura-1.1.0-arm64.dmg     # DMG установщик для ARM
Aura-1.1.0-arm64.zip     # ZIP архив (портативная версия)
```

---

## Решение проблем

### Ошибка при сборке
```bash
npm install
npm run rebuild-native
npm run build:mac:arm64
```

### better-sqlite3 ошибка
```bash
npm run rebuild-native
```

---

## Готово! 🎉
Установщик готов к использованию. Пользователи могут:
1. Скачать DMG файл
2. Открыть его (двойной клик)
3. Перетащить Aura в папку Applications
4. Запустить из Applications
