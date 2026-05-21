import type { AuraDatabase, AuraRow } from '@/types/aura';

export type RitualKind = 'morning' | 'evening';
export type GoalsMode = 'active' | 'archive';
export type TaskType = 'checkbox' | 'number';
export type StageVisualState = 'completed' | 'current' | 'frozen' | 'active';

export type GoalsDbApi = {
  getAllGoals?: () => AuraRow[];
  getStagesByGoal?: (goalId: string) => AuraRow[];
  getTasksByStage?: (stageId: string) => AuraRow[];
  getGoalTaskProgress?: (taskId: string, date: string) => AuraRow | null | undefined;
  getGoalTasksProgressByDate?: (date: string) => AuraRow[];
  saveGoalTaskProgress?: (taskId: string, date: string, data: AuraRow) => void;
  addGoal?: (data: AuraRow) => boolean;
  updateGoal?: (id: string, data: AuraRow) => void;
  setGoalCompletedAt?: (id: string, date: string | null) => boolean;
  deleteGoal?: (id: string) => void;
  moveGoal?: (id: string, direction: 'up' | 'down') => boolean;
  addStage?: (data: AuraRow) => boolean;
  updateStage?: (id: string, data: AuraRow) => void;
  setStageCompletedAt?: (id: string, date: string | null) => boolean;
  deleteStage?: (id: string) => void;
  moveStage?: (id: string, direction: 'up' | 'down') => boolean;
  addTask?: (data: AuraRow) => boolean;
  updateTask?: (id: string, data: AuraRow) => void;
  setTaskCompletedAt?: (id: string, date: string | null) => boolean;
  deleteTask?: (id: string) => void;
  moveTask?: (id: string, direction: 'up' | 'down') => boolean;
};

export const RAW_BUTTON_FOCUS_CN = 'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none';
export const CFG_DIALOG_INPUT_CN =
  'border-input bg-background h-9 w-full min-w-0 rounded-md border px-3 text-center text-sm shadow-xs';
export const CFG_DIALOG_ICON_TRIGGER_CN =
  `border-input bg-background hover:bg-muted/30 flex h-9 w-full min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 text-center aura-tx-colors shadow-xs ${RAW_BUTTON_FOCUS_CN}`;
/** Icon-кнопки в панели целей ритуалов: один вариант и размер на цели / этапы / задачи. */
export const GOALS_RITUALS_ICON_BTN_CN =
  'aura-action-icon disabled:pointer-events-none disabled:opacity-[var(--aura-disabled-opacity)]';
export const GOALS_RITUALS_TOOLBAR_ROW_CN = 'flex flex-wrap items-center justify-end gap-1';
export const GOALS_GLOBAL_SCOPE_DATE = '__goals_global__';

export function idOrCreate(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function asIsoDate(value: unknown): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s.slice(0, 10);
}

