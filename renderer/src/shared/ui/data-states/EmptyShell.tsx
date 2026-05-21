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
        'flex flex-col items-center justify-center gap-aura-sm rounded-lg border border-dashed border-[var(--aura-border-soft)] bg-transparent p-aura-lg text-center',
        className
      )}
    >
      <Icon className="size-9 text-[var(--aura-text-disabled)]" aria-hidden />
      <p className="aura-body-muted text-sm leading-snug">{message}</p>
      {action && <div className="mt-aura-xs">{action}</div>}
    </div>
  );
}
