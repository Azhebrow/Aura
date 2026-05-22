import type { AuraDatabase } from '@/types/aura';
import { DEFAULT_TASK_CATEGORY_COLORS } from '@/shared/config/aura-palette';
import { TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';

export type TaskCategoryKey = 'rituals' | 'time' | 'body' | 'deps';

const DEFAULT: Record<TaskCategoryKey, { title: string; icon: string; color: string }> = {
  rituals: { ...TASK_CATEGORY_DEFAULT_META.rituals, color: DEFAULT_TASK_CATEGORY_COLORS.rituals },
  time: { ...TASK_CATEGORY_DEFAULT_META.time, color: DEFAULT_TASK_CATEGORY_COLORS.time },
  body: { ...TASK_CATEGORY_DEFAULT_META.body, color: DEFAULT_TASK_CATEGORY_COLORS.body },
  deps: { ...TASK_CATEGORY_DEFAULT_META.deps, color: DEFAULT_TASK_CATEGORY_COLORS.deps },
};

function parse(raw: unknown): Record<string, { title?: string; icon?: string; color?: string }> | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, { title?: string; icon?: string; color?: string }>;
  } catch {
    /* ignore */
  }
  return null;
}

export function loadTaskCategoryConfig(db: AuraDatabase | null): Record<TaskCategoryKey, { title: string; icon: string; color: string }> {
  const out = { ...DEFAULT };
  if (!db) return out;
  try {
    const settings = db.getAppSettings();
    const raw = settings && typeof settings === 'object' ? (settings as { task_categories_config?: unknown }).task_categories_config : null;
    const parsed = parse(raw);
    if (!parsed) return out;
    for (const key of Object.keys(DEFAULT) as TaskCategoryKey[]) {
      const v = parsed[key];
      if (v && typeof v === 'object') {
        out[key] = {
          title: typeof v.title === 'string' && v.title ? v.title : DEFAULT[key].title,
          icon: typeof v.icon === 'string' && v.icon ? v.icon : DEFAULT[key].icon,
          color: typeof v.color === 'string' && v.color ? v.color : DEFAULT[key].color,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function getCategoryTitle(key: TaskCategoryKey, db: AuraDatabase | null): string {
  return loadTaskCategoryConfig(db)[key].title;
}

export function getCategoryIcon(key: TaskCategoryKey, db: AuraDatabase | null): string {
  return loadTaskCategoryConfig(db)[key].icon;
}

export function getCategoryColor(key: TaskCategoryKey, db: AuraDatabase | null): string {
  return loadTaskCategoryConfig(db)[key].color;
}
