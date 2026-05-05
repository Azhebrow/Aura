import { Droplet, Dumbbell, Flame, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
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

const PROGRESS_NEUTRAL =
  'bg-muted/80 [&_[data-slot=progress-indicator]]:bg-foreground/25 dark:[&_[data-slot=progress-indicator]]:bg-foreground/35';

function MacroCell({
  Icon,
  label,
  current,
  target,
  unit,
}: {
  Icon: LucideIcon;
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const hasT = target > 0;
  const p = hasT ? pct(current, target) : current > 0 ? 100 : 0;
  return (
    <div className="border-border/50 bg-background/80 flex min-h-[4.25rem] min-w-0 flex-col gap-1.5 rounded-md border px-2.5 py-2">
      <div className="flex items-center gap-2">
        <div className="bg-muted/60 text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded border border-border/50">
          <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
        </div>
        <span className="text-muted-foreground truncate text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-foreground font-mono text-sm font-semibold tabular-nums">
        {Math.round(current)}
        {hasT ? (
          <span className="text-muted-foreground text-xs font-normal">
            {' '}
            / {Math.round(target)}
            {unit}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs font-normal">{unit}</span>
        )}
      </p>
      <Progress value={hasT ? p : current > 0 ? 100 : 0} className={cn('h-1', PROGRESS_NEUTRAL, !hasT && current <= 0 && 'opacity-40')} />
    </div>
  );
}

/** Сводка КБЖУ: строгая сетка, нейтральная палитра токенов темы. */
export function NutritionDaySummaryBar({ totals, targets, className }: Props) {
  const { t } = useTranslation('common');
  const kcalHas = targets.calories > 0;
  const kcalPct = pct(totals.calories, targets.calories);

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="border-border/50 flex flex-col gap-2 border-b pb-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-muted/60 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded border border-border/50">
              <Flame className="size-4" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t('macros.calories')}</p>
              <p className="text-foreground font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                {Math.round(totals.calories)}
                {kcalHas ? (
                  <span className="text-muted-foreground text-sm font-normal sm:text-base">
                    {' '}
                    / {Math.round(targets.calories)}
                  </span>
                ) : null}
                <span className="text-muted-foreground ml-1 text-xs font-normal normal-case">{t('macros.kcal')}</span>
              </p>
            </div>
          </div>
          {kcalHas ? (
            <span className="text-muted-foreground font-mono text-xs tabular-nums">{kcalPct}%</span>
          ) : null}
        </div>
        <Progress
          value={kcalHas ? kcalPct : totals.calories > 0 ? 100 : 0}
          className={cn('h-1.5', PROGRESS_NEUTRAL, !kcalHas && totals.calories <= 0 && 'opacity-40')}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2">
        <MacroCell Icon={Dumbbell} label={t('macros.proteins')} current={totals.proteins} target={targets.proteins} unit=" г" />
        <MacroCell Icon={Droplet} label={t('macros.fats')} current={totals.fats} target={targets.fats} unit=" г" />
        <MacroCell Icon={Wheat} label={t('macros.carbs')} current={totals.carbs} target={targets.carbs} unit=" г" />
      </div>
    </div>
  );
}
