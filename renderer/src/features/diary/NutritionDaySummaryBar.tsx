import { Droplet, Dumbbell, Flame, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { NutritionTotals } from '@/shared/lib/nutrition-aggregate';
import { formatCompactProgressNumber } from '@/shared/ui/progress-fill-row';

type Props = {
  totals: NutritionTotals;
  targets: NutritionTotals;
  className?: string;
};

type MacroItem = {
  Icon: LucideIcon;
  label: string;
  current: number;
  target: number;
  color: string;
};

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function MacroRow({ Icon, label, current, target, color, unit, className }: MacroItem & { unit: string; className?: string }) {
  const hasTarget = target > 0;
  const progress = hasTarget ? pct(current, target) : current > 0 ? 100 : 0;
  const currentLabel = formatCompactProgressNumber(current);
  const targetLabel = formatCompactProgressNumber(target);

  return (
    <div
      className={cn(
        'aura-operator-row relative grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-lg border border-soft bg-transparent px-2.5 py-2',
        'transition-colors duration-200 hover:border-soft/90 hover:bg-hover/25',
        className
      )}
      style={{ '--fill-row-color': color } as React.CSSProperties}
      title={hasTarget ? `${Math.round(current)} / ${Math.round(target)} ${unit}` : `${Math.round(current)} ${unit}`}
    >
      <span
        className="aura-data-fill pointer-events-none absolute inset-y-0 left-0"
        aria-hidden
        style={{
          width: `${progress}%`,
          background: `color-mix(in oklab, ${color} 34%, transparent)`,
        }}
      />
      <span
        className="aura-icon-plate relative z-10 flex size-6 shrink-0 items-center justify-center rounded-lg border"
        style={{ '--aura-list-icon-tint': color } as React.CSSProperties}
        aria-hidden
      >
        <Icon className="aura-operator-kpi size-3.5" style={{ color }} />
      </span>
      <span className="relative z-10 min-w-0 truncate text-sm font-semibold leading-none text-foreground">
        {label}
      </span>
      <span className="aura-operator-kpi relative z-10 shrink-0 text-right text-sm font-semibold tabular-nums leading-none text-foreground">
        {currentLabel}
        <span className="text-faint">{hasTarget ? ` / ${targetLabel}` : ''} {unit}</span>
      </span>
    </div>
  );
}

/** Сводка КБЖУ: четыре равноправных показателя в компактной сетке 2x2. */
export function NutritionDaySummaryBar({ totals, targets, className }: Props) {
  const { t } = useTranslation('common');
  const kcalColor = 'var(--nutrition-calories, var(--chart-7))';

  const items: MacroItem[] = [
    { Icon: Flame,    label: t('macros.calories'), current: totals.calories, target: targets.calories, color: kcalColor },
    { Icon: Dumbbell, label: t('macros.proteins'), current: totals.proteins, target: targets.proteins, color: 'var(--nutrition-proteins)' },
    { Icon: Droplet,  label: t('macros.fats'),     current: totals.fats,     target: targets.fats,     color: 'var(--nutrition-fats)'     },
    { Icon: Wheat,    label: t('macros.carbs'),    current: totals.carbs,    target: targets.carbs,    color: 'var(--nutrition-carbs)'    },
  ];

  return (
    <section className={cn('grid shrink-0 gap-2 @container', className)}>
      <div className="grid gap-2 @[520px]:grid-cols-2">
        {items.map((item) => (
          <MacroRow
            key={item.label}
            {...item}
            unit={item.label === t('macros.calories') ? t('macros.kcal') : 'г'}
          />
        ))}
      </div>
    </section>
  );
}
