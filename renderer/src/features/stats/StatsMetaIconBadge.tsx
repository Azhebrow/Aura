import { cn } from '@/lib/utils';
import { AuraIconBadge } from '@/widgets/aura-icon/AuraIconBadge';

type Props = {
  icon?: string | null;
  tint?: string | null;
  size?: number;
  className?: string;
};

const FALLBACK_ICON = 'layers';

export function StatsMetaIconBadge({ icon, tint, size = 14, className }: Props) {
  const name = icon && String(icon).trim() ? String(icon).trim() : FALLBACK_ICON;
  return (
    <AuraIconBadge
      name={name}
      tint={tint && String(tint).trim() ? tint : 'var(--primary)'}
      size={size <= 12 ? 6 : 7}
      iconSize={size}
      className={cn('inline-flex', className)}
    />
  );
}
