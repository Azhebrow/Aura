import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Подпись секции — единый стиль для всех мелких заголовков-надписей:
 * uppercase, разрядка, полужирный, приглушённый цвет.
 *
 * Заменяет инлайн-комбинацию, которая раньше дублировалась по всему UI
 * (в т.ч. в разном порядке слов):
 *   `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
 *
 * Рендерится как <p>; доп. классы (отступы и т.п.) — через className.
 */
export function Caption({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
