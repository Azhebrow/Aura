import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Check,

  Lock,
  Moon,
  Sun,
  Sunrise,
  Timer,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useHomeDaySnapshot } from '@/shared/hooks/use-home-day-snapshot';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useShell } from '@/app/navigation/shell-context';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { getHomeTaskDisplaySettings } from '@/shared/config/home-task-display';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { TASK_CATEGORY_DEFAULT_META, TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { LoadingShell } from '@/shared/ui/data-states';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { setNavigationIntent } from '@/shared/lib/navigation-intent';
import { cn } from '@/lib/utils';
import type { AuraRow, AuraTaskProgress } from '@/types/aura';

const CATEGORY_IDS = TASK_CATEGORY_IDS;
type CategoryId = TaskCategoryId;

const DEFAULT_LABELS: Record<CategoryId, string> = {
  rituals: TASK_CATEGORY_DEFAULT_META.rituals.title,
  time: TASK_CATEGORY_DEFAULT_META.time.title,
  body: TASK_CATEGORY_DEFAULT_META.body.title,
  deps: TASK_CATEGORY_DEFAULT_META.deps.title,
};

function tasksForCategory(allTasks: AuraRow[], catId: string): AuraRow[] {
  return allTasks
    .filter((t) => String(t.category_type) === catId && t.id)
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
}

type ListCfgItem = { title?: string; name?: string; percent?: number; percentage?: number };

function parseListItems(config: string | null | undefined): ListCfgItem[] {
  if (!config) return [];
  try {
    const o = JSON.parse(String(config)) as { items?: ListCfgItem[] };
    if (o.items && Array.isArray(o.items)) return o.items;
  } catch {
    /* ignore */
  }
  return [];
}

function listItemLabel(it: ListCfgItem, i: number): string {
  const n = it.title ?? it.name;
  if (typeof n === 'string' && n.trim()) return n.trim();
  return `Пункт ${i + 1}`;
}

function formatTimerDurationRu(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ч ${m} м`;
  return `${m} м`;
}

// Единые константы строки задачи
const ROW_H = 'h-[4.5rem] [@container(min-width:720px)]:h-12';
const CTRL_BTN = 'flex h-full w-full cursor-pointer items-center justify-center gap-1 px-2 [@container(min-width:720px)]:gap-1.5 [@container(min-width:720px)]:px-3 focus:outline-none';
const CTRL_BTN_FLUSH = 'flex h-full w-full cursor-pointer items-center justify-center gap-0 px-0 focus:outline-none';
const CTRL_TEXT = 'text-xs font-semibold tabular-nums leading-none';

function formatPercentLabel(value: number): string {
  const pct = Math.min(100, Math.max(0, value));
  return `${Math.round(pct)}%`;
}

function formatTaskCountRu(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`;
  return `${count} задач`;
}

function TaskControlSlot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // mobile: full-width strip at bottom; lg: fixed-width column on right
    <div className={cn('flex h-full w-full shrink-0 items-center justify-center [@container(min-width:720px)]:h-12 [@container(min-width:720px)]:w-[5.5rem]', className)}>
      {children}
    </div>
  );
}

function LoopingTaskLabel({ children }: { children: string }) {
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  if (!overflowing) {
    return (
      <span ref={measureRef} className={cn(CTRL_TEXT, 'block min-w-0 max-w-full truncate text-center')}>
        {children}
      </span>
    );
  }

  return (
    <span ref={measureRef} className={cn(CTRL_TEXT, 'aura-looping-task-label block min-w-0 max-w-full overflow-hidden whitespace-nowrap text-left')}>
      <span className="aura-looping-task-label-track" aria-hidden="true">
        <span>{children}</span>
        <span className="pl-4">{children}</span>
      </span>
      <span className="sr-only">{children}</span>
    </span>
  );
}

