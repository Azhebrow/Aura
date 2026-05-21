import { useEffect } from 'react';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { applyAppearanceScales, readAppearanceScaleSettings } from '@/features/theme/appearance-scale';
import type { AuraRow } from '@/types/aura';

export function AppearanceScaleSync() {
  const { db } = useAuraDb();

  useEffect(() => {
    if (!db) return;

    const sync = () => {
      const settings = (db.getAppSettings() ?? {}) as AuraRow;
      const { appScale, textScale } = readAppearanceScaleSettings(settings);
      applyAppearanceScales(appScale, textScale);
    };

    sync();
    window.addEventListener('settings-saved', sync);
    return () => window.removeEventListener('settings-saved', sync);
  }, [db]);

  return null;
}
