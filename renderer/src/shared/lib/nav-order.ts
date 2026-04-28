import {
  DEFAULT_NAV_ORDER,
  type PageId,
} from '@/shared/config/nav-model';

const KNOWN_IDS = new Set<PageId>(DEFAULT_NAV_ORDER);

function isPageId(id: unknown): id is PageId {
  return typeof id === 'string' && KNOWN_IDS.has(id as PageId);
}

/**
 * Парсинг `app_settings.bottom_nav_pages_order` — та же семантика, что
 * `NavOrderConfigService._parseOrder` + доп. страницы из дефолта.
 */
export function parseNavOrderFromSettings(raw: unknown): PageId[] | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const seen = new Set<PageId>();
    const ordered: PageId[] = [];
    for (const id of parsed) {
      if (!isPageId(id) || seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    if (ordered.length === 0) return null;
    return mergeNavOrder(ordered);
  } catch {
    return null;
  }
}

/** Добавляет отсутствующие id в конец, как в legacy `getPagesOrder`. */
export function mergeNavOrder(ordered: readonly PageId[]): PageId[] {
  const missing = DEFAULT_NAV_ORDER.filter((id) => !ordered.includes(id));
  return [...ordered, ...missing];
}
