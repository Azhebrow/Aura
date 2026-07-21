import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Coffee, Moon, MoonStar, Pause, Play, Shuffle, Square, Sun, Sunset, Timer, Volume1, VolumeX, Watch, X } from 'lucide-react';
import { VinylRecord } from '@/features/timer/VinylRecord';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import type { TimerTaskSelection } from '@/features/timer/use-timer-session';
import { playTimerTone } from '@/features/timer/timer-sounds';
import { useAmbientAudio, formatAmbientTrackName } from '@/features/timer/use-ambient-audio';
import { sendFocusWindow } from '@/shared/bridge/ipc';

const BREAK_DURATION_SEC = 15 * 60;
const BREAK_ALARM_REPEAT_MS = 2400;
const IDLE_DELAY_MS = 3000;

type BreakPhase = 'idle' | 'countdown' | 'alarm';
type TimerDialMode = 'time' | 'quote';

type Props = {
  open: boolean;
  lockClose: boolean;
  db: AuraDatabase | null;
  dayLocked: boolean;
  selectedTask: TimerTaskSelection | null;
  timerType: 'timer' | 'stopwatch';
  isRunning: boolean;
  elapsedTimeSec: number;
  targetDurationSec: number;
  displayTime: string;
  accent: string;
  onOpenChange: (open: boolean) => void;
  onTimerTypeChange: (mode: 'timer' | 'stopwatch') => void;
  onStart: () => void;
  onPause: () => void;
  onStopAndSave: () => void;
};

