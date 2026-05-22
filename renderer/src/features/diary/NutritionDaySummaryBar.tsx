import { Droplet, Dumbbell, Flame, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { NutritionTotals } from '@/shared/lib/nutrition-aggregate';

type Props = {
  totals: NutritionTotals;
  targets: NutritionTotals;
  className?: string;
};

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

type MacroItem = {
  Icon: LucideIcon;
  label: string;
  current: number;
  target: number;
  color: string;
};

function FlushBar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <div className={cn('h-1 w-full bg-[var(--aura-surface-panel)]', className)}>
      <div
        className="h-full opacity-75 transition-all duration-[400ms] ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** Сводка КБЖУ: единая монолитная панель. */
export function NutritionDaySummaryBar({ totals, targets, className }: Props) {
  const { t } = useTranslation('common');
  const kcalHas = targets.calories > 0;
  const kcalPct = pct(totals.calories, targets.calories);
  const kcalColor = 'var(--chart-7)';

  const macros: MacroItem[] = [
    { Icon: Dumbbell, label: t('macros.proteins'), current: totals.proteins, target: targets.proteins, color: 'var(--nutrition-proteins)' },
    { Icon: Droplet,  label: t('macros.fats'),     current: totals.fats,     target: targets.fats,     color: 'var(--nutrition-fats)'     },
    { Icon: Wheat,    label: t('macros.carbs'),    current: totals.carbs,    target: targets.carbs,    color: 'var(--nutrition-carbs)'    },
  ];

  return (
    <div className={cn('overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs', className)}>
      {/* Calories row */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-2.5"
        style={{ '--kcal-color': kcalColor } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_oklab,var(--kcal-color)_25%,transparent)] bg-[color-mix(in_oklab,var(--kcal-color)_12%,transparent)] text-[var(--kcal-color)]">
            <Flame className="size-4" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-nano font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">
              {t('macros.calories')}
            </p>
            <p className="text-base font-semibold tabular-nums tracking-tight text-foreground">
              {Math.round(totals.calories)}
              {kcalHas ? (
                <span className="text-xs font-normal text-[var(--aura-text-subtle)]">
                  {' '}/ {Math.round(targets.calories)}
                </span>
              ) : null}
              <span className="ml-1 text-nano font-normal normal-case text-[var(--aura-text-subtle)]">
                {t('macros.kcal')}
              </span>
            </p>
          </div>
        </div>
        {kcalHas ? (
          <span className="shrink-0 text-xs tabular-nums text-[var(--aura-text-muted)]">{kcalPct}%</span>
        ) : null}
      </div>

      {/* Full-width flush progress bar */}
      <FlushBar
        value={kcalHas ? kcalPct : totals.calories > 0 ? 100 : 0}
        color={kcalColor}
        className={cn(!kcalHas && totals.calories <= 0 && 'opacity-30')}
      />

      {/* Macros — 3-column grid */}
      <div className="grid grid-cols-3 divide-x divide-[var(--aura-border-soft)] border-t border-[var(--aura-border-soft)]">
        {macros.map(({ Icon, label, current, target, color }) => {
          const hasT = target > 0;
          const p = hasT ? pct(current, target) : current > 0 ? 100 : 0;
          return (
            <div
              key={label}
              className="flex flex-col gap-1.5 px-2.5 py-2"
              style={{ '--macro-color': color } as React.CSSProperties}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_oklab,var(--macro-color)_25%,transparent)] bg-[color-mix(in_oklab,var(--macro-color)_12%,transparent)] text-[var(--macro-color)]">
                  <Icon className="size-3" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="truncate text-nano font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">
                  {label}
                </span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {Math.round(current)}
                <span className="text-nano font-normal text-[var(--aura-text-subtle)]">
                  {hasT ? ` / ${Math.round(target)} г` : ' г'}
                </span>
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--aura-surface-control)]">
                <div
                  className="h-full rounded-full opacity-75 transition-all duration-[400ms] ease-out"
                  style={{ width: `${p}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
