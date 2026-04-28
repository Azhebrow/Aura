import type { CSSProperties } from 'react';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActAffixValueField } from '@/features/act/ActModal';
import { Label } from '@/components/ui/label';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { cn } from '@/lib/utils';
import type { TimerTaskSelection } from '@/features/timer/use-timer-session';
import { SectionControlCard } from '@/shared/ui/section-control-card';

const RING_R = 46;
const RING_CX = 60;
const RING_CY = 60;
const RING_LEN = 2 * Math.PI * RING_R;

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
  embedded?: boolean;
  /** В колонке таймера: занять доступную высоту и мягко распределить кольцо и подпись по вертикали. */
  embeddedFillHeight?: boolean;
};

function TimerRing({
  showProgressRing,
  dashOffset,
  isRunning,
  timerType,
  displayTime,
  taskInRing,
}: {
  showProgressRing: boolean;
  dashOffset: number;
  isRunning: boolean;
  timerType: 'timer' | 'stopwatch';
  displayTime: string;
  /** Иконка задачи вместо подписи «Таймер / Секундомер» внутри кольца. */
  taskInRing: { icon: string | null; accent: string } | null;
}) {
  return (
    <div className="relative z-[1] aspect-square w-full">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120" fill="none" aria-hidden>
        <circle cx={RING_CX} cy={RING_CY} r={RING_R} className="stroke-border/70" strokeWidth="4" fill="none" />
        {showProgressRing ? (
          <circle
            cx={RING_CX}
            cy={RING_CY}
            r={RING_R}
            className="stroke-primary motion-safe:transition-[stroke-dashoffset] motion-safe:duration-aura-glide motion-safe:ease-aura"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_LEN}
            strokeDashoffset={dashOffset}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
        {taskInRing ? (
          <div className="relative flex size-9 shrink-0 items-center justify-center sm:size-10" aria-hidden>
            <ColoredAuraIcon name={taskInRing.icon} tint={taskInRing.accent} size={26} className="relative z-[1]" />
          </div>
        ) : isRunning ? (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <span className="bg-foreground/45 size-1 shrink-0 rounded-full" />
            Идёт
          </span>
        ) : (
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {timerType === 'stopwatch' ? 'Секундомер' : 'Таймер'}
          </span>
        )}
        <time
          className={cn(
            'font-semibold tabular-nums tracking-tight text-foreground',
            taskInRing ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
          )}
        >
          {displayTime}
        </time>
        {taskInRing && isRunning ? <span className="sr-only">Идёт</span> : null}
      </div>
    </div>
  );
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
  embedded = false,
  embeddedFillHeight = false,
}: Props) {
  const ringPct = Math.min(100, Math.max(0, sessionPct));
  const showProgressRing = timerType === 'timer' && targetDurationSec > 0;
  const dashOffset = RING_LEN * (1 - ringPct / 100);
  const canStart = !dayLocked && !!selectedTask;
  const selectedMin = Math.round(targetDurationSec / 60);
  const showDurationPresets = timerType === 'timer' && !isRunning && !dayLocked;
  const taskInRing =
    selectedTask != null
      ? {
          icon: typeof selectedTask.icon === 'string' ? selectedTask.icon : null,
          accent,
        }
      : null;

  if (embedded) {
    const taskColorStyle = { ['--task-color' as string]: accent } as CSSProperties;

    return (
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-visible',
          embeddedFillHeight && 'h-full min-h-0'
        )}
      >
        <div className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-visible px-1 py-2 sm:px-2 sm:py-3">
          <div
            className={cn(
              'relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col items-center gap-3 sm:gap-4',
              embeddedFillHeight ? 'justify-evenly' : 'justify-center'
            )}
          >
            <div className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center py-0.5">
              <div className="relative aspect-square w-[min(100%,min(15rem,52vmin))] max-w-[15rem] shrink-0">
                {selectedTask ? (
                  <>
                    <div
                      aria-hidden
                      className="timer-task-ambient-a pointer-events-none absolute left-1/2 top-1/2 z-0 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl sm:blur-3xl"
                      style={{
                        ...taskColorStyle,
                        background:
                          'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--task-color) 44%, transparent) 0%, color-mix(in srgb, var(--task-color) 18%, transparent) 42%, transparent 72%)',
                      }}
                    />
                    <div
                      aria-hidden
                      className="timer-task-ambient-b pointer-events-none absolute left-1/2 top-1/2 z-0 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl sm:blur-2xl"
                      style={{
                        ...taskColorStyle,
                        background:
                          'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--task-color) 32%, transparent) 0%, color-mix(in srgb, var(--task-color) 12%, transparent) 48%, transparent 78%)',
                      }}
                    />
                  </>
                ) : null}
                <div className="relative z-[1] size-full">
                  <TimerRing
                    showProgressRing={showProgressRing}
                    dashOffset={dashOffset}
                    isRunning={isRunning}
                    timerType={timerType}
                    displayTime={displayTime}
                    taskInRing={taskInRing}
                  />
                </div>
              </div>
            </div>

            {selectedTask ? (
              <p className="text-muted-foreground line-clamp-2 max-w-[min(100%,18rem)] shrink-0 px-2 text-center text-xs font-medium leading-snug">
                {selectedTask.title}
              </p>
            ) : null}
          </div>
        </div>

        <SectionControlCard className="mt-1 flex shrink-0 flex-col gap-2.5">
          {showDurationPresets ? (
            <>
              <div className="w-full min-w-0">
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
                  onCommit={(next) => {
                    const m = parseInt(next, 10);
                    if (!Number.isFinite(m) || m < 1) return;
                    onDurationMinutesChange(m);
                  }}
                />
              </div>
              <div className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:grid-cols-6">
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
            </>
          ) : null}
          <div className="flex w-full min-w-0 flex-col gap-2">
            {isRunning ? (
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={onPause}
                  className="h-10 gap-1.5 rounded-md text-sm font-semibold"
                >
                  <Pause className="size-4 shrink-0" />
                  Пауза
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="default"
                  onClick={onStopAndSave}
                  className="h-10 gap-1.5 rounded-md text-sm font-semibold"
                >
                  <Square className="size-3.5 shrink-0 fill-current" />
                  Стоп
                </Button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <Button
                  type="button"
                  size="default"
                  disabled={!canStart}
                  onClick={onStart}
                  className="h-10 gap-2 rounded-md text-sm font-semibold"
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
                    className="h-9 gap-1.5 rounded-md text-xs font-medium"
                  >
                    <RotateCcw className="size-3.5 shrink-0" />
                    Сброс
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </SectionControlCard>
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
            {selectedTask ? (
              <p className="text-foreground line-clamp-2 max-w-[16rem] text-center text-xs font-semibold leading-snug tracking-tight">
                {selectedTask.title}
              </p>
            ) : null}
            <div className="relative w-full max-w-[min(15.5rem,42vmin,78vw)]">
              <TimerRing
                showProgressRing={showProgressRing}
                dashOffset={dashOffset}
                isRunning={isRunning}
                timerType={timerType}
                displayTime={displayTime}
                taskInRing={taskInRing}
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
