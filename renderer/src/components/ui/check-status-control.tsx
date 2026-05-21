import { Check, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type CheckStatusControlProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  ariaLabel?: string;
  showLabel?: boolean;
  checkedLabel?: string;
  uncheckedLabel?: string;
};

export function CheckStatusControl({
  checked,
  onCheckedChange,
  className,
  showLabel = false,
  checkedLabel = 'Выполнено',
  uncheckedLabel = 'Не выполнено',
  ariaLabel,
}: CheckStatusControlProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-1.5 aura-tx-colors',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex size-5 items-center justify-center rounded-md border aura-tx-interactive',
          checked
            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
            : 'border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-transparent hover:border-[var(--aura-border-strong)] hover:bg-[var(--aura-action-hover-bg)]'
        )}
      >
        {checked ? (
          <Check className="size-3 shrink-0" strokeWidth={3} />
        ) : (
          <Circle className="size-2 shrink-0" />
        )}
      </span>
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-label={ariaLabel}
        className="hidden"
      />
      {showLabel ? (
        <span className={cn('text-xs font-medium whitespace-nowrap', checked ? 'text-foreground' : 'text-[var(--aura-text-subtle)]')}>
          {checked ? checkedLabel : uncheckedLabel}
        </span>
      ) : null}
    </label>
  );
}
