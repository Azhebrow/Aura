import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CalendarDays, Flame, HandCoins, Timer, TrendingUp, UtensilsCrossed, Wallet } from 'lucide-react';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';
import { TASK_CATEGORY_IDS } from '@/shared/config/domain-taxonomy';
import { getSidebarWidgetSettings, resolveVisibleSidebarMetrics, SIDEBAR_METRIC_LABELS, type SidebarMetricKey } from '@/shared/config/sidebar-widget';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { formatAmount } from '@/shared/lib/money';
import type { AuraDatabase, AuraRow } from '@/types/aura';

const CAT_KEYS = TASK_CATEGORY_IDS;

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
  const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  const todayD = new Date(`${todayString}T12:00:00`);
  const showYear = Number.isFinite(todayD.getTime()) && d.getFullYear() !== todayD.getFullYear();
  if (isToday) {
    return {
      title: 'Сегодня',
      sub: `${weekday}, ${dayMonth}`,
    };
  }
  return {
    title: showYear ? `${dayMonth} ${d.getFullYear()}` : dayMonth,
    sub: weekday,
  };
}

function computeStreak(rows: AuraRow[], dateString: string): number {
  const doneDays = new Set(
    rows
      .filter((r) => {
        const completion = Number(r.completion_percent);
        return Number.isFinite(completion) && completion > 0;
      })
      .map((r) => String(r.date))
  );
  if (!doneDays.has(dateString)) return 0;
  let streak = 0;
  let cursor = new Date(`${dateString}T12:00:00`);
  while (Number.isFinite(cursor.getTime())) {
    const key = cursor.toISOString().slice(0, 10);
    if (!doneDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type RowProps = { icon: LucideIcon; label: string; value: string; muted?: boolean; compact?: boolean };

function StatRow({ icon: Icon, label, value, muted, compact }: RowProps) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border/50 px-2.5', compact ? 'h-9' : 'h-10')}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground/85 flex size-5 shrink-0 items-center justify-center">
          <Icon className={cn('opacity-90', compact ? 'size-3.5' : 'size-4')} aria-hidden />
        </span>
        <p className={cn('min-w-0 truncate whitespace-nowrap font-medium text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>{label}</p>
      </div>
      <p
        className={cn(
          'max-w-[7.25rem] truncate whitespace-nowrap text-right font-mono font-semibold tabular-nums text-foreground',
          compact ? 'text-[11px]' : 'text-xs',
          muted && 'text-muted-foreground font-medium'
        )}
        title={value}
      >
          {value}
      </p>
    </div>
  );
}

export function SidebarDaySnapshot({ compact = false }: { compact?: boolean } = {}) {
  const { dateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh({ types: ['task-progress', 'timer', 'ritual', 'nutrition', 'diary', 'transaction', 'points'] });
  const focusTaskIds = useMemo(() => {
    if (!db) return new Set<string>();
    return new Set(
      db
        .getAll('cfg_tasks')
        .filter((row) => row.id != null && row.task_type === 'timer' && row.category_type === 'time')
        .map((row) => String(row.id))
    );
  }, [db]);
  const bootstrapParams = useMemo(() => ({ date: dateString }), [dateString]);
  const { data: bootstrapData } = useBootstrapData<{
    categoryProgresses?: Record<string, number>;
    dailyPointsRows?: AuraRow[];
    timerSessions?: AuraRow[];
    nutritionEntries?: AuraRow[];
    diaryEntry?: AuraRow | null;
    transactions?: AuraRow[];
  }>('sidebar', bootstrapParams, [dataTick], {
    keepStaleOnError: true,
    cacheMs: 0,
    dedupeKey: `sidebar:${dateString}:${dataTick}`,
  });

  const snap = useMemo(() => {
    if (!db) {
      return null;
    }
    const settings = db.getAppSettings() as AuraRow | null;
    const currency = typeof settings?.currency === 'string' ? settings.currency : 'RUB';

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

    const dailyPointsFromRow =
      daily != null && daily.daily_points != null && !Number.isNaN(Number(daily.daily_points))
        ? Math.round(Number(daily.daily_points))
        : null;
    const rawPoints = progressPct != null ? Math.round(progressPct * 2 - 100) : dailyPointsFromRow;
    const dailyPoints = rawPoints != null && Number.isFinite(Number(rawPoints)) ? Math.round(Number(rawPoints)) : null;

    const txRows = db.getTransactions(dateString);
    const txCount = txRows.length;
    const txNet = txRows.reduce((sum, row) => {
      const amount = Number(row.amount) || 0;
      const type = String(row.type ?? 'expense');
      if (type === 'income') return sum + amount;
      if (type === 'expense') return sum - amount;
      return sum;
    }, 0);
    const txLabel = txCount > 0 ? `${txCount} · ${formatAmount(txNet, currency)}` : '—';

    const balanceSum = db.getAll('cfg_accounts').reduce((sum, row) => sum + (Number(row.balance) || 0), 0);
    const balanceLabel = formatAmount(balanceSum, currency);

    const streakDays = computeStreak(dailyRows, dateString);
    const streakLabel = streakDays > 0 ? `${streakDays}д` : '—';

    return {
      progressPct,
      metrics: {
        'daily-points': { value: formatSignedPoints(dailyPoints), muted: dailyPoints == null },
        'focus-time': { value: focusLabel, muted: focusLabel === '—' },
        rituals: { value: ritualsLabel, muted: ritualsLabel === '—' },
        calories: { value: kcalLabel, muted: kcalLabel === '—' },
        transactions: { value: txLabel, muted: txLabel === '—' },
        balance: { value: balanceLabel, muted: false },
        streak: { value: streakLabel, muted: streakLabel === '—' },
        'day-progress': { value: progressPct != null ? `${progressPct}%` : '—', muted: progressPct == null },
      } as Record<SidebarMetricKey, { value: string; muted: boolean }>,
      settings,
    };
  }, [bootstrapData, db, dateString, focusTaskIds, dataTick]);

  const metricIcons: Record<SidebarMetricKey, LucideIcon> = {
    'day-progress': CalendarDays,
    'daily-points': TrendingUp,
    'focus-time': Timer,
    rituals: Flame,
    calories: UtensilsCrossed,
    transactions: HandCoins,
    balance: Wallet,
    streak: BookOpen,
  };

  const visibleMetrics = useMemo(() => {
    const pref = getSidebarWidgetSettings(snap?.settings);
    return resolveVisibleSidebarMetrics(pref.enabledMetrics, pref.order, pref.maxItems);
  }, [snap?.settings]);
  const styleVariant = getSidebarWidgetSettings(snap?.settings).styleVariant;

  const { title, sub } = formatDateLabel(dateString, todayString);
  const isDense = compact || styleVariant === 'compact';

  if (!snap) {
    return (
      <section className="border-border/70 bg-card/45 mb-2 shrink-0 overflow-hidden rounded-lg border" aria-label="Сводка по выбранному дню">
        <p className="px-3 py-3 text-center text-xs font-medium text-muted-foreground">Данные недоступны.</p>
      </section>
    );
  }

  const renderMetrics = (isCompact: boolean) =>
    visibleMetrics.map((key) => {
      const item = snap.metrics[key];
      return (
        <StatRow
          key={key}
          icon={metricIcons[key]}
          label={SIDEBAR_METRIC_LABELS[key]}
          value={item.value}
          muted={item.muted}
          compact={isCompact}
        />
      );
    });

  return (
    <section className="border-border/70 bg-card/45 mb-2 shrink-0 overflow-hidden rounded-lg border" aria-label="Сводка по выбранному дню">
      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-3', isDense ? 'py-2' : 'py-2.5')}>
        <div className="min-w-0">
          <p className={cn('truncate font-semibold leading-tight text-foreground', isDense ? 'text-sm' : 'text-[15px]')}>{title}</p>
          {sub ? <p className={cn('truncate text-muted-foreground', isDense ? 'mt-1 text-[11px]' : 'mt-1 text-xs')}>{sub}</p> : null}
        </div>

        {snap.progressPct != null ? (
          <div className="text-right leading-none">
            <p className={cn('font-mono font-semibold tabular-nums text-foreground', isDense ? 'text-sm' : 'text-[15px]')}>{snap.progressPct}%</p>
            <p className={cn('mt-1 text-muted-foreground', isDense ? 'text-[10px]' : 'text-[11px]')}>прогресс</p>
          </div>
        ) : null}
      </div>

      {snap.progressPct != null ? (
        <div className="border-t border-border/50 px-3 py-2">
          <Progress value={snap.progressPct} className="h-1 bg-border/55 [&_[data-slot=progress-indicator]]:bg-foreground/70" />
        </div>
      ) : (
        <p className="border-t border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground">День без данных.</p>
      )}

      <div>{renderMetrics(isDense)}</div>
    </section>
  );
}
