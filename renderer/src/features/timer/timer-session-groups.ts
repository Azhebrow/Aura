import type { AuraDatabase, AuraRow } from '@/types/aura';
import type { TimerTaskTab } from '@/features/timer/use-timer-tasks';

export type TimerSessionGroup = TimerTaskTab | 'unknown';

export function buildTimerTaskGroupById(db: AuraDatabase | null): Map<string, TimerTaskTab> {
  const map = new Map<string, TimerTaskTab>();
  if (!db) return map;

  for (const row of db.getAll('cfg_tasks')) {
    if (row.task_type !== 'timer' || row.category_type !== 'time' || row.id == null) continue;
    map.set(String(row.id), 'tasks');
  }

  for (const row of db.getAll('cfg_leisure_tasks')) {
    if (row.task_type !== 'timer' || row.id == null) continue;
    const leisureType = String(row.leisure_type ?? '');
    if (leisureType === 'escape') {
      map.set(String(row.id), 'escape');
      continue;
    }
    if (leisureType === 'filling') {
      map.set(String(row.id), 'filling');
    }
  }

  return map;
}

export function getSessionGroup(session: AuraRow, groupByTaskId: Map<string, TimerTaskTab>): TimerSessionGroup {
  const taskId = String(session.task_id ?? '');
  if (!taskId) return 'unknown';
  return groupByTaskId.get(taskId) ?? 'unknown';
}
