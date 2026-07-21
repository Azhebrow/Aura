import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  Clock,
  Eye,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { ActComposer } from '@/features/act-system';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData, clearBootstrapDataCache } from '@/shared/hooks/use-bootstrap-data';
import { invalidateBootstrapCache } from '@/shared/bridge/mini-app-client';
import { clearReadCache } from '@/shared/bridge/init-web-db-bridge';
import { dispatchAuraDataChanged } from '@/shared/lib/aura-data-events';
import { detectAuraDataSourceMode } from '@/shared/bridge/aura-data-source';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { GoalEditDialog } from './GoalEditDialog';
import { GoalTaskDialog } from './GoalTaskDialog';
import { loadPickerTasks, type PickerTask } from '@/features/timer/timer-utils';
import { cn } from '@/lib/utils';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import {
  LIST_SCROLL_CONTAINER_CN,
  MEGA_PANEL_INSET_CN,
} from '@/shared/ui/mega-section-layout';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { LoadingShell } from '@/shared/ui/data-states';
import { ANIM } from '@/shared/lib/animation-classes';
import { todayIsoDate } from '@/shared/lib/dates';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import {
  type GoalsMode,
  type GoalsDbApi,
  RAW_BUTTON_FOCUS_CN,
  GOALS_RITUALS_ICON_BTN_CN,
  GOALS_RITUALS_TOOLBAR_ROW_CN,
  GOALS_GLOBAL_SCOPE_DATE,
  idOrCreate,
  asIsoDate,
  formatRuDate,
  stageOrderRoman,
  calcTaskProgress,
  calcTimelineStagePercents,
  formatHoursMinutes,
  getStageVisualState,
  getStageStateClasses,
} from './rituals-utils';

function readStoredGoalsMode(): GoalsMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RITUALS_GOALS_MODE);
    return raw === 'archive' ? 'archive' : 'active';
  } catch {
    return 'active';
  }
}

function readStoredGoalId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.RITUALS_SELECTED_GOAL_ID);
  } catch {
    return null;
  }
}

function bootstrapToSortedMap(
  raw: Record<string, AuraRow[]> | undefined,
  sortKey: string,
): Map<string, AuraRow[]> | null {
  if (!raw || !Object.keys(raw).length) return null;
  const out = new Map<string, AuraRow[]>();
  for (const [key, rows] of Object.entries(raw)) {
    out.set(key, [...rows].sort((a, b) => Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)));
  }
  return out;
}

