import type { CSSProperties, ReactNode } from 'react';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { cn } from '@/lib/utils';

type IconWithBadgeProps = {
  iconName?: string | null;
  tint?: string;
  badge?: ReactNode;
  className?: string;
  /** Переопределение контейнера под иконкой для мест, где нужна отдельная плитка. */
  surfaceClassName?: string;
  surfaceStyle?: CSSProperties;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizeConfig = {
  xs: { container: 'size-5', icon: 11, badge: 'size-2.5' },
  sm: { container: 'size-6', icon: 13, badge: 'size-3' },
  md: { container: 'size-7', icon: 14, badge: 'size-4' },
  lg: { container: 'size-8', icon: 16, badge: 'size-5' },
};

export function IconWithBadge({
  iconName,
  tint = 'var(--primary)',
  badge,
  className,
  surfaceClassName,
  surfaceStyle,
  size = 'md',
}: IconWithBadgeProps) {
  const config = sizeConfig[size];
  const defaultSurfaceStyle = {
    ['--aura-list-icon-tint' as string]: tint,
    backgroundColor: 'color-mix(in oklab, var(--aura-list-icon-tint) 10%, transparent)',
    borderColor: 'color-mix(in oklab, var(--aura-list-icon-tint) 20%, transparent)',
  } satisfies CSSProperties;

  return (
    <div className={cn('relative shrink-0', className)}>
      <span
        className={cn(
          'flex items-center justify-center rounded-lg border',
          config.container,
          surfaceClassName
        )}
        style={surfaceStyle ?? defaultSurfaceStyle}
      >
        <ColoredAuraIcon
          name={iconName}
          tint={tint}
          size={config.icon}
        />
      </span>
      {badge && (
        <span className={cn(
          'bg-background ring-border/70 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-1 shadow-sm',
          config.badge
        )}>
          {badge}
        </span>
      )}
    </div>
  );
}
