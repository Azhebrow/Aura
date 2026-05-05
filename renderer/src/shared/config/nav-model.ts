/**
 * Модель навигации нового renderer — зеркалит смысл legacy
 * `src/system/services/NavOrderConfigService.js` (PAGE_META + порядок страниц).
 * Порядок из БД (`bottom_nav_pages_order`) подключим отдельным слоем; пока — канонический дефолт.
 */

export const DEFAULT_NAV_ORDER = [
  'home',
  'rituals',
  'diary',
  'timer',
  'stats',
  'ranks',
  'calendar',
  'settings',
] as const;

export type PageId = (typeof DEFAULT_NAV_ORDER)[number];

export type NavPageDefinition = {
  id: PageId;
};

export const NAV_PAGE_DEFINITIONS: Record<PageId, NavPageDefinition> = {
  home: { id: 'home' },
  rituals: { id: 'rituals' },
  diary: { id: 'diary' },
  timer: { id: 'timer' },
  stats: { id: 'stats' },
  ranks: { id: 'ranks' },
  calendar: { id: 'calendar' },
  settings: { id: 'settings' },
};

export function getNavPageIds(order: readonly PageId[] = DEFAULT_NAV_ORDER): PageId[] {
  return order.map((id) => id);
}

// For components to get translated labels, use useTranslation hook:
// const { t } = useTranslation('nav');
// const label = t(pageId); // e.g., t('home') → "Home" / "Домашняя"
