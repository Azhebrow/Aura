import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function formatCompactProgressNumber(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '0');
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const fmt = (divisor: number, suffix: string) => {
    const scaled = abs / divisor;
    const digits = scaled >= 10 ? 0 : 1;
    return `${sign}${scaled.toFixed(digits).replace(/\.0$/, '')}${suffix}`;
  };
  if (abs >= 1_000_000_000) return fmt(1_000_000_000, 'B');
  if (abs >= 1_000_000) return fmt(1_000_000, 'M');
  if (abs >= 1_000) return fmt(1_000, 'K');
  return `${Math.round(n)}`;
}

type ProgressFillRowProps = {
  title: ReactNode;
  value: ReactNode;
  icon: ReactNode;
  color: string;
  progress?: number;
  titleClassName?: string;
  valueClassName?: string;
  valueTitle?: string;
  action?: ReactNode;
  className?: string;
  compactValue?: boolean;
};

export function ProgressFillRow({
  title,
  value,
  icon,
  color,
  progress = 0,
  titleClassName,
  valueClassName,
  valueTitle,
  action,
  className,
  compactValue = false,
}: ProgressFillRowProps) {
  const pct = Math.max(0, Math.min(100, Number(progress) || 0));
  const hasProgress = pct > 0;

  return (
    <div
      className={cn(
        'aura-operator-row relative grid min-h-12 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-soft bg-transparent',
        'transition-colors duration-200 hover:border-soft/90 hover:bg-hover/25',
        className
      )}
      style={{ '--fill-row-color': color } as React.CSSProperties}
    >
      <span
        className="aura-data-fill pointer-events-none absolute inset-y-0 left-0"
        aria-hidden
        style={{
          width: `${pct}%`,
          background: `color-mix(in oklab, ${color} 34%, transparent)`,
        }}
      />
      <div className="relative z-10 flex min-w-0 items-center gap-2 px-2.5 py-2">
        <span
          className="aura-icon-plate flex size-6 shrink-0 items-center justify-center rounded-lg border"
          style={{ '--aura-list-icon-tint': color } as React.CSSProperties}
          aria-hidden
        >
          {icon}
        </span>
        <span
          className={cn(
            'min-w-0 truncate text-xs font-medium leading-none text-foreground',
            hasProgress && 'font-semibold',
            titleClassName
          )}
        >
          {title}
        </span>
      </div>
      <div className="relative z-10 flex min-w-0 shrink-0 items-stretch border-l border-soft/60">
        <div
          className={cn(
            'flex h-full min-w-0 items-center justify-center px-2 text-center',
            compactValue ? 'w-[5.75rem]' : 'w-[6.5rem]'
          )}
          title={valueTitle}
        >
          <span
          className={cn(
            'aura-operator-kpi min-w-0 truncate text-[0.7rem] font-semibold tabular-nums leading-none text-foreground',
              pct >= 100 && 'text-[var(--fill-row-color)]',
              valueClassName
            )}
          >
            {value}
          </span>
        </div>
        {action ? <div className="flex h-full shrink-0 items-center border-l border-soft/50 px-1">{action}</div> : null}
      </div>
    </div>
  );
}
