import { useCallback, useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  getHomeTaskDisplaySettings,
  TASKS_HIDE_COMPLETION_PERCENT_FIELD,
} from '@/shared/config/home-task-display';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

export function HomeTaskDisplaySettingsCard() {
  const { db, ready } = useAuraDb();
  const [showPercentBadges, setShowPercentBadges] = useState(true);

  const reload = useCallback(() => {
    if (!db) return;
    const settings = db.getAppSettings() as AuraRow | null;
    setShowPercentBadges(getHomeTaskDisplaySettings(settings).showPercentBadges);
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

  if (!ready || !db) return <p className="text-sm text-muted-foreground">Загрузка…</p>;

  return (
    <SettingsSectionCard title="Задачи на главной" leadingIcon={Percent} contentClassName="gap-3">
      <div className="overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/50">
        <label className="flex h-12 cursor-pointer items-center gap-3 px-3 aura-tx-colors hover:bg-[var(--aura-action-hover-bg)]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight text-foreground">Проценты в строках задач</p>
            <p className="mt-0.5 text-nano leading-snug text-[var(--aura-text-subtle)]">Бейджи 0%, 28%, 50%. Выполненные — галочка вместо 100%.</p>
          </div>
          <Switch
            checked={showPercentBadges}
            onCheckedChange={(checked) => {
              setShowPercentBadges(checked);
              mergeSave(db, { [TASKS_HIDE_COMPLETION_PERCENT_FIELD]: checked ? 0 : 1 });
            }}
            aria-label="Показывать проценты в строках задач"
            className="shrink-0"
          />
        </label>
      </div>
    </SettingsSectionCard>
  );
}
