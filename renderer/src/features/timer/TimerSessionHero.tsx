import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActAffixValueField } from '@/features/act/ActModal';
import { Label } from '@/components/ui/label';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';
import type { TimerTaskSelection } from '@/features/timer/use-timer-session';

const RING_R = 52;
const RING_CX = 60;
const RING_CY = 60;
const RING_LEN = 2 * Math.PI * RING_R;
type TimerDialMode = 'time' | 'percent' | 'bar' | 'hidden';
export type TimerShareSegment = {
  key: string;
  label: string;
  icon: string;
  seconds: number;
  pct: number;
  color: string;
  tasks?: Array<{ id: string; title: string; icon?: string | null; seconds: number }>;
};

type Props = {
  dayLocked: boolean;
  selectedTask: TimerTaskSelection | null;
  accent: string;
  displayTime: string;
  timerType: 'timer' | 'stopwatch';
  isRunning: boolean;
  targetDurationSec: number;
  sessionPct: number;
  durationInputMinutes: number;
  onDurationMinutesChange: (minutes: number) => void;
  onQuickMinutes: (minutes: number) => void;
  onStart: () => void;
  onPause: () => void;
  onStopAndSave: () => void;
  onReset: () => void;
  quickMinutes: readonly number[];
  elapsedTimeSec: number;
  shareSegments?: TimerShareSegment[];
  embedded?: boolean;
  /** В колонке таймера: занять доступную высоту и мягко распределить кольцо и подпись по вертикали. */
  embeddedFillHeight?: boolean;
};

