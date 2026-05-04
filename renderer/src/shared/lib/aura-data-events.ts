export const AURA_DATA_CHANGED = 'aura-data-changed';

export type AuraDataChangedDetail = {
  type?: string;
};

export function dispatchAuraDataChanged(type: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AuraDataChangedDetail>(AURA_DATA_CHANGED, { detail: { type } }));
}

export function prefixesForAuraDataType(type: string): string[] {
  switch (type) {
    case 'task-progress':
    case 'task-categories':
      return ['tasks_', 'rank_'];
    case 'transaction':
      return ['finance_'];
    case 'timer':
      return ['time_', 'leisure_', 'tasks_', 'rank_'];
    case 'ritual':
      return ['rituals_', 'tasks_', 'rank_'];
    case 'nutrition':
      return ['nutrition_', 'tasks_', 'rank_'];
    case 'diary':
    case 'mood':
      return ['mood_'];
    case 'points':
      return ['rank_', 'tasks_'];
    case 'goals':
      return ['tasks_', 'rank_', 'rituals_'];
    default:
      return [];
  }
}
