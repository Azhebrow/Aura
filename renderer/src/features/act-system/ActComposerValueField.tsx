import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  ariaLabel: string;
  value: string;
  suffix?: string;
  inputKind: 'number' | 'integer' | 'text';
  placeholder?: string;
  disabled?: boolean;
  controlClassName?: string;
  onCommit: (next: string) => void;
};

export function ActComposerValueField({
  id,
  ariaLabel,
  value,
  suffix,
  inputKind,
  placeholder,
  disabled = false,
  controlClassName,
  onCommit,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const snapshotRef = useRef(value);
  const suffixText = suffix?.trim() ?? '';

  useEffect(() => {
    if (!editing) snapshotRef.current = value;
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing]);

  const displayValue = useMemo(() => {
    const trimmed = value.trim();
    return trimmed ? trimmed : '—';
  }, [value]);

  const sanitizeDraft = (raw: string) => {
    if (inputKind === 'integer') return raw.replace(/\D/g, '');
    if (inputKind !== 'number') return raw;
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex === -1) return cleaned;
    return `${cleaned.slice(0, dotIndex)}.${cleaned.slice(dotIndex + 1).replace(/\./g, '')}`;
  };

  const startEdit = () => {
    if (disabled) return;
    snapshotRef.current = value;
    setDraft(value);
    setEditing(true);
  };

  const applyDraft = (raw: string) => {
    const next = sanitizeDraft(raw);
    setDraft(next);
    flushSync(() => {
      onCommit(next);
    });
  };

  const commit = () => {
    setEditing(false);
    setDraft('');
  };

  const cancel = () => {
    flushSync(() => {
      onCommit(snapshotRef.current);
    });
    setEditing(false);
    setDraft('');
  };

  if (!editing) {
    return (
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={startEdit}
	      className={cn(
	          'flex h-8 w-full min-w-0 items-center justify-center rounded-none border-0 bg-transparent px-2.5 text-center text-sm text-foreground shadow-none aura-tx-colors hover:bg-hover',
	          disabled && 'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
	          controlClassName
	        )}
      >
        <span className="flex min-w-0 max-w-full items-baseline justify-center gap-1.5">
          <span className={cn('min-w-0 truncate', (inputKind === 'number' || inputKind === 'integer') && 'tabular-nums')}>
            {displayValue}
          </span>
          {suffixText ? <span className="shrink-0 text-xs font-semibold text-faint">{suffixText}</span> : null}
        </span>
      </button>
    );
  }

  return (
	    <div className="relative w-full min-w-0">
      <Input
        ref={inputRef}
        data-act-composer-value-input="true"
        id={id}
        type="text"
        inputMode={inputKind === 'number' ? 'decimal' : inputKind === 'integer' ? 'numeric' : 'text'}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => applyDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
	        className={cn(
	          'h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 text-center text-sm shadow-none focus-visible:bg-background/45 focus-visible:ring-0',
	          suffixText && 'pr-9',
	          (inputKind === 'number' || inputKind === 'integer') && 'tabular-nums',
	          controlClassName
	        )}
      />
      {suffixText ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-faint">
          {suffixText}
        </span>
      ) : null}
    </div>
  );
}
