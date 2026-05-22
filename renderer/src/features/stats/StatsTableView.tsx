import type { CSSProperties } from 'react';
import type { StatsFormattedRow, StatsFormattedTable } from '@/features/stats/stats-table-format';
import type { StatsMeta, StatsMode } from '@/features/stats/types';
import { AURA_STATIC_SEMANTIC, FINANCE_SEMANTIC, MOOD_SCALE } from '@/shared/config/aura-palette';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import { useDragScroll } from '@/shared/hooks/use-drag-scroll';
import { cn } from '@/lib/utils';

type Props = {
  mode: StatsMode;
  table: StatsFormattedTable;
  meta: StatsMeta;
  selectedSeriesKeys: string[] | null;
};

function visibleColumns(columns: string[], selected: string[] | null): string[] {
  if (selected === null) return columns;
  return columns.filter((c) => selected.includes(c));
}

function numericCell(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function columnRange(rows: StatsFormattedRow[], col: string): { min: number; max: number } | null {
  const nums = rows.map((r) => numericCell(r.originalValues[col])).filter((v): v is number => v !== null);
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function successPercent(raw: number | null, formatted: string | undefined): number | null {
  if (raw == null) return null;
  const hasPercent = typeof formatted === 'string' && formatted.includes('%');
  if (!hasPercent) return null;
  const pct = raw <= 1 ? raw * 100 : raw;
  if (!Number.isFinite(pct)) return null;
  return Math.max(0, Math.min(100, pct));
}

function tintStyle(color: string, bgAlpha: number, borderAlpha?: number, extra?: Partial<CSSProperties>): CSSProperties {
  const border = borderAlpha ?? Math.min(0.42, bgAlpha + 0.12);
  return {
    backgroundColor: `color-mix(in srgb, ${color} ${Math.round(bgAlpha * 100)}%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} ${Math.round(border * 100)}%, transparent)`,
    ...extra,
  };
}

function makeCellStyle(mode: StatsMode, colColor: string | undefined, raw: number | null, formatted: string | undefined, range: { min: number; max: number } | null): CSSProperties | undefined {
  const span = range ? Math.max(range.max - range.min, 0) : 0;
  const strength = raw != null && range && span > 0 ? (raw - range.min) / span : null;
  const hasRange = Boolean(range && range.max !== range.min);
  const isMin = hasRange && raw === range?.min;
  const isMax = hasRange && raw === range?.max;
  const success = successPercent(raw, formatted);
  const normalizedStrength = raw != null ? Math.min(1, Math.abs(raw)) : null;

  if (mode === 'finance') {
    if (raw == null) return undefined;
    if (raw > 0) {
      return tintStyle(FINANCE_SEMANTIC.income, isMax ? 0.18 : isMin ? 0.08 : 0.14, isMax ? 0.36 : 0.3, isMax ? { boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--finance-income) 35%, transparent)' } : undefined);
    }
    if (raw < 0) {
      return tintStyle(FINANCE_SEMANTIC.expense, isMax ? 0.18 : isMin ? 0.08 : 0.14, isMax ? 0.36 : 0.3, isMax ? { boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--finance-expense) 35%, transparent)' } : undefined);
    }
    return tintStyle(FINANCE_SEMANTIC.transfer, isMax ? 0.16 : isMin ? 0.07 : 0.12, isMax ? 0.3 : 0.26);
  }

  if (mode === 'mood' && raw != null) {
    const level = Math.max(1, Math.min(5, Math.round(raw)));
    return tintStyle(MOOD_SCALE[level], isMax ? 0.18 : isMin ? 0.08 : 0.14, isMax ? 0.34 : 0.28, isMax ? { boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--semantic-success) 24%, transparent)' } : undefined);
  }

  if (success != null) {
    const token = success >= 75 ? AURA_STATIC_SEMANTIC.success : success >= 45 ? AURA_STATIC_SEMANTIC.warning : AURA_STATIC_SEMANTIC.danger;
    const bgAlpha = Math.max(0.06, Math.min(0.18, 0.06 + success / 650));
    const borderAlpha = Math.max(0.16, Math.min(0.34, 0.16 + success / 500));
    return tintStyle(token, isMax ? bgAlpha + 0.03 : isMin ? bgAlpha - 0.02 : bgAlpha, isMax ? borderAlpha + 0.05 : borderAlpha, isMax ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${token} 28%, transparent)` } : isMin ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${token} 14%, transparent)` } : undefined);
  }

  if (mode === 'correlation' && raw != null) {
    const token = raw >= 0 ? AURA_STATIC_SEMANTIC.success : AURA_STATIC_SEMANTIC.danger;
    const intensity = normalizedStrength ?? 0;
    const bgAlpha = 0.08 + intensity * 0.08;
    const borderAlpha = 0.18 + intensity * 0.18;
    return tintStyle(token, isMax ? bgAlpha + 0.04 : isMin ? bgAlpha - 0.02 : bgAlpha, isMax ? borderAlpha + 0.05 : borderAlpha, isMax ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${token} 28%, transparent)` } : undefined);
  }

  if (colColor) {
    return tintStyle(colColor, isMax ? 0.16 : isMin ? 0.06 : 0.08, isMax ? 0.3 : 0.18, isMax ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colColor} 26%, transparent)` } : undefined);
  }

  if (strength != null) {
    const bgAlpha = 0.06 + strength * 0.08;
    const borderAlpha = 0.14 + strength * 0.14;
    return tintStyle(AURA_STATIC_SEMANTIC.info, isMax ? bgAlpha + 0.04 : isMin ? bgAlpha - 0.02 : bgAlpha, isMax ? borderAlpha + 0.04 : borderAlpha, isMax ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${AURA_STATIC_SEMANTIC.info} 28%, transparent)` } : isMin ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${AURA_STATIC_SEMANTIC.info} 14%, transparent)` } : undefined);
  }

  return undefined;
}

