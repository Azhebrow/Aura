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

const BREAK_DURATION_SEC = 15 * 60;
const BREAK_ALARM_REPEAT_MS = 2400;

type BreakPhase = 'idle' | 'countdown' | 'alarm';
type TimerDialMode = 'time' | 'ring' | 'quote';
import type { AmbientTrack, AmbientDefaults } from '@/features/timer/use-ambient-audio';

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

function BigRingDial({
  pct,
  accent,
  label,
  sublabel,
}: {
  pct: number;
  accent: string;
  label: string;
  sublabel?: string;
}) {
  const size = 260;
  const strokeW = 6;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 absolute inset-0"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={`color-mix(in oklab, ${accent} 10%, transparent)`}
          strokeWidth={strokeW}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={accent}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      {/* Center content */}
      <div className="relative flex flex-col items-center gap-1 text-center">
        <span
          className="font-light tabular-nums leading-none tracking-tight"
          style={{ fontSize: '3.5rem', color: accent }}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-xs font-medium text-[var(--aura-text-subtle)]">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

function formatRemainingText(remainingSec: number): string {
  const safe = Math.max(0, Math.floor(remainingSec));
  const mins = Math.ceil(safe / 60);
  if (safe <= 0) return 'Цель закрыта';
  if (safe < 60) return '< 1 мин';
  return `~${mins} мин`;
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

type VinylAmbientPanelProps = {
  accent: string;
  currentAmbientTrack: import('@/features/timer/use-ambient-audio').AmbientTrack | null;
  ambientTrackId: string;
  ambientVolume: number;
  ambientExpanded: boolean;
  ambientOptions: { value: string; label: string; icon?: React.ReactNode }[];
  volumeTrackStyle: React.CSSProperties;
  isPlaying: boolean;
  onSeekRandom: () => void;
  onVolumeChange: (v: number) => void;
  onSelectTrack: (id: string) => void;
  onToggleExpand: () => void;
};

function VinylAmbientPanel({
  accent, currentAmbientTrack, ambientTrackId, ambientVolume,
  ambientExpanded, ambientOptions, volumeTrackStyle, isPlaying,
  onSeekRandom, onVolumeChange, onSelectTrack, onToggleExpand,
}: VinylAmbientPanelProps) {
  const trackName = currentAmbientTrack ? formatAmbientTrackName(currentAmbientTrack.name) : null;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <div
        className="grid w-full grid-cols-[5.75rem_minmax(0,1fr)] gap-3 rounded-3xl border bg-[var(--aura-surface-panel)]/88 p-3 shadow-lg shadow-black/5 backdrop-blur-md"
        style={{
          borderColor: `color-mix(in oklab, ${accent} 18%, var(--border))`,
          boxShadow: `0 18px 48px -32px color-mix(in oklab, ${accent} 45%, transparent)`,
        }}
      >
        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-[var(--aura-surface-control)]">
          <VinylRecord
            coverImage={currentAmbientTrack?.coverImage}
            accent={accent}
            isPlaying={isPlaying}
            size={74}
            className="drop-shadow-sm"
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset"
            style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 20%, transparent)` }}
            aria-hidden
          />
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-0.5 text-left transition hover:bg-[var(--aura-action-hover-bg)]"
            aria-label={ambientExpanded ? 'Скрыть треки' : 'Выбрать трек'}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent }}
            >
              {currentAmbientTrack ? (
                <AuraThemedIcon name={currentAmbientTrack.icon ?? null} size={13} tint={accent} />
              ) : (
                <MoonStar className="size-3.5 shrink-0" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold leading-tight text-foreground">
                {trackName ?? 'Без музыки'}
              </p>
              <p className="mt-0.5 text-xs leading-none text-[var(--aura-text-disabled)]">Фоновая музыка</p>
            </div>
            <ChevronDown
              className={cn('size-4 shrink-0 text-[var(--aura-text-disabled)] transition-transform duration-200', ambientExpanded && 'rotate-180')}
            />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSeekRandom}
              disabled={!currentAmbientTrack}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label="Случайный момент"
            >
              <Shuffle className="size-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-2.5 py-1.5">
              {ambientVolume <= 0 ? (
                <VolumeX className="size-4 shrink-0 text-[var(--aura-text-disabled)]" />
              ) : (
                <Volume1 className="size-4 shrink-0" style={{ color: accent }} />
              )}
              <input
                type="range"
                min={0}
                max={100}
                value={ambientVolume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="h-1.5 flex-1 min-w-0 cursor-pointer appearance-none rounded-full"
                style={volumeTrackStyle}
                aria-label="Громкость"
              />
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-[var(--aura-text-disabled)]">
                {ambientVolume}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Track list dropdown */}
      {ambientExpanded && (
        <div className="max-h-44 w-full overflow-y-auto rounded-2xl border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] p-1 shadow-sm">
          {ambientOptions.map((opt) => {
            const selected = ambientTrackId === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectTrack(opt.value)}
                className={cn(
                  'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2.5 text-left text-sm transition',
                  selected
                    ? 'text-foreground'
                    : 'text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground'
                )}
                style={selected ? { backgroundColor: `color-mix(in oklab, ${accent} 16%, transparent)` } : undefined}
              >
                <span className="flex size-5 shrink-0 items-center justify-center">{opt.icon}</span>
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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

  const previousTrackBeforeBreakRef = useRef('');
  const shouldResumeTimerAfterBreakRef = useRef(false);

  const hasTask = Boolean(selectedTask);
  const canStart = hasTask && !dayLocked;
  const shouldPlayAmbient = open && ((breakPhase === 'countdown') || (breakPhase === 'idle' && isRunning));

  const ambient = useAmbientAudio({ open, db, timerType, shouldPlay: shouldPlayAmbient });
  const { trackId: ambientTrackId, setTrackId: setAmbientTrackId, volume: ambientVolume,
    tracks: ambientTracks, defaults: ambientDefaults, expanded: ambientExpanded,
    setExpanded: setAmbientExpanded, currentTrack: currentAmbientTrack,
    userPickedRef: userPickedAmbientRef, dispose: disposeAmbientAudio, seekRandomly: seekAmbientRandomly,
  } = ambient;

  const canCycleDial = timerType === 'timer' && targetDurationSec > 0 && (isRunning || elapsedTimeSec > 0);
  const canChangeTimerType = !isRunning && elapsedTimeSec <= 0 && breakPhase === 'idle' && !dayLocked;
  const ringPct = timerType === 'timer' && targetDurationSec > 0
    ? Math.min(100, Math.max(0, (elapsedTimeSec / targetDurationSec) * 100))
    : 0;
  const remainingSec = Math.max(0, targetDurationSec - elapsedTimeSec);
  const progressHint = useMemo(
    () => getStoicProgressMessage(ringPct, isRunning, elapsedTimeSec > 0),
    [elapsedTimeSec, isRunning, ringPct]
  );
  const remainingTimeText = useMemo(() => formatRemainingText(remainingSec), [remainingSec]);

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
    setDialMode((c) => c === 'time' ? 'ring' : c === 'ring' ? 'quote' : 'time');
  }, [canCycleDial]);

  // Reset break state when dialog closes
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
    isRunning ? 'Сессия идёт' :
    elapsedTimeSec > 0 ? 'На паузе' :
    'Готов к старту';

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

  const breakProgress = breakPhase !== 'idle' ? (breakRemainingSec / BREAK_DURATION_SEC) * 100 : 0;

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
        className="fixed inset-0 h-svh w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-background p-0 ring-0 sm:max-w-none duration-300 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        onEscapeKeyDown={(e) => {
          if (lockClose) { e.preventDefault(); return; }
          if (breakPhase === 'alarm') { e.preventDefault(); return; }
          if (breakPhase === 'countdown') { e.preventDefault(); finishBreak(false); return; }
          handleCloseRequest();
        }}
      >
        <DialogTitle className="sr-only">Полноэкранный таймер</DialogTitle>
        <DialogDescription className="sr-only">Управление таймером и перерывом.</DialogDescription>

        {/* ── Accent ambient glow ─────────────────────────────────────── */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            opacity: breakPhase !== 'idle' ? 0.25 : isRunning ? 1 : 0.35,
            background: breakPhase !== 'idle'
              ? 'radial-gradient(ellipse 60% 45% at 50% 55%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)'
              : `radial-gradient(ellipse 65% 50% at 50% 55%, color-mix(in oklab, ${accent} 10%, transparent), transparent 68%)`,
          }}
          aria-hidden
        />

        {/* ── Top-right controls: theme + close ───────────────────────── */}
        <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
          {/* Theme switcher */}
          <div className="flex items-center gap-0.5 rounded-full border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)]/80 p-1 backdrop-blur-sm">
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
                    ? 'bg-[var(--aura-surface-panel)] text-foreground shadow-sm'
                    : 'text-[var(--aura-text-disabled)] hover:text-[var(--aura-text-muted)]'
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>

          {/* Close */}
          {!lockClose && (
            <button
              type="button"
              onClick={handleCloseRequest}
              className="flex size-9 items-center justify-center rounded-full border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)]/80 text-[var(--aura-text-muted)] backdrop-blur-sm transition hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* ── Main layout ─────────────────────────────────────────────── */}
        <div className="relative flex h-full flex-col items-center gap-6 overflow-y-auto overscroll-y-contain px-6 pb-6 pt-5">

          {/* ── TOP: status + task chip ─────────────────────────────── */}
          <div className="flex w-full max-w-xl flex-col items-center gap-2.5 pt-2">
            {/* Task / break chip */}
            {breakPhase === 'idle' && selectedTask ? (
              <div
                className="flex max-w-[22rem] items-center gap-2 rounded-full border px-3.5 py-1.5"
                style={{
                  borderColor: `color-mix(in oklab, ${accent} 30%, var(--border))`,
                  backgroundColor: `color-mix(in oklab, ${accent} 9%, var(--background))`,
                }}
              >
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${accent} 12%, transparent)`,
                    color: accent,
                  }}
                  aria-hidden
                >
                  <AuraThemedIcon name={typeof selectedTask.icon === 'string' ? selectedTask.icon : null} tint="currentColor" size={13} />
                </span>
                <span
                  className="min-w-0 truncate text-sm font-medium"
                  style={{ color: accent }}
                >
                  {selectedTask.title}
                </span>
              </div>
            ) : breakPhase !== 'idle' ? (
              <div className="flex items-center gap-2 rounded-full border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-3.5 py-1.5">
                <Coffee className="size-3.5 shrink-0 text-[var(--aura-text-muted)]" />
                <span className="text-sm font-medium text-[var(--aura-text-muted)]">Перерыв</span>
              </div>
            ) : null}

            {/* Status label */}
            <div className="flex items-center gap-1.5">
              {isRunning && breakPhase === 'idle' && (
                <span
                  className="size-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
              {breakPhase === 'alarm' && (
                <span className="size-1.5 animate-ping rounded-full bg-destructive" />
              )}
              <span className="text-nano font-semibold uppercase tracking-[0.22em] text-[var(--aura-text-disabled)]">
                {subtitle}
              </span>
            </div>

            {canChangeTimerType ? (
            <div className="flex w-full max-w-[18rem] items-center gap-1 rounded-xl bg-card/45 p-1">
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
                      'flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition disabled:opacity-45',
                      selected
                        ? 'border-transparent text-white'
                        : 'border-transparent text-muted-foreground hover:bg-muted/25 hover:text-foreground'
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

          {/* ── CENTER: dial display ────────────────────────────────── */}
          <button
            type="button"
            className="group flex min-h-0 flex-1 flex-col items-center justify-center gap-4 outline-none select-none"
            onClick={cycleDialMode}
            disabled={!canCycleDial}
            onPointerDown={(e) => e.preventDefault()}
            aria-label={canCycleDial ? 'Переключить режим отображения' : undefined}
          >
            {/* Main display — switches by dialMode */}
            {breakPhase !== 'idle' ? (
              /* Break: always show ring with countdown */
              <BigRingDial
                pct={breakProgress}
                accent="var(--primary)"
                label={formatClock(breakRemainingSec)}
                sublabel={breakPhase === 'alarm' ? 'Время вышло' : 'Перерыв'}
              />
            ) : dialMode === 'ring' && timerType === 'timer' && targetDurationSec > 0 ? (
              <BigRingDial
                pct={ringPct}
                accent={accent}
                label={`${Math.round(ringPct)}%`}
                sublabel={remainingTimeText}
              />
            ) : dialMode === 'quote' ? (
              <div className="flex h-[14rem] max-w-xs flex-col items-center justify-center gap-3 text-center">
                <span
                  className="text-2xl font-light leading-snug"
                  style={{ color: accent }}
                >
                  {progressHint}
                </span>
                {timerType === 'timer' && targetDurationSec > 0 && (
                  <span className="text-sm text-[var(--aura-text-subtle)]">{remainingTimeText}</span>
                )}
              </div>
            ) : (
              /* time (default) */
              <span
                className="leading-none tabular-nums tracking-tight"
                style={{
                  fontSize: 'clamp(4.5rem, 14vw, 10rem)',
                  fontWeight: 100,
                  color: accent,
                }}
              >
                {displayValue}
              </span>
            )}

            {/* Hint below display — only in time mode */}
            {breakPhase === 'idle' && dialMode === 'time' && (
              <span className="min-h-[1.2em] text-sm font-medium text-[var(--aura-text-subtle)]">
                {timerType === 'timer' && targetDurationSec > 0 && isRunning
                  ? `${remainingTimeText} · ${progressHint}`
                  : progressHint}
              </span>
            )}
          </button>

          {/* ── BOTTOM: Actions + Ambient ────────────────────────────── */}
          <div className="flex w-full shrink-0 flex-col items-center gap-4">

            {/* Action buttons */}
            {breakPhase !== 'idle' ? (
              /* Break / alarm state */
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => finishBreak(true)}
                  className="flex h-12 items-center gap-2.5 rounded-full bg-foreground px-7 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
                >
                  <Timer className="size-4 shrink-0" />
                  {breakPhase === 'alarm' ? 'Вернуться к таймеру' : 'Прервать перерыв'}
                </button>
                {breakPhase === 'alarm' && (
                  <span className="text-nano text-[var(--aura-text-disabled)]">
                    Сигнал остановится автоматически
                  </span>
                )}
              </div>
            ) : (
              /* Normal timer state — 3-column symmetric */
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-6">

                  {/* Left: Stop */}
                  <div className="flex w-12 flex-col items-center gap-1.5">
                    {(isRunning || elapsedTimeSec > 0) ? (
                      <button
                        type="button"
                        onClick={() => { onStopAndSave(); onOpenChange(false); }}
                        className="flex size-11 items-center justify-center rounded-full border border-[var(--aura-border-soft)] text-[var(--aura-text-muted)] transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                        aria-label="Стоп и сохранить"
                      >
                        <Square className="size-4 fill-current" />
                      </button>
                    ) : (
                      <div className="size-11" aria-hidden />
                    )}
                  </div>

                  {/* Center: Play / Pause — primary */}
                  <button
                    type="button"
                    disabled={!canStart && !isRunning}
                    onClick={isRunning ? onPause : onStart}
                    className="flex size-[4.25rem] items-center justify-center rounded-full transition active:scale-[0.94] disabled:opacity-35"
                    style={{
                      backgroundColor: accent,
                      boxShadow: isRunning
                        ? `0 0 0 6px color-mix(in oklab, ${accent} 14%, transparent), 0 0 28px -4px color-mix(in oklab, ${accent} 50%, transparent)`
                        : `0 0 0 6px color-mix(in oklab, ${accent} 10%, transparent)`,
                    }}
                    aria-label={isRunning ? 'Пауза' : 'Старт'}
                  >
                    {isRunning
                      ? <Pause className="size-6 fill-current text-white" />
                      : <Play className="size-6 translate-x-0.5 fill-current text-white" />}
                  </button>

                  {/* Right: Break */}
                  <div className="flex w-12 flex-col items-center gap-1.5">
                    {isRunning ? (
                      <button
                        type="button"
                        onClick={startBreak}
                        className="flex size-11 items-center justify-center rounded-full border border-[var(--aura-border-soft)] text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground active:scale-95"
                        aria-label="Перерыв 15 минут"
                      >
                        <Coffee className="size-4" />
                      </button>
                    ) : (
                      <div className="size-11" aria-hidden />
                    )}
                  </div>
                </div>

                {/* Button labels */}
                <div className="flex items-start gap-6">
                  <div className="flex w-12 justify-center">
                    {(isRunning || elapsedTimeSec > 0) && (
                      <span className="text-nano text-[var(--aura-text-disabled)]">Стоп</span>
                    )}
                  </div>
                  <div className="w-[4.25rem]" />
                  <div className="flex w-12 justify-center">
                    {isRunning && (
                      <span className="text-nano text-[var(--aura-text-disabled)]">Перерыв</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Vinyl ambient panel ─────────────────────────────────── */}
            <VinylAmbientPanel
              accent={accent}
              currentAmbientTrack={currentAmbientTrack}
              ambientTrackId={ambientTrackId}
              ambientVolume={ambientVolume}
              ambientExpanded={ambientExpanded}
              ambientOptions={ambientOptions}
              volumeTrackStyle={volumeTrackStyle}
              isPlaying={shouldPlayAmbient && !!currentAmbientTrack}
              onSeekRandom={seekAmbientRandomly}
              onVolumeChange={(v) => ambient.setVolume(v)}
              onSelectTrack={(id) => { userPickedAmbientRef.current = true; setAmbientTrackId(id); setAmbientExpanded(false); }}
              onToggleExpand={() => setAmbientExpanded((v) => !v)}
            />

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