export function GoalsManagementPanel() {
  const { db } = useAuraDb();
  const dbx = db as AuraDatabase & GoalsDbApi;

  // Single reactive tick — listens to 'goals' events dispatched by refresh().
  const dataTick = useAuraDataRefresh({ types: ['goals'] });

  const [mode, setMode] = useState<GoalsMode>(readStoredGoalsMode);
  const [editMode, setEditMode] = useState(false);
  const [goalIndex, setGoalIndex] = useState(0);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(readStoredGoalId);
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [stageDialog, setStageDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [taskStageId, setTaskStageId] = useState<string | null>(null);
  const [editingTaskValues, setEditingTaskValues] = useState<Record<string, string>>({});
  const bootstrapParams = useMemo(() => ({ date: GOALS_GLOBAL_SCOPE_DATE }), []);
  const { data: ritualsBootstrap } = useBootstrapData<{
    goals?: AuraRow[];
    stagesByGoal?: Record<string, AuraRow[]>;
    tasksByStage?: Record<string, AuraRow[]>;
    goalProgressRows?: AuraRow[];
  }>('rituals', bootstrapParams, [dataTick], { enabled: Boolean(db), keepStaleOnError: true });
  const waitForBootstrap = detectAuraDataSourceMode() === 'web-mini-api' && ritualsBootstrap == null;
  const goalsFallbackTick = ritualsBootstrap?.goals ? 0 : dataTick;
  const stagesFallbackTick = ritualsBootstrap?.stagesByGoal ? 0 : dataTick;
  const tasksFallbackTick = ritualsBootstrap?.tasksByStage ? 0 : dataTick;
  const progressFallbackTick = ritualsBootstrap?.goalProgressRows ? 0 : dataTick;

  const canManage = Boolean(dbx?.getAllGoals && dbx?.getStagesByGoal && dbx?.getTasksByStage);
  const setStoredMode = useCallback((next: GoalsMode) => {
    setMode(next);
    try { localStorage.setItem(STORAGE_KEYS.RITUALS_GOALS_MODE, next); } catch { /* ignore */ }
  }, []);
  const setStoredGoalId = useCallback((next: string | null) => {
    setSelectedGoalId(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEYS.RITUALS_SELECTED_GOAL_ID, next);
      else localStorage.removeItem(STORAGE_KEYS.RITUALS_SELECTED_GOAL_ID);
    } catch { /* ignore */ }
  }, []);

  const [pickerTasks, setPickerTasks] = useState<PickerTask[]>([]);
  useEffect(() => {
    if (db) setPickerTasks(loadPickerTasks(db));
  }, [db]);

  const goals = useMemo(() => {
    if (!dbx || !dbx.getAllGoals) return [] as AuraRow[];
    if (ritualsBootstrap?.goals?.length) {
      return [...ritualsBootstrap.goals].sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
    }
    if (waitForBootstrap) return [] as AuraRow[];
    return (dbx.getAllGoals() ?? []).sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
  }, [dbx, ritualsBootstrap?.goals, waitForBootstrap, goalsFallbackTick]);

  const stagesByGoal = useMemo(() => {
    const fromBootstrap = bootstrapToSortedMap(ritualsBootstrap?.stagesByGoal, 'order_index');
    if (fromBootstrap) return fromBootstrap;
    const out = new Map<string, AuraRow[]>();
    if (waitForBootstrap || !dbx?.getStagesByGoal) return out;
    for (const g of goals) {
      const gid = String(g.id);
      out.set(gid, (dbx.getStagesByGoal(gid) ?? []).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)));
    }
    return out;
  }, [dbx, goals, ritualsBootstrap?.stagesByGoal, waitForBootstrap, stagesFallbackTick]);

  const tasksByStage = useMemo(() => {
    const fromBootstrap = bootstrapToSortedMap(ritualsBootstrap?.tasksByStage, 'order_index');
    if (fromBootstrap) return fromBootstrap;
    const out = new Map<string, AuraRow[]>();
    if (waitForBootstrap || !dbx?.getTasksByStage) return out;
    for (const stages of stagesByGoal.values()) {
      for (const s of stages) {
        const sid = String(s.id);
        out.set(sid, (dbx.getTasksByStage(sid) ?? []).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)));
      }
    }
    return out;
  }, [dbx, ritualsBootstrap?.tasksByStage, stagesByGoal, waitForBootstrap, tasksFallbackTick]);

  const goalTaskProgressById = useMemo(() => {
    const out = new Map<string, AuraRow | null | undefined>();
    if (!dbx || !dbx.getGoalTasksProgressByDate) return out;
    if (ritualsBootstrap?.goalProgressRows) {
      for (const row of ritualsBootstrap.goalProgressRows) {
        const taskId = String(row.task_id ?? '');
        if (!taskId) continue;
        out.set(taskId, row);
      }
      return out;
    }
    if (waitForBootstrap) return out;
    // Direct fallback is only for non-mini-api mode. In mini-api mode the bootstrap
    // request is the freshness boundary and dataTick invalidates it after mutations.
    const rows = dbx.getGoalTasksProgressByDate(GOALS_GLOBAL_SCOPE_DATE) ?? [];
    for (const row of rows) {
      const taskId = String(row.task_id ?? '');
      if (!taskId) continue;
      out.set(taskId, row);
    }
    return out;
  }, [dbx, ritualsBootstrap?.goalProgressRows, waitForBootstrap, progressFallbackTick]);

  // Accumulated timer seconds per timeline goal (goalId → seconds since start_date)
  const timelineAccumSeconds = useMemo(() => {
    const out = new Map<string, number>();
    if (!dbx?.getTaskTimerTotalSince) return out;
    for (const g of goals) {
      if (String(g.goal_type ?? 'standard') !== 'timeline') continue;
      const taskId = String(g.linked_task_id ?? '');
      const startDate = String(g.timeline_start_date ?? '');
      if (!taskId || !startDate) { out.set(String(g.id), 0); continue; }
      out.set(String(g.id), dbx.getTaskTimerTotalSince(taskId, startDate));
    }
    return out;
  }, [dbx, goals, progressFallbackTick]);

  // Per-stage percents for timeline goals (stageId → percent 0–100)
  const timelineStagePercents = useMemo(() => {
    const out = new Map<string, number>();
    for (const g of goals) {
      if (String(g.goal_type ?? 'standard') !== 'timeline') continue;
      const gid = String(g.id);
      const secs = timelineAccumSeconds.get(gid) ?? 0;
      const stages = stagesByGoal.get(gid) ?? [];
      const percents = calcTimelineStagePercents(stages, secs);
      for (const [sid, pct] of percents) out.set(sid, pct);
    }
    return out;
  }, [goals, stagesByGoal, timelineAccumSeconds]);

  const goalProgress = useMemo(() => {
    const out = new Map<string, { completed: number; total: number; percent: number }>();
    if (!dbx || !dbx.getStagesByGoal || !dbx.getTasksByStage) return out;
    for (const g of goals) {
      const gid = String(g.id);
      const isTimeline = String(g.goal_type ?? 'standard') === 'timeline';

      if (isTimeline) {
        const allStages = stagesByGoal.get(gid) ?? [];
        const total = allStages.length;
        const completed = allStages.filter((s) => (timelineStagePercents.get(String(s.id)) ?? 0) >= 100).length;
        out.set(gid, { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 });
        continue;
      }

      const allStages = stagesByGoal.get(gid) ?? [];
      let total = 0;
      let completed = 0;
      for (const st of allStages) {
        const allTasks = tasksByStage.get(String(st.id)) ?? [];
        for (const t of allTasks) {
          total += 1;
          const tid = String(t.id);
          if (Math.round(calcTaskProgress(t, goalTaskProgressById.get(tid))) === 100) completed += 1;
        }
      }
      out.set(gid, { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 });
    }
    return out;
  }, [dbx, goals, stagesByGoal, tasksByStage, goalTaskProgressById, timelineStagePercents]);

  const stageProgress = useMemo(() => {
    const out = new Map<string, { completed: number; total: number; percent: number }>();
    if (!dbx) return out;
    // Standard stages: task-based
    for (const [sid, allTasks] of tasksByStage.entries()) {
      let total = 0;
      let completed = 0;
      for (const t of allTasks) {
        total += 1;
        const tid = String(t.id);
        if (Math.round(calcTaskProgress(t, goalTaskProgressById.get(tid))) === 100) completed += 1;
      }
      out.set(sid, { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 });
    }
    // Timeline stages: hour-based (override)
    for (const [sid, pct] of timelineStagePercents) {
      out.set(sid, { completed: pct >= 100 ? 1 : 0, total: 1, percent: Math.round(pct) });
    }
    return out;
  }, [dbx, tasksByStage, goalTaskProgressById, timelineStagePercents]);

  const goalDetails = useMemo(() => {
    const out = new Map<
      string,
      { stagesTotal: number; tasksTotal: number; stageItems: Array<{ id: string; title: string; icon: string | null; done: number; total: number }> }
    >();
    if (!dbx || !dbx.getTasksByStage) return out;
    for (const g of goals) {
      const gid = String(g.id);
      const sts = stagesByGoal.get(gid) ?? [];
      let tasksTotal = 0;
      const stageItems = sts.map((s) => {
        const sid = String(s.id);
        const tks = tasksByStage.get(sid) ?? [];
        let done = 0;
        for (const t of tks) {
          const tid = String(t.id);
          if (Math.round(calcTaskProgress(t, goalTaskProgressById.get(tid))) === 100) done += 1;
        }
        tasksTotal += tks.length;
        return {
          id: sid,
          title: String(s.title ?? s.id),
          icon: typeof s.icon === 'string' ? s.icon : null,
          done,
          total: tks.length,
        };
      });
      out.set(gid, { stagesTotal: sts.length, tasksTotal, stageItems });
    }
    return out;
  }, [dbx, goals, stagesByGoal, tasksByStage, goalTaskProgressById]);

  useEffect(() => {
    if (!goals.length) setGoalIndex(0);
    if (goalIndex >= goals.length) setGoalIndex(0);
  }, [goals.length, goalIndex]);

  const filteredGoals = useMemo(
    () =>
      goals.filter((g) => {
        const hasAt = g.completed_at != null && String(g.completed_at) !== '';
        if (mode === 'active') return !hasAt;
        return hasAt;
      }),
    [goals, mode]
  );

  useEffect(() => {
    if (!filteredGoals.length) {
      setGoalIndex(0);
      return;
    }
    const storedIndex = selectedGoalId ? filteredGoals.findIndex((goal) => String(goal.id) === selectedGoalId) : -1;
    if (storedIndex >= 0 && storedIndex !== goalIndex) {
      setGoalIndex(storedIndex);
      return;
    }
    if (goalIndex >= filteredGoals.length) {
      setGoalIndex(0);
      setStoredGoalId(String(filteredGoals[0].id));
    }
  }, [filteredGoals, goalIndex, selectedGoalId, setStoredGoalId]);

  // Clears all cache layers and fires the 'goals' event.
  // The useAuraDataRefresh subscription (dataTick) handles the re-render.
  const refresh = useCallback(() => {
    const detail = { type: 'goals', date: GOALS_GLOBAL_SCOPE_DATE };
    clearReadCache();
    clearBootstrapDataCache(detail);
    invalidateBootstrapCache(detail);
    dispatchAuraDataChanged(detail);
  }, []);

  const currentGoal = useMemo(() => filteredGoals[goalIndex] ?? null, [filteredGoals, goalIndex]);
  const currentGoalId = currentGoal ? String(currentGoal.id) : null;
  useEffect(() => {
    if (currentGoalId && currentGoalId !== selectedGoalId) setStoredGoalId(currentGoalId);
  }, [currentGoalId, selectedGoalId, setStoredGoalId]);
  const canDeleteCurrentGoal = goals.length > 1;
  const isCurrentGoalTimeline = currentGoal ? String(currentGoal.goal_type ?? 'standard') === 'timeline' : false;
  const currentGoalHeroTint =
    currentGoal && typeof currentGoal.color === 'string' && currentGoal.color.trim()
      ? String(currentGoal.color)
      : 'var(--primary)';
  const currentStages = useMemo(
    () => (currentGoalId ? (stagesByGoal.get(currentGoalId) ?? []) : []),
    [currentGoalId, stagesByGoal]
  );
  const currentGoalTasks = useMemo(
    () => currentStages.flatMap((st) => tasksByStage.get(String(st.id)) ?? []),
    [currentStages, tasksByStage]
  );
  const currentGoalPct = useMemo(() => {
    if (!currentGoal) return 0;
    if (String(currentGoal.goal_type ?? 'standard') === 'timeline') {
      const lastStage = currentStages[currentStages.length - 1];
      const totalHours = lastStage ? Number(lastStage.threshold_hours ?? 0) : 0;
      const secs = timelineAccumSeconds.get(String(currentGoal.id)) ?? 0;
      return totalHours > 0 ? Math.min(100, (secs / (totalHours * 3600)) * 100) : 0;
    }
    const p = goalProgress.get(String(currentGoal.id));
    return p && p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
  }, [currentGoal, currentStages, goalProgress, timelineAccumSeconds]);
  const stageProgressList = useMemo(
    () => currentStages.map((stage) => stageProgress.get(String(stage.id)) ?? { completed: 0, total: 0, percent: 0 }),
    [currentStages, stageProgress]
  );
  const contiguousCompletedStageIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < stageProgressList.length; i += 1) {
      if (stageProgressList[i].percent === 100) idx = i;
      else break;
    }
    return idx;
  }, [stageProgressList]);
  const nextStageIndex = contiguousCompletedStageIndex + 1 < currentStages.length ? contiguousCompletedStageIndex + 1 : -1;

  useEffect(() => {
    if (!currentStages.length) return;
    let changed = false;
    for (const stage of currentStages) {
      const sid = String(stage.id);
      const st = stageProgress.get(sid);
      if (!st || st.total <= 0 || st.completed !== st.total) continue;
      if (asIsoDate(stage.completed_at)) continue;
      const completedAt = todayIsoDate();
      if (dbx.setStageCompletedAt) dbx.setStageCompletedAt(sid, completedAt);
      else dbx.updateStage?.(sid, { completed_at: completedAt });
      changed = true;
    }
    if (changed) refresh();
  }, [currentStages, stageProgress, dbx, refresh]);

  const allStages = useMemo(() => [...stagesByGoal.values()].flat(), [stagesByGoal]);
  const allTasks = useMemo(() => [...tasksByStage.values()].flat(), [tasksByStage]);
  const goalInitial = useMemo(
    () => (goalDialog.editId ? goals.find((g) => String(g.id) === goalDialog.editId) ?? null : null),
    [goalDialog.editId, goals]
  );
  const stageInitial = useMemo(
    () => (stageDialog.editId ? allStages.find((s) => String(s.id) === stageDialog.editId) ?? null : null),
    [allStages, stageDialog.editId]
  );
  const taskInitial = useMemo(
    () => (taskDialog.editId ? allTasks.find((t) => String(t.id) === taskDialog.editId) ?? null : null),
    [allTasks, taskDialog.editId]
  );

  const goalsScrollRef = useRef<HTMLDivElement>(null);
  const [stagesScrolled, setStagesScrolled] = useState(false);

  const firstIncompleteTask = useMemo(() => {
    if (!dbx) return null;
    for (const st of currentStages) {
      const sid = String(st.id);
      const stageTasks = tasksByStage.get(sid) ?? [];
      for (const t of stageTasks) {
        const tid = String(t.id);
        const raw = goalTaskProgressById.get(tid);
        if (Math.round(calcTaskProgress(t, raw)) < 100) return { sid, tid };
      }
    }
    return null;
  }, [dbx, currentStages, tasksByStage, goalTaskProgressById]);

  const firstIncompleteScrollKey = firstIncompleteTask ? `${firstIncompleteTask.sid}:${firstIncompleteTask.tid}` : '';

  useLayoutEffect(() => {
    setStagesScrolled(false);
    if (goalsScrollRef.current) goalsScrollRef.current.scrollTop = 0;
  }, [currentGoalId, goalIndex]);

  useLayoutEffect(() => {
    const root = goalsScrollRef.current;
    if (!root || !firstIncompleteTask) return;
    const el = root.querySelector<HTMLElement>('[data-goal-scroll-target="1"]');
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [currentGoalId, goalIndex, firstIncompleteScrollKey, filteredGoals.length]);

  const resumeArchivedGoal = useCallback(() => {
    if (!currentGoalId) return;
    for (const task of currentGoalTasks) {
      const tid = String(task.id);
      if (dbx.setTaskCompletedAt) dbx.setTaskCompletedAt(tid, null);
      else dbx.updateTask?.(tid, { completed_at: null });
    }
    for (const stage of currentStages) {
      const sid = String(stage.id);
      if (dbx.setStageCompletedAt) dbx.setStageCompletedAt(sid, null);
      else dbx.updateStage?.(sid, { completed_at: null });
    }
    if (dbx.setGoalCompletedAt) dbx.setGoalCompletedAt(currentGoalId, null);
    else dbx.updateGoal?.(currentGoalId, { completed_at: null });
    refresh();
  }, [currentGoalId, currentGoalTasks, currentStages, dbx, refresh]);

  const completeCurrentGoal = useCallback(() => {
    if (!currentGoalId) return;
    const completedAt = todayIsoDate();
    if (dbx.setGoalCompletedAt) dbx.setGoalCompletedAt(currentGoalId, completedAt);
    else dbx.updateGoal?.(currentGoalId, { completed_at: completedAt });
    refresh();
  }, [currentGoalId, dbx, refresh]);

  const goalEditPanel = currentGoal && editMode ? (
    <div className="mt-2 flex shrink-0 items-center justify-center gap-1 rounded-lg border border-soft bg-panel/35 px-2 py-1.5" role="toolbar" aria-label="Действия с целью">
      {dbx.moveGoal && goalIndex > 0 ? (
        <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
          aria-label="Поднять цель" onClick={() => (dbx.moveGoal?.(String(currentGoal.id), 'up'), refresh())}>
          <ChevronUp className="size-4" />
        </Button>
      ) : null}
      {dbx.moveGoal && goalIndex < filteredGoals.length - 1 ? (
        <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
          aria-label="Опустить цель" onClick={() => (dbx.moveGoal?.(String(currentGoal.id), 'down'), refresh())}>
          <ChevronDown className="size-4" />
        </Button>
      ) : null}
      <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
        aria-label="Изменить цель" onClick={() => setGoalDialog({ open: true, editId: String(currentGoal.id) })}>
        <Pencil className="size-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost"
        className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)}
        aria-label="Удалить цель" disabled={!canDeleteCurrentGoal}
        title={canDeleteCurrentGoal ? 'Удалить цель' : 'Нельзя удалить последнюю цель'}
        onClick={() => { if (!canDeleteCurrentGoal) return; dbx.deleteGoal?.(String(currentGoal.id)); refresh(); }}>
        <Trash2 className="size-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
        onClick={() => setGoalDialog({ open: true, editId: null })} aria-label="Новая цель">
        <Plus className="size-4" />
      </Button>
    </div>
  ) : null;

  const canCompleteCurrentGoal = mode === 'active' && currentGoalPct >= 100;

  const goalNavPanel = currentGoal && (filteredGoals.length > 1 || mode === 'archive' || canCompleteCurrentGoal) ? (
    <div className="mt-2 flex shrink-0 flex-col gap-1.5">
      {filteredGoals.length > 1 ? (
        <div className="flex shrink-0 items-center justify-center gap-1.5">
          <button
            type="button"
            aria-label="Предыдущая цель"
            onClick={() => setGoalIndex((p) => {
              const next = (p - 1 + filteredGoals.length) % filteredGoals.length;
              setStoredGoalId(String(filteredGoals[next]?.id ?? ''));
              return next;
            })}
            className={cn(
              'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover aura-tx-colors',
              RAW_BUTTON_FOCUS_CN
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
            {filteredGoals.map((g, i) => (
              <button
                key={String(g.id)}
                type="button"
                aria-label={`Перейти к цели ${i + 1}: ${String(g.title ?? g.id)}`}
                className={cn('flex h-7 flex-1 max-w-10 items-center justify-center px-1 cursor-pointer', RAW_BUTTON_FOCUS_CN)}
                onClick={() => {
                  setGoalIndex(i);
                  setStoredGoalId(String(g.id));
                }}
              >
                <span className={cn('block h-1 w-full rounded-full bg-border aura-tx-colors', i === goalIndex && 'bg-foreground')} aria-hidden />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Следующая цель"
            onClick={() => setGoalIndex((p) => {
              const next = (p + 1) % filteredGoals.length;
              setStoredGoalId(String(filteredGoals[next]?.id ?? ''));
              return next;
            })}
            className={cn(
              'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover aura-tx-colors',
              RAW_BUTTON_FOCUS_CN
            )}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {mode === 'archive' ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
          <p className="text-muted-foreground text-xs">
            Завершено: <span className="text-foreground">{formatRuDate(currentGoal.completed_at)}</span>
          </p>
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={resumeArchivedGoal}>
            Вернуть в активные
          </Button>
        </div>
      ) : null}
      {canCompleteCurrentGoal ? (
        <div className="flex shrink-0 items-center justify-center">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={completeCurrentGoal}>
            <Check className="mr-1 size-3.5" />
            Завершить
          </Button>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <div className="aura-col min-w-0">
        <div className="hidden lg:block">
          <ModeSwitchHeader
            value={mode}
            onValueChange={setStoredMode}
            ariaLabel="Режим отображения целей"
            options={[
              { value: 'active', label: 'Активные', Icon: Target },
              { value: 'archive', label: 'Архив', Icon: Archive },
            ]}
          />
        </div>
        <div
          className={cn(MEGA_PANEL_INSET_CN, 'pt-2', ANIM.enterFade)}
        >
          {!db ? (
            <LoadingShell />
          ) : !canManage ? (
            <p className="text-muted-foreground text-sm">Панель целей недоступна в этой среде.</p>
          ) : filteredGoals.length === 0 ? (
            <EmptyState
              title="Список целей пока пуст."
              hint="Добавьте первую цель, чтобы начать трекинг этапов и задач."
              compact
            />
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              {currentGoal ? (
                <>
                  {/* Goal row */}
                  <div
                    className="aura-operator-panel relative z-20 shrink-0 overflow-hidden rounded-xl border border-soft bg-transparent"
                    style={{ '--goal-tint': currentGoalHeroTint } as React.CSSProperties}
                  >
                    <div
                      className="aura-data-fill pointer-events-none absolute inset-y-0 left-0 w-full"
                      aria-hidden
                      style={{
                        width: `${currentGoalPct}%`,
                        background: `color-mix(in oklab, ${currentGoalHeroTint} 24%, transparent)`,
                      }}
                    />
                    <div className="relative z-10 grid min-h-[3.75rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="aura-icon-plate flex size-8 shrink-0 items-center justify-center rounded-lg border"
                          style={{ '--aura-list-icon-tint': currentGoalHeroTint } as React.CSSProperties}
                          aria-hidden
                        >
                          {typeof currentGoal.icon === 'string' && currentGoal.icon ? (
                            <AuraThemedIcon name={currentGoal.icon} size={16} tint={currentGoalHeroTint} />
                          ) : isCurrentGoalTimeline ? (
                            <Clock className="size-4" style={{ color: currentGoalHeroTint }} />
                          ) : (
                            <Target className="size-4" style={{ color: currentGoalHeroTint }} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">
                            {String(currentGoal.title ?? currentGoal.id)}
                          </p>
                          <p className="mt-1 truncate text-caption font-medium text-dim">
                            {(goalDetails.get(String(currentGoal.id))?.stagesTotal ?? 0) === 1
                              ? '1 этап'
                              : `${goalDetails.get(String(currentGoal.id))?.stagesTotal ?? 0} этапов`}
                            <span className="mx-1 opacity-40">·</span>
                            {(() => {
                              if (isCurrentGoalTimeline) {
                                const secs = timelineAccumSeconds.get(String(currentGoal.id)) ?? 0;
                                const lastStage = currentStages[currentStages.length - 1];
                                const totalHours = lastStage ? Number(lastStage.threshold_hours ?? 0) : 0;
                                if (!totalHours) return formatHoursMinutes(secs);
                                return `${formatHoursMinutes(secs)} / ${totalHours}ч`;
                              }
                              const p = goalProgress.get(String(currentGoal.id));
                              if (!p || p.total === 0) return 'нет задач';
                              return p.completed === p.total ? `все ${p.total}` : `${p.completed} / ${p.total}`;
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="min-w-[2.75rem] text-right">
                          <p className="aura-operator-kpi text-sm font-semibold tabular-nums leading-none" style={{ color: currentGoalHeroTint }}>
                            {Math.round(currentGoalPct)}%
                          </p>
                          <p className="mt-1 text-nano font-medium leading-none text-faint">цель</p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant={editMode ? 'secondary' : 'ghost'}
                          className={cn(GOALS_RITUALS_ICON_BTN_CN, 'size-7')}
                          onClick={() => setEditMode((v) => !v)}
                          aria-pressed={editMode}
                          aria-label={editMode ? 'Режим просмотра' : 'Режим редактирования'}
                          title={editMode ? 'Просмотр' : 'Редактирование'}
                        >
                          {editMode ? <Eye className="size-4" /> : <Pencil className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {goalEditPanel}

                  <div
                    ref={goalsScrollRef}
                    className={cn(LIST_SCROLL_CONTAINER_CN, 'relative z-0 mt-2')}
                    onScroll={(e) => setStagesScrolled(e.currentTarget.scrollTop > 2)}
                    style={{
                      scrollPaddingTop: '0.5rem',
                      scrollPaddingBottom: '1rem',
                      WebkitMaskImage: stagesScrolled
                        ? 'linear-gradient(to bottom, transparent 0, black 2rem, black calc(100% - 2.5rem), transparent 100%)'
                        : 'linear-gradient(to bottom, black calc(100% - 2.5rem), transparent 100%)',
                      maskImage: stagesScrolled
                        ? 'linear-gradient(to bottom, transparent 0, black 2rem, black calc(100% - 2.5rem), transparent 100%)'
                        : 'linear-gradient(to bottom, black calc(100% - 2.5rem), transparent 100%)',
                    }}
                  >
                    <div className="flex flex-col gap-2 pt-1 pb-3">
                    {currentStages.map((s, i) => {
                      const sid = String(s.id);
                      const stageP = stageProgress.get(sid) ?? { completed: 0, total: 0, percent: 0 };
                      const tasks = tasksByStage.get(sid) ?? [];
                      const stageState = getStageVisualState({
                        index: i,
                        percent: stageP.percent,
                        contiguousCompletedIndex: contiguousCompletedStageIndex,
                        nextStageIndex,
                      });
                      const stageClasses = getStageStateClasses(stageState);
                      const goalTint =
                        typeof currentGoal.color === 'string' && currentGoal.color.trim()
                          ? String(currentGoal.color)
                          : 'var(--primary)';
                      const taskTint = stageState === 'frozen' ? 'var(--muted-foreground)' : goalTint;
                      const timelineStageLabel = (() => {
                        if (!isCurrentGoalTimeline) return '';
                        const threshold = Number(s.threshold_hours ?? 0);
                        if (!threshold) return 'порог не задан';
                        const previousThreshold = i > 0 ? Number(currentStages[i - 1]?.threshold_hours ?? 0) : 0;
                        const from = formatHoursMinutes(previousThreshold * 3600);
                        const to = formatHoursMinutes(threshold * 3600);
                        if (stageState === 'completed') return 'выполнено';
                        if (stageState === 'current') return `${from}–${to} · в процессе`;
                        return `${from}–${to}`;
                      })();
                      return (
                        <div
                          key={sid}
                          className={cn(
                            'aura-operator-panel overflow-hidden rounded-xl border border-soft bg-card shadow-xs',
                            !editMode && stageClasses.opacity
                          )}
                        >
                          {/* Stage header */}
                          <div className="aura-operator-header relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 overflow-hidden border-b border-soft bg-panel px-3 py-2.5">
                            <div
                              className="aura-data-fill pointer-events-none absolute inset-y-0 left-0"
                              aria-hidden
                              style={{
                                width: `${Math.max(0, Math.min(100, stageP.percent))}%`,
                                background: `color-mix(in oklab, ${taskTint} 24%, transparent)`,
                              }}
                            />
                            <div className="relative z-10 min-w-0">
                              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className={cn('aura-operator-kpi shrink-0 text-xs font-semibold tabular-nums', stageClasses.meta)}>
                                  {stageState === 'completed' ? 'Выполнено' : `Этап ${stageOrderRoman(i)}`}
                                </span>
                                <span className={cn('min-w-0 text-sm font-semibold', stageClasses.title)}>
                                  {String(s.title ?? s.id)}
                                </span>
                                {(isCurrentGoalTimeline ? timelineStageLabel : stageP.total === 0 ? '' : `${stageP.completed}/${stageP.total}`) ? (
                                  <span className={cn('aura-operator-kpi shrink-0 text-xs tabular-nums', stageClasses.meta)}>
                                    {isCurrentGoalTimeline ? timelineStageLabel : `${stageP.completed}/${stageP.total}`}
                                  </span>
                                ) : null}
                              </div>
                              {s.description ? (
                                <p className={cn('mt-1 text-xs leading-relaxed', stageClasses.title)}>
                                  {String(s.description)}
                                </p>
                              ) : null}
                            </div>
                            {editMode ? (
                              <div className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'relative z-10 shrink-0')} role="toolbar" aria-label="Действия с этапом">
                                {dbx.moveStage && i > 0 ? (
                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Поднять этап"
                                    onClick={() => (dbx.moveStage?.(sid, 'up'), refresh())}
                                  ><ChevronUp className="size-4" /></Button>
                                ) : null}
                                {dbx.moveStage && i < currentStages.length - 1 ? (
                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Опустить этап"
                                    onClick={() => (dbx.moveStage?.(sid, 'down'), refresh())}
                                  ><ChevronDown className="size-4" /></Button>
                                ) : null}
                                <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Изменить этап"
                                  onClick={() => setStageDialog({ open: true, editId: sid })}
                                ><Pencil className="size-4" /></Button>
                                <Button type="button" size="icon" variant="ghost"
                                  className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)} aria-label="Удалить этап"
                                  onClick={() => { dbx.deleteStage?.(sid); refresh(); }}
                                ><Trash2 className="size-4" /></Button>
                              </div>
                            ) : null}
                          </div>

                            {/* Task list (standard goals only) */}
                            {!isCurrentGoalTimeline && tasks.length > 0 ? (
                              <div className="divide-y divide-soft">
                                {tasks.map((t, ti) => {
                                  const tid = String(t.id);
                                  const tt = String(t.task_type ?? 'checkbox') === 'number' ? 'number' : 'checkbox';
                                  const raw = goalTaskProgressById.get(tid) ?? null;
                                  const pct = Math.round(calcTaskProgress(t, raw));
                                  const isTaskDone = pct === 100;
                                  const editDraft = editingTaskValues[tid];
                                  const trimmedUnit = String(t.unit ?? '').trim();
                                  const targetVal = Number(t.target_value ?? 0);
                                  const currentVal = Number(raw?.current_value ?? 0);
                                  const targetLabel = trimmedUnit ? `${targetVal} ${trimmedUnit}` : String(targetVal);
                                  const isScrollFocus =
                                    firstIncompleteTask != null &&
                                    firstIncompleteTask.sid === sid &&
                                    firstIncompleteTask.tid === tid;

                                  const title = String(t.title ?? t.id);
                                  const description = t.description ? String(t.description) : '';
                                  const checked = Number(raw?.completed) === 1;
                                  const moveUp = editMode && dbx.moveTask && ti > 0 ? () => (dbx.moveTask?.(tid, 'up'), refresh()) : undefined;
                                  const moveDown = editMode && dbx.moveTask && ti < tasks.length - 1 ? () => (dbx.moveTask?.(tid, 'down'), refresh()) : undefined;
                                  const actions = [
                                    moveUp ? { key: 'up', label: 'Переместить вверх', icon: <ChevronUp className="size-4" />, onClick: moveUp } : null,
                                    moveDown ? { key: 'down', label: 'Переместить вниз', icon: <ChevronDown className="size-4" />, onClick: moveDown } : null,
                                    editMode ? { key: 'edit', label: 'Изменить задачу', icon: <Pencil className="size-4" />, onClick: () => setTaskDialog({ open: true, editId: tid }) } : null,
                                    editMode ? { key: 'delete', label: 'Удалить задачу', icon: <Trash2 className="size-4" />, onClick: () => { dbx.deleteTask?.(tid); refresh(); }, danger: true } : null,
                                  ].filter((action): action is NonNullable<typeof action> => action != null);
                                  const onRowActivate = () => {
                                    if (tt === 'checkbox') {
                                      dbx.saveGoalTaskProgress?.(tid, GOALS_GLOBAL_SCOPE_DATE, { completed: checked ? 0 : 1 });
                                      refresh();
                                      return;
                                    }
                                    setEditingTaskValues((prev) => ({ ...prev, [tid]: String(currentVal) }));
                                  };

                                  return (
                                    <div
                                      key={tid}
                                      className="px-2 py-1.5 aura-tx-colors hover:bg-hover"
                                      data-goal-scroll-target={isScrollFocus ? '1' : undefined}
                                    >
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={tt === 'checkbox' ? checked : undefined}
                                        onClick={onRowActivate}
                                        onKeyDown={(event) => {
                                          if (event.key !== 'Enter' && event.key !== ' ') return;
                                          event.preventDefault();
                                          onRowActivate();
                                        }}
                                        className={cn(
                                          'aura-operator-row group relative grid min-h-11 w-full min-w-0 overflow-hidden rounded-lg border border-soft/70 bg-card/80 shadow-xs aura-tx-surface',
                                          actions.length > 0
                                            ? 'grid-cols-[minmax(0,1fr)_auto]'
                                            : 'grid-cols-[minmax(0,1fr)]',
                                          'cursor-pointer hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                          isTaskDone && 'border-soft/50 bg-panel/45'
                                        )}
                                      >
                                        {tt === 'number' && targetVal > 0 ? (
                                          <span
                                            className="aura-data-fill pointer-events-none absolute inset-y-0 left-0"
                                            aria-hidden
                                            style={{
                                              width: `${Math.max(0, Math.min(100, pct))}%`,
                                              background: `color-mix(in oklab, ${taskTint} 22%, transparent)`,
                                            }}
                                          />
                                        ) : null}
                                        <div className="relative z-10 flex min-w-0 items-center gap-2.5 px-2.5 py-2 text-left">
                                          <div className={cn('flex min-w-0 flex-1 items-baseline gap-1.5 text-sm leading-snug', checked && 'line-through text-faint')}>
                                            <span className="min-w-0 truncate font-semibold text-foreground">{title}</span>
                                            {description ? (
                                              <span className="min-w-0 shrink truncate text-xs text-subtle">{description}</span>
                                            ) : null}
                                            {tt === 'number' && targetVal > 0 ? (
                                              <span className="shrink-0 text-xs font-medium tabular-nums text-dim">{pct}%</span>
                                            ) : null}
                                          </div>
                                          <div className="flex shrink-0 items-center justify-end text-right text-xs font-semibold tabular-nums text-dim">
                                            {tt === 'checkbox' ? (
                                              <Checkbox
                                                checked={checked}
                                                onCheckedChange={(next) => {
                                                  dbx.saveGoalTaskProgress?.(tid, GOALS_GLOBAL_SCOPE_DATE, { completed: next === true ? 1 : 0 });
                                                  refresh();
                                                }}
                                                onClick={(event) => event.stopPropagation()}
                                                aria-label={title}
                                                className="size-7 rounded-lg border-soft bg-control/70 shadow-none"
                                              />
                                            ) : editDraft == null ? (
                                              <span>{`${currentVal} / ${targetLabel}`}</span>
                                            ) : (
                                              <span className="flex items-center gap-1">
                                                <Input
                                                  autoFocus
                                                  value={editDraft}
                                                  inputMode="decimal"
                                                  className="h-7 w-20 border-0 bg-control/70 px-2 text-right text-xs shadow-none focus-visible:ring-1"
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) =>
                                                    setEditingTaskValues((prev) => ({
                                                      ...prev,
                                                      [tid]: (() => {
                                                        const normalized = e.target.value.replace(',', '.');
                                                        const cleaned = normalized.replace(/[^0-9.]/g, '');
                                                        const dotIndex = cleaned.indexOf('.');
                                                        if (dotIndex === -1) return cleaned;
                                                        return `${cleaned.slice(0, dotIndex)}.${cleaned
                                                          .slice(dotIndex + 1)
                                                          .replace(/\./g, '')}`;
                                                      })(),
                                                    }))
                                                  }
                                                  onBlur={() => {
                                                    dbx.saveGoalTaskProgress?.(tid, GOALS_GLOBAL_SCOPE_DATE, {
                                                      current_value: Number(editDraft || 0),
                                                    });
                                                    setEditingTaskValues((prev) => {
                                                      const next = { ...prev };
                                                      delete next[tid];
                                                      return next;
                                                    });
                                                    refresh();
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                                                    if (e.key === 'Escape') {
                                                      setEditingTaskValues((prev) => {
                                                        const next = { ...prev };
                                                        delete next[tid];
                                                        return next;
                                                      });
                                                    }
                                                  }}
                                                />
                                                <span className="text-xs text-dim">/ {targetLabel}</span>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {actions.length > 0 ? (
                                          <div className="relative z-10 flex h-11 shrink-0 items-center gap-1 px-1.5 opacity-75 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                            {actions.map((action) => (
                                              <button
                                                key={action.key}
                                                type="button"
                                                className={cn(
                                                  'flex size-8 shrink-0 items-center justify-center rounded-lg text-dim aura-tx-interactive',
                                                  'bg-control/35 hover:bg-control hover:text-foreground active:scale-95',
                                                  action.danger && 'hover:bg-destructive/10 hover:text-destructive'
                                                )}
                                                aria-label={action.label}
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  action.onClick();
                                                }}
                                              >
                                                {action.icon}
                                              </button>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : !isCurrentGoalTimeline ? (
                              <EmptyState
                                title="Пока нет задач."
                                hint="Добавьте задачу в этот этап, чтобы отслеживать прогресс."
                                className="px-3 py-3"
                                compact
                              />
                            ) : null}

                            {editMode && !isCurrentGoalTimeline ? (
                              <div className="border-t border-soft px-3 py-2">
                                <ActComposer
                                  config={{
                                    placeholder: 'Добавить задачу',
                                    submitLabel: 'Добавить задачу',
                                    onSubmit: () => (setTaskStageId(sid), setTaskDialog({ open: true, editId: null })),
                                  }}
                                />
                              </div>
                            ) : null}
                        </div>
                      );
                    })}
                    {currentStages.length === 0 ? (
                      <EmptyState
                        title="У цели пока нет этапов."
                        hint="Добавьте этап, чтобы распределить задачи по шагам."
                        compact
                      />
                    ) : null}
                    {editMode ? (
                      <ActComposer
                        config={{
                          placeholder: 'Добавить этап',
                          submitLabel: 'Добавить этап',
                          onSubmit: () => setStageDialog({ open: true, editId: null }),
                        }}
                      />
                    ) : null}
                    </div>
                  </div>
                  {goalNavPanel}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <GoalEditDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog((s) => ({ ...s, open }))}
        title={goalDialog.editId ? 'Редактирование цели' : 'Новая цель'}
        supportsColor
        showGoalTypeFields
        showDescriptionField={false}
        pickerTasks={pickerTasks}
        initial={{
          title: String(goalInitial?.title ?? ''),
          description: '',
          icon: String(goalInitial?.icon ?? ''),
          color: String(goalInitial?.color ?? 'var(--primary)'),
          completedAt: asIsoDate(goalInitial?.completed_at),
          goalType: String(goalInitial?.goal_type ?? 'standard') === 'timeline' ? 'timeline' : 'standard',
          linkedTaskId: String(goalInitial?.linked_task_id ?? ''),
          timelineStartDate: asIsoDate(goalInitial?.timeline_start_date),
        }}
        onSubmit={(v) => {
          if (goalDialog.editId) {
            dbx.updateGoal?.(goalDialog.editId, {
              title: v.title,
              icon: v.icon,
              color: v.color,
              completed_at: v.completedAt,
              goal_type: v.goalType ?? 'standard',
              linked_task_id: v.linkedTaskId ?? null,
              timeline_start_date: v.timelineStartDate ?? null,
            });
          } else {
            dbx.addGoal?.({
              id: idOrCreate('goal'),
              title: v.title || 'Новая цель',
              icon: v.icon,
              color: v.color,
              completed_at: v.completedAt,
              goal_type: v.goalType ?? 'standard',
              linked_task_id: v.linkedTaskId ?? null,
              timeline_start_date: v.timelineStartDate ?? null,
              level: goals.length,
            });
          }
          refresh();
        }}
      />

      <GoalEditDialog
        open={stageDialog.open}
        onOpenChange={(open) => setStageDialog((s) => ({ ...s, open }))}
        title={stageDialog.editId ? 'Редактирование этапа' : 'Новый этап'}
        supportsColor={false}
        supportsIcon={false}
        showThresholdHoursField={isCurrentGoalTimeline}
        initial={{
          title: String(stageInitial?.title ?? ''),
          description: String(stageInitial?.description ?? ''),
          icon: '',
          color: '',
          completedAt: asIsoDate(stageInitial?.completed_at),
          thresholdHours: stageInitial?.threshold_hours != null ? Number(stageInitial.threshold_hours) : null,
        }}
        onSubmit={(v) => {
          if (!currentGoalId) return;
          if (stageDialog.editId) {
            dbx.updateStage?.(stageDialog.editId, {
              title: v.title,
              description: v.description,
              completed_at: v.completedAt,
              ...(isCurrentGoalTimeline ? { threshold_hours: v.thresholdHours ?? null } : {}),
            });
          } else {
            dbx.addStage?.({
              id: idOrCreate('stage'),
              goal_id: currentGoalId,
              title: v.title || 'Новый этап',
              description: v.description,
              completed_at: v.completedAt,
              order_index: currentStages.length,
              ...(isCurrentGoalTimeline ? { threshold_hours: v.thresholdHours ?? null } : {}),
            });
          }
          refresh();
        }}
      />

      <GoalTaskDialog
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((s) => ({ ...s, open }))}
        initial={{
          title: String(taskInitial?.title ?? ''),
          description: String(taskInitial?.description ?? ''),
          taskType: String(taskInitial?.task_type ?? 'checkbox') === 'number' ? 'number' : 'checkbox',
          targetValue: String(Number(taskInitial?.target_value ?? 0)),
          unit: String(taskInitial?.unit ?? ''),
        }}
        onSubmit={(v) => {
          const targetStageId = taskDialog.editId
            ? String(taskInitial?.stage_id ?? '')
            : String(taskStageId ?? '');
          if (!targetStageId) return;
          if (taskDialog.editId) {
            dbx.updateTask?.(taskDialog.editId, {
              title: v.title,
              description: v.description,
              task_type: v.taskType,
              target_value: v.taskType === 'number' ? v.targetValue : null,
              unit: v.taskType === 'number' ? v.unit : null,
            });
          } else {
            dbx.addTask?.({
              id: idOrCreate('goal_task'),
              stage_id: targetStageId,
              title: v.title || 'Новая задача',
              description: v.description,
              task_type: v.taskType,
              target_value: v.taskType === 'number' ? v.targetValue : null,
              unit: v.taskType === 'number' ? v.unit : null,
              order_index: (tasksByStage.get(targetStageId) ?? []).length,
            });
          }
          refresh();
        }}
      />
    </>
  );
}
