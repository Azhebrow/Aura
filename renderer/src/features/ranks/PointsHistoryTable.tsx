// ─── PointsHistoryTable ───────────────────────────────────────────────────────
// Таблица истории очков с drag-скроллом, sticky-заголовком и sticky-столбцом даты.
// Показывает: дату, % по категориям, средний %, очки за день, накоплено, статус дня.

import { type CSSProperties, useMemo } from 'react';
import { Activity, Calendar, Lock, Pencil, Percent, Sigma, Sparkle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDragScroll } from '@/shared/hooks/use-drag-scroll';
import { TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { LoadingShell } from '@/shared/ui/data-states';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { formatHistoryDateShort } from './rank-utils';

// Маппинг id категории → ключ поля % в таблице act_task_completions
const HISTORY_CATEGORY_PERCENT_KEYS: Record<TaskCategoryId, string> = {
  rituals: 'rituals_percent',
  time:    'time_percent',
  body:    'body_percent',
  deps:    'deps_percent',
};

// ─── Константы стилей ─────────────────────────────────────────────────────────

const STICKY_HEADER_SHADOW = 'inset 0 -1px 0 hsl(var(--border) / 0.35)';
const STICKY_COLUMN_SHADOW = 'inset -1px 0 0 hsl(var(--border) / 0.35)';
const STICKY_CORNER_SHADOW = `${STICKY_HEADER_SHADOW}, ${STICKY_COLUMN_SHADOW}`;
const TABLE_CELL_CN = 'border-r border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-1 py-2 text-center text-xs tabular-nums';

const COL_HEADERS: { key: string; Icon: LucideIcon; label: string; color: string }[] = [
  { key: 'date',       Icon: Calendar, label: 'Дата',         color: 'var(--aura-text-muted)'  },
  { key: 'categories', Icon: Activity, label: 'Категории',    color: 'var(--aura-text-muted)'  },
  { key: 'avg',        Icon: Percent,  label: 'Средний %',    color: 'hsl(var(--primary))'     },
  { key: 'daily',      Icon: Sparkle,  label: 'Очки за день', color: 'var(--semantic-success)' },
  { key: 'total',      Icon: Sigma,    label: 'Накоплено',    color: 'var(--aura-text-muted)'  },
  { key: 'status',     Icon: Lock,     label: 'Статус',       color: 'var(--aura-text-muted)'  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  db: AuraDatabase | null;
  history: AuraRow[];
};

export function PointsHistoryTable({ db, history }: Props) {
  const { ref: scrollRef, isDragging, dragScrollHandlers } = useDragScroll<HTMLDivElement>();

  const categoryConfig = useMemo(() => loadTaskCategoryConfig(db), [db]);
  const categoryLabels = useMemo(
    () => Object.fromEntries(TASK_CATEGORY_IDS.map((k) => [k, categoryConfig[k].title])) as Record<TaskCategoryId, string>,
    [categoryConfig]
  );

  // Загружаем act_task_completions только для дат в диапазоне истории
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

  /**
   * Возвращает иконку статуса дня через PointsService (Electron).
   * В браузере всегда Lock.
   */
  const dayStatusIcon = useMemo(() => {
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor || !db) return (): LucideIcon => Lock;
    try {
      const ps = new Ctor(db);
      return (dateStr: string): LucideIcon => {
        if (ps.isFutureDay(dateStr)) return Calendar;
        if (ps.isDayOpen(dateStr)) return Pencil;
        return Lock;
      };
    } catch {
      return (): LucideIcon => Lock;
    }
  }, [db]);

  if (!db) return <LoadingShell />;
  if (history.length === 0) return <p className="text-muted-foreground text-sm">Нет данных по очкам.</p>;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="aura-surface-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/80">
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
              <col className="w-[4.75rem] sm:w-[5.5rem]" />
              <col className="w-[7rem] sm:w-[7.5rem]" />
              <col className="w-[3.25rem] sm:w-[3.5rem]" />
              <col className="w-[3.75rem] sm:w-[4rem]" />
              <col className="w-[4rem] sm:w-[4.5rem]" />
              <col className="w-[2.5rem] sm:w-[2.75rem]" />
            </colgroup>

            {/* Sticky заголовок */}
            <thead className="sticky top-0 z-[4]">
              <tr>
                {COL_HEADERS.map(({ key, Icon, label, color }, idx) => (
                  <th
                    key={key}
                    title={label}
                    aria-label={label}
                    className={cn(
                      'bg-card text-[var(--aura-text-muted)] sticky top-0 z-[5] border-b border-r border-[var(--aura-border-soft)]/40 px-1 py-1.5 text-center align-middle sm:py-2',
                      idx === 0 && 'sticky left-0 z-[6]',
                      idx === COL_HEADERS.length - 1 && 'border-r-0'
                    )}
                    style={{ boxShadow: idx === 0 ? STICKY_CORNER_SHADOW : STICKY_HEADER_SHADOW }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="inline-flex size-5 items-center justify-center" style={{ color } as CSSProperties}>
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                      </span>
                      <span className="sr-only">{label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {history.map((row, rowIdx) => {
                const dateStr    = String(row.date);
                const completion = completionsByDate.get(dateStr);
                const avgPct     = Math.round(Math.min(100, Math.max(0, Number(row.completion_percent ?? 0))));
                const daily      = Number(row.daily_points ?? 0);
                const StatusIc   = dayStatusIcon(dateStr);
                const isLastRow  = rowIdx === history.length - 1;

                return (
                  <tr key={String(row.id)} className="aura-tx-colors">
                    {/* Sticky-столбец даты */}
                    <td
                      className={cn(
                        'sticky left-0 z-[3] border-r border-b border-[var(--aura-border-soft)] bg-card px-1.5 py-2 text-center text-xs font-medium text-foreground whitespace-nowrap',
                        isLastRow && 'border-b-0'
                      )}
                      style={{ boxShadow: STICKY_COLUMN_SHADOW }}
                    >
                      <span className="max-lg:inline lg:hidden">{formatHistoryDateShort(dateStr)}</span>
                      <span className="hidden lg:inline">{dateStr}</span>
                    </td>

                    {/* % по категориям */}
                    <td className={cn(TABLE_CELL_CN, 'font-medium whitespace-nowrap', isLastRow && 'border-b-0')}>
                      {TASK_CATEGORY_IDS.map((id, idx) => {
                        const raw = completion?.[HISTORY_CATEGORY_PERCENT_KEYS[id]];
                        const v = raw !== null && raw !== undefined && !Number.isNaN(Number(raw))
                          ? Math.round(Math.min(100, Math.max(0, Number(raw))))
                          : null;
                        return (
                          <span key={id} title={categoryLabels[id] ?? id}>
                            {idx > 0 ? <span className="text-muted-foreground/45">+</span> : null}
                            {v != null ? (
                              <span style={{ color: categoryConfig[id].color } as CSSProperties}>{v}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                        );
                      })}
                    </td>

                    {/* Средний % */}
                    <td className={cn(TABLE_CELL_CN, 'font-semibold text-foreground', isLastRow && 'border-b-0')}>
                      {avgPct}%
                    </td>

                    {/* Очки за день */}
                    <td className={cn(
                      TABLE_CELL_CN,
                      'font-medium whitespace-nowrap',
                      daily >= 0 ? 'text-semantic-success' : 'text-semantic-negative',
                      isLastRow && 'border-b-0'
                    )}>
                      {daily >= 0 ? '+' : ''}{Math.round(daily)}
                    </td>

                    {/* Накоплено */}
                    <td className={cn(TABLE_CELL_CN, 'text-muted-foreground whitespace-nowrap', isLastRow && 'border-b-0')}>
                      {Math.round(Number(row.cumulative_points ?? 0))}
                    </td>

                    {/* Статус дня */}
                    <td className={cn(
                      'border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-1 py-2 text-center text-muted-foreground',
                      isLastRow && 'border-b-0'
                    )}>
                      <StatusIc className="inline size-3.5 shrink-0 opacity-80" aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
