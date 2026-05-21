type IconGroupsMap = Record<string, string[]>;

export type IconsManifest = {
  icons: string[];
  groups: string[];
  groupsMap: IconGroupsMap;
};

/** Кэш манифеста и групп из `public/icons`. */
let cached: IconsManifest | null = null;
let inflight: Promise<IconsManifest> | null = null;
let warmScheduled = false;
const ICONS_MANIFEST_CACHE_KEY = 'aura-icons-manifest-cache-v2';
const ICONS_MANIFEST_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type CachedIconsManifest = {
  savedAt: number;
  data: IconsManifest;
};

function getIconsPrefix() {
  return `${getAppBaseUrl()}icons`;
}

function isValidManifest(value: unknown): value is IconsManifest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<IconsManifest>;
  if (!Array.isArray(v.icons) || !Array.isArray(v.groups)) return false;
  if (!v.groupsMap || typeof v.groupsMap !== 'object') return false;
  return true;
}

function readCachedManifest(): IconsManifest | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ICONS_MANIFEST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedIconsManifest;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > ICONS_MANIFEST_CACHE_TTL_MS) return null;
    if (!isValidManifest(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedManifest(data: IconsManifest) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedIconsManifest = { savedAt: Date.now(), data };
    window.localStorage.setItem(ICONS_MANIFEST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* cache is best-effort */
  }
}

function buildFallbackManifest(icons: string[]): IconsManifest {
  const groupsMap: IconGroupsMap = {};
  for (const iconName of icons) groupsMap[iconName] = ['general'];
  return { icons, groups: ['general'], groupsMap };
}

export async function loadIconsManifest(): Promise<IconsManifest> {
  if (cached) return cached;
  const fromStorage = readCachedManifest();
  if (fromStorage) {
    cached = fromStorage;
    return cached;
  }
  if (!inflight) {
    const prefix = getIconsPrefix();
    inflight = fetch(`${prefix}/icons-manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`icons-manifest.json: ${r.status}`);
        return r.json() as Promise<IconsManifest>;
      })
      .then(async (data) => {
        if (!isValidManifest(data)) throw new Error('invalid icons-manifest payload');
        const icons = data.icons.map(String).sort((a, b) => a.localeCompare(b, 'en'));
        const groupsMap: IconGroupsMap = {};
        for (const icon of icons) {
          const value = data.groupsMap[icon];
          groupsMap[icon] = Array.isArray(value) ? value.map(String).filter(Boolean) : ['general'];
        }
        const groups = [...new Set(Object.values(groupsMap).flat())].sort((a, b) => a.localeCompare(b, 'ru'));
        cached = { icons, groups, groupsMap };
        writeCachedManifest(cached);
        return cached;
      })
      .catch(async () => {
        const fallback = await fetch(`${prefix}/icons.json`)
          .then((r) => {
            if (!r.ok) throw new Error(`icons.json: ${r.status}`);
            return r.json() as Promise<{ icons?: string[] }>;
          })
          .then((data) => {
            const icons = Array.isArray(data.icons) ? data.icons.map(String).sort((a, b) => a.localeCompare(b, 'en')) : [];
            return buildFallbackManifest(icons);
          });
        cached = fallback;
        writeCachedManifest(cached);
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Ненавязчивый прогрев каталога иконок после старта приложения.
 * Запускается в idle и пропускается при save-data.
 */
export function warmIconsManifest() {
  if (cached || inflight || warmScheduled) return;
  if (typeof window === 'undefined') return;
  warmScheduled = true;
  const run = () => {
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    if (saveData) return;
    void loadIconsManifest().catch(() => {
      /* silent warmup fail */
    });
  };
  // Запускаем через короткий таймаут чтобы не блокировать первый paint,
  // но манифест был готов задолго до открытия диалога иконок.
  const timeout = globalThis.setTimeout(run, 300);
  void timeout;
}

export function clearIconsManifestCache() {
  cached = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ICONS_MANIFEST_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
}
import { getAppBaseUrl } from '@/shared/lib/base-url';
