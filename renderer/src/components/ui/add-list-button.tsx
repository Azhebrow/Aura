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
        'h-9 w-full rounded-lg border border-dashed border-border/70 bg-muted/20 text-muted-foreground',
        'hover:bg-muted/35 hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        className
      )}
    >
      <Plus className="size-3.5 shrink-0 opacity-80" />
      <span>{displayLabel}</span>
    </Button>
  );
}
