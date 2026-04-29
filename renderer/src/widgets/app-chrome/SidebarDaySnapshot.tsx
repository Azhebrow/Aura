import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Flame, Timer, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AuraDatabase, AuraRow } from '@/types/aura';

const CAT_KEYS = ['rituals', 'time', 'body', 'deps'] as const;

function loadActiveRituals(db: AuraDatabase, kind: 'morning' | 'evening'): AuraRow[] {
  const table = kind === 'morning' ? 'cfg_rituals_morning' : 'cfg_rituals_evening';
  return db
    .getAll(table)
    .filter((r) => r.id && (r.active === 1 || r.active === null || r.active === undefined));
}

function ritualProgress(db: AuraDatabase, date: string): { done: number; total: number } {
  const mCfg = loadActiveRituals(db, 'morning');
  const eCfg = loadActiveRituals(db, 'evening');
  const mIds = new Set(mCfg.map((r) => String(r.id)));
  const eIds = new Set(eCfg.map((r) => String(r.id)));
  let done = 0;
  for (const r of db.getRitualsMorning(date)) {
    if (r.completed === 1 && r.ritual_id && mIds.has(String(r.ritual_id))) done += 1;
  }
  for (const r of db.getRitualsEvening(date)) {
    if (r.completed === 1 && r.ritual_id && eIds.has(String(r.ritual_id))) done += 1;
  }
  return { done, total: mCfg.length + eCfg.length };
}

