import type { CSSProperties } from 'react';
import { Calendar } from 'lucide-react';
import type { StatsFormattedRow, StatsFormattedTable } from '@/shared/stats/stats-table-format';
import type { StatsMeta, StatsMode } from '@/shared/stats/types';
import { AURA_STATIC_SEMANTIC, FINANCE_SEMANTIC, MOOD_SCALE } from '@/shared/design/aura-palette';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
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

function softTint(color: string, alpha: number): string {
  return color.toLowerCase().startsWith('hsl(')
    ? color.replace('hsl(', 'hsla(').replace(')', ` / ${alpha})`)
    : color;
}

export function StatsTableView({ mode, table, meta, selectedSeriesKeys }: Props) {
  const cols = visibleColumns(table.columns, selectedSeriesKeys);
  const ranges = new Map(cols.map((col) => [col, columnRange(table.rows, col)]));

  if (!table.rows.length) {
    return (
      <div className="border-border/60 text-muted-foreground flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/10 p-8 text-center text-sm">
        Нет данных за выбранный период. Смените режим или расширьте даты.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="border-border/60 bg-card/70 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
        <div className="relative min-h-0 flex-1 overflow-auto">
          <table className="border-border/60 w-max min-w-full table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col className="w-[6.5rem] sm:w-[8rem]" />
              {cols.map((col) => (
                <col key={col} className="w-[6.25rem] sm:w-[8rem]" />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-[4]">
              <tr>
                <th className="border-border/60 bg-muted/60 text-muted-foreground sticky left-0 top-0 z-[6] border border-b-2 border-r-2 border-border px-2 py-2 text-center align-middle sm:py-3">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Calendar className="text-muted-foreground size-4 shrink-0 opacity-80" aria-hidden />
                    <span className="hidden text-xs font-semibold uppercase tracking-wider sm:inline">Период</span>
                  </div>
                </th>
                {cols.map((col) => (
                  <th
                    key={col}
                    className="border-border/60 bg-muted/60 text-muted-foreground sticky top-0 z-[5] border border-b-2 border-b-border px-2 py-2 text-center align-middle sm:py-3"
                  >
                    <div className="mx-auto flex max-w-[8.5rem] flex-col items-center justify-center gap-1.5">
                      {meta.icons[col] ? (
                        <IconWithBadge
                          iconName={meta.icons[col]}
                          tint={meta.colors[col]}
                          size="md"
                        />
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
              {table.rows.map((row: StatsFormattedRow, ri) => (
                <tr key={row.date}>
                  <td
                    className={cn(
                      'border-border/50 text-foreground sticky left-0 z-[3] border px-2 py-2.5 text-xs font-medium',
                      ri % 2 === 1 ? 'bg-muted/40' : 'bg-background'
                    )}
                  >
                    {row.label}
                  </td>
                  {cols.map((col) => (
                    <td key={col} className={cn('border-border/50 border px-2 py-2.5 text-center text-xs tabular-nums', ri % 2 === 1 && 'bg-muted/[0.02]')}>
                      {(() => {
                        const raw = numericCell(row.originalValues[col]);
                        const range = ranges.get(col);
                        const span = range ? Math.max(range.max - range.min, 0) : 0;
                        const strength = raw != null && range && span > 0 ? (raw - range.min) / span : null;
                        const success = successPercent(raw, row.values[col]);
                        const isNegFinance = mode === 'finance' && raw != null && raw < 0;
                        const isPosFinance = mode === 'finance' && raw != null && raw > 0;
                        const moodLevel = mode === 'mood' && raw != null ? Math.max(1, Math.min(5, Math.round(raw))) : null;
                        let badgeStyle: CSSProperties | undefined;

                        if (mode === 'finance') {
                          if (isPosFinance) {
                            badgeStyle = {
                              backgroundColor: softTint(FINANCE_SEMANTIC.income, 0.16),
                              borderColor: softTint(FINANCE_SEMANTIC.income, 0.32),
                            };
                          } else if (isNegFinance) {
                            badgeStyle = {
                              backgroundColor: softTint(FINANCE_SEMANTIC.expense, 0.16),
                              borderColor: softTint(FINANCE_SEMANTIC.expense, 0.32),
                            };
                          } else {
                            badgeStyle = {
                              backgroundColor: softTint(FINANCE_SEMANTIC.transfer, 0.14),
                              borderColor: softTint(FINANCE_SEMANTIC.transfer, 0.28),
                            };
                          }
                        } else if (moodLevel != null) {
                          const moodColor = MOOD_SCALE[moodLevel];
                          badgeStyle = {
                            backgroundColor: softTint(moodColor, 0.15),
                            borderColor: softTint(moodColor, 0.3),
                          };
                        } else if (success != null) {
                          const scoreColor =
                            success >= 75
                              ? AURA_STATIC_SEMANTIC.success
                              : success >= 45
                                ? AURA_STATIC_SEMANTIC.warning
                                : AURA_STATIC_SEMANTIC.danger;
                          badgeStyle = {
                            backgroundColor: softTint(scoreColor, 0.14),
                            borderColor: softTint(scoreColor, 0.28),
                          };
                        } else if (strength != null) {
                          badgeStyle = {
                            backgroundColor: softTint(AURA_STATIC_SEMANTIC.info, Number((0.06 + strength * 0.12).toFixed(3))),
                            borderColor: softTint(AURA_STATIC_SEMANTIC.info, Number((0.14 + strength * 0.18).toFixed(3))),
                          };
                        }

                        return (
                          <span
                            className={cn(
                              'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 font-medium',
                              isNegFinance && 'text-destructive',
                              isPosFinance && 'text-emerald-600 dark:text-emerald-400'
                            )}
                            style={badgeStyle}
                            title={
                              raw != null && range
                                ? `Мин: ${range.min.toLocaleString('ru-RU')} · Макс: ${range.max.toLocaleString('ru-RU')}`
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
