import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAuraIconFileBase } from '@/shared/lib/aura-icon-name';
import { getAppBaseUrl } from '@/shared/lib/base-url';

type Props = {
  /** Имя файла без `.svg` из `public/icons/` (или с `.svg`). */
  name?: string | null;
  className?: string;
  style?: CSSProperties;
};

function iconUrl(fileBase: string): string {
  const base = getAppBaseUrl();
  // In production (Electron with file://), use the full path to app.asar resources
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // app.asar is in Contents/Resources/, and we need to reference renderer-build/icons
    const appPath = window.location.pathname.split('/app.asar')[0];
    return `file://${appPath}/app.asar/renderer-build/icons/${encodeURIComponent(fileBase)}.svg`;
  }
  return `${base}icons/${encodeURIComponent(fileBase)}.svg`;
}

/** Иконка из тех же SVG, что и legacy (`public/icons`). Работает с `file://` при `base: './'`. */
export function AuraPublicIcon({ name, className, style }: Props) {
  const [broken, setBroken] = useState(false);

  const fileBase = useMemo(() => (name ? resolveAuraIconFileBase(String(name)) : ''), [name]);

  useEffect(() => {
    setBroken(false);
  }, [fileBase]);

  if (!fileBase) {
    return <Circle className={cn('text-muted-foreground size-5 shrink-0', className)} style={style} strokeWidth={1.5} />;
  }

  if (broken) {
    return <Circle className={cn('text-muted-foreground size-5 shrink-0', className)} style={style} strokeWidth={1.5} />;
  }

  return (
    <img
      src={iconUrl(fileBase)}
      alt=""
      className={cn('size-5 shrink-0 object-contain opacity-90', className)}
      style={style}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
