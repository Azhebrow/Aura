import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import { ProgressDots } from '@/components/ui/progress-dots';
import { cn } from '@/lib/utils';

export type ListItemMode = 'edit-delete' | 'checkbox' | 'checkbox-delete' | 'active' | 'diary';

export type ListItemProps = {
  mode: ListItemMode;
  icon?: string | null;
  iconTint?: string;
  title: string | ReactNode;
  amount?: string | ReactNode;
  description?: string | ReactNode;
  trailing?: ReactNode;
  actionsAlwaysVisible?: boolean;
  showDisabledMoveButtons?: boolean;

  onEdit?: () => void;
  onActivate?: () => void;
  onDelete?: () => void;

  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;

  onMoveUp?: () => void;
  onMoveDown?: () => void;

  categoryIcon?: string | null;
  moodLevel?: number;
  moodLevelsTotal?: number;

  className?: string;
  isDone?: boolean;
};

export function ListItem({
  mode,
  icon,
  iconTint,
  title,
  amount,
  description,
  trailing,
  actionsAlwaysVisible,
  showDisabledMoveButtons,
  onEdit,
  onDelete,
  onActivate,
  checked,
  onCheckedChange,
  onMoveUp,
  onMoveDown,
  categoryIcon,
  moodLevel,
  moodLevelsTotal,
  className,
  isDone,
}: ListItemProps) {
  const { t } = useTranslation('common');

  const handleMainClick = () => {
    if (mode === 'checkbox' || mode === 'checkbox-delete') {
      onCheckedChange?.(!checked);
    } else if (mode === 'edit-delete') {
      onEdit?.();
    } else if (mode === 'active' || mode === 'diary') {
      onActivate?.();
    }
  };

  // Режим diary - специальная структура (исключение)
  if (mode === 'diary') {
    const moodTotal = moodLevelsTotal ?? 0;
    const metaLabel = typeof amount === 'string' && amount.trim() ? amount.trim() : null;
    return (
      <div
        onClick={handleMainClick}
        className={cn(
        'group overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs aura-tx-surface',
        'hover:bg-[var(--aura-action-hover-bg)] cursor-pointer',
          className
        )}
      >
        <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-3 px-3 py-3">
          <div className="flex w-10 shrink-0 flex-col items-center gap-2">
            <IconWithBadge iconName={categoryIcon ?? null} size="lg" />
            <div className="flex w-full items-center justify-center">
              {moodTotal > 0 ? <ProgressDots filled={moodLevel ?? 0} total={moodTotal} size="xs" /> : null}
            </div>
          </div>
          <div className="w-px self-stretch bg-[var(--aura-border-soft)]" aria-hidden />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <div
                className={cn(
                  'truncate text-sm font-semibold leading-snug text-foreground',
                  isDone && 'line-through text-[var(--aura-text-disabled)]'
                )}
              >
                {title}
              </div>
              <span className="text-[var(--aura-text-disabled)] text-xs" aria-hidden>
                •
              </span>
              <div className="text-[var(--aura-text-muted)] truncate text-xs font-medium">{metaLabel ?? t('aria.entry')}</div>
            </div>
            {description && <div className="text-[var(--aura-text-subtle)] mt-1.5 text-xs leading-relaxed">{description}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ИСПРАВЛЕНИЕ #3 & #6: Явная логика border-l
  const shouldShowBorder = mode === 'checkbox';
  const borderVisibility = shouldShowBorder || actionsAlwaysVisible ? 'border-l' : 'border-l opacity-0 group-hover:opacity-100';

  // ИСПРАВЛЕНИЕ #1 & #6: Grid логика
  const gridClass =
    mode === 'checkbox-delete'
      ? 'grid-cols-[auto_1fr_auto]'
      : 'grid-cols-[1fr_auto]';

  return (
    <div
      onClick={handleMainClick}
      className={cn(
        'group grid overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs aura-tx-surface',
        'hover:bg-[var(--aura-action-hover-bg)] cursor-pointer',
        gridClass,
        className
      )}
    >
      {/* ИСПРАВЛЕНИЕ #6: checkbox-delete - чекбокс СЛЕВА в отдельной колонке */}
      {mode === 'checkbox-delete' && (
        <div className="flex shrink-0 items-center justify-center px-2 py-2 h-full">
          <Checkbox
            checked={checked || false}
            onCheckedChange={(c) => onCheckedChange?.(!!c)}
            onClick={(e) => e.stopPropagation()}
            aria-label={t('aria.toggle')}
          />
        </div>
      )}

      {/* Левая часть: иконка, название, amount, описание */}
      <div className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left">
        {/* ИСПРАВЛЕНИЕ #4: Иконка должна быть во всех режимах кроме diary */}
        {icon && (
          <div className="shrink-0">
            <IconWithBadge iconName={icon} tint={iconTint} size="md" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'text-sm font-semibold leading-snug text-foreground',
              isDone && 'line-through text-[var(--aura-text-disabled)]'
            )}
          >
            {title}
          </div>
          {/* ИСПРАВЛЕНИЕ #7: Amount для edit-delete */}
          {amount && mode === 'edit-delete' && (
            <div className="text-[var(--aura-text-muted)] mt-0.5 text-xs font-medium aura-tx-colors">
              {amount}
            </div>
          )}
          {description ? (
            <div
              className={cn(
                'text-[var(--aura-text-subtle)] mt-1 text-xs leading-relaxed',
                isDone && 'line-through text-[var(--aura-text-disabled)]'
              )}
            >
              {description}
            </div>
          ) : null}
        </div>
      </div>

      {/* ИСПРАВЛЕНИЕ #1: Правая часть контейнер - SINGLE opacity управление */}
      <div
        className={cn(
          'border-[var(--aura-border-soft)] flex shrink-0 items-center min-h-0',
          borderVisibility
        )}
      >
        {/* ИСПРАВЛЕНИЕ #5: Trailing контент - явная логика по режимам */}
        {trailing && (mode === 'checkbox' || mode === 'active') && (
          <div className="flex items-center gap-1.5 px-2 py-2 text-xs text-[var(--aura-text-subtle)]">
            {trailing}
          </div>
        )}

        {/* Mode: edit-delete - удаление на hover */}
        {mode === 'edit-delete' && (onMoveUp || onMoveDown || onDelete || actionsAlwaysVisible || showDisabledMoveButtons) && (
          <div className="flex items-center gap-0 h-full">
            {onMoveUp || showDisabledMoveButtons ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp?.();
                }}
                className={cn(
                  'flex h-full shrink-0 items-center justify-center px-2 py-2 aura-tx-interactive',
                  onMoveUp ? 'text-[var(--aura-text-muted)] hover:text-foreground hover:bg-[var(--aura-action-hover-bg)]' : 'text-[var(--aura-text-disabled)]'
                )}
                aria-label={t('aria.move_up')}
                disabled={!onMoveUp}
                aria-disabled={!onMoveUp}
              >
                <ChevronUp className="size-4" />
              </button>
            ) : null}
            {onMoveDown || showDisabledMoveButtons ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown?.();
                }}
                className={cn(
                  'flex h-full shrink-0 items-center justify-center px-2 py-2 aura-tx-interactive',
                  onMoveDown ? 'text-[var(--aura-text-muted)] hover:text-foreground hover:bg-[var(--aura-action-hover-bg)]' : 'text-[var(--aura-text-disabled)]'
                )}
                aria-label={t('aria.move_down')}
                disabled={!onMoveDown}
                aria-disabled={!onMoveDown}
              >
                <ChevronDown className="size-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={cn(
                  'flex h-full shrink-0 items-center justify-center px-2 py-2 aura-tx-interactive',
                  'text-[var(--aura-text-muted)] hover:text-destructive hover:bg-destructive/10'
                )}
                aria-label={t('aria.delete_item')}
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        )}

        {/* Mode: checkbox - чекбокс справа ВСЕГДА видим */}
        {mode === 'checkbox' && (
          <div className="flex shrink-0 items-center justify-center px-2 py-2 h-full">
            <Checkbox
              checked={checked || false}
              onCheckedChange={(c) => onCheckedChange?.(!!c)}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('aria.toggle')}
            />
          </div>
        )}

        {/* Mode: checkbox-delete - стрелки и delete на hover (ИСПРАВЛЕНИЕ #1: нет двойного opacity) */}
        {mode === 'checkbox-delete' && (
          <div className="flex items-center gap-0 h-full">
            {onMoveUp && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className={cn(
                  'flex items-center justify-center px-2 py-2 aura-tx-interactive h-full',
                  'text-[var(--aura-text-muted)] hover:text-foreground hover:bg-[var(--aura-action-hover-bg)]'
                )}
                aria-label={t('aria.move_up')}
              >
                <ChevronUp className="size-4" />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className={cn(
                  'flex items-center justify-center px-2 py-2 aura-tx-interactive h-full',
                  'text-[var(--aura-text-muted)] hover:text-foreground hover:bg-[var(--aura-action-hover-bg)]'
                )}
                aria-label={t('aria.move_down')}
              >
                <ChevronDown className="size-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={cn(
                  'flex items-center justify-center px-2 py-2 aura-tx-interactive h-full',
                  'text-[var(--aura-text-muted)] hover:text-destructive hover:bg-destructive/10'
                )}
                aria-label={t('aria.delete_item')}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
