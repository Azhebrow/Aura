import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { flushSync } from 'react-dom';
import { XIcon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import type { ModalSizePreset } from '@/components/ui/modal-tokens';
import { UniversalModalContent, UniversalModalLayout } from '@/components/ui/universal-modal';
import { cn } from '@/lib/utils';

type ActModalProps = {
  title: string;
  icon?: LucideIcon;
  headerStart?: ReactNode;
  titleClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: () => void;
  contentClassName?: string;
  size?: ModalSizePreset;
};

export function ActModal({
  title,
  icon,
  headerStart,
  titleClassName,
  children,
  footer,
  onSubmit,
  contentClassName,
  size = 'md',
}: ActModalProps) {
  const { t } = useTranslation('common');
  const Icon = icon;
  const handleKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest("textarea,[contenteditable='true']")) return;
    if (target.closest("button,a,[role='button'],[data-enter-keep-default='true']")) return;
    event.preventDefault();
  }, []);
  return (
    <UniversalModalContent
      size={size}
      className={cn(contentClassName)}
      showCloseButton={false}
    >
      <form
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        onKeyDownCapture={handleKeyDownCapture}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
      >
        <UniversalModalLayout
          header={
            <div className="flex min-h-10 items-center gap-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {headerStart ? <div className="shrink-0">{headerStart}</div> : null}
                {Icon ? (
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_oklab,var(--primary)_25%,transparent)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary"
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </div>
                ) : null}
                <DialogTitle className={cn('font-heading min-w-0 text-left text-lg font-semibold leading-none', titleClassName)}>
                  {title}
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 shrink-0 rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] p-0 text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">{t('action.close')}</span>
                </Button>
              </DialogClose>
            </div>
          }
          footer={footer ?? null}
          bodyClassName="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2.5 sm:px-4 sm:py-3"
        >
          {children}
        </UniversalModalLayout>
      </form>
    </UniversalModalContent>
  );
}

export function ActTableBox({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-[var(--aura-border-soft)]">{children}</div>;
}

type ActFieldProps = {
  id?: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function ActField({ id, label, children, className }: ActFieldProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 border-b border-[var(--aura-border-soft)] last:border-b-0 sm:grid-cols-[minmax(9rem,28%)_1fr] sm:divide-x sm:divide-[var(--aura-border-soft)]',
        className
      )}
    >
      <div className="flex items-center justify-center bg-[var(--aura-surface-panel)] px-2 py-2 text-center sm:min-h-9 sm:px-3">
        <label
          htmlFor={id}
          className="text-foreground cursor-default text-xs font-semibold leading-snug break-words"
        >
          {label}
        </label>
      </div>
      <div className="flex min-w-0 w-full flex-col items-center justify-center px-2 py-2 sm:min-h-9 sm:px-3">
        <div className="flex min-w-0 w-full flex-col items-center justify-center">{children}</div>
      </div>
    </div>
  );
}

export function ActFormTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}
type ActModeSwitchOption<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

type ActModeSwitchProps<T extends string> = {
  value: T;
  options: readonly ActModeSwitchOption<T>[];
  onValueChange: (next: T) => void;
};

export function ActModeSwitch<T extends string>({ value, options, onValueChange }: ActModeSwitchProps<T>) {
  const radioOptions: UniversalRadioOption<T>[] = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    Icon: opt.icon,
  }));

  return (
    <UniversalRadioGroup
      value={value}
      onValueChange={onValueChange}
      options={radioOptions}
      ariaLabel="Тип записи"
      fullWidth
      className="h-10"
    />
  );
}

type ActAffixValueFieldProps = {
  id: string;
  ariaLabel: string;
  value: string;
  suffix?: string;
  inputKind: 'number' | 'integer' | 'text';
  placeholder?: string;
  disabled?: boolean;
  autoStartEditKey?: string | number | null;
  onCommit: (next: string) => void;
};

