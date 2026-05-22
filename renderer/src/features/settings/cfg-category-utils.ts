// ─── cfg-category-utils ───────────────────────────────────────────────────────
// Утилиты для чтения и записи настроек категорий задач (title/icon/color).

import { TASK_CATEGORY_PALETTE } from '@/shared/config/aura-palette';
import { TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskCategoryKey = 'rituals' | 'time' | 'body' | 'deps';
export type TaskCategoryConfig = { title: string; icon: string; color: string };

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const TASK_CATEGORY_DEFAULTS: Record<TaskCategoryKey, TaskCategoryConfig> = {
  rituals: { ...TASK_CATEGORY_DEFAULT_META.rituals, color: TASK_CATEGORY_PALETTE[0] },
  time:    { ...TASK_CATEGORY_DEFAULT_META.time,    color: TASK_CATEGORY_PALETTE[1] },
  body:    { ...TASK_CATEGORY_DEFAULT_META.body,    color: TASK_CATEGORY_PALETTE[2] },
  deps:    { ...TASK_CATEGORY_DEFAULT_META.deps,    color: TASK_CATEGORY_PALETTE[3] },
};

// ─── Section → category key ───────────────────────────────────────────────────

const SECTION_TASK_CATEGORY_KEY: Partial<Record<string, TaskCategoryKey>> = {
  'tasks-rituals': 'rituals',
  'tasks-time':    'time',
  'tasks-body':    'body',
  'tasks-deps':    'deps',
};

/** Возвращает ключ категории задачи для данной секции, или null. */
export function sectionTaskCategoryKey(sectionId: string): TaskCategoryKey | null {
  return SECTION_TASK_CATEGORY_KEY[sectionId] ?? null;
}

// ─── Config reader ────────────────────────────────────────────────────────────

/**
 * Читает конфиг одной категории из JSON-поля `task_categories_config`.
 * При ошибке или отсутствии данных возвращает дефолт.
 */
export function readTaskCategoryConfig(raw: unknown, key: TaskCategoryKey): TaskCategoryConfig {
  const def = TASK_CATEGORY_DEFAULTS[key];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return def;
    const block = (parsed as Record<string, unknown>)[key];
    if (!block || typeof block !== 'object') return def;
    const e = block as Record<string, unknown>;
    return {
      title: typeof e.title === 'string' && e.title.trim() ? e.title.trim() : def.title,
      icon:  typeof e.icon  === 'string' && e.icon.trim()  ? e.icon.trim()  : def.icon,
      color: typeof e.color === 'string' && e.color.trim() ? e.color.trim() : def.color,
    };
  } catch {
    return def;
  }
}
