import { cn } from '@/lib/utils';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';

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
    <div
      className={cn(
        'aura-surface-control inline-flex shrink-0 items-center justify-center rounded-md border',
        size <= 12 ? 'p-0.5' : 'p-1',
        className
      )}
    >
      <ColoredAuraIcon name={name} tint={tint && String(tint).trim() ? tint : 'var(--foreground)'} size={size} />
    </div>
  );
}
