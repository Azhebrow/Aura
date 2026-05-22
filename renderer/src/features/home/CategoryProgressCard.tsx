import { useMemo } from 'react';
import { Activity, Ban, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import { useAnimatedValues } from '@/shared/hooks/use-animated-value';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useHomeDaySnapshot } from '@/shared/hooks/use-home-day-snapshot';
import { TASK_CATEGORY_IDS, TASK_CATEGORY_DEFAULT_META, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { LoadingShell } from '@/shared/ui/data-states';
import { cn } from '@/lib/utils';

const CATEGORIES = TASK_CATEGORY_IDS;
const LABELS: Record<TaskCategoryId, string> = {
  rituals: TASK_CATEGORY_DEFAULT_META.rituals.title,
  time: TASK_CATEGORY_DEFAULT_META.time.title,
  body: TASK_CATEGORY_DEFAULT_META.body.title,
  deps: TASK_CATEGORY_DEFAULT_META.deps.title,
};
const CATEGORY_COLORS: Record<TaskCategoryId, string> = {
  rituals: '--task-rituals',
  time: '--task-time',
  body: '--task-body',
  deps: '--task-deps',
};
const CATEGORY_ICONS: Record<TaskCategoryId, LucideIcon> = {
  rituals: Sparkles,
  time: Clock,
  body: Activity,
  deps: Ban,
};

/** Радар диаграмма: сегодняшние проценты по категориям. */
type CategoryProgressCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

export function CategoryProgressCard({ cardClassName, contentClassName }: CategoryProgressCardProps = {}) {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const { data: snapshot } = useHomeDaySnapshot(dateString);
  const todayData = useMemo(() => {
    if (!snapshot) return null;
    return CATEGORIES.map((cat) => snapshot.categoryProgresses[cat] ?? 0);
  }, [snapshot]);

  // Плавная анимация значений при смене дня или обновлении данных
  const animatedData = useAnimatedValues(todayData ?? [0, 0, 0, 0]);
  const displayData = todayData ? animatedData : todayData;

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
        {!db || !todayData || !displayData ? (
          <LoadingShell />
        ) : (
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-transparent p-1.5 sm:p-2">
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
                        'absolute inline-flex size-5 items-center justify-center rounded-full bg-[var(--aura-surface-panel)]',
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
