import { useCallback, useEffect, useRef, useState } from 'react';
import { coerceTaskColor } from '@/lib/css-color';
import { playTimerTone } from '@/features/timer/timer-sounds';
import { getIpcRenderer, sendTimerCompleted, sendTimerStateChanged, type TimerIpcState } from '@/shared/electron/ipc';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import type { AuraDatabase } from '@/types/aura';

export type TimerTaskSelection = {
  id: string;
  title: string;
  cfg_target_hours?: number;
  color?: string;
  icon?: string;
};

export type TimerModel = {
  timerType: 'timer' | 'stopwatch';
  targetDuration: number;
  elapsedTime: number;
  isRunning: boolean;
  startTime: number | null;
  selectedTask: TimerTaskSelection | null;
};

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function toIpc(m: TimerModel): TimerIpcState {
  return {
    isRunning: m.isRunning,
    elapsedTime: m.elapsedTime,
    targetDuration: m.targetDuration,
    selectedTask: m.selectedTask ? { id: m.selectedTask.id, title: m.selectedTask.title } : null,
    timerType: m.timerType,
    startTime: m.startTime,
  };
}

const defaultModel = (): TimerModel => ({
  timerType: 'timer',
  targetDuration: 25 * 60,
  elapsedTime: 0,
  isRunning: false,
  startTime: null,
  selectedTask: null,
});

/**
 * Локальное управление таймером + синхронизация с main (трей), как legacy `TimerControl`.
 */
