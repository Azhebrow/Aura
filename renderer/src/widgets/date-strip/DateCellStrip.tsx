import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dateToYmd, useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 0, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

function addDaysToYmd(ymd: string, delta: number): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + delta);
  return dateToYmd(d);
}

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function countFromWidth(px: number): number {
  if (!px || px < 200) return 7;
  const cell = 52;
  return Math.max(5, Math.min(21, Math.floor(px / cell)));
}

/** Окно из `count` дней, центрированное на `selection`, последний день не позже `todayYmd`. */
function computeWindowStart(selectionYmd: string, count: number, todayYmd: string): string {
  const sel = parseYmd(selectionYmd);
  const todayD = parseYmd(todayYmd);
  if (!sel || !todayD) return selectionYmd;
  const n = Math.max(1, count);
  const start = new Date(sel);
  start.setDate(start.getDate() - Math.floor(n / 2));
  const end = new Date(start);
  end.setDate(end.getDate() + n - 1);
  if (end.getTime() > todayD.getTime()) {
    const endClamped = new Date(todayD);
    const startClamped = new Date(endClamped);
    startClamped.setDate(startClamped.getDate() - (n - 1));
    return dateToYmd(startClamped);
  }
  return dateToYmd(start);
}

/** Сдвигает первый день окна, не допуская «уезда» за сегодняшний день. */
function clampWindowStartOnly(startYmd: string, count: number, todayYmd: string): string {
  const start = parseYmd(startYmd);
  const todayD = parseYmd(todayYmd);
  if (!start || !todayD) return startYmd;
  const n = Math.max(1, count);
  const last = new Date(start);
  last.setDate(last.getDate() + n - 1);
  if (last.getTime() > todayD.getTime()) {
    const endClamped = new Date(todayD);
    const startClamped = new Date(endClamped);
    startClamped.setDate(startClamped.getDate() - (n - 1));
    return dateToYmd(startClamped);
  }
  return startYmd;
}

/**
 * Горизонтальные «ячейки» дат: столько, сколько помещается; стрелки сдвигают окно.
 */
const CAT_IDS = ['rituals', 'time', 'body', 'deps'] as const;
type LegacyPointsApi = {
  isDayOpen: (date: string) => boolean;
  isFutureDay: (date: string) => boolean;
};

