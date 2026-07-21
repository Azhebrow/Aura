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
        'h-9 w-full justify-center gap-2 rounded-xl border border-soft bg-control/40 text-sm font-medium text-dim shadow-none overflow-visible',
        'hover:border-soft hover:bg-hover hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
    >
      <Plus className="size-4 shrink-0 text-dim group-hover/button:text-foreground" />
      <span className="truncate">{displayLabel}</span>
    </Button>
  );
}
