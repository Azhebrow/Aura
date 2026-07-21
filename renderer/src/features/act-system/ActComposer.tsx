import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';
import type { ActComposerConfig } from './types';

type Props = {
  config: ActComposerConfig;
  className?: string;
};

export function ActComposer({ config, className }: Props) {
  const hasFields = Boolean(config.fields);
  const hasTextInput = Boolean(config.onInputChange);
  const isButtonOnly = !hasFields && !hasTextInput;
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [keyboardSubmitIntent, setKeyboardSubmitIntent] = useState(0);
  const pendingKeyboardSubmitRef = useRef(false);
  const hasIconPicker = Boolean(config.iconOptions?.length && config.onIconChange);

  useEffect(() => {
    if (!pendingKeyboardSubmitRef.current) return;
    if (config.disabled) {
      pendingKeyboardSubmitRef.current = false;
      return;
    }
    if (config.submitDisabled) return;
    pendingKeyboardSubmitRef.current = false;
    config.onSubmit();
  }, [config, keyboardSubmitIntent]);

  return (
    <div
      onKeyDownCapture={(event) => {
        if (event.key !== 'Enter') return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target?.closest('[data-act-composer-value-input="true"]')) return;
        pendingKeyboardSubmitRef.current = true;
        setKeyboardSubmitIntent((intent) => intent + 1);
      }}
      className={cn(
        'w-full shrink-0 rounded-lg border border-soft/70 bg-card/95 shadow-xs aura-tx-surface',
        'overflow-hidden',
        'focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/10',
        '[&_[data-slot=select-trigger]]:h-8 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:min-w-0',
        '[&_[data-slot=select-trigger]]:rounded-none [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=select-trigger]]:shadow-none',
        '[&_[data-slot=select-trigger]]:focus:bg-background/45 [&_[data-slot=select-trigger]]:focus:ring-0',
        '[&_input]:w-full',
        className
      )}
    >
      {config.options?.length ? (
        <div className="border-b border-soft/50 bg-panel/25 px-1 py-1">
          <div className="flex min-w-0 gap-0.5">
            {config.options.map((option) => {
              const active = option.value === config.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'h-7 min-w-0 flex-1 rounded-md px-2 text-xs font-semibold text-dim aura-tx-interactive',
                    'inline-flex items-center justify-center gap-1.5',
                    'hover:bg-hover hover:text-foreground',
                    active ? 'bg-primary/8 text-foreground ring-1 ring-primary/18' : 'ring-1 ring-transparent'
                  )}
                  onClick={() => config.onValueChange?.(option.value)}
                  disabled={config.disabled}
                  aria-pressed={active}
                >
                  {Icon ? <Icon className={cn('size-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground/80')} strokeWidth={1.8} aria-hidden /> : null}
                  <span className="block truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <div className="flex min-w-0 items-stretch divide-x divide-soft/50">
          {hasIconPicker ? (
            <div className="shrink-0">
              <button
                type="button"
                className="flex size-8 items-center justify-center border-0 bg-transparent text-base aura-tx-interactive hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring/60"
                onClick={() => setIconPickerOpen((open) => !open)}
                disabled={config.disabled}
                aria-label="Выбрать иконку"
                aria-expanded={iconPickerOpen}
              >
                <span className="aura-inline-icon flex size-6 items-center justify-center">
                  <AuraThemedIcon
                    name={config.iconValue || config.iconOptions?.[0]}
                    tint="var(--muted-foreground)"
                    size={14}
                  />
                </span>
              </button>
            </div>
          ) : null}
          {isButtonOnly ? (
            <Button
              type="button"
              className="h-8 min-w-0 flex-1 justify-center gap-1.5 rounded-none border-0 bg-transparent px-3 text-sm font-semibold text-foreground shadow-none hover:bg-hover disabled:bg-control disabled:text-faint"
              onClick={config.onSubmit}
              disabled={config.disabled || config.submitDisabled}
              aria-label={config.submitLabel ?? config.placeholder ?? 'Добавить'}
              title={config.submitLabel ?? config.placeholder ?? 'Добавить'}
            >
              <Plus className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{config.submitLabel ?? config.placeholder ?? 'Добавить'}</span>
            </Button>
          ) : (
          <div className="flex min-w-0 flex-1 overflow-hidden bg-transparent focus-within:bg-background/45">
            <div className="act-composer-fields min-w-0 flex-1">
              {hasFields ? (
                config.fields
              ) : hasTextInput ? (
                <Input
                  value={config.inputValue ?? ''}
                  onChange={(event) => config.onInputChange?.(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    if (!config.disabled && !config.submitDisabled) config.onSubmit();
                  }}
                  placeholder={config.placeholder}
                  disabled={config.disabled}
                  className="h-8 min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus-visible:ring-0"
                />
              ) : (
                null
              )}
            </div>
            <Button
              type="button"
              size="icon-sm"
              className="size-8 shrink-0 rounded-none border-0 border-l border-soft/50 bg-transparent text-dim shadow-none hover:bg-hover hover:text-foreground disabled:bg-transparent disabled:text-faint"
              onClick={config.onSubmit}
              disabled={config.disabled || config.submitDisabled}
              aria-label={config.submitLabel ?? 'Добавить'}
              title={hasTextInput || hasFields ? `${config.submitLabel ?? 'Добавить'} (Enter)` : config.submitLabel ?? 'Добавить'}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          )}
        </div>
        {hasIconPicker && iconPickerOpen ? (
          <div className="grid w-full grid-cols-10 border-t border-soft/50">
            {config.iconOptions?.map((icon) => (
              <button
                key={icon}
                type="button"
                className={cn(
                  'flex h-8 min-w-0 items-center justify-center border-r border-b border-soft/35 aura-tx-interactive hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring/60',
                  icon === config.iconValue && 'bg-primary/8 text-primary'
                )}
                onClick={() => {
                  config.onIconChange?.(icon);
                  setIconPickerOpen(false);
                }}
                aria-label={`Иконка ${icon}`}
                aria-pressed={icon === config.iconValue}
              >
                <span className="aura-inline-icon flex size-6 items-center justify-center">
                  <AuraThemedIcon name={icon} tint="var(--muted-foreground)" size={14} />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
