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
  /** localStorage — selected mobile tab on rituals page */
  RITUALS_MOBILE_TAB: 'aura-rituals-mobile-tab',
  /** localStorage — selected goal id on rituals page */
  RITUALS_SELECTED_GOAL_ID: 'aura-rituals-selected-goal-id',
  /** localStorage — selected goals mode on rituals page */
  RITUALS_GOALS_MODE: 'aura-rituals-goals-mode',
  /** localStorage — selected points accumulation range on ranks page */
  RANKS_ACCUMULATION_RANGE: 'aura-ranks-accumulation-range',
  /** localStorage — selected mobile panel on ranks page */
  RANKS_MOBILE_PANEL: 'aura-ranks-mobile-panel',
  /** localStorage — selected rank id on ranks page */
  RANKS_SELECTED_RANK_ID: 'aura-ranks-selected-rank-id',
  /** localStorage — stats controls state */
  STATS_CONTROLS: 'aura-stats-controls',
  /** localStorage — selected stats view */
  STATS_VIEW: 'aura-stats-view',
} as const;
