import { useMemo, useState } from 'react';
import { AddListButton } from '@/components/ui/add-list-button';
import { ListItem } from '@/components/ui/list-item';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { cn } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';
import { ActField, ActFormTable, ActModal, ActModalFooter, ActTableBox } from '@/features/act/ActModal';
import { LoadingShell } from '@/shared/ui/data-states';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { useFormMutation } from '@/shared/hooks/use-form-mutation';

type DailyPlansCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

export function DailyPlansCard({ cardClassName, contentClassName }: DailyPlansCardProps = {}) {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const { data: rows, status } = useAsyncData(
    (db) => db.getDailyPlans(dateString),
    [dateString],
    { events: ['task-progress'] }
  );
  const [title, setTitle] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const rowsList = useMemo(() => rows ?? [], [rows]);
  const { submit: submitMutation } = useFormMutation(
    (action: { kind: 'toggle' | 'add' | 'delete'; payload?: unknown }) => {
      if (!db) return;
      if (action.kind === 'toggle') {
        const { id, completed } = action.payload as { id: string; completed: boolean };
        db.update('act_daily_plans', id, {
          completed: completed ? 1 : 0,
          updated_at: new Date().toISOString(),
        });
        return;
      }
      if (action.kind === 'add') {
        const { dateString: ds, title: t } = action.payload as { dateString: string; title: string };
        const id = `plan_${ds.replace(/-/g, '')}_${Date.now()}`;
        const now = new Date().toISOString();
        db.addDailyPlan({
          id,
          date: ds,
          title: t,
          completed: 0,
          created_at: now,
          updated_at: now,
        });
        return;
      }
      if (action.kind === 'delete') {
        const { id } = action.payload as { id: string };
        db.delete('act_daily_plans', id);
      }
    },
    { eventType: 'task-progress' }
  );

  const toggle = (id: string, completed: boolean) => {
    submitMutation({ kind: 'toggle', payload: { id, completed } });
  };

  const add = () => {
    const t = title.trim();
    if (!t) return;
    submitMutation({ kind: 'add', payload: { dateString, title: t } });
    setTitle('');
    setAddOpen(false);
  };

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', cardClassName)}>
        <ul className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain', contentClassName)}>
          {status === 'loading' ? (
            <li className="flex-1"><LoadingShell /></li>
          ) : (
            <>
              {rowsList.map((p) => {
                const id = String(p.id);
                const done = p.completed === 1 || p.completed === true;
                const label = String(p.title ?? '');
                const idx = rowsList.findIndex(r => String(r.id) === id);
                const isFirst = idx === 0;
                const isLast = idx === rowsList.length - 1;
                return (
                  <li key={id}>
                    <ListItem
                      mode="checkbox-delete"
                      title={label}
                      checked={done}
                      onCheckedChange={(c) => toggle(id, c)}
                      onMoveUp={!isFirst ? () => {} : undefined}
                      onMoveDown={!isLast ? () => {} : undefined}
                      onDelete={() => {
                        if (!db) return;
                        submitMutation({ kind: 'delete', payload: { id } });
                      }}
                      isDone={done}
                    />
                  </li>
                );
              })}
              <li className="mt-2">
                <AddListButton onClick={() => setAddOpen(true)} disabled={status === 'loading'} />
              </li>
            </>
          )}
        </ul>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <ActModal
          icon={ClipboardList}
          title="Новый пункт плана"
          footer={
            <ActModalFooter
              onCancel={() => setAddOpen(false)}
              onSubmit={add}
              submitDisabled={!title.trim()}
              submitLabel="Добавить"
            />
          }
        >
          <ActTableBox>
            <ActFormTable>
              <ActField id="daily-plan-title" label="Название">
                <Input
                  id="daily-plan-title"
                  autoFocus
                  className="h-10 text-sm"
                  placeholder="Новый пункт…"
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
