import { useMemo } from 'react';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { useHomeDaySnapshot } from '@/shared/hooks/use-home-day-snapshot';
import { useAnimatedValues } from '@/shared/hooks/use-animated-value';
import { TASK_CATEGORY_IDS } from '@/shared/config/domain-taxonomy';
import { cn } from '@/lib/utils';
import { CategoryProgressCard } from '@/features/home/CategoryProgressCard';
import type { AuraRow } from '@/types/aura';

const CAT_KEYS = TASK_CATEGORY_IDS;

type SidebarBootstrap = {
  categoryProgresses?: Record<string, number>;
  dailyPointsRows?: AuraRow[];
};

function formatDateLabel(dateString: string, todayString: string): { title: string; sub: string } {
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { title: dateString, sub: '' };
  const isToday = dateString === todayString;
  const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
  const todayD = new Date(`${todayString}T12:00:00`);
  const showYear = Number.isFinite(todayD.getTime()) && d.getFullYear() !== todayD.getFullYear();
  if (isToday) return { title: 'Сегодня', sub: `${weekday}, ${dayMonth}` };
  return { title: showYear ? `${dayMonth} ${d.getFullYear()}` : dayMonth, sub: weekday };
}

export function SidebarDaySnapshot({ compact = false }: { compact?: boolean } = {}) {
  const { dateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const { data: daySnapshot } = useHomeDaySnapshot(dateString);
  const dataTick = useAuraDataRefresh({ types: ['task-progress', 'timer', 'ritual', 'nutrition', 'points'] });
  const bootstrapParams = useMemo(() => ({ date: dateString }), [dateString]);
  const { data: bootstrapData } = useBootstrapData<SidebarBootstrap>('sidebar', bootstrapParams, [dataTick], { keepStaleOnError: true });

  const rawProgressPct = useMemo(() => {
    if (!db) return null;
    const categoryMap = daySnapshot?.categoryProgresses ?? (bootstrapData?.categoryProgresses ?? {});
    const values = CAT_KEYS.map((key) => categoryMap[key] ?? 0);
    if (values.length) return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    let dailyRows: AuraRow[] = bootstrapData?.dailyPointsRows ?? [];
    if (!dailyRows.length) {
      try {
        dailyRows = db.getAll('act_daily_points') as AuraRow[];
      } catch (error) {
        console.warn('[AURA] Failed to read sidebar daily points, using empty state.', error);
        dailyRows = [];
      }
    }
    const daily = dailyRows.find((row) => String(row.date) === dateString);
    if (daily?.completion_percent == null || Number.isNaN(Number(daily.completion_percent))) return null;
    return Math.round(Math.min(100, Math.max(0, Number(daily.completion_percent))));
  }, [bootstrapData, daySnapshot?.categoryProgresses, db, dateString]);

  const [animatedPct] = useAnimatedValues([rawProgressPct ?? 0], compact ? 220 : 280);
  const displayPct = rawProgressPct != null ? Math.round(animatedPct) : null;
  const { title, sub } = formatDateLabel(dateString, todayString);
  const isDense = compact;

  if (!db) {
    return (
      <section className="mb-2 shrink-0 overflow-hidden rounded-lg border border-soft bg-transparent" aria-label="Сводка по выбранному дню">
        <p className="px-3 py-3 text-center text-xs font-medium text-muted-foreground">Данные недоступны.</p>
      </section>
    );
  }

  return (
    <section className="mb-2 shrink-0 overflow-hidden rounded-lg border border-soft bg-transparent" aria-label="Сводка по выбранному дню">
      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3', isDense ? 'py-2' : 'py-2.5')}>
        <div className="min-w-0">
          <p className={cn('truncate font-semibold leading-tight text-foreground', isDense ? 'text-sm' : 'text-[15px]')}>{title}</p>
          {sub ? <p className={cn('mt-1 truncate text-muted-foreground', isDense ? 'text-caption' : 'text-xs')}>{sub}</p> : null}
        </div>

        {displayPct != null ? (
          <div className="text-right leading-none">
            <p className={cn('font-semibold tabular-nums text-primary', isDense ? 'text-sm' : 'text-[15px]')}>{displayPct}%</p>
          </div>
        ) : null}
      </div>

      {displayPct != null ? (
        <div className={cn('border-t border-soft', isDense ? 'h-36' : 'h-44')}>
          <CategoryProgressCard cardClassName="h-full" contentClassName="min-h-0 flex-1 p-0" />
        </div>
      ) : (
        <p className="border-t border-soft px-3 py-2 text-xs font-medium text-muted-foreground">День без данных.</p>
      )}
    </section>
  );
}
