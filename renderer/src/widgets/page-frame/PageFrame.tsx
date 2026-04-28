import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Классы основной колонки контента (`min-h-0`, `gap-*`, `flex-1` и т.д.). */
  contentClassName?: string;
};

/**
 * Каркас страницы: контент в одной колонке с max-width, без дублирующей шапки (название уже в навигации).
 */
export function PageFrame({ children, className, contentClassName }: Props) {
  return (
    <div className={cn('text-foreground flex min-h-0 w-full min-w-0 flex-1 flex-col', className)}>
      <div
        className={cn(
          'transition-opacity duration-300 ease-out flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 sm:gap-5',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
