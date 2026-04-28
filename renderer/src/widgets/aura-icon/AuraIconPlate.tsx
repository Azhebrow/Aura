import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Обводка и подложка под `AuraPublicIcon`, чтобы SVG читались на тёмном фоне. */
export function AuraIconPlate({ children, className, style }: Props) {
  return (
    <span
      className={cn(
        'aura-icon-plate inline-flex shrink-0 items-center justify-center rounded-xl p-1.5 ring-1 ring-foreground/8 ring-inset',
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
