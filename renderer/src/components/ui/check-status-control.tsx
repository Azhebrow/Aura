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
        'inline-flex items-center gap-1.5 transition-all duration-aura-base ease-aura',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex size-5 items-center justify-center rounded-[5px] border transition-all duration-aura-base ease-aura',
          checked
            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
            : 'border-border/50 bg-muted/20 text-transparent hover:border-border/70 hover:bg-muted/35'
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
        <span className={cn('text-xs font-medium whitespace-nowrap', checked ? 'text-foreground' : 'text-muted-foreground')}>
          {checked ? checkedLabel : uncheckedLabel}
        </span>
      ) : null}
    </label>
  );
}
