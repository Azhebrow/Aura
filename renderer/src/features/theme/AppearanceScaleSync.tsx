import { useEffect } from 'react';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import {
  DEFAULT_APP_SCALE,
  DEFAULT_TEXT_SCALE,
  applyAppearanceScales,
  readAppearanceScaleSettings,
} from '@/features/theme/appearance-scale';
import type { AuraRow } from '@/types/aura';

export function AppearanceScaleSync() {
  const { db } = useAuraDb();

  useEffect(() => {
    if (!db) return;

    const sync = () => {
      try {
        const settings = (db.getAppSettings() ?? {}) as AuraRow;
        const { appScale, textScale } = readAppearanceScaleSettings(settings);
        applyAppearanceScales(appScale, textScale);
      } catch (error) {
        console.warn('[AURA] Failed to sync appearance scale from settings, using defaults.', error);
        applyAppearanceScales(DEFAULT_APP_SCALE, DEFAULT_TEXT_SCALE);
      }
    };

    sync();
    window.addEventListener('settings-saved', sync);
    return () => window.removeEventListener('settings-saved', sync);
  }, [db]);

  return null;
}
