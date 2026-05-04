import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  message?:   string;
  onRetry?:   () => void;
  className?: string;
};

/**
 * ErrorShell — universal error state.
 * Every failed data load shows this. Always offers a retry action.
 */
export function ErrorShell({
  message = 'Произошла ошибка',
  onRetry,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-aura-md p-aura-xl text-center',
        className
      )}
    >
      <AlertCircle className="text-semantic-negative size-8" aria-hidden />
      <p className="text-muted-foreground text-sm leading-snug">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-primary aura-focus text-sm underline underline-offset-2"
        >
          Повторить
        </button>
      )}
    </div>
  );
}
