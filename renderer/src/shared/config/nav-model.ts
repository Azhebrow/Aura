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
  'ranks',
  'stats',
  'calendar',
  'settings',
] as const;

export type PageId = (typeof DEFAULT_NAV_ORDER)[number];

export type NavPageDefinition = {
  id: PageId;
  label: string;
};

export const NAV_PAGE_DEFINITIONS: Record<PageId, NavPageDefinition> = {
  home: { id: 'home', label: 'Домашняя' },
  rituals: { id: 'rituals', label: 'Ритуалы' },
  diary: { id: 'diary', label: 'Дневник' },
  timer: { id: 'timer', label: 'Таймер' },
  ranks: { id: 'ranks', label: 'Ранги' },
  stats: { id: 'stats', label: 'Статистика' },
  calendar: { id: 'calendar', label: 'Календарь' },
  settings: { id: 'settings', label: 'Настройки' },
};

export function getNavPagesInOrder(order: readonly PageId[] = DEFAULT_NAV_ORDER): NavPageDefinition[] {
  return order.map((id) => NAV_PAGE_DEFINITIONS[id]);
}
