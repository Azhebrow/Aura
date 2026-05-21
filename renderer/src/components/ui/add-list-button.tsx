import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AddListButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function AddListButton({
  onClick,
  disabled = false,
  label,
  className,
}: AddListButtonProps) {
  const { t } = useTranslation('common');
  const displayLabel = label ?? t('action.add');
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-9 w-full justify-center gap-2 rounded-xl border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)]/40 text-sm font-medium text-[var(--aura-text-muted)] shadow-none overflow-visible',
        'hover:border-[var(--aura-border-soft)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
    >
      <Plus className="size-4 shrink-0 text-[var(--aura-text-muted)] group-hover/button:text-foreground" strokeWidth={2} />
      <span className="truncate">{displayLabel}</span>
    </Button>
  );
}
