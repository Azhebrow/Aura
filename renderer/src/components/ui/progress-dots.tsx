import { cn } from '@/lib/utils';

type ProgressDotsProps = {
  filled: number;
  total: number;
  size?: 'xs' | 'sm';
};

export function ProgressDots({ filled, total, size = 'xs' }: ProgressDotsProps) {
  if (total <= 0) return null;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full aura-tx-colors',
            i < filled ? 'bg-foreground/70' : 'bg-muted/50',
            size === 'xs' ? 'size-1.5' : 'size-2'
          )}
        />
      ))}
    </div>
  );
}
