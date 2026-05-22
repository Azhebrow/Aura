// ─── TimerStatusPage ──────────────────────────────────────────────────────────
// Страница таймера: три панели (задачи, таймер, сессии) + диалоги создания/удаления.
// Вспомогательные утилиты — в timer-utils.ts, форма сессии — в TimerSessionForm.tsx.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Clock, ListTodo, Timer, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AddListButton } from '@/components/ui/add-list-button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useTimerSession } from '@/features/timer/use-timer-session';
import { useTimerTasksAll, type TimerTaskTab } from '@/features/timer/use-timer-tasks';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { getIpcRenderer } from '@/shared/bridge/ipc';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { TimerSessionHero } from '@/features/timer/TimerSessionHero';
import { ListItem } from '@/components/ui/list-item';
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
import { ANIM } from '@/shared/lib/animation-classes';
import { getNavigationIntent } from '@/shared/lib/navigation-intent';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import type { AuraRow } from '@/types/aura';

import { loadPickerTasks, newSessionId, sameSessions, timerTaskDailyProgressPct } from './timer-utils';
import { TimerSessionForm } from './TimerSessionForm';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_MINUTES = [5, 15, 25, 45, 60, 120];

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

  const taskMetaById = useMemo(() => {
    const m = new Map<string, { title: string; icon?: string; color?: string }>();
    for (const t of pickerTasks) m.set(t.id, { title: t.title, icon: t.icon, color: t.color });
    return m;
  }, [pickerTasks]);

  // ─── Dialog state ─────────────────────────────────────────────────────────

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession]       = useState<AuraRow | null>(null);
  const [formTaskId, setFormTaskId]               = useState('');
  const [formMinutes, setFormMinutes]             = useState('25');
  const [formTimerType, setFormTimerType]         = useState<'timer' | 'stopwatch'>('timer');
  const [formError, setFormError]                 = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget]           = useState<AuraRow | null>(null);

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [fullscreenOpen, setFullscreenOpen]           = useState(false);
  const [sessionHeroExpanded, setSessionHeroExpanded] = useState(true);
  const [mobileSection, setMobileSection]             = useState<'tasks' | 'timer' | 'sessions'>('timer');
  const [pendingIntentTaskId, setPendingIntentTaskId] = useState<string | null>(null);

  const wasRunningRef = useRef(timer.model.isRunning);
  const timerHydrating = !!ipc && !timer.isHydrated;

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  const openCreateSession = () => {
    setEditingSession(null);
    const first = pickerTasks[0];
    setFormTaskId(first?.id ?? '');
    setFormMinutes('25');
    setFormTimerType('timer');
    setFormError(null);
    setSessionDialogOpen(true);
  };

  const openEditSession = (row: AuraRow) => {
    setEditingSession(row);
    setFormTaskId(String(row.task_id ?? ''));
    const sec = Number(row.duration) || 0;
    setFormMinutes(String(Math.max(1, Math.round(sec / 60))));
    setFormTimerType(String(row.timer_type ?? 'timer') === 'stopwatch' ? 'stopwatch' : 'timer');
    setFormError(null);
    setSessionDialogOpen(true);
  };

  const saveSession = () => {
    setFormError(null);
    if (!db || dayLocked) return;
    const minutes = parseInt(formMinutes, 10);
    if (!Number.isFinite(minutes) || minutes < 1) { setFormError('Укажите длительность в минутах (≥ 1).'); return; }
    if (!formTaskId) { setFormError('Выберите задачу.'); return; }
    const durationSec = minutes * 60;
    try {
      runAuraMutation('timer', () => {
        if (editingSession) {
          db.updateTimerSession(String(editingSession.id), {
            task_id: formTaskId, duration: durationSec, timer_type: formTimerType,
            target_duration: formTimerType === 'timer' ? durationSec : null,
          });
        } else {
          db.addTimerSession({
            id: newSessionId(), date: dateString, task_id: formTaskId,
            duration: durationSec, timer_type: formTimerType,
            target_duration: formTimerType === 'timer' ? durationSec : null,
          });
        }
      });
      setSessionDialogOpen(false);
      refreshSessions();
      reloadTasks();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const confirmDelete = () => {
    if (!db || !deleteTarget || dayLocked) return;
    try {
      runAuraMutation('timer', () => db.deleteTimerSession(String(deleteTarget.id)));
      setDeleteTarget(null);
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
      return true;
    }
    return false;
  }, [byGroup, dayLocked, getTaskColor, timer]);

  // Обработка navigation intent (приход со страницы главной)
  useEffect(() => {
    const applyIntent = (detail: unknown) => {
      if (!detail || typeof detail !== 'object') return;
      const taskId = (detail as { taskId?: unknown }).taskId;
      if (typeof taskId !== 'string' && typeof taskId !== 'number') return;
      setPendingIntentTaskId(String(taskId));
    };

    applyIntent(getNavigationIntent(STORAGE_KEYS.TIMER_TASK_ID));
    const onIntent = (event: Event) => applyIntent((event as CustomEvent).detail);
    window.addEventListener(STORAGE_KEYS.TIMER_TASK_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(STORAGE_KEYS.TIMER_TASK_INTENT_EVENT, onIntent);
  }, [selectTimerTaskById]);

  // Применяем отложенный intent как только задачи загружены
  useEffect(() => {
    if (!pendingIntentTaskId) return;
    selectTimerTaskById(pendingIntentTaskId);
  }, [pendingIntentTaskId, selectTimerTaskById]);

  // Очищаем intent после успешного применения
  useEffect(() => {
    if (!pendingIntentTaskId) return;
    if (timer.model.selectedTask?.id !== pendingIntentTaskId) return;
    setPendingIntentTaskId(null);
    try { localStorage.removeItem(STORAGE_KEYS.TIMER_TASK_ID); } catch { /* ignore */ }
  }, [pendingIntentTaskId, timer.model.selectedTask?.id]);

  // Синхронизируем мета-данные выбранной задачи при изменении списка задач
  useEffect(() => {
    const selected = timer.model.selectedTask;
    if (!selected) return;
    let found: { task: (typeof byGroup)['tasks'][0]; group: typeof selectedTaskGroup } | null = null;
    for (const group of ['tasks', 'escape', 'filling'] as const) {
      const task = byGroup[group].find((t) => t.id === selected.id);
      if (task) { found = { task, group }; break; }
    }
    if (!found) { timer.selectTask(null); return; }
    // Пропускаем если мета уже есть
    const hasMeta = (typeof selected.icon === 'string' && selected.icon.trim())
      || (typeof selected.color === 'string' && selected.color.trim())
      || (typeof selected.cfg_target_hours === 'number');
    if (hasMeta) return;
    timer.selectTask({
      id: found.task.id, title: found.task.title, cfg_target_hours: found.task.cfg_target_hours,
      color: getTaskColor(found.group, found.task.color), icon: found.task.icon,
    });
  }, [byGroup, getTaskColor, timer]);

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
  }, [byGroup, getTaskColor, pendingIntentTaskId, timer]);

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
    window.requestAnimationFrame(() => setVisibleDailyProgressByTaskId(new Map(rawDailyProgressByTaskId)));
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
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-[var(--aura-border-soft)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,1.48fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">

            {/* Баннер локального режима */}
            {!ipc ? (
              <div className="col-span-full border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-3 py-2 text-xs text-[var(--aura-text-muted)]">
                Локальный режим: таймер и задачи работают без Electron, но без трея и фоновой синхронизации.
              </div>
            ) : null}

            {/* ── Левая панель: задачи ─────────────────────────────────────── */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col', mobileSection === 'tasks' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <MegaPanelHeader title={t('field.task')} locked={dayLocked} />
              <div className={cn(MEGA_PANEL_BODY_CN, 'relative')}>
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
                          <div className="h-px min-w-0 flex-1 bg-[var(--aura-border-soft)]" aria-hidden />
                          <p className={cn(MEGA_PANEL_MICRO_TITLE_CN, 'shrink-0')}>{title}</p>
                          <div className="h-px min-w-0 flex-1 bg-[var(--aura-border-soft)]" aria-hidden />
                        </div>

                        {byGroup[key].length === 0 ? (
                          <EmptyState title={t('hint.no_tasks')} hint={t('hint.add_task_settings')} className="mx-auto w-full max-w-sm" compact />
                        ) : (
                          <ul className="flex flex-col gap-2.5">
                            {byGroup[key].map((task) => {
                              const selected    = timer.model.selectedTask?.id === task.id;
                              const targetH     = task.cfg_target_hours ?? 0;
                              const curH        = task.currentSeconds / 3600;
                              const rowAccent   = getTaskColor(key, task.color);
                              const dailyPct    = visibleDailyProgressByTaskId.get(task.id) ?? 0;
                              const hasTarget   = targetH > 0;
                              return (
                                <li
                                  key={task.id}
                                  className={cn(
                                    'overflow-hidden rounded-lg border bg-transparent aura-tx-colors cursor-pointer',
                                    selected
                                      ? 'border-primary/45 bg-primary/6'
                                      : 'border-[var(--aura-border-soft)] hover:bg-[var(--aura-action-hover-bg)]',
                                    dayLocked && 'pointer-events-none opacity-55'
                                  )}
                                  onClick={() => {
                                    if (timer.model.isRunning || dayLocked) return;
                                    timer.selectTask({ id: task.id, title: task.title, cfg_target_hours: task.cfg_target_hours, color: rowAccent, icon: task.icon });
                                  }}
                                >
                                  <ListItem
                                    mode="edit-delete"
                                    icon={typeof task.icon === 'string' ? task.icon : null}
                                    iconTint={rowAccent}
                                    title={task.title}
                                    amount={`${curH.toFixed(1)}ч / ${hasTarget ? `${targetH}ч` : '—'}`}
                                    className={cn('rounded-none border-0 bg-transparent shadow-none pointer-events-none', 'hover:border-0 hover:bg-transparent hover:shadow-none', 'aura-tx-surface', dayLocked && 'opacity-65')}
                                    onEdit={undefined}
                                  />
                                  <div className="space-y-1.5 border-t border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-2.5 py-2 sm:px-3">
                                    <div className="text-[var(--aura-text-subtle)] flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                                      <span>Цель за день</span>
                                      <span className="tabular-nums text-foreground">{hasTarget ? `${dailyPct}%` : '—'}</span>
                                    </div>
                                    {hasTarget ? (
                                      <div
                                        className="[&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-aura-glide [&_[data-slot=progress-indicator]]:ease-aura"
                                        style={{ ['--row-accent' as string]: rowAccent } as CSSProperties}
                                      >
                                        <Progress value={dailyPct} className="h-1.5 bg-[var(--aura-surface-control)] [&_[data-slot=progress-indicator]]:bg-[var(--row-accent)]" />
                                      </div>
                                    ) : (
                                      <p className="text-[var(--aura-text-subtle)] text-xs leading-snug">Цель не задана в CFG</p>
                                    )}
                                  </div>
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
                {/* Полоса соотношения фокус/эскапизм/наполнение */}
                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  <div className="flex w-full max-w-md flex-col gap-1.5 rounded-lg border border-[var(--aura-border-soft)]/60 bg-[var(--aura-surface-control)]/60 px-2 py-1.5">
                    <div className="bg-[var(--aura-surface-panel)] h-1.5 w-full overflow-hidden rounded-full" role="img" aria-label="Соотношение времени: фокус, эскапизм, наполнение">
                      {timerShare.totalSec > 0 ? (
                        <div className="flex h-full w-full">
                          <span className="h-full" style={{ width: `${timerShare.focusPct}%`,   background: GROUP_ACCENT_BY_KEY.tasks   }} title={`Фокус: ${Math.round(timerShare.focusPct)}%`} />
                          <span className="h-full" style={{ width: `${timerShare.escapePct}%`,  background: GROUP_ACCENT_BY_KEY.escape  }} title={`Эскапизм: ${Math.round(timerShare.escapePct)}%`} />
                          <span className="h-full" style={{ width: `${timerShare.fillingPct}%`, background: GROUP_ACCENT_BY_KEY.filling }} title={`Наполнение: ${Math.round(timerShare.fillingPct)}%`} />
                        </div>
                      ) : (
                        <div className="bg-[var(--aura-border-soft)]/40 h-full w-full" />
                      )}
                    </div>
                    <p className="text-[var(--aura-text-subtle)] text-center text-xs leading-none tabular-nums">
                      {timerShare.totalSec > 0
                        ? `${Math.round(timerShare.focusPct)} / ${Math.round(timerShare.escapePct)} / ${Math.round(timerShare.fillingPct)}`
                        : '0 / 0 / 0'}
                    </p>
                  </div>
                  {dayLocked ? <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">Заблокировано</Badge> : null}
                  {!sel ? (
                    <p className="text-muted-foreground w-full max-w-md min-w-0 text-center text-xs leading-relaxed">
                      Выберите задачу слева — без задачи сессия не сохраняется в базу.
                    </p>
                  ) : null}
                </div>

                {/* Коллапсированный вид таймера */}
                {!sessionHeroExpanded ? (
                  <button
                    type="button"
                    onClick={() => setSessionHeroExpanded(true)}
                    className={cn(
                      'text-foreground flex w-full min-w-0 shrink-0 items-center gap-3 rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-3 py-2.5 text-left shadow-sm',
                      'motion-safe:transition-[transform,box-shadow,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
                      'hover:bg-[var(--aura-action-hover-bg)] focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
                      'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.99] motion-safe:duration-300'
                    )}
                  >
                    <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl" style={{ color: accent }}>
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
                {sessions.length === 0 ? (
                  <EmptyState title={t('placeholder.no_items')} hint={t('hint.run_timer')} compact />
                ) : (
                  <ul className="mb-2 flex flex-col gap-2">
                    {sessions.map((session) => {
                      const tid         = String(session.task_id ?? '');
                      const meta        = taskMetaById.get(tid);
                      const label       = meta?.title ?? tid;
                      const mins        = Math.floor(Number(session.duration) / 60);
                      const sessionGroup = getSessionGroup(session, sessionTaskGroupById);
                      const rowTint     = sessionGroup === 'tasks' || sessionGroup === 'escape' || sessionGroup === 'filling'
                        ? (GROUP_ACCENT_BY_KEY[sessionGroup] ?? 'var(--primary)')
                        : 'var(--primary)';
                      const isStopwatch = String(session.timer_type ?? '') === 'stopwatch';
                      return (
                        <li key={String(session.id)}>
                          <ListItem
                            mode="edit-delete"
                            icon={meta?.icon != null ? String(meta.icon) : null}
                            iconTint={rowTint}
                            title={label}
                            amount={`${mins} мин · ${isStopwatch ? 'секундомер' : 'таймер'}`}
                            className={cn('aura-tx-surface', dayLocked && 'opacity-65')}
                            onEdit={() => { if (!dayLocked) openEditSession(session); }}
                            onDelete={() => { if (!dayLocked) setDeleteTarget(session); }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
                <AddListButton onClick={openCreateSession} disabled={dayLocked || !db || pickerTasks.length === 0} />
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

      {/* ── Диалог создания / редактирования сессии ──────────────────────── */}
      <TimerSessionForm
        open={sessionDialogOpen}
        onOpenChange={(o) => { setSessionDialogOpen(o); if (!o) { setFormError(null); setEditingSession(null); } }}
        isEditing={!!editingSession}
        dayLocked={dayLocked}
        formTaskId={formTaskId}
        formMinutes={formMinutes}
        formTimerType={formTimerType}
        formError={formError}
        onTaskIdChange={setFormTaskId}
        onMinutesChange={setFormMinutes}
        onTimerTypeChange={setFormTimerType}
        onSave={saveSession}
        onCancel={() => { setSessionDialogOpen(false); setFormError(null); setEditingSession(null); }}
        pickerTasks={pickerTasks}
        getTaskColor={getTaskColor}
      />

      {/* ── Диалог подтверждения удаления сессии ─────────────────────────── */}
      <Dialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <ActModal
          icon={Trash2}
          title={t('dialog.delete_session')}
          footer={
            <ActModalFooter
              onCancel={() => setDeleteTarget(null)}
              onSubmit={confirmDelete}
              submitDisabled={dayLocked}
              submitVariant="destructive"
              submitLabel={t('action.delete')}
            />
          }
        >
          <ActTableBox>
            <ActFormTable>
              <ActField label={t('field.entry')}>
                <p className="text-sm">Подтвердите удаление выбранной сессии.</p>
              </ActField>
            </ActFormTable>
          </ActTableBox>
        </ActModal>
      </Dialog>

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
    </PageFrame>
  );
}
