import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Coffee, MoonStar, Play, Shuffle, Square, Timer, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import type { TimerTaskSelection } from '@/features/timer/use-timer-session';
import { playTimerTone } from '@/features/timer/timer-sounds';

const BREAK_DURATION_SEC = 15 * 60;
/** Интервал повтора сигнала конца перерыва, пока не нажата кнопка возврата. */
const BREAK_ALARM_REPEAT_MS = 2400;

type BreakPhase = 'idle' | 'countdown' | 'alarm';
type TimerDialMode = 'time' | 'percent' | 'bar' | 'hidden';
const AMBIENT_VOLUME_KEY = 'timer-ambient-volume';

type AmbientTrack = {
  id: string;
  name: string;
  icon?: string;
  fileName: string;
};

type AmbientDefaults = {
  timer: string;
  stopwatch: string;
  break: string;
};

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

function readStoredVolume() {
  try {
    const raw = localStorage.getItem(AMBIENT_VOLUME_KEY);
    if (!raw) return 50;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(100, Math.max(0, Math.round(parsed * 100)));
  } catch {
    return 50;
  }
}

function storeVolume(value: number) {
  try {
    localStorage.setItem(AMBIENT_VOLUME_KEY, String(value / 100));
  } catch {
    /* ignore localStorage errors */
  }
}

const ambientBlobCache = new Map<string, string>();

function resolveAmbientFileUrl(fileName: string): string | null {
  if (!fileName) return null;

  if (ambientBlobCache.has(fileName)) return ambientBlobCache.get(fileName)!;

  const userDataPath = window.__auraUserDataPath;
  const appPath = window.__auraAppPath;
  const runtimeRequire =
    typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function'
      ? ((globalThis as { require: (id: string) => unknown }).require as (id: string) => unknown)
      : typeof require === 'function'
        ? require
        : null;

  if (runtimeRequire) {
    try {
      const fs = runtimeRequire('fs') as {
        existsSync: (path: string) => boolean;
        readFileSync: (path: string) => Buffer;
      };
      const pathMod = runtimeRequire('path') as { join: (...parts: string[]) => string };
      const candidates: string[] = [];
      if (appPath) candidates.push(pathMod.join(appPath, 'public', 'ambient-stock', fileName));
      if (userDataPath) candidates.push(pathMod.join(userDataPath, 'ambient', fileName));
      const existing = candidates.find((candidate) => fs.existsSync(candidate));
      if (existing) {
        const buf = fs.readFileSync(existing);
        const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const arrayBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(arrayBuffer).set(bytes);
        const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
        const mime =
          ext === 'mp3' ? 'audio/mpeg' :
          ext === 'm4a' ? 'audio/mp4' :
          ext === 'ogg' ? 'audio/ogg' :
          ext === 'wav' ? 'audio/wav' :
          ext === 'flac' ? 'audio/flac' :
          ext === 'aac' ? 'audio/aac' :
          'audio/mpeg';
        const blob = new Blob([arrayBuffer], { type: mime });
        const url = URL.createObjectURL(blob);
        ambientBlobCache.set(fileName, url);
        return url;
      }
    } catch {
      /* ignore runtime module errors */
    }
  }

  return null;
}

function parseAmbientTracks(db: AuraDatabase): AmbientTrack[] {
  return db
    .getAll('cfg_ambient_music')
    .map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? row.title ?? row.id ?? 'Ambient'),
      icon: typeof row.icon === 'string' && row.icon.trim() ? row.icon.trim() : undefined,
      fileName: typeof row.file_name === 'string' ? row.file_name.trim() : '',
    }))
    .filter((row) => row.id && row.fileName)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function parseAmbientDefaults(row: AuraRow | null): AmbientDefaults {
  const pick = (v: unknown) => (v == null ? '' : String(v));
  return {
    timer: pick(row?.ambient_default_timer),
    stopwatch: pick(row?.ambient_default_stopwatch),
    break: pick(row?.ambient_default_break),
  };
}

