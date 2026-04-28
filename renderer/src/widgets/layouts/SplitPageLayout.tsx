import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** Узкая колонка (запись дневника, таймер). */
  primary: ReactNode;
  /** Широкая / вторая колонка. */
  secondary: ReactNode;
  className?: string;
};

/**
 * Двухколоночный шаблон как legacy `layout-sidebar`: на мобиле — вертикальный стек.
 */
export function SplitPageLayout({ primary, secondary, className }: Props) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 lg:grid lg:min-h-0 lg:grid-cols-2 lg:items-stretch lg:gap-6',
        className
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-col">{primary}</div>
      <div className="flex min-h-0 min-w-0 flex-col">{secondary}</div>
    </div>
  );
}
