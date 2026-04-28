import type { CSSProperties, ReactNode } from 'react';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { cn } from '@/lib/utils';

type IconWithBadgeProps = {
  iconName?: string | null;
  tint?: string;
  badge?: ReactNode;
  className?: string;
  /** Переопределение стилей “плитки” под иконкой (фон/рамка/размер контейнера). */
  surfaceClassName?: string;
  surfaceStyle?: CSSProperties;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizeConfig = {
  xs: { container: 'size-5', icon: 12, badge: 'size-2.5' },
  sm: { container: 'size-6', icon: 14, badge: 'size-3' },
  md: { container: 'size-8', icon: 18, badge: 'size-4' },
  lg: { container: 'size-10', icon: 20, badge: 'size-5' },
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

  return (
    <div className={cn('relative shrink-0', className)}>
      <span
        className={cn(
          'flex items-center justify-center rounded-md',
          config.container,
          surfaceClassName ?? 'bg-muted/50 ring-border/80 ring-1'
        )}
        style={surfaceStyle}
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
