import { useEffect } from 'react';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import { isAuraAccentPreset, isAuraThemeMode } from '@/features/theme/theme-constants';
import { useAuraTheme } from '@/features/theme/ThemeContext';

/**
 * После загрузки БД подтягивает пресет акцента из SQLite в контекст.
 */
export function ThemeSync() {
  const { setAccentPreset, setTheme } = useAuraTheme();

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
        const themeMode = settings && typeof settings.theme_mode === 'string' ? settings.theme_mode : null;
        if (themeMode && isAuraThemeMode(themeMode)) {
          setTheme(themeMode);
        }
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
  }, [setAccentPreset, setTheme]);

  return null;
}
