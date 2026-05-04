import { useCallback, useEffect, useState } from 'react';
import { coerceTaskColor } from '@/lib/css-color';
import type { AuraDatabase } from '@/types/aura';
import type { AuraRow } from '@/types/aura';
import type { TimerTaskSelection } from '@/features/timer/use-timer-session';

export type TimerTaskTab = 'tasks' | 'escape' | 'filling';

function loadTasksForTab(db: AuraDatabase, tab: TimerTaskTab, dateString: string): TimerTaskRow[] {
  let rows: AuraRow[] = [];
  if (tab === 'escape') {
    rows = db
      .getAll('cfg_leisure_tasks')
      .filter((t) => t.task_type === 'timer' && t.leisure_type === 'escape');
  } else if (tab === 'filling') {
    rows = db
      .getAll('cfg_leisure_tasks')
      .filter((t) => t.task_type === 'timer' && t.leisure_type === 'filling');
  } else {
    rows = db
      .getAll('cfg_tasks')
      .filter((t) => t.task_type === 'timer' && t.category_type === 'time');
  }
  rows.sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
  return rows.map((t) => ({
    id: String(t.id),
    title: String(t.title ?? t.name ?? t.id),
    cfg_target_hours: t.cfg_target_hours != null ? Number(t.cfg_target_hours) : undefined,
    color: coerceTaskColor(t.color) ?? undefined,
    icon:
      typeof t.icon === 'string'
        ? t.icon
        : t.icon != null && String(t.icon).trim()
          ? String(t.icon)
          : undefined,
    currentSeconds: db.getTaskTimerTotal(dateString, String(t.id)),
  }));
}

export type TimerTaskRow = TimerTaskSelection & { currentSeconds: number };

function sameTasks(a: TimerTaskRow[], b: TimerTaskRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.title !== y.title ||
      x.cfg_target_hours !== y.cfg_target_hours ||
      x.color !== y.color ||
      x.icon !== y.icon ||
      x.currentSeconds !== y.currentSeconds
    ) {
      return false;
    }
  }
  return true;
}

function sameTaskGroups(a: TimerTasksByGroup, b: TimerTasksByGroup): boolean {
  return sameTasks(a.tasks, b.tasks) && sameTasks(a.escape, b.escape) && sameTasks(a.filling, b.filling);
}

export function useTimerTasks(db: AuraDatabase | null, dateString: string, tab: TimerTaskTab, refreshKey?: number) {
  const [tasks, setTasks] = useState<TimerTaskRow[]>([]);

  const reload = useCallback(() => {
    if (!db) {
      setTasks([]);
      return;
    }
    const next = loadTasksForTab(db, tab, dateString);
    setTasks((prev) => (sameTasks(prev, next) ? prev : next));
  }, [db, dateString, tab]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  return { tasks, reload };
}

export type TimerTasksByGroup = Record<TimerTaskTab, TimerTaskRow[]>;

/** Все таймер-задачи: фокус, эскапизм, наполнение — без вкладок. */
export function useTimerTasksAll(db: AuraDatabase | null, dateString: string, refreshKey?: number) {
  const [byGroup, setByGroup] = useState<TimerTasksByGroup>({ tasks: [], escape: [], filling: [] });

  const reload = useCallback(() => {
    if (!db) {
      setByGroup({ tasks: [], escape: [], filling: [] });
      return;
    }
    const next = {
      tasks: loadTasksForTab(db, 'tasks', dateString),
      escape: loadTasksForTab(db, 'escape', dateString),
      filling: loadTasksForTab(db, 'filling', dateString),
    };
    setByGroup((prev) => (sameTaskGroups(prev, next) ? prev : next));
  }, [db, dateString]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  return { byGroup, reload };
}
