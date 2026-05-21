import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddListButton } from '@/components/ui/add-list-button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ClipboardList, Trash2 } from 'lucide-react';
import { ActField, ActFormTable, ActModal, ActModalFooter, ActTableBox } from '@/features/act/ActModal';
import { LoadingShell } from '@/shared/ui/data-states';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { useFormMutation } from '@/shared/hooks/use-form-mutation';

type DailyPlansCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

const DEFAULT_PLAN_ICON = '📝';

function firstGrapheme(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const Segmenter = Intl.Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
    return segmenter.segment(trimmed)[Symbol.iterator]().next().value?.segment ?? '';
  }
  return Array.from(trimmed)[0] ?? '';
}

function normalizePlanIcon(value: string) {
  return value.trim() || DEFAULT_PLAN_ICON;
}

function isEmojiGrapheme(value: string) {
  if (!value) return false;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value) || (/\p{Emoji}/u.test(value) && !/^[0-9#*]$/u.test(value));
}

function splitLeadingEmojiTitle(title: string) {
  const first = firstGrapheme(title);
  if (isEmojiGrapheme(first)) {
    return {
      icon: first,
      title: title.slice(first.length).trimStart(),
    };
  }
  return { icon: DEFAULT_PLAN_ICON, title };
}

export function DailyPlansCard({ cardClassName, contentClassName }: DailyPlansCardProps = {}) {
  const { t } = useTranslation('common');
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const { data: rows, status, reload } = useAsyncData(
    (db) => db.getDailyPlans(dateString),
    [dateString],
    { events: ['task-progress'] }
  );
  const [title, setTitle] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const rowsList = useMemo(() => rows ?? [], [rows]);
  const { submit: submitMutation } = useFormMutation(
    (action: { kind: 'toggle' | 'add' | 'delete' | 'move'; payload?: unknown }) => {
      if (!db) return;
      if (action.kind === 'toggle') {
        const { id, completed } = action.payload as { id: string; completed: boolean };
        db.update('act_daily_plans', id, {
          completed: completed ? 1 : 0,
          updated_at: new Date().toISOString(),
        });
        reload({ silent: true });
        return;
      }
      if (action.kind === 'add') {
        const { dateString: ds, title: t, icon: i } = action.payload as { dateString: string; title: string; icon: string };
        const id = `plan_${ds.replace(/-/g, '')}_${Date.now()}`;
        const now = new Date().toISOString();
        db.create('act_daily_plans', {
          id,
          date: ds,
          icon: normalizePlanIcon(i),
          title: t,
          completed: 0,
          created_at: now,
        });
        reload({ silent: true });
        return;
      }
      if (action.kind === 'delete') {
        const { id } = action.payload as { id: string };
        db.delete('act_daily_plans', id);
        reload({ silent: true });
        return;
      }
      if (action.kind === 'move') {
        const { id, targetId } = action.payload as { id: string; targetId: string };
        const current = rowsList.find((row) => String(row.id) === id);
        const target = rowsList.find((row) => String(row.id) === targetId);
        if (!current || !target) return;
        db.update('act_daily_plans', id, {
          created_at: target.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        db.update('act_daily_plans', targetId, {
          created_at: current.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        reload({ silent: true });
      }
    },
    { eventType: 'task-progress' }
  );

  const toggle = (id: string, completed: boolean) => {
    submitMutation({ kind: 'toggle', payload: { id, completed } });
  };

  const add = () => {
    const parsed = splitLeadingEmojiTitle(title.trim());
    const nextTitle = parsed.title.trim();
    if (!nextTitle) return;
    submitMutation({ kind: 'add', payload: { dateString, title: nextTitle, icon: normalizePlanIcon(parsed.icon) } });
    setTitle('');
    setAddOpen(false);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rowsList.length) return;
    submitMutation({
      kind: 'move',
      payload: {
        id: String(rowsList[index].id),
        targetId: String(rowsList[target].id),
      },
    });
  };

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', cardClassName)}>
        <ul className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain', contentClassName)}>
          {status === 'loading' ? (
            <li className="flex-1"><LoadingShell /></li>
          ) : (
            <>
              {rowsList.map((p, idx) => {
                const id = String(p.id);
                const done = p.completed === 1 || p.completed === true;
	                const rawTitle = String(p.title ?? '');
	                const legacy = splitLeadingEmojiTitle(rawTitle);
	                const label = legacy.title || rawTitle;
	                const storedIcon = typeof p.icon === 'string' && p.icon.trim() ? p.icon.trim() : '';
	                const rowIcon = legacy.icon !== DEFAULT_PLAN_ICON ? legacy.icon : storedIcon || DEFAULT_PLAN_ICON;
                const isFirst = idx === 0;
                const isLast = idx === rowsList.length - 1;
                return (
                  <li key={id}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={done}
                      onClick={() => toggle(id, !done)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        toggle(id, !done);
                      }}
                      className={cn(
                        'group grid cursor-pointer grid-cols-[auto_1fr_auto] overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs aura-tx-surface',
                        'hover:bg-[var(--aura-action-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                      )}
                    >
                      <div className="flex h-full shrink-0 items-center justify-center px-2 py-2">
                        <div
                          className={cn(
                            'flex size-8 items-center justify-center rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-base',
                            done && 'opacity-55'
                          )}
                          aria-hidden
                        >
                          {rowIcon}
                        </div>
                      </div>
                      <div className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left">
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              'text-sm font-semibold leading-snug text-foreground',
                              done && 'line-through text-[var(--aura-text-disabled)]'
                            )}
                          >
                            {label}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-h-0 shrink-0 items-center border-l border-[var(--aura-border-soft)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                        <div className="flex h-full items-center gap-0">
                          {!isFirst ? (
	                            <button
	                              type="button"
	                              className="flex h-full items-center justify-center px-2 py-2 text-[var(--aura-text-muted)] aura-tx-interactive hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground"
	                              aria-label={t('aria.move_up')}
	                              onClick={(event) => {
	                                event.stopPropagation();
	                                move(idx, -1);
	                              }}
	                            >
                              <ChevronUp className="size-4" />
                            </button>
                          ) : null}
                          {!isLast ? (
	                            <button
	                              type="button"
	                              className="flex h-full items-center justify-center px-2 py-2 text-[var(--aura-text-muted)] aura-tx-interactive hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground"
	                              aria-label={t('aria.move_down')}
	                              onClick={(event) => {
	                                event.stopPropagation();
	                                move(idx, 1);
	                              }}
	                            >
                              <ChevronDown className="size-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="flex h-full items-center justify-center px-2 py-2 text-[var(--aura-text-muted)] aura-tx-interactive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={t('aria.delete_item')}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!db) return;
                              submitMutation({ kind: 'delete', payload: { id } });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
              <li>
                <AddListButton onClick={() => setAddOpen(true)} />
              </li>
            </>
          )}
        </ul>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <ActModal
          icon={ClipboardList}
          title={t('field.name')}
          footer={
	            <ActModalFooter
	              onCancel={() => setAddOpen(false)}
	              onSubmit={add}
	              submitDisabled={!splitLeadingEmojiTitle(title.trim()).title.trim()}
	              submitLabel={t('action.add')}
	            />
          }
        >
	          <ActTableBox>
	            <ActFormTable>
	              <ActField id="daily-plan-title" label={t('field.name')}>
                <Input
                  id="daily-plan-title"
                  autoFocus
                  className="h-10 text-sm"
                  placeholder={t('placeholder.new_item')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </ActField>
            </ActFormTable>
          </ActTableBox>
        </ActModal>
      </Dialog>
    </>
  );
}
