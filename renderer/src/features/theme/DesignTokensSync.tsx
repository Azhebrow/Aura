import { useEffect } from 'react';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import {
  applyFinanceSemanticCssVars,
  applyTaskCategoryCssVarsFromSettings,
} from '@/shared/design/aura-palette';
import { useAuraDb } from '@/shared/hooks/use-aura-db';

/**
 * Подтягивает цвета категорий задач из SQLite (`task_categories_config`) в CSS-переменные,
 * как legacy `TaskCategoriesConfigService._applyColorsToCSS`.
 */
export function DesignTokensSync() {
  const { db } = useAuraDb();

  useEffect(() => {
    applyFinanceSemanticCssVars();
  }, []);

  const apply = () => {
    const getDB = window.getDB;
    if (typeof getDB !== 'function') {
      applyTaskCategoryCssVarsFromSettings(null);
      return;
    }
    const instance = getDB();
    if (!instance) {
      applyTaskCategoryCssVarsFromSettings(null);
      return;
    }
    applyTaskCategoryCssVarsFromSettings(instance.getAppSettings() as Record<string, unknown> | null);
  };

  useEffect(() => {
    apply();
  }, [db]);

  useEffect(() => {
    const onDbReady = () => apply();
    const onCfg = () => apply();
    window.addEventListener('aura-db-ready', onDbReady);
    window.addEventListener('task-categories-config-changed', onCfg);
    return () => {
      window.removeEventListener('aura-db-ready', onDbReady);
      window.removeEventListener('task-categories-config-changed', onCfg);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await waitForAuraDatabase();
        if (!cancelled) apply();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
