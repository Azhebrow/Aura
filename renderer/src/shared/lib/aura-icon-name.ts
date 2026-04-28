/** Как в legacy `IconLoader.ICON_ALIASES` — старые имена файлов. */
const ICON_ALIASES: Record<string, string> = {
  'x-circle': 'circle-x',
  'alert-circle': 'circle-alert',
};

/**
 * Нормализует имя иконки для файла в `public/icons/*.svg`.
 * Убирает суффикс `.svg`, применяет алиасы.
 */
export function resolveAuraIconFileBase(name: string): string {
  let raw = String(name ?? '').trim();
  if (!raw) return '';

  // Частые форматы из legacy БД: пути, URL-encoded, имена в кавычках.
  raw = raw.replace(/^['"]+|['"]+$/g, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw when decode fails */
  }

  const normalizedSlashes = raw.replace(/\\/g, '/');
  const lastSegment = normalizedSlashes.split('/').filter(Boolean).pop() ?? normalizedSlashes;
  const noExt = lastSegment.replace(/\.svg$/i, '').trim();
  if (!noExt) return '';

  // Приоритет: точное имя как в БД (legacy так и работает).
  if (ICON_ALIASES[noExt]) return ICON_ALIASES[noExt];
  // Фолбэк для старых алиасов в другом регистре.
  const lower = noExt.toLowerCase();
  if (ICON_ALIASES[lower]) return ICON_ALIASES[lower];
  return noExt;
}
