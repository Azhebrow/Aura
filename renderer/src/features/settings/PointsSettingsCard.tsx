import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, LockKeyhole, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  getHomeTaskDisplaySettings,
  TASKS_HIDE_COMPLETION_PERCENT_FIELD,
} from '@/shared/config/home-task-display';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

const SECTION_CN = 'overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/50 divide-y divide-[var(--aura-border-soft)]/40';

function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHours(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 48;
  return Math.max(0, Math.min(720, Math.round(parsed)));
}

export function PointsSettingsCard() {
  const { db, ready } = useAuraDb();
  const [openHours, setOpenHours] = useState('48');
  const [startDate, setStartDate] = useState(todayIso());
  const [showPercentBadges, setShowPercentBadges] = useState(true);

  const reload = useCallback(() => {
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    setOpenHours(String(cur.points_open_hours ?? 48));
    setStartDate(typeof cur.points_start_date === 'string' && cur.points_start_date ? cur.points_start_date : todayIso());
    setShowPercentBadges(getHomeTaskDisplaySettings(cur).showPercentBadges);
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

  if (!ready || !db) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }

  return (
    <SettingsSectionCard title="Очки и задачи" leadingIcon={LockKeyhole} contentClassName="gap-3">
      <div className={SECTION_CN}>
        <div className="relative grid min-h-12 grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <LockKeyhole className="size-3.5 shrink-0 text-[var(--aura-text-subtle)]" />
            <Label htmlFor="points-open-hours" className="min-w-0 text-xs font-medium text-foreground">
              Блокировка дней через
            </Label>
          </div>
          <Input
            id="points-open-hours"
            type="number"
            min={0}
            max={720}
            step={1}
            value={openHours}
            onChange={(event) => setOpenHours(event.target.value)}
            onBlur={() => {
              const next = normalizeHours(openHours);
              setOpenHours(String(next));
              mergeSave(db, { points_open_hours: next });
            }}
            className="h-8 pr-7 text-right"
            aria-label="Количество часов до блокировки дня"
          />
          <span className="pointer-events-none absolute right-6 text-xs font-medium text-[var(--aura-text-subtle)]">ч</span>
        </div>
        <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <CalendarDays className="size-3.5 shrink-0 text-[var(--aura-text-subtle)]" />
            <Label htmlFor="points-start-date" className="min-w-0 text-xs font-medium text-foreground">
              Дата начала отчёта очков
            </Label>
          </div>
          <Input
            id="points-start-date"
            type="date"
            value={startDate}
            onChange={(event) => {
              const next = event.target.value || todayIso();
              setStartDate(next);
              mergeSave(db, { points_start_date: next });
            }}
            className="h-8"
            aria-label="Дата начала отчёта очков"
          />
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 aura-tx-colors hover:bg-[var(--aura-action-hover-bg)]">
          <Percent className="size-3.5 shrink-0 text-[var(--aura-text-subtle)]" />
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
