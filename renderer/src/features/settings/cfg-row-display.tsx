// ─── cfg-row-display ─────────────────────────────────────────────────────────
// Утилиты для отображения строк CFG-списков:
// заголовок, мета-сводка, сортировка, акцент иконки.

import type { ReactNode } from 'react';
import {
  CFG_ACCOUNT_COLOR_PRESETS,
  CFG_EXPENSE_COLOR_PRESETS,
  CFG_INCOME_COLOR_PRESETS,
  CFG_LEISURE_ESCAPE_COLOR_PRESETS,
  CFG_LEISURE_FILLING_COLOR_PRESETS,
  parseHexColor,
  type CfgColorPreset,
} from '@/features/settings/cfg-color-presets';
import { normalizeCssColorForPaint } from '@/lib/css-color';
import type { CfgSectionSpec } from '@/features/settings/cfg-section-types';
import type { AuraRow } from '@/types/aura';

// ─── Color preset helpers ─────────────────────────────────────────────────────

const SECTION_COLOR_PRESETS: Partial<Record<string, CfgColorPreset[]>> = {
  'finance-accounts': CFG_ACCOUNT_COLOR_PRESETS,
  'finance-income':   CFG_INCOME_COLOR_PRESETS,
  'finance-expense':  CFG_EXPENSE_COLOR_PRESETS,
  'leisure-filling':  CFG_LEISURE_FILLING_COLOR_PRESETS,
  'leisure-escape':   CFG_LEISURE_ESCAPE_COLOR_PRESETS,
};

/** Пресеты цветов для секции, или null если секция не ограничивает цвета. */
export function sectionColorPresets(sectionId: string): CfgColorPreset[] | null {
  return SECTION_COLOR_PRESETS[sectionId] ?? null;
}

