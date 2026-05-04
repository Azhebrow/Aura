import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  header: ReactNode;
  children: ReactNode;
  /** Если `null` — только прокручиваемая область (например, полноэкранный выбор). */
  footer?: ReactNode | null;
  className?: string;
  /** Классы для средней зоны (например `overflow-hidden` + внутренний ScrollArea). */
  bodyClassName?: string;
};

/**
 * Каркас модалок настроек: шапка + вертикальный скролл тела + опциональный футер.
 * Решает конфликт `ScrollArea`/`flex-1` без явной высоты и налезание футера на контент.
 */
export function SettingsDialogLayout({ header, children, footer, className, bodyClassName }: Props) {
  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col overflow-hidden', className)}>
      <div className="border-border/80 shrink-0 border-b px-3 pt-2.5 pb-2.5 sm:px-4">{header}</div>
      <div
        className={cn(
          bodyClassName ??
            'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2.5 sm:px-4 sm:py-3'
        )}
      >
        {children}
      </div>
      {footer != null ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
