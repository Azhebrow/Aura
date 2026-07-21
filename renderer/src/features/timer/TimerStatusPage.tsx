// ─── TimerStatusPage ──────────────────────────────────────────────────────────
// Страница таймера: три панели (задачи, таймер, сессии) + редактирование.
// Вспомогательные утилиты — в timer-utils.ts.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Clock, ListTodo, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useTimerSession } from '@/features/timer/use-timer-session';
import { useTimerTasksAll, type TimerTaskTab } from '@/features/timer/use-timer-tasks';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { getIpcRenderer } from '@/shared/bridge/ipc';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { TimerSessionHero, type TimerShareSegment } from '@/features/timer/TimerSessionHero';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { cn } from '@/lib/utils';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { TimerFullscreenDialog } from '@/features/timer/TimerFullscreenDialog';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import {
  ActField,
  ActFormTable,
  ActModal,
  ActModalFooter,
  ActTableBox,
} from '@/features/act/ActModal';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_PANEL_INSET_CN,
  MEGA_PANEL_MICRO_TITLE_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { getCategoryColor } from '@/shared/config/task-categories-settings';
import { buildTimerTaskGroupById, getSessionGroup } from '@/features/timer/timer-session-groups';
import { MobileSectionTabs } from '@/shared/ui/mobile';
import { LoadingShell } from '@/shared/ui/data-states';
import { ProgressFillRow } from '@/shared/ui/progress-fill-row';
import { ANIM } from '@/shared/lib/animation-classes';
import { getNavigationIntent } from '@/shared/lib/navigation-intent';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import type { AuraRow } from '@/types/aura';

import { loadPickerTasks, newSessionId, sameSessions, timerTaskDailyProgressPct } from './timer-utils';
import { ActComposerValueField, ActList, ActSelectOptionLabel, type ActItem } from '@/features/act-system';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_MINUTES = [5, 15, 25, 45, 60, 120];

function readTimerTaskIntentId(): string | null {
  const detail = getNavigationIntent(STORAGE_KEYS.TIMER_TASK_ID);
  const taskId = detail?.taskId;
  if (typeof taskId !== 'string' && typeof taskId !== 'number') return null;
  const normalized = String(taskId).trim();
  return normalized ? normalized : null;
}

/** CSS-переменные цвета каждой группы задач — статичны, не зависят от БД. */
const GROUP_ACCENT_BY_KEY: Record<TimerTaskTab, string> = {
  tasks:   'var(--task-time)',
  escape:  'var(--leisure-escape)',
  filling: 'var(--leisure-filling)',
};

/** Заголовки групп задач в левой панели */
const TIMER_TASK_GROUPS: readonly { key: TimerTaskTab; title: string }[] = [
  { key: 'tasks',   title: 'Фокус'       },
  { key: 'escape',  title: 'Эскапизм'    },
  { key: 'filling', title: 'Наполнение'  },
];
const TIMER_TASK_GROUP_ICON: Record<TimerTaskTab, string> = {
  tasks: 'timer',
  escape: 'gamepad-2',
  filling: 'sparkles',
};

const TIMER_PICKER_GROUP_COLOR: Record<string, string> = {
  'Фокус': 'var(--task-time)',
  'Эскапизм': 'var(--leisure-escape)',
  'Наполнение': 'var(--leisure-filling)',
};