export function formatRuDate(value: unknown): string {
  const iso = asIsoDate(value);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function stageOrderRoman(orderIndex: number): string {
  const n = orderIndex + 1;
  if (n <= 0) return '';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let x = n;
  let out = '';
  for (let i = 0; i < vals.length; i += 1) {
    while (x >= vals[i]) {
      out += syms[i];
      x -= vals[i];
    }
  }
  return out || String(n);
}

export function loadCfg(db: AuraDatabase, kind: RitualKind): AuraRow[] {
  const table = kind === 'morning' ? 'cfg_rituals_morning' : 'cfg_rituals_evening';
  const all = db.getAll(table);
  return all
    .filter((r) => r.id && isRitualActive(r.active))
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
}

export function isRitualActive(active: unknown): boolean {
  return !(active === 0 || active === '0' || active === false || active === 'false');
}

export function loadCfgRows(rows: AuraRow[]): AuraRow[] {
  return rows
    .filter((r) => r.id && isRitualActive(r.active))
    .sort((a, b) => (Number(a.level) || 0) - Number(b.level || 0));
}

export function completedSet(db: AuraDatabase, kind: RitualKind, date: string): Set<string> {
  const rows = kind === 'morning' ? db.getRitualsMorning(date) : db.getRitualsEvening(date);
  const s = new Set<string>();
  rows.forEach((r) => {
    if (r.completed === 1 && r.ritual_id) s.add(String(r.ritual_id));
  });
  return s;
}

export function completedSetFromRows(rows: AuraRow[]): Set<string> {
  const s = new Set<string>();
  rows.forEach((r) => {
    if (r.completed === 1 && r.ritual_id) s.add(String(r.ritual_id));
  });
  return s;
}

export function calcTaskProgress(task: AuraRow, rawProgress: AuraRow | null | undefined): number {
  const taskType = String(task.task_type ?? 'checkbox');
  if (!rawProgress) return 0;
  if (taskType === 'checkbox') return Number(rawProgress.completed) === 1 ? 100 : 0;
  if (taskType === 'number') {
    const target = Number(task.target_value ?? 0);
    const current = Number(rawProgress.current_value ?? 0);
    if (target <= 0) return 0;
    return Math.min(100, Math.max(0, (current / target) * 100));
  }
  return 0;
}

export function getStageVisualState(params: {
  index: number;
  percent: number;
  contiguousCompletedIndex: number;
  nextStageIndex: number;
}): StageVisualState {
  const { index, percent, contiguousCompletedIndex, nextStageIndex } = params;
  if (percent === 100 && index <= contiguousCompletedIndex) return 'completed';
  if (index === nextStageIndex) return 'current';
  if (nextStageIndex !== -1 && index > nextStageIndex) return 'frozen';
  return 'active';
}

export function getStageStateClasses(state: StageVisualState): {
  shell: string;
  title: string;
  meta: string;
  progressTrack: string;
  progressFill: string;
  opacity: string;
} {
  if (state === 'completed') {
    return {
      shell: '',
      title: 'text-[var(--aura-text-subtle)]',
      meta: 'text-[var(--aura-text-disabled)]',
      progressTrack: 'bg-[var(--aura-surface-control)]',
      progressFill: 'bg-primary/50',
      opacity: 'opacity-70',
    };
  }
  if (state === 'current') {
    return {
      shell: '',
      title: 'text-foreground',
      meta: 'text-[var(--aura-text-muted)]',
      progressTrack: 'bg-[var(--aura-surface-control)]',
      progressFill: 'bg-primary',
      opacity: '',
    };
  }
  if (state === 'frozen') {
    return {
      shell: '',
      title: 'text-[var(--aura-text-disabled)]',
      meta: 'text-[var(--aura-text-disabled)]',
      progressTrack: 'bg-[var(--aura-surface-control)]',
      progressFill: 'bg-[var(--aura-text-disabled)]',
      opacity: 'opacity-50',
    };
  }
  return {
    shell: '',
    title: 'text-foreground',
    meta: 'text-[var(--aura-text-muted)]',
    progressTrack: 'bg-[var(--aura-surface-control)]',
    progressFill: 'bg-primary',
    opacity: '',
  };
}

export function getGoalTintSurfaceStyle(goalTint: string, state: StageVisualState): {
  shellStyle: Record<string, string>;
  progressFillStyle: Record<string, string>;
} {
  const baseShell = {
    backgroundColor: `color-mix(in srgb, ${goalTint} 2.5%, var(--background) 97.5%)`,
  };
  if (state === 'current') {
    return {
      shellStyle: {
        backgroundColor: `color-mix(in srgb, ${goalTint} 4.5%, var(--background) 95.5%)`,
        boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${goalTint} 5%, transparent)`,
      },
      progressFillStyle: { backgroundColor: goalTint },
    };
  }
  if (state === 'completed') {
    return {
      shellStyle: {
        ...baseShell,
        backgroundColor: `color-mix(in srgb, ${goalTint} 5.5%, var(--background) 94.5%)`,
      },
      progressFillStyle: { backgroundColor: goalTint },
    };
  }
  if (state === 'frozen') {
    return {
      shellStyle: {
        backgroundColor: `color-mix(in oklab, var(--muted) 18%, var(--background) 82%)`,
      },
      progressFillStyle: { backgroundColor: `color-mix(in srgb, ${goalTint} 44%, var(--muted-foreground) 56%)` },
    };
  }
  return {
    shellStyle: baseShell,
    progressFillStyle: { backgroundColor: `color-mix(in srgb, ${goalTint} 80%, var(--primary) 20%)` },
  };
}
