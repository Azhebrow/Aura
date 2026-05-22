export const AMBIENT_MUSIC_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);
export const AMBIENT_MUSIC_DEFAULT_ICON = 'music-2';

function getNodeRequire() {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function') {
    return (globalThis as { require: (id: string) => unknown }).require;
  }
  if (typeof require === 'function') return require;
  return null;
}

export function resolveAmbientMusicFolderPath(): string | null {
  const req = getNodeRequire();
  if (!req) return null;
  try {
    const fs = req('fs') as {
      existsSync: (path: string) => boolean;
      mkdirSync: (path: string, opts?: { recursive?: boolean }) => void;
    };
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

export function readAmbientMusicFileNames(folderPath: string): string[] {
  const req = getNodeRequire();
  if (!req) return [];
  try {
    const fs = req('fs') as {
      readdirSync: (path: string, opts?: { withFileTypes?: boolean }) => Array<{ isFile: () => boolean; name: string }>;
    };
    const path = req('path') as { extname: (path: string) => string };
    return fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => AMBIENT_MUSIC_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  } catch {
    return [];
  }
}

export function ambientMusicImportKey(fileName: string): string {
  return fileName.trim().toLowerCase();
}
