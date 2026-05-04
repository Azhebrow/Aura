/** Лаконичная палитра пресетов для полей `color` в CFG (hex). */
export const CFG_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Синий', hex: '#2563eb' },
  { label: 'Зелёный', hex: '#16a34a' },
  { label: 'Красный', hex: '#dc2626' },
  { label: 'Янтарный', hex: '#d97706' },
  { label: 'Фиолетовый', hex: '#7c3aed' },
  { label: 'Бирюзовый', hex: '#0891b2' },
  { label: 'Изумрудный', hex: '#059669' },
  { label: 'Розовый', hex: '#db2777' },
  { label: 'Индиго', hex: '#4f46e5' },
  { label: 'Лайм', hex: '#65a30d' },
  { label: 'Терракот', hex: '#c2410c' },
  { label: 'Сланец', hex: '#475569' },
];

export type CfgColorPreset = { label: string; value: string };

const mk = (prefix: string, values: readonly string[]): CfgColorPreset[] =>
  values.map((v, i) => ({ label: `${prefix} ${i + 1}`, value: v }));

export const CFG_ACCOUNT_COLOR_PRESETS: CfgColorPreset[] = mk('Счёт', [
  'hsl(204, 68%, 54%)',
  'hsl(210, 66%, 54%)',
  'hsl(216, 64%, 53%)',
  'hsl(222, 62%, 52%)',
  'hsl(228, 60%, 52%)',
  'hsl(238, 54%, 55%)',
  'hsl(250, 50%, 56%)',
  'hsl(188, 54%, 46%)',
  'hsl(168, 48%, 42%)',
  'hsl(145, 46%, 42%)',
  'hsl(42, 62%, 48%)',
  'hsl(330, 42%, 52%)',
]);

export const CFG_INCOME_COLOR_PRESETS: CfgColorPreset[] = mk('Доход', [
  'hsl(128, 58%, 48%)',
  'hsl(134, 58%, 46%)',
  'hsl(140, 58%, 44%)',
  'hsl(146, 58%, 44%)',
  'hsl(152, 56%, 44%)',
  'hsl(160, 52%, 42%)',
  'hsl(170, 50%, 42%)',
  'hsl(184, 50%, 44%)',
  'hsl(96, 52%, 44%)',
  'hsl(78, 54%, 42%)',
  'hsl(45, 64%, 48%)',
  'hsl(205, 52%, 48%)',
]);

export const CFG_EXPENSE_COLOR_PRESETS: CfgColorPreset[] = mk('Расход', [
  'hsl(356, 68%, 54%)',
  'hsl(2, 68%, 54%)',
  'hsl(8, 68%, 54%)',
  'hsl(14, 66%, 54%)',
  'hsl(20, 66%, 54%)',
  'hsl(28, 64%, 52%)',
  'hsl(36, 66%, 50%)',
  'hsl(350, 58%, 52%)',
  'hsl(334, 54%, 52%)',
  'hsl(312, 46%, 50%)',
  'hsl(252, 42%, 54%)',
  'hsl(214, 48%, 50%)',
]);

export const CFG_LEISURE_FILLING_COLOR_PRESETS: CfgColorPreset[] = mk('Наполнение', [
  'hsl(8, 66%, 52%)',
  'hsl(16, 64%, 51%)',
  'hsl(24, 62%, 50%)',
  'hsl(32, 60%, 49%)',
  'hsl(40, 58%, 48%)',
  'hsl(48, 58%, 48%)',
  'hsl(58, 52%, 46%)',
  'hsl(86, 46%, 44%)',
  'hsl(132, 42%, 42%)',
  'hsl(178, 42%, 42%)',
  'hsl(212, 46%, 48%)',
  'hsl(286, 42%, 50%)',
]);

export const CFG_LEISURE_ESCAPE_COLOR_PRESETS: CfgColorPreset[] = mk('Эскапизм', [
  'hsl(184, 48%, 54%)',
  'hsl(192, 48%, 54%)',
  'hsl(200, 48%, 53%)',
  'hsl(208, 48%, 52%)',
  'hsl(216, 48%, 52%)',
  'hsl(226, 46%, 52%)',
  'hsl(238, 44%, 54%)',
  'hsl(252, 42%, 55%)',
  'hsl(268, 42%, 54%)',
  'hsl(292, 38%, 52%)',
  'hsl(166, 42%, 46%)',
  'hsl(42, 46%, 50%)',
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
