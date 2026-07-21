import { type CSSProperties, useMemo } from 'react';
import { CalendarDays, Percent, Sigma, Sparkle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDragScroll } from '@/shared/hooks/use-drag-scroll';
import { TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { LoadingShell } from '@/shared/ui/data-states';
import { STICKY_COLUMN_SHADOW, STICKY_CORNER_SHADOW, STICKY_HEADER_SHADOW } from '@/shared/ui/sticky-table';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { formatHistoryDateShort } from './rank-utils';

const HISTORY_CATEGORY_PERCENT_KEYS: Record<TaskCategoryId, string> = {
  rituals: 'rituals_percent',
  time:    'time_percent',
  body:    'body_percent',
  deps:    'deps_percent',
};

const HEADER_ICON_COLOR = 'var(--aura-text-muted)';
const CELL_CN = 'border-r border-b border-soft/45 bg-panel px-2 py-2 text-center text-xs tabular-nums';

type Props = {
  db: AuraDatabase | null;
  history: AuraRow[];
};

function clampPct(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)));
}

function formatPoints(value: unknown): string {
  const n = Math.round(Number(value ?? 0));
  return `${n >= 0 ? '+' : ''}${n}`;
}

function HeaderIcon({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <span title={label} aria-label={label} className="inline-flex size-6 items-center justify-center text-dim">
      <Icon className="size-3.5 shrink-0" style={{ color: HEADER_ICON_COLOR } as CSSProperties} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function HeaderAuraIcon({ icon, label }: { icon: string; label: string }) {
  return (
    <span title={label} aria-label={label} className="inline-flex size-6 items-center justify-center text-dim">
      <AuraThemedIcon name={icon} tint={HEADER_ICON_COLOR} size={14} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function CategoryValue({ value, label }: { value: number | null; label: string }) {
  const safeValue = value ?? 0;
  return (
    <span className={cn('text-xs font-semibold tabular-nums', safeValue <= 0 ? 'text-dim' : 'text-foreground')} title={`${label}: ${safeValue}%`}>
      {safeValue}
    </span>
  );
}

function PercentCell({ value }: { value: number }) {
  return (
    <span className="text-xs font-semibold tabular-nums text-foreground">
      {value}%
    </span>
  );
}

function PointsCell({ value }: { value: number }) {
  return (
    <span className="text-xs font-semibold tabular-nums text-foreground">
      {formatPoints(value)}
    </span>
  );
}

function TotalCell({ value }: { value: unknown }) {
  return (
    <span className="text-xs font-semibold tabular-nums text-foreground">
      {Math.round(Number(value ?? 0))}
    </span>
  );
}

export function PointsHistoryTable({ db, history }: Props) {
  const { ref: scrollRef, isDragging, dragScrollHandlers } = useDragScroll<HTMLDivElement>();

  const categoryConfig = useMemo(() => loadTaskCategoryConfig(db), [db]);
  const categoryLabels = useMemo(
    () => Object.fromEntries(TASK_CATEGORY_IDS.map((k) => [k, categoryConfig[k].title])) as Record<TaskCategoryId, string>,
    [categoryConfig]
  );

  const completionsByDate = useMemo(() => {
    if (!db || history.length === 0) return new Map<string, AuraRow>();
    const want = new Set(history.map((r) => String(r.date)));
    const m = new Map<string, AuraRow>();
    try {
      for (const r of db.getAll('act_task_completions')) {
        const d = String(r.date);
        if (want.has(d)) m.set(d, r);
      }
    } catch { /* ignore */ }
    return m;
  }, [db, history]);

  if (!db) return <LoadingShell />;
  if (history.length === 0) return <p className="text-muted-foreground text-sm">Нет данных по очкам.</p>;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            'aura-data-table-scroll h-full min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable]',
            'cursor-grab select-none active:cursor-grabbing',
            isDragging && 'cursor-grabbing'
          )}
          {...dragScrollHandlers}
        >
          <table className="w-max min-w-full table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col className="w-[4.25rem]" />
              {TASK_CATEGORY_IDS.map((id) => <col key={id} className="w-[3.35rem]" />)}
              <col className="w-[3.9rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-[4.75rem]" />
            </colgroup>

            <thead className="sticky top-0 z-[4]">
              <tr>
                <th
                  className="sticky left-0 top-0 z-[6] border-b border-r border-soft/40 bg-card px-1 py-1.5 text-center"
                  style={{ boxShadow: STICKY_CORNER_SHADOW }}
                >
                  <HeaderIcon Icon={CalendarDays} label="Дата" />
                </th>
                {TASK_CATEGORY_IDS.map((id) => (
                  <th
                    key={id}
                    className="sticky top-0 z-[5] border-b border-r border-soft/40 bg-card px-1 py-1.5 text-center"
                    style={{ boxShadow: STICKY_HEADER_SHADOW }}
                  >
                    <HeaderAuraIcon icon={categoryConfig[id].icon} label={categoryLabels[id] ?? id} />
                  </th>
                ))}
                <th
                  className="sticky top-0 z-[5] border-b border-r border-soft/40 bg-card px-1 py-1.5 text-center"
                  style={{ boxShadow: STICKY_HEADER_SHADOW }}
                >
                  <HeaderIcon Icon={Percent} label="Выполнение" />
                </th>
                <th
                  className="sticky top-0 z-[5] border-b border-r border-soft/40 bg-card px-1 py-1.5 text-center"
                  style={{ boxShadow: STICKY_HEADER_SHADOW }}
                >
                  <HeaderIcon Icon={Sparkle} label="Очки" />
                </th>
                <th
                  className="sticky top-0 z-[5] border-b border-soft/40 bg-card px-1 py-1.5 text-center"
                  style={{ boxShadow: STICKY_HEADER_SHADOW }}
                >
                  <HeaderIcon Icon={Sigma} label="Накоплено" />
                </th>
              </tr>
            </thead>

            <tbody>
              {history.map((row, rowIdx) => {
                const dateStr = String(row.date);
                const completion = completionsByDate.get(dateStr);
                const avgPct = clampPct(row.completion_percent);
                const daily = Number(row.daily_points ?? 0);
                const isLastRow = rowIdx === history.length - 1;
                return (
                  <tr key={String(row.id)} className="aura-tx-colors">
                    <td
                      className={cn(
                        'sticky left-0 z-[3] border-r border-b border-soft bg-card px-1.5 py-2 text-center text-xs font-semibold tabular-nums text-foreground whitespace-nowrap',
                        isLastRow && 'border-b-0'
                      )}
                      style={{ boxShadow: STICKY_COLUMN_SHADOW }}
                      title={dateStr}
                    >
                      {formatHistoryDateShort(dateStr)}
                    </td>

                    {TASK_CATEGORY_IDS.map((id) => {
                      const raw = completion?.[HISTORY_CATEGORY_PERCENT_KEYS[id]];
                      const value = raw !== null && raw !== undefined && !Number.isNaN(Number(raw)) ? clampPct(raw) : null;
                      return (
                        <td key={id} className={cn(CELL_CN, isLastRow && 'border-b-0')}>
                          <CategoryValue value={value} label={categoryLabels[id] ?? id} />
                        </td>
                      );
                    })}

                    <td className={cn(CELL_CN, isLastRow && 'border-b-0')}>
                      <PercentCell value={avgPct} />
                    </td>

                    <td className={cn(CELL_CN, isLastRow && 'border-b-0')}>
                      <PointsCell value={daily} />
                    </td>

                    <td className={cn('border-b border-soft/45 bg-panel px-2 py-2 text-center', isLastRow && 'border-b-0')}>
                      <TotalCell value={row.cumulative_points} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </div>
  );
}
