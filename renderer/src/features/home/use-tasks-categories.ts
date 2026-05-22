import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useHomeDaySnapshot } from '@/shared/hooks/use-home-day-snapshot';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { getHomeTaskDisplaySettings } from '@/shared/config/home-task-display';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { TASK_CATEGORY_DEFAULT_META, TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import type { AuraRow, AuraTaskProgress } from '@/types/aura';

type CategoryId = TaskCategoryId;

const DEFAULT_LABELS: Record<CategoryId, string> = {
  rituals: TASK_CATEGORY_DEFAULT_META.rituals.title,
  time:    TASK_CATEGORY_DEFAULT_META.time.title,
  body:    TASK_CATEGORY_DEFAULT_META.body.title,
  deps:    TASK_CATEGORY_DEFAULT_META.deps.title,
};

function tasksForCategory(allTasks: AuraRow[], catId: string): AuraRow[] {
  return allTasks
    .filter((t) => String(t.category_type) === catId && t.id)
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
}

export function useTasksCategories(dateString: string) {
  const { db } = useAuraDb();
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const { data: daySnapshot } = useHomeDaySnapshot(dateString);

  const [showPercentBadges, setShowPercentBadges] = useState(true);
  const [optimisticProgressById, setOptimisticProgressById] = useState<Record<string, AuraTaskProgress>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const numberSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Reset drafts on date change
  useEffect(() => { setNumberDrafts({}); }, [dateString]);
  // Reset optimistic on date change
  useEffect(() => { setOptimisticProgressById({}); }, [dateString]);

  // Drop optimistic entries only once the snapshot has confirmed the same value.
  // Using taskProgressById reference as trigger instead of daySnapshot (stable after snapshot rebuild).
  // Guard: return same reference if already empty — avoids extra re-renders on every snapshot refresh.
  useEffect(() => {
    const snapshotProgress = daySnapshot?.taskProgressById;
    if (!snapshotProgress) return;
    setOptimisticProgressById((prev) => {
      if (Object.keys(prev).length === 0) return prev; // fast path: nothing to clear
      const next: Record<string, AuraTaskProgress> = {};
      let anyDropped = false;
      for (const [id, optimistic] of Object.entries(prev)) {
        const snap = snapshotProgress[id];
        // Keep the optimistic entry until the snapshot reflects the same completion state.
        // This prevents a brief flash back to the old state if the snapshot briefly lags.
        if (snap != null && Number(snap.completed) === Number(optimistic.completed)) {
          anyDropped = true; // snapshot confirmed — drop this entry
        } else {
          next[id] = optimistic;
        }
      }
      return anyDropped ? next : prev;
    });
  }, [daySnapshot?.taskProgressById]);
  useEffect(() => {
    const timers = numberSaveTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  // Display settings
  useEffect(() => {
    if (!db) return;
    const reload = () => {
      setShowPercentBadges(getHomeTaskDisplaySettings(db.getAppSettings() as AuraRow | null).showPercentBadges);
    };
    reload();
    window.addEventListener('settings-saved', reload);
    return () => window.removeEventListener('settings-saved', reload);
  }, [db]);

  const nutritionTotals = daySnapshot?.nutritionTotals ?? { calories: 0, proteins: 0, fats: 0, carbs: 0 };
  const nutritionTargets = daySnapshot?.nutritionTargets ?? { calories: 0, proteins: 0, fats: 0, carbs: 0 };

  const nutritionProgressPct = useMemo(() => {
    const target = Number(nutritionTargets.calories) || 0;
    if (target <= 0) return nutritionTotals.calories > 0 ? 100 : 0;
    return Math.min(100, Math.round((nutritionTotals.calories / target) * 100));
  }, [nutritionTargets.calories, nutritionTotals.calories]);

  const allCfgTasks = useMemo(() => {
    if (daySnapshot?.cfgTasks) return daySnapshot.cfgTasks;
    return db ? db.getAll('cfg_tasks') : ([] as AuraRow[]);
  }, [daySnapshot?.cfgTasks, db]);

  const categoryUi = useMemo(() => {
    const cfg = loadTaskCategoryConfig(db);
    return Object.fromEntries(
      TASK_CATEGORY_IDS.map((id) => [id, {
        label: cfg[id].title || DEFAULT_LABELS[id],
        icon: cfg[id].icon || (id === 'rituals' ? 'sparkles' : id === 'time' ? 'timer' : id === 'body' ? 'activity' : 'ban'),
      }])
    ) as Record<CategoryId, { label: string; icon: string }>;
  }, [db]);

  const tasksByCat = useMemo(() => {
    if (!db) return {} as Record<string, AuraRow[]>;
    return Object.fromEntries(
      TASK_CATEGORY_IDS.map((c) => [c, tasksForCategory(allCfgTasks, c)])
    ) as Record<CategoryId, AuraRow[]>;
  }, [allCfgTasks, db]);

  const values = useMemo(
    () => (daySnapshot ? daySnapshot.categoryProgresses : {}) as Record<string, number>,
    [daySnapshot],
  );

  const taskProgressById = useMemo(() => {
    const map = new Map<string, AuraTaskProgress | null>();
    if (daySnapshot?.taskProgressById) {
      for (const [id, raw] of Object.entries(daySnapshot.taskProgressById))
        map.set(id, (raw as AuraTaskProgress | null) ?? null);
      return map;
    }
    if (!db) return map;
    for (const tasks of Object.values(tasksByCat)) {
      for (const task of tasks) {
        const id = String(task.id ?? '');
        if (!id) continue;
        try { map.set(id, db.getTaskProgress(id, dateString)); }
        catch { map.set(id, null); }
      }
    }
    return map;
  }, [db, dateString, daySnapshot?.taskProgressById, tasksByCat]);

  const effectiveTaskProgressById = useMemo(() => {
    const merged = new Map(taskProgressById);
    for (const [id, value] of Object.entries(optimisticProgressById)) merged.set(id, value);
    return merged;
  }, [taskProgressById, optimisticProgressById]);

  const timerTotalsByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    if (daySnapshot?.timerTotalsByTaskId) {
      for (const [id, total] of Object.entries(daySnapshot.timerTotalsByTaskId))
        map.set(id, Number(total) || 0);
      return map;
    }
    if (!db) return map;
    for (const tasks of Object.values(tasksByCat)) {
      for (const task of tasks) {
        if (String(task.task_type ?? '') !== 'timer') continue;
        const id = String(task.id ?? '');
        if (!id) continue;
        try { map.set(id, db.getTaskTimerTotal(dateString, id) || 0); }
        catch { map.set(id, 0); }
      }
    }
    return map;
  }, [db, dateString, daySnapshot?.timerTotalsByTaskId, tasksByCat]);

  const ritualCountsByType = useMemo(() => {
    const out = new Map<string, { completed: number; total: number }>();
    if (daySnapshot?.ritualCountsByType)
      for (const [type, counts] of Object.entries(daySnapshot.ritualCountsByType))
        out.set(type, counts);
    return out;
  }, [daySnapshot?.ritualCountsByType]);

  const persist = (taskId: string, data: Record<string, unknown>) => {
    setSaveError(null);
    if (!db) return;
    try {
      setOptimisticProgressById((prev) => {
        const fallback = (effectiveTaskProgressById.get(taskId) ?? {
          value: null, completed: 0, current_value: null,
          selected_list_item: null, completion_percent: 0,
        }) as AuraTaskProgress;
        const next: AuraTaskProgress = { ...prev[taskId] ?? fallback, ...data };
        if (data.completed !== undefined)
          next.completion_percent = Number(next.completed) === 1 ? 100 : 0;
        return { ...prev, [taskId]: next };
      });
      runAuraMutation('task-progress', () => db.saveTaskProgress(taskId, dateString, data), dateString);
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

  return {
    db, dayLocked,
    showPercentBadges, saveError,
    tasksByCat, categoryUi, values,
    effectiveTaskProgressById, timerTotalsByTaskId, ritualCountsByType,
    nutritionTotals, nutritionTargets, nutritionProgressPct,
    numberDrafts, setNumberDrafts,
    persist, scheduleNumberPersist,
  };
}