function formatTimerTaskHours(hours: number): string {
  const safe = Math.max(0, Number(hours) || 0);
  if (safe <= 0) return '0ч';
  if (safe < 1) return `${Math.round(safe * 60)}м`;
  const rounded = Math.round(safe * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}ч`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimerStatusPage() {
  const { t } = useTranslation('common');
  const { dateString }  = useSelectedDate();
  const { db }          = useAuraDb();
  const dataTick        = useAuraDataRefresh({ types: ['timer'] });
  const dayLocked       = useDayLocked(db, Boolean(db), dateString);
  const timer           = useTimerSession(db, dateString, dayLocked);
  const { byGroup, reload: reloadTasks } = useTimerTasksAll(db, dateString, dataTick);
  const ipc             = useMemo(() => getIpcRenderer(), []);

  // ─── Sessions state ────────────────────────────────────────────────────────

  const [sessions, setSessions] = useState<AuraRow[]>([]);

  const refreshSessions = useCallback(() => {
    if (!db) { setSessions([]); return; }
    const next = db.getTimerSessions(dateString);
    setSessions((prev) => (sameSessions(prev, next) ? prev : next));
  }, [db, dateString]);

  useEffect(() => {
    if (!db) { setSessions([]); return; }
    refreshSessions();
  }, [dataTick, db, dateString, refreshSessions]);

  // ─── Task picker data ─────────────────────────────────────────────────────

  const pickerTasks = useMemo(() => (db ? loadPickerTasks(db) : []), [db]);

  useEffect(() => {
    if (!pickerTasks.length) {
      setComposerTaskId('');
      return;
    }
    setComposerTaskId((prev) => (prev && pickerTasks.some((task) => task.id === prev) ? prev : pickerTasks[0].id));
  }, [pickerTasks]);

  const taskMetaById = useMemo(() => {
    const m = new Map<string, { title: string; icon?: string; color?: string }>();
    for (const t of pickerTasks) m.set(t.id, { title: t.title, icon: t.icon, color: t.color });
    return m;
  }, [pickerTasks]);

  // ─── Dialog state ─────────────────────────────────────────────────────────

  const [formError, setFormError]                 = useState<string | null>(null);
  const [composerEditingSessionId, setComposerEditingSessionId] = useState<string | null>(null);
  const [composerTaskId, setComposerTaskId]       = useState('');
  const [composerMinutes, setComposerMinutes]     = useState('25');

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [fullscreenOpen, setFullscreenOpen]           = useState(false);
  const [sessionHeroExpanded, setSessionHeroExpanded] = useState(true);
  const [mobileSection, setMobileSection]             = useState<'tasks' | 'timer' | 'sessions'>('timer');
  const [pendingIntentTaskId, setPendingIntentTaskId] = useState<string | null>(() => readTimerTaskIntentId());

  const wasRunningRef = useRef(timer.model.isRunning);
  const timerHydrating = !!ipc && !timer.isHydrated;

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  const openEditSession = (row: AuraRow) => {
    setComposerEditingSessionId(String(row.id));
    setComposerTaskId(String(row.task_id ?? ''));
    const sec = Number(row.duration) || 0;
    setComposerMinutes(String(Math.max(1, Math.round(sec / 60))));
    timer.setTimerType(String(row.timer_type ?? 'timer') === 'stopwatch' ? 'stopwatch' : 'timer');
    setFormError(null);
  };

  const saveComposerSession = () => {
    setFormError(null);
    if (!db || dayLocked) return;
    const minutes = parseInt(composerMinutes, 10);
    if (!Number.isFinite(minutes) || minutes < 1) {
      setFormError('Укажите длительность в минутах (≥ 1).');
      return;
    }
    if (!composerTaskId) {
      setFormError('Выберите задачу.');
      return;
    }
    const durationSec = minutes * 60;
    try {
      runAuraMutation('timer', () => {
        const payload = {
          task_id: composerTaskId,
          duration: durationSec,
          timer_type: timer.model.timerType,
          target_duration: timer.model.timerType === 'timer' ? durationSec : null,
        };
        if (composerEditingSessionId) db.updateTimerSession(composerEditingSessionId, payload);
        else {
          db.addTimerSession({
            id: newSessionId(),
            date: dateString,
            ...payload,
          });
        }
      });
      setComposerEditingSessionId(null);
      refreshSessions();
      reloadTasks();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteSession = (row: AuraRow) => {
    if (!db || dayLocked) return;
    const id = String(row.id);
    try {
      runAuraMutation('timer', () => db.deleteTimerSession(id));
      if (composerEditingSessionId === id) setComposerEditingSessionId(null);
      refreshSessions();
      reloadTasks();
    } catch { /* ignore */ }
  };

  // ─── Accent & colors ──────────────────────────────────────────────────────

  /**
   * Возвращает цвет акцента для задачи.
   * Фокус — всегда цвет категории. Досуг — цвет задачи, fallback на группу.
   */
  const getTaskColor = useCallback((group: TimerTaskTab, taskColor?: string): string => {
    if (group === 'tasks') return getCategoryColor('time', db);
    if (taskColor?.trim()) return taskColor;
    return GROUP_ACCENT_BY_KEY[group] ?? 'var(--primary)';
  }, [db]);

  const selectedTaskGroup = useMemo<TimerTaskTab>(() => {
    const sel = timer.model.selectedTask;
    if (!sel) return 'tasks';
    for (const group of ['tasks', 'escape', 'filling'] as const) {
      if (byGroup[group].some((t) => t.id === sel.id)) return group;
    }
    return 'tasks';
  }, [timer.model.selectedTask, byGroup]);

  const sel    = timer.model.selectedTask;
  const accent = sel?.color ? getTaskColor(selectedTaskGroup, sel.color) : 'var(--primary)';

  // ─── Task selection logic ─────────────────────────────────────────────────

  const selectTimerTaskById = useCallback((taskId: string) => {
    const id = String(taskId || '');
    if (!id || dayLocked || timer.model.isRunning || !timer.isHydrated) return false;
    for (const group of ['tasks', 'escape', 'filling'] as const) {
      const task = byGroup[group].find((item) => item.id === id);
      if (!task) continue;
      timer.selectTask({
        id: task.id, title: task.title, cfg_target_hours: task.cfg_target_hours,
        color: getTaskColor(group, task.color), icon: task.icon,
      });
      setMobileSection('timer');
      setPendingIntentTaskId(null);
      try { localStorage.removeItem(STORAGE_KEYS.TIMER_TASK_ID); } catch { /* ignore */ }
      return true;
    }
    return false;
  }, [byGroup, dayLocked, getTaskColor, timer.isHydrated, timer.model.isRunning, timer.selectTask]);

  // Обработка navigation intent (приход со страницы главной)
  useEffect(() => {
    const applyIntent = (detail: unknown) => {
      if (!detail || typeof detail !== 'object') return;
      const taskId = (detail as { taskId?: unknown }).taskId;
      if (typeof taskId !== 'string' && typeof taskId !== 'number') return;
      setPendingIntentTaskId(String(taskId));
    };

    const initialTaskId = readTimerTaskIntentId();
    if (initialTaskId) setPendingIntentTaskId(initialTaskId);
    const onIntent = (event: Event) => applyIntent((event as CustomEvent).detail);
    window.addEventListener(STORAGE_KEYS.TIMER_TASK_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(STORAGE_KEYS.TIMER_TASK_INTENT_EVENT, onIntent);
  }, []);

  // Применяем отложенный intent как только задачи загружены
  useEffect(() => {
    if (!pendingIntentTaskId) return;
    selectTimerTaskById(pendingIntentTaskId);
  }, [pendingIntentTaskId, selectTimerTaskById]);

  // Синхронизируем мета-данные выбранной задачи при изменении списка задач
  useEffect(() => {
    const selected = timer.model.selectedTask;
    if (!selected) return;

    // Пока задачи не загружены (byGroup пустой) — ничего не делаем.
    // Иначе found = null → selectTask(null) сбросил бы задачу из IPC до загрузки БД.
    const allEmpty =
      byGroup.tasks.length === 0 &&
      byGroup.escape.length === 0 &&
      byGroup.filling.length === 0;
    if (allEmpty) return;

    let found: { task: (typeof byGroup)['tasks'][0]; group: typeof selectedTaskGroup } | null = null;
    for (const group of ['tasks', 'escape', 'filling'] as const) {
      const task = byGroup[group].find((t) => t.id === selected.id);
      if (task) { found = { task, group }; break; }
    }
    // Задача удалена из конфига — сбрасываем
    if (!found) { timer.selectTask(null); return; }

    // Обновляем мета если её нет (selectedTask из IPC содержит только id+title)
    const hasMeta = (typeof selected.icon === 'string' && selected.icon.trim())
      || (typeof selected.color === 'string' && selected.color.trim())
      || (typeof selected.cfg_target_hours === 'number');
    if (hasMeta) return;
    timer.selectTask({
      id: found.task.id, title: found.task.title, cfg_target_hours: found.task.cfg_target_hours,
      color: getTaskColor(found.group, found.task.color), icon: found.task.icon,
    });
  }, [byGroup, getTaskColor, selectedTaskGroup, timer.model.selectedTask, timer.selectTask]);

  // Автовыбор первой задачи если ничего не выбрано
  useEffect(() => {
    if (pendingIntentTaskId || timer.model.selectedTask) return;
    for (const group of ['tasks', 'escape', 'filling'] as const) {
      const first = byGroup[group][0];
      if (first) {
        timer.selectTask({
          id: first.id, title: first.title, cfg_target_hours: first.cfg_target_hours,
          color: getTaskColor(group, first.color), icon: first.icon,
        });
        return;
      }
    }
  }, [byGroup, getTaskColor, pendingIntentTaskId, timer.model.selectedTask, timer.selectTask]);

  // ─── Progress state ───────────────────────────────────────────────────────

  const totalTimerTasks = TIMER_TASK_GROUPS.reduce((n, g) => n + byGroup[g.key].length, 0);

  const rawDailyProgressByTaskId = useMemo(() => {
    const out = new Map<string, number>();
    for (const group of TIMER_TASK_GROUPS) {
      for (const task of byGroup[group.key]) out.set(task.id, timerTaskDailyProgressPct(task));
    }
    return out;
  }, [byGroup]);

  const [visibleDailyProgressByTaskId, setVisibleDailyProgressByTaskId] = useState(() => new Map<string, number>());

  // Мгновенный сброс прогресса при смене даты, плавное обновление через RAF
  useLayoutEffect(() => {
    if (!db) { setVisibleDailyProgressByTaskId(new Map()); return; }
    setVisibleDailyProgressByTaskId(new Map(rawDailyProgressByTaskId));
  }, [dateString, rawDailyProgressByTaskId, db]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setVisibleDailyProgressByTaskId(new Map(rawDailyProgressByTaskId)));
    return () => window.cancelAnimationFrame(id);
  }, [dateString, rawDailyProgressByTaskId]);

  // ─── Session share bar data ────────────────────────────────────────────────

  const sessionTaskGroupById = useMemo(() => buildTimerTaskGroupById(db), [db]);

  const timerShare = useMemo(() => {
    let focusSec = 0, escapeSec = 0, fillingSec = 0;
    for (const session of sessions) {
      const duration = Math.max(0, Number(session.duration) || 0);
      const group    = getSessionGroup(session, sessionTaskGroupById);
      if (group === 'tasks')   focusSec   += duration;
      else if (group === 'escape')  escapeSec  += duration;
      else if (group === 'filling') fillingSec += duration;
    }
    const totalSec = focusSec + escapeSec + fillingSec;
    return {
      focusSec, escapeSec, fillingSec, totalSec,
      focusPct:    totalSec > 0 ? (focusSec   / totalSec) * 100 : 0,
      escapePct:   totalSec > 0 ? (escapeSec  / totalSec) * 100 : 0,
      fillingPct:  totalSec > 0 ? (fillingSec / totalSec) * 100 : 0,
    };
  }, [sessionTaskGroupById, sessions]);
  const timerShareSegments = useMemo<TimerShareSegment[]>(() => {
    const taskBuckets: Record<TimerTaskTab, Map<string, { id: string; title: string; icon?: string | null; seconds: number }>> = {
      tasks: new Map(),
      escape: new Map(),
      filling: new Map(),
    };
    for (const session of sessions) {
      const duration = Math.max(0, Number(session.duration) || 0);
      if (duration <= 0) continue;
      const group = getSessionGroup(session, sessionTaskGroupById);
      if (group !== 'tasks' && group !== 'escape' && group !== 'filling') continue;
      const taskId = String(session.task_id ?? '');
      const meta = taskMetaById.get(taskId);
      const current = taskBuckets[group].get(taskId) ?? {
        id: taskId || `unknown_${group}`,
        title: meta?.title ?? (taskId || 'Без задачи'),
        icon: meta?.icon ?? null,
        seconds: 0,
      };
      current.seconds += duration;
      taskBuckets[group].set(taskId, current);
    }
    const tasksFor = (group: TimerTaskTab) => [...taskBuckets[group].values()].sort((a, b) => b.seconds - a.seconds);
    return [
      { key: 'tasks', label: 'Фокус', icon: TIMER_TASK_GROUP_ICON.tasks, seconds: timerShare.focusSec, pct: timerShare.focusPct, color: GROUP_ACCENT_BY_KEY.tasks, tasks: tasksFor('tasks') },
      { key: 'escape', label: 'Эскапизм', icon: TIMER_TASK_GROUP_ICON.escape, seconds: timerShare.escapeSec, pct: timerShare.escapePct, color: GROUP_ACCENT_BY_KEY.escape, tasks: tasksFor('escape') },
      { key: 'filling', label: 'Наполнение', icon: TIMER_TASK_GROUP_ICON.filling, seconds: timerShare.fillingSec, pct: timerShare.fillingPct, color: GROUP_ACCENT_BY_KEY.filling, tasks: tasksFor('filling') },
    ];
  }, [sessionTaskGroupById, sessions, taskMetaById, timerShare]);
  const sessionItems = useMemo<ActItem[]>(() => sessions.map((session) => {
    const tid = String(session.task_id ?? '');
    const meta = taskMetaById.get(tid);
    const label = meta?.title ?? tid;
    const mins = Math.floor(Number(session.duration) / 60);
    const sessionGroup = getSessionGroup(session, sessionTaskGroupById);
    const rowTint = sessionGroup === 'tasks' || sessionGroup === 'escape' || sessionGroup === 'filling'
      ? (GROUP_ACCENT_BY_KEY[sessionGroup] ?? 'var(--primary)')
      : 'var(--primary)';
    const isStopwatch = String(session.timer_type ?? '') === 'stopwatch';
    return {
      id: String(session.id),
      kind: 'timer-session',
      icon: meta?.icon != null ? String(meta.icon) : null,
      iconTint: rowTint,
      title: label,
      value: `${mins} мин`,
      description: isStopwatch ? 'секундомер' : 'таймер',
      disabled: dayLocked,
      onEdit: () => { if (!dayLocked) openEditSession(session); },
      onDelete: () => { if (!dayLocked) deleteSession(session); },
    };
  }), [dayLocked, sessionTaskGroupById, sessions, taskMetaById]);

  // ─── Timer hero expand/collapse ───────────────────────────────────────────

  const isTimerSessionActive  = timer.model.isRunning || timer.model.elapsedTime > 0;
  const sessionPct            = timer.model.timerType === 'timer' && timer.model.targetDuration > 0
    ? Math.min(100, (timer.model.elapsedTime / timer.model.targetDuration) * 100)
    : 0;
  const durationInputMinutes  = Math.max(1, Math.round(timer.model.targetDuration / 60));

  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    const nowRunning = timer.model.isRunning;
    if (!wasRunning && nowRunning) setSessionHeroExpanded(true);
    setFullscreenOpen(isTimerSessionActive);
    wasRunningRef.current = nowRunning;
  }, [isTimerSessionActive, timer.model.isRunning]);

  useEffect(() => { setSessionHeroExpanded(true); }, [dateString]);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (timerHydrating) {
    return (
      <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
        <Card className={MEGA_SHELL_CARD_CN}>
          <CardContent className={cn(MEGA_SHELL_CONTENT_CN, 'items-center justify-center aura-content-fade-in')}>
            <p className="text-muted-foreground text-sm">Восстанавливаем состояние таймера…</p>
          </CardContent>
        </Card>
      </PageFrame>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-soft overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,1.48fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">

            {/* Баннер локального режима */}
            {!ipc ? (
              <div className="col-span-full border-b border-soft bg-control px-3 py-2 text-xs text-dim">
                Локальный режим: таймер и задачи работают без Electron, но без трея и фоновой синхронизации.
              </div>
            ) : null}

            {/* ── Левая панель: задачи ─────────────────────────────────────── */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col', mobileSection === 'tasks' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <MegaPanelHeader title={t('field.task')} locked={dayLocked} />
              <div className={cn(MEGA_PANEL_BODY_CN, 'relative flex flex-col overflow-hidden')}>
                {dayLocked ? <div className="absolute inset-0 z-20 bg-background/30 backdrop-blur-[1px]" aria-hidden /> : null}

                {!db ? (
                  <LoadingShell />
                ) : totalTimerTasks === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет таймер-задач в CFG.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {TIMER_TASK_GROUPS.map(({ key, title }) => (
                      <div key={key} className="flex flex-col gap-2.5">
                        {/* Разделитель группы */}
                        <div className="flex items-center gap-3">
                          <div className="h-px min-w-0 flex-1 bg-soft" aria-hidden />
                          <p className={cn(MEGA_PANEL_MICRO_TITLE_CN, 'shrink-0')}>{title}</p>
                          <div className="h-px min-w-0 flex-1 bg-soft" aria-hidden />
                        </div>

                        {byGroup[key].length === 0 ? (
                          <EmptyState title={t('hint.no_tasks')} hint={t('hint.add_task_settings')} className="mx-auto w-full max-w-sm" compact />
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {byGroup[key].map((task) => {
                              const selected    = timer.model.selectedTask?.id === task.id;
                              const targetH     = task.cfg_target_hours ?? 0;
                              const curH        = task.currentSeconds / 3600;
                              const rowAccent   = getTaskColor(key, task.color);
                              const dailyPct    = visibleDailyProgressByTaskId.get(task.id) ?? 0;
                              const hasTarget   = targetH > 0;
                              const amount      = `${formatTimerTaskHours(curH)} / ${hasTarget ? formatTimerTaskHours(targetH) : '—'}`;
                              return (
                                <li
                                  key={task.id}
                                  className={cn(
                                    'aura-operator-row aura-tx-colors cursor-pointer rounded-lg',
                                    dayLocked && 'pointer-events-none opacity-55'
                                  )}
                                  role="button"
                                  tabIndex={dayLocked ? -1 : 0}
                                  aria-disabled={dayLocked || timer.model.isRunning}
                                  aria-pressed={selected}
                                  onClick={() => {
                                    if (timer.model.isRunning || dayLocked) return;
                                    timer.selectTask({ id: task.id, title: task.title, cfg_target_hours: task.cfg_target_hours, color: rowAccent, icon: task.icon });
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    if (timer.model.isRunning || dayLocked) return;
                                    timer.selectTask({ id: task.id, title: task.title, cfg_target_hours: task.cfg_target_hours, color: rowAccent, icon: task.icon });
                                  }}
                                >
                                  <ProgressFillRow
                                    icon={<ColoredAuraIcon name={typeof task.icon === 'string' ? task.icon : null} size={14} tint={rowAccent} />}
                                    title={
                                      <span className="flex min-w-0 items-center gap-1.5">
                                        <span className="min-w-0 truncate">{task.title}</span>
                                        {selected ? <Check className="aura-operator-kpi size-3 shrink-0" style={{ color: rowAccent }} aria-hidden /> : null}
                                      </span>
                                    }
                                    value={amount}
                                    valueTitle={amount}
                                    color={rowAccent}
                                    progress={hasTarget ? dailyPct : 0}
                                    className={cn(
                                      'min-h-12',
                                      timer.model.isRunning && !selected && 'opacity-70'
                                    )}
                                    titleClassName={selected ? 'text-foreground' : undefined}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Центральная панель: таймер ────────────────────────────────── */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col overflow-hidden', mobileSection === 'timer' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <ModeSwitchHeader
                value={timer.model.timerType}
                onValueChange={(v) => timer.setTimerType(v)}
                disabled={timer.model.isRunning}
                locked={dayLocked}
                ariaLabel="Режим таймера"
                options={[
                  { value: 'timer',     label: 'Таймер',     Icon: Timer },
                  { value: 'stopwatch', label: 'Секундомер', Icon: Clock },
                ]}
              />
              <div className={cn(MEGA_PANEL_INSET_CN, 'gap-3')}>
                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  {dayLocked ? <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">Только текущий день</Badge> : null}
                  {!sel ? (
                    <p className="text-muted-foreground w-full max-w-md min-w-0 text-center text-xs leading-relaxed">
                      Выберите задачу слева
                    </p>
                  ) : null}
                </div>

                {/* Коллапсированный вид таймера */}
                {!sessionHeroExpanded ? (
                  <button
                    type="button"
                    onClick={() => setSessionHeroExpanded(true)}
                    className={cn(
                      'aura-operator-row text-foreground flex w-full min-w-0 shrink-0 items-center gap-3 rounded-lg border border-soft bg-control px-3 py-2.5 text-left shadow-sm',
                      'motion-safe:transition-[transform,box-shadow,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
                      'hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
                      'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.99] motion-safe:duration-300'
                    )}
                  >
                    <span className="aura-operator-kpi font-heading text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl" style={{ color: accent }}>
                      {timer.displayTime}
                    </span>
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">{sel?.title ?? '—'}</span>
                    <ChevronDown className="text-muted-foreground size-5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                    <span className="sr-only">Развернуть блок сессии</span>
                  </button>
                ) : null}

                {/* Разворачиваемый TimerSessionHero с анимацией grid-rows */}
                <div className={cn(
                  'grid min-h-0 w-full min-w-0 motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
                  sessionHeroExpanded ? 'grid-rows-[1fr] flex-1' : 'grid-rows-[0fr] shrink-0'
                )}>
                  <div className={cn(
                    'flex min-h-0 min-w-0 flex-col overflow-hidden motion-safe:transition-opacity motion-safe:duration-200',
                    sessionHeroExpanded ? 'opacity-100' : 'pointer-events-none opacity-0 motion-safe:delay-0'
                  )}>
                    <TimerSessionHero
                      embedded embeddedFillHeight
                      dayLocked={dayLocked}
                      selectedTask={sel}
                      accent={accent}
                      displayTime={timer.displayTime}
                      timerType={timer.model.timerType}
                      isRunning={timer.model.isRunning}
                      targetDurationSec={timer.model.targetDuration}
                      sessionPct={sessionPct}
                      durationInputMinutes={durationInputMinutes}
                      elapsedTimeSec={timer.model.elapsedTime}
                      shareSegments={timerShareSegments}
                      onDurationMinutesChange={(m) => timer.setTargetDuration(m * 60)}
                      onQuickMinutes={(m) => timer.setTargetDuration(m * 60)}
                      onStart={timer.start}
                      onPause={timer.pause}
                      onStopAndSave={timer.stopAndSave}
                      onReset={timer.reset}
                      quickMinutes={QUICK_MINUTES}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Правая панель: сессии за день ─────────────────────────────── */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col', mobileSection === 'sessions' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <MegaPanelHeader title={t('label.sessions_per_day')} locked={dayLocked} />
              <div className={cn(MEGA_PANEL_BODY_CN, 'relative')}>
                {dayLocked ? <div className="absolute inset-0 z-20 bg-background/30 backdrop-blur-[1px]" aria-hidden /> : null}
                <ActList
                  items={sessionItems}
                  emptyTitle={t('placeholder.no_items')}
                  emptyHint={t('hint.run_timer')}
                  composer={{
                    options: [
                      { value: 'timer', label: 'Таймер', icon: Timer, color: 'var(--primary)' },
                      { value: 'stopwatch', label: 'Секундомер', icon: Clock, color: 'var(--task-time)' },
                    ],
                    value: timer.model.timerType,
                    onValueChange: (value) => timer.setTimerType(value as 'timer' | 'stopwatch'),
                    fields: (
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem] [&>*+*]:border-l [&>*+*]:border-soft/50">
                        <Select value={composerTaskId} onValueChange={setComposerTaskId} disabled={dayLocked || !db || pickerTasks.length === 0}>
                          <SelectTrigger className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                            <SelectValue placeholder={t('placeholder.select_task')} />
                          </SelectTrigger>
                          <SelectContent>
                            {['Фокус', 'Эскапизм', 'Наполнение'].map((groupLabel) => {
                              const items = pickerTasks.filter((task) => task.group === groupLabel);
                              if (!items.length) return null;
                              return (
                                <SelectGroup key={groupLabel}>
                                  <SelectLabel>{groupLabel}</SelectLabel>
                                  {items.map((task) => (
                                    <SelectItem key={task.id} value={task.id} textValue={task.title}>
                                      <ActSelectOptionLabel
                                        label={task.title}
                                        icon={task.icon}
                                        color={task.color ?? TIMER_PICKER_GROUP_COLOR[task.group] ?? 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <ActComposerValueField
                          id="act-timer-minutes"
                          ariaLabel={t('field.duration_min')}
                          value={composerMinutes}
                          suffix="мин"
                          inputKind="integer"
                          placeholder="25"
                          onCommit={(next) => setComposerMinutes(next.replace(/\D/g, '').slice(0, 4))}
                        />
                      </div>
                    ),
                    disabled: dayLocked || !db || pickerTasks.length === 0,
                    submitDisabled: !composerTaskId || !composerMinutes,
                    submitLabel: composerEditingSessionId ? 'Сохранить' : 'Добавить',
                    onSubmit: saveComposerSession,
                  }}
                />
              </div>
            </section>
          </div>

          {/* Мобильные вкладки */}
          <MobileSectionTabs
            className="lg:hidden"
            sections={[
              { id: 'tasks',    label: 'Задачи', Icon: ListTodo },
              { id: 'timer',    label: 'Таймер', Icon: Timer    },
              { id: 'sessions', label: 'Сессии', Icon: Clock    },
            ]}
            value={mobileSection}
            onChange={setMobileSection}
          />
        </CardContent>
      </Card>

      {/* ── Полноэкранный диалог активной сессии ─────────────────────────── */}
      <TimerFullscreenDialog
        open={fullscreenOpen}
        lockClose={isTimerSessionActive}
        db={db}
        dayLocked={dayLocked}
        selectedTask={timer.model.selectedTask}
        timerType={timer.model.timerType}
        isRunning={timer.model.isRunning}
        elapsedTimeSec={timer.model.elapsedTime}
        targetDurationSec={timer.model.targetDuration}
        displayTime={timer.displayTime}
        accent={accent}
        onOpenChange={setFullscreenOpen}
        onTimerTypeChange={timer.setTimerType}
        onStart={timer.start}
        onPause={timer.pause}
        onStopAndSave={timer.stopAndSave}
      />

      <Dialog open={composerEditingSessionId != null} onOpenChange={(open) => { if (!open) setComposerEditingSessionId(null); }}>
        <ActModal
          title="Редактировать сессию"
          icon={Clock}
          size="md"
          footer={
            <ActModalFooter
              onCancel={() => setComposerEditingSessionId(null)}
              onSubmit={saveComposerSession}
              submitDisabled={dayLocked || !composerTaskId || !composerMinutes}
              submitLabel="Сохранить"
            />
          }
        >
          <ActTableBox>
            <ActFormTable>
              <ActField label="Задача">
                <Select value={composerTaskId} onValueChange={setComposerTaskId} disabled={dayLocked || !db || pickerTasks.length === 0}>
                  <SelectTrigger className="h-8 w-full min-w-0 border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                    <SelectValue placeholder={t('placeholder.select_task')} />
                  </SelectTrigger>
                  <SelectContent>
                    {['Фокус', 'Эскапизм', 'Наполнение'].map((groupLabel) => {
                      const items = pickerTasks.filter((task) => task.group === groupLabel);
                      if (!items.length) return null;
                      return (
                        <SelectGroup key={groupLabel}>
                          <SelectLabel>{groupLabel}</SelectLabel>
                          {items.map((task) => (
                            <SelectItem key={task.id} value={task.id} textValue={task.title}>
                              <ActSelectOptionLabel
                                label={task.title}
                                icon={task.icon}
                                color={task.color ?? TIMER_PICKER_GROUP_COLOR[task.group] ?? 'var(--primary)'}
                              />
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </ActField>
              <ActField label="Длительность">
                <ActComposerValueField
                  id="timer-session-edit-minutes"
                  ariaLabel={t('field.duration_min')}
                  value={composerMinutes}
                  suffix="мин"
                  inputKind="integer"
                  placeholder="25"
                  controlClassName="h-9 rounded-md border border-soft bg-control/45 px-3 shadow-none hover:bg-hover/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/45"
                  onCommit={(next) => setComposerMinutes(next.replace(/\D/g, '').slice(0, 4))}
                />
              </ActField>
            </ActFormTable>
          </ActTableBox>
        </ActModal>
      </Dialog>
    </PageFrame>
  );
}
