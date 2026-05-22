import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CalendarDays, Flame, HandCoins, Timer, TrendingUp, UtensilsCrossed, Wallet } from 'lucide-react';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { useHomeDaySnapshot } from '@/shared/hooks/use-home-day-snapshot';
import { useAnimatedValues } from '@/shared/hooks/use-animated-value';
import { TASK_CATEGORY_IDS } from '@/shared/config/domain-taxonomy';
import { getSidebarWidgetSettings, resolveVisibleSidebarMetrics, SIDEBAR_METRIC_LABELS, type SidebarMetricKey } from '@/shared/config/sidebar-widget';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { formatAmount } from '@/shared/lib/money';
import type { AuraRow } from '@/types/aura';
import { buildFinanceDaySnapshot } from '@/shared/lib/finance-day-snapshot';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CAT_KEYS = TASK_CATEGORY_IDS;

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
    return { title: 'Сегодня', sub: `${weekday}, ${dayMonth}` };
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

// ─── StatRow ─────────────────────────────────────────────────────────────────

type RowProps = { icon: LucideIcon; label: string; value: string; muted?: boolean; compact?: boolean };

function StatRow({ icon: Icon, label, value, muted, compact }: RowProps) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--aura-border-soft)] px-2.5', compact ? 'h-9' : 'h-10')}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground/85 flex size-5 shrink-0 items-center justify-center">
          <Icon className={cn('opacity-90', compact ? 'size-3.5' : 'size-4')} aria-hidden />
        </span>
        <p className={cn('min-w-0 truncate whitespace-nowrap font-medium text-muted-foreground', compact ? 'text-caption' : 'text-xs')}>{label}</p>
      </div>
      <p
        className={cn(
          'max-w-[7.25rem] truncate whitespace-nowrap text-right font-semibold tabular-nums text-foreground',
          compact ? 'text-caption' : 'text-xs',
          muted && 'text-muted-foreground font-medium'
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Metric icons ─────────────────────────────────────────────────────────────

const METRIC_ICONS: Record<SidebarMetricKey, LucideIcon> = {
  'day-progress': CalendarDays,
  'daily-points': TrendingUp,
  'focus-time': Timer,
  rituals: Flame,
  calories: UtensilsCrossed,
  transactions: HandCoins,
  balance: Wallet,
  streak: BookOpen,
};

// ─── Raw snapshot indices (stable order for useAnimatedValues) ────────────────
// [0] progressPct  [1] dailyPoints  [2] focusSec  [3] kcal
// [4] ritualsCompleted  [5] txNet  [6] streakDays  [7] balance
const IDX_PCT = 0, IDX_PTS = 1, IDX_FOCUS = 2, IDX_KCAL = 3;
const IDX_RITS = 4, IDX_TXNET = 5, IDX_STREAK = 6, IDX_BAL = 7;

// ─── Main component ───────────────────────────────────────────────────────────

export function SidebarDaySnapshot({ compact = false }: { compact?: boolean } = {}) {
  const { dateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const { data: daySnapshot } = useHomeDaySnapshot(dateString);
  const dataTick = useAuraDataRefresh({ types: ['task-progress', 'timer', 'ritual', 'nutrition', 'diary', 'transaction', 'points'] });
  const focusTaskIds = useMemo(() => {
    const sourceTasks = daySnapshot?.cfgTasks;
    if (sourceTasks) {
      return new Set(
        sourceTasks
          .filter((row) => row.id != null && row.task_type === 'timer' && row.category_type === 'time')
          .map((row) => String(row.id))
      );
    }
    if (!db) return new Set<string>();
    return new Set(
      db
        .getAll('cfg_tasks')
        .filter((row) => row.id != null && row.task_type === 'timer' && row.category_type === 'time')
        .map((row) => String(row.id))
    );
  }, [daySnapshot?.cfgTasks, db]);

  const bootstrapParams = useMemo(() => ({ date: dateString }), [dateString]);
  const { data: bootstrapData } = useBootstrapData<{
    categoryProgresses?: Record<string, number>;
    dailyPointsRows?: AuraRow[];
    timerSessions?: AuraRow[];
    nutritionEntries?: AuraRow[];
    diaryEntry?: AuraRow | null;
    transactions?: AuraRow[];
  }>('sidebar', bootstrapParams, [dataTick], { keepStaleOnError: true });

  // ── Compute raw numeric values (no formatting yet) ────────────────────────
  const rawSnap = useMemo(() => {
    if (!db) return null;

    const settings = db.getAppSettings() as AuraRow | null;
    const currency = typeof settings?.currency === 'string' ? settings.currency : 'RUB';
    const financeSnapshot = buildFinanceDaySnapshot(db, dateString);

    const dailyRows = bootstrapData?.dailyPointsRows ?? db.getAll('act_daily_points');
    const daily = dailyRows.find((r) => String(r.date) === dateString);
    const categoryMap = daySnapshot?.categoryProgresses ?? (bootstrapData?.categoryProgresses ?? {});
    const vals: number[] = CAT_KEYS.map((k) => categoryMap[k] ?? 0);
    const avgCat = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const fromRow =
      daily != null && daily.completion_percent != null && !Number.isNaN(Number(daily.completion_percent))
        ? Math.round(Math.min(100, Math.max(0, Number(daily.completion_percent))))
        : null;
    const progressPct = avgCat ?? fromRow;

    const totalSec = daySnapshot
      ? Object.entries(daySnapshot.timerTotalsByTaskId).reduce(
          (acc, [taskId, seconds]) => (focusTaskIds.has(taskId) ? acc + Math.max(0, Number(seconds) || 0) : acc),
          0
        )
      : (bootstrapData?.timerSessions ?? db.getTimerSessions(dateString)).reduce((acc, s) => {
          const taskId = String(s.task_id ?? '');
          if (!taskId || !focusTaskIds.has(taskId)) return acc;
          return acc + Math.max(0, Number(s.duration) || 0);
        }, 0);

    const kcal = daySnapshot
      ? daySnapshot.nutritionTotals.calories
      : (bootstrapData?.nutritionEntries ?? db.getNutritionEntries(dateString)).reduce(
          (acc, e) => acc + Math.max(0, Number(e.total_calories) || 0),
          0
        );

    const sunrise = daySnapshot?.ritualCountsByType.sunrise ?? { completed: 0, total: 0 };
    const sunset = daySnapshot?.ritualCountsByType.sunset ?? { completed: 0, total: 0 };
    const ritualsCompleted = sunrise.completed + sunset.completed;
    const ritualsTotal = sunrise.total + sunset.total;

    const dailyPointsFromRow =
      daily != null && daily.daily_points != null && !Number.isNaN(Number(daily.daily_points))
        ? Math.round(Number(daily.daily_points))
        : null;
    const rawPoints = progressPct != null ? Math.round(progressPct * 2 - 100) : dailyPointsFromRow;
    const dailyPoints = rawPoints != null && Number.isFinite(Number(rawPoints)) ? Math.round(Number(rawPoints)) : null;

    const txRows = bootstrapData?.transactions ?? financeSnapshot.transactions;
    const txCount = txRows.length;
    const txNet = txRows.reduce((sum, row) => {
      const amount = Number(row.amount) || 0;
      const type = String(row.type ?? 'expense');
      if (type === 'income') return sum + amount;
      if (type === 'expense') return sum - amount;
      return sum;
    }, 0);

    const streakDays = computeStreak(dailyRows, dateString);

    return {
      settings,
      currency,
      progressPct,
      dailyPoints,
      hasDailyPoints: dailyPoints != null,
      focusSec: totalSec,
      kcal,
      ritualsCompleted,
      ritualsTotal,
      txCount,
      txNet,
      streakDays,
      balance: financeSnapshot.balance,
    };
  }, [bootstrapData, daySnapshot, db, dateString, focusTaskIds, dataTick]);

  // ── Animate all numeric values simultaneously ──────────────────────────────
  const rawNums = useMemo(() => [
    rawSnap?.progressPct ?? 0,
    rawSnap?.dailyPoints ?? 0,
    rawSnap?.focusSec ?? 0,
    rawSnap?.kcal ?? 0,
    rawSnap?.ritualsCompleted ?? 0,
    rawSnap?.txNet ?? 0,
    rawSnap?.streakDays ?? 0,
    rawSnap?.balance ?? 0,
  ], [rawSnap]);

  const animNums = useAnimatedValues(rawNums);

  // ── Format animated values for display ────────────────────────────────────
  const displayPct = rawSnap?.progressPct != null ? Math.round(animNums[IDX_PCT]) : null;
  const displayPoints = rawSnap?.hasDailyPoints
    ? formatSignedPoints(Math.round(animNums[IDX_PTS]))
    : '—';
  const displayFocus = formatFocusMinutes(animNums[IDX_FOCUS]);
  const displayKcal = rawSnap && rawSnap.kcal > 0 ? `${Math.round(animNums[IDX_KCAL])}` : '—';
  const displayRituals = rawSnap && rawSnap.ritualsTotal > 0
    ? `${Math.round(animNums[IDX_RITS])}/${rawSnap.ritualsTotal}`
    : '—';
  const displayTx = rawSnap && rawSnap.txCount > 0
    ? `${rawSnap.txCount} · ${formatAmount(animNums[IDX_TXNET], rawSnap.currency)}`
    : '—';
  const displayStreak = rawSnap && rawSnap.streakDays > 0 ? `${Math.round(animNums[IDX_STREAK])}д` : '—';
  const displayBalance = rawSnap ? formatAmount(animNums[IDX_BAL], rawSnap.currency) : '—';

  const metricValues: Record<SidebarMetricKey, { value: string; muted: boolean }> = {
    'day-progress': { value: displayPct != null ? `${displayPct}%` : '—', muted: displayPct == null },
    'daily-points': { value: displayPoints, muted: !rawSnap?.hasDailyPoints },
    'focus-time': { value: displayFocus, muted: displayFocus === '—' },
    rituals: { value: displayRituals, muted: displayRituals === '—' },
    calories: { value: displayKcal, muted: displayKcal === '—' },
    transactions: { value: displayTx, muted: displayTx === '—' },
    balance: { value: displayBalance, muted: false },
    streak: { value: displayStreak, muted: displayStreak === '—' },
  };

  const visibleMetrics = useMemo(() => {
    const pref = getSidebarWidgetSettings(rawSnap?.settings);
    return resolveVisibleSidebarMetrics(pref.enabledMetrics, pref.order);
  }, [rawSnap?.settings]);

  const { title, sub } = formatDateLabel(dateString, todayString);
  const isDense = compact;

  if (!rawSnap) {
    return (
      <section className="mb-2 shrink-0 overflow-hidden rounded-lg border border-[var(--aura-border-soft)] bg-transparent" aria-label="Сводка по выбранному дню">
        <p className="px-3 py-3 text-center text-xs font-medium text-muted-foreground">Данные недоступны.</p>
      </section>
    );
  }

  return (
    <section className="mb-2 shrink-0 overflow-hidden rounded-lg border border-[var(--aura-border-soft)] bg-transparent" aria-label="Сводка по выбранному дню">
      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-3', isDense ? 'py-2' : 'py-2.5')}>
        <div className="min-w-0">
          <p className={cn('truncate font-semibold leading-tight text-foreground', isDense ? 'text-sm' : 'text-[15px]')}>{title}</p>
          {sub ? <p className={cn('truncate text-muted-foreground', isDense ? 'mt-1 text-caption' : 'mt-1 text-xs')}>{sub}</p> : null}
        </div>

        {displayPct != null ? (
          <div className="text-right leading-none">
            <p className={cn('font-mono font-semibold tabular-nums text-primary', isDense ? 'text-sm' : 'text-[15px]')}>{displayPct}%</p>
            <p className={cn('mt-1 text-[var(--aura-text-disabled)]', isDense ? 'text-nano' : 'text-caption')}>прогресс</p>
          </div>
        ) : null}
      </div>

      {displayPct != null ? (
        <div className="border-t border-[var(--aura-border-soft)] px-3 py-2">
          {/* Progress component already has CSS transition via --aura-motion-duration-task-fill */}
          <Progress value={rawSnap.progressPct ?? 0} className="h-1 bg-border/55 [&_[data-slot=progress-indicator]]:bg-primary" />
        </div>
      ) : (
        <p className="border-t border-[var(--aura-border-soft)] px-3 py-2 text-xs font-medium text-muted-foreground">День без данных.</p>
      )}

      <div>
        {visibleMetrics.map((key) => (
          <StatRow
            key={key}
            icon={METRIC_ICONS[key]}
            label={SIDEBAR_METRIC_LABELS[key]}
            value={metricValues[key].value}
            muted={metricValues[key].muted}
            compact={isDense}
          />
        ))}
      </div>
    </section>
  );
}
