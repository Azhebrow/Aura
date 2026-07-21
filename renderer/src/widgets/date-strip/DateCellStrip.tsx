import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { TASK_CATEGORY_IDS } from '@/shared/config/domain-taxonomy';
import {
  addDaysToYmd,
  computeWindowStart,
  dateWindowCells,
  parseYmd,
} from '@/shared/lib/calendar-date';

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function countFromWidth(px: number): number {
  if (!px || px < 200) return 3;
  const cell = 52;
  return Math.max(3, Math.min(21, Math.floor(px / cell)));
}

/**
 * Горизонтальные «ячейки» дат: столько, сколько помещается вокруг выбранного дня.
 */
const CAT_IDS = TASK_CATEGORY_IDS;
type LegacyPointsApi = {
  isDayOpen: (date: string) => boolean;
  isFutureDay: (date: string) => boolean;
};

export function DateCellStrip() {
  const { dateString, setDateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(7);
  const [windowStart, setWindowStart] = useState(() =>
    computeWindowStart(dateString, 7, todayString)
  );
  const bootstrapParams = useMemo(
    () => ({ date: windowStart, rangeDays: visibleCount }),
    [windowStart, visibleCount]
  );
  const { data: bootstrapRowsRaw } = useBootstrapData<unknown>(
    'date-strip',
    bootstrapParams,
    [dataTick],
    { keepStaleOnError: true }
  );
  const bootstrapRows = useMemo(
    () =>
      Array.isArray(bootstrapRowsRaw)
        ? (bootstrapRowsRaw as Array<{ date: string; categoryProgresses?: Record<string, number>; completionPercent?: number }>)
        : null,
    [bootstrapRowsRaw]
  );

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const updateVisibleCount = (width: number) => {
      const next = countFromWidth(width);
      setVisibleCount((prev) => (prev === next ? prev : next));
    };
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updateVisibleCount(w));
    });
    ro.observe(el);
    updateVisibleCount(el.getBoundingClientRect().width);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    setWindowStart(computeWindowStart(dateString, visibleCount, todayString));
  }, [dateString, visibleCount, todayString]);

  const today = useMemo(() => parseYmd(todayString), [todayString]);
  const cells = useMemo(() => dateWindowCells(windowStart, visibleCount), [windowStart, visibleCount]);

  const dayScores = useMemo(() => {
    const map: Record<string, number> = {};
    if (!db) return map;
    if (bootstrapRows && bootstrapRows.length) {
      for (const row of bootstrapRows) {
        if (row.completionPercent != null && Number.isFinite(Number(row.completionPercent))) {
          map[row.date] = Math.min(100, Math.max(0, Number(row.completionPercent)));
          continue;
        }
        const values = CAT_IDS.map((cat) => Number(row.categoryProgresses?.[cat] ?? 0));
        map[row.date] = values.reduce((acc, value) => acc + value, 0) / CAT_IDS.length;
      }
      return map;
    }
    let dailyPointsRows: unknown[] = [];
    try {
      dailyPointsRows = db.getAll('act_daily_points') as unknown[];
    } catch (error) {
      console.warn('[AURA] Failed to read date strip points, using zero scores.', error);
      dailyPointsRows = [];
    }
    const byDate = new Map<string, { completion_percent?: unknown }>();
    dailyPointsRows.forEach((row) => {
      if (!row?.date) return;
      byDate.set(String(row.date), row as { completion_percent?: unknown });
    });
    let cur = windowStart;
    for (let i = 0; i < visibleCount; i++) {
      const row = byDate.get(cur);
      const fromDaily =
        row && row.completion_percent != null && Number.isFinite(Number(row.completion_percent))
          ? Math.min(100, Math.max(0, Number(row.completion_percent)))
          : 0;
      map[cur] = fromDaily;
      cur = addDaysToYmd(cur, 1);
    }
    return map;
  }, [bootstrapRows, db, windowStart, visibleCount, dataTick]);

  const pointsApi = useMemo<LegacyPointsApi | null>(() => {
    if (!db) return null;
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor) return null;
    try {
      return new Ctor(db) as unknown as LegacyPointsApi;
    } catch {
      return null;
    }
  }, [db]);

  return (
    <div
      ref={wrapRef}
      className="aura-date-strip flex min-w-0 max-w-full flex-1 items-stretch gap-0.5 rounded-xl border border-soft bg-panel p-0.5 sm:gap-1"
    >
      <div className="grid min-w-0 flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
        {cells.map((ymd) => {
          const d = parseYmd(ymd);
          const isSel = ymd === dateString;
          const isToday = ymd === todayString;
          let isFuture = today && d ? d.getTime() > today.getTime() : false;
          let isLocked = false;
          if (pointsApi) {
            try {
              isFuture = pointsApi.isFutureDay(ymd);
              isLocked = !isFuture && !pointsApi.isDayOpen(ymd);
            } catch {
              isLocked = false;
            }
          }
          const disabled = isFuture;
          const dow = d ? DOW_SHORT[d.getDay()] : '';
          const dayNum = d ? String(d.getDate()) : '';
          const score = dayScores[ymd] ?? 0;
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setDateString(ymd)}
              className={cn(
                'aura-date-strip-cell flex min-w-0 flex-col items-center justify-center rounded-lg px-0.5 py-1 text-xs aura-tx-colors sm:px-1',
                !isFuture && 'hover:bg-background/80',
                isSel && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                !isSel && isToday && 'text-foreground',
                isLocked && !isSel && 'text-muted-foreground/85',
                isFuture && '!bg-transparent !text-muted-foreground',
                isFuture && 'calendar-ghost-day pointer-events-none'
              )}
            >
              <span className={cn('font-medium uppercase opacity-80', isSel && 'text-primary-foreground/90')}>
                {dow}
              </span>
              <span className="flex h-5 items-center justify-center text-xs font-semibold tabular-nums sm:text-sm">
                {isLocked && isSel ? <Lock className="size-3.5" aria-label={`День ${dayNum} заблокирован`} /> : dayNum}
              </span>
              <span
                className={cn(
                  'aura-date-strip-meter mt-0.5 h-1 w-[85%] max-w-[2.75rem] overflow-hidden rounded-full bg-foreground/10',
                  isSel && 'bg-primary-foreground/25',
                  isLocked && !isSel && 'opacity-85'
                )}
                aria-hidden
              >
                <span
                  className={cn('block h-full rounded-full bg-primary/80 aura-data-fill', isSel && 'bg-primary-foreground/90')}
                  style={{
                    width: `${Math.round(score)}%`,
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
