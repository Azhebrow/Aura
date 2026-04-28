import type { ReactNode } from 'react';
import { XIcon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DialogClose, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type SettingsFormTableProps = {
  children: ReactNode;
  className?: string;
};

/** Группа строк настроек: только горизонтальные разделители между рядами, без лишней рамки. */
export function SettingsFormTable({ children, className }: SettingsFormTableProps) {
  return <div className={cn('divide-border/55 flex flex-col divide-y', className)}>{children}</div>;
}

type SettingsFieldProps = {
  id?: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Строка «таблицы»: слева название и краткая подсказка, справа колонка под контрол на всю доступную ширину.
 */
export function SettingsField({ id, label, hint, className, children }: SettingsFieldProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(9rem,36%)_minmax(0,1fr)] sm:items-center sm:gap-y-1',
        className
      )}
    >
      <div className="min-w-0 sm:pr-1">
        <Label htmlFor={id} className="text-foreground text-xs font-medium leading-snug">
          {label}
        </Label>
        {hint ? <p className="text-muted-foreground mt-1 text-xs leading-snug sm:mt-1">{hint}</p> : null}
      </div>
      <div className="flex min-w-0 w-full max-w-full flex-col gap-1.5 sm:justify-self-stretch">{children}</div>
    </div>
  );
}

type SettingsDialogHeaderProps = {
  icon?: LucideIcon;
  title: string;
  /** Если не передано — только заголовок (без второй строки в шапке). */
  description?: string;
  showCloseButton?: boolean;
};

export function SettingsDialogHeader({
  icon: Icon,
  title,
  description,
  showCloseButton = true,
}: SettingsDialogHeaderProps) {
  return (
    <DialogHeader className="gap-1.5">
      <div className="flex min-h-10 items-center gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {Icon ? (
            <div
              className="bg-muted/70 text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60"
              aria-hidden
            >
              <Icon className="size-4" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-0.5">
            <DialogTitle className="font-heading text-left text-lg font-semibold leading-none">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-muted-foreground text-left text-xs leading-relaxed">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </div>
        {showCloseButton ? (
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        ) : null}
      </div>
    </DialogHeader>
  );
}
