import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MEGA_SECTION_CONTROL_CARD_CN } from '@/shared/ui/mega-section-layout';

type SectionControlCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function SectionControlCard({ children, className, style }: SectionControlCardProps) {
  return (
    <div className={cn(MEGA_SECTION_CONTROL_CARD_CN, className)} style={style}>
      {children}
    </div>
  );
}
