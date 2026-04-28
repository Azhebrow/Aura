/** Макс. длина «названия» (первая строка текста) в списках и шапках. */
const DEFAULT_TITLE_MAX = 72;

/**
 * Название записи: первая строка текста, пробелы в строке схлопываются, длинное — с «…».
 * Пустая первая строка → «Без названия».
 */
export function diaryEntryTitleFromText(raw: unknown, maxLen = DEFAULT_TITLE_MAX): string {
  const rawStr = typeof raw === 'string' ? raw : '';
  const first = rawStr.split(/\r?\n/)[0] ?? '';
  const t = first.replace(/\s+/g, ' ').trim();
  if (!t) return 'Без названия';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

/**
 * Фрагмент текста после первой строки (для подписи под названием в списке).
 */
export function diaryEntryBodyAfterFirstLine(raw: unknown, maxLen = 200): string {
  const rawStr = typeof raw === 'string' ? raw : '';
  const lines = rawStr.split(/\r?\n/);
  if (lines.length <= 1) return '';
  const rest = lines.slice(1).join('\n').trim();
  if (!rest) return '';
  const single = rest.replace(/\s+/g, ' ').trim();
  if (single.length <= maxLen) return single;
  return `${single.slice(0, maxLen).trimEnd()}…`;
}
