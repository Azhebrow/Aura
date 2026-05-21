import type { AuraRow } from '@/types/aura';

export const TASKS_HIDE_COMPLETION_PERCENT_FIELD = 'tasks_hide_completion_percent';

function readBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

export function getHomeTaskDisplaySettings(settings: AuraRow | null | undefined): {
  showPercentBadges: boolean;
} {
  const hideCompletionPercent = readBooleanSetting(settings?.[TASKS_HIDE_COMPLETION_PERCENT_FIELD], false);
  return {
    showPercentBadges: !hideCompletionPercent,
  };
}
