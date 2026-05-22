// ─── Timer Utils ──────────────────────────────────────────────────────────────
// Вспомогательные функции для страницы таймера:
// загрузка задач, сравнение сессий, вычисление прогресса.

import type { AuraDatabase, AuraRow } from '@/types/aura';
import type { TimerTaskRow } from './use-timer-tasks';

// ─── Task picker ──────────────────────────────────────────────────────────────

export type PickerTask = {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  group: string;
};

/**
 * Загружает все таймер-задачи из БД (фокус, эскапизм, наполнение)
 * в единый список для компонента выбора задачи в диалоге.
 */
export function loadPickerTasks(db: AuraDatabase): PickerTask[] {
  const out: PickerTask[] = [];
  try {
    // Фокус — таймер-задачи категории «time»
    for (const t of db.getAll('cfg_tasks').filter((r) => r.task_type === 'timer' && r.category_type === 'time')) {
      if (t.id == null) continue;
      out.push({
        id:    String(t.id),
        title: String(t.title ?? t.id),
        icon:  typeof t.icon  === 'string' ? t.icon  : undefined,
        color: typeof t.color === 'string' ? t.color : undefined,
        group: 'Фокус',
      });
    }
    // Эскапизм и наполнение — задачи досуга
    for (const leisureType of ['escape', 'filling'] as const) {
      const groupLabel = leisureType === 'escape' ? 'Эскапизм' : 'Наполнение';
      for (const t of db.getAll('cfg_leisure_tasks').filter((r) => r.task_type === 'timer' && r.leisure_type === leisureType)) {
        if (t.id == null) continue;
        out.push({
          id:    String(t.id),
          title: String(t.title ?? t.name ?? t.id),
          icon:  typeof t.icon  === 'string' ? t.icon  : undefined,
          color: typeof t.color === 'string' ? t.color : undefined,
          group: groupLabel,
        });
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Генерирует уникальный id сессии таймера */
export function newSessionId() {
  return `timer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Сравнивает два массива сессий по содержимому (для предотвращения лишних ре-рендеров) */
export function sameSessions(a: AuraRow[], b: AuraRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/** Процент выполнения дневной цели (часов) для таймер-задачи */
export function timerTaskDailyProgressPct(t: Pick<TimerTaskRow, 'cfg_target_hours' | 'currentSeconds'>): number {
  const th = t.cfg_target_hours ?? 0;
  if (!(th > 0)) return 0;
  const targetSec = th * 3600;
  return Math.min(100, Math.round((t.currentSeconds / targetSec) * 100));
}
