// ─── cfg-primitives ───────────────────────────────────────────────────────────
// Примитивные компоненты и константы CFG-диалога:
//   CfgAffixValueField — числовое/текстовое поле с суффиксом-просмотром
//   CfgModalGridRow    — строка сетки 28%/72% для формы настроек
//   CFG_INPUT_CN / CFG_ICON_TRIGGER_CN — общие className-константы

// ─── Shared className constants ───────────────────────────────────────────────

/** Единый ритм правой колонки CFG-модалки (высота как у `h-9`). */
export const CFG_INPUT_CN =
  'border-soft bg-control/55 h-9 w-full min-w-0 rounded-lg border px-3 text-left text-sm shadow-none focus-visible:bg-control/75';

/** Кнопка-триггер для выбора иконки — та же геометрия, что у остальных полей. */
export const CFG_ICON_TRIGGER_CN =
  'border-soft bg-control/55 hover:bg-hover flex h-9 w-full min-w-0 flex-row items-center justify-start gap-2 rounded-lg border px-3 text-left text-sm font-normal text-foreground aura-tx-colors shadow-none';

export function formatCfgIconLabel(value: unknown): string {
  const clean = String(value ?? '').trim();
  if (!clean) return '—';
  return clean
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ─── CfgAffixValueField ───────────────────────────────────────────────────────

type AffixFieldProps = {
  id: string;
  /** 'number' — принимаем только цифры/точку; 'text' — произвольный текст. */
  inputKind: 'number' | 'text';
  value: string;
  /** Суффикс, отображаемый рядом со значением в режиме просмотра (напр. «ч», «кг»). */
  displayAffix: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
};

/**
 * Числовое или короткое текстовое поле с суффиксом.
 * Суффикс живёт отдельно от значения и в просмотре, и при редактировании.
 * При потере фокуса или Enter фиксирует ввод; Escape отменяет.
 */
export function CfgAffixValueField({
  id,
  inputKind,
  value,
  displayAffix,
  onCommit,
  ariaLabel,
  placeholder,
}: AffixFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const snapshotRef = useRef(value);

  // Обновляем снимок значения каждый раз, когда компонент в режиме просмотра
  useEffect(() => {
    if (!editing) snapshotRef.current = value;
  }, [value, editing]);

  const displayValue = useMemo(() => {
    const t = value.trim();
    if (!t) return '—';
    return t;
  }, [value]);
  const affix = displayAffix.trim();

  const start = () => {
    snapshotRef.current = value;
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const snap = snapshotRef.current;
    const t = draft.trim();
    if (t === '') {
      onCommit(snap);
    } else if (inputKind === 'number') {
      const n = parseFloat(t.replace(',', '.'));
      onCommit(Number.isFinite(n) ? t : snap);
    } else {
      onCommit(draft);
    }
    setEditing(false);
    setDraft('');
  };

  const cancel = () => {
    setEditing(false);
    setDraft('');
  };

  const sanitizeNumericDraft = (raw: string) => {
    const normalized = raw.replace(',', '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex === -1) return cleaned;
    return `${cleaned.slice(0, dotIndex)}.${cleaned.slice(dotIndex + 1).replace(/\./g, '')}`;
  };

  if (!editing) {
    return (
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        onClick={start}
        className="border-soft bg-control/55 text-foreground hover:bg-hover flex h-9 w-full min-w-0 items-center justify-start rounded-lg border px-3 text-left text-sm shadow-none aura-tx-colors"
      >
        <span className="flex min-w-0 max-w-full items-baseline justify-start gap-1.5">
          <span className={cn('min-w-0 truncate', inputKind === 'number' && 'tabular-nums')}>{displayValue}</span>
          {affix ? <span className="shrink-0 text-xs font-semibold text-faint">{affix}</span> : null}
        </span>
      </button>
    );
  }

  return (
    <div className="relative min-w-0">
      <Input
        id={id}
        autoFocus
        type="text"
        inputMode={inputKind === 'number' ? 'decimal' : 'text'}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) =>
          setDraft(inputKind === 'number' ? sanitizeNumericDraft(e.target.value) : e.target.value)
        }
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        className={cn(
          'border-soft bg-control/55 h-9 w-full min-w-0 rounded-lg border px-3 text-left text-sm shadow-none focus-visible:bg-control/75',
          affix && 'pr-9',
          inputKind === 'number' && 'tabular-nums'
        )}
      />
      {affix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-faint">
          {affix}
        </span>
      ) : null}
    </div>
  );
}

// ─── CfgModalGridRow ──────────────────────────────────────────────────────────

type GridRowProps = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
};

/**
 * Строка формы CFG-диалога: метка слева (28%), содержимое справа (72%).
 * На мобильных — вертикальная раскладка.
 */
export function CfgModalGridRow({ label, htmlFor, children }: GridRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(9rem,28%)_1fr] sm:items-stretch sm:divide-x sm:divide-soft/70">
      <div className="flex items-center px-3 py-2.5 text-left sm:min-h-9">
        <Label
          htmlFor={htmlFor}
          className="text-foreground cursor-default text-xs font-semibold leading-snug break-words"
        >
          {label}
        </Label>
      </div>
      <div className="flex min-w-0 w-full flex-col items-stretch justify-center px-3 py-2 sm:min-h-9">
        {children}
      </div>
    </div>
  );
}
