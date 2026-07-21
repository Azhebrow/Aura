import { useEffect } from 'react';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import {
  applyFinanceSemanticCssVars,
  applyTaskCategoryCssVarsFromSettings,
} from '@/shared/config/aura-palette';
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

  const apply = async () => {
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
    try {
      const settings = await instance.getAppSettings();
      applyTaskCategoryCssVarsFromSettings(settings as Record<string, unknown> | null);
    } catch (error) {
      console.warn('[AURA] Failed to sync design tokens from settings, using defaults.', error);
      applyTaskCategoryCssVarsFromSettings(null);
    }
  };

  useEffect(() => {
    void apply();
  }, [db]);

  useEffect(() => {
    const onDbReady = () => void apply();
    const onCfg = () => void apply();
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
        if (!cancelled) void apply();
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
