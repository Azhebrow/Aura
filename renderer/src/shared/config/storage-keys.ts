/** Shared localStorage / sessionStorage key constants. Single source of truth. */
export const STORAGE_KEYS = {
  /** sessionStorage — persists selected ritual kind across component mounts */
  RITUALS_KIND: 'aura-rituals-kind',
  /** localStorage — persists calendar view type preference */
  CALENDAR_DATA_TYPE: 'calendar_data_type',
} as const;