export function DateCellStrip() {
  const { dateString, setDateString, todayString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const dataTick = useAuraDataRefresh();
  const isMiniApp = typeof document !== 'undefined' && document.documentElement.dataset.auraMiniapp === '1';
  const forceCompactMiniStrip = isMiniApp && typeof window !== 'undefined' && window.innerWidth < 900;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(forceCompactMiniStrip ? 3 : 7);
  const [windowStart, setWindowStart] = useState(() =>
    computeWindowStart(dateString, forceCompactMiniStrip ? 3 : 7, todayString)
  );
  const [bootstrapRows, setBootstrapRows] = useState<Array<{ date: string; categoryProgresses?: Record<string, number> }> | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setVisibleCount(forceCompactMiniStrip ? 3 : countFromWidth(w));
    });
    ro.observe(el);
    setVisibleCount(forceCompactMiniStrip ? 3 : countFromWidth(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [forceCompactMiniStrip]);

  useEffect(() => {
    setWindowStart(computeWindowStart(dateString, visibleCount, todayString));
  }, [dateString, visibleCount, todayString]);

  const today = parseYmd(todayString);
  const cells: string[] = [];
  let cur = windowStart;
  for (let i = 0; i < visibleCount; i++) {
    cells.push(cur);
    cur = addDaysToYmd(cur, 1);
  }

  const lastInWindow = addDaysToYmd(windowStart, visibleCount - 1);
  const canShiftForward = lastInWindow < todayString;

  const dayScores = useMemo(() => {
    const map: Record<string, number> = {};
    if (!ready || !db) return map;
    if (bootstrapRows && bootstrapRows.length) {
      for (const row of bootstrapRows) {
        const values = CAT_IDS.map((cat) => Number(row.categoryProgresses?.[cat] ?? 0));
        map[row.date] = values.reduce((acc, value) => acc + value, 0) / CAT_IDS.length;
      }
      return map;
    }
    const dailyPointsRows = db.getAll('act_daily_points');
    const byDate = new Map<string, { completion_percent?: unknown }>();
    dailyPointsRows.forEach((row) => {
      if (!row?.date) return;
      byDate.set(String(row.date), row as { completion_percent?: unknown });
    });
    let cur = windowStart;
    for (let i = 0; i < visibleCount; i++) {
      const categoryMap = getCategoryProgresses(db, cur, CAT_IDS);
      const values = CAT_IDS.map((cat) => categoryMap[cat]).filter((v) => Number.isFinite(Number(v))) as number[];
      const sum = values.reduce((acc, value) => acc + Number(value), 0);
      const n = values.length;
      if (n) {
        map[cur] = sum / n;
      } else {
        const row = byDate.get(cur);
        const fromDaily =
          row && row.completion_percent != null && Number.isFinite(Number(row.completion_percent))
            ? Math.min(100, Math.max(0, Number(row.completion_percent)))
            : 0;
        map[cur] = fromDaily;
      }
      cur = addDaysToYmd(cur, 1);
    }
    return map;
  }, [bootstrapRows, db, ready, windowStart, visibleCount, dataTick]);

  useEffect(() => {
    let cancelled = false;
    const api = window.__auraMiniApi;
    if (!api) {
      setBootstrapRows(null);
      return;
    }
    api
      .fetchBootstrap('date-strip', { date: windowStart, rangeDays: visibleCount })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) {
          setBootstrapRows(null);
          return;
        }
        setBootstrapRows(data as Array<{ date: string; categoryProgresses?: Record<string, number> }>);
      })
      .catch(() => {
        if (!cancelled) setBootstrapRows(null);
      });
    return () => {
      cancelled = true;
    };
  }, [windowStart, visibleCount, dataTick]);

  const pointsApi = useMemo<LegacyPointsApi | null>(() => {
    if (!ready || !db) return null;
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor) return null;
    try {
      return new Ctor(db) as unknown as LegacyPointsApi;
    } catch {
      return null;
    }
  }, [db, ready]);

  const shiftWindow = (deltaDays: number) => {
    setWindowStart((prev) => {
      const next = addDaysToYmd(prev, deltaDays);
      return clampWindowStartOnly(next, visibleCount, todayString);
    });
  };

  return (
    <div
      ref={wrapRef}
      className="border-border bg-muted/20 flex min-w-0 max-w-full flex-1 items-stretch gap-0.5 rounded-xl border p-0.5 sm:gap-1"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 self-center"
        aria-label="Показать более ранние даты"
        onClick={() => shiftWindow(-visibleCount)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="grid min-w-0 flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
        {cells.map((ymd) => {
          const d = parseYmd(ymd);
          const isSel = ymd === dateString;
          const isToday = ymd === todayString;
          const isFuture = pointsApi ? pointsApi.isFutureDay(ymd) : today && d ? d.getTime() > today.getTime() : false;
          const isLocked = pointsApi ? !isFuture && !pointsApi.isDayOpen(ymd) : false;
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
                'flex min-w-0 flex-col items-center justify-center rounded-lg px-0.5 py-1 text-xs aura-tx-colors sm:px-1',
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
              <span className="font-mono text-xs font-semibold tabular-nums sm:text-sm">
                {isSel && isLocked ? <Lock className="mx-auto size-3.5 sm:size-4" aria-hidden /> : dayNum}
              </span>
              <span
                className={cn(
                  'mt-0.5 h-1 w-[85%] max-w-[2.75rem] overflow-hidden rounded-full bg-foreground/10',
                  isSel && 'bg-primary-foreground/25'
                )}
                aria-hidden
              >
                <span
                  className={cn('block h-full rounded-full bg-primary/80', isSel && 'bg-primary-foreground/90')}
                  style={{ width: `${Math.round(score)}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 self-center"
        aria-label="Показать более поздние даты"
        disabled={!canShiftForward}
        onClick={() => canShiftForward && shiftWindow(visibleCount)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
