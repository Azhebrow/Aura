import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { cn } from '@/lib/utils';
import { MEGA_PANEL_HEADER_CN } from '@/shared/ui/mega-section-layout';

type ModeSwitchHeaderProps<T extends string> = {
  value: T;
  onValueChange: (next: T) => void;
  options: UniversalRadioOption<T>[];
  ariaLabel: string;
  className?: string;
  /** When true, segment buttons are disabled (e.g. while a session is active). */
  disabled?: boolean;
  locked?: boolean;
};

export function ModeSwitchHeader<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  disabled = false,
  locked = false,
}: ModeSwitchHeaderProps<T>) {
  const displayOptions = useMemo(
    () =>
      locked
        ? options.map((opt) => ({
            value: opt.value,
            label: opt.label,
            icon: <Lock className="size-3.5 shrink-0" />,
          }))
        : options,
    [locked, options]
  );

  return (
    <div className={cn(MEGA_PANEL_HEADER_CN, 'items-stretch gap-0 px-0 py-0 sm:px-0', className)}>
      <UniversalRadioGroup
        value={value}
        onValueChange={onValueChange}
        options={displayOptions}
        ariaLabel={ariaLabel}
        disabled={disabled || locked}
        fullWidth
        variant="header"
        className="h-full w-full gap-0.5"
      />
    </div>
  );
}
