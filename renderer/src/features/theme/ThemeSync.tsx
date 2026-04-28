import { useEffect } from 'react';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import { isAuraAccentPreset } from '@/features/theme/theme-constants';
import { useAuraTheme } from '@/features/theme/ThemeContext';

/**
 * После загрузки БД подтягивает пресет акцента из SQLite в контекст.
 */
export function ThemeSync() {
  const { setAccentPreset } = useAuraTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await waitForAuraDatabase();
        if (cancelled) return;
        const getDB = window.getDB;
        if (typeof getDB !== 'function') return;
        const db = getDB();
        if (!db) return;
        const settings = db.getAppSettings();
        const ap = settings && typeof settings.accent_preset === 'string' ? settings.accent_preset : null;
        if (ap && isAuraAccentPreset(ap)) {
          setAccentPreset(ap);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAccentPreset]);

  return null;
}