function normalizeColorToken(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Нормализует цвет в поле строки для секций с ограниченными пресетами.
 * Если значение не совпадает ни с одним пресетом — возвращает первый.
 */
export function normalizeRestrictedSectionColor(sectionId: string, raw: unknown): string | null {
  const presets = sectionColorPresets(sectionId);
  if (!presets || presets.length === 0) return null;
  const fallback = presets[0].value;
  const text = String(raw ?? '').trim();
  if (!text) return fallback;
  const hit = presets.find((p) => normalizeColorToken(p.value) === normalizeColorToken(text));
  return hit ? hit.value : fallback;
}

// ─── Row title & meta ─────────────────────────────────────────────────────────

/** Возвращает заголовок строки по приоритетному списку ключей. */
export function rowTitle(row: AuraRow, keys?: string[]): string {
  const ks = keys ?? ['title', 'name', 'id'];
  for (const k of ks) {
    if (row[k] != null && String(row[k]).length) return String(row[k]);
  }
  return String(row.id ?? '');
}

function getFieldOptionLabel(translatedSpec: CfgSectionSpec, fieldKey: string, value: unknown): string | undefined {
  const field = translatedSpec.fields.find((f) => f.key === fieldKey);
  if (!field?.options) return undefined;
  const opt = field.options.find((o) => o.value === value);
  return opt?.label;
}

function formatParamValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

/**
 * Вычисляет суммарное КБЖУ пресета питания из JSON-поля `products`.
 */
export function calcRawPresetNutrition(
  productsJson: unknown
): { calories: number; protein: number; fats: number; carbs: number } | null {
  try {
    const products = typeof productsJson === 'string' ? JSON.parse(productsJson) : productsJson;
    if (!Array.isArray(products)) return null;
    let cal = 0, prot = 0, fat = 0, carb = 0;
    for (const p of products) {
      const w = Number(p.amount ?? 1) / 100;
      cal  += Number(p.calories_per_100g ?? 0) * w;
      prot += Number(p.proteins_per_100g ?? 0) * w;
      fat  += Number(p.fats_per_100g ?? 0) * w;
      carb += Number(p.carbs_per_100g ?? 0) * w;
    }
    return {
      calories: Math.round(cal),
      protein:  Math.round(prot * 10) / 10,
      fats:     Math.round(fat  * 10) / 10,
      carbs:    Math.round(carb * 10) / 10,
    };
  } catch {
    return null;
  }
}

/**
 * Формирует строки мета-сводки для строки в CFG-списке.
 * Учитывает тип таблицы: задачи, счета, расходы, ритуалы и т.д.
 */
export function rowMetaSummary(spec: CfgSectionSpec, row: AuraRow): ReactNode | undefined {
  const parts: string[] = [];

  if (spec.table === 'cfg_accounts') {
    const type = getFieldOptionLabel(spec, 'type', row.type) ?? (String(row.type) === 'savings' ? 'Накопления' : 'Обычный');
    parts.push(type);
    if (row.home_visible === 1 || row.home_visible === true) parts.push('На главной');
    if (row.balance != null) parts.push(`Баланс: ${row.balance}`);
    if (row.target != null) parts.push(`Цель: ${row.target}`);
  }

  if (spec.table === 'cfg_tasks' || spec.table === 'cfg_leisure_tasks') {
    if (row.task_type) {
      const typeLabel = getFieldOptionLabel(spec, 'task_type', row.task_type) ?? String(row.task_type);
      parts.push(typeLabel);
    }
    if (row.is_optional === 1 || row.is_optional === true) parts.push('Необязательная');
    if (row.cfg_target_value != null && Number(row.cfg_target_value) > 0) {
      const unit = String(row.cfg_unit ?? '');
      parts.push(`Цель: ${row.cfg_target_value}${unit ? ' ' + unit : ''}`);
    }
    if (row.cfg_target_hours != null && Number(row.cfg_target_hours) > 0) {
      parts.push(`Таймер: ${row.cfg_target_hours}ч`);
    }
    if (spec.table === 'cfg_tasks' && row.ritual_type) {
      const ritualLabel = getFieldOptionLabel(spec, 'ritual_type', row.ritual_type) ?? String(row.ritual_type);
      parts.push(`Ритуал: ${ritualLabel}`);
    }
  }

  if (spec.table === 'cfg_expense_categories') {
    if (String(row.type ?? '') === 'compulsive') parts.push('Импульсивная');
  }

  if (spec.table === 'cfg_rituals') {
    const desc = typeof row.description === 'string' ? row.description.trim() : '';
    if (desc) parts.push(desc.length > 60 ? `${desc.slice(0, 60).trimEnd()}…` : desc);
  }

  if (spec.table === 'cfg_diary_entry_presets') {
    const prompt = typeof row.prompt === 'string' ? row.prompt.trim().replace(/\s+/g, ' ') : '';
    const description = typeof row.description === 'string' ? row.description.trim().replace(/\s+/g, ' ') : '';
    if (prompt) parts.push(prompt.length > 60 ? `${prompt.slice(0, 60).trimEnd()}…` : prompt);
    if (description) parts.push(description.length > 60 ? `${description.slice(0, 60).trimEnd()}…` : description);
    if (Number(row.active ?? 1) === 0) parts.push('Неактивная');
  }

  if (spec.table === 'cfg_nutrition_products') {
    const groupLabel = getFieldOptionLabel(spec, 'group', row.group);
    if (groupLabel) parts.push(`Группа: ${groupLabel}`);
    if (row.calories_per_100g != null) parts.push(`${row.calories_per_100g}ккал`);
    if (row.proteins_per_100g != null) parts.push(`Б:${row.proteins_per_100g}г`);
    if (row.fats_per_100g != null) parts.push(`Ж:${row.fats_per_100g}г`);
    if (row.carbs_per_100g != null) parts.push(`У:${row.carbs_per_100g}г`);
  }

  if (spec.table === 'cfg_nutrition_presets') {
    const nutrition = calcRawPresetNutrition(row.products);
    if (nutrition && (nutrition.calories > 0 || nutrition.protein > 0 || nutrition.fats > 0 || nutrition.carbs > 0)) {
      parts.push(`${nutrition.calories}ккал · Б:${nutrition.protein}г · Ж:${nutrition.fats}г · У:${nutrition.carbs}г`);
    }
  }

  if (spec.table === 'cfg_ambient_music') {
    const file = formatParamValue(row.file_name);
    if (file) parts.push(`Файл: ${file}`);
  }

  if (parts.length === 0) return undefined;

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption font-medium leading-snug text-[var(--aura-text-subtle)]">
      {parts.map((part, idx) => (
        <span key={idx} className="inline-flex min-w-0 items-center gap-1">
          {idx > 0 ? <span className="text-[var(--aura-text-disabled)]" aria-hidden>·</span> : null}
          <span className="truncate">{part}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/** Сортирует строки CFG-списка по заданному полю. */
export function sortRows(rows: AuraRow[], sortBy: CfgSectionSpec['sortBy']): AuraRow[] {
  if (!sortBy || sortBy === 'none') return rows;
  return [...rows].sort((a, b) => {
    if (sortBy === 'level') return (Number(a.level) || 0) - (Number(b.level) || 0);
    if (sortBy === 'name') return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru');
    return String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru');
  });
}

// ─── Icon accent ──────────────────────────────────────────────────────────────

/**
 * Определяет акцентный цвет иконки строки в CFG-списке.
 * Задачи — цвет категории; финансы/досуг — из поля `color` в БД.
 */
export function rowListAccent(spec: CfgSectionSpec, row: AuraRow): string {
  if (spec.table === 'cfg_rituals_morning') return 'var(--rituals-morning)';
  if (spec.table === 'cfg_rituals_evening') return 'var(--rituals-evening)';
  if (spec.table === 'cfg_vows')            return 'var(--rituals-vows)';
  if (spec.table === 'cfg_ambient_music')   return 'var(--ambient-music)';

  if (spec.table === 'cfg_tasks') {
    const cat = String(row.category_type ?? '');
    if (cat === 'rituals' || cat === 'time' || cat === 'body' || cat === 'deps') {
      return `var(--task-${cat})`;
    }
  }

  if (spec.table === 'cfg_nutrition_products') {
    const g = String(row.group ?? 'proteins');
    if (g === 'proteins') return 'var(--nutrition-proteins)';
    if (g === 'fats')     return 'var(--nutrition-fats)';
    if (g === 'carbs')    return 'var(--nutrition-carbs)';
  }
  if (spec.table === 'cfg_nutrition_presets')   return 'var(--primary)';
  if (spec.table === 'cfg_diary_entry_presets')  return 'var(--primary)';

  if (
    spec.table === 'cfg_income_categories' ||
    spec.table === 'cfg_expense_categories' ||
    spec.table === 'cfg_accounts' ||
    spec.table === 'cfg_leisure_tasks'
  ) {
    const restricted = normalizeRestrictedSectionColor(spec.sectionId, row.color);
    if (restricted) return restricted;
    const fromHex = parseHexColor(row.color);
    if (fromHex) return fromHex;
    if (row.color != null) {
      const paint = normalizeCssColorForPaint(String(row.color));
      if (paint) return paint;
    }
  }

  if (spec.table === 'cfg_income_categories') return 'var(--finance-income)';
  if (spec.table === 'cfg_expense_categories') return 'var(--finance-expense)';
  if (spec.table === 'cfg_accounts')           return 'var(--finance-transfer)';
  if (spec.table === 'cfg_leisure_tasks') {
    const lt = String(row.leisure_type ?? '');
    if (lt === 'filling') return 'var(--leisure-filling)';
    if (lt === 'escape')  return 'var(--leisure-escape)';
  }

  return 'var(--muted-foreground)';
}

/** Микс-формула для тинтования иконки по акцентному цвету. */
export function cfgListIconTint(accent: string): string {
  return `color-mix(in oklab, ${accent} 76%, var(--foreground) 24%)`;
}
