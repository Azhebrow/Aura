# AURA

AURA is an offline-first desktop productivity app built with Electron, React, TypeScript, Vite, Tailwind CSS, and SQLite.

The app combines daily planning, rituals, timers, diary entries, nutrition tracking, finance tracking, statistics, ranks, and local configuration into one personal dashboard.

## Features

- Daily overview with tasks, rituals, plans, nutrition, finances, and progress.
- Focus timer with sessions, task selection, fullscreen mode, and ambient audio presets.
- Diary with mood, categories, rich text, entries, and nutrition logging.
- Configurable task categories, rituals, goals, finance accounts, nutrition products, and presets.
- Statistics pages for progress, points, time, nutrition, finance, mood, and ranks.
- Local SQLite storage. Data stays on the user's machine.
- Electron desktop app with a Vite renderer.

## Tech Stack

- Electron
- React 19
- TypeScript
- Vite
- Tailwind CSS
- better-sqlite3
- ECharts
- i18next
- Lucide icons

## Requirements

- Node.js 20+ recommended
- npm
- macOS for the packaged desktop build currently used by this repo

## Install

```bash
npm install
```

`postinstall` also installs dependencies for `server-mini-app` and rebuilds native Electron dependencies.

## Run

Desktop development mode:

```bash
npm run desktop
```

Web/renderer development mode:

```bash
npm run web
```

## Build

Renderer plus unpacked Electron build:

```bash
npm run build
```

macOS installer:

```bash
npm run build:mac
```

Apple Silicon build:

```bash
npm run build:mac:arm64
```

Universal macOS build:

```bash
npm run build:mac:universal
```

Build artifacts are written to `dist/` and `renderer-build/`. These folders are ignored by Git.

## Project Structure

```text
.
├── main.js                 # Electron main process
├── preload.js              # Electron preload bridge
├── renderer/               # React/Vite renderer
├── server-mini-app/        # Local mini app/API server
├── src/system/             # Local database and service layer
├── scripts/                # Utility scripts
├── public/                 # Static assets and icons
└── docs/                   # Build notes
```

## Data And Privacy

AURA is designed around local storage. The app database is SQLite-based and lives in the local app data directory at runtime. Personal data should not be committed to this repository.

Generated folders, local tool configuration, logs, runtime files, and dependencies are ignored through `.gitignore`.

## Useful Commands

```bash
npm run clear-db
npm run rebuild-native
```

## Notes

This is a personal productivity app under active development. The public repository reflects the current working version rather than a polished packaged product release.
