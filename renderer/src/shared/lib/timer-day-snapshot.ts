import { coerceTaskColor } from '@/lib/css-color';
import type { AuraDatabase, AuraRow } from '@/types/aura';

export type TimerTaskGroupKey = 'tasks' | 'escape' | 'filling';

export type TimerTaskSnapshotRow = {
  id: string;
  title: string;
  cfg_target_hours?: number;
  color?: string;
  icon?: string;
  currentSeconds: number;
};

export type TimerPickerTask = {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  group: 'Фокус' | 'Эскапизм' | 'Наполнение';
};

export type TimerDaySnapshot = {
  date: string;
  byGroup: Record<TimerTaskGroupKey, TimerTaskSnapshotRow[]>;
  sessions: AuraRow[];
  pickerTasks: TimerPickerTask[];
  taskGroupById: Map<string, TimerTaskGroupKey>;
  taskMetaById: Map<string, { title: string; icon?: string; color?: string }>;
};

const EMPTY_GROUPS: Record<TimerTaskGroupKey, TimerTaskSnapshotRow[]> = {
  tasks: [],
  escape: [],
  filling: [],
};

function safeRows(value: unknown): AuraRow[] {
  return Array.isArray(value) ? (value as AuraRow[]) : [];
}

function timerTotal(db: AuraDatabase, date: string, taskId: string): number {
  try {
    return Math.max(0, Number(db.getTaskTimerTotal(date, taskId)) || 0);
  } catch {
    return 0;
  }
}

function toTaskRow(db: AuraDatabase, date: string, row: AuraRow): TimerTaskSnapshotRow | null {
  const id = String(row.id ?? '');
  if (!id) return null;
  return {
    id,
    title: String(row.title ?? row.name ?? id),
    cfg_target_hours: row.cfg_target_hours != null ? Number(row.cfg_target_hours) : undefined,
    color: coerceTaskColor(row.color) ?? undefined,
    icon:
      typeof row.icon === 'string'
        ? row.icon
        : row.icon != null && String(row.icon).trim()
          ? String(row.icon)
          : undefined,
    currentSeconds: timerTotal(db, date, id),
  };
}

function sortTimerRows(rows: AuraRow[]) {
  return [...rows].sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
}

export function buildTimerDaySnapshot(db: AuraDatabase | null, date: string): TimerDaySnapshot {
  if (!db) {
    return {
      date,
      byGroup: { ...EMPTY_GROUPS },
      sessions: [],
      pickerTasks: [],
      taskGroupById: new Map(),
      taskMetaById: new Map(),
    };
  }

  const cfgTasks = safeRows(db.getAll('cfg_tasks'));
  const leisureTasks = safeRows(db.getAll('cfg_leisure_tasks'));
  const byGroup: Record<TimerTaskGroupKey, TimerTaskSnapshotRow[]> = {
    tasks: sortTimerRows(cfgTasks)
      .filter((row) => row.task_type === 'timer' && row.category_type === 'time')
      .flatMap((row) => {
        const task = toTaskRow(db, date, row);
        return task ? [task] : [];
      }),
    escape: sortTimerRows(leisureTasks)
      .filter((row) => row.task_type === 'timer' && row.leisure_type === 'escape')
      .flatMap((row) => {
        const task = toTaskRow(db, date, row);
        return task ? [task] : [];
      }),
    filling: sortTimerRows(leisureTasks)
      .filter((row) => row.task_type === 'timer' && row.leisure_type === 'filling')
      .flatMap((row) => {
        const task = toTaskRow(db, date, row);
        return task ? [task] : [];
      }),
  };

  const taskGroupById = new Map<string, TimerTaskGroupKey>();
  const taskMetaById = new Map<string, { title: string; icon?: string; color?: string }>();
  const pickerTasks: TimerPickerTask[] = [];
  const groups: Array<[TimerTaskGroupKey, TimerPickerTask['group']]> = [
    ['tasks', 'Фокус'],
    ['escape', 'Эскапизм'],
    ['filling', 'Наполнение'],
  ];
  for (const [groupKey, label] of groups) {
    for (const task of byGroup[groupKey]) {
      taskGroupById.set(task.id, groupKey);
      taskMetaById.set(task.id, { title: task.title, icon: task.icon, color: task.color });
      pickerTasks.push({ id: task.id, title: task.title, icon: task.icon, color: task.color, group: label });
    }
  }

  return {
    date,
    byGroup,
    sessions: safeRows(db.getTimerSessions(date)),
    pickerTasks,
    taskGroupById,
    taskMetaById,
  };
}

export function timerTaskDailyProgressPct(task: Pick<TimerTaskSnapshotRow, 'cfg_target_hours' | 'currentSeconds'>): number {
  const targetHours = task.cfg_target_hours ?? 0;
  if (!(targetHours > 0)) return 0;
  return Math.min(100, Math.round((task.currentSeconds / (targetHours * 3600)) * 100));
}
