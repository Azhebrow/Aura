import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type UniversalRadioOption<T extends string> = {
  value: T;
  label: string;
  Icon?: LucideIcon;
  icon?: ReactNode;
};

type UniversalRadioGroupProps<T extends string> = {
  value: T;
  onValueChange: (next: T) => void;
  options: UniversalRadioOption<T>[];
  ariaLabel?: string;
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  /** When true, all segment buttons are disabled (e.g. while timer is running). */
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
  unselectedOptionClassName?: string;
};

export function UniversalRadioGroup<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  orientation = 'horizontal',
  fullWidth = false,
  disabled = false,
  className,
  optionClassName,
  selectedOptionClassName,
  unselectedOptionClassName,
}: UniversalRadioGroupProps<T>) {
  console.log(`[UniversalRadioGroup] rendering with value=${value}, options=${options.map(o => o.value).join(',')}`);
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'rounded-lg border border-border/50 p-0.5',
        fullWidth && orientation === 'horizontal'
          ? 'bg-muted/50 flex h-10 min-h-10 w-full min-w-0 flex-1 items-stretch gap-0.5'
          : orientation === 'horizontal'
            ? 'bg-muted/50 inline-flex shrink-0 w-fit max-w-full items-center gap-0.5 self-start'
            : fullWidth
              ? 'bg-muted/50 flex w-full min-w-0 max-w-full flex-col gap-1 self-stretch'
              : 'bg-muted/50 flex w-fit max-w-full flex-col gap-1 self-start',
        className
      )}
    >
      {options.map(({ value: optionValue, label, Icon, icon }) => {
        const selected = optionValue === value;
        const iconNode = icon ?? (Icon ? <Icon className="size-3.5 shrink-0" /> : null);
        return (
          <Button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            size="sm"
            variant={selected ? 'outline' : 'ghost'}
            disabled={disabled}
            className={cn(
              'min-h-9 gap-1.5 px-2.5 text-xs active:!scale-100 active:!translate-y-0',
              !(fullWidth && orientation === 'horizontal') && 'h-9',
              fullWidth &&
                orientation === 'horizontal' &&
                'h-full min-h-0 min-w-0 flex-1 basis-0 justify-center gap-0 rounded-md px-2',
              fullWidth && orientation === 'vertical' && 'w-full min-w-0 justify-start',
              selected ? selectedOptionClassName : unselectedOptionClassName,
              optionClassName
            )}
            onClick={() => onValueChange(optionValue)}
          >
            {fullWidth && orientation === 'horizontal' ? (
              <span className="flex min-w-0 w-full items-center justify-center gap-1.5">
                {iconNode}
                <span className="min-w-0 max-w-full truncate text-center">{label}</span>
              </span>
            ) : (
              <>
                {iconNode}
                <span className={cn(fullWidth && orientation === 'vertical' && 'min-w-0 truncate text-left')}>
                  {label}
                </span>
              </>
            )}
          </Button>
        );
      })}
    </div>
  );
}

export function HeaderSegmentedRadio<T extends string>(props: UniversalRadioGroupProps<T>) {
  return <UniversalRadioGroup {...props} />;
}
