import { useCallback, useEffect, useState } from 'react';
import { AddListButton } from '@/components/ui/add-list-button';
import { ListItem } from '@/components/ui/list-item';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraRow } from '@/types/aura';
import { cn } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';
import { ActField, ActFormTable, ActModal, ActModalFooter, ActTableBox } from '@/features/act/ActModal';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';

type DailyPlansCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

export function DailyPlansCard({ cardClassName, contentClassName }: DailyPlansCardProps = {}) {
  const { dateString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const [rows, setRows] = useState<AuraRow[]>([]);
  const [title, setTitle] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const reload = useCallback(() => {
    if (!db) {
      setRows([]);
      return;
    }
    setRows(db.getDailyPlans(dateString));
  }, [db, dateString]);

  useEffect(() => {
    if (!ready) return;
    reload();
  }, [ready, reload]);

  const toggle = (id: string, completed: boolean) => {
    if (!db) return;
    runAuraMutation('task-progress', () => {
      db.update('act_daily_plans', id, {
        completed: completed ? 1 : 0,
        updated_at: new Date().toISOString(),
      });
    });
    reload();
  };

  const add = () => {
    const t = title.trim();
    if (!t || !db) return;
    const id = `plan_${dateString.replace(/-/g, '')}_${Date.now()}`;
    const now = new Date().toISOString();
    runAuraMutation('task-progress', () => {
      db.addDailyPlan({
        id,
        date: dateString,
        title: t,
        completed: 0,
        created_at: now,
        updated_at: now,
      });
    });
    setTitle('');
    setAddOpen(false);
    reload();
  };

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', cardClassName)}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-1', contentClassName)}>
          {!ready ? (
            <p className="text-muted-foreground text-sm">Загрузка…</p>
          ) : rows.length === 0 ? null : (
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-y-contain pr-0.5">
              {rows.map((p) => {
                const id = String(p.id);
                const done = p.completed === 1 || p.completed === true;
                const label = String(p.title ?? '');
                
                const idx = rows.findIndex(r => String(r.id) === id);
                const isFirst = idx === 0;
                const isLast = idx === rows.length - 1;

                return (
                  <li key={id}>
                    <ListItem
                      mode="checkbox-delete"
                      title={label}
                      checked={done}
                      onCheckedChange={(c) => toggle(id, c)}
                      onMoveUp={!isFirst ? () => {
                        // Логика перемещения вверх
                        const temp = rows[idx];
                        const newRows = [...rows];
                        newRows[idx] = newRows[idx - 1];
                        newRows[idx - 1] = temp;
                        setRows(newRows);
                      } : undefined}
                      onMoveDown={!isLast ? () => {
                        // Логика перемещения вниз
                        const temp = rows[idx];
                        const newRows = [...rows];
                        newRows[idx] = newRows[idx + 1];
                        newRows[idx + 1] = temp;
                        setRows(newRows);
                      } : undefined}
                      onDelete={() => {
                        if (!db) return;
                        runAuraMutation('task-progress', () => db.delete('act_daily_plans', id));
                        reload();
                      }}
                      isDone={done}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <AddListButton onClick={() => setAddOpen(true)} disabled={!ready || !db} className="mt-auto" />
        </div>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') add();
                  }}
                />
              </ActField>
            </ActFormTable>
          </ActTableBox>
        </ActModal>
      </Dialog>
    </>
  );
}
