/**
 * Тени для «прилипающих» (sticky) шапок и первых колонок в таблицах.
 * Общие для PointsHistoryTable, StatsTableView и любых будущих data-таблиц,
 * чтобы граница sticky-области выглядела одинаково во всём приложении.
 */
export const STICKY_HEADER_SHADOW = 'inset 0 -1px 0 hsl(var(--border) / 0.35)';
export const STICKY_COLUMN_SHADOW = 'inset -1px 0 0 hsl(var(--border) / 0.35)';
/** Угол на пересечении sticky-шапки и sticky-колонки — обе тени сразу. */
export const STICKY_CORNER_SHADOW = `${STICKY_HEADER_SHADOW}, ${STICKY_COLUMN_SHADOW}`;
