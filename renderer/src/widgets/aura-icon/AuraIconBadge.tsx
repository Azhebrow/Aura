import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';

type Props = {
  name?: string | null;
  tint?: string | null;
  size?: number;
  iconSize?: number;
  className?: string;
};

export function AuraIconBadge({ name, tint, size = 8, iconSize = 16, className }: Props) {
  const color = tint && String(tint).trim() ? String(tint).trim() : 'var(--primary)';
  const side = `${size / 4}rem`;

  return (
    <span
      className={cn('aura-icon-plate flex shrink-0 items-center justify-center rounded-lg border', className)}
      style={{ '--aura-list-icon-tint': color, width: side, height: side } as CSSProperties}
      aria-hidden
    >
      <AuraThemedIcon name={name && String(name).trim() ? name : null} size={iconSize} tint={color} />
    </span>
  );
}
