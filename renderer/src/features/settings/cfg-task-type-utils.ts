// ─── cfg-task-type-utils ──────────────────────────────────────────────────────
// Утилиты для ограничения и управления типами задач в CFG-секциях:
// допустимые типы, видимость зависимых полей, переход при смене типа.

import type { CfgSectionSpec } from '@/features/settings/cfg-section-types';

// ─── Allowed task types per section ──────────────────────────────────────────

const SECTION_ALLOWED_TASK_TYPES: Partial<Record<string, string[]>> = {
  'tasks-rituals': ['checkbox', 'number', 'ritual', 'nutrition', 'list'],
  'tasks-time':    ['checkbox', 'number', 'timer', 'nutrition', 'list'],
  'tasks-body':    ['checkbox', 'number', 'nutrition', 'list'],
  'tasks-deps':    ['checkbox'],
};

/**
 * Возвращает список допустимых task_type для данной секции,
 * или null если ограничений нет.
 */
export function allowedTaskTypesForSection(sectionId: string): string[] | null {
  return SECTION_ALLOWED_TASK_TYPES[sectionId] ?? null;
}

// ─── Conditional field visibility ─────────────────────────────────────────────

/**
 * Возвращает true, если поле `fieldKey` должно быть видимо
 * при выбранном `taskType` в задаче.
 */
export function isTaskConditionalFieldVisible(spec: CfgSectionSpec, fieldKey: string, taskType: string): boolean {
  if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') return true;
  if (fieldKey === 'ritual_type') return taskType === 'ritual';
  if (fieldKey === 'cfg_target_value' || fieldKey === 'cfg_unit') return taskType === 'number';
  if (fieldKey === 'cfg_target_hours') return taskType === 'timer';
  if (fieldKey === 'config') return taskType === 'list';
  return true;
}

/**
 * Возвращает true, если поле является условным (зависит от task_type).
 * Такие поля рендерятся в раскрывающейся секции «Параметры типа».
 */
export function isTaskDependentFieldKey(spec: CfgSectionSpec, fieldKey: string): boolean {
  if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') return false;
  return (
    fieldKey === 'ritual_type' ||
    fieldKey === 'cfg_target_value' ||
    fieldKey === 'cfg_unit' ||
    fieldKey === 'cfg_target_hours' ||
    fieldKey === 'config'
  );
}

// ─── Task type label ──────────────────────────────────────────────────────────

/** Человекочитаемое название типа задачи из переведённой спецификации. */
export function taskTypeLabel(translatedSpec: CfgSectionSpec, taskType: string): string {
  const field = translatedSpec.fields.find((f) => f.key === 'task_type');
  const opt = field?.options?.find((o) => o.value === taskType);
  return opt?.label ?? taskType;
}

// ─── Task type transition ─────────────────────────────────────────────────────

/**
 * При смене task_type очищает поля, которые стали неактуальными.
 * Возвращает новое состояние формы.
 */
export function applyTaskTypeTransition(
  prev: Record<string, string>,
  spec: CfgSectionSpec,
  nextTaskType: string
): Record<string, string> {
  if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') {
    return { ...prev, task_type: nextTaskType };
  }
  const next: Record<string, string> = { ...prev, task_type: nextTaskType };
  if (nextTaskType !== 'ritual') next.ritual_type = '';
  // nutrition task is driven by the daily calorie target from app settings — no extra field to clear
  if (nextTaskType !== 'number') {
    next.cfg_target_value = '';
    next.cfg_unit = '';
  }
  if (nextTaskType !== 'timer') next.cfg_target_hours = '';
  if (nextTaskType !== 'list') next.config = next.config || '{"items":[]}';
  return next;
}
