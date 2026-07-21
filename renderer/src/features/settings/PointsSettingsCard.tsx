import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, LockKeyhole } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TASKS_HIDE_COMPLETION_PERCENT_FIELD } from '@/shared/config/home-task-display';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

const SECTION_CN = 'overflow-hidden rounded-xl border border-soft/70 bg-card/60 divide-y divide-soft/55';

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

  const reload = useCallback(() => {
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    setOpenHours(String(cur.points_open_hours ?? 48));
    setStartDate(typeof cur.points_start_date === 'string' && cur.points_start_date ? cur.points_start_date : todayIso());
    if (cur[TASKS_HIDE_COMPLETION_PERCENT_FIELD] !== 1) {
      mergeSave(db, { [TASKS_HIDE_COMPLETION_PERCENT_FIELD]: 1 });
    }
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
        <div className="relative grid min-h-14 grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-control/60 text-subtle">
              <LockKeyhole className="size-4" />
            </span>
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
            className="h-8 bg-background/70 pr-7 text-right"
            aria-label="Количество часов до блокировки дня"
          />
          <span className="pointer-events-none absolute right-6 text-xs font-medium text-subtle">ч</span>
        </div>
        <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-control/60 text-subtle">
              <CalendarDays className="size-4" />
            </span>
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
            className="h-8 bg-background/70"
            aria-label="Дата начала отчёта очков"
          />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
