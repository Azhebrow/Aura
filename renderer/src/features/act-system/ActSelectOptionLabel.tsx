import type { CSSProperties } from 'react';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  icon?: string | null;
  color?: string | null;
  className?: string;
};

export function ActSelectOptionLabel({ label, icon, color, className }: Props) {
  const hasColor = Boolean(color?.trim());
  const tint = hasColor ? color!.trim() : 'var(--select-item-tint, currentColor)';

  return (
    <span className={cn('aura-operator-kpi flex min-w-0 items-center gap-2', className)} style={{ color: tint }}>
      {icon ? (
        <span className="aura-icon-plate aura-inline-icon flex size-5 shrink-0 items-center justify-center text-current" style={{ '--aura-list-icon-tint': tint } as CSSProperties}>
          <AuraThemedIcon name={icon} size={12} tint="currentColor" />
        </span>
      ) : hasColor ? (
        <span
          className="aura-operator-swatch size-1.5 shrink-0 rounded-full bg-current"
          aria-hidden
        />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />
      )}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
