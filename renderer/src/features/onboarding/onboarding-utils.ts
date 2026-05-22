// ─── Onboarding Utils ─────────────────────────────────────────────────────────
// Вспомогательные функции: работа с файловой системой (ambient),
// применение пресетов к базе данных при завершении онбординга.

import type { AuraDatabase } from '@/types/aura';
import { PRESET_GROUPS, type PresetGroupKey } from './onboarding-config';

// ─── Node.js bridge ───────────────────────────────────────────────────────────

/** Безопасно возвращает require из Electron-контекста */
export function getNodeRequire() {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function') {
    return (globalThis as { require: (id: string) => unknown }).require;
  }
  if (typeof require === 'function') return require;
  return null;
}

// ─── Ambient file system ──────────────────────────────────────────────────────

const AMBIENT_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);

/**
 * Определяет путь к папке ambient-музыки.
 * Приоритет: userData/ambient → appPath/public/ambient-stock.
 * Создаёт папку, если не существует.
 */
export function resolveAmbientFolderPath(): string | null {
  const req = getNodeRequire();
  if (!req) return null;
  try {
    const fs = req('fs') as { existsSync: (p: string) => boolean; mkdirSync: (p: string, opts?: { recursive?: boolean }) => void };
    const path = req('path') as { join: (...parts: string[]) => string };
    const userDataPath = window.__auraUserDataPath;
    const appPath = window.__auraAppPath;
    if (userDataPath) {
      const ambientDir = path.join(userDataPath, 'ambient');
      if (!fs.existsSync(ambientDir)) fs.mkdirSync(ambientDir, { recursive: true });
      return ambientDir;
    }
    if (appPath) return path.join(appPath, 'public', 'ambient-stock');
  } catch {
    return null;
  }
  return null;
}

/**
 * Читает список аудиофайлов в папке ambient,
 * отфильтровывая нераспознанные расширения.
 */
export function readAmbientFiles(folderPath: string): string[] {
  const req = getNodeRequire();
  if (!req) return [];
  try {
    const fs = req('fs') as { readdirSync: (p: string, opts?: { withFileTypes?: boolean }) => Array<{ isFile: () => boolean; name: string }> };
    const path = req('path') as { extname: (p: string) => string };
    return fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => AMBIENT_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  } catch {
    return [];
  }
}

/** Нормализует имя файла для дедупликации при сравнении */
export function ambientKey(fileName: string) {
  return fileName.trim().toLowerCase();
}

// ─── Preset application ───────────────────────────────────────────────────────

/**
 * Удаляет из БД все строки групп, от которых пользователь отказался.
 * Вызывается один раз при завершении онбординга.
 */
export function applyPresetChoices(db: AuraDatabase, presets: Record<PresetGroupKey, boolean>) {
  for (const group of PRESET_GROUPS) {
    if (presets[group.key]) continue; // оставить
    for (const table of group.tables) {
      const rows = db.getAll?.(table) ?? [];
      for (const row of rows) {
        if (row.id != null) db.delete(table, String(row.id));
      }
    }
  }
}