function formatClock(seconds: number) {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStoicProgressMessage(pct: number, isRunning: boolean, hasElapsed: boolean): string {
  if (pct >= 95) return 'Почти закончил';
  if (pct >= 80) return 'Финиш рядом';
  if (pct >= 55) return 'Ты уже в потоке';
  if (pct >= 30) return 'Ты держишь курс';
  if (pct > 5) return 'Ты набираешь ход';
  if (hasElapsed && !isRunning) return 'Пауза тоже часть движения';
  return 'Ты только начал';
}

/**
 * Прогресс выбранной задачи за сегодня:
 * сохранённые сессии из БД + текущая незасохранённая сессия.
 * Для нетаймерных задач — completion_percent из task_progress.
 */
/**
 * Прогресс выбранной задачи за сегодня.
 * Всегда читаем timer_sessions (savedSec) + текущую незасохранённую сессию (elapsedTimeSec).
 * Цель определяется по cfg_target_hours задачи; если нет — по targetSec виджета (только в режиме timer).
 * В режиме stopwatch без cfg_target_hours цель неизвестна → 0%.
 */
function computeTaskPct(
  db: AuraDatabase | null,
  todayStr: string,
  taskId: string | null,
  cfgTargetHours: number | undefined,
  elapsedTimeSec: number,
  timerMode: 'timer' | 'stopwatch',
  targetSec: number,
): number {
  if (!db || !taskId) return 0;
  try {
    // Сохранённые сессии из БД за сегодня
    const savedSec = Math.max(0, Number(db.getTaskTimerTotal(todayStr, taskId) ?? 0));
    // Текущая (ещё не сохранённая) сессия — учитываем и во время паузы
    const totalSec = savedSec + Math.max(0, elapsedTimeSec);

    // Настоящая цель: cfg_target_hours задачи → иначе targetSec виджета (только в режиме timer)
    const cfgTargetSec = cfgTargetHours != null && Number(cfgTargetHours) > 0
      ? Math.floor(Number(cfgTargetHours) * 3600)
      : 0;
    const realTargetSec = cfgTargetSec > 0
      ? cfgTargetSec
      : timerMode === 'timer' ? targetSec : 0;

    if (realTargetSec <= 0) return 0;
    return Math.round(Math.min(100, (totalSec / realTargetSec) * 100));
  } catch { return 0; }
}

export function TimerFullscreenDialog({
  open,
  lockClose,
  db,
  dayLocked,
  selectedTask,
  timerType,
  isRunning,
  elapsedTimeSec,
  targetDurationSec,
  displayTime,
  accent,
  onOpenChange,
  onTimerTypeChange,
  onStart,
  onPause,
  onStopAndSave,
}: Props) {
  const { theme, setTheme } = useAuraTheme();

  const setThemeAndSave = useCallback((mode: typeof theme) => {
    setTheme(mode);
    if (!db) return;
    try {
      const cur = (db.getAppSettings() ?? {}) as AuraRow;
      db.saveAppSettings({ ...cur, id: String(cur.id ?? 'app_settings_1'), theme_mode: mode });
    } catch { /* ignore */ }
  }, [db, setTheme]);

  const [dialMode, setDialMode] = useState<TimerDialMode>('time');
  const [breakPhase, setBreakPhase] = useState<BreakPhase>('idle');
  const [breakRemainingSec, setBreakRemainingSec] = useState(BREAK_DURATION_SEC);
  const [hoveredAmbientLabel, setHoveredAmbientLabel] = useState('');

  // ─── Cursor idle detection ─────────────────────────────────────────────────
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), IDLE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!open) { setIsIdle(false); if (idleTimerRef.current) clearTimeout(idleTimerRef.current); return; }
    resetIdle();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [open, resetIdle]);

  // ─── Daily progress ────────────────────────────────────────────────────────
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dailyPct, setDailyPct] = useState(0);

  useEffect(() => {
    if (!open || !db || !selectedTask) { setDailyPct(0); return; }
    setDailyPct(computeTaskPct(
      db, todayStr, selectedTask.id,
      selectedTask.cfg_target_hours,
      elapsedTimeSec,
      timerType,
      targetDurationSec,
    ));
  }, [open, db, todayStr, selectedTask, elapsedTimeSec, isRunning, targetDurationSec, timerType]);

  // ─── Break & ambient ───────────────────────────────────────────────────────
  const previousTrackBeforeBreakRef = useRef('');
  const shouldResumeTimerAfterBreakRef = useRef(false);

  const hasTask = Boolean(selectedTask);
  const canStart = hasTask && !dayLocked;
  const shouldPlayAmbient = open && ((breakPhase === 'countdown') || (breakPhase === 'idle' && isRunning));

  const ambient = useAmbientAudio({ open, db, timerType, shouldPlay: shouldPlayAmbient });
  const { trackId: ambientTrackId, setTrackId: setAmbientTrackId, volume: ambientVolume,
    tracks: ambientTracks, defaults: ambientDefaults, expanded: ambientExpanded,
    setExpanded: setAmbientExpanded, currentTrack: currentAmbientTrack,
    userPickedRef: userPickedAmbientRef, seekRandomly: seekAmbientRandomly,
  } = ambient;

  const canCycleDial = timerType === 'timer' && targetDurationSec > 0 && (isRunning || elapsedTimeSec > 0);
  const canChangeTimerType = !isRunning && elapsedTimeSec <= 0 && breakPhase === 'idle' && !dayLocked;
  const ringPct = timerType === 'timer' && targetDurationSec > 0
    ? Math.min(100, Math.max(0, (elapsedTimeSec / targetDurationSec) * 100))
    : 0;
  const progressHint = useMemo(
    () => getStoicProgressMessage(ringPct, isRunning, elapsedTimeSec > 0),
    [elapsedTimeSec, isRunning, ringPct]
  );

  type AmbientOption = { value: string; label: string; icon?: React.ReactNode; coverImage?: string };
  const ambientOptions = useMemo<AmbientOption[]>(
    () => [
      { value: '', label: 'Без музыки', icon: <MoonStar className="size-3 shrink-0" /> },
      ...ambientTracks.map((t) => ({
        value: t.id,
        label: formatAmbientTrackName(t.name),
        coverImage: t.coverImage,
        icon: <AuraThemedIcon name={t.icon ?? null} size={12} muted />,
      })),
    ],
    [ambientTracks]
  );

  useEffect(() => {
    if (!canCycleDial && dialMode !== 'time') setDialMode('time');
  }, [canCycleDial, dialMode]);

  useEffect(() => {
    if (!ambientExpanded) setHoveredAmbientLabel('');
  }, [ambientExpanded]);

  const cycleDialMode = useCallback(() => {
    if (!canCycleDial) return;
    setDialMode((c) => c === 'time' ? 'quote' : 'time');
  }, [canCycleDial]);

  useEffect(() => {
    if (!open) {
      setBreakPhase('idle');
      setBreakRemainingSec(BREAK_DURATION_SEC);
      previousTrackBeforeBreakRef.current = '';
      shouldResumeTimerAfterBreakRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || breakPhase !== 'countdown') return;
    const id = window.setInterval(() => setBreakRemainingSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [open, breakPhase]);

  useEffect(() => {
    if (!open || breakPhase !== 'countdown' || breakRemainingSec > 0) return;
    playTimerTone('break_finish');
    setBreakPhase('alarm');
    sendFocusWindow();
  }, [open, breakPhase, breakRemainingSec]);

  useEffect(() => {
    if (!open || breakPhase !== 'alarm') return;
    const first = window.setTimeout(() => playTimerTone('break_alarm'), BREAK_ALARM_REPEAT_MS);
    const repeat = window.setInterval(() => playTimerTone('break_alarm'), BREAK_ALARM_REPEAT_MS * 2);
    return () => { window.clearTimeout(first); window.clearInterval(repeat); };
  }, [open, breakPhase]);

  const handleCloseRequest = useCallback(() => {
    if (lockClose) return;
    if (breakPhase !== 'idle') {
      const restore = previousTrackBeforeBreakRef.current;
      setBreakPhase('idle');
      setBreakRemainingSec(BREAK_DURATION_SEC);
      setAmbientTrackId(restore || '');
      previousTrackBeforeBreakRef.current = '';
      shouldResumeTimerAfterBreakRef.current = false;
    }
    if (isRunning) onPause();
    onOpenChange(false);
  }, [breakPhase, isRunning, lockClose, onOpenChange, onPause, setAmbientTrackId]);

  const startBreak = useCallback(() => {
    previousTrackBeforeBreakRef.current = ambientTrackId;
    shouldResumeTimerAfterBreakRef.current = isRunning;
    if (isRunning) onPause();
    setBreakRemainingSec(BREAK_DURATION_SEC);
    setBreakPhase('countdown');
    if (ambientDefaults.break) { userPickedAmbientRef.current = false; setAmbientTrackId(ambientDefaults.break); }
    else setAmbientTrackId('');
  }, [ambientDefaults.break, ambientTrackId, isRunning, onPause, setAmbientTrackId, userPickedAmbientRef]);

  const finishBreak = useCallback(
    (resumeTimer: boolean) => {
      setBreakPhase('idle');
      setBreakRemainingSec(BREAK_DURATION_SEC);
      setAmbientTrackId(previousTrackBeforeBreakRef.current || '');
      if (resumeTimer && shouldResumeTimerAfterBreakRef.current && !isRunning && hasTask && !dayLocked) onStart();
      previousTrackBeforeBreakRef.current = '';
      shouldResumeTimerAfterBreakRef.current = false;
    },
    [dayLocked, hasTask, isRunning, onStart, setAmbientTrackId]
  );

  const subtitle =
    breakPhase === 'alarm' ? 'Перерыв закончен' :
    breakPhase === 'countdown' ? 'Перерыв' :
    elapsedTimeSec > 0 && !isRunning ? 'На паузе' :
    !isRunning ? 'Готов к старту' :
    null;

  const volumeTrackStyle = useMemo(() => {
    const pct = Math.max(0, Math.min(100, ambientVolume));
    return {
      background: `linear-gradient(90deg, ${accent} 0%, ${accent} ${pct}%, color-mix(in oklab, ${accent} 10%, var(--aura-surface-control)) ${pct}%, color-mix(in oklab, ${accent} 10%, var(--aura-surface-control)) 100%)`,
      accentColor: accent,
    };
  }, [accent, ambientVolume]);

  const displayValue = useMemo(() => {
    if (breakPhase === 'alarm') return formatClock(0);
    if (breakPhase === 'countdown') return formatClock(breakRemainingSec);
    return displayTime;
  }, [breakPhase, breakRemainingSec, displayTime]);
  const fullscreenDialRef = useRef<HTMLButtonElement | null>(null);
  const fullscreenTimeRef = useRef<HTMLSpanElement | null>(null);
  const [fullscreenTimeFontPx, setFullscreenTimeFontPx] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (dialMode !== 'time') return;
    const dialEl = fullscreenDialRef.current;
    const textEl = fullscreenTimeRef.current;
    if (!dialEl || !textEl) return;

    let raf = 0;
    const fit = () => {
      const width = dialEl.getBoundingClientRect().width;
      if (!width) return;
      const maxSize = Math.max(44, Math.min(92, width * 0.24));
      const available = width * 0.86;
      textEl.style.fontSize = `${maxSize}px`;
      const measured = textEl.getBoundingClientRect().width;
      const next = measured > available
        ? Math.max(34, Math.floor(maxSize * (available / measured)))
        : maxSize;
      setFullscreenTimeFontPx((current) => Math.abs((current ?? 0) - next) > 0.5 ? next : current);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    schedule();
    void document.fonts?.ready.then(schedule);
    return () => cancelAnimationFrame(raf);
  }, [dialMode, displayValue]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) { onOpenChange(true); return; }
        if (lockClose) return;
        handleCloseRequest();
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-aura-fullscreen=""
        className="fixed inset-0 h-svh w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-background p-0 ring-0 sm:max-w-none"
        onMouseMove={resetIdle}
        onPointerMove={resetIdle}
        onEscapeKeyDown={(e) => {
          if (lockClose) { e.preventDefault(); return; }
          if (breakPhase === 'alarm') { e.preventDefault(); return; }
          if (breakPhase === 'countdown') { e.preventDefault(); finishBreak(false); return; }
          handleCloseRequest();
        }}
        onKeyDownCapture={(e) => {
          const target = e.target as HTMLElement | null;
          const tag = target?.tagName?.toLowerCase();
          const isTextInput = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
          if (isTextInput) return;
          if (e.metaKey || e.ctrlKey || e.altKey || e.key === ' ' || e.key === 'Enter') {
            e.stopPropagation();
            if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">Полноэкранный таймер</DialogTitle>
        <DialogDescription className="sr-only">Управление таймером и перерывом.</DialogDescription>

        {/* ── Фон ── */}
        <div className="pointer-events-none absolute inset-0 bg-background" aria-hidden />

        {/* ── Мягкая тональная подложка ── */}
        <div
          aria-hidden
          className="aura-timer-halo pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 480,
            height: 480,
            background: `radial-gradient(circle, color-mix(in oklab, ${accent} ${isRunning ? 10 : 5}%, transparent) 0%, transparent 68%)`,
            filter: 'blur(32px)',
            transition: 'opacity 1.2s ease, background 1.2s ease',
            opacity: breakPhase === 'alarm' ? 0.2 : 1,
          }}
        />


        {/* ── Тема + закрыть (прячутся при idle) ── */}
        <div
          className="absolute top-5 right-5 z-10 flex items-center gap-2 transition-all duration-500 ease-out"
          style={{ opacity: isIdle ? 0 : 1, pointerEvents: isIdle ? 'none' : 'auto' }}
        >
          <div className="flex items-center gap-0.5 rounded-full border border-soft bg-control/80 p-1 backdrop-blur-sm">
            {([
              { value: 'light' as const, Icon: Sun },
              { value: 'tinted' as const, Icon: Sunset },
              { value: 'dark' as const, Icon: Moon },
            ] as const).map(({ value, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setThemeAndSave(value)}
                aria-label={value}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full transition',
                  theme === value
                    ? 'bg-panel text-foreground shadow-sm'
                    : 'text-faint hover:text-dim'
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>

          {!lockClose && (
            <button
              type="button"
              onClick={handleCloseRequest}
              className="flex size-9 items-center justify-center rounded-full border border-soft bg-control/80 text-dim backdrop-blur-sm transition hover:bg-hover hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <main className="relative h-full w-full overflow-hidden px-5 py-5 sm:px-8 sm:py-7">
          <section className="relative z-[1] h-full min-h-0 w-full">

            {/* ── Заголовок: задача + прогресс (прячется при idle) ── */}
	            <div
	              className="absolute left-1/2 top-7 flex w-[min(20rem,82vw)] -translate-x-1/2 flex-col items-center gap-2 transition-all duration-500 ease-out"
              style={{ opacity: isIdle ? 0 : 1, pointerEvents: isIdle ? 'none' : 'auto' }}
            >
              {/* Пилюля: иконка задачи + название */}
              {breakPhase === 'idle' && selectedTask ? (
                <div
                  className="aura-operator-row flex max-w-full items-center gap-2 rounded-full border border-transparent px-3 py-1.5"
                  style={{ backgroundColor: `color-mix(in oklab, ${accent} 7%, transparent)` }}
                >
                  <span className="aura-icon-plate flex size-5 shrink-0 items-center justify-center rounded border" style={{ '--aura-list-icon-tint': accent } as CSSProperties} aria-hidden>
                    <AuraThemedIcon name={typeof selectedTask.icon === 'string' ? selectedTask.icon : null} tint="currentColor" size={12} />
                  </span>
                  <span className="aura-operator-kpi min-w-0 truncate text-xs font-medium" style={{ color: accent }}>{selectedTask.title}</span>
                </div>
              ) : breakPhase !== 'idle' ? (
                <div className="flex items-center gap-2 rounded-full px-3 py-1.5">
                  <Coffee className="size-3.5 text-dim" />
                  <span className="text-xs font-medium text-dim">Перерыв</span>
                </div>
              ) : null}

              {/* Прогресс цели дня — всегда видна дорожка */}
              {breakPhase === 'idle' ? (
	                  <div className="flex w-full flex-col gap-1">
                  <div
                    className="aura-operator-list-meter w-full overflow-hidden rounded-full"
                    style={{
                      height: 5,
                      backgroundColor: `color-mix(in oklab, ${accent} 14%, var(--aura-surface-control))`,
                    }}
                  >
                      <div
                        className="aura-data-fill"
                        style={{
                          height: '100%',
                        width: `${dailyPct}%`,
                        borderRadius: 'inherit',
                        background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 70%, transparent), ${accent})`,
                        boxShadow: `0 0 6px color-mix(in oklab, ${accent} 55%, transparent)`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-center px-0.5">
                    <span className="aura-operator-kpi text-[10px] font-bold tabular-nums" style={{ color: dailyPct > 0 ? accent : 'var(--aura-text-disabled)' }}>{dailyPct}%</span>
                  </div>
                </div>
              ) : null}

              {subtitle ? (
                <div className="flex items-center gap-2">
                  {breakPhase === 'alarm' ? <span className="size-1.5 animate-ping rounded-full bg-destructive" /> : null}
                  <span className="text-nano font-semibold uppercase tracking-[0.28em] text-faint">{subtitle}</span>
                </div>
              ) : null}

              {canChangeTimerType ? (
                <div className="flex max-w-[13rem] items-center gap-1 rounded-full bg-control/45 p-0.5">
                  {([
                    { value: 'timer' as const, label: 'Таймер', icon: Timer },
                    { value: 'stopwatch' as const, label: 'Секундомер', icon: Watch },
                  ]).map((opt) => {
                    const Icon = opt.icon;
                    const selected = timerType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!canChangeTimerType}
                        onClick={() => onTimerTypeChange(opt.value)}
                        className={cn(
                          'aura-operator-control flex h-7 min-w-0 flex-1 items-center justify-center rounded-full px-2.5 text-xs font-medium transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-45',
                          selected ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                        )}
                        style={selected ? { backgroundColor: accent } : undefined}
                        aria-pressed={selected}
                      >
                        <Icon className="size-3.5 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="absolute left-1/2 top-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4">
              {/* ── Таймер + hint (всегда видны) ── */}
              <button
                ref={fullscreenDialRef}
                type="button"
		                className="flex w-[min(32rem,82vw)] min-w-0 flex-col items-center justify-center gap-2 outline-none select-none transition-transform duration-300 ease-out active:scale-[0.998]"
                onClick={cycleDialMode}
                disabled={!canCycleDial}
                onPointerDown={(e) => e.preventDefault()}
                aria-label={canCycleDial ? 'Переключить режим отображения' : undefined}
              >
                {dialMode === 'quote' && breakPhase === 'idle' ? (
	                  <div key="quote" className="flex max-w-sm flex-col items-center justify-center gap-4 text-center">
	                    <span className="aura-operator-kpi text-3xl font-light leading-tight transition-colors duration-300 max-sm:text-2xl" style={{ color: accent }}>{progressHint}</span>
	                  </div>
                ) : (
                  <span
                    ref={fullscreenTimeRef}
                    key="time"
	                    className="max-w-full leading-none tabular-nums tracking-tight"
	                    style={{
	                      fontSize: fullscreenTimeFontPx ? `${fullscreenTimeFontPx}px` : 'clamp(2.75rem, 7vw, 5.75rem)',
	                      fontWeight: 100,
                      color: accent,
                      textShadow: isRunning
                        ? `0 0 60px color-mix(in oklab, ${accent} 30%, transparent), 0 0 20px color-mix(in oklab, ${accent} 18%, transparent)`
                        : 'none',
                      transition: 'text-shadow 1.2s ease',
                    }}
                  >
                    {displayValue}
                  </span>
                )}
                {breakPhase === 'idle' && dialMode === 'time' ? (
	                  <span className="text-[11px] font-medium text-subtle">{progressHint}</span>
	                ) : null}
	              </button>
	
	              {/* ── Ambient signal ── */}
	              <div className="relative flex size-[min(13.5rem,26vh)] min-h-[8.75rem] min-w-[8.75rem] shrink-0 items-center justify-center">
		                <button
	                  type="button"
	                  onClick={() => setAmbientExpanded((v) => !v)}
	                  className={cn(
	                    'relative outline-none transition-all duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring/50',
	                    ambientExpanded && 'scale-[0.96] opacity-35 blur-[0.5px]'
	                  )}
	                  aria-label={ambientExpanded ? 'Скрыть треки' : 'Выбрать трек'}
	                  aria-expanded={ambientExpanded}
	                >
	                  <VinylRecord
	                    coverImage={currentAmbientTrack?.coverImage}
	                    accent={accent}
	                    isPlaying={shouldPlayAmbient && !!currentAmbientTrack}
	                    size={176}
	                    className="relative"
	                  />
                </button>
	                {ambientExpanded ? (
	                  <div className="absolute left-1/2 top-1/2 z-50 flex w-[min(23rem,84vw)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2.5">
	                    <div className="h-7">
	                      {hoveredAmbientLabel ? (
	                        <div className="inline-flex max-w-[min(22rem,80vw)] items-center rounded-full bg-background/94 px-3.5 py-1.5 text-sm font-medium leading-none text-foreground shadow-sm backdrop-blur">
	                          <span className="truncate">{hoveredAmbientLabel}</span>
	                        </div>
	                      ) : null}
	                    </div>
	                    <div className="aura-operator-panel flex max-w-full gap-2 overflow-x-auto rounded-full bg-background/88 p-2 shadow-md backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
	                      {ambientOptions.map((opt) => {
	                        const selected = ambientTrackId === opt.value;
	                        return (
	                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { userPickedAmbientRef.current = true; setAmbientTrackId(opt.value); setAmbientExpanded(false); setHoveredAmbientLabel(''); }}
                            onMouseEnter={() => setHoveredAmbientLabel(opt.label)}
                            onMouseLeave={() => setHoveredAmbientLabel('')}
                            onFocus={() => setHoveredAmbientLabel(opt.label)}
                            onBlur={() => setHoveredAmbientLabel('')}
	                            className="aura-operator-control flex size-14 shrink-0 items-center justify-center rounded-full outline-none transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/50"
	                            style={selected ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
	                            aria-label={opt.label}
	                            aria-pressed={selected}
	                          >
	                            <span className="aura-operator-signal relative flex size-12 items-center justify-center overflow-hidden rounded-full bg-neutral-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                              {opt.coverImage ? (
                                <span className="absolute inset-[13%] overflow-hidden rounded-full">
                                  <img src={opt.coverImage} alt="" className="h-full w-full object-cover object-center" draggable={false} />
                                </span>
                              ) : (
                                <span className="aura-icon-plate absolute inset-[13%] flex items-center justify-center rounded-full" style={{ '--aura-list-icon-tint': accent, backgroundColor: `color-mix(in oklab, ${accent} 24%, #111)` } as CSSProperties}>
                                  <MoonStar className="size-3 text-white/70" />
                                </span>
                              )}
                              <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,transparent,rgba(255,255,255,0.08),transparent,rgba(255,255,255,0.05),transparent)]" aria-hidden />
                              <span className="absolute inset-[45%] rounded-full bg-black/70 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]" aria-hidden />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── Монолитная нижняя панель (прячется при idle) ── */}
            <div
	              className="absolute bottom-7 left-1/2 w-[min(20rem,82vw)] -translate-x-1/2 transition-all duration-500 ease-out"
              style={{ opacity: isIdle ? 0 : 1, pointerEvents: isIdle ? 'none' : 'auto' }}
            >
              {/* Единая панель: музыка + управление */}
	              {breakPhase !== 'idle' ? (
	                <div className="flex w-full flex-col items-center gap-2 px-2 py-1">
	                  <button
	                    type="button"
	                    onClick={() => finishBreak(true)}
	                    className="aura-operator-secondary-action flex h-9 min-w-[9rem] items-center justify-center gap-2 rounded-full bg-control/45 px-4 text-xs font-medium text-dim transition hover:bg-hover hover:text-foreground active:scale-[0.97]"
	                  >
	                    <Timer className="size-3.5 shrink-0" />
	                    {breakPhase === 'alarm' ? 'Продолжить' : 'Завершить'}
	                  </button>
	                  {breakPhase === 'alarm' ? <span className="text-nano text-faint">Сигнал остановится автоматически</span> : null}
	                </div>
              ) : (
                <div
                  className="flex w-full flex-col gap-3"
                >
                  {/* Строка: шаффл + громкость */}
	                  <div className="mx-auto flex w-full items-center gap-2 px-2">
                    <button
                      type="button"
                      onClick={seekAmbientRandomly}
                      disabled={!currentAmbientTrack}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-faint transition-all duration-200 hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Случайный момент"
                    >
                      <Shuffle className="size-3.5" />
                    </button>
                    <div className="flex flex-1 items-center gap-2.5">
                      {ambientVolume <= 0
                        ? <VolumeX className="size-3.5 shrink-0 text-faint" />
                        : <Volume1 className="size-3.5 shrink-0 text-faint" />}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={ambientVolume}
                        onChange={(e) => ambient.setVolume(Number(e.target.value))}
                        className="h-px min-w-0 flex-1 cursor-pointer appearance-none rounded-full opacity-80"
                        style={volumeTrackStyle}
                        aria-label="Громкость"
                      />
                    </div>
                  </div>

                  {/* Строка: play controls */}
	                  <div className="mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => { onOpenChange(false); window.requestAnimationFrame(() => onStopAndSave()); }}
                      disabled={!isRunning && elapsedTimeSec <= 0}
                      className="justify-self-start flex size-9 items-center justify-center rounded-full text-faint transition-all duration-200 hover:text-destructive active:scale-95 disabled:pointer-events-none disabled:opacity-20"
                      aria-label="Стоп и сохранить"
                    >
                      <Square className="size-3.5 fill-current" />
                    </button>
                    <button
                      type="button"
                      disabled={!canStart && !isRunning}
                      onClick={isRunning ? onPause : onStart}
                      className="aura-operator-primary-action flex size-12 items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-[1.035] active:scale-[0.94] disabled:opacity-35"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${accent} 92%, var(--foreground))`,
                        boxShadow: isRunning
                          ? `0 0 0 4px color-mix(in oklab, ${accent} 10%, transparent)`
                          : `0 0 0 4px color-mix(in oklab, ${accent} 7%, transparent)`,
                        transition: 'box-shadow 0.6s ease',
                      }}
                      aria-label={isRunning ? 'Пауза' : 'Старт'}
                    >
                      {isRunning ? <Pause className="size-[1.125rem] fill-current text-white" /> : <Play className="size-[1.125rem] translate-x-0.5 fill-current text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={startBreak}
                      disabled={!isRunning}
                      className="justify-self-end flex size-9 items-center justify-center rounded-full text-faint transition-all duration-200 hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-20"
                      aria-label="Перерыв 15 минут"
                    >
                      <Coffee className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </DialogContent>
    </Dialog>
  );
}