export function ActAffixValueField({
  id,
  ariaLabel,
  value,
  suffix,
  inputKind,
  placeholder,
  disabled = false,
  autoStartEditKey = null,
  onCommit,
}: ActAffixValueFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const snapshotRef = useRef(value);
  const lastAutoStartKeyRef = useRef<string | number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedByKeyRef = useRef(false);

  useEffect(() => {
    if (!editing) snapshotRef.current = value;
  }, [value, editing]);

  const displayLine = useMemo(() => {
    const t = value.trim();
    if (!t) return '—';
    const s = suffix?.trim() ?? '';
    if (!s) return t;
    return `${t}\u00a0${s}`;
  }, [value, suffix]);

  const start = () => {
    if (disabled) return;
    snapshotRef.current = value;
    setDraft(value);
    setEditing(true);
  };

  useEffect(() => {
    if (autoStartEditKey == null) return;
    if (lastAutoStartKeyRef.current === autoStartEditKey) return;
    lastAutoStartKeyRef.current = autoStartEditKey;
    start();
  }, [autoStartEditKey]);

  useEffect(() => {
    if (!editing) return;
    const t = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [editing]);

  const commit = () => {
    const snap = snapshotRef.current;
    const t = draft.trim();
    const committed =
      !t ? snap
      : inputKind === 'number' || inputKind === 'integer'
        ? (Number.isFinite(parseFloat(t.replace(',', '.'))) ? t : snap)
        : draft;
    setEditing(false);
    setDraft('');
    // flushSync ensures parent state is updated synchronously before any
    // concurrent click handler (e.g. Save button) reads the state.
    flushSync(() => { onCommit(committed); });
    window.setTimeout(() => {
      committedByKeyRef.current = false;
      document.querySelector<HTMLElement>('[data-modal-default-action="true"]')?.focus();
    }, 0);
  };

  const cancel = () => {
    setEditing(false);
    setDraft('');
  };

  const sanitizeNumericDraft = (raw: string) => {
    if (inputKind === 'integer') return raw.replace(/\D/g, '');
    const normalized = raw.replace(',', '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex === -1) return cleaned;
    const intPart = cleaned.slice(0, dotIndex);
    const fracPart = cleaned.slice(dotIndex + 1).replace(/\./g, '');
    return `${intPart}.${fracPart}`;
  };

  if (!editing) {
    return (
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={start}
        className={cn(
          'flex h-9 w-full min-w-0 items-center justify-center rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-3 text-center text-sm text-foreground shadow-xs aura-tx-colors hover:bg-[var(--aura-action-hover-bg)]',
          disabled && 'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50'
        )}
      >
        <span className={cn('max-w-full truncate', (inputKind === 'number' || inputKind === 'integer') && 'tabular-nums')}>{displayLine}</span>
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      id={id}
      autoFocus
      type="text"
      inputMode={inputKind === 'number' ? 'decimal' : inputKind === 'integer' ? 'numeric' : 'text'}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) =>
        setDraft(inputKind === 'number' || inputKind === 'integer' ? sanitizeNumericDraft(e.target.value) : e.target.value)
      }
      onBlur={() => { if (!committedByKeyRef.current) commit(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          committedByKeyRef.current = true;
          // Commit directly — don't rely on blur to avoid phantom form submit
          const snap = snapshotRef.current;
          const t = draft.trim();
          const committed =
            !t ? snap
            : inputKind === 'number' || inputKind === 'integer'
              ? (Number.isFinite(parseFloat(t.replace(',', '.'))) ? t : snap)
              : draft;
          setEditing(false);
          setDraft('');
          onCommit(committed);
          window.setTimeout(() => {
            committedByKeyRef.current = false;
            document.querySelector<HTMLElement>('[data-modal-default-action="true"]')?.focus();
          }, 0);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancel();
        }
      }}
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-3 text-center text-sm shadow-xs',
        (inputKind === 'number' || inputKind === 'integer') && 'tabular-nums'
      )}
    />
  );
}

type ActModalFooterProps = {
  cancelLabel?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitVariant?: 'default' | 'destructive';
};

export function ActModalFooter({
  cancelLabel,
  submitLabel,
  onCancel,
  onSubmit,
  submitDisabled,
  submitVariant = 'default',
}: ActModalFooterProps) {
  const { t } = useTranslation('common');
  const displayCancelLabel = cancelLabel ?? t('action.cancel');
  return (
    <div data-modal-footer="true" className="grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-4 py-3 sm:px-5">
      <Button data-modal-cancel="true" type="button" variant="outline" className="h-10 w-full rounded-md" onClick={onCancel}>
        {displayCancelLabel}
      </Button>
      <Button
        data-modal-default-action="true"
        data-modal-confirm="true"
        type="button"
        variant={submitVariant}
        className="h-10 w-full rounded-md"
        onClick={onSubmit}
        disabled={submitDisabled}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
