/** Shared localStorage / sessionStorage key constants. Single source of truth. */
export const STORAGE_KEYS = {
  /** sessionStorage — persists selected ritual kind across component mounts */
  RITUALS_KIND: 'aura-rituals-kind',
  /** window event — announces a requested ritual kind when navigating from home */
  RITUALS_KIND_INTENT_EVENT: 'aura-rituals-kind-intent',
  /** localStorage — one-shot timer task selection requested from another page */
  TIMER_TASK_ID: 'aura-timer-task-id',
  /** window event — announces requested timer task selection */
  TIMER_TASK_INTENT_EVENT: 'aura-timer-task-intent',
  /** localStorage — persists calendar view type preference */
  CALENDAR_DATA_TYPE: 'calendar_data_type',
} as const;
