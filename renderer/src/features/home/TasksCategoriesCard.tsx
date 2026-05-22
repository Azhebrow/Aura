import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useShell } from '@/app/navigation/shell-context';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { TASK_CATEGORY_IDS } from '@/shared/config/domain-taxonomy';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { LoadingShell } from '@/shared/ui/data-states';
import { setNavigationIntent } from '@/shared/lib/navigation-intent';
import { useAnimatedValue } from '@/shared/hooks/use-animated-value';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasksCategories } from './use-tasks-categories';
import { TaskLine } from './TaskLine';

import type { TaskCategoryId } from '@/shared/config/domain-taxonomy';
import type { AuraRow, AuraTaskProgress } from '@/types/aura';

// ─── CategorySection ─────────────────────────────────────────────────────────
// Отдельный компонент для каждой категории — позволяет вызывать хук
// useAnimatedValue для плавной анимации процента (хуки нельзя использовать в loop).

type CategorySectionProps = {
  catId: TaskCategoryId;
  idx: number;
  n: number;
  tasks: AuraRow[];
  label: string;
  headerIcon: string;
  accent: string;
  dayLocked: boolean;
  showPercentBadges: boolean;
  effectiveTaskProgressById: Map<string, AuraTaskProgress | null>;
  timerTotalsByTaskId: Map<string, number>;
  ritualCountsByType: Map<string, { completed: number; total: number }>;
  nutritionTotals: { calories: number };
  nutritionTargets: { calories: number };
  nutritionProgressPct: number;
  numberDrafts: Record<string, string>;
  setNumberDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  persist: (taskId: string, data: Record<string, unknown>) => void;
  scheduleNumberPersist: (taskId: string, draft: string) => void;
  goRituals: (ritualType: string) => void;
  goTimerTask: (taskId: string) => void;
  setActivePageId: (id: string) => void;
};

function CategorySection({
  catId, idx, n, tasks, label, headerIcon, accent,
  dayLocked, showPercentBadges,
  effectiveTaskProgressById, timerTotalsByTaskId, ritualCountsByType,
  nutritionTotals, nutritionTargets, nutritionProgressPct,
  numberDrafts, setNumberDrafts, persist, scheduleNumberPersist,
  goRituals, goTimerTask, setActivePageId,
}: CategorySectionProps) {
  const animatedN = useAnimatedValue(n);
  const displayN = Math.round(animatedN);

  return (
    <section
      className={cn(
        'flex min-h-max flex-col overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] shadow-sm [@container(min-width:720px)]:min-h-0 [@container(min-width:720px)]:rounded-none [@container(min-width:720px)]:border-0 [@container(min-width:720px)]:bg-transparent [@container(min-width:720px)]:shadow-none',
        idx !== 3 && '[@container(min-width:720px)]:border-r [@container(min-width:720px)]:border-[var(--aura-border-soft)]/60',
        dayLocked && 'pointer-events-none opacity-50'
      )}
    >
      {/* Category header */}
      <div style={{ '--acc': accent } as React.CSSProperties}>
        <div
          className="flex h-16 items-center gap-2.5 px-2.5 sm:gap-3 sm:px-3.5"
          style={{ background: `color-mix(in oklab, ${accent} 8%, transparent)` }}
          aria-label={`${label}: ${displayN}%`}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 sm:rounded-xl"
            style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)` }} aria-hidden>
            {dayLocked
              ? <Lock size={12} className="text-[var(--aura-text-muted)]" />
              : <ColoredAuraIcon name={headerIcon} size={14} tint={accent} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="min-w-0 truncate text-sm font-black leading-none sm:text-base" style={{ color: accent }}>
              {label}
            </h3>
            <p className="mt-1 text-[0.65rem] font-semibold leading-none text-[var(--aura-text-muted)] sm:text-caption">
              {tasks.length ? formatTaskCountRu(tasks.length) : 'Нет задач'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-[1.45rem] font-black tabular-nums leading-none sm:text-[1.7rem]" style={{ color: accent }}>
              {displayN}<span className="text-[0.6rem] font-bold opacity-70 sm:text-sm">%</span>
            </span>
          </div>
        </div>
        <div className="h-[3px] w-full" style={{ background: `color-mix(in oklab, ${accent} 12%, transparent)` }}>
          <div className="h-full" style={{ width: `${animatedN}%`, backgroundColor: accent }} />
        </div>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="flex h-11 items-center justify-center">
          <span className="text-xs text-[var(--aura-text-disabled)]">—</span>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--aura-border-soft)]/40 overflow-y-auto overscroll-y-contain">
          {tasks.map((t) => {
            const taskId = String(t.id);
            return (
              <TaskLine
                key={taskId}
                task={t}
                catId={catId}
                dayLocked={dayLocked}
                showPercentBadges={showPercentBadges}
                progress={effectiveTaskProgressById.get(taskId) ?? null}
                timerTotal={timerTotalsByTaskId.get(taskId) ?? 0}
                ritualCounts={ritualCountsByType.get(String(t.ritual_type ?? 'sunrise'))}
                nutritionTotals={nutritionTotals}
                nutritionTargets={nutritionTargets}
                nutritionProgressPct={nutritionProgressPct}
                numberDraft={numberDrafts[taskId]}
                onNumberDraftChange={(id, v) => setNumberDrafts((m) => ({ ...m, [id]: v }))}
                onPersist={persist}
                onScheduleNumberPersist={scheduleNumberPersist}
                onGoRituals={goRituals}
                onGoTimerTask={goTimerTask}
                onGoNutrition={() => setActivePageId('diary')}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatTaskCountRu(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`;
  return `${count} задач`;
}

