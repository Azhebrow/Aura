import type { AuraDatabase, AuraRow } from '@/types/aura';
import { GOALS_GLOBAL_SCOPE_DATE } from '@/features/rituals/rituals-utils';

export type RitualsSnapshot = {
  date: string;
  cfgRitualsMorning: AuraRow[];
  cfgRitualsEvening: AuraRow[];
  ritualsMorningRows: AuraRow[];
  ritualsEveningRows: AuraRow[];
  cfgVows: AuraRow[];
  goals: AuraRow[];
  stagesByGoal: Record<string, AuraRow[]>;
  tasksByStage: Record<string, AuraRow[]>;
  goalProgressRows: AuraRow[];
};

function sortByOrder(rows: AuraRow[]) {
  return [...rows].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
}

export function buildRitualsSnapshot(db: AuraDatabase | null, date: string): RitualsSnapshot {
  const goals = db?.getAll('cfg_goals') ?? [];
  const stages = db?.getAll('cfg_goal_stages') ?? [];
  const tasks = db?.getAll('cfg_goal_tasks') ?? [];
  const stagesByGoal: Record<string, AuraRow[]> = {};
  const tasksByStage: Record<string, AuraRow[]> = {};
  for (const goal of goals) {
    const goalId = String(goal.id ?? '');
    if (!goalId) continue;
    stagesByGoal[goalId] = sortByOrder(stages.filter((stage) => String(stage.goal_id ?? '') === goalId));
    for (const stage of stagesByGoal[goalId]) {
      const stageId = String(stage.id ?? '');
      if (!stageId) continue;
      tasksByStage[stageId] = sortByOrder(tasks.filter((task) => String(task.stage_id ?? '') === stageId));
    }
  }

  return {
    date,
    cfgRitualsMorning: db?.getAll('cfg_rituals_morning') ?? [],
    cfgRitualsEvening: db?.getAll('cfg_rituals_evening') ?? [],
    ritualsMorningRows: db?.getRitualsMorning(date) ?? [],
    ritualsEveningRows: db?.getRitualsEvening(date) ?? [],
    cfgVows: db?.getAll('cfg_vows') ?? [],
    goals,
    stagesByGoal,
    tasksByStage,
    goalProgressRows: db?.getGoalTasksProgressByDate?.(GOALS_GLOBAL_SCOPE_DATE) ?? [],
  };
}
