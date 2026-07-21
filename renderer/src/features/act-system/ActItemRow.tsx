import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import { cn } from '@/lib/utils';
import type { ActItem } from './types';

type Props = {
  item: ActItem;
  className?: string;
};

export function ActItemRow({ item, className }: Props) {
  const done = item.state === 'done' || item.checked === true;
  const disabled = item.disabled || item.state === 'locked';
  const compact = item.density === 'compact';
  const interactive = Boolean(item.onActivate || item.onToggle || item.onEdit);
  const actions = [
    item.onMoveUp ? { key: 'up', label: 'Переместить вверх', icon: <ChevronUp className="size-4" />, onClick: item.onMoveUp } : null,
    item.onMoveDown ? { key: 'down', label: 'Переместить вниз', icon: <ChevronDown className="size-4" />, onClick: item.onMoveDown } : null,
    item.onDelete ? { key: 'delete', label: 'Удалить', icon: <Trash2 className="size-4" />, tone: 'danger' as const, onClick: item.onDelete } : null,
    ...(item.actions ?? []).map((action, index) => ({ key: `custom-${index}`, ...action })),
  ].filter((action): action is NonNullable<typeof action> => action != null);

  const activate = () => {
    if (disabled) return;
    if (item.onEdit) item.onEdit();
    else if (item.onActivate) item.onActivate();
    else item.onToggle?.(!item.checked);
  };

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-disabled={disabled || undefined}
      aria-pressed={item.onToggle ? item.checked : undefined}
      onClick={activate}
      onKeyDown={(event) => {
        if (!interactive || disabled) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate();
      }}
      className={cn(
        'group grid min-h-12 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-soft/80 bg-card/95 shadow-xs aura-tx-surface',
        interactive && !disabled && 'cursor-pointer hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        disabled && 'pointer-events-none opacity-55',
        item.state === 'active' && 'border-primary/45 bg-primary/6',
        className
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-center px-2">
        {item.leading ? (
          item.leading
        ) : item.onToggle ? (
          <Checkbox
            checked={item.checked ?? false}
            onCheckedChange={(checked) => item.onToggle?.(checked === true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={typeof item.title === 'string' ? item.title : 'Переключить'}
            className="size-7 rounded-lg border-soft bg-control/70 shadow-none"
          />
        ) : item.icon ? (
          <div className="rounded-lg bg-panel/45 p-0.5">
            <IconWithBadge iconName={item.icon} tint={item.iconTint} size="sm" />
          </div>
        ) : (
          <div className="size-8" aria-hidden />
        )}
      </div>

      <div className="flex h-12 min-w-0 items-center gap-3 px-2 text-left">
        <div className={cn('flex min-w-0 flex-1 items-baseline gap-1.5 text-sm leading-snug', done && 'line-through text-faint')}>
          <span className="min-w-0 truncate font-semibold text-foreground">{item.title}</span>
          {item.description ? (
            <span className="min-w-0 shrink truncate text-xs text-subtle">{item.description}</span>
          ) : null}
          {item.meta ? (
            <span className={cn('min-w-0 shrink truncate text-xs font-medium text-dim', compact && 'shrink')}>{item.meta}</span>
          ) : null}
        </div>
      </div>

      <div className="flex h-12 min-w-0 shrink-0 items-center justify-end gap-1.5 pl-1 pr-2">
        {item.value ? (
          <div className="min-w-[3.25rem] max-w-[8rem] shrink-0 truncate text-right text-xs font-semibold tabular-nums text-dim transition-colors duration-200">
            {item.value}
          </div>
        ) : null}
        {item.trailing ? <div className="px-1">{item.trailing}</div> : null}
        {actions.length > 0 ? (
          <div className="flex max-w-0 shrink-0 items-center gap-1 overflow-hidden opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:max-w-[7rem] group-hover:opacity-100 group-focus-within:max-w-[7rem] group-focus-within:opacity-100 motion-reduce:transition-none">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg text-dim aura-tx-interactive',
                  'bg-control/35 hover:bg-control hover:text-foreground active:scale-95',
                  action.tone === 'danger' && 'hover:bg-destructive/10 hover:text-destructive'
                )}
                aria-label={action.label}
                disabled={action.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  action.onClick();
                }}
              >
                {action.icon}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
