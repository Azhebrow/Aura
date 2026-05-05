import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown, Clock, ListTodo, Timer, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AddListButton } from '@/components/ui/add-list-button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useTimerSession } from '@/features/timer/use-timer-session';
import { useTimerTasksAll, type TimerTaskRow, type TimerTaskTab } from '@/features/timer/use-timer-tasks';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { getIpcRenderer } from '@/shared/electron/ipc';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { TimerSessionHero } from '@/features/timer/TimerSessionHero';
import { ListItem } from '@/components/ui/list-item';
import { cn } from '@/lib/utils';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { TimerFullscreenDialog } from '@/features/timer/TimerFullscreenDialog';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import {
  ActAffixValueField,
  ActField,
  ActFormTable,
  ActModal,
  ActModalFooter,
  ActModeSwitch,
  ActTableBox,
} from '@/features/act/ActModal';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
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

const QUICK_MINUTES = [5, 15, 25, 45, 60, 120];

/** Заголовки групп задач в одном списке (без вкладок). */
const TIMER_TASK_GROUPS: readonly { key: TimerTaskTab; title: string }[] = [
  { key: 'tasks', title: 'Фокус' },
  { key: 'escape', title: 'Эскапизм' },
  { key: 'filling', title: 'Наполнение' },
];

type PickerTask = {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  group: string;
};

function loadPickerTasks(db: AuraDatabase): PickerTask[] {
  const out: PickerTask[] = [];
  try {
    for (const t of db.getAll('cfg_tasks').filter((r) => r.task_type === 'timer' && r.category_type === 'time')) {
      if (t.id == null) continue;
      out.push({
        id: String(t.id),
        title: String(t.title ?? t.id),
        icon: typeof t.icon === 'string' ? t.icon : undefined,
        color: typeof t.color === 'string' ? t.color : undefined,
        group: 'Фокус',
      });
    }
    for (const t of db
      .getAll('cfg_leisure_tasks')
      .filter((r) => r.task_type === 'timer' && r.leisure_type === 'escape')) {
      if (t.id == null) continue;
      out.push({
        id: String(t.id),
        title: String(t.title ?? t.name ?? t.id),
        icon: typeof t.icon === 'string' ? t.icon : undefined,
        color: typeof t.color === 'string' ? t.color : undefined,
        group: 'Эскапизм',
      });
    }
    for (const t of db
      .getAll('cfg_leisure_tasks')
      .filter((r) => r.task_type === 'timer' && r.leisure_type === 'filling')) {
      if (t.id == null) continue;
      out.push({
        id: String(t.id),
        title: String(t.title ?? t.name ?? t.id),
        icon: typeof t.icon === 'string' ? t.icon : undefined,
        color: typeof t.color === 'string' ? t.color : undefined,
        group: 'Наполнение',
      });
    }
  } catch {
    /* ignore */
  }
  return out;
}

