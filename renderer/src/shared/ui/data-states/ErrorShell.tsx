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
        'flex flex-col items-center justify-center gap-aura-sm rounded-lg border border-dashed border-[var(--aura-border-soft)] bg-transparent p-aura-lg text-center',
        className
      )}
    >
      <AlertCircle className="text-semantic-negative size-8" aria-hidden />
      <p className="aura-body-muted text-sm leading-snug">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="aura-action-soft px-3 py-1.5 text-sm text-primary"
        >
          Повторить
        </button>
      )}
    </div>
  );
}
