export const AMBIENT_MUSIC_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);
export const AMBIENT_COVER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
export const AMBIENT_MUSIC_DEFAULT_ICON = 'music-2';

const ambientCoverBlobCache = new Map<string, string>();

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

export function resolveAmbientCoverFolderPath(): string | null {
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
      const coversDir = path.join(userDataPath, 'ambient', 'covers');
      if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });
      return coversDir;
    }
    if (appPath) return path.join(appPath, 'public', 'ambient-stock', 'covers');
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

function coverExtensionFromFile(file: File): string {
  const req = getNodeRequire();
  const fileName = file.name || '';
  if (req && fileName) {
    try {
      const path = req('path') as { extname: (path: string) => string };
      const ext = path.extname(fileName).toLowerCase();
      if (AMBIENT_COVER_EXTENSIONS.has(ext)) return ext;
    } catch { /* ignore */ }
  }
  if (file.type === 'image/jpeg') return '.jpg';
  if (file.type === 'image/png') return '.png';
  if (file.type === 'image/webp') return '.webp';
  if (file.type === 'image/gif') return '.gif';
  return '.png';
}

function ambientCoverMime(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/png';
}

function sanitizeCoverName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/giu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'cover';
}

export async function saveAmbientCoverImageFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const folderPath = resolveAmbientCoverFolderPath();
  const req = getNodeRequire();
  if (!folderPath || !req) return null;
  try {
    const fs = req('fs') as {
      existsSync: (path: string) => boolean;
      writeFileSync: (path: string, data: Uint8Array) => void;
    };
    const path = req('path') as { join: (...parts: string[]) => string };
    const ext = coverExtensionFromFile(file);
    const base = sanitizeCoverName(file.name);
    let fileName = `${base}-${Date.now()}${ext}`;
    let target = path.join(folderPath, fileName);
    let n = 1;
    while (fs.existsSync(target)) {
      fileName = `${base}-${Date.now()}-${n}${ext}`;
      target = path.join(folderPath, fileName);
      n += 1;
    }
    const data = new Uint8Array(await file.arrayBuffer());
    fs.writeFileSync(target, data);
    ambientCoverBlobCache.delete(fileName);
    return fileName;
  } catch {
    return null;
  }
}

export function resolveAmbientCoverImageUrl(value: string): string | null {
  const imageRef = value.trim();
  if (!imageRef) return null;
  if (/^(data:image\/|blob:|https?:\/\/|file:\/\/)/i.test(imageRef)) return imageRef;
  if (ambientCoverBlobCache.has(imageRef)) return ambientCoverBlobCache.get(imageRef)!;

  const req = getNodeRequire();
  if (!req) return imageRef;
  try {
    const fs = req('fs') as {
      existsSync: (path: string) => boolean;
      readFileSync: (path: string) => ArrayBufferView & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
    };
    const path = req('path') as { join: (...parts: string[]) => string };
    const userDataPath = window.__auraUserDataPath;
    const appPath = window.__auraAppPath;
    const candidates: string[] = [];
    if (userDataPath) candidates.push(path.join(userDataPath, 'ambient', 'covers', imageRef));
    if (appPath) candidates.push(path.join(appPath, 'public', 'ambient-stock', 'covers', imageRef));
    const existing = candidates.find((candidate) => fs.existsSync(candidate));
    if (!existing) return imageRef;

    const buf = fs.readFileSync(existing);
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    const url = URL.createObjectURL(new Blob([ab], { type: ambientCoverMime(imageRef) }));
    ambientCoverBlobCache.set(imageRef, url);
    return url;
  } catch {
    return imageRef;
  }
}