function formatRemainingText(remainingSec: number): string {
  const safeRemainingSec = Math.max(0, Math.floor(remainingSec));
  const mins = Math.ceil(safeRemainingSec / 60);
  if (safeRemainingSec <= 0) return 'Цель закрыта';
  if (safeRemainingSec < 60) return 'Осталось меньше минуты';
  return `Осталось ~${mins} мин`;
}

function getStoicProgressMessage(progressPct: number, isRunning: boolean, hasElapsed: boolean): string {
  if (progressPct >= 95) return 'Почти закончил';
  if (progressPct >= 80) return 'Финиш рядом';
  if (progressPct >= 55) return 'Ты уже в потоке';
  if (progressPct >= 30) return 'Ты держишь курс';
  if (progressPct > 5) return 'Ты набираешь ход';
  if (hasElapsed && !isRunning) return 'Пауза тоже часть движения';
  return 'Ты только начал';
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
  onStart,
  onPause,
  onStopAndSave,
}: Props) {
  void targetDurationSec;
  const [ambientTracks, setAmbientTracks] = useState<AmbientTrack[]>([]);
  const [ambientDefaults, setAmbientDefaults] = useState<AmbientDefaults>({
    timer: '',
    stopwatch: '',
    break: '',
  });
  const [ambientTrackId, setAmbientTrackId] = useState('');
  const [ambientVolume, setAmbientVolume] = useState(() => readStoredVolume());
  const [dialMode, setDialMode] = useState<TimerDialMode>('time');

  const [breakPhase, setBreakPhase] = useState<BreakPhase>('idle');
  const [breakRemainingSec, setBreakRemainingSec] = useState(BREAK_DURATION_SEC);

  const previousTrackBeforeBreakRef = useRef('');
  const shouldResumeTimerAfterBreakRef = useRef(false);
  const userPickedAmbientRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTrackRef = useRef('');

  const hasTask = Boolean(selectedTask);
  const canStart = hasTask && !dayLocked;
  const shouldPlayAmbient = open && ((breakPhase === 'countdown') || (breakPhase === 'idle' && isRunning));
  const canCycleDial = timerType === 'timer' && targetDurationSec > 0 && (isRunning || elapsedTimeSec > 0);
  const ringPct = timerType === 'timer' && targetDurationSec > 0
    ? Math.min(100, Math.max(0, (elapsedTimeSec / targetDurationSec) * 100))
    : 0;
  const remainingSec = Math.max(0, targetDurationSec - elapsedTimeSec);
  const progressHint = useMemo(
    () => getStoicProgressMessage(ringPct, isRunning, elapsedTimeSec > 0),
    [elapsedTimeSec, isRunning, ringPct]
  );
  const remainingTimeText = useMemo(() => formatRemainingText(remainingSec), [remainingSec]);

  const currentAmbientTrack = useMemo(
    () => ambientTracks.find((track) => track.id === ambientTrackId) ?? null,
    [ambientTrackId, ambientTracks]
  );

  useEffect(() => {
    if (!canCycleDial && dialMode !== 'time') {
      setDialMode('time');
    }
  }, [canCycleDial, dialMode]);

  const cycleDialMode = useCallback(() => {
    if (!canCycleDial) return;
    setDialMode((current) => {
      if (current === 'time') return 'percent';
      if (current === 'percent') return 'bar';
      if (current === 'bar') return 'hidden';
      return 'time';
    });
  }, [canCycleDial]);

  const disposeAmbientAudio = useCallback((resetPosition: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      if (resetPosition) audio.currentTime = 0;
      audio.src = '';
    } catch {
      /* ignore player dispose errors */
    }
    audioRef.current = null;
    audioTrackRef.current = '';
  }, []);

  const seekAmbientRandomly = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const applyRandomSeek = () => {
      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 1) return;
      const maxSeek = Math.max(0, duration - 0.25);
      audio.currentTime = Math.random() * maxSeek;
      if (shouldPlayAmbient) {
        void audio.play().catch(() => {
          /* ambient is optional */
        });
      }
    };

    if (Number.isFinite(audio.duration) && audio.duration > 1) {
      applyRandomSeek();
      return;
    }

    audio.addEventListener('loadedmetadata', applyRandomSeek, { once: true });
    try {
      audio.load();
    } catch {
      /* ignore load errors */
    }
  }, [shouldPlayAmbient]);

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
  }, [breakPhase, isRunning, lockClose, onOpenChange, onPause]);

  useEffect(() => {
    if (!open) {
      setBreakPhase('idle');
      setBreakRemainingSec(BREAK_DURATION_SEC);
      setAmbientTrackId('');
      userPickedAmbientRef.current = false;
      previousTrackBeforeBreakRef.current = '';
      shouldResumeTimerAfterBreakRef.current = false;
      disposeAmbientAudio(true);
      return;
    }

    if (!db) {
      setAmbientTracks([]);
      setAmbientDefaults({ timer: '', stopwatch: '', break: '' });
      return;
    }

    setAmbientTracks(parseAmbientTracks(db));
    setAmbientDefaults(parseAmbientDefaults((db.getAppSettings() ?? null) as AuraRow | null));
  }, [db, disposeAmbientAudio, open]);

  useEffect(() => {
    if (!open || breakPhase !== 'idle' || ambientTrackId) return;
    if (userPickedAmbientRef.current) return;
    const nextDefault = timerType === 'timer' ? ambientDefaults.timer : ambientDefaults.stopwatch;
    if (nextDefault) setAmbientTrackId(nextDefault);
  }, [ambientDefaults.stopwatch, ambientDefaults.timer, ambientTrackId, breakPhase, open, timerType]);

  useEffect(() => {
    if (!open || breakPhase !== 'countdown') return;
    const id = window.setInterval(() => {
      setBreakRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, breakPhase]);

  useEffect(() => {
    if (!open || breakPhase !== 'countdown' || breakRemainingSec > 0) return;
    setBreakPhase('alarm');
  }, [open, breakPhase, breakRemainingSec]);

  useEffect(() => {
    if (!open || breakPhase !== 'alarm') return;
    playTimerTone('break_alarm');
    const id = window.setInterval(() => playTimerTone('break_alarm'), BREAK_ALARM_REPEAT_MS);
    return () => window.clearInterval(id);
  }, [open, breakPhase]);

  useEffect(() => {
    storeVolume(ambientVolume);
    if (audioRef.current) audioRef.current.volume = ambientVolume / 100;
  }, [ambientVolume]);

  useEffect(() => {
    if (!open) return;
    if (!ambientTrackId) {
      disposeAmbientAudio(false);
      return;
    }

    if (!currentAmbientTrack) {
      disposeAmbientAudio(false);
      return;
    }

    const nextUrl = resolveAmbientFileUrl(currentAmbientTrack.fileName);
    if (!nextUrl) {
      disposeAmbientAudio(false);
      return;
    }

    if (!audioRef.current || audioTrackRef.current !== ambientTrackId || audioRef.current.src !== nextUrl) {
      disposeAmbientAudio(true);
      const nextAudio = new Audio(nextUrl);
      nextAudio.loop = true;
      nextAudio.volume = ambientVolume / 100;
      audioRef.current = nextAudio;
      audioTrackRef.current = ambientTrackId;
    }

    if (!audioRef.current) return;
    audioRef.current.volume = ambientVolume / 100;
    if (shouldPlayAmbient) {
      void audioRef.current.play().catch(() => {
        /* не показываем ошибку: ambient опционален, часто нет файла в dev */
      });
    } else {
      audioRef.current.pause();
    }
  }, [
    ambientTrackId,
    ambientVolume,
    currentAmbientTrack,
    disposeAmbientAudio,
    open,
    shouldPlayAmbient,
  ]);

  const startBreak = useCallback(() => {
    previousTrackBeforeBreakRef.current = ambientTrackId;
    shouldResumeTimerAfterBreakRef.current = isRunning;
    if (isRunning) onPause();
    setBreakRemainingSec(BREAK_DURATION_SEC);
    setBreakPhase('countdown');
    if (ambientDefaults.break) {
      userPickedAmbientRef.current = false;
      setAmbientTrackId(ambientDefaults.break);
    } else {
      setAmbientTrackId('');
    }
  }, [ambientDefaults.break, ambientTrackId, isRunning, onPause]);

  const finishBreak = useCallback(
    (resumeTimer: boolean) => {
      setBreakPhase('idle');
      setBreakRemainingSec(BREAK_DURATION_SEC);
      const restoreTrack = previousTrackBeforeBreakRef.current;
      setAmbientTrackId(restoreTrack || '');
      if (resumeTimer && shouldResumeTimerAfterBreakRef.current && !isRunning && hasTask && !dayLocked) onStart();
      previousTrackBeforeBreakRef.current = '';
      shouldResumeTimerAfterBreakRef.current = false;
    },
    [dayLocked, hasTask, isRunning, onStart]
  );

  const subtitle =
    breakPhase === 'alarm'
      ? 'Перерыв закончен'
      : breakPhase === 'countdown'
        ? 'Перерыв идёт'
        : isRunning
          ? 'Сессия идет'
          : elapsedTimeSec > 0
            ? 'Сессия на паузе'
            : 'Готов к старту';

  const volumeTrackStyle = useMemo(() => {
    const pct = Math.max(0, Math.min(100, ambientVolume));
    return {
      background: `linear-gradient(90deg, var(--primary) 0%, var(--primary) ${pct}%, var(--muted) ${pct}%, var(--muted) 100%)`,
    };
  }, [ambientVolume]);

  const displayValue = useMemo(() => {
    if (breakPhase === 'alarm') return formatClock(0);
    if (breakPhase === 'countdown') return formatClock(breakRemainingSec);
    if (timerType !== 'timer') return displayTime;
    if (dialMode === 'percent') return `${Math.round(ringPct)}%`;
    if (dialMode === 'bar' || dialMode === 'hidden') return '';
    return displayTime;
  }, [breakPhase, breakRemainingSec, dialMode, displayTime, ringPct, timerType]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        if (lockClose) return;
        handleCloseRequest();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-0 right-0 bottom-0 left-0 h-svh w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-background p-0 ring-0 sm:max-w-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300"
        onEscapeKeyDown={(event) => {
          if (lockClose) {
            event.preventDefault();
            return;
          }
          if (breakPhase === 'alarm') {
            event.preventDefault();
            return;
          }
          if (breakPhase === 'countdown') {
            event.preventDefault();
            finishBreak(false);
            return;
          }
          handleCloseRequest();
        }}
      >
        <DialogTitle className="sr-only">Полноэкранный таймер</DialogTitle>
        <DialogDescription className="sr-only">
          Управление таймером, секундомером и перерывом.
        </DialogDescription>
        <div className="aura-timer-fs-shell mx-auto flex h-full w-full max-w-7xl flex-col gap-6 px-6 pb-8 pt-6 sm:px-10">
          <header className="aura-timer-fs-head flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {selectedTask && breakPhase === 'idle' ? (
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accent} 18%, var(--card))`,
                    borderColor: `color-mix(in srgb, ${accent} 40%, var(--border))`,
                    boxShadow: `0 0 16px -4px color-mix(in srgb, ${accent} 45%, transparent)`,
                  }}
                >
                  <AuraThemedIcon name={typeof selectedTask.icon === 'string' ? selectedTask.icon : null} size={18} />
                </div>
              ) : null}
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">{subtitle}</p>
                <h2
                  className="text-xl font-semibold tracking-tight sm:text-2xl"
                  style={{ color: breakPhase === 'idle' && selectedTask ? accent : undefined }}
                >
                  {breakPhase !== 'idle' ? 'Перерыв' : (selectedTask?.title ?? 'Таймер')}
                </h2>
              </div>
            </div>
            {!lockClose ? (
              <button
                type="button"
                aria-label="Закрыть"
                onClick={handleCloseRequest}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground transition hover:bg-muted/70"
              >
                <X className="size-4" />
              </button>
            ) : (
              <div className="size-10" aria-hidden />
            )}
          </header>

          <div className="grid flex-1 min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30vw)]">
            <section
              className="aura-timer-fs-mainpanel flex min-h-0 flex-col items-center justify-center rounded-2xl border p-6 text-center transition-[border-color,box-shadow] duration-500"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 30%, var(--border))`,
                boxShadow: breakPhase === 'idle' && isRunning
                  ? `0 0 60px -10px color-mix(in srgb, ${accent} 35%, transparent), inset 0 0 40px -10px color-mix(in srgb, ${accent} 10%, transparent)`
                  : undefined,
                backgroundColor: `color-mix(in srgb, ${accent} 4%, var(--background))`,
              }}
            >
              <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{subtitle}</p>
              <button
                type="button"
                className="mt-3 flex min-h-[clamp(5rem,14vw,8.5rem)] w-full flex-col items-center justify-center rounded-xl px-3 py-1 text-center outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/70"
                onPointerDown={(event) => {
                  event.preventDefault();
                }}
                onClick={cycleDialMode}
                aria-label={
                  canCycleDial
                    ? `Переключить отображение таймера. Сейчас: ${dialMode === 'time' ? 'время' : dialMode === 'percent' ? `${Math.round(ringPct)}%` : dialMode === 'bar' ? 'прогресс-бар' : 'скрыто'}`
                    : undefined
                }
                disabled={!canCycleDial}
              >
                {timerType === 'timer' && breakPhase === 'idle' ? (
                  <>
                    {dialMode === 'time' ? (
                      <div
                        className="font-mono text-[clamp(3rem,13vw,8rem)] font-semibold leading-none tabular-nums"
                        style={{ color: accent }}
                      >
                        {displayTime}
                      </div>
                    ) : dialMode === 'percent' ? (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="font-mono text-[clamp(3rem,13vw,8rem)] font-semibold leading-none tabular-nums"
                          style={{ color: accent }}
                        >
                          {displayValue}
                        </div>
                        <span className="max-w-[20rem] text-balance text-[11px] font-medium leading-tight text-muted-foreground">
                          {progressHint}
                        </span>
                      </div>
                    ) : dialMode === 'bar' ? (
                      <div className="flex w-full max-w-[22rem] flex-col items-center gap-2">
                        <div
                          className="h-4 w-full overflow-hidden rounded-full ring-1 ring-border/60"
                          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--muted))` }}
                        >
                          <div
                            className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-aura-glide motion-safe:ease-aura"
                            style={{
                              width: `${Math.max(8, ringPct)}%`,
                              background: `linear-gradient(90deg, ${accent} 0%, color-mix(in srgb, ${accent} 85%, white 15%) 100%)`,
                              boxShadow: `0 0 10px color-mix(in srgb, ${accent} 25%, transparent)`,
                            }}
                          />
                        </div>
                        <span className="text-balance text-[11px] font-medium leading-tight text-muted-foreground">
                          {progressHint}
                        </span>
                      </div>
                    ) : (
                      <div className="flex w-full max-w-[16rem] flex-col items-center gap-2">
                        <div className="h-2.5 w-full overflow-hidden rounded-full ring-1 ring-border/55" style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 84%, transparent)' }}>
                          <div
                            className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-aura-glide motion-safe:ease-aura"
                            style={{
                              width: `${Math.max(10, ringPct)}%`,
                              background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 80%, var(--foreground) 20%) 0%, ${accent} 100%)`,
                              boxShadow: `0 0 6px color-mix(in srgb, ${accent} 18%, transparent)`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold tracking-[0.24em] text-muted-foreground/80">клик для режима</span>
                        <span className="sr-only">{remainingTimeText}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="font-mono text-[clamp(3rem,13vw,8rem)] font-semibold leading-none tabular-nums"
                    style={{ color: breakPhase === 'idle' ? accent : undefined }}
                  >
                    {displayValue}
                  </div>
                )}
              </button>
              {breakPhase === 'alarm' ? (
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Сигнал повторяется, пока не нажмёте «Вернуться к таймеру»
                </p>
              ) : null}
            </section>

            <aside className="aura-timer-fs-sidepanel flex min-h-0 flex-col gap-4 rounded-2xl border border-border bg-background p-4">
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-widest">Ambient</p>
                <div
                  role="radiogroup"
                  aria-label="Выбор ambient-музыки"
                  className="mt-2 min-h-0 flex-1 space-y-1 overflow-auto rounded-xl border border-border bg-muted/30 p-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!ambientTrackId}
                    onClick={() => {
                      userPickedAmbientRef.current = true;
                      setAmbientTrackId('');
                    }}
                    className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition ${
                      !ambientTrackId ? 'bg-primary/12 text-foreground ring-1 ring-primary/30' : 'hover:bg-muted/70'
                    }`}
                  >
                    <span className="bg-muted/70 flex size-6 items-center justify-center rounded-md">
                      <MoonStar className="text-muted-foreground size-3.5 shrink-0" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">Без музыки</span>
                    {!ambientTrackId ? <Check className="text-primary size-3.5 shrink-0" /> : null}
                  </button>
                  {ambientTracks.map((track) => {
                    const checked = ambientTrackId === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => {
                          userPickedAmbientRef.current = true;
                          setAmbientTrackId(track.id);
                        }}
                        className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition ${
                          checked ? 'bg-primary/12 text-foreground ring-1 ring-primary/30' : 'hover:bg-muted/70'
                        }`}
                      >
                        <span className="bg-muted/70 flex size-6 items-center justify-center rounded-md">
                          <AuraThemedIcon name={track.icon ?? null} size={14} muted />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{track.name}</span>
                        {checked ? <Check className="text-primary size-3.5 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
                      <Volume2 className="size-3.5 shrink-0" />
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-muted/20 px-2 py-1.5">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={ambientVolume}
                        onChange={(event) => setAmbientVolume(Number(event.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full"
                        style={volumeTrackStyle}
                      />
                        <span className="bg-muted min-w-11 shrink-0 rounded-md px-1.5 py-0.5 text-center font-mono text-[11px] tabular-nums text-foreground">
                          {ambientVolume}%
                        </span>
                      </div>
                    </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-9 w-full gap-2 rounded-xl"
                    onClick={seekAmbientRandomly}
                    disabled={!currentAmbientTrack}
                  >
                    <Shuffle className="size-3.5 shrink-0" />
                    Случайный момент
                  </Button>
                </div>
              </div>

              <div className="mt-auto space-y-2 border-t border-dashed border-border/60 pt-4">
                {breakPhase === 'alarm' ? (
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 w-full gap-2 rounded-xl"
                    onClick={() => finishBreak(true)}
                  >
                    <Timer className="size-4" />
                    Вернуться к таймеру
                  </Button>
                ) : breakPhase === 'countdown' ? (
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 w-full gap-2 rounded-xl"
                    onClick={() => finishBreak(true)}
                  >
                    <Timer className="size-4" />
                    Вернуться к таймеру
                  </Button>
                ) : isRunning ? (
                  <>
                    <Button type="button" variant="secondary" className="h-11 w-full gap-2 rounded-xl" onClick={startBreak}>
                      <Coffee className="size-4" />
                      Перерыв 15 мин
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11 w-full gap-2 rounded-xl"
                      onClick={() => {
                        onStopAndSave();
                        onOpenChange(false);
                      }}
                    >
                      <Square className="size-4 fill-current" />
                      Стоп и сохранить
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" className="h-11 w-full gap-2 rounded-xl" disabled={!canStart} onClick={onStart}>
                      <Play className="size-4 fill-current" />
                      Старт
                    </Button>
                    {elapsedTimeSec > 0 ? (
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-11 w-full gap-2 rounded-xl"
                        disabled={!hasTask}
                        onClick={() => {
                          onStopAndSave();
                          onOpenChange(false);
                        }}
                      >
                        <Square className="size-4 fill-current" />
                        Стоп и сохранить
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
