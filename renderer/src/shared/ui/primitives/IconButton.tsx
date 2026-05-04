import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CN: Record<Size, string> = {
  xs: 'size-6  rounded-lg  [&_svg]:size-3',
  sm: 'size-7  rounded-lg  [&_svg]:size-3.5',
  md: 'size-8  rounded-xl  [&_svg]:size-4',
  lg: 'size-9  rounded-xl  [&_svg]:size-4.5',
};

type Props = ComponentProps<'button'> & {
  icon:       LucideIcon;
  size?:      Size;
  label:      string;
  /** Visual variant. Default: 'ghost' */
  variant?:   'ghost' | 'outline' | 'destructive';
};

const VARIANT_CN: Record<NonNullable<Props['variant']>, string> = {
  ghost:       'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
  outline:     'border border-border hover:bg-muted/40 text-foreground',
  destructive: 'hover:bg-destructive/10 text-destructive',
};

/**
 * IconButton — standard square icon-only button.
 *
 * Law 5: All interactive elements use .aura-control (aura-interactive + aura-focus).
 * Use this instead of ad-hoc icon buttons with custom hover classes.
 *
 * @example
 * <IconButton icon={Pencil} label="Редактировать" onClick={handleEdit} />
 */
export function IconButton({
  icon: Icon,
  size = 'md',
  label,
  variant = 'ghost',
  className,
  ...props
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        'aura-control',
        SIZE_CN[size],
        VARIANT_CN[variant],
        'aura-tx-interactive',
        'disabled:aura-disabled',
        className
      )}
      {...props}
    >
      <Icon aria-hidden />
    </button>
  );
}
