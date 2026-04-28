import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MEGA_PANEL_MICRO_TITLE_CN } from '@/shared/ui/mega-section-layout';

type Props = {
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
};

/**
 * Оболочка секции графика: карточка, градиент и типографика в духе [Evil Charts](https://evilcharts.com/) (registry на Recharts).
 */
export function StatsChartShell({ title, hint, children, className }: Props) {
  return (
    <div
      className={cn(
        'border-border/70 from-muted/25 via-card/95 to-card flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border bg-gradient-to-b p-3 shadow-sm sm:p-4',
        className
      )}
    >
      <div className="mb-1.5 flex min-w-0 shrink-0 flex-col gap-1 sm:mb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h3 className={cn(MEGA_PANEL_MICRO_TITLE_CN, 'shrink-0 text-foreground')}>{title}</h3>
        <p
          className="text-muted-foreground line-clamp-2 max-w-[min(100%,18rem)] text-xs leading-snug sm:text-right"
          title={hint}
        >
          {hint}
        </p>
      </div>
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 basis-0 flex-col">{children}</div>
    </div>
  );
}