function TimerRing({
  showProgressRing,
  timerType,
  displayTime,
  dialMode,
  progressPct,
  progressHint,
  canCycleDial,
  onCycleDial,
  accent,
  remainingTimeText,
  progressValueText,
  shareSegments = [],
}: {
  showProgressRing: boolean;
  dashOffset: number;
  isRunning: boolean;
  timerType: 'timer' | 'stopwatch';
  displayTime: string;
  dialMode: TimerDialMode;
  progressPct: number;
  progressHint: string;
  canCycleDial: boolean;
  onCycleDial: () => void;
  accent: string;
  remainingTimeText: string;
  progressValueText: string;
  shareSegments?: TimerShareSegment[];
}) {
  const [hoveredShareKey, setHoveredShareKey] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLElement | null>(null);
  const [dialWidth, setDialWidth] = useState(0);
  const [fitFontPx, setFitFontPx] = useState<number | undefined>(undefined);
  const visibleDialMode = timerType === 'timer' ? dialMode : 'time';
  const activeShare = shareSegments.find((segment) => segment.key === hoveredShareKey) ?? null;
  const shareTotalSec = shareSegments.reduce((sum, segment) => sum + Math.max(0, segment.seconds), 0);
  const hasShare = shareTotalSec > 0;
  let shareOffset = 25;
  const displayValue =
      visibleDialMode === 'percent'
      ? `${Math.round(progressPct)}%`
      : visibleDialMode === 'hidden'
        ? ''
        : displayTime;
  const maxFontPx = dialWidth > 0 ? Math.max(34, Math.min(76, dialWidth * 0.18)) : 76;
  const adaptiveFontPx = fitFontPx ?? maxFontPx;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setDialWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (visibleDialMode !== 'time' && visibleDialMode !== 'percent') return;
    const textEl = timeTextRef.current;
    const rootEl = rootRef.current;
    if (!textEl || !rootEl) return;

    let raf = 0;
    const fit = () => {
      const rootWidth = rootEl.getBoundingClientRect().width;
      if (!rootWidth) return;
      const available = rootWidth * 0.68;
      const maxSize = Math.max(34, Math.min(76, rootWidth * 0.18));
      textEl.style.fontSize = `${maxSize}px`;
      const measured = textEl.getBoundingClientRect().width;
      const next = measured > available
        ? Math.max(28, Math.floor(maxSize * (available / measured)))
        : maxSize;
      setFitFontPx((current) => Math.abs((current ?? 0) - next) > 0.5 ? next : current);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    schedule();
    void document.fonts?.ready.then(schedule);
    return () => cancelAnimationFrame(raf);
  }, [displayValue, dialWidth, maxFontPx, visibleDialMode]);

  return (
    <div ref={rootRef} className="relative z-[1] size-full">
      {activeShare && tooltipPos ? (
        <div
                className="aura-operator-panel pointer-events-none absolute z-40 w-[13rem] overflow-hidden rounded-lg border border-soft bg-popover/95 p-2.5 text-left text-popover-foreground shadow-lg backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -120%)' }}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="aura-icon-plate flex size-7 shrink-0 items-center justify-center rounded-lg border bg-control/70"
                style={{ '--aura-list-icon-tint': activeShare.color } as CSSProperties}
                aria-hidden
              >
                <AuraThemedIcon name={activeShare.icon} tint="currentColor" size={15} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight text-foreground">{activeShare.label}</p>
                <p className="mt-0.5 text-[10px] font-medium leading-none text-faint">
                  {formatCompactDuration(activeShare.seconds)}
                </p>
              </div>
            </div>
            <span className="aura-operator-kpi shrink-0 text-lg font-semibold tabular-nums leading-none" style={{ color: activeShare.color }}>
              {Math.round(activeShare.pct)}%
            </span>
          </div>
          {activeShare.tasks?.length ? (
            <div className="mt-2 space-y-1 border-t border-soft/60 pt-2">
              {activeShare.tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex min-w-0 items-center justify-between gap-2 text-[10px] font-medium">
                  <span className="flex min-w-0 items-center gap-1.5 text-dim">
                    {task.icon ? <AuraThemedIcon name={task.icon} tint="currentColor" size={11} /> : null}
                    <span className="min-w-0 truncate">{task.title}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-faint">{formatCompactDuration(task.seconds)}</span>
                </div>
              ))}
              {activeShare.tasks.length > 4 ? (
                <p className="text-[10px] font-medium leading-none text-faint">ещё {activeShare.tasks.length - 4}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <svg
        className="pointer-events-none absolute inset-0 z-20 size-full -rotate-90 overflow-visible"
        viewBox="0 0 120 120"
        role="img"
        aria-label={hasShare ? 'Соотношение времени: фокус, эскапизм, наполнение' : 'Соотношение времени пока пустое'}
      >
        <circle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-soft/55"
        />
        {hasShare ? shareSegments.map((segment) => {
          const pct = Math.max(0, Math.min(100, Number(segment.pct) || 0));
          if (pct < 0.6) return null;
          const dash = (pct / 100) * RING_LEN;
          const gap = Math.max(0, RING_LEN - dash);
          const segmentOffset = shareOffset;
          shareOffset -= (pct / 100) * RING_LEN;
          const active = segment.key === hoveredShareKey;
          return (
            <circle
              key={segment.key}
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke={segment.color}
              strokeWidth={active ? 8 : 6}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={segmentOffset}
              className="pointer-events-auto cursor-help transition-[stroke-width,opacity] duration-200"
              style={{ opacity: hoveredShareKey && !active ? 0.28 : 0.78 }}
              onPointerEnter={(event) => {
                setHoveredShareKey(segment.key);
                const rect = rootRef.current?.getBoundingClientRect();
                if (rect) setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
              }}
              onPointerMove={(event) => {
                const rect = rootRef.current?.getBoundingClientRect();
                if (rect) setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
              }}
              onPointerLeave={() => {
                setHoveredShareKey(null);
                setTooltipPos(null);
              }}
            />
          );
        }) : null}
        {showProgressRing ? (
          <circle
            cx={RING_CX}
            cy={RING_CY}
            r={RING_R - 7}
            fill="none"
            stroke={accent}
            strokeWidth="1.25"
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - progressPct}
            className="opacity-45 transition-[stroke-dashoffset] duration-aura-glide ease-aura"
          />
        ) : null}
      </svg>
      <button
        type="button"
        className={cn(
          'relative z-10 flex h-full w-full min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-3 text-center',
          'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
          canCycleDial ? 'cursor-pointer' : 'cursor-default'
        )}
        onClick={canCycleDial ? onCycleDial : undefined}
        aria-label={
          canCycleDial
            ? `Переключить отображение таймера. Сейчас: ${visibleDialMode === 'time' ? 'время' : visibleDialMode === 'percent' ? `${Math.round(progressPct)}%` : visibleDialMode === 'bar' ? 'прогресс-бар' : 'скрыто'}`
            : undefined
        }
      >
        {visibleDialMode === 'hidden' ? (
          <span className="sr-only">Скрыто</span>
        ) : (
          <>
            {visibleDialMode === 'time' ? (
              <time
                ref={(node) => { timeTextRef.current = node; }}
                className="font-heading font-semibold leading-none tabular-nums tracking-tight text-foreground"
                style={adaptiveFontPx ? { fontSize: `${adaptiveFontPx}px` } : undefined}
              >
                {displayValue}
              </time>
            ) : visibleDialMode === 'percent' ? (
              <span
                ref={timeTextRef}
                className="font-heading font-semibold leading-none tabular-nums tracking-tight text-foreground"
                style={adaptiveFontPx ? { fontSize: `${adaptiveFontPx}px` } : undefined}
              >
                {displayValue}
              </span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{visibleDialMode === 'bar' ? progressHint : remainingTimeText}</span>
            )}
            {visibleDialMode !== 'time' ? (
              <span className="max-w-[14rem] truncate text-[10px] font-medium leading-none text-faint">
                {visibleDialMode === 'percent' ? progressHint : showProgressRing ? progressValueText : timerType === 'stopwatch' ? 'Секундомер' : 'Таймер'}
              </span>
            ) : null}
          </>
        )}
      </button>
    </div>
  );
}

function TimerTaskBadge({ task, accent }: { task: TimerTaskSelection | null; accent: string }) {
  if (!task) return null;
  const icon = typeof task.icon === 'string' ? task.icon : null;

  return (
    <div
      className="flex max-w-[15rem] min-w-0 items-center gap-2 rounded-full border border-soft/70 bg-panel/65 px-2.5 py-1.5 text-left shadow-xs backdrop-blur-sm"
      style={{ color: accent }}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-control/45"
        aria-hidden
      >
        <AuraThemedIcon name={icon} tint="currentColor" size={13} />
      </span>
      <span className="min-w-0 truncate text-xs font-semibold leading-none text-foreground">
        {task.title}
      </span>
    </div>
  );
}

function formatRemainingText(remainingSec: number): string {
  const safeRemainingSec = Math.max(0, Math.floor(remainingSec));
  const mins = Math.ceil(safeRemainingSec / 60);
  if (safeRemainingSec <= 0) return 'Цель закрыта';
  if (safeRemainingSec < 60) return 'Осталось меньше минуты';
  return `Осталось ~${mins} мин`;
}

function formatTimerGoalValue(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0 && m > 0) return `${h}ч ${m}м`;
  if (h > 0) return `${h}ч`;
  return `${m}м`;
}

function formatCompactDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.round((safe % 3600) / 60);
  if (h > 0 && m > 0) return `${h}ч ${m}м`;
  if (h > 0) return `${h}ч`;
  return `${Math.max(1, m)}м`;
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

export function TimerSessionHero({
  dayLocked,
  selectedTask,
  accent,
  displayTime,
  timerType,
  isRunning,
  targetDurationSec,
  sessionPct,
  durationInputMinutes,
  onDurationMinutesChange,
  onQuickMinutes,
  onStart,
  onPause,
  onStopAndSave,
  onReset,
  quickMinutes,
  elapsedTimeSec,
  shareSegments = [],
  embedded = false,
  embeddedFillHeight = false,
}: Props) {
  const [dialMode, setDialMode] = useState<TimerDialMode>('time');
  const ringPct = Math.min(100, Math.max(0, sessionPct));
  const showProgressRing = timerType === 'timer' && targetDurationSec > 0;
  const canCycleDial = timerType === 'timer' && targetDurationSec > 0 && (isRunning || elapsedTimeSec > 0);
  const remainingSec = Math.max(0, targetDurationSec - elapsedTimeSec);
  const progressHint = useMemo(
    () => getStoicProgressMessage(ringPct, isRunning, elapsedTimeSec > 0),
    [elapsedTimeSec, isRunning, ringPct]
  );
  const remainingTimeText = useMemo(() => formatRemainingText(remainingSec), [remainingSec]);
  const progressValueText = useMemo(() => {
    if (timerType !== 'timer' || targetDurationSec <= 0) return timerType === 'stopwatch' ? 'Секундомер' : 'Таймер';
    const current = Math.min(Math.max(0, elapsedTimeSec), targetDurationSec);
    const value = `${formatTimerGoalValue(current)} / ${formatTimerGoalValue(targetDurationSec)}`;
    return ringPct >= 100 ? `Выполнено · ${value}` : value;
  }, [elapsedTimeSec, ringPct, targetDurationSec, timerType]);
  const dashOffset = RING_LEN * (1 - ringPct / 100);
  const canStart = !dayLocked && !!selectedTask;
  const selectedMin = Math.round(targetDurationSec / 60);
  const showDurationPresets = timerType === 'timer' && !isRunning && !dayLocked;

  useEffect(() => {
    if (!canCycleDial && dialMode !== 'time') {
      setDialMode('time');
    }
  }, [canCycleDial, dialMode]);

  const cycleDialMode = () => {
    if (!canCycleDial) return;
    setDialMode((current) => {
      if (current === 'time') return 'percent';
      if (current === 'percent') return 'bar';
      if (current === 'bar') return 'hidden';
      return 'time';
    });
  };

  if (embedded) {
    const taskColorStyle = { ['--task-color' as string]: accent } as CSSProperties;

    return (
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          embeddedFillHeight && 'h-full min-h-0'
        )}
      >
        <div className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 py-3 sm:px-3 sm:py-4">
          <div
            className={cn(
              'relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col items-center gap-3',
              embeddedFillHeight ? 'justify-center' : 'justify-center'
            )}
          >
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-2">
              <TimerTaskBadge task={selectedTask} accent={accent} />
              <div
                className="relative aspect-square w-[min(100%,min(16rem,50vmin))] max-w-[16rem] shrink-0"
                style={selectedTask ? taskColorStyle : undefined}
              >
                {selectedTask ? (
                  <div
                    aria-hidden
                  className="aura-timer-halo pointer-events-none absolute left-1/2 top-1/2 z-0 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--task-color) 10%, transparent) 0%, color-mix(in srgb, var(--task-color) 4%, transparent) 44%, transparent 72%)',
                    }}
                  />
                ) : null}
                <div className="relative z-[1] size-full">
                  <TimerRing
                    showProgressRing={showProgressRing}
                    dashOffset={dashOffset}
                    isRunning={isRunning}
                    timerType={timerType}
                    displayTime={displayTime}
                    dialMode={dialMode}
                    progressPct={ringPct}
                    progressHint={progressHint}
                    canCycleDial={canCycleDial}
                    onCycleDial={cycleDialMode}
                    accent={accent}
                    remainingTimeText={remainingTimeText}
                    progressValueText={progressValueText}
                    shareSegments={shareSegments}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 px-3 pb-3">
          {showDurationPresets ? (
            <>
              <div className="mx-auto w-full max-w-[10rem] min-w-0">
                <Label htmlFor="timer-duration-embedded" className="sr-only">
                  Минуты
                </Label>
                <ActAffixValueField
                  id="timer-duration-embedded"
                  value={String(durationInputMinutes)}
                  suffix="мин"
                  inputKind="integer"
                  ariaLabel="Минуты"
                  disabled={!selectedTask}
                  buttonClassName="h-7 rounded-full border-0 bg-transparent px-3 text-xs shadow-none hover:bg-hover"
                  inputClassName="h-7 rounded-full border-0 bg-control/35 px-3 text-center text-xs shadow-none focus-visible:ring-1"
                  onCommit={(next) => {
                    const m = parseInt(next, 10);
                    if (!Number.isFinite(m) || m < 1) return;
                    onDurationMinutesChange(m);
                  }}
                />
              </div>
              <div className="mx-auto flex w-full max-w-[19rem] min-w-0 items-center justify-center gap-1 overflow-x-auto">
                {quickMinutes.map((m) => {
                  const active = selectedMin === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!selectedTask}
                      onClick={() => onQuickMinutes(m)}
                      className={cn(
                        'aura-operator-control h-7 min-w-8 shrink-0 rounded-full px-2 text-xs font-semibold tabular-nums text-faint transition-colors',
                        'hover:text-foreground disabled:pointer-events-none disabled:opacity-30',
                        active && 'text-foreground'
                      )}
                      style={active ? { backgroundColor: `color-mix(in oklab, ${accent} 12%, transparent)`, color: accent } : undefined}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          <div className="flex w-full min-w-0 justify-center">
            {isRunning ? (
              <div className="grid w-full max-w-[14rem] grid-cols-[1fr_1fr] gap-2">
                <button
                  type="button"
                  onClick={onPause}
                  className="aura-operator-secondary-action flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-foreground transition-colors hover:bg-hover"
                >
                  <Pause className="size-4 shrink-0" />
                  Пауза
                </button>
                <button
                  type="button"
                  onClick={onStopAndSave}
                    className="aura-operator-secondary-action flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Square className="size-3.5 shrink-0 fill-current" />
                  Стоп
                </button>
              </div>
            ) : (
              <div className="flex w-full max-w-[14rem] flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={onStart}
                  className="aura-operator-primary-action flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-white transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35"
                  style={{ backgroundColor: accent }}
                  title={dayLocked ? 'Старт доступен только в текущем дне' : undefined}
                >
                  <Play className="size-4 shrink-0 fill-current" />
                  <span className="flex min-w-0 flex-col items-start leading-none">
                    <span className="text-sm font-semibold">{dayLocked ? 'Только текущий день' : selectedTask ? 'Старт' : 'Выберите задачу'}</span>
                    {!dayLocked && selectedTask ? <span className="mt-1 max-w-[10rem] truncate text-[10px] font-medium opacity-80">{selectedTask.title}</span> : null}
                  </span>
                </button>
                {elapsedTimeSec > 0 ? (
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium text-faint transition-colors hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5 shrink-0" />
                    Сброс
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group/hero relative flex min-h-full min-w-0 flex-1 flex-col overflow-hidden bg-muted/10',
        'rounded-lg border border-border/60'
      )}
    >
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-stretch gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-1 py-1">
          <div className="relative flex w-full max-w-[min(17rem,46vmin,82vw)] flex-col items-center gap-4">
            <TimerTaskBadge task={selectedTask} accent={accent} />
            <div className="relative w-full max-w-[min(17rem,48vmin,82vw)]">
              <TimerRing
                showProgressRing={showProgressRing}
                dashOffset={dashOffset}
                isRunning={isRunning}
                timerType={timerType}
                displayTime={displayTime}
                dialMode={dialMode}
                progressPct={ringPct}
                progressHint={progressHint}
                canCycleDial={canCycleDial}
                onCycleDial={cycleDialMode}
                accent={accent}
                remainingTimeText={remainingTimeText}
                progressValueText={progressValueText}
                shareSegments={shareSegments}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex w-full max-w-md shrink-0 flex-col items-stretch gap-3 self-center">
          {timerType === 'timer' && !isRunning && !dayLocked ? (
            <div className="flex w-full flex-col items-stretch gap-2.5">
              <div className="border-border/60 bg-muted/25 w-full max-w-[14rem] rounded-lg border px-2 py-2">
                <Label htmlFor="timer-duration-hero" className="sr-only">
                  Минуты
                </Label>
                <ActAffixValueField
                  id="timer-duration-hero"
                  value={String(durationInputMinutes)}
                  suffix="мин"
                  inputKind="integer"
                  ariaLabel="Минуты"
                  disabled={!selectedTask}
                  buttonClassName="h-8 rounded-full border-0 bg-transparent px-3 text-xs shadow-none hover:bg-hover"
                  inputClassName="h-8 rounded-full border-0 bg-control/35 px-3 text-center text-xs shadow-none focus-visible:ring-1"
                  onCommit={(next) => {
                    const m = parseInt(next, 10);
                    if (!Number.isFinite(m) || m < 1) return;
                    onDurationMinutesChange(m);
                  }}
                />
              </div>
              <div className="grid w-full grid-cols-3 gap-1.5 sm:grid-cols-6">
                {quickMinutes.map((m) => {
                  const active = selectedMin === m;
                  return (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={!selectedTask}
                      onClick={() => onQuickMinutes(m)}
                      className={cn(
                        'h-9 w-full rounded-md px-1 text-xs font-semibold tabular-nums',
                        active && 'shadow-sm'
                      )}
                    >
                      {m}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="border-border/40 flex w-full flex-col items-stretch gap-2 border-t border-dashed pt-3">
            {isRunning ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={onPause}
                  className="h-11 gap-1.5 rounded-lg text-sm font-semibold"
                >
                  <Pause className="size-4 shrink-0" />
                  Пауза
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="default"
                  onClick={onStopAndSave}
                  className="h-11 gap-1.5 rounded-lg text-sm font-semibold"
                >
                  <Square className="size-3.5 shrink-0 fill-current" />
                  Стоп
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-stretch gap-2">
                <Button
                  type="button"
                  size="default"
                  disabled={!canStart}
                  onClick={onStart}
                  className="h-11 gap-2 rounded-lg text-sm font-semibold shadow-sm"
                >
                  <Play className="size-4 shrink-0 fill-current" />
                  Старт
                </Button>
                {elapsedTimeSec > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="h-9 gap-1.5 rounded-lg text-xs font-medium"
                  >
                    <RotateCcw className="size-3.5 shrink-0" />
                    Сброс
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
