import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  Flame,
  Lock,
  Moon,
  Sun,
  Sunrise,
  Timer,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { readNutritionTargets, sumNutritionDay } from '@/shared/lib/nutrition-aggregate';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useShell } from '@/app/navigation/shell-context';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { TASK_CATEGORY_DEFAULT_META, TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { LoadingShell } from '@/shared/ui/data-states';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
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

const TASK_ICON_SIZE_CN = 'size-5';

/** Один визуальный «слот» управления для любого типа задачи: размер, рамка, фон, фокус. */
function TaskControlSlot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'box-border flex min-h-11 w-full shrink-0 items-center overflow-hidden text-foreground lg:h-full lg:min-h-8',
        className
      )}
    >
      {children}
    </div>
  );
}

const TASK_META_CN = 'text-xs font-medium tabular-nums tracking-tight';

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
  doneTitle,
  satisfied,
  disabled,
  control,
  onOpenDetail,
}: {
  icon: string | null;
  accent: string;
  title: string;
  pct: number;
  doneTitle?: boolean;
  /** Прогресс закрыт — лёгкий фон строки и акцент у процента */
  satisfied?: boolean;
  disabled?: boolean;
  control: ReactNode;
  onOpenDetail?: () => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const iconSegRef = useRef<HTMLDivElement | null>(null);
  const titleSegRef = useRef<HTMLDivElement | null>(null);
  const pctSegRef = useRef<HTMLButtonElement | null>(null);

  const [segClip, setSegClip] = useState<{ iconPx: number; iconW: number; titlePct: number; pctPct: number }>({
    iconPx: 0,
    iconW: 0,
    titlePct: 0,
    pctPct: 0,
  });
  const rafRecompute = useRef<number | null>(null);

  const safePct = Math.min(100, Math.max(0, pct));
  const uiPct = Math.min(100, Math.max(0, Math.round(safePct)));
  const fillOpacity = satisfied ? 1 : 0.96;

  const recomputeSegClips = useCallback(() => {
    const row = rowRef.current;
    const iconEl = iconSegRef.current;
    const titleEl = titleSegRef.current;
    const pctEl = pctSegRef.current;
    if (!row || !iconEl || !titleEl || !pctEl) return;

    const rowRect = row.getBoundingClientRect();
    const rowW = rowRect.width;
    if (!Number.isFinite(rowW) || rowW <= 0) return;

    const fillW = (uiPct / 100) * rowW;

    const coveredPx = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const left = r.left - rowRect.left;
      const w = r.width;
      if (!Number.isFinite(left) || !Number.isFinite(w) || w <= 0) return 0;
      return Math.min(w, Math.max(0, fillW - left));
    };

    const pctFor = (covered: number, w: number) => {
      if (!Number.isFinite(covered) || !Number.isFinite(w) || w <= 0) return 0;
      return Math.min(100, Math.max(0, (covered / w) * 100));
    };

    const iconW = iconEl.getBoundingClientRect().width;
    const titleW = titleEl.getBoundingClientRect().width;
    const pctW = pctEl.getBoundingClientRect().width;

    const iconCovered = coveredPx(iconEl);

    const next = {
      iconPx: iconCovered,
      iconW,
      titlePct: pctFor(coveredPx(titleEl), titleW),
      pctPct: pctFor(coveredPx(pctEl), pctW),
    };

    setSegClip((prev) => {
      const same =
        Math.abs(prev.iconPx - next.iconPx) < 0.35 &&
        Math.abs(prev.iconW - next.iconW) < 0.35 &&
        Math.abs(prev.titlePct - next.titlePct) < 0.05 &&
        Math.abs(prev.pctPct - next.pctPct) < 0.05;
      return same ? prev : next;
    });
  }, [uiPct]);

  const scheduleRecomputeSegClips = useCallback(() => {
    if (rafRecompute.current != null) cancelAnimationFrame(rafRecompute.current);
    rafRecompute.current = requestAnimationFrame(() => {
      rafRecompute.current = null;
      recomputeSegClips();
    });
  }, [recomputeSegClips]);

  useLayoutEffect(() => {
    scheduleRecomputeSegClips();
  }, [scheduleRecomputeSegClips, title, icon, pct, doneTitle, uiPct]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const ro = new ResizeObserver(() => {
      scheduleRecomputeSegClips();
    });
    ro.observe(row);
    const iconEl = iconSegRef.current;
    const titleEl = titleSegRef.current;
    const pctEl = pctSegRef.current;
    if (iconEl) ro.observe(iconEl);
    if (titleEl) ro.observe(titleEl);
    if (pctEl) ro.observe(pctEl);

    const onWin = () => scheduleRecomputeSegClips();
    window.addEventListener('resize', onWin);

    let fontsDone: Promise<void> | null = null;
    try {
      const fonts = (document as unknown as { fonts?: { ready?: Promise<void> } }).fonts;
      fontsDone = fonts?.ready ?? null;
    } catch {
      fontsDone = null;
    }
    if (fontsDone) {
      fontsDone.then(() => scheduleRecomputeSegClips()).catch(() => undefined);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWin);
      if (rafRecompute.current != null) cancelAnimationFrame(rafRecompute.current);
      rafRecompute.current = null;
    };
  }, [scheduleRecomputeSegClips]);

  function SegmentedDualText({
    clipPct,
    children,
    className,
  }: {
    clipPct: number;
    children: string;
    className?: string;
  }) {
    const safe = Math.min(100, Math.max(0, clipPct));
    return (
      <span className={cn('relative inline-block max-w-full', className)}>
        <span className="block truncate text-sm font-semibold leading-tight tracking-tight text-foreground">{children}</span>
        <span
          className="pointer-events-none absolute inset-0 overflow-hidden text-white hidden lg:block"
          style={{ width: `${safe}%` }}
          aria-hidden
        >
          <span className="block truncate text-sm font-semibold leading-tight tracking-tight">{children}</span>
        </span>
      </span>
    );
  }

  return (
    <li
      className={cn(
          'group/task relative isolate flex flex-1 items-center overflow-hidden border rounded-lg transition-[background-color,border-color,opacity] duration-aura-base ease-aura',
          'border-border/40 bg-muted/35',
          satisfied ? 'border-foreground/15' : 'hover:border-border/70',
          disabled && 'opacity-45'
      )}
    >
      {disabled ? <div className="absolute inset-0 z-20 bg-background/35 backdrop-blur-[1px]" aria-hidden /> : null}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-[width] duration-aura-glide ease-aura'
          )}
          style={{
            width: `${uiPct}%`,
            backgroundColor: accent,
            opacity: fillOpacity,
          }}
        />
      </div>

      {/* Мобильный вид: две равные половины */}
      <div
        className="lg:hidden flex min-w-0 flex-1 items-center basis-1/2 gap-2 px-2.5 py-2 pointer-events-none border-r border-border/40"
      >
        <div className="shrink-0">
          <IconWithBadge
            iconName={icon}
            tint={accent}
            size="md"
            surfaceClassName="bg-transparent ring-0 shadow-none"
          />
        </div>
        <button
          type="button"
          className="relative min-w-0 flex-1 text-left pointer-events-auto"
          onClick={onOpenDetail}
          disabled={disabled}
        >
          <span className="block truncate text-base font-semibold sm:text-sm">{title}</span>
        </button>
      </div>

      {/* Стандартный вид (десктоп): иконка, название, процент */}
      <div
        ref={rowRef}
        className={cn(
          'relative z-10 hidden lg:flex min-w-0 flex-1 items-center gap-x-2 px-2.5 py-1.5 pointer-events-none',
          'lg:gap-x-2.5 lg:px-3 lg:py-2 lg:transition-opacity lg:duration-aura-fast lg:ease-aura lg:group-hover/task:pointer-events-none lg:group-hover/task:opacity-0',
          disabled && 'pointer-events-none opacity-70'
        )}
      >
        <div ref={iconSegRef} className="shrink-0">
          <div className="relative">
            <IconWithBadge
              iconName={icon}
              tint={accent}
              size="md"
              surfaceClassName="bg-transparent ring-0 shadow-none"
            />
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ width: uiPct >= 100 ? '100%' : `${Math.max(0, segClip.iconPx)}px` }}
              aria-hidden
            >
              <div className="absolute inset-0">
                <IconWithBadge
                  iconName={icon}
                  tint="#ffffff"
                  size="md"
                  surfaceClassName="bg-transparent ring-0 shadow-none"
                />
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="relative min-w-0 flex-1 rounded-lg px-2 text-left aura-tx-colors hover:bg-muted/30 pointer-events-auto disabled:hover:bg-transparent"
          onClick={onOpenDetail}
          disabled={disabled}
        >
          <div ref={titleSegRef} className="min-w-0">
            <SegmentedDualText clipPct={segClip.titlePct} className="w-full min-w-0">
              {title}
            </SegmentedDualText>
          </div>
        </button>
        <button
          type="button"
          className="relative min-w-max shrink-0 items-center justify-end flex rounded-lg px-2 aura-tx-colors hover:bg-muted/30 pointer-events-auto disabled:hover:bg-transparent"
          onClick={onOpenDetail}
          ref={pctSegRef}
          disabled={disabled}
        >
          <SegmentedDualText clipPct={segClip.pctPct} className="tabular-nums">
            {`${uiPct}%`}
          </SegmentedDualText>
        </button>
      </div>

      {/* Контрол управления */}
      <div
        className={cn(
          'relative z-20 flex items-center justify-center basis-1/2 shrink-0 pointer-events-none',
          'lg:min-w-[3rem] lg:border-l lg:border-border/40 lg:bg-background/92 lg:pr-0',
          'lg:absolute lg:inset-0 lg:z-30 lg:min-h-0 lg:min-w-[auto] lg:basis-auto lg:items-stretch lg:justify-stretch lg:bg-popover lg:text-popover-foreground lg:pr-0 lg:opacity-0 lg:shadow-sm lg:ring-1 lg:ring-border/60 lg:transition-opacity lg:duration-aura-fast lg:ease-aura lg:group-hover/task:opacity-100',
          disabled && 'lg:opacity-0'
        )}
      >
        <div className="pointer-events-auto flex h-full w-full">
          {control}
        </div>
      </div>
    </li>
  );
}

