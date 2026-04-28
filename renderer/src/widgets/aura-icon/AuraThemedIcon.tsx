import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';

type Props = {
  name?: string | null;
  className?: string;
  /** Явный размер в px; иначе по классу `size-*` из Tailwind. */
  size?: number;
  /** `var(--muted-foreground)` вместо основного текста. */
  muted?: boolean;
  /** Явный цвет иконки (например, `currentColor` для активного nav item). */
  tint?: string;
};

function sizeFromClassName(className?: string): number {
  if (!className) return 20;
  if (/\bsize-3\.5\b/.test(className)) return 14;
  if (/\bsize-3\b/.test(className)) return 12;
  if (/\bsize-4\b/.test(className)) return 16;
  if (/\bsize-6\b/.test(className)) return 24;
  if (/\bsize-7\b/.test(className)) return 28;
  return 20;
}

/** CFG-иконка через маску — цвет следует теме (светлая / тёмная / dim). */
export function AuraThemedIcon({ name, className, size, muted, tint }: Props) {
  const px = size ?? sizeFromClassName(className);
  const resolvedTint = tint ?? (muted ? 'var(--muted-foreground)' : 'var(--foreground)');
  return <ColoredAuraIcon name={name} tint={resolvedTint} size={px} className={className} />;
}
