<h1 align="center">AURA</h1>

<p align="center">
  Offline-first desktop dashboard for daily planning, focus, rituals, diary, nutrition, finance, stats, and ranks.
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-25-47848F?style=for-the-badge&logo=electron&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-local-003B57?style=for-the-badge&logo=sqlite&logoColor=white">
</p>

---

## What Is AURA?

AURA is a personal productivity app built as a local Electron desktop application.

It brings the pieces of a daily operating system into one place: tasks, rituals, focus sessions, diary entries, nutrition, finance, statistics, and a rank/points system. The app is designed around local-first data: your personal information lives in a local SQLite database, not in a cloud service.

## Highlights

- Daily dashboard with plans, tasks, rituals, progress, nutrition, finances, and points.
- Focus timer with task selection, sessions, fullscreen mode, and ambient audio presets.
- Diary with mood, categories, rich text, entries, and nutrition logging.
- Configurable task categories, rituals, goals, accounts, products, presets, and page visibility.
- Statistics for progress, points, time, nutrition, finance, mood, calendar history, and ranks.
- Local SQLite storage with Electron desktop runtime.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Desktop | Electron |
| UI | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Storage | SQLite, better-sqlite3 |
| Charts | ECharts |
| Icons | Lucide, local icon masks |
| i18n | i18next |

## Quick Start

```bash
git clone git@github.com:Azhebrow/Aura.git
cd Aura
npm install
npm run desktop
```

The `postinstall` script also installs `server-mini-app` dependencies and rebuilds native Electron modules.

## Scripts

| Command | Description |
| --- | --- |
| `npm run desktop` | Start the local API, Vite renderer, and Electron app. |
| `npm run web` | Start the local API and Vite renderer without launching Electron. |
| `npm run build` | Build renderer and unpacked Electron app. |
| `npm run build:mac` | Build a macOS installer. |
| `npm run build:mac:arm64` | Build for Apple Silicon. |
| `npm run build:mac:universal` | Build a universal macOS package. |
| `npm run clear-db` | Clear the local app database. |
| `npm run rebuild-native` | Rebuild native Electron dependencies. |

## Project Structure

```text
Aura
├── main.js                 # Electron main process
├── preload.js              # Electron preload bridge
├── renderer/               # React / Vite renderer app
│   └── src/
│       ├── app/            # App shell and startup
│       ├── components/     # Shared UI primitives
│       ├── features/       # Product features
│       ├── pages/          # Top-level app pages
│       ├── shared/         # Hooks, config, bridges, utilities
│       └── widgets/        # Larger UI blocks
├── server-mini-app/        # Local mini app / API server
├── src/system/             # Database and service layer
├── scripts/                # Utility scripts
├── public/                 # Static assets and icons
└── docs/                   # Build notes
```

## Local Data

AURA is local-first. Runtime user data is stored in a local SQLite database through the app's database layer.

Do not commit personal runtime data. Generated folders, build outputs, local tool settings, logs, dependency folders, and runtime files are ignored through `.gitignore`.

## Build Output

Build artifacts are generated into:

- `dist/`
- `renderer-build/`

Both are ignored by Git and can be recreated at any time.

## Status

This repository contains the current working version of a personal desktop app. It is public for visibility and backup, but the project is still actively evolving.
