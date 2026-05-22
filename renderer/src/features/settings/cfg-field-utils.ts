// ─── cfg-field-utils ─────────────────────────────────────────────────────────
// Утилиты для работы с полями форм CFG-диалога:
// сериализация/десериализация, приведение типов, сборка payload для БД.

import type { CfgFieldDef, CfgSectionSpec } from '@/features/settings/cfg-section-types';
import type { AuraRow } from '@/types/aura';

// ─── Number parsing ───────────────────────────────────────────────────────────

/**
 * Парсит строку в float с поддержкой запятой как разделителя (ru-locale).
 * Возвращает NaN при невалидном вводе.
 */
export function parseLocalFloat(s: string): number {
  return Number.parseFloat(String(s).replace(',', '.'));
}

// ─── Affix helpers ────────────────────────────────────────────────────────────

/** Динамический суффикс из другого поля формы (напр. единица измерения). */
export function suffixDynamicFromForm(f: CfgFieldDef, form: Record<string, string>): string | undefined {
  if (!f.suffixFromField) return undefined;
  const v = form[f.suffixFromField]?.trim();
  return v || undefined;
}

/** Итоговый суффикс для отображения: dynamic + static. */
export function cfgDisplayAffix(f: CfgFieldDef, form: Record<string, string>): string {
  const dyn = suffixDynamicFromForm(f, form) ?? '';
  const stat = f.suffix ?? '';
  return `${dyn}${stat}`;
}

// ─── Form value extraction ────────────────────────────────────────────────────

/**
 * Преобразует значение из AuraRow в строку для формы.
 * Учитывает особые случаи: финансовые расходы, тип счёта, чекбоксы.
 */
export function formValueFromRow(def: CfgFieldDef, row: AuraRow, sectionId: string): string {
  const raw = row[def.key];
  if (sectionId === 'finance-expense' && def.key === 'type' && def.kind === 'checkbox') {
    return String(raw ?? '') === 'compulsive' ? '1' : '0';
  }
  if (def.kind === 'checkbox') return raw === 1 || raw === true ? '1' : '0';
  if (raw === null || raw === undefined) return '';
  if (def.key === 'type' && def.options?.some((o) => o.value === '__ordinary__')) {
    const s = String(raw);
    return s === '' || s === 'ordinary' ? '__ordinary__' : s;
  }
  return String(raw);
}

// ─── Field coercion ───────────────────────────────────────────────────────────

/**
 * Приводит строковое значение формы к нужному типу для записи в БД.
 */
export function coerceField(def: CfgFieldDef, str: string | undefined): unknown {
  const v = str ?? '';
  if (def.kind === 'checkbox') return v === '1' || v === 'true' ? 1 : 0;
  if (def.kind === 'number') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def.min ?? 0;
  }
  if (def.kind === 'color') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  const t = v.trim();
  if (def.key === 'type' && t === '__ordinary__') return '';
  return t === '' ? null : t;
}

// ─── Row cleanup ──────────────────────────────────────────────────────────────

const TASK_TABLES = new Set(['cfg_tasks', 'cfg_leisure_tasks']);
const NO_COLOR_TABLES = new Set([
  'cfg_tasks',
  'cfg_leisure_tasks',
  'cfg_vows',
  'cfg_nutrition_products',
  'cfg_nutrition_presets',
  'cfg_ambient_music',
]);

/**
 * Удаляет поля, которые не применимы к данной таблице или типу задачи,
 * чтобы не записывать мусор в БД.
 */
export function cleanupRow(table: string, payload: AuraRow): AuraRow {
  const p = { ...payload };
  if (TASK_TABLES.has(table)) {
    if (p.task_type !== 'ritual') delete p.ritual_type;
    if (p.task_type !== 'number') { delete p.cfg_target_value; delete p.cfg_unit; }
    if (p.task_type !== 'timer') delete p.cfg_target_hours;
    if (p.task_type !== 'list') delete p.config;
  }
  if (NO_COLOR_TABLES.has(table)) p.color = null;
  return p;
}

// ─── Payload builder ──────────────────────────────────────────────────────────

/**
 * Собирает объект для create/update из значений формы.
 * Применяет фильтры, extra-поля и очистку от несовместимых ключей.
 */
export function buildPayloadFromForm(
  spec: CfgSectionSpec,
  form: Record<string, string>,
  mode: 'create' | 'edit',
  editId?: string
): AuraRow {
  const out: AuraRow = {};
  if (mode === 'create') {
    Object.assign(out, spec.filter ?? {}, spec.createExtra ?? {});
  }
  if (mode === 'edit' && editId != null) out.id = editId;
  for (const f of spec.fields) {
    if (spec.sectionId === 'finance-expense' && f.key === 'type') {
      out[f.key] = form[f.key] === '1' ? 'compulsive' : '';
    } else {
      out[f.key] = coerceField(f, form[f.key]);
    }
  }
  return cleanupRow(spec.table, out);
}

// ─── Nutrition preset ingredients ─────────────────────────────────────────────

/** Черновик ингредиента для редактора состава блюда. */
export type PresetIngredientDraft = {
  product_id: string;
  amount: string;
  unit: 'portions' | 'grams';
};

/**
 * Парсит JSON-поле `products` из строки в список черновиков ингредиентов.
 * При ошибке возвращает один пустой слот.
 */
export function parsePresetIngredientDrafts(raw: string | undefined): PresetIngredientDraft[] {
  try {
    const parsed = JSON.parse(raw || '[]') as Array<{ product_id?: unknown; portions?: unknown }>;
    if (!Array.isArray(parsed)) return [];
    const mapped = parsed
      .map((it) => ({
        product_id: typeof it?.product_id === 'string' ? it.product_id : '',
        amount: String(Number(it?.portions ?? 0) || 0),
        unit: 'portions' as const,
      }))
      .filter((it) => it.product_id);
    return mapped.length > 0 ? mapped : [{ product_id: '', amount: '1', unit: 'portions' }];
  } catch {
    return [{ product_id: '', amount: '1', unit: 'portions' }];
  }
}

/**
 * Кодирует черновики ингредиентов обратно в JSON для сохранения в БД.
 * Конвертирует граммы → порции через `portion_weight` продукта.
 */
export function encodePresetIngredientDrafts(items: PresetIngredientDraft[], productsById: Record<string, AuraRow>): string {
  const out = items
    .map((it) => {
      const rawAmount = parseLocalFloat(it.amount);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0 || !it.product_id) return null;
      let portions = rawAmount;
      if (it.unit === 'grams') {
        const product = productsById[it.product_id];
        const portionWeight = Number(product?.portion_weight) || 0;
        if (portionWeight <= 0) return null;
        portions = rawAmount / portionWeight;
      }
      return { product_id: it.product_id, portions };
    })
    .filter((x): x is { product_id: string; portions: number } => x != null);
  return JSON.stringify(out);
}
