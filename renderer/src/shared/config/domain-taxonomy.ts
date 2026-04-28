export const TASK_CATEGORY_IDS = ['rituals', 'time', 'body', 'deps'] as const;
export type TaskCategoryId = (typeof TASK_CATEGORY_IDS)[number];

export const TASK_CATEGORY_DEFAULT_META: Record<TaskCategoryId, { title: string; icon: string }> = {
  rituals: { title: 'Рутина', icon: 'sparkles' },
  time: { title: 'Фокус', icon: 'timer' },
  body: { title: 'Тонус', icon: 'activity' },
  deps: { title: 'Детокс', icon: 'ban' },
};

export const LEISURE_CATEGORY_META = {
  filling: { title: 'Наполнение', icon: 'sparkles' },
  escape: { title: 'Эскапизм', icon: 'ghost' },
} as const;

export const NUTRITION_SECTION_META = {
  products: { title: 'Продукты', icon: 'apple' },
  presets: { title: 'Блюда', icon: 'utensils-crossed' },
} as const;
