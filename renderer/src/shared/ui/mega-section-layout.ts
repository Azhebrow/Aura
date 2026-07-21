/**
 * App workspace layout vocabulary.
 *
 * These constants are the default visual contract for dense application screens:
 * Home, Rituals, Timer, Diary, Stats, Ranks, Calendar, and Settings. Keep page
 * files on this vocabulary before introducing local layout classes.
 *
 * Intentional exceptions:
 * - onboarding can be more editorial;
 * - fullscreen timer can be immersive;
 * - small repeated rows can use their own row primitives.
 */
export const MEGA_PAGEFRAME_CN = 'flex min-h-0 min-w-0 flex-1 flex-col';

export const MEGA_PAGEFRAME_CONTENT_CN = 'flex min-h-0 min-w-0 flex-1 flex-col gap-0';

export const MEGA_SHELL_CARD_CN =
  'aura-mega-shell-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-2xl sm:border sm:border-soft sm:bg-card sm:shadow-sm lg:h-full lg:max-h-full lg:min-h-0';

export const MEGA_SHELL_CONTENT_CN = 'flex h-full min-h-0 flex-1 flex-col gap-0 p-0';

export const MEGA_PANEL_HEADER_CN =
  'aura-mega-panel-header flex h-10 min-h-10 shrink-0 items-center justify-between gap-2 border-b border-soft bg-panel px-3 sm:h-11 sm:min-h-11 sm:px-4';

export const MEGA_PANEL_MICRO_TITLE_CN = 'text-dim text-xs font-semibold uppercase tracking-wider';

export const MEGA_PANEL_BODY_CN = 'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4';

export const MEGA_SECTION_INSET_CN = 'p-0 sm:px-4 sm:py-4';

export const MEGA_PANEL_INSET_CN = 'min-h-0 flex flex-1 flex-col overflow-hidden p-4';

export const MEGA_PANEL_INSET_SCROLL_CN =
  'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4';

export const LIST_SCROLL_CONTAINER_CN = 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain';

export const LIST_CONTENT_CN = 'flex flex-col gap-1.5';

/** Control strip: same neutral shell everywhere (diary, nutrition, timer, goals). */
export const MEGA_SECTION_CONTROL_CARD_CN =
  'w-full shrink-0 rounded-xl border border-soft bg-panel px-3 py-2 sm:px-4 sm:py-2.5';

export const MEGA_EMPTY_STATE_CN =
  'flex min-h-0 flex-1 items-center justify-center p-5 text-center text-sm text-muted-foreground';

export const MEGA_SPLIT_ROW_CN = 'flex min-h-0 flex-1 overflow-hidden divide-x divide-soft';

export const MEGA_SPLIT_COLUMN_CN = 'flex min-h-0 flex-1 flex-col overflow-hidden divide-y divide-soft';