function taskRowSatisfied(
  taskType: string,
  pct: number,
  prog: AuraTaskProgress | null,
  numberTarget: number,
  numberValue: number
): boolean {
  const p = Math.min(100, Math.max(0, pct));
  if (p >= 100) return true;
  if (taskType === 'checkbox' && prog && Number(prog.completed) === 1) return true;
  if (taskType === 'number' && numberTarget > 0 && Number.isFinite(numberValue) && numberValue >= numberTarget) return true;
  if (taskType === 'nutrition' && numberTarget > 0 && Number.isFinite(numberValue) && numberValue >= numberTarget) return true;
  return false;
}

/** Единая сетка строки: mobile — левая прогресс-часть + правая нейтральная control-часть. */
function TaskRowFrame({
  icon,
  accent,
  title,
  pct,
  satisfied,
  disabled,
  control,
  showPercentBadges,
}: {
  icon: string | null;
  accent: string;
  title: string;
  pct: number;
  doneTitle?: boolean;
  satisfied?: boolean;
  disabled?: boolean;
  control: ReactNode;
  showPercentBadges: boolean;
}) {
  const uiPct = Math.min(100, Math.max(0, pct));
  const showTaskPercent = showPercentBadges && (!satisfied || uiPct < 100);
  const labelContent = (
    <>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 [@container(min-width:720px)]:hidden"
        style={{ width: `${uiPct}%`, backgroundColor: accent, opacity: satisfied ? 0.16 : uiPct > 0 ? 0.12 : 0.05 }}
        aria-hidden
      />
      <ColoredAuraIcon
        name={icon}
        size={14}
        tint={satisfied ? accent : uiPct > 0 ? accent : 'var(--aura-text-muted)'}
        className="relative z-10 shrink-0"
      />
      <span className={cn('relative z-10 min-w-0 max-w-[7rem] truncate text-sm leading-none [@container(min-width:720px)]:max-w-none', satisfied ? 'text-foreground font-medium' : 'text-foreground')}>
        {title}
      </span>
      {showPercentBadges ? (
        <span className="relative z-10 flex shrink-0 items-center pl-0.5 [@container(min-width:720px)]:ml-auto [@container(min-width:720px)]:pl-1">
          {showTaskPercent ? (
            <span
              className="text-[0.65rem] font-bold tabular-nums leading-none"
              style={{ color: uiPct > 0 ? accent : 'var(--aura-text-muted)' }}
            >
              {formatPercentLabel(uiPct)}
            </span>
          ) : (
            <Check className="size-3" style={{ color: accent }} strokeWidth={2.5} />
          )}
        </span>
      ) : null}
    </>
  );
  const labelClassName = cn(
    'relative flex min-h-0 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden px-2 text-center [@container(min-width:720px)]:h-auto [@container(min-width:720px)]:justify-start [@container(min-width:720px)]:gap-2 [@container(min-width:720px)]:px-3 [@container(min-width:720px)]:text-left',
    'cursor-default'
  );
  return (
    <li
      className={cn(
        'relative grid grid-rows-2 overflow-hidden [@container(min-width:720px)]:flex [@container(min-width:720px)]:flex-row [@container(min-width:720px)]:items-stretch',
        ROW_H,
        disabled && 'pointer-events-none opacity-45'
      )}
    >
      {/* Прогресс-заливка — только на lg */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden [@container(min-width:720px)]:block"
        style={{ width: `${uiPct}%`, backgroundColor: accent, opacity: satisfied ? 0.16 : uiPct > 0 ? 0.12 : 0.05 }}
        aria-hidden
      />

      {/* Строка: иконка + название + бейдж */}
      <div className={labelClassName}>{labelContent}</div>

      {/* Строка управления (мобайл — снизу, lg — справа) */}
      <div className="relative z-10 flex min-h-0 shrink-0 items-stretch border-t border-[var(--aura-border-soft)]/50 [@container(min-width:720px)]:border-t-0 [@container(min-width:720px)]:border-l">
        {control}
      </div>
    </li>
  );
}

export function TasksCategoriesCard() {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const { setActivePageId } = useShell();
  const { data: daySnapshot } = useHomeDaySnapshot(dateString);
  const [showPercentBadges, setShowPercentBadges] = useState(true);
  const [optimisticProgressById, setOptimisticProgressById] = useState<Record<string, AuraTaskProgress>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const numberSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const nutritionTotals = daySnapshot?.nutritionTotals ?? { calories: 0, proteins: 0, fats: 0, carbs: 0 };
  const nutritionTargets = daySnapshot?.nutritionTargets ?? { calories: 0, proteins: 0, fats: 0, carbs: 0 };
  const nutritionProgressPct = useMemo(() => {
    const target = Number(nutritionTargets.calories) || 0;
    if (target <= 0) return nutritionTotals.calories > 0 ? 100 : 0;
    return Math.min(100, Math.round((nutritionTotals.calories / target) * 100));
  }, [nutritionTargets.calories, nutritionTotals.calories]);

  const allCfgTasks = useMemo(() => {
    if (daySnapshot?.cfgTasks) return daySnapshot.cfgTasks;
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_tasks');
  }, [daySnapshot?.cfgTasks, db]);

  const categoryUi = useMemo(() => {
    const cfg = loadTaskCategoryConfig(db);
    return {
      rituals: { label: cfg.rituals.title || DEFAULT_LABELS.rituals, icon: cfg.rituals.icon || 'sparkles' },
      time: { label: cfg.time.title || DEFAULT_LABELS.time, icon: cfg.time.icon || 'timer' },
      body: { label: cfg.body.title || DEFAULT_LABELS.body, icon: cfg.body.icon || 'activity' },
      deps: { label: cfg.deps.title || DEFAULT_LABELS.deps, icon: cfg.deps.icon || 'ban' },
    } as Record<CategoryId, { label: string; icon: string }>;
  }, [db]);

  useEffect(() => {
    setNumberDrafts({});
  }, [dateString]);

  useEffect(() => {
    setOptimisticProgressById({});
  }, [daySnapshot?.taskProgressById, dateString]);

  useEffect(() => {
    const timers = numberSaveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    const reloadDisplaySettings = () => {
      setShowPercentBadges(getHomeTaskDisplaySettings(db.getAppSettings() as AuraRow | null).showPercentBadges);
    };
    reloadDisplaySettings();
    window.addEventListener('settings-saved', reloadDisplaySettings);
    return () => window.removeEventListener('settings-saved', reloadDisplaySettings);
  }, [db]);

  const values = useMemo(() => {
    if (!daySnapshot) return {} as Record<string, number>;
    return daySnapshot.categoryProgresses;
  }, [daySnapshot]);

  const tasksByCat = useMemo(() => {
    if (!db) return {} as Record<string, AuraRow[]>;
    const m: Record<string, AuraRow[]> = {};
    CATEGORY_IDS.forEach((c) => { m[c] = tasksForCategory(allCfgTasks, c); });
    return m;
  }, [allCfgTasks, db]);

  const taskProgressById = useMemo(() => {
    const map = new Map<string, AuraTaskProgress | null>();
    if (daySnapshot?.taskProgressById) {
      for (const [taskId, raw] of Object.entries(daySnapshot.taskProgressById)) {
        map.set(taskId, (raw as AuraTaskProgress | null) ?? null);
      }
      return map;
    }
    if (!db) return map;
    const allTasks = CATEGORY_IDS.flatMap((categoryId) => tasksByCat[categoryId] ?? []);
    for (const task of allTasks) {
      const id = String(task.id ?? '');
      if (!id) continue;
      try {
        map.set(id, db.getTaskProgress(id, dateString));
      } catch {
        map.set(id, null);
      }
    }
    return map;
  }, [db, dateString, daySnapshot?.taskProgressById, tasksByCat]);

  const effectiveTaskProgressById = useMemo(() => {
    const merged = new Map(taskProgressById);
    for (const [taskId, value] of Object.entries(optimisticProgressById)) {
      merged.set(taskId, value);
    }
    return merged;
  }, [taskProgressById, optimisticProgressById]);

  const timerTotalsByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    if (daySnapshot?.timerTotalsByTaskId) {
      for (const [taskId, total] of Object.entries(daySnapshot.timerTotalsByTaskId)) {
        map.set(taskId, Number(total) || 0);
      }
      return map;
    }
    if (!db) return map;
    const allTasks = CATEGORY_IDS.flatMap((categoryId) => tasksByCat[categoryId] ?? []);
    for (const task of allTasks) {
      if (String(task.task_type ?? '') !== 'timer') continue;
      const id = String(task.id ?? '');
      if (!id) continue;
      try {
        map.set(id, db.getTaskTimerTotal(dateString, id) || 0);
      } catch {
        map.set(id, 0);
      }
    }
    return map;
  }, [db, dateString, daySnapshot?.timerTotalsByTaskId, tasksByCat]);

  const ritualCountsByType = useMemo(() => {
    const out = new Map<string, { completed: number; total: number }>();
    if (!daySnapshot?.ritualCountsByType) return out;
    for (const [type, counts] of Object.entries(daySnapshot.ritualCountsByType)) out.set(type, counts);
    return out;
  }, [daySnapshot?.ritualCountsByType]);

  const persist = (taskId: string, data: Record<string, unknown>) => {
    setSaveError(null);
    if (!db) return;
    try {
      setOptimisticProgressById((prev) => {
        const fallback = (effectiveTaskProgressById.get(taskId) ?? {
          value: null,
          completed: 0,
          current_value: null,
          selected_list_item: null,
          completion_percent: 0,
        }) as AuraTaskProgress;
        const current = prev[taskId] ?? fallback;
        const next: AuraTaskProgress = { ...current, ...data };
        if (data.completed !== undefined) {
          next.completion_percent = Number(next.completed) === 1 ? 100 : 0;
        }
        return { ...prev, [taskId]: next };
      });
      runAuraMutation('task-progress', () => {
        db.saveTaskProgress(taskId, dateString, data);
      }, dateString);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  const scheduleNumberPersist = (taskId: string, draft: string) => {
    const prev = numberSaveTimers.current[taskId];
    if (prev) clearTimeout(prev);
    numberSaveTimers.current[taskId] = setTimeout(() => {
      const n = parseFloat(String(draft).replace(',', '.'));
      if (!Number.isFinite(n)) return;
      persist(taskId, { current_value: n });
      delete numberSaveTimers.current[taskId];
    }, 450);
  };

  const goRituals = (ritualType: string) => {
    const rt = String(ritualType);
    const kind = rt === 'sunset' ? 'evening' : 'morning';
    try {
      localStorage.setItem(STORAGE_KEYS.RITUALS_KIND, kind);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(STORAGE_KEYS.RITUALS_KIND_INTENT_EVENT, { detail: { kind } }));
    setActivePageId('rituals');
  };

  const goTimerTask = (taskId: string) => {
    setNavigationIntent(STORAGE_KEYS.TIMER_TASK_ID, STORAGE_KEYS.TIMER_TASK_INTENT_EVENT, { taskId });
    setActivePageId('timer');
  };

  const renderTaskLine = (t: AuraRow, catId: CategoryId) => {
    if (!db) return null;
    const id = String(t.id);
    const title = String(t.title ?? t.id);
    const taskType = String(t.task_type ?? '');
    let pct = 0;
    const prog = effectiveTaskProgressById.get(id) ?? null;
    pct = prog ? Math.min(100, Math.max(0, Number(prog.completion_percent) || 0)) : 0;
    if (taskType === 'timer') {
      const totalSeconds = timerTotalsByTaskId.get(id) ?? 0;
      const targetH = Number(t.cfg_target_hours) || 0;
      if (targetH > 0) {
        const curH = totalSeconds / 3600;
        pct = curH >= targetH ? 100 : Math.min(100, (curH / targetH) * 100);
      } else {
        pct = 0;
      }
    }
    if (taskType === 'nutrition') {
      pct = nutritionProgressPct;
    }
    if (taskType === 'ritual') {
      const counts = ritualCountsByType.get(String(t.ritual_type ?? 'sunrise'));
      pct = counts && counts.total > 0 ? Math.min(100, Math.max(0, (counts.completed / counts.total) * 100)) : 0;
    }
    const disabled = dayLocked;
    const accent = `var(--task-${catId})`;
    const icon = typeof t.icon === 'string' ? t.icon : null;

    const numberTarget = taskType === 'number' ? Number(t.cfg_target_value) || 0 : taskType === 'nutrition' ? Number(nutritionTargets.calories) || 0 : 0;
    let numberValue = NaN;
    if (taskType === 'number') {
      const draftStr = numberDrafts[id];
      if (draftStr !== undefined) {
        const parsed = parseFloat(String(draftStr).replace(',', '.'));
        if (Number.isFinite(parsed)) numberValue = parsed;
      }
      if (!Number.isFinite(numberValue) && prog?.current_value != null) {
        numberValue = Number(prog.current_value);
      }
    } else if (taskType === 'nutrition') {
      numberValue = nutritionTotals.calories;
    }
    const satisfied = taskRowSatisfied(taskType, pct, prog, numberTarget, numberValue);

    if (taskType === 'checkbox') {
      const done = prog ? Number(prog.completed) === 1 : false;
      const isDeps = catId === 'deps';
      
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          doneTitle={done}
          satisfied={satisfied}
          disabled={disabled}
          showPercentBadges={showPercentBadges}
          control={
            <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
                disabled={disabled}
                className={CTRL_BTN}
                onClick={(e) => { e.stopPropagation(); persist(id, { completed: done ? 0 : 1 }); }}
              >
                <span
                  className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: accent,
                    backgroundColor: done ? accent : 'transparent',
                  }}
                  aria-hidden
                >
                  <Check className="size-3 text-white" strokeWidth={3} style={{ opacity: done ? 1 : 0, transition: 'opacity 150ms' }} />
                </span>
                {isDeps && (
                  <span className={cn(CTRL_TEXT, 'text-foreground')} style={{ color: done ? accent : undefined }}>
                    {done ? 'Да' : 'Нет'}
                  </span>
                )}
              </button>
            </TaskControlSlot>
          }
        />
      );
    }

    if (taskType === 'number') {
      const target = numberTarget;
      const cur = prog?.current_value != null ? Number(prog.current_value) : 0;
      const draft = numberDrafts[id] ?? String(Number.isFinite(cur) ? cur : '');
      const unitStr = typeof t.cfg_unit === 'string' ? t.cfg_unit.trim() : '';
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          showPercentBadges={showPercentBadges}
          control={
            <TaskControlSlot className={cn('flex-col gap-0 p-0', disabled && 'pointer-events-none opacity-50')}>
              <Input
                type="number"
                inputMode="decimal"
                className="h-[55%] w-full border-0 bg-transparent text-center text-xs font-semibold tabular-nums text-foreground shadow-none focus-visible:ring-0 rounded-none"
                disabled={disabled}
                value={draft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { const v = e.target.value; setNumberDrafts((m) => ({ ...m, [id]: v })); scheduleNumberPersist(id, v); }}
                onBlur={(e) => { const n = parseFloat(String(e.target.value).replace(',', '.')); if (Number.isFinite(n)) persist(id, { current_value: n }); }}
              />
              <div className="w-full border-t border-[var(--aura-border-soft)]/50" />
              <span className={cn(CTRL_TEXT, 'text-[var(--aura-text-disabled)] h-[40%] flex items-center justify-center')}>
                {target ? `/${target}${unitStr ? ` ${unitStr}` : ''}` : '—'}
              </span>
            </TaskControlSlot>
          }
        />
      );
    }

    if (taskType === 'list') {
      const items = parseListItems(typeof t.config === 'string' ? t.config : null);
      const rawList = prog?.value;
      const listIdxRaw = rawList !== null && rawList !== undefined && rawList !== '' ? Number(rawList) : NaN;
      const hasSelection = Number.isFinite(listIdxRaw) && listIdxRaw >= 0;
      const selectedIndex = hasSelection ? Math.max(0, Math.min(items.length - 1, Math.floor(listIdxRaw))) : -1;
      const selectedLabel = selectedIndex < 0 ? '—' : listItemLabel(items[selectedIndex], selectedIndex);
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          showPercentBadges={showPercentBadges}
          control={
            items.length === 0 ? (
              <TaskControlSlot>
                <span className={cn(CTRL_TEXT, 'text-[var(--aura-text-disabled)]')}>—</span>
              </TaskControlSlot>
            ) : (
              <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Переключить пункт списка"
                  className={CTRL_BTN_FLUSH}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rv = prog?.value;
                    const n0 = rv !== null && rv !== undefined && rv !== '' ? Number(rv) : NaN;
                    let cur = -1;
                    if (Number.isFinite(n0) && n0 >= 0) cur = Math.max(0, Math.min(items.length - 1, Math.floor(n0)));
                    let next = cur + 1;
                    if (next >= items.length) next = -1;
                    if (next < 0) {
                      persist(id, { value: null, selected_list_item: null, completion_percent: 0 });
                    } else {
                      const it = items[next];
                      const completion_percent = Number(it?.percent ?? it?.percentage ?? 0);
                      persist(id, { value: next, selected_list_item: listItemLabel(it, next), completion_percent });
                    }
                  }}
                >
                  <LoopingTaskLabel>{selectedLabel}</LoopingTaskLabel>
                </button>
              </TaskControlSlot>
            )
          }
        />
      );
    }

    if (taskType === 'timer') {
      let timerTotalSec = 0;
      const targetHours = Number(t.cfg_target_hours) || 0;
      timerTotalSec = timerTotalsByTaskId.get(id) ?? 0;
      const timerBtnLabel =
        timerTotalSec > 0
          ? formatTimerDurationRu(timerTotalSec)
          : targetHours > 0
            ? `${targetHours} ч`
            : 'Таймер';
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          showPercentBadges={showPercentBadges}
          control={
            <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
              <button type="button" disabled={disabled} className={CTRL_BTN}
                onClick={(e) => { e.stopPropagation(); goTimerTask(id); }}>
                <Timer className="size-3.5 shrink-0" style={{ color: accent }} />
                <span className={CTRL_TEXT}>{timerBtnLabel}</span>
              </button>
            </TaskControlSlot>
          }
        />
      );
    }

    if (taskType === 'nutrition') {
      const kcal = Math.round(nutritionTotals.calories);
      const target = Math.round(nutritionTargets.calories);
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          showPercentBadges={showPercentBadges}
          control={
            <TaskControlSlot className={cn('flex-col gap-0 p-0', disabled && 'pointer-events-none opacity-50')}>
              <button type="button" disabled={disabled} className={cn(CTRL_BTN, 'flex-col gap-0.5')}
                onClick={(e) => { e.stopPropagation(); setActivePageId('diary'); }}>
                <span className={CTRL_TEXT}>{kcal}</span>
                <span className={cn(CTRL_TEXT, 'text-[var(--aura-text-disabled)]')}>{target > 0 ? `/${target}` : 'ккал'}</span>
              </button>
            </TaskControlSlot>
          }
        />
      );
    }

    if (taskType === 'ritual') {
      const rt = String(t.ritual_type ?? 'sunrise');
      const isEvening = rt === 'sunset';
      const RitIcon = isEvening ? Moon : rt === 'sun' ? Sun : Sunrise;
      const { completed, total } = ritualCountsByType.get(rt) ?? { completed: 0, total: 0 };

      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          showPercentBadges={showPercentBadges}
          control={
            <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
              <button type="button" disabled={disabled} className={CTRL_BTN}
                onClick={(e) => { e.stopPropagation(); goRituals(rt); }}>
                <RitIcon className="size-3.5 shrink-0" style={{ color: accent }} />
                <span className={CTRL_TEXT}>{completed}/{total}</span>
              </button>
            </TaskControlSlot>
          }
        />
      );
    }

    return (
      <TaskRowFrame
        key={id}
        icon={icon}
        accent={accent}
        title={title}
        pct={pct}
        satisfied={satisfied}
        disabled={disabled}
        showPercentBadges={showPercentBadges}
        control={
          <TaskControlSlot>
            <span className={cn(CTRL_TEXT, 'text-[var(--aura-text-disabled)]')}>—</span>
          </TaskControlSlot>
        }
      />
    );
  };

  return (
      <div className="@container flex min-h-0 flex-1 flex-col overflow-hidden">
        {saveError ? <p className="text-destructive mb-2 text-xs">{saveError}</p> : null}
        {!db ? (
          <LoadingShell />
        ) : (
          <div
            className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto overscroll-y-contain p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 [@container(min-width:720px)]:grid-cols-4 [@container(min-width:720px)]:gap-0 [@container(min-width:720px)]:overflow-hidden [@container(min-width:720px)]:p-0"
            style={{ gridAutoRows: 'max-content' }}
          >
            {CATEGORY_IDS.map((catId, idx) => {
              const n = values[catId] ?? 0;
              const tasks = tasksByCat[catId] ?? [];
              const label = categoryUi[catId].label;
              const accent = `var(--task-${catId})`;
              const headerIcon = categoryUi[catId].icon;

              return (
                <section
                  key={catId}
                  className={cn(
                    'flex min-h-max flex-col overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] shadow-sm [@container(min-width:720px)]:min-h-0 [@container(min-width:720px)]:rounded-none [@container(min-width:720px)]:border-0 [@container(min-width:720px)]:bg-transparent [@container(min-width:720px)]:shadow-none',
                    idx !== 3 && '[@container(min-width:720px)]:border-r [@container(min-width:720px)]:border-[var(--aura-border-soft)]/60',
                    dayLocked && 'pointer-events-none opacity-50'
                  )}
                >
                  {/* Хедер категории */}
                  <div
                    className="flex flex-col"
                    style={{ '--acc': accent } as React.CSSProperties}
                  >
                    <div
                      className="flex h-16 items-center gap-2.5 px-2.5 sm:gap-3 sm:px-3.5"
                      style={{ background: `color-mix(in oklab, ${accent} 8%, transparent)` }}
                      aria-label={`${label}: ${Math.round(n)}%`}
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 sm:rounded-xl"
                        style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)` }}
                        aria-hidden
                      >
                        {dayLocked
                          ? <Lock size={12} className="text-[var(--aura-text-muted)]" />
                          : <ColoredAuraIcon name={headerIcon} size={14} tint={accent} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="min-w-0 truncate text-sm font-black leading-none sm:text-base"
                          style={{ color: accent }}
                        >
                          {label}
                        </h3>
                        <p className="mt-1 text-[0.65rem] font-semibold leading-none text-[var(--aura-text-muted)] sm:text-caption">
                          {tasks.length ? formatTaskCountRu(tasks.length) : 'Нет задач'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <span
                          className="text-[1.45rem] font-black tabular-nums leading-none sm:text-[1.7rem]"
                          style={{ color: accent }}
                        >
                          {Math.round(n)}
                          <span className="text-[0.6rem] font-bold opacity-70 sm:text-sm">%</span>
                        </span>
                      </div>
                    </div>
                    {/* Прогресс-полоска */}
                    <div className="h-[3px] w-full" style={{ background: `color-mix(in oklab, ${accent} 12%, transparent)` }}>
                      <div
                        className="h-full"
                        style={{ width: `${n}%`, backgroundColor: accent }}
                      />
                    </div>
                  </div>
                  {/* Список задач */}
                  {tasks.length === 0 ? (
                    <div className="flex h-11 items-center justify-center">
                      <span className="text-xs text-[var(--aura-text-disabled)]">—</span>
                    </div>
                  ) : (
                    <ul className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--aura-border-soft)]/40 overflow-y-auto overscroll-y-contain">
                      {tasks.map((t) => renderTaskLine(t, catId))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
  );
}
