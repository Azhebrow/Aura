// ─── cfg-list-editor ─────────────────────────────────────────────────────────
// Утилиты для задач типа «список»: парсинг и кодирование JSON-конфига `config`.

// ─── Types ────────────────────────────────────────────────────────────────────

/** Один элемент списка в конфиге задачи. */
export type TaskListCfgItem = {
  title: string;
  /** Вклад этого пункта в % выполнения задачи (0–100). */
  percent: number;
};

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Парсит JSON-строку поля `config` в массив элементов списка.
 * При ошибке или пустом значении — пустой массив.
 */
export function parseTaskListItems(raw: string | undefined): TaskListCfgItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as {
      items?: Array<{ title?: unknown; name?: unknown; percent?: unknown; percentage?: unknown }>;
    };
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items.map((it, idx) => {
      const t =
        typeof it.title === 'string' ? it.title
        : typeof it.name === 'string' ? it.name
        : `Пункт ${idx + 1}`;
      const p = Number(it.percent ?? it.percentage ?? 0);
      return {
        title: t,
        percent: Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0,
      };
    });
  } catch {
    return [];
  }
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

/**
 * Кодирует массив элементов списка обратно в JSON для сохранения в БД.
 */
export function encodeTaskListItems(items: TaskListCfgItem[]): string {
  return JSON.stringify({
    items: items.map((it) => ({
      title: String(it.title ?? '').trim() || 'Без названия',
      percent: Math.max(0, Math.min(100, Number(it.percent) || 0)),
    })),
  });
}
