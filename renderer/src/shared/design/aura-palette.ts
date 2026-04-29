/**
 * Палитра категорий задач (как legacy `UnifiedColorPalette.TASK_CATEGORY_PALETTE`).
 * Используется для валидации цветов из `task_categories_config`.
 */
export const TASK_CATEGORY_PALETTE = [
  'hsl(24, 58%, 52%)',
  'hsl(165, 50%, 46%)',
  'hsl(258, 48%, 56%)',
  'hsl(352, 58%, 52%)',
  'hsl(204, 62%, 56%)',
  'hsl(38, 78%, 54%)',
  'hsl(278, 48%, 56%)',
  'hsl(214, 56%, 54%)',
  'hsl(42, 58%, 55%)',
  'hsl(232, 48%, 56%)',
  'hsl(148, 50%, 46%)',
  'hsl(196, 45%, 52%)',
] as const;

/**
 * Legacy-палитра (до редизайна) для обратной совместимости:
 * если в БД сохранён старый цвет, маппим его на тот же индекс новой палитры.
 */
const LEGACY_TASK_CATEGORY_PALETTE = [
  'hsl(15, 50%, 50%)',
  'hsl(140, 45%, 48%)',
  'hsl(260, 45%, 50%)',
  'hsl(0, 48%, 48%)',
  'hsl(195, 45%, 50%)',
  'hsl(35, 50%, 52%)',
  'hsl(300, 40%, 50%)',
  'hsl(170, 42%, 48%)',
  'hsl(25, 48%, 50%)',
  'hsl(270, 42%, 50%)',
  'hsl(45, 48%, 52%)',
  'hsl(330, 42%, 50%)',
] as const;

export const DEFAULT_TASK_CATEGORY_COLORS: Record<'rituals' | 'time' | 'body' | 'deps', string> = {
  rituals: 'hsl(24, 58%, 52%)',
  time: 'hsl(165, 50%, 46%)',
  body: 'hsl(258, 48%, 56%)',
  deps: 'hsl(352, 58%, 52%)',
};

const CSS_VAR_MAP: Record<keyof typeof DEFAULT_TASK_CATEGORY_COLORS, string> = {
  rituals: '--task-rituals',
  time: '--task-time',
  body: '--task-body',
  deps: '--task-deps',
};

function normalized(color: string): string {
  return color.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function getTaskCategoryPaletteIndex(color: string): number | null {
  const target = normalized(color);
  for (let i = 0; i < TASK_CATEGORY_PALETTE.length; i++) {
    if (normalized(TASK_CATEGORY_PALETTE[i]) === target) return i;
  }
  return null;
}

export function validateTaskCategoryColor(color: string): string {
  const idx = getTaskCategoryPaletteIndex(color);
  if (idx !== null) return TASK_CATEGORY_PALETTE[idx];
  const legacyIdx = LEGACY_TASK_CATEGORY_PALETTE.findIndex((c) => normalized(c) === normalized(color));
  if (legacyIdx >= 0) return TASK_CATEGORY_PALETTE[legacyIdx];
  return TASK_CATEGORY_PALETTE[0];
}

/** Семантические токены для финансов / негатива (фиксированные, как ориентир UI). */
export const FINANCE_SEMANTIC = {
  income: 'hsl(148, 50%, 46%)',
  expense: 'hsl(356, 62%, 56%)',
  transfer: 'hsl(214, 56%, 54%)',
  negative: 'hsl(356, 58%, 48%)',
} as const;

/** Токены для эскапизма/наполнения — адаптируются к теме через CSS-переменные. */
export const LEISURE_SEMANTIC = {
  filling: 'var(--leisure-filling)',
  escape: 'var(--leisure-escape)',
} as const;

export const RITUAL_SEMANTIC = {
  morning: 'hsl(38, 78%, 54%)',
  evening: 'hsl(226, 52%, 58%)',
  vows: 'hsl(278, 48%, 56%)',
} as const;

export const AURA_STATIC_SEMANTIC = {
  ambient: 'hsl(204, 62%, 56%)',
  rankGold: 'hsl(45, 90%, 55%)',
  info: 'hsl(218, 42%, 54%)',
  success: 'hsl(145, 58%, 40%)',
  warning: 'hsl(45, 84%, 52%)',
  danger: 'hsl(0, 65%, 52%)',
} as const;

export const NUTRITION_SEMANTIC = {
  proteins: 'hsl(210, 70%, 55%)',
  fats: 'hsl(35, 85%, 52%)',
  carbs: 'hsl(280, 55%, 58%)',
  calories: 'hsl(0, 72%, 55%)',
  dish: 'hsl(220, 55%, 50%)',
} as const;

export const MOOD_SCALE: Record<number, string> = {
  1: 'hsl(0 65% 52%)',
  2: 'hsl(22 74% 54%)',
  3: 'hsl(45 84% 52%)',
  4: 'hsl(108 58% 44%)',
  5: 'hsl(145 58% 40%)',
};

export function moodColor(level: number): string {
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  return MOOD_SCALE[lv] ?? MOOD_SCALE[3];
}

export function applyTaskCategoryCssVarsFromSettings(settings: Record<string, unknown> | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [cat, def] of Object.entries(DEFAULT_TASK_CATEGORY_COLORS)) {
    const v = CSS_VAR_MAP[cat as keyof typeof DEFAULT_TASK_CATEGORY_COLORS];
    root.style.setProperty(v, def);
  }
  const raw = settings?.task_categories_config;
  if (raw == null) return;
  let parsed: Record<string, { color?: string }> | null = null;
  try {
    parsed = typeof raw === 'string' ? (JSON.parse(raw) as Record<string, { color?: string }>) : (raw as Record<string, { color?: string }>);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== 'object') return;
  (Object.keys(CSS_VAR_MAP) as (keyof typeof CSS_VAR_MAP)[]).forEach((cat) => {
    const entry = parsed![cat];
    const c = entry?.color;
    if (typeof c === 'string' && c.trim()) {
      root.style.setProperty(CSS_VAR_MAP[cat], validateTaskCategoryColor(c));
    }
  });
}

export function applyFinanceSemanticCssVars(): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.style.setProperty('--finance-income', FINANCE_SEMANTIC.income);
  r.style.setProperty('--finance-expense', FINANCE_SEMANTIC.expense);
  r.style.setProperty('--finance-transfer', FINANCE_SEMANTIC.transfer);
  r.style.setProperty('--semantic-negative', FINANCE_SEMANTIC.negative);
}
