import { Info } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  hint?: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  action?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
  className?: string;
  compact?: boolean;
};

export function EmptyState({ title, hint, icon: Icon = Info, action, tone = 'neutral', className, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'aura-surface-control mb-2 w-full rounded-xl border border-dashed text-[var(--aura-text-muted)] last:mb-0',
        tone === 'success' && 'border-semantic-success/35 bg-semantic-success/8',
        tone === 'warning' && 'border-semantic-warning/35 bg-semantic-warning/8',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('flex items-start gap-2.5', compact ? 'text-xs' : 'text-sm')}>
        <Icon className={cn('mt-0.5 shrink-0 opacity-75', compact ? 'size-3.5' : 'size-4')} aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground/85 leading-snug">{title}</p>
          {hint ? <p className="aura-body-muted leading-snug">{hint}</p> : null}
          {action ? <div className={cn('pt-1', compact ? 'text-xs' : 'text-sm')}>{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