export function useTimerSession(db: AuraDatabase | null, dateString: string, dayLocked: boolean) {
  const [model, setModel] = useState<TimerModel>(defaultModel);
  const [isHydrated, setIsHydrated] = useState(false);
  const modelRef = useRef(model);
  modelRef.current = model;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushToMain = useCallback((m: TimerModel) => {
    sendTimerStateChanged(toIpc(m));
  }, []);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const completeSession = useCallback(
    async (m: TimerModel, isNaturalCompletion: boolean): Promise<TimerModel> => {
      const task = m.selectedTask;
      const next: TimerModel = {
        ...m,
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
      };
      if (!task || !db) {
        pushToMain(next);
        return next;
      }

      if (Math.max(0, Math.floor(m.elapsedTime)) < 60) {
        console.log('[useTimerSession] Сессия меньше 60 секунд не сохраняется');
        pushToMain(next);
        return next;
      }

      try {
        const sessionId = `timer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        runAuraMutation({ type: 'timer', date: dateString, entityId: task.id }, () => {
          db.addTimerSession({
            id: sessionId,
            date: dateString,
            task_id: task.id,
            duration: m.elapsedTime,
            timer_type: m.timerType,
            target_duration: m.timerType === 'timer' ? m.targetDuration : null,
          });
        }, dateString);
        sendTimerCompleted({
          isNaturalCompletion,
          taskTitle: task.title || null,
        });
        playTimerTone(isNaturalCompletion ? 'finish' : 'cancel');
      } catch (e) {
        console.error('[useTimerSession] addTimerSession', e);
      }

      pushToMain(next);
      return next;
    },
    [dateString, db, pushToMain]
  );

  const applyFromMain = useCallback((s: Partial<TimerIpcState> & Record<string, unknown>) => {
    setModel((prev) => {
      const next = { ...prev };
      if (typeof s.isRunning === 'boolean') next.isRunning = s.isRunning;
      if (typeof s.elapsedTime === 'number') next.elapsedTime = s.elapsedTime;
      if (typeof s.targetDuration === 'number') next.targetDuration = s.targetDuration;
      if (s.timerType === 'timer' || s.timerType === 'stopwatch') next.timerType = s.timerType;
      if (s.selectedTask && typeof s.selectedTask === 'object') {
        const t = s.selectedTask as { id?: string; title?: string };
        if (t.id) {
          const id = String(t.id);
          const prevTask = prev.selectedTask;
          next.selectedTask =
            prevTask && prevTask.id === id
              ? { ...prevTask, title: String(t.title ?? prevTask.title ?? '') }
              : { id, title: String(t.title ?? '') };
        }
      }
      if (typeof s.startTime === 'number' || s.startTime === null) {
        next.startTime = (s.startTime as number) ?? null;
      }
      return next;
    });
  }, []);

  const pullMainState = useCallback(async () => {
    const ipc = getIpcRenderer();
    if (!ipc) {
      setIsHydrated(true);
      return;
    }
    try {
      const s = (await ipc.invoke('timer:get-state')) as TimerIpcState;
      applyFromMain(s);
    } catch {
      /* ignore */
    } finally {
      setIsHydrated(true);
    }
  }, [applyFromMain]);

  useEffect(() => {
    void pullMainState();
  }, [pullMainState]);

  const runTickLoop = useCallback(
    (_initial: TimerModel) => {
      clearTick();
      intervalRef.current = setInterval(() => {
        const cur = modelRef.current;
        if (!cur.isRunning || cur.startTime == null) return;
        let elapsed = Math.floor((Date.now() - cur.startTime) / 1000);
        if (cur.timerType === 'timer' && elapsed >= cur.targetDuration) {
          elapsed = cur.targetDuration;
          const finished: TimerModel = {
            ...cur,
            elapsedTime: elapsed,
            isRunning: false,
            startTime: null,
          };
          clearTick();
          void completeSession(finished, true).then(setModel);
          return;
        }
        const ticked: TimerModel = { ...cur, elapsedTime: elapsed };
        setModel(ticked);
        pushToMain(ticked);
      }, 100);
    },
    [clearTick, completeSession, pushToMain]
  );

  /** Если состояние из main уже «идёт», поднимаем тик (после pull / перезапуска окна). */
  useEffect(() => {
    if (!model.isRunning || model.startTime == null) return;
    if (intervalRef.current) return;
    runTickLoop(modelRef.current);
  }, [model.isRunning, model.startTime, runTickLoop]);

  useEffect(() => {
    const ipc = getIpcRenderer();
    if (!ipc) return;

    const onPause = () => {
      const cur = modelRef.current;
      if (!cur.isRunning) return;
      clearTick();
      const next: TimerModel = { ...cur, isRunning: false, startTime: null };
      setModel(next);
      pushToMain(next);
      playTimerTone('pause');
    };

    const onResume = () => {
      if (dayLocked) return;
      const cur = modelRef.current;
      if (cur.isRunning || cur.elapsedTime <= 0 || !cur.selectedTask) return;
      const next: TimerModel = {
        ...cur,
        isRunning: true,
        startTime: Date.now() - cur.elapsedTime * 1000,
      };
      setModel(next);
      pushToMain(next);
      runTickLoop(next);
      playTimerTone('resume');
    };

    const onStop = () => {
      const cur = modelRef.current;
      if (!cur.isRunning && cur.elapsedTime <= 0) return;
      clearTick();
      const stopping: TimerModel = { ...cur, isRunning: false, startTime: null };
      void completeSession(stopping, false).then((next) => setModel(next));
    };

    const onSync = () => {
      void pullMainState();
    };

    ipc.on('timer:pause', onPause);
    ipc.on('timer:resume', onResume);
    ipc.on('timer:stop', onStop);
    ipc.on('timer:sync-state', onSync);

    return () => {
      ipc.removeListener('timer:pause', onPause);
      ipc.removeListener('timer:resume', onResume);
      ipc.removeListener('timer:stop', onStop);
      ipc.removeListener('timer:sync-state', onSync);
      clearTick();
    };
  }, [clearTick, completeSession, dayLocked, pullMainState, pushToMain, runTickLoop]);

  useEffect(() => () => clearTick(), [clearTick]);

  const start = useCallback(() => {
    if (dayLocked) return;
    const cur = modelRef.current;
    if (cur.isRunning || !cur.selectedTask) return;
    if (cur.timerType === 'timer' && cur.targetDuration <= 0) return;
    const next: TimerModel = {
      ...cur,
      isRunning: true,
      startTime: Date.now() - cur.elapsedTime * 1000,
    };
    setModel(next);
    pushToMain(next);
    runTickLoop(next);
    playTimerTone(cur.elapsedTime > 0 ? 'resume' : 'start');
  }, [dayLocked, pushToMain, runTickLoop]);

  const pause = useCallback(() => {
    const cur = modelRef.current;
    if (!cur.isRunning) return;
    clearTick();
    const next: TimerModel = { ...cur, isRunning: false, startTime: null };
    setModel(next);
    pushToMain(next);
    playTimerTone('pause');
  }, [clearTick, pushToMain]);

  const stopAndSave = useCallback(() => {
    const cur = modelRef.current;
    if (!cur.isRunning && cur.elapsedTime <= 0) return;
    clearTick();
    const stopping: TimerModel = { ...cur, isRunning: false, startTime: null };
    void completeSession(stopping, false).then((next) => setModel(next));
  }, [clearTick, completeSession]);

  const reset = useCallback(() => {
    clearTick();
    const cur = modelRef.current;
    const next: TimerModel = {
      ...cur,
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
    };
    setModel(next);
    pushToMain(next);
  }, [clearTick, pushToMain]);

  const setTimerTypeSafe = useCallback(
    (mode: 'timer' | 'stopwatch') => {
      const cur = modelRef.current;
      if (cur.isRunning) return;
      clearTick();
      let target = cur.targetDuration;
      if (mode === 'timer' && cur.selectedTask?.cfg_target_hours) {
        target = Math.floor(Number(cur.selectedTask.cfg_target_hours) * 3600);
      } else if (mode === 'timer') {
        target = 25 * 60;
      }
      const next: TimerModel = {
        ...cur,
        timerType: mode,
        elapsedTime: 0,
        startTime: null,
        isRunning: false,
        targetDuration: target,
      };
      setModel(next);
      pushToMain(next);
    },
    [clearTick, pushToMain]
  );

  const setTargetDurationSafe = useCallback(
    (seconds: number) => {
      if (modelRef.current.isRunning || dayLocked) return;
      const v = Math.max(60, Math.floor(seconds));
      setModel((m) => {
        const next = { ...m, targetDuration: v };
        pushToMain(next);
        return next;
      });
    },
    [dayLocked, pushToMain]
  );

  const selectTask = useCallback(
    (task: TimerTaskSelection | null) => {
      if (modelRef.current.isRunning) return;
      clearTick();
      setModel((cur) => {
        let target = cur.targetDuration;
        if (cur.timerType === 'timer' && task?.cfg_target_hours) {
          target = Math.floor(Number(task.cfg_target_hours) * 3600);
        } else if (cur.timerType === 'timer') {
          target = 25 * 60;
        }
        const normalizedTask: TimerTaskSelection | null = task
          ? {
              id: task.id,
              title: task.title,
              cfg_target_hours: task.cfg_target_hours,
              color: coerceTaskColor(task.color as unknown),
              icon:
                typeof task.icon === 'string'
                  ? task.icon
                  : task.icon != null && String(task.icon).trim()
                    ? String(task.icon)
                    : undefined,
            }
          : null;

        const next: TimerModel = {
          ...cur,
          selectedTask: normalizedTask,
          elapsedTime: 0,
          startTime: null,
          isRunning: false,
          targetDuration: target,
        };
        pushToMain(next);
        return next;
      });
    },
    [clearTick, pushToMain]
  );

  const displayTime =
    model.timerType === 'stopwatch'
      ? formatClock(model.elapsedTime)
      : formatClock(Math.max(0, model.targetDuration - model.elapsedTime));

  return {
    model,
    isHydrated,
    displayTime,
    setTimerType: setTimerTypeSafe,
    setTargetDuration: setTargetDurationSafe,
    selectTask,
    start,
    pause,
    stopAndSave,
    reset,
    pullMainState,
  };
}