export function TasksCategoriesCard() {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const preferBootstrap = typeof window !== 'undefined' && Boolean(window.__auraMiniApi);
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const { setActivePageId } = useShell();
  const dataTick = useAuraDataRefresh({ types: ['task-progress', 'timer', 'ritual', 'nutrition'] });
  const [sheetTask, setSheetTask] = useState<AuraRow | null>(null);
  const [localReloadTick, setLocalReloadTick] = useState(0);
  const [progress, setProgress] = useState<AuraTaskProgress | null>(null);
  const [optimisticProgressById, setOptimisticProgressById] = useState<Record<string, AuraTaskProgress>>({});
  const bootstrapParams = useMemo(() => ({ date: dateString }), [dateString]);
  const { data: homeBootstrap } = useBootstrapData<{
    cfgTasks?: AuraRow[];
    cfgRitualsMorning?: AuraRow[];
    cfgRitualsEvening?: AuraRow[];
    ritualsMorningRows?: AuraRow[];
    ritualsEveningRows?: AuraRow[];
    taskProgressById?: Record<string, AuraTaskProgress | null>;
    timerTotalsByTaskId?: Record<string, number>;
    categoryProgresses?: Record<string, number>;
  }>(
    'home',
    bootstrapParams,
    [dataTick, localReloadTick],
    {
      keepStaleOnError: true,
      dedupeKey: `home:${dateString}:${dataTick}:${localReloadTick}`,
      cacheMs: 0,
    }
  );
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const numberSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { data: nutritionEntries } = useAsyncData(
    (database) => database.getNutritionEntries(dateString),
    [dateString],
    { events: ['nutrition'] }
  );
  const nutritionTotals = useMemo(() => sumNutritionDay(nutritionEntries ?? []), [nutritionEntries]);
  const nutritionTargets = useMemo(() => readNutritionTargets(db?.getAppSettings() as Record<string, unknown> | null), [db, dataTick]);
  const nutritionProgressPct = useMemo(() => {
    const target = Number(nutritionTargets.calories) || 0;
    if (target <= 0) return nutritionTotals.calories > 0 ? 100 : 0;
    return Math.min(100, Math.round((nutritionTotals.calories / target) * 100));
  }, [nutritionTargets.calories, nutritionTotals.calories]);

  const allCfgTasks = useMemo(() => {
    if (homeBootstrap?.cfgTasks?.length) return homeBootstrap.cfgTasks;
    if (preferBootstrap) return [] as AuraRow[];
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_tasks');
  }, [db, homeBootstrap?.cfgTasks, preferBootstrap]);

  const activeRitualIds = useMemo(() => {
    if (!db) return { morning: new Set<string>(), evening: new Set<string>() };
    if (preferBootstrap && !homeBootstrap?.cfgRitualsMorning && !homeBootstrap?.cfgRitualsEvening) {
      return { morning: new Set<string>(), evening: new Set<string>() };
    }
    const morningSource = homeBootstrap?.cfgRitualsMorning ?? db.getAll('cfg_rituals_morning');
    const eveningSource = homeBootstrap?.cfgRitualsEvening ?? db.getAll('cfg_rituals_evening');
    const morning = new Set(
      morningSource
        .filter((row) => Number(row.active) !== 0)
        .map((row) => String(row.id ?? ''))
        .filter(Boolean)
    );
    const evening = new Set(
      eveningSource
        .filter((row) => Number(row.active) !== 0)
        .map((row) => String(row.id ?? ''))
        .filter(Boolean)
    );
    return { morning, evening };
  }, [db, homeBootstrap?.cfgRitualsEvening, homeBootstrap?.cfgRitualsMorning, preferBootstrap]);

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
    const timers = numberSaveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const values = useMemo(() => {
    if (!db) return {} as Record<string, number>;
    const categoryProgresses = homeBootstrap?.categoryProgresses;
    if (categoryProgresses) {
      const next: Record<string, number> = {};
      for (const categoryId of CATEGORY_IDS) {
        next[categoryId] = Number(categoryProgresses[categoryId] ?? 0);
      }
      return next;
    }
    return getCategoryProgresses(db, dateString, CATEGORY_IDS);
  }, [db, dateString, homeBootstrap?.categoryProgresses, dataTick, localReloadTick]);

  const tasksByCat = useMemo(() => {
    if (!db) return {} as Record<string, AuraRow[]>;
    const m: Record<string, AuraRow[]> = {};
    CATEGORY_IDS.forEach((c) => {
      m[c] = tasksForCategory(allCfgTasks, c);
    });
    return m;
  }, [allCfgTasks, db]);

  const taskProgressById = useMemo(() => {
    const map = new Map<string, AuraTaskProgress | null>();
    if (homeBootstrap?.taskProgressById && Object.keys(homeBootstrap.taskProgressById).length) {
      for (const [taskId, raw] of Object.entries(homeBootstrap.taskProgressById)) {
        map.set(taskId, (raw as AuraTaskProgress | null) ?? null);
      }
      return map;
    }
    if (preferBootstrap) return map;
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
  }, [db, dateString, homeBootstrap?.taskProgressById, preferBootstrap, tasksByCat]);

  const effectiveTaskProgressById = useMemo(() => {
    const merged = new Map(taskProgressById);
    for (const [taskId, value] of Object.entries(optimisticProgressById)) {
      merged.set(taskId, value);
    }
    return merged;
  }, [taskProgressById, optimisticProgressById]);

  const timerTotalsByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    if (homeBootstrap?.timerTotalsByTaskId && Object.keys(homeBootstrap.timerTotalsByTaskId).length) {
      for (const [taskId, total] of Object.entries(homeBootstrap.timerTotalsByTaskId)) {
        map.set(taskId, Number(total) || 0);
      }
      return map;
    }
    if (preferBootstrap) return map;
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
  }, [db, dateString, homeBootstrap?.timerTotalsByTaskId, preferBootstrap, tasksByCat]);

  const ritualCountsByType = useMemo(() => {
    const out = new Map<string, { completed: number; total: number }>();
    if (!db) return out;
    if (preferBootstrap && !homeBootstrap?.ritualsMorningRows && !homeBootstrap?.ritualsEveningRows) {
      return out;
    }
    const morningRows = homeBootstrap?.ritualsMorningRows ?? db.getRitualsMorning(dateString);
    const eveningRows = homeBootstrap?.ritualsEveningRows ?? db.getRitualsEvening(dateString);
    const morningCompleted = morningRows.reduce((acc, row) => {
      const ritualId = String(row.ritual_id ?? '');
      if (!ritualId || !activeRitualIds.morning.has(ritualId)) return acc;
      return acc + (Number(row.completed) === 1 ? 1 : 0);
    }, 0);
    const eveningCompleted = eveningRows.reduce((acc, row) => {
      const ritualId = String(row.ritual_id ?? '');
      if (!ritualId || !activeRitualIds.evening.has(ritualId)) return acc;
      return acc + (Number(row.completed) === 1 ? 1 : 0);
    }, 0);
    out.set('sunrise', { completed: morningCompleted, total: activeRitualIds.morning.size });
    out.set('sunset', { completed: eveningCompleted, total: activeRitualIds.evening.size });
    return out;
  }, [
    activeRitualIds.evening,
    activeRitualIds.morning,
    db,
    dateString,
    dataTick,
    homeBootstrap?.ritualsEveningRows,
    homeBootstrap?.ritualsMorningRows,
    preferBootstrap,
  ]);

  const openTask = (task: AuraRow) => {
    if (!db) return;
    setSheetTask(task);
    const id = String(task.id ?? '');
    setProgress(id ? (effectiveTaskProgressById.get(id) ?? null) : null);
  };

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
      });
      setLocalReloadTick((v) => v + 1);
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
    console.log(`[goRituals] ritualType=${ritualType}, kind=${kind}`);
    try {
      localStorage.setItem(STORAGE_KEYS.RITUALS_KIND, kind);
      console.log(`[goRituals] localStorage set to ${kind}`);
    } catch (e) {
      console.error(`[goRituals] Error setting localStorage:`, e);
    }
    console.log(`[goRituals] Calling setActivePageId('rituals')`);
    setActivePageId('rituals');
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
      const rtPct = String(t.ritual_type ?? 'sunrise');
      try {
        const rp = db.calculateRitualProgress(rtPct, dateString);
        if (rp != null && Number.isFinite(Number(rp))) pct = Math.min(100, Math.max(0, Number(rp)));
      } catch {
        /* оставляем pct из act_tasks */
      }
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
      const depsLabel = done ? 'Держусь' : 'Не держусь';
      
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
          onOpenDetail={() => openTask(t)}
          control={
            <TaskControlSlot
              className={cn('p-0', disabled && 'pointer-events-none opacity-50')}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
                disabled={disabled}
                className={cn(
                  'flex min-h-8 w-full cursor-pointer items-center justify-center gap-2 px-2.5 text-foreground transition-[background-color,color] duration-aura-base ease-aura lg:h-full lg:px-3',
                  'hover:bg-muted/55 active:bg-muted/70',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-popover'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  persist(id, { completed: done ? 0 : 1 });
                }}
              >
                <span
                  className={cn(TASK_ICON_SIZE_CN, 'relative inline-flex shrink-0 items-center justify-center rounded-lg border-2 transition-[background-color,border-color] duration-aura-base ease-aura')}
                  style={{
                    borderColor: accent,
                    backgroundColor: done ? accent : 'transparent',
                  }}
                  aria-hidden
                >
                  <Check
                    className={cn(
                      'size-3.5 text-white transition-opacity duration-aura-base ease-aura',
                      done ? 'opacity-100' : 'opacity-0'
                    )}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </span>
                {isDeps && <span className="text-sm font-semibold tracking-tight text-foreground">{depsLabel}</span>}
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
          onOpenDetail={() => openTask(t)}
          control={
            <TaskControlSlot
              className={cn(disabled && 'pointer-events-none opacity-50')}
            >
              <div className="flex min-h-8 w-full min-w-0 flex-row items-stretch rounded-lg bg-popover/80 lg:h-full lg:rounded-none lg:bg-transparent">
                <div className="flex min-w-0 flex-1 items-center justify-center">
                  <Input
                    type="number"
                    inputMode="decimal"
                    className={cn(
                      TASK_META_CN,
                      'h-full w-full min-w-0 border-0 bg-transparent text-center text-foreground shadow-none aura-tx-colors focus-visible:ring-0 placeholder:text-muted-foreground/40 lg:rounded-none'
                    )}
                    disabled={disabled}
                    value={draft}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const next = e.target.value;
                      setNumberDrafts((m) => ({ ...m, [id]: next }));
                      scheduleNumberPersist(id, next);
                    }}
                    onBlur={(e) => {
                      const n = parseFloat(String(e.target.value).replace(',', '.'));
                      if (Number.isFinite(n)) persist(id, { current_value: n });
                    }}
                  />
                </div>
                <div className="bg-border/30 my-2 w-px shrink-0 self-stretch" aria-hidden />
                <div
                  className={cn('flex min-w-[2.5rem] shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-center text-muted-foreground/70')}
                >
                  {unitStr ? (
                    <span className={cn(TASK_META_CN, 'max-w-full truncate leading-none')} title={unitStr}>
                      {unitStr}
                    </span>
                  ) : null}
                  <span className={cn(TASK_META_CN, 'leading-none opacity-80')}>{target ? `/${target}` : '—'}</span>
                </div>
              </div>
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
      const listButtonLabel =
        items.length === 0
          ? 'Нет списка'
          : selectedIndex < 0
            ? 'Не выбрано'
            : `${selectedIndex + 1}. ${listItemLabel(items[selectedIndex]!, selectedIndex)}`;
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          onOpenDetail={() => openTask(t)}
          control={
            items.length === 0 ? (
              <TaskControlSlot className="justify-center">
                <span className={cn(TASK_META_CN, 'text-muted-foreground text-center')}>Нет списка</span>
              </TaskControlSlot>
            ) : (
              <TaskControlSlot className={cn(disabled && 'pointer-events-none opacity-50')}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Переключить пункт списка"
                  className={cn(
                    'flex min-h-8 w-full min-w-0 cursor-pointer items-center justify-center gap-2 px-2.5 text-foreground transition-[background-color] duration-aura-base ease-aura lg:h-full lg:px-3',
                    'hover:bg-muted/55 active:bg-muted/70',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                    satisfied && 'hover:bg-primary/12'
                  )}
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
                      const label = listItemLabel(it, next);
                      persist(id, {
                        value: next,
                        selected_list_item: label,
                        completion_percent,
                      });
                    }
                  }}
                >
                  <span className={cn(TASK_META_CN, 'min-w-0 truncate text-center font-semibold')}>{listButtonLabel}</span>
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
          onOpenDetail={() => openTask(t)}
          control={
            <TaskControlSlot
              className={cn('p-0', disabled && 'pointer-events-none opacity-50')}
            >
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'flex min-h-8 w-full cursor-pointer items-center justify-center gap-2 px-2.5 text-foreground transition-[background-color] duration-aura-base ease-aura lg:h-full lg:px-3',
                  'hover:bg-muted/55 active:bg-muted/70',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                  satisfied && 'hover:bg-primary/12'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePageId('timer');
                }}
              >
                <Timer className={cn(TASK_ICON_SIZE_CN, 'shrink-0')} style={{ color: accent }} />
                <span className="text-sm font-semibold tabular-nums">{timerBtnLabel}</span>
              </button>
            </TaskControlSlot>
          }
        />
      );
    }

    if (taskType === 'nutrition') {
      const kcal = Math.round(nutritionTotals.calories);
      const target = Math.round(nutritionTargets.calories);
      const targetLabel = target > 0 ? `${kcal} / ${target} ккал` : `${kcal} ккал`;
      return (
        <TaskRowFrame
          key={id}
          icon={icon}
          accent={accent}
          title={title}
          pct={pct}
          satisfied={satisfied}
          disabled={disabled}
          onOpenDetail={() => openTask(t)}
          control={
            <TaskControlSlot className={cn('p-0', disabled && 'pointer-events-none opacity-50')}>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'flex min-h-8 w-full cursor-pointer items-center justify-center gap-2 px-2.5 text-foreground transition-[background-color] duration-aura-base ease-aura lg:h-full lg:px-3',
                  'hover:bg-muted/55 active:bg-muted/70',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                  satisfied && 'hover:bg-primary/12'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePageId('diary');
                }}
              >
                <Flame className={cn(TASK_ICON_SIZE_CN, 'shrink-0')} style={{ color: accent }} />
                <span className="text-sm font-semibold tabular-nums">{targetLabel}</span>
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
          onOpenDetail={() => openTask(t)}
          control={
            <TaskControlSlot
              className={cn('p-0', disabled && 'pointer-events-none opacity-50')}
            >
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'flex h-9 w-full cursor-pointer items-center justify-center gap-2 px-2.5 text-foreground transition-[background-color] duration-aura-base ease-aura lg:h-full lg:px-3',
                  'hover:bg-muted/55 active:bg-muted/70',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                  satisfied && 'hover:bg-primary/12'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  goRituals(rt);
                }}
              >
                <RitIcon className={cn(TASK_ICON_SIZE_CN, 'shrink-0')} style={{ color: accent }} />
                <span className="text-sm font-semibold tabular-nums">
                  {completed}/{total}
                </span>
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
        onOpenDetail={() => openTask(t)}
        control={
          <TaskControlSlot className="justify-center">
            <span className={cn(TASK_META_CN, 'text-muted-foreground')}>—</span>
          </TaskControlSlot>
        }
      />
    );
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {saveError ? <p className="text-destructive mb-2 text-xs">{saveError}</p> : null}
        {!db ? (
          <LoadingShell />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 rounded-none border-0 bg-transparent p-0 lg:grid-cols-4 lg:gap-0">
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
                    'flex min-h-[13rem] flex-col overflow-hidden rounded-lg border border-border/60 bg-card/80 px-0 py-0 shadow-sm lg:min-h-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none',
                    idx !== 3 && 'lg:border-r lg:border-border/40',
                    dayLocked && 'pointer-events-none opacity-50'
                  )}
                >
                  <div className="flex flex-col gap-2 px-3.5 py-3 sm:px-4 sm:py-3">
                    <div
                      className="flex items-center justify-between gap-2 px-0 py-0"
                      style={{ '--accent-color': accent } as React.CSSProperties}
                      aria-label={`${label}: ${Math.round(n)}%`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center" aria-hidden>
                          {dayLocked ? (
                            <Lock size={17} className="shrink-0 text-foreground" />
                          ) : (
                            <ColoredAuraIcon name={headerIcon} size={17} tint={accent} className="shrink-0" />
                          )}
                        </div>
                        <h3
                          className="min-w-0 truncate text-sm font-bold leading-none tracking-[0.08em] uppercase sm:text-[18px] sm:font-extrabold sm:tracking-[0.05em]"
                          style={{ color: accent }}
                        >
                          {label.toUpperCase()}
                        </h3>
                      </div>
                      <span
                        className="shrink-0 text-sm font-bold leading-none tracking-[0.08em] tabular-nums uppercase sm:text-[18px] sm:font-extrabold sm:tracking-[0.05em]"
                        style={{ color: accent }}
                      >
                        {`${Math.round(n)}%`}
                      </span>
                    </div>

                    <div className="rounded-full bg-muted/55 p-[3px]" style={{ '--accent-color': accent } as React.CSSProperties}>
                      <Progress
                        value={n}
                        className={cn(
                          'h-1.5 w-full rounded-full bg-transparent',
                          '[&_[data-slot=progress-indicator]]:bg-[var(--accent-color)]',
                          '[&_[data-slot=progress-indicator]]:transition-transform',
                          '[&_[data-slot=progress-indicator]]:duration-aura-task-fill',
                          '[&_[data-slot=progress-indicator]]:ease-aura'
                        )}
                      />
                    </div>
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-muted-foreground/50 px-3 text-center text-xs sm:px-4">—</p>
                  ) : (
                    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain mt-1 px-2 pb-3 pt-0 text-sm sm:gap-2 sm:px-4 sm:pb-3">
                      {tasks.map((t) => renderTaskLine(t, catId))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetTask != null} onOpenChange={(o) => !o && setSheetTask(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 pr-8">
              <ColoredAuraIcon name={sheetTask && typeof sheetTask.icon === 'string' ? sheetTask.icon : null} tint="var(--primary)" size={22} />
              <span className="line-clamp-2">{sheetTask ? String(sheetTask.title ?? sheetTask.id) : ''}</span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              {dateString} · {sheetTask ? String(sheetTask.task_type ?? '—') : '—'}
            </SheetDescription>
          </SheetHeader>
          {sheetTask && progress ? (
            <div className="text-muted-foreground space-y-3 px-1 text-sm">
              <div>
                <p className="text-foreground text-xs font-medium">Прогресс</p>
                <Progress value={Math.min(100, Math.max(0, Number(progress.completion_percent) || 0))} className="mt-1 h-1.5" />
                <p className="mt-1 tabular-nums">{Math.round(Number(progress.completion_percent) || 0)}%</p>
              </div>
              {progress.selected_list_item ? (
                <p className="text-xs">
                  <span className="text-foreground font-medium">Список: </span>
                  {progress.selected_list_item}
                </p>
              ) : null}
              <p className="font-mono text-xs break-all opacity-80">id {String(sheetTask.id)}</p>
            </div>
          ) : sheetTask ? (
            <p className="text-muted-foreground text-sm">Нет данных прогресса.</p>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
