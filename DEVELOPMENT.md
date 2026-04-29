# Разработка AURA

## Быстрый старт

### Первый запуск
```bash
npm run setup
npm run desktop
```

Скрипт `setup` автоматически:
- ✅ Установит все зависимости проекта
- ✅ Установит зависимости мини-приложения
- ✅ Пересоберёт native модули для Electron
- ✅ Освободит занятые порты (8787, 5173)

### Последующие запуски
```bash
npm run desktop
```

Команда автоматически очищает занятые порты и запускает:
1. **Mini-app сервер** на `http://127.0.0.1:8787`
2. **Vite dev сервер** на `http://127.0.0.1:5173`
3. **Electron приложение** (desktop версия)

## Доступные команды

| Команда | Описание |
|---------|---------|
| `npm run desktop` | Запуск полной десктопной версии |
| `npm run setup` | Полная инициализация проекта |
| `npm run build` | Сборка без установщика |
| `npm run build:mac` | Создание DMG установщика для macOS |
| `npm run clear-db` | Очистка локальной базы данных |
| `npm run rebuild-native` | Пересборка native модулей для Electron |

## Архитектура

```
AURA/
├── src/                      # React компоненты и логика
├── server-mini-app/          # Node.js сервер (Express)
│   ├── index.js             # Точка входа сервера
│   └── package.json         # Зависимости сервера
├── main.js                   # Electron main процесс
└── vite.config.js           # Конфигурация Vite
```

## Порты

- **8787** - Mini-app сервер (Express)
- **5173** - Vite dev сервер (HMR, assets)

Если порты занят, скрипт автоматически их очистит.

## Устранение проблем

### Порты заняты
Скрипты автоматически очищают порты. Если проблема сохраняется:
```bash
npm run setup  # Полная переинициализация
```

### Ошибки с native модулями
Если видишь ошибки типа "NODE_MODULE_VERSION", запусти:
```bash
npm run rebuild-native
```

### База данных повреждена
```bash
npm run clear-db
npm run desktop
```

## Структура проекта

- **renderer/** - React приложение (Vite)
- **server-mini-app/** - Backend сервер (Express)
- **src/** - Общий код
  - `system/database/` - SQLite работа
  - `system/` - Системные утилиты
- **scripts/** - Вспомогательные скрипты
  - `setup.js` - Инициализация проекта
  - `cleanup-ports.js` - Очистка портов
