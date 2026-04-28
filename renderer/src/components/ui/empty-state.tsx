import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  hint?: string;
  className?: string;
  compact?: boolean;
};

export function EmptyState({ title, hint, className, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-muted-foreground rounded-xl border border-dashed border-border/75 bg-muted/10',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('flex items-start gap-2.5', compact ? 'text-xs' : 'text-sm')}>
        <Info className={cn('mt-0.5 shrink-0 opacity-70', compact ? 'size-3.5' : 'size-4')} aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground/85 leading-snug">{title}</p>
          {hint ? <p className="text-muted-foreground/90 leading-snug">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
