import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import {
  DEFAULT_NAV_ORDER,
  type PageId,
} from '@/shared/config/nav-model';
import { parseNavOrderFromSettings } from '@/shared/lib/nav-order';

/**
 * Читает порядок нижнего меню из SQLite (`bottom_nav_pages_order`).
 */
export async function loadNavOrderFromDb(): Promise<PageId[]> {
  await waitForAuraDatabase();
  const getDB = window.getDB;
  if (typeof getDB !== 'function') {
    return [...DEFAULT_NAV_ORDER];
  }
  const db = getDB();
  if (!db || typeof db.getAppSettings !== 'function') {
    return [...DEFAULT_NAV_ORDER];
  }
  const settings = db.getAppSettings() as Record<string, unknown> | null;
  const parsed = parseNavOrderFromSettings(settings?.bottom_nav_pages_order);
  return parsed ?? [...DEFAULT_NAV_ORDER];
}
