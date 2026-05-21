import { useMemo, type CSSProperties } from 'react';
import { Circle } from 'lucide-react';
import { normalizeCssColorForPaint } from '@/lib/css-color';
import { cn } from '@/lib/utils';
import { resolveAuraIconFileBase } from '@/shared/lib/aura-icon-name';
import { getAuraPublicIconUrl } from '@/shared/lib/aura-icon-url';
import { AuraPublicIcon } from '@/widgets/aura-icon/AuraPublicIcon';

type Props = {
  name?: string | null;
  /** Любой CSS-цвет: иконка заливается через `mask-image` (как монохромный клип). */
  tint?: string | null;
  className?: string;
  size?: number;
};

function pxToRem(px: number): string {
  return `${px / 16}rem`;
}

function maskStyle(url: string, paint: string, size: number): CSSProperties {
  return {
    display: 'block',
    width: pxToRem(size),
    height: pxToRem(size),
    backgroundColor: 'var(--aura-icon-paint)',
    ['--aura-icon-paint' as string]: paint,
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    // Stroke-only SVG: маска по альфе, иначе luminance даёт «пустую» иконку
    WebkitMaskSourceType: 'alpha',
    maskSourceType: 'alpha',
    maskMode: 'alpha',
  } as CSSProperties;
}

/**
 * Иконка CFG в заданном цвете (без «цветной точки» рядом).
 * Если `tint` не задан — обычный `AuraPublicIcon`.
 */
export function ColoredAuraIcon({ name, tint, className, size = 20 }: Props) {
  const fileBase = useMemo(() => (name ? resolveAuraIconFileBase(String(name)) : ''), [name]);
  const url = useMemo(() => (fileBase ? getAuraPublicIconUrl(fileBase) : ''), [fileBase]);
  const paint = useMemo(() => normalizeCssColorForPaint(tint ?? undefined), [tint]);

  if (!fileBase) {
    return <Circle className={cn('text-muted-foreground shrink-0', className)} style={{ width: pxToRem(size), height: pxToRem(size) }} strokeWidth={1.5} />;
  }

  if (!paint) {
    return <AuraPublicIcon name={name} className={cn('shrink-0 object-contain', className)} style={{ width: pxToRem(size), height: pxToRem(size) }} />;
  }

  return (
    <span
      role="img"
      aria-hidden
      className={cn('aura-colored-icon inline-block shrink-0', className)}
      style={maskStyle(url, paint, size)}
    />
  );
}