function formatFocusMinutes(totalSec: number): string {
  const m = Math.max(0, Math.round(totalSec / 60));
  if (m <= 0) return '—';
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}ч ${rest}м` : `${h}ч`;
}

function formatSignedPoints(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatDateLabel(dateString: string, todayString: string): { title: string; sub: string } {
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { title: dateString, sub: '' };
  const isToday = dateString === todayString;
  if (isToday) {
    return {
      title: 'Сегодня',
      sub: d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  }
  return {
    title: dateString,
    sub: d.toLocaleDateString('ru-RU', { weekday: 'long' }),
  };
}

type RowProps = { icon: LucideIcon; label: string; value: string; muted?: boolean; compact?: boolean };

function StatRow({ icon: Icon, label, value, muted, compact }: RowProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="bg-muted/80 text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/50">
          <Icon className="size-3 opacity-90" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-mono text-xs font-semibold tabular-nums text-foreground', muted && 'text-muted-foreground font-medium')}>
            {value}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-muted/80 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/50">
        <Icon className="size-3.5 opacity-90" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">{label}</p>
        <p className={cn('font-mono text-xs font-semibold tabular-nums text-foreground', muted && 'text-muted-foreground font-medium')}>
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Краткая сводка по выбранной дате для левой колонки навигации.
 */
export function SidebarDaySnapshot({ compact = false }: { compact?: boolean } = {}) {
  const { dateString, todayString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const dataTick = useAuraDataRefresh();
  const focusTaskIds = useMemo(() => {
    if (!db || !ready) return new Set<string>();
    return new Set(
      db
        .getAll('cfg_tasks')
        .filter((row) => row.id != null && row.task_type === 'timer' && row.category_type === 'time')
        .map((row) => String(row.id))
    );
  }, [db, ready]);
  const [bootstrapData, setBootstrapData] = useState<{
    categoryProgresses?: Record<string, number>;
    dailyPointsRows?: AuraRow[];
    timerSessions?: AuraRow[];
    nutritionEntries?: AuraRow[];
    diaryEntry?: AuraRow | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const api = window.__auraMiniApi;
    if (!api) {
      setBootstrapData(null);
      return;
    }
    api
      .fetchBootstrap('sidebar', { date: dateString })
      .then((data) => {
        if (!cancelled) {
          setBootstrapData((data ?? null) as typeof bootstrapData);
        }
      })
      .catch(() => {
        if (!cancelled) setBootstrapData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dateString, dataTick]);

  const snap = useMemo(() => {
    if (!db || !ready) {
      return {
        progressPct: null as number | null,
        focusLabel: '—',
        kcalLabel: '—',
        ritualsLabel: '—',
        diaryFilled: false,
        dailyPoints: null as number | null,
      };
    }

    const dailyRows = bootstrapData?.dailyPointsRows ?? db.getAll('act_daily_points');
    const daily = dailyRows.find((r) => String(r.date) === dateString);
    const categoryMap =
      bootstrapData?.categoryProgresses && Object.keys(bootstrapData.categoryProgresses).length
        ? bootstrapData.categoryProgresses
        : getCategoryProgresses(db, dateString, CAT_KEYS);
    const vals: number[] = CAT_KEYS.map((k) => categoryMap[k] ?? 0);
    const avgCat = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const fromRow =
      daily != null && daily.completion_percent != null && !Number.isNaN(Number(daily.completion_percent))
        ? Math.round(Math.min(100, Math.max(0, Number(daily.completion_percent))))
        : null;
    // Приоритет у «живого» прогресса по категориям, чтобы UI обновлялся сразу после мутаций задач.
    const progressPct = avgCat ?? fromRow;

    const sessions = bootstrapData?.timerSessions ?? db.getTimerSessions(dateString);
    const totalSec = sessions.reduce((acc, s) => {
      const taskId = String(s.task_id ?? '');
      if (!taskId || !focusTaskIds.has(taskId)) return acc;
      return acc + Math.max(0, Number(s.duration) || 0);
    }, 0);
    const focusLabel = formatFocusMinutes(totalSec);

    const nutrition = bootstrapData?.nutritionEntries ?? db.getNutritionEntries(dateString);
    const kcal = nutrition.reduce((acc, e) => acc + Math.max(0, Number(e.total_calories) || 0), 0);
    const kcalLabel = kcal > 0 ? `${Math.round(kcal)}` : '—';

    const { done, total } = ritualProgress(db, dateString);
    const ritualsLabel = total > 0 ? `${done}/${total}` : '—';

    const entry = bootstrapData?.diaryEntry ?? db.getDiaryEntry(dateString);
    const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
    const diaryFilled = Boolean(text);

    const dailyPointsFromRow =
      daily != null && daily.daily_points != null && !Number.isNaN(Number(daily.daily_points))
        ? Math.round(Number(daily.daily_points))
        : null;
    const rawPoints = progressPct != null ? Math.round(progressPct * 2 - 100) : dailyPointsFromRow;
    const dailyPoints = rawPoints != null && Number.isFinite(Number(rawPoints)) ? Math.round(Number(rawPoints)) : null;

    return {
      progressPct,
      focusLabel,
      kcalLabel,
      ritualsLabel,
      diaryFilled,
      dailyPoints,
    };
  }, [bootstrapData, db, ready, dateString, dataTick, focusTaskIds]);

  const { title, sub } = formatDateLabel(dateString, todayString);

  if (compact) {
    return (
      <section
        className="border-border/70 bg-card/80 mb-2 shrink-0 rounded-xl border p-2 shadow-sm"
        aria-label="Сводка по выбранному дню"
      >
        <div className="mb-1.5 border-b border-border/60 pb-1.5">
          <p className="text-foreground text-xs font-semibold leading-tight">{title}</p>
        </div>

        {snap.progressPct != null ? (
          <div className="mb-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>День</span>
              <span className="font-mono text-foreground tabular-nums text-xs">{snap.progressPct}%</span>
            </div>
            <Progress value={snap.progressPct} className="mt-1 h-1" />
          </div>
        ) : null}

        <div className="space-y-1">
          <StatRow
            icon={TrendingUp}
            value={formatSignedPoints(snap.dailyPoints)}
            label="Очки"
            muted={snap.dailyPoints == null}
            compact
          />
          <StatRow icon={Timer} value={snap.focusLabel} label="Фокус" muted={snap.focusLabel === '—'} compact />
          <StatRow icon={UtensilsCrossed} value={snap.kcalLabel} label="Ккал" muted={snap.kcalLabel === '—'} compact />
          <StatRow icon={Flame} value={snap.ritualsLabel} label="Ритуалы" muted={snap.ritualsLabel === '—'} compact />
        </div>
      </section>
    );
  }

  return (
    <section
      className="border-border/70 bg-card/80 mb-2 shrink-0 rounded-xl border p-3 shadow-sm"
      aria-label="Сводка по выбранному дню"
    >
      <div className="mb-2.5 border-b border-border/60 pb-2">
        <p className="text-foreground text-sm font-semibold leading-tight tracking-tight">{title}</p>
        {sub ? <p className="text-muted-foreground mt-1 text-xs leading-snug">{sub}</p> : null}
      </div>

      {snap.progressPct != null ? (
        <div className="mb-3">
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs font-medium tracking-wide">
            <span>День</span>
            <span className="font-mono text-foreground tabular-nums">{snap.progressPct}%</span>
          </div>
          <Progress value={snap.progressPct} className="h-1.5" />
        </div>
      ) : (
        <EmptyState title="День без данных." hint="Отметьте активности или запустите таймер, чтобы заполнить сводку." className="mb-3" compact />
      )}

      <div className="grid grid-cols-1 gap-2.5">
        <StatRow
          icon={TrendingUp}
          label="Очки дня"
          value={formatSignedPoints(snap.dailyPoints)}
          muted={snap.dailyPoints == null}
        />
        <StatRow icon={Timer} label="Фокус" value={snap.focusLabel} muted={snap.focusLabel === '—'} />
        <StatRow icon={UtensilsCrossed} label="Питание, ккал" value={snap.kcalLabel} muted={snap.kcalLabel === '—'} />
        <StatRow icon={Flame} label="Ритуалы" value={snap.ritualsLabel} muted={snap.ritualsLabel === '—'} />
        <div className="flex items-center gap-2.5">
          <span className="bg-muted/80 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/50" aria-hidden>
            <BookOpen className="size-3.5 opacity-90" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-muted-foreground text-xs font-medium tracking-wide">Дневник</p>
            <p className="text-xs font-medium text-foreground">{snap.diaryFilled ? 'Есть запись' : 'Пусто'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