export function TasksCategoriesCard() {
  const { dateString } = useSelectedDate();
  const { setActivePageId } = useShell();
  const card = useTasksCategories(dateString);
  const {
    db, dayLocked, showPercentBadges, saveError,
    tasksByCat, categoryUi, values,
    effectiveTaskProgressById, timerTotalsByTaskId, ritualCountsByType,
    nutritionTotals, nutritionTargets, nutritionProgressPct,
    numberDrafts, setNumberDrafts, persist, scheduleNumberPersist,
  } = card;

  const goRituals = (ritualType: string) => {
    const kind = ritualType === 'sunset' ? 'evening' : 'morning';
    try { localStorage.setItem(STORAGE_KEYS.RITUALS_KIND, kind); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(STORAGE_KEYS.RITUALS_KIND_INTENT_EVENT, { detail: { kind } }));
    setActivePageId('rituals');
  };

  const goTimerTask = (taskId: string) => {
    setNavigationIntent(STORAGE_KEYS.TIMER_TASK_ID, STORAGE_KEYS.TIMER_TASK_INTENT_EVENT, { taskId });
    setActivePageId('timer');
  };

  return (
    <div className="@container flex min-h-0 flex-1 flex-col overflow-hidden">
      {saveError ? <p className="text-destructive mb-2 text-xs">{saveError}</p> : null}
      {!db ? (
        <LoadingShell />
      ) : (
        <div
          className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto overscroll-y-contain p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 [@container(min-width:720px)]:grid-cols-4 [@container(min-width:720px)]:gap-0 [@container(min-width:720px)]:overflow-hidden [@container(min-width:720px)]:p-0"
          style={{ gridAutoRows: 'max-content' }}
        >
          {TASK_CATEGORY_IDS.map((catId, idx) => (
            <CategorySection
              key={catId}
              catId={catId}
              idx={idx}
              n={values[catId] ?? 0}
              tasks={tasksByCat[catId] ?? []}
              label={categoryUi[catId].label}
              headerIcon={categoryUi[catId].icon}
              accent={`var(--task-${catId})`}
              dayLocked={dayLocked}
              showPercentBadges={showPercentBadges}
              effectiveTaskProgressById={effectiveTaskProgressById}
              timerTotalsByTaskId={timerTotalsByTaskId}
              ritualCountsByType={ritualCountsByType}
              nutritionTotals={nutritionTotals}
              nutritionTargets={nutritionTargets}
              nutritionProgressPct={nutritionProgressPct}
              numberDrafts={numberDrafts}
              setNumberDrafts={setNumberDrafts}
              persist={persist}
              scheduleNumberPersist={scheduleNumberPersist}
              goRituals={goRituals}
              goTimerTask={goTimerTask}
              setActivePageId={setActivePageId as (id: string) => void}
            />
          ))}
        </div>
      )}
    </div>
  );
}
