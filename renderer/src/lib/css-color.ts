/**
 * Приводит значение к валидному CSS `color` для инлайновых свойств вроде `backgroundColor`.
 * `var(--token)` оставляем как есть (в теме токен может быть oklch, не только hsl-слайсы).
 */
export function normalizeCssColorForPaint(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (/^hsla?\(/i.test(t) || /^rgba?\(/i.test(t) || /^oklch\(/i.test(t) || /^#[0-9a-f]{3,8}$/i.test(t)) {
    return t;
  }
  if (/^var\(--/.test(t)) {
    return t;
  }
  // Устаревший шаблон shadcn: hsl(var(--primary)) при --primary = «слайсы» — оставляем как есть
  if (/^hsl\(var\(/.test(t) || /^rgb\(var\(/.test(t)) {
    return t;
  }
  return t;
}

/** Нормализует цвет задачи из CFG (число/объект → строка или null). */
export function coerceTaskColor(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const s = value.trim();
    return s.length > 0 ? s : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}
