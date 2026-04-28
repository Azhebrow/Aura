import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconWithBadge } from '@/components/ui/icon-with-badge';

type Props = {
  /** @deprecated Раньше давала цветную левую границу; больше не используется — оставлено для совместимости вызовов. */
  accentColor?: string | null;
  /** Показать CFG-иконку в цвете `iconTint` (или без tint — нейтральная). */
  iconName?: string | null;
  iconTint?: string | null;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onMainClick?: () => void;
  className?: string;
  mainClassName?: string;
  /** Компактнее: меньше вертикальные отступы. */
  dense?: boolean;
  /** Если `false` — под подписью не вешается `text-muted-foreground`, чтобы вложенные цвета (например БЖУ) не затирались. */
  subtitleMuted?: boolean;
};

/**
 * Единая строка списка ACT/CFG: сетка контент + слот справа (чекбокс, кнопки).
 */
export function EntityListRow({
  accentColor: _accentColor,
  iconName,
  iconTint,
  leading,
  title,
  subtitle,
  trailing,
  onMainClick,
  className,
  mainClassName,
  dense,
  subtitleMuted = true,
}: Props) {
  const MainTag = onMainClick ? 'button' : 'div';
  const resolvedLeading =
    leading ??
    (iconName ? (
      <IconWithBadge
        iconName={iconName}
        tint={iconTint || undefined}
        size="md"
      />
    ) : null);

  return (
    <div
      className={cn(
        'bg-card text-card-foreground grid min-h-10 items-stretch rounded-md border border-border shadow-sm',
        trailing ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1',
        className
      )}
    >
      <MainTag
        type={onMainClick ? 'button' : undefined}
        onClick={onMainClick}
        className={cn(
          'flex min-w-0 items-center gap-2.5 text-left',
          dense ? 'px-2.5 py-1.5' : 'px-3 py-2',
          onMainClick && 'hover:bg-muted/40 aura-tx-colors',
          mainClassName
        )}
      >
        {resolvedLeading}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-foreground text-sm font-medium leading-snug">{title}</span>
          {subtitle ? (
            <span
              className={cn('text-xs leading-snug', subtitleMuted !== false && 'text-muted-foreground')}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      </MainTag>
      {trailing ? (
        <div
          className={cn(
            'border-border/60 flex shrink-0 items-center justify-center border-l px-2',
            dense ? 'py-1' : 'py-1.5'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
