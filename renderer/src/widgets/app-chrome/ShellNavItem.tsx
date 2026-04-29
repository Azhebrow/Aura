import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ShellNavItemProps = {
  icon?: LucideIcon;
  iconNode?: ReactNode;
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  /** Узкая колонка настроек: меньше отступы и шрифт. */
  compact?: boolean;
  className?: string;
};

/**
 * Единый стиль пункта боковой навигации (основной shell и настройки).
 */
export function ShellNavItem({ icon: Icon, iconNode, children, isActive, onClick, compact, className }: ShellNavItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center rounded-xl text-left font-medium aura-tx-interactive outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        compact ? 'min-h-9 gap-2 px-2.5 py-2 text-xs' : 'min-h-[var(--nav-item-h)] gap-3 px-3 py-2.5 text-sm',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-[0.98]',
        className
      )}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {iconNode ?? (Icon ? (
        <Icon
          className={cn(
            'shrink-0',
            compact ? 'size-3.5' : 'size-[var(--nav-icon-size)]',
            isActive ? 'opacity-100' : 'opacity-70'
          )}
          strokeWidth={isActive ? 2.2 : 1.9}
          aria-hidden
        />
      ) : null)}
      <span className={cn('min-w-0 flex-1 truncate leading-tight', isActive && 'font-semibold')}>
        {children}
      </span>
    </button>
  );
}
