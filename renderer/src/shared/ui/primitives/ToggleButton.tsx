import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<'button'> & {
  pressed:   boolean;
  onToggle:  (next: boolean) => void;
};

/**
 * ToggleButton — a button with binary pressed state.
 * Uses aria-pressed for accessibility. Visual: ghost when off, secondary when on.
 *
 * Law 5: All interactive elements use .aura-control.
 *
 * @example
 * <ToggleButton pressed={showArchive} onToggle={setShowArchive}>
 *   Архив
 * </ToggleButton>
 */
export function ToggleButton({
  pressed,
  onToggle,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onToggle(!pressed)}
      className={cn(
        'inline-flex items-center justify-center gap-1.5',
        'h-8 rounded-xl px-3 text-sm font-medium',
        'aura-control aura-tx-interactive',
        pressed
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
