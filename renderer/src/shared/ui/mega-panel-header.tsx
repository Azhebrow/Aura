import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MEGA_PANEL_HEADER_CN, MEGA_PANEL_MICRO_TITLE_CN } from '@/shared/ui/mega-section-layout';

type MegaPanelHeaderProps = {
  title: ReactNode;
  right?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  locked?: boolean;
};

export function MegaPanelHeader({
  title,
  right,
  subtitle,
  className,
  locked = false,
}: MegaPanelHeaderProps) {
  return (
    <div className={cn(MEGA_PANEL_HEADER_CN, className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={cn(MEGA_PANEL_MICRO_TITLE_CN, 'inline-flex min-w-0 items-center gap-1.5 truncate')}>
          {locked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : null}
          <span className="truncate">{title}</span>
        </p>
        {subtitle ? <p className="text-muted-foreground text-xs leading-snug">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}