const STICKY_HEADER_SHADOW = 'inset 0 -1px 0 hsl(var(--border) / 0.35)';
const STICKY_COLUMN_SHADOW = 'inset -1px 0 0 hsl(var(--border) / 0.35)';
const STICKY_CORNER_SHADOW = `${STICKY_HEADER_SHADOW}, ${STICKY_COLUMN_SHADOW}`;

export function StatsTableView({ mode, table, meta, selectedSeriesKeys }: Props) {
  const { ref: scrollRef, isDragging, dragScrollHandlers } = useDragScroll<HTMLDivElement>();
  const cols = visibleColumns(table.columns, selectedSeriesKeys);
  const ranges = new Map(cols.map((col) => [col, columnRange(table.rows, col)]));

  if (!table.rows.length) {
    return (
      <div className="aura-surface-control text-[var(--aura-text-subtle)] flex flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm">
        Нет данных за выбранный период. Смените режим или расширьте даты.
      </div>
    );
  }

  if (cols.length === 0) {
    return (
      <div className="aura-surface-control flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="max-w-sm space-y-2">
          <p className="aura-body-muted text-sm">Сейчас скрыты все серии. Включите хотя бы одну серию слева, чтобы показать таблицу.</p>
        </div>
      </div>
    );
  }

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
              <col className="w-[6.5rem] sm:w-[8rem]" />
              {cols.map((col) => (
                <col key={col} className="w-[6.25rem] sm:w-[8rem]" />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-[4]">
              <tr>
                <th
                  className="bg-card text-[var(--aura-text-muted)] sticky left-0 top-0 z-[6] border-b border-r border-[var(--aura-border-soft)]/40 px-2 py-2 text-left align-middle sm:py-3"
                  style={{ boxShadow: STICKY_CORNER_SHADOW }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Период</span>
                </th>
                {cols.map((col, colIdx) => (
                  <th
                    key={col}
                    className={cn(
                      'bg-card text-[var(--aura-text-muted)] sticky top-0 z-[5] border-b border-r border-[var(--aura-border-soft)]/40 px-2 py-2 text-center align-middle sm:py-3',
                      colIdx === cols.length - 1 && 'border-r-0'
                    )}
                    style={{ boxShadow: STICKY_HEADER_SHADOW }}
                  >
                    <div className="mx-auto flex max-w-[8.5rem] flex-col items-center justify-center gap-1.5">
                      {meta.icons[col] ? (
                        <IconWithBadge iconName={meta.icons[col]} tint={meta.colors[col]} size="md" />
                      ) : (
                        <span className="bg-muted-foreground/25 size-5 shrink-0 rounded-full" aria-hidden />
                      )}
                      <span className="hidden line-clamp-3 text-xs font-semibold leading-tight tracking-tight sm:inline">
                        {col}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row: StatsFormattedRow, rowIdx) => (
                <tr key={row.date}>
                  <td
                    className={cn(
                      'text-foreground sticky left-0 z-[4] border-r border-b border-[var(--aura-border-soft)] bg-card px-2 py-2.5 text-xs font-medium',
                      rowIdx === table.rows.length - 1 && 'border-b-0'
                    )}
                    style={{ boxShadow: STICKY_COLUMN_SHADOW }}
                  >
                    {row.label}
                  </td>
                  {cols.map((col, colIdx) => (
                    <td
                      key={col}
                      className={cn(
                        'border-r border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-2 py-2.5 text-center text-xs tabular-nums',
                        colIdx === cols.length - 1 && 'border-r-0',
                        rowIdx === table.rows.length - 1 && 'border-b-0'
                      )}
                    >
                      {(() => {
                        const raw = numericCell(row.originalValues[col]);
                        const range = ranges.get(col);
                        const badgeStyle = makeCellStyle(mode, meta.colors[col], raw, row.values[col], range ?? null);
                        const isMin = Boolean(range && range.max !== range.min && raw === range.min);
                        const isMax = Boolean(range && range.max !== range.min && raw === range.max);

                        return (
                          <span
                            className={cn(
                              'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 font-medium text-foreground shadow-none',
                              isMin && 'ring-1 ring-inset ring-border/70',
                              isMax && 'ring-2 ring-inset ring-primary/35 font-semibold'
                            )}
                            style={badgeStyle}
                            title={
                              raw != null && range
                                ? `${isMin ? 'Минимум' : isMax ? 'Максимум' : 'Значение'} · Мин: ${range.min.toLocaleString('ru-RU')} · Макс: ${range.max.toLocaleString('ru-RU')}`
                                : undefined
                            }
                          >
                            <span className="truncate">{row.values[col] ?? '—'}</span>
                          </span>
                        );
                      })()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
