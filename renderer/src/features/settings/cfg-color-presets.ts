/** Лаконичная палитра пресетов для полей `color` в CFG (hex). */
export const CFG_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Индиго', hex: '#6366f1' },
  { label: 'Фиолет', hex: '#8b5cf6' },
  { label: 'Роза', hex: '#ec4899' },
  { label: 'Красный', hex: '#ef4444' },
  { label: 'Оранж', hex: '#f97316' },
  { label: 'Янтарь', hex: '#f59e0b' },
  { label: 'Лайм', hex: '#84cc16' },
  { label: 'Изумруд', hex: '#10b981' },
  { label: 'Бирюза', hex: '#14b8a6' },
  { label: 'Небо', hex: '#0ea5e9' },
  { label: 'Синий', hex: '#3b82f6' },
  { label: 'Графит', hex: '#64748b' },
  { label: 'Сланец', hex: '#475569' },
  { label: 'Уголь', hex: '#334155' },
  { label: 'Тёплый серый', hex: '#78716c' },
  { label: 'Коричневый', hex: '#92400e' },
];

export type CfgColorPreset = { label: string; value: string };

const mk = (prefix: string, values: readonly string[]): CfgColorPreset[] =>
  values.map((v, i) => ({ label: `${prefix} ${i + 1}`, value: v }));

export const CFG_ACCOUNT_COLOR_PRESETS: CfgColorPreset[] = mk('Счёт', [
  'hsl(198, 58%, 56%)',
  'hsl(206, 57%, 55%)',
  'hsl(214, 56%, 54%)',
  'hsl(222, 55%, 54%)',
  'hsl(230, 54%, 53%)',
  'hsl(238, 53%, 53%)',
  'hsl(246, 52%, 54%)',
  'hsl(254, 51%, 55%)',
  'hsl(262, 50%, 56%)',
  'hsl(270, 49%, 56%)',
  'hsl(278, 48%, 55%)',
  'hsl(286, 47%, 54%)',
]);

export const CFG_INCOME_COLOR_PRESETS: CfgColorPreset[] = mk('Доход', [
  'hsl(108, 55%, 55%)',
  'hsl(116, 54%, 54%)',
  'hsl(124, 53%, 54%)',
  'hsl(132, 52%, 53%)',
  'hsl(140, 51%, 53%)',
  'hsl(148, 50%, 53%)',
  'hsl(156, 49%, 53%)',
  'hsl(164, 48%, 54%)',
  'hsl(172, 47%, 54%)',
  'hsl(180, 46%, 54%)',
  'hsl(188, 46%, 53%)',
  'hsl(196, 45%, 52%)',
]);

export const CFG_EXPENSE_COLOR_PRESETS: CfgColorPreset[] = mk('Расход', [
  'hsl(356, 58%, 57%)',
  'hsl(2, 57%, 56%)',
  'hsl(8, 56%, 55%)',
  'hsl(14, 55%, 54%)',
  'hsl(20, 54%, 54%)',
  'hsl(26, 53%, 54%)',
  'hsl(32, 52%, 54%)',
  'hsl(338, 54%, 56%)',
  'hsl(344, 55%, 56%)',
  'hsl(350, 56%, 57%)',
  'hsl(326, 53%, 55%)',
  'hsl(332, 54%, 56%)',
]);

export const CFG_LEISURE_FILLING_COLOR_PRESETS: CfgColorPreset[] = mk('Наполнение', [
  'hsl(18, 56%, 55%)',
  'hsl(24, 55%, 55%)',
  'hsl(30, 54%, 55%)',
  'hsl(36, 54%, 56%)',
  'hsl(42, 53%, 56%)',
  'hsl(48, 52%, 56%)',
  'hsl(54, 51%, 56%)',
  'hsl(60, 50%, 55%)',
  'hsl(66, 49%, 54%)',
  'hsl(72, 48%, 53%)',
  'hsl(78, 47%, 52%)',
  'hsl(84, 46%, 51%)',
]);

export const CFG_LEISURE_ESCAPE_COLOR_PRESETS: CfgColorPreset[] = mk('Эскапизм', [
  'hsl(182, 47%, 52%)',
  'hsl(190, 47%, 52%)',
  'hsl(198, 46%, 51%)',
  'hsl(206, 46%, 50%)',
  'hsl(214, 45%, 49%)',
  'hsl(222, 45%, 49%)',
  'hsl(230, 44%, 49%)',
  'hsl(238, 44%, 49%)',
  'hsl(246, 43%, 50%)',
  'hsl(254, 43%, 51%)',
  'hsl(262, 42%, 52%)',
  'hsl(270, 42%, 53%)',
]);

/** Разбор hex из БД: допускает `RRGGBB` без `#`, иначе `null`. */
export function parseHexColor(raw: unknown): string | null {
  let t = String(raw ?? '').trim();
  if (!t) return null;
  if (!t.startsWith('#') && /^[0-9a-fA-F]{6}$/i.test(t)) t = `#${t}`;
  if (!t.startsWith('#') && /^[0-9a-fA-F]{3}$/i.test(t)) t = `#${t}`;
  if (/^#[0-9a-fA-F]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/i.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function normalizeHexColor(raw: string | undefined | null, fallback = '#64748b'): string {
  return parseHexColor(raw) ?? fallback;
}
