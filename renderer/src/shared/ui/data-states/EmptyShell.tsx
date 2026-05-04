import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  message?:   string;
  icon?:      LucideIcon;
  action?:    ReactNode;
  className?: string;
};

/**
 * EmptyShell — universal empty state.
 * Every empty list, panel, or section uses this. No ad-hoc "Нет данных" paragraphs.
 */
export function EmptyShell({
  message = 'Нет данных',
  icon: Icon = InboxIcon,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-aura-md p-aura-xl text-center',
        className
      )}
    >
      <Icon className="text-muted-foreground/40 size-9" aria-hidden />
      <p className="text-muted-foreground text-sm leading-snug">{message}</p>
      {action && <div className="mt-aura-xs">{action}</div>}
    </div>
  );
}
