import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Coffee, Moon, MoonStar, Pause, Play, Shuffle, Square, Sun, Timer, Volume1, VolumeX, Watch, X } from 'lucide-react';
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

  type AmbientOption = { value: string; label: string; icon?: React.ReactNode };
  const ambientOptions = useMemo<AmbientOption[]>(
    () => [
      { value: '', label: 'Без музыки', icon: <MoonStar className="size-3 shrink-0" /> },
      ...ambientTracks.map((t) => ({
        value: t.id,
        label: formatAmbientTrackName(t.name),
        icon: <AuraThemedIcon name={t.icon ?? null} size={12} muted />,
      })),
    ],
    [ambientTracks]
  );

  useEffect(() => {
    if (!canCycleDial && dialMode !== 'time') setDialMode('time');
  }, [canCycleDial, dialMode]);

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

        {/* ── Ambient glow — большое свечение за винилом ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 480,
            height: 480,
            background: `radial-gradient(circle, color-mix(in oklab, ${accent} ${isRunning ? 18 : 8}%, transparent) 0%, transparent 70%)`,
            filter: 'blur(48px)',
            transition: 'opacity 1.2s ease, background 1.2s ease',
            opacity: breakPhase === 'alarm' ? 0.3 : 1,
            animation: isRunning && breakPhase === 'idle' ? 'aura-timer-glow-pulse 4s ease-in-out infinite' : 'none',
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
              { value: 'dim' as const, Icon: MoonStar },
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

        <main className="relative flex h-full w-full items-center justify-center overflow-y-auto overscroll-y-contain px-6 py-6">
          <section className="relative z-[1] flex w-full max-w-[22rem] flex-col items-center gap-4 px-4 py-8">

            {/* ── Заголовок: задача + прогресс (прячется при idle) ── */}
            <div
              className="flex flex-col items-center gap-2 transition-all duration-500 ease-out"
              style={{ opacity: isIdle ? 0 : 1, pointerEvents: isIdle ? 'none' : 'auto' }}
            >
              {/* Пилюля: иконка задачи + название */}
              {breakPhase === 'idle' && selectedTask ? (
                <div
                  className="flex w-full items-center gap-3 rounded-full px-4 py-2"
                  style={{ backgroundColor: `color-mix(in oklab, ${accent} 9%, var(--aura-surface-control))` }}
                >
                  <AuraThemedIcon name={typeof selectedTask.icon === 'string' ? selectedTask.icon : null} tint={accent} size={14} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: accent }}>{selectedTask.title}</span>
                </div>
              ) : breakPhase !== 'idle' ? (
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Coffee className="size-4 text-dim" />
                  <span className="text-sm font-semibold text-dim">Перерыв</span>
                </div>
              ) : null}

              {/* Прогресс цели дня — всегда видна дорожка */}
              {breakPhase === 'idle' ? (
                <div className="flex w-full flex-col gap-1">
                  <div
                    className="w-full overflow-hidden rounded-full"
                    style={{
                      height: 5,
                      backgroundColor: `color-mix(in oklab, ${accent} 14%, var(--aura-surface-control))`,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${dailyPct}%`,
                        minWidth: dailyPct > 0 ? 6 : 0,
                        borderRadius: 'inherit',
                        background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 70%, transparent), ${accent})`,
                        boxShadow: `0 0 6px color-mix(in oklab, ${accent} 55%, transparent)`,
                        transition: 'width 1s ease',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-medium text-faint">Цель задачи</span>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: dailyPct > 0 ? accent : 'var(--aura-text-disabled)' }}>{dailyPct}%</span>
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
                <div className="flex w-full max-w-[19rem] items-center gap-1 rounded-full bg-white/10 p-1">
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
                          'flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-45',
                          selected ? 'text-white shadow-sm' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                        )}
                        style={selected ? { backgroundColor: accent } : undefined}
                        aria-pressed={selected}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* ── Таймер + hint (всегда видны) ── */}
            <button
              type="button"
              className="flex w-full min-w-0 flex-col items-center justify-center gap-2 outline-none select-none transition-transform duration-300 ease-out active:scale-[0.998]"
              onClick={cycleDialMode}
              disabled={!canCycleDial}
              onPointerDown={(e) => e.preventDefault()}
              aria-label={canCycleDial ? 'Переключить режим отображения' : undefined}
            >
              {dialMode === 'quote' && breakPhase === 'idle' ? (
                <div key="quote" className="flex max-w-sm animate-in fade-in-0 zoom-in-95 flex-col items-center justify-center gap-4 text-center duration-300">
                  <span className="text-4xl font-light leading-tight transition-colors duration-300 max-sm:text-3xl" style={{ color: accent }}>{progressHint}</span>
                </div>
              ) : (
                <span
                  key="time"
                  className="animate-in fade-in-0 zoom-in-95 leading-none tabular-nums tracking-tight duration-300"
                  style={{
                    fontSize: 'clamp(4rem, 11vw, 9rem)',
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
                <span className="text-sm font-medium text-subtle">{progressHint}</span>
              ) : null}
            </button>

            {/* ── Vinyl ── */}
            <div className="relative flex size-[15rem] shrink-0 items-center justify-center max-sm:size-[12rem]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, color-mix(in oklab, ${accent} ${shouldPlayAmbient && currentAmbientTrack ? 26 : 8}%, transparent) 30%, transparent 70%)`,
                  filter: 'blur(20px)',
                  transition: 'background 1.2s ease',
                  animation: shouldPlayAmbient && currentAmbientTrack ? 'aura-timer-vinyl-pulse 3s ease-in-out infinite' : 'none',
                }}
              />
              <VinylRecord
                coverImage={currentAmbientTrack?.coverImage}
                accent={accent}
                isPlaying={shouldPlayAmbient && !!currentAmbientTrack}
                size={210}
                className="relative drop-shadow-md"
              />
            </div>

            {/* ── Монолитная нижняя панель (прячется при idle) ── */}
            <div
              className="relative w-full transition-all duration-500 ease-out"
              style={{ opacity: isIdle ? 0 : 1, pointerEvents: isIdle ? 'none' : 'auto' }}
            >
              {/* Всплывающий список треков — над панелью */}
              {ambientExpanded ? (
                <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-white/8 bg-panel shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                  <div className="max-h-52 overflow-y-auto overscroll-contain p-1.5">
                    {ambientOptions.map((opt) => {
                      const selected = ambientTrackId === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { userPickedAmbientRef.current = true; setAmbientTrackId(opt.value); setAmbientExpanded(false); }}
                          className={cn(
                            'flex h-11 w-full min-w-0 items-center gap-3 rounded-[1.1rem] px-3 text-left text-sm transition-all duration-150 active:scale-[0.99]',
                            selected ? 'font-semibold' : 'text-dim hover:bg-white/8 hover:text-foreground'
                          )}
                          style={selected ? { backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent } : undefined}
                        >
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-xl"
                            style={selected ? { backgroundColor: `color-mix(in oklab, ${accent} 22%, transparent)` } : { backgroundColor: 'color-mix(in oklab, currentColor 8%, transparent)' }}
                          >
                            {opt.icon}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                          {selected && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Единая панель: музыка + управление */}
              {breakPhase !== 'idle' ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl bg-control/60 px-6 py-5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => finishBreak(true)}
                    className="flex h-12 items-center gap-2.5 rounded-full bg-foreground px-8 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
                  >
                    <Timer className="size-4 shrink-0" />
                    {breakPhase === 'alarm' ? 'Вернуться к таймеру' : 'Прервать перерыв'}
                  </button>
                  {breakPhase === 'alarm' ? <span className="text-nano text-faint">Сигнал остановится автоматически</span> : null}
                </div>
              ) : (
                <div
                  className="flex w-full flex-col overflow-hidden rounded-3xl backdrop-blur-sm transition-all duration-500 ease-out"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${accent} 5%, var(--aura-surface-control))`,
                    border: `1px solid color-mix(in oklab, ${accent} ${isRunning ? 16 : 8}%, transparent)`,
                    boxShadow: isRunning
                      ? `0 0 0 1px color-mix(in oklab, ${accent} 10%, transparent) inset, 0 8px 32px color-mix(in oklab, ${accent} 6%, transparent)`
                      : 'none',
                    transition: 'box-shadow 1s ease, border-color 1s ease',
                  }}
                >
                  {/* Строка: трек */}
                  <button
                    type="button"
                    onClick={() => setAmbientExpanded((v) => !v)}
                    className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/5 active:bg-white/8"
                    aria-label={ambientExpanded ? 'Скрыть треки' : 'Выбрать трек'}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                      style={{ backgroundColor: `color-mix(in oklab, ${accent} 15%, transparent)` }}
                    >
                      {currentAmbientTrack
                        ? <AuraThemedIcon name={currentAmbientTrack.icon ?? null} size={16} tint={accent} />
                        : <MoonStar className="size-4" style={{ color: accent }} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                        {currentAmbientTrack ? formatAmbientTrackName(currentAmbientTrack.name) : 'Без музыки'}
                      </span>
                      <span className="block text-[11px] text-faint">Фоновая музыка</span>
                    </span>
                    <ChevronDown className={cn('size-4 shrink-0 text-faint transition-all duration-200', ambientExpanded && '-rotate-180')} />
                  </button>

                  {/* Разделитель */}
                  <div className="mx-4 h-px" style={{ backgroundColor: `color-mix(in oklab, ${accent} 8%, var(--aura-border-soft))` }} />

                  {/* Строка: шаффл + громкость */}
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={seekAmbientRandomly}
                      disabled={!currentAmbientTrack}
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl text-dim transition-all duration-200 hover:bg-white/8 hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Случайный момент"
                    >
                      <Shuffle className="size-4" />
                    </button>
                    <div className="flex flex-1 items-center gap-2.5">
                      {ambientVolume <= 0
                        ? <VolumeX className="size-4 shrink-0 text-faint" />
                        : <Volume1 className="size-4 shrink-0" style={{ color: accent }} />}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={ambientVolume}
                        onChange={(e) => ambient.setVolume(Number(e.target.value))}
                        className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full"
                        style={volumeTrackStyle}
                        aria-label="Громкость"
                      />
                      <span className="w-8 text-right text-xs tabular-nums text-faint">{ambientVolume}%</span>
                    </div>
                  </div>

                  {/* Разделитель */}
                  <div className="mx-4 h-px" style={{ backgroundColor: `color-mix(in oklab, ${accent} 8%, var(--aura-border-soft))` }} />

                  {/* Строка: play controls */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <button
                      type="button"
                      onClick={() => { onOpenChange(false); window.requestAnimationFrame(() => onStopAndSave()); }}
                      disabled={!isRunning && elapsedTimeSec <= 0}
                      className="flex size-11 items-center justify-center rounded-2xl text-dim transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Стоп и сохранить"
                    >
                      <Square className="size-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      disabled={!canStart && !isRunning}
                      onClick={isRunning ? onPause : onStart}
                      className="flex size-16 items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-[1.04] active:scale-[0.93] disabled:opacity-35"
                      style={{
                        backgroundColor: accent,
                        boxShadow: isRunning
                          ? `0 0 0 7px color-mix(in oklab, ${accent} 14%, transparent), 0 0 28px color-mix(in oklab, ${accent} 22%, transparent)`
                          : `0 0 0 7px color-mix(in oklab, ${accent} 9%, transparent)`,
                        transition: 'box-shadow 0.6s ease',
                      }}
                      aria-label={isRunning ? 'Пауза' : 'Старт'}
                    >
                      {isRunning ? <Pause className="size-6 fill-current text-white" /> : <Play className="size-6 translate-x-0.5 fill-current text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={startBreak}
                      disabled={!isRunning}
                      className="flex size-11 items-center justify-center rounded-2xl text-dim transition-all duration-200 hover:bg-hover hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Перерыв 15 минут"
                    >
                      <Coffee className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ── Keyframes (инлайн, чтобы не трогать globals.css) ── */}
        <style>{`
          @keyframes aura-timer-glow-pulse {
            0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
            50%       { opacity: 1;    transform: translate(-50%, -50%) scale(1.12); }
          }
          @keyframes aura-timer-vinyl-pulse {
            0%, 100% { opacity: 0.7; transform: scale(0.85); }
            50%       { opacity: 1;   transform: scale(0.95); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
