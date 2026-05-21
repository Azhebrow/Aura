import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ShellNavItemProps = {
  icon?: LucideIcon;
  iconNode?: ReactNode;
  accentColor?: string;
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
export function ShellNavItem({ icon: Icon, iconNode, accentColor, children, isActive, onClick, compact, className }: ShellNavItemProps) {
  const colorStyle = accentColor
    ? ({ ['--shell-nav-accent' as string]: accentColor } as CSSProperties)
    : undefined;
  const renderedIcon = iconNode ?? (Icon ? (
    <Icon
      className={cn(
        'shrink-0',
        accentColor ? (compact ? 'size-3.5' : 'size-4') : compact ? 'size-3.5' : 'size-[var(--nav-icon-size)]',
        !accentColor && (isActive ? 'opacity-100' : 'opacity-70')
      )}
      strokeWidth={isActive ? 2.2 : 1.9}
      aria-hidden
    />
  ) : null);

  return (
    <button
      type="button"
      style={colorStyle}
      className={cn(
        'flex w-full items-center rounded-lg text-left font-medium aura-tx-interactive outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        compact ? 'min-h-9 gap-2 px-2 py-2 text-xs' : 'min-h-[var(--nav-item-h)] gap-2.5 px-2.5 py-2.5 text-sm',
        accentColor
          ? isActive
            ? 'bg-[color-mix(in_oklab,var(--shell-nav-accent)_10%,transparent)] text-foreground'
            : 'text-[var(--aura-text-subtle)] hover:bg-[color-mix(in_oklab,var(--shell-nav-accent)_7%,transparent)] hover:text-foreground active:scale-[0.98]'
          : isActive
            ? 'bg-primary/10 text-primary'
            : 'text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground active:scale-[0.98]',
        className
      )}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {accentColor && renderedIcon ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border',
            compact ? 'size-7' : 'size-8',
            isActive
              ? 'border-[color-mix(in_oklab,var(--shell-nav-accent)_26%,transparent)] bg-[color-mix(in_oklab,var(--shell-nav-accent)_12%,transparent)] text-[var(--shell-nav-accent)]'
              : 'border-[color-mix(in_oklab,var(--shell-nav-accent)_18%,transparent)] bg-[color-mix(in_oklab,var(--shell-nav-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--shell-nav-accent)_78%,var(--muted-foreground)_22%)]'
          )}
          aria-hidden
        >
          {renderedIcon}
        </span>
      ) : renderedIcon}
      <span className={cn('min-w-0 flex-1 truncate leading-tight', isActive && 'font-semibold')}>
        {children}
      </span>
    </button>
  );
}