function newSessionId() {
  return `timer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function sameSessions(a: AuraRow[], b: AuraRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
}

/** Прогресс по цели задачи за выбранный день (часы из cfg_target_hours). */
function timerTaskDailyProgressPct(t: Pick<TimerTaskRow, 'cfg_target_hours' | 'currentSeconds'>): number {
  const th = t.cfg_target_hours ?? 0;
  if (!(th > 0)) return 0;
  const targetSec = th * 3600;
  return Math.min(100, Math.round((t.currentSeconds / targetSec) * 100));
}

export function TimerStatusPage() {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh({ types: ['timer'] });
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const timer = useTimerSession(db, dateString, dayLocked);
  const { byGroup, reload: reloadTasks } = useTimerTasksAll(db, dateString, dataTick);
  const ipc = useMemo(() => getIpcRenderer(), []);

  const [sessions, setSessions] = useState<AuraRow[]>([]);
  const refreshSessions = useCallback(() => {
    if (!db) {
      setSessions([]);
      return;
    }
    const next = db.getTimerSessions(dateString);
    setSessions((prev) => (sameSessions(prev, next) ? prev : next));
  }, [db, dateString]);

  useEffect(() => {
    if (!db) {
      setSessions([]);
      return;
    }
    refreshSessions();
  }, [dataTick, db, dateString, refreshSessions]);

  const pickerTasks = useMemo(() => (db ? loadPickerTasks(db) : []), [db]);

  const taskMetaById = useMemo(() => {
    const m = new Map<string, { title: string; icon?: string; color?: string }>();
    for (const t of pickerTasks) {
      m.set(t.id, { title: t.title, icon: t.icon, color: t.color });
    }
    return m;
  }, [pickerTasks]);

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AuraRow | null>(null);
  const [formTaskId, setFormTaskId] = useState('');
  const [formMinutes, setFormMinutes] = useState('25');
  const [formTimerType, setFormTimerType] = useState<'timer' | 'stopwatch'>('timer');
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AuraRow | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [sessionHeroExpanded, setSessionHeroExpanded] = useState(true);
  const [mobileSection, setMobileSection] = useState<'tasks' | 'timer' | 'sessions'>('timer');
  const wasRunningRef = useRef(timer.model.isRunning);
  const timerHydrating = !!ipc && !timer.isHydrated;

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
    const tt = String(row.timer_type ?? 'timer');
    setFormTimerType(tt === 'stopwatch' ? 'stopwatch' : 'timer');
    setFormError(null);
    setSessionDialogOpen(true);
  };

  const saveSession = () => {
    setFormError(null);
    if (!db || dayLocked) return;
    const minutes = parseInt(formMinutes, 10);
    if (!Number.isFinite(minutes) || minutes < 1) {
      setFormError('Укажите длительность в минутах (≥ 1).');
      return;
    }
    if (!formTaskId) {
      setFormError('Выберите задачу.');
      return;
    }
    const durationSec = minutes * 60;
    try {
      runAuraMutation('timer', () => {
        if (editingSession) {
          db.updateTimerSession(String(editingSession.id), {
            task_id: formTaskId,
            duration: durationSec,
            timer_type: formTimerType,
            target_duration: formTimerType === 'timer' ? durationSec : null,
          });
        } else {
          db.addTimerSession({
            id: newSessionId(),
            date: dateString,
            task_id: formTaskId,
            duration: durationSec,
            timer_type: formTimerType,
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
    } catch {
      /* ignore */
    }
  };

  const sessionPct =
    timer.model.timerType === 'timer' && timer.model.targetDuration > 0
      ? Math.min(100, (timer.model.elapsedTime / timer.model.targetDuration) * 100)
      : 0;

  const durationInputMinutes = Math.max(1, Math.round(timer.model.targetDuration / 60));
  const sel = timer.model.selectedTask;
  const isTimerSessionActive = timer.model.isRunning || timer.model.elapsedTime > 0;

  const pickerGroupOrder = ['Фокус', 'Эскапизм', 'Наполнение'] as const;
  const groupAccentByKey = useMemo<Record<TimerTaskTab, string>>(
    () => ({
      tasks: 'var(--task-time)',  // CSS переменная для категории "Время" (динамическая)
      escape: 'var(--leisure-escape)',
      filling: 'var(--leisure-filling)',
    }),
    []
  );

  // Логика выбора цвета зависит от группы:
  // - Фокус: всегда цвет категории (группа), игнорирует цвет задачи
  // - Эскапизм/Наполнение: цвет из задачи, fallback на группу
  const getTaskColor = (group: TimerTaskTab, taskColor?: string): string => {
    if (group === 'tasks') {
      return getCategoryColor('time', db);
    }
    if (taskColor && typeof taskColor === 'string' && taskColor.trim()) {
      return taskColor;
    }
    return groupAccentByKey[group] ?? 'var(--primary)';
  };

  // Определяем группу выбранной задачи
  const selectedTaskGroup = useMemo<TimerTaskTab>(() => {
    if (!sel) return 'tasks';
    for (const group of ['tasks', 'escape', 'filling'] as const) {
      if (byGroup[group].some((t) => t.id === sel.id)) {
        return group;
      }
    }
    return 'tasks';
  }, [sel, byGroup]);

  const accent =
    sel && sel.color
      ? getTaskColor(selectedTaskGroup, sel.color)
      : 'var(--primary)';

  const totalTimerTasks = TIMER_TASK_GROUPS.reduce((n, g) => n + byGroup[g.key].length, 0);
  const rawDailyProgressByTaskId = useMemo(() => {
    const out = new Map<string, number>();
    for (const group of TIMER_TASK_GROUPS) {
      for (const task of byGroup[group.key]) {
        out.set(task.id, timerTaskDailyProgressPct(task));
      }
    }
    return out;
  }, [byGroup]);
  const [visibleDailyProgressByTaskId, setVisibleDailyProgressByTaskId] = useState<Map<string, number>>(
    () => new Map()
  );
  const sessionTaskGroupById = useMemo(() => buildTimerTaskGroupById(db), [db]);
  const timerShare = useMemo(() => {
    let focusSec = 0;
    let escapeSec = 0;
    let fillingSec = 0;
    for (const session of sessions) {
      const duration = Math.max(0, Number(session.duration) || 0);
      const group = getSessionGroup(session, sessionTaskGroupById);
      if (group === 'tasks') {
        focusSec += duration;
      } else if (group === 'escape') {
        escapeSec += duration;
      } else if (group === 'filling') {
        fillingSec += duration;
      }
    }
    const totalSec = focusSec + escapeSec + fillingSec;
    return {
      focusSec,
      escapeSec,
      fillingSec,
      totalSec,
      focusPct: totalSec > 0 ? (focusSec / totalSec) * 100 : 0,
      escapePct: totalSec > 0 ? (escapeSec / totalSec) * 100 : 0,
      fillingPct: totalSec > 0 ? (fillingSec / totalSec) * 100 : 0,
    };
  }, [sessionTaskGroupById, sessions]);

  useEffect(() => {
    const selected = timer.model.selectedTask;
    if (!selected) return;
    const selectedId = selected.id;
    const groupOrder: TimerTaskTab[] = ['tasks', 'escape', 'filling'];
    let found: { task: TimerTaskRow; group: TimerTaskTab } | null = null;
    for (const group of groupOrder) {
      const task = byGroup[group].find((t) => t.id === selectedId);
      if (task) {
        found = { task, group };
        break;
      }
    }
    if (!found) {
      timer.selectTask(null);
      return;
    }
    const hasMeta =
      typeof selected.icon === 'string' && selected.icon.trim()
        ? true
        : typeof selected.color === 'string' && selected.color.trim()
          ? true
          : typeof selected.cfg_target_hours === 'number';
    if (hasMeta) return;
    timer.selectTask({
      id: found.task.id,
      title: found.task.title,
      cfg_target_hours: found.task.cfg_target_hours,
      color: getTaskColor(found.group, found.task.color),
      icon: found.task.icon,
    });
  }, [byGroup, groupAccentByKey, timer]);

  useEffect(() => {
    if (timer.model.selectedTask) return;
    const groupOrder: TimerTaskTab[] = ['tasks', 'escape', 'filling'];
    for (const group of groupOrder) {
      const first = byGroup[group][0];
      if (first) {
        timer.selectTask({
          id: first.id,
          title: first.title,
          cfg_target_hours: first.cfg_target_hours,
          color: getTaskColor(group, first.color),
          icon: first.icon,
        });
        return;
      }
    }
  }, [byGroup, groupAccentByKey, timer]);

  useLayoutEffect(() => {
    if (!db) {
      setVisibleDailyProgressByTaskId(new Map());
      return;
    }
    setVisibleDailyProgressByTaskId(new Map(rawDailyProgressByTaskId));
  }, [dateString, rawDailyProgressByTaskId, db]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      setVisibleDailyProgressByTaskId(new Map(rawDailyProgressByTaskId));
    });
  }, [dateString, rawDailyProgressByTaskId]);

  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    const nowRunning = timer.model.isRunning;
    if (!wasRunning && nowRunning) setSessionHeroExpanded(true);
    setFullscreenOpen(isTimerSessionActive);
    wasRunningRef.current = nowRunning;
  }, [isTimerSessionActive, timer.model.isRunning]);

  useEffect(() => {
    setSessionHeroExpanded(true);
  }, [dateString]);

  if (timerHydrating) {
    return (
      <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
        <Card className={MEGA_SHELL_CARD_CN}>
          <CardContent className={cn(MEGA_SHELL_CONTENT_CN, 'items-center justify-center')}>
            <p className="text-muted-foreground text-sm">Восстанавливаем состояние таймера…</p>
          </CardContent>
        </Card>
      </PageFrame>
    );
  }

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-border/60 overflow-hidden aura-content-fade-in lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,1.48fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
          {!ipc ? (
            <div className="col-span-full border-b border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Локальный режим: таймер и задачи работают без Electron, но без трея и фоновой синхронизации.
            </div>
          ) : null}
            {/* Задачи */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col', mobileSection === 'tasks' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <MegaPanelHeader title="Задачи" locked={dayLocked} />
              <div className={cn(MEGA_PANEL_BODY_CN, 'relative')}>
                {dayLocked ? <div className="absolute inset-0 z-20 bg-background/30 backdrop-blur-[1px]" aria-hidden /> : null}
                {!db ? (
                  <LoadingShell />
                ) : totalTimerTasks === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет таймер-задач в CFG.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {TIMER_TASK_GROUPS.map(({ key, title }) => {
                      const tasks = byGroup[key];
                      return (
                        <div key={key} className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-px min-w-0 flex-1 bg-border/55" aria-hidden />
                            <p className={cn(MEGA_PANEL_MICRO_TITLE_CN, 'shrink-0')}>
                              {title}
                            </p>
                            <div className="h-px min-w-0 flex-1 bg-border/55" aria-hidden />
                          </div>
                          {tasks.length === 0 ? (
                            <EmptyState
                              title="В этой группе пока нет задач."
                              hint="Добавьте задачу в настройках, и она появится здесь."
                              className="mx-auto w-full max-w-sm"
                              compact
                            />
                          ) : (
                            <ul className="flex flex-col gap-2.5">
                              {tasks.map((t) => {
                                const selected = timer.model.selectedTask?.id === t.id;
                                const targetH = t.cfg_target_hours ?? 0;
                                const curH = t.currentSeconds / 3600;
                                const rowAccent = getTaskColor(key, t.color);
                                const dailyPct = visibleDailyProgressByTaskId.get(t.id) ?? 0;
                                const hasTarget = targetH > 0;
                                return (
                                  <li
                                    key={t.id}
                                    className={cn(
                                      'overflow-hidden rounded-lg border bg-transparent aura-tx-colors cursor-pointer',
                                      selected
                                        ? 'border-primary/55 bg-primary/5'
                                        : 'border-border/60 hover:border-border',
                                      dayLocked && 'pointer-events-none opacity-55'
                                    )}
                                    onClick={() => {
                                      if (timer.model.isRunning) return;
                                      if (dayLocked) return;
                                      timer.selectTask({
                                        id: t.id,
                                        title: t.title,
                                        cfg_target_hours: t.cfg_target_hours,
                                        color: rowAccent,
                                        icon: t.icon,
                                      });
                                    }}
                                  >
                                    <ListItem
                                      mode="edit-delete"
                                      icon={typeof t.icon === 'string' ? t.icon : null}
                                      iconTint={rowAccent}
                                      title={t.title}
                                      amount={`${curH.toFixed(1)}ч / ${hasTarget ? `${targetH}ч` : '—'}`}
                                      className={cn(
                                        'rounded-none border-0 bg-transparent shadow-none pointer-events-none',
                                        'hover:border-0 hover:bg-transparent hover:shadow-none',
                                        'aura-tx-surface',
                                        dayLocked && 'opacity-65'
                                      )}
                                      onEdit={undefined}
                                    />
                                    <div className="border-border/50 space-y-1.5 border-t bg-muted/15 px-2.5 py-2 sm:px-3">
                                      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                                        <span>Цель за день</span>
                                        <span className="tabular-nums text-foreground">
                                          {hasTarget ? `${dailyPct}%` : '—'}
                                        </span>
                                      </div>
                                      {hasTarget ? (
                                        <div
                                          className="[&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-aura-glide [&_[data-slot=progress-indicator]]:ease-aura"
                                          style={{ ['--row-accent' as string]: rowAccent } as CSSProperties}
                                        >
                                          <Progress
                                            value={dailyPct}
                                            className="h-1.5 bg-muted/80 [&_[data-slot=progress-indicator]]:bg-[var(--row-accent)]"
                                          />
                                        </div>
                                      ) : (
                                        <p className="text-muted-foreground text-xs leading-snug">Цель не задана в CFG</p>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Таймер — центральная колонка: заголовок колонки = переключатель режима */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col overflow-hidden', mobileSection === 'timer' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <ModeSwitchHeader
                value={timer.model.timerType}
                onValueChange={(v) => timer.setTimerType(v)}
                disabled={timer.model.isRunning}
                locked={dayLocked}
                ariaLabel="Режим таймера"
                options={[
                  { value: 'timer', label: 'Таймер', Icon: Timer },
                  { value: 'stopwatch', label: 'Секундомер', Icon: Clock },
                ]}
              />
              <div className={cn(MEGA_PANEL_INSET_CN, 'gap-3')}>
                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  <div className="border-border/60 bg-muted/25 flex w-full max-w-md flex-col gap-1.5 rounded-md border px-2 py-1.5">
                    <div
                      className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                      role="img"
                      aria-label="Соотношение времени: фокус, эскапизм, наполнение"
                    >
                      {timerShare.totalSec > 0 ? (
                        <div className="flex h-full w-full">
                          <span
                            className="h-full"
                            style={{
                              width: `${timerShare.focusPct}%`,
                              background: groupAccentByKey.tasks ?? 'var(--primary)',
                            }}
                            title={`Фокус: ${Math.round(timerShare.focusPct)}%`}
                          />
                          <span
                            className="h-full"
                            style={{
                              width: `${timerShare.escapePct}%`,
                              background: groupAccentByKey.escape ?? 'var(--leisure-escape)',
                            }}
                            title={`Эскапизм: ${Math.round(timerShare.escapePct)}%`}
                          />
                          <span
                            className="h-full"
                            style={{
                              width: `${timerShare.fillingPct}%`,
                              background: groupAccentByKey.filling ?? 'var(--leisure-filling)',
                            }}
                            title={`Наполнение: ${Math.round(timerShare.fillingPct)}%`}
                          />
                        </div>
                      ) : (
                        <div className="bg-muted-foreground/25 h-full w-full" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-center text-xs leading-none tabular-nums">
                      {timerShare.totalSec > 0
                        ? `${Math.round(timerShare.focusPct)} / ${Math.round(timerShare.escapePct)} / ${Math.round(timerShare.fillingPct)}`
                        : '0 / 0 / 0'}
                    </p>
                  </div>
                  {dayLocked ? (
                    <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
                      Заблокировано
                    </Badge>
                  ) : null}
                  {!sel ? (
                    <p className="text-muted-foreground w-full max-w-md min-w-0 text-center text-xs leading-relaxed">
                      Выберите задачу слева — без задачи сессия не сохраняется в базу.
                    </p>
                  ) : null}
                </div>
                {!sessionHeroExpanded ? (
                  <button
                    type="button"
                    onClick={() => setSessionHeroExpanded(true)}
                    className={cn(
                      'text-foreground flex w-full min-w-0 shrink-0 items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-left shadow-sm',
                      'motion-safe:transition-[transform,box-shadow,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
                      'hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
                      'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.99] motion-safe:duration-300'
                    )}
                  >
                    <span
                      className="font-heading text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl"
                      style={{ color: accent }}
                    >
                      {timer.displayTime}
                    </span>
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">
                      {sel?.title ?? '—'}
                    </span>
                    <ChevronDown className="text-muted-foreground size-5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                    <span className="sr-only">Развернуть блок сессии</span>
                  </button>
                ) : null}
                <div
                  className={cn(
                    'grid min-h-0 w-full min-w-0 motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
                    sessionHeroExpanded ? 'grid-rows-[1fr] flex-1' : 'grid-rows-[0fr] shrink-0'
                  )}
                >
                  <div
                    className={cn(
                      'flex min-h-0 min-w-0 flex-col overflow-hidden motion-safe:transition-opacity motion-safe:duration-200',
                      sessionHeroExpanded ? 'opacity-100' : 'pointer-events-none opacity-0 motion-safe:delay-0'
                    )}
                  >
                    <TimerSessionHero
                      embedded
                      embeddedFillHeight
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

            {/* Сессии за день */}
            <section className={cn('h-full min-h-0 min-w-0 flex-col', mobileSection === 'sessions' ? 'flex' : 'hidden', 'lg:flex', ANIM.enterFade)}>
              <MegaPanelHeader title="Сессии за день" locked={dayLocked} />
              <div className={cn(MEGA_PANEL_BODY_CN, 'relative')}>
                {dayLocked ? <div className="absolute inset-0 z-20 bg-background/30 backdrop-blur-[1px]" aria-hidden /> : null}
                {sessions.length === 0 ? (
                  <EmptyState
                    title="Пока нет записей."
                    hint="Запустите таймер, чтобы здесь появились сессии за день."
                    compact
                  />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {sessions.map((s) => {
                      const tid = String(s.task_id ?? '');
                      const meta = taskMetaById.get(tid);
                      const label = meta?.title ?? tid;
                      const mins = Math.floor(Number(s.duration) / 60);
                      const sessionGroup = getSessionGroup(s, sessionTaskGroupById);
                      const resolvedRowTint =
                        sessionGroup === 'tasks' || sessionGroup === 'escape' || sessionGroup === 'filling'
                          ? (groupAccentByKey[sessionGroup] ?? 'var(--primary)')
                          : 'var(--primary)';
                      const isStopwatch = String(s.timer_type ?? '') === 'stopwatch';
                      return (
                        <li key={String(s.id)}>
                          <ListItem
                            mode="edit-delete"
                            icon={meta?.icon != null ? String(meta.icon) : null}
                            iconTint={resolvedRowTint}
                            title={label}
                            amount={`${mins} мин · ${isStopwatch ? 'секундомер' : 'таймер'}`}
                            className={cn('aura-tx-surface', dayLocked && 'opacity-65')}
                            onEdit={() => {
                              if (!dayLocked) openEditSession(s);
                            }}
                            onDelete={() => {
                              if (!dayLocked) setDeleteTarget(s);
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
                <AddListButton
                  onClick={openCreateSession}
                  disabled={dayLocked || !db || pickerTasks.length === 0}
                  className="mt-3"
                />
              </div>
            </section>
          </div>
          <MobileSectionTabs
            className="lg:hidden"
            sections={[
              { id: 'tasks', label: 'Задачи', Icon: ListTodo },
              { id: 'timer', label: 'Таймер', Icon: Timer },
              { id: 'sessions', label: 'Сессии', Icon: Clock },
            ]}
            value={mobileSection}
            onChange={setMobileSection}
          />
        </CardContent>
      </Card>

      <Dialog
        open={sessionDialogOpen}
        onOpenChange={(o) => {
          setSessionDialogOpen(o);
          if (!o) {
            setFormError(null);
            setEditingSession(null);
          }
        }}
      >
        <ActModal
          icon={Timer}
          title={editingSession ? 'Изменить сессию' : 'Добавить сессию'}
          footer={
            <ActModalFooter
              onCancel={() => setSessionDialogOpen(false)}
              onSubmit={saveSession}
              submitDisabled={dayLocked}
              submitLabel="Сохранить"
            />
          }
        >
          <ActTableBox>
            <ActFormTable>
              <ActField label="Тип">
              <ActModeSwitch
                value={formTimerType}
                onValueChange={(next) => setFormTimerType(next as 'timer' | 'stopwatch')}
                options={[
                  { value: 'timer', label: 'Таймер', icon: Timer },
                  { value: 'stopwatch', label: 'Секундомер', icon: Clock },
                ]}
              />
              </ActField>
              <ActField id="sess-task" label="Задача">
              <Select value={formTaskId} onValueChange={setFormTaskId}>
                <SelectTrigger id="sess-task" className="h-9 w-full min-w-0 justify-center text-center">
                  <SelectValue placeholder="Выберите задачу" />
                </SelectTrigger>
                <SelectContent>
                  {pickerGroupOrder.map((g) => {
                    const items = pickerTasks.filter((t) => t.group === g);
                    if (items.length === 0) return null;
                    return (
                      <SelectGroup key={g}>
                        <SelectLabel>{g}</SelectLabel>
                        {items.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="flex items-center gap-2">
                              <AuraThemedIcon name={typeof t.icon === 'string' ? t.icon : null} className="size-4 shrink-0" />
                              <span className="truncate">{t.title}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
              </ActField>
              <ActField id="sess-min" label="Длительность (мин)">
                <ActAffixValueField
                  id="sess-min"
                  value={formMinutes}
                  suffix="мин"
                  inputKind="integer"
                  ariaLabel="Длительность"
                  onCommit={setFormMinutes}
                />
              </ActField>
            </ActFormTable>
          </ActTableBox>
          {formError ? (
            <ActTableBox>
              <ActFormTable>
                <ActField label="Ошибка">
                  <p className="text-destructive text-sm text-center">{formError}</p>
                </ActField>
              </ActFormTable>
            </ActTableBox>
          ) : null}
        </ActModal>
      </Dialog>

      <Dialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <ActModal
          icon={Trash2}
          title="Удалить сессию?"
          footer={
            <ActModalFooter
              onCancel={() => setDeleteTarget(null)}
              onSubmit={confirmDelete}
              submitDisabled={dayLocked}
              submitVariant="destructive"
              submitLabel="Удалить"
            />
          }
        >
          <ActTableBox>
            <ActFormTable>
              <ActField label="Запись">
                <p className="text-sm">Подтвердите удаление выбранной сессии.</p>
              </ActField>
            </ActFormTable>
          </ActTableBox>
        </ActModal>
      </Dialog>

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
        onStart={timer.start}
        onPause={timer.pause}
        onStopAndSave={timer.stopAndSave}
      />
    </PageFrame>
  );
}
