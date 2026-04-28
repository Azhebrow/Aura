import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Ban, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';
import { cn } from '@/lib/utils';

const CATEGORIES = ['rituals', 'time', 'body', 'deps'] as const;
const LABELS: Record<(typeof CATEGORIES)[number], string> = {
  rituals: TASK_CATEGORY_DEFAULT_META.rituals.title,
  time: TASK_CATEGORY_DEFAULT_META.time.title,
  body: TASK_CATEGORY_DEFAULT_META.body.title,
  deps: TASK_CATEGORY_DEFAULT_META.deps.title,
};
const CATEGORY_COLORS: Record<(typeof CATEGORIES)[number], string> = {
  rituals: '--task-rituals',
  time: '--task-time',
  body: '--task-body',
  deps: '--task-deps',
};
const CATEGORY_ICONS: Record<(typeof CATEGORIES)[number], LucideIcon> = {
  rituals: Sparkles,
  time: Clock,
  body: Activity,
  deps: Ban,
};

/**
 * Радар диаграмма: сегодняшние процеты по категориям (Chart.js radar).
 */
type CategoryProgressCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

export function CategoryProgressCard({ cardClassName, contentClassName }: CategoryProgressCardProps = {}) {
  const { dateString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const dataTick = useAuraDataRefresh({
    types: ['task-progress', 'timer', 'ritual', 'nutrition', 'diary', 'mood'],
    includeTaskCategoriesConfig: true,
  });
  const [bootstrapProgresses, setBootstrapProgresses] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const api = window.__auraMiniApi;
    if (!api) {
      setBootstrapProgresses(null);
      return;
    }
    api
      .fetchBootstrap('home', { date: dateString })
      .then((data) => {
        if (cancelled) return;
        const categoryProgresses =
          data && typeof data === 'object' && 'categoryProgresses' in data
            ? (data as { categoryProgresses?: Record<string, number> }).categoryProgresses
            : null;
        setBootstrapProgresses(categoryProgresses ?? null);
      })
      .catch(() => {
        if (!cancelled) setBootstrapProgresses(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dateString, dataTick]);

  const todayData = useMemo(() => {
    if (!db) return null;
    const bulk = bootstrapProgresses ?? getCategoryProgresses(db, dateString, CATEGORIES);
    return CATEGORIES.map((cat) => bulk[cat] ?? 0);
  }, [bootstrapProgresses, db, dateString, ready, dataTick]);

  const [displayData, setDisplayData] = useState<number[] | null>(null);
  const hasHydratedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const displayDataRef = useRef<number[] | null>(null);

  useEffect(() => {
    if (!todayData) return;

    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      displayDataRef.current = todayData;
      setDisplayData(todayData);
      return;
    }

    const from = displayDataRef.current && displayDataRef.current.length === todayData.length ? displayDataRef.current : todayData;
    const to = todayData;
    const durationMs = 320;
    const startTime = performance.now();

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = to.map((target, idx) => {
        const initial = from[idx] ?? 0;
        return initial + (target - initial) * eased;
      });

      displayDataRef.current = next;
      setDisplayData(next);

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [todayData]);

  const points = useMemo(() => {
    if (!displayData) return [];
    const center = 50;
    const maxR = 33;
    return displayData.map((value, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / CATEGORIES.length;
      const ratio = Math.max(0, Math.min(100, value)) / 100;
      const r = maxR * ratio;
      return {
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
      };
    });
  }, [displayData]);

  const polygonPoints = useMemo(() => points.map((p) => `${p.x},${p.y}`).join(' '), [points]);

  const axisPoints = useMemo(() => {
    const center = 50;
    const r = 38;
    return CATEGORIES.map((cat, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / CATEGORIES.length;
      return {
        cat,
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
      };
    });
  }, []);

  const gridPolygons = useMemo(() => {
    const center = 50;
    const levels = [0.25, 0.5, 0.75, 1];
    return levels.map((level) => {
      const r = 33 * level;
      const levelPoints = CATEGORIES.map((_, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / CATEGORIES.length;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return `${x},${y}`;
      });
      return levelPoints.join(' ');
    });
  }, []);

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', cardClassName)}>
      <div className={cn('flex min-h-0 min-w-0 flex-1', contentClassName)}>
        {!ready || !todayData || !displayData ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : (
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-card p-1.5 sm:p-2">
            <div className="relative aspect-square h-full min-h-0 max-h-full max-w-full">
              <svg viewBox="0 0 100 100" className="h-full w-full text-border" aria-label="Прогресс по категориям">
                  {gridPolygons.map((poly, idx) => (
                    <polygon key={idx} points={poly} fill="none" stroke="currentColor" opacity={0.55} strokeWidth="0.45" />
                  ))}
                  {axisPoints.map((p) => (
                    <line key={p.cat} x1="50" y1="50" x2={p.x} y2={p.y} stroke="currentColor" opacity={0.45} strokeWidth="0.4" />
                  ))}
                  <polygon points={polygonPoints} fill="currentColor" className="text-primary" opacity={0.12} stroke="currentColor" strokeWidth="1.15" />
                  {points.map((p, index) => {
                    const cat = CATEGORIES[index];
                    return (
                      <circle
                        key={cat}
                        cx={p.x}
                        cy={p.y}
                        r="2"
                        fill={`var(${CATEGORY_COLORS[cat]})`}
                        className="stroke-card"
                        strokeWidth="1"
                      />
                    );
                  })}
                </svg>
                {CATEGORIES.map((cat, index) => {
                  const Icon = CATEGORY_ICONS[cat];
                  const pos =
                    index === 0
                      ? 'left-1/2 top-1 -translate-x-1/2'
                      : index === 1
                        ? 'right-1 top-1/2 -translate-y-1/2'
                        : index === 2
                          ? 'bottom-1 left-1/2 -translate-x-1/2'
                          : 'left-1 top-1/2 -translate-y-1/2';
                  return (
                    <span
                      key={cat}
                      className={cn(
                        'absolute inline-flex size-5 items-center justify-center rounded-full bg-card',
                        pos
                      )}
                      title={`${LABELS[cat]}: ${Math.round(displayData[index] ?? 0)}%`}
                    >
                      <Icon className="size-3.5" style={{ color: `var(${CATEGORY_COLORS[cat]})` }} />
                    </span>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
