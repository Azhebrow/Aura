import { cn } from '@/lib/utils';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';

type Props = {
  /** Имя иконки Aura (из CFG / meta). */
  icon?: string | null;
  tint?: string | null;
  size?: number;
  className?: string;
};

const FALLBACK_ICON = 'layers';

/**
 * Иконка на мягкой подложке — для тултипов, легенды, списков (вместо «голых» цветных точек).
 */
export function StatsMetaIconBadge({ icon, tint, size = 14, className }: Props) {
  const name = icon && String(icon).trim() ? String(icon).trim() : FALLBACK_ICON;
  return (
    <div
      className={cn(
        'border-border/60 bg-muted/40 inline-flex shrink-0 items-center justify-center rounded-lg border shadow-sm ring-1 ring-foreground/8 dark:bg-muted/25',
        size <= 12 ? 'p-0.5' : 'p-1',
        className
      )}
    >
      <ColoredAuraIcon name={name} tint={tint && String(tint).trim() ? tint : 'var(--foreground)'} size={size} />
    </div>
  );
}
