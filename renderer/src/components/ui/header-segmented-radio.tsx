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
  variant?: 'default' | 'header';
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
  variant = 'default',
}: UniversalRadioGroupProps<T>) {
  const isHeader = variant === 'header';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        isHeader
          ? 'rounded-none border-0 bg-transparent p-0'
          : 'rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] p-1',
        fullWidth && orientation === 'horizontal'
          ? cn('flex w-full min-w-0 flex-1 items-center', isHeader ? 'gap-1.5 px-2 py-1.5 sm:px-3' : 'gap-0.5')
          : orientation === 'horizontal'
            ? cn('inline-flex shrink-0 w-fit max-w-full items-center self-start', isHeader ? 'gap-1.5' : 'gap-0.5')
            : fullWidth
              ? 'flex w-full min-w-0 max-w-full flex-col gap-1 self-stretch'
              : 'flex w-fit max-w-full flex-col gap-1 self-start',
        className
      )}
    >
      {options.map(({ value: optionValue, label, Icon, icon }) => {
        const selected = optionValue === value;
        const iconNode = icon ?? (Icon ? <Icon className="size-3.5 shrink-0 self-center" /> : null);
        return (
          <Button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            size="sm"
            variant={selected ? 'default' : 'ghost'}
            disabled={disabled}
            className={cn(
              'gap-1.5 text-xs font-medium leading-none active:!scale-100 active:!translate-y-0',
              isHeader ? 'min-h-8 px-2.5' : 'min-h-9 px-2.5',
              !(fullWidth && orientation === 'horizontal') && 'h-9',
              fullWidth &&
                orientation === 'horizontal' &&
                cn(
                  'min-h-0 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 py-0',
                  isHeader ? 'h-8 rounded-lg px-2' : 'h-8 rounded-md px-2'
                ),
              fullWidth && orientation === 'vertical' && 'w-full min-w-0 justify-start',
              isHeader
                ? selected
                  ? 'border border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/12'
                  : 'border border-transparent bg-transparent text-[var(--aura-text-subtle)] hover:border-border/50 hover:bg-muted/25 hover:text-foreground'
                : selected
                  ? 'border border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-transparent text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground'
            )}
            onClick={() => onValueChange(optionValue)}
          >
            {fullWidth && orientation === 'horizontal' ? (
              <span className="flex min-h-0 w-full min-w-0 items-center justify-center gap-1.5 leading-none">
                {iconNode ? (
                  <span
                    className={cn(
                      'flex shrink-0 items-center justify-center',
                      isHeader &&
                        (selected
                          ? '[&_svg]:text-primary'
                          : '[&_svg]:text-muted-foreground/80 group-hover/button:[&_svg]:text-foreground')
                    )}
                  >
                    {iconNode}
                  </span>
                ) : null}
                <span className="min-w-0 max-w-full translate-y-px truncate text-center leading-none">{label}</span>
              </span>
            ) : (
              <>
                {iconNode}
                <span className={cn('translate-y-px leading-none', fullWidth && orientation === 'vertical' && 'min-w-0 truncate text-left')}>
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
