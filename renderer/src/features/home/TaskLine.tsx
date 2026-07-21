import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Moon, Sun, Sunrise, Timer, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { cn } from '@/lib/utils';
import type { AuraRow, AuraTaskProgress } from '@/types/aura';
import type { TaskCategoryId } from '@/shared/config/domain-taxonomy';

// ─── Layout constants ────────────────────────────────────────────────────────
export const ROW_H = 'h-[4.5rem] [@container(min-width:720px)]:h-12';
const CTRL_BTN = 'flex h-full w-full cursor-pointer items-center justify-center gap-1 px-2 [@container(min-width:720px)]:gap-1.5 [@container(min-width:720px)]:px-3 focus:outline-none';
const CTRL_BTN_FLUSH = 'flex h-full w-full cursor-pointer items-center justify-center gap-0 px-0 focus:outline-none';
const CTRL_TEXT = 'text-xs font-semibold tabular-nums leading-none';
const TASK_FILL_MIX = 34;
const TASK_PENDING_TINT = 'var(--aura-text-muted)';

// ─── Helpers ─────────────────────────────────────────────────────────────────
type ListCfgItem = { title?: string; name?: string; percent?: number; percentage?: number };

function parseListItems(config: string | null | undefined): ListCfgItem[] {
  if (!config) return [];
  try {
    const o = JSON.parse(String(config)) as { items?: ListCfgItem[] };
    if (Array.isArray(o.items)) return o.items;
  } catch { /* ignore */ }
  return [];
}

function listItemLabel(it: ListCfgItem, i: number): string {
  const n = it.title ?? it.name;
  return typeof n === 'string' && n.trim() ? n.trim() : `Пункт ${i + 1}`;
}

export function formatTimerDurationRu(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} ч ${m} м` : `${m} м`;
}

function formatTimerHoursCompact(totalSeconds: number): string {
  const hours = Math.max(0, Number(totalSeconds) || 0) / 3600;
  if (hours <= 0) return '0 ч';
  if (hours < 10) {
    const rounded = Math.round(hours * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ч`;
  }
  return `${Math.round(hours)} ч`;
}

function formatCompactValue(value: number, unit = ''): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.abs(safe) >= 100 ? Math.round(safe) : Math.round(safe * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return unit ? `${text} ${unit}` : text;
}

function taskFillColor(accent: string, complete: boolean): string {
  const tint = complete ? accent : TASK_PENDING_TINT;
  const mix = complete ? TASK_FILL_MIX : 18;
  return `color-mix(in oklab, ${tint} ${mix}%, transparent)`;
}

function formatPercentLabel(value: number): string {
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

function taskRowSatisfied(
  taskType: string, pct: number, prog: AuraTaskProgress | null,
  numberTarget: number, numberValue: number,
): boolean {
  if (Math.min(100, Math.max(0, pct)) >= 100) return true;
  if (taskType === 'checkbox' && prog && Number(prog.completed) === 1) return true;
  if ((taskType === 'number' || taskType === 'nutrition') && numberTarget > 0 && Number.isFinite(numberValue) && numberValue >= numberTarget) return true;
  return false;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TaskControlSlot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full w-full shrink-0 items-center justify-center [@container(min-width:720px)]:h-12 [@container(min-width:720px)]:w-[5.5rem]', className)}>
      {children}
    </div>
  );
}

function LoopingTaskLabel({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  if (!overflowing)
    return <span ref={ref} className={cn(CTRL_TEXT, 'block min-w-0 max-w-full truncate text-center')}>{children}</span>;

  return (
    <span ref={ref} className={cn(CTRL_TEXT, 'aura-looping-task-label block min-w-0 max-w-full overflow-hidden whitespace-nowrap text-left')}>
      <span className="aura-looping-task-label-track" aria-hidden="true">
        <span>{children}</span>
        <span className="pl-4">{children}</span>
      </span>
      <span className="sr-only">{children}</span>
    </span>
  );
}

function TaskRowFrame({ icon, accent, title, pct, satisfied, disabled, control, showPercentBadges }: {
  icon: string | null; accent: string; title: string; pct: number;
  satisfied?: boolean; disabled?: boolean; control: ReactNode; showPercentBadges: boolean;
}) {
  const uiPct = Math.min(100, Math.max(0, pct));
  const complete = Boolean(satisfied) || uiPct >= 100;
  const stateTint = complete ? accent : TASK_PENDING_TINT;
  const showBadge = showPercentBadges && (!satisfied || uiPct < 100);
  return (
    <li className={cn('aura-operator-row relative grid grid-rows-2 overflow-hidden [@container(min-width:720px)]:flex [@container(min-width:720px)]:flex-row [@container(min-width:720px)]:items-stretch', ROW_H, disabled && 'pointer-events-none opacity-45')}>
      {/* Progress fill — lg only */}
      <div className="aura-data-fill pointer-events-none absolute inset-y-0 left-0 hidden w-full [@container(min-width:720px)]:block"
        style={{ width: `${uiPct}%`, background: taskFillColor(accent, complete) }} aria-hidden />

      {/* Icon + label row */}
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden px-2 text-center cursor-default [@container(min-width:720px)]:h-auto [@container(min-width:720px)]:justify-start [@container(min-width:720px)]:gap-2 [@container(min-width:720px)]:px-3 [@container(min-width:720px)]:text-left">
        {/* Mobile fill */}
        <span className="aura-data-fill pointer-events-none absolute inset-y-0 left-0 w-full [@container(min-width:720px)]:hidden"
          style={{ width: `${uiPct}%`, background: taskFillColor(accent, complete) }} aria-hidden />
        <span
          className="aura-icon-plate relative z-10 flex size-6 shrink-0 items-center justify-center rounded-lg border"
          style={{ '--aura-list-icon-tint': stateTint } as React.CSSProperties}
          aria-hidden
        >
          <ColoredAuraIcon name={icon} size={14} tint={stateTint} />
        </span>
        <span className={cn('relative z-10 min-w-0 max-w-[7rem] truncate text-sm leading-none [@container(min-width:720px)]:max-w-none', satisfied ? 'text-foreground font-medium' : 'text-foreground')}>
          {title}
        </span>
        {showPercentBadges && (
          <span className="relative z-10 flex shrink-0 items-center pl-0.5 [@container(min-width:720px)]:ml-auto [@container(min-width:720px)]:pl-1">
            {showBadge
              ? <span className="aura-operator-kpi text-[0.65rem] font-bold tabular-nums leading-none" style={{ color: stateTint }}>{formatPercentLabel(uiPct)}</span>
              : <Check className="size-3" style={{ color: accent }} strokeWidth={2.5} />}
          </span>
        )}
      </div>

      {/* Control column */}
      <div className="relative z-10 flex min-h-0 shrink-0 items-stretch border-t border-soft/50 [@container(min-width:720px)]:border-t-0 [@container(min-width:720px)]:border-l">
        {control}
      </div>
    </li>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export type TaskLineProps = {
  task: AuraRow;
  catId: TaskCategoryId;
  dayLocked: boolean;
  showPercentBadges: boolean;
  progress: AuraTaskProgress | null;
  timerTotal: number;
  ritualCounts: { completed: number; total: number } | undefined;
  nutritionTotals: { calories: number };
  nutritionTargets: { calories: number };
  nutritionProgressPct: number;
  numberDraft: string | undefined;
  onNumberDraftChange: (taskId: string, value: string) => void;
  onPersist: (taskId: string, data: Record<string, unknown>) => void;
  onScheduleNumberPersist: (taskId: string, draft: string) => void;
  onGoRituals: (ritualType: string) => void;
  onGoTimerTask: (taskId: string) => void;
  onGoNutrition: () => void;
};

// ─── Main component ───────────────────────────────────────────────────────────
export function TaskLine({
  task: t, catId, dayLocked, showPercentBadges,
  progress: prog, timerTotal, ritualCounts,
  nutritionTotals, nutritionTargets, nutritionProgressPct,
  numberDraft, onNumberDraftChange, onPersist, onScheduleNumberPersist,
  onGoRituals, onGoTimerTask, onGoNutrition,
}: TaskLineProps) {
  const id = String(t.id);
  const title = String(t.title ?? t.id);
  const taskType = String(t.task_type ?? '');
  const accent = `var(--task-${catId})`;
  const icon = typeof t.icon === 'string' ? t.icon : null;

  let pct = prog ? Math.min(100, Math.max(0, Number(prog.completion_percent) || 0)) : 0;
  if (taskType === 'timer') {
    const targetH = Number(t.cfg_target_hours) || 0;
    pct = targetH > 0 ? Math.min(100, (timerTotal / 3600 / targetH) * 100) : 0;
  } else if (taskType === 'nutrition') {
    pct = nutritionProgressPct;
  } else if (taskType === 'ritual') {
    const c = ritualCounts;
    pct = c && c.total > 0 ? Math.min(100, (c.completed / c.total) * 100) : 0;
  }

  const numberTarget = taskType === 'number' ? Number(t.cfg_target_value) || 0
    : taskType === 'nutrition' ? Number(nutritionTargets.calories) || 0 : 0;
  let numberValue = NaN;
  if (taskType === 'number') {
    if (numberDraft !== undefined) {
      const p = parseFloat(String(numberDraft).replace(',', '.'));
      if (Number.isFinite(p)) numberValue = p;
    }
    if (!Number.isFinite(numberValue) && prog?.current_value != null) numberValue = Number(prog.current_value);
  } else if (taskType === 'nutrition') {
    numberValue = nutritionTotals.calories;
  }

  const satisfied = taskRowSatisfied(taskType, pct, prog, numberTarget, numberValue);
  const disabled = dayLocked;
  const controlTint = satisfied ? accent : TASK_PENDING_TINT;

  const frameProps = { icon, accent, title, pct, satisfied, disabled, showPercentBadges };

  if (taskType === 'checkbox') {
    const done = prog ? Number(prog.completed) === 1 : false;
    const StatusIcon = done ? Check : X;
    return (
      <TaskRowFrame {...frameProps} control={
        <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
          <button type="button" role="checkbox" aria-checked={done} aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}
            disabled={disabled} className={CTRL_BTN}
            onClick={(e) => { e.stopPropagation(); onPersist(id, { completed: done ? 0 : 1 }); }}>
            <span
              className="aura-task-checkbox-mark relative inline-flex size-5 shrink-0 items-center justify-center"
              style={{ color: controlTint }}
              aria-hidden
            >
              <StatusIcon className="size-4 transition-transform duration-150 ease-aura" strokeWidth={2.4} />
            </span>
            {catId === 'deps' && (
              <span className={cn(CTRL_TEXT, 'text-foreground')} style={{ color: done ? accent : undefined }}>
                {done ? 'Да' : 'Нет'}
              </span>
            )}
          </button>
        </TaskControlSlot>
      } />
    );
  }

  if (taskType === 'number') {
    const cur = prog?.current_value != null ? Number(prog.current_value) : 0;
    const draft = numberDraft ?? String(Number.isFinite(cur) ? cur : '');
    const unitStr = typeof t.cfg_unit === 'string' ? t.cfg_unit.trim() : '';
    return (
      <TaskRowFrame {...frameProps} control={
        <TaskControlSlot className={cn('p-0', disabled && 'pointer-events-none opacity-50')}>
          <Input type="number" inputMode="decimal" disabled={disabled} value={draft}
            className="h-full w-full border-0 bg-transparent text-center text-xs font-semibold tabular-nums text-foreground shadow-none focus-visible:ring-0 rounded-none"
            title={unitStr && Number.isFinite(cur) ? formatCompactValue(cur, unitStr) : undefined}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { onNumberDraftChange(id, e.target.value); onScheduleNumberPersist(id, e.target.value); }}
            onBlur={(e) => { const n = parseFloat(String(e.target.value).replace(',', '.')); if (Number.isFinite(n)) onPersist(id, { current_value: n }); }} />
        </TaskControlSlot>
      } />
    );
  }

  if (taskType === 'list') {
    const items = parseListItems(typeof t.config === 'string' ? t.config : null);
    const rawList = prog?.value;
    const listIdxRaw = rawList !== null && rawList !== undefined && rawList !== '' ? Number(rawList) : NaN;
    const selectedIndex = Number.isFinite(listIdxRaw) && listIdxRaw >= 0
      ? Math.max(0, Math.min(items.length - 1, Math.floor(listIdxRaw))) : -1;
    const selectedLabel = selectedIndex < 0 ? '—' : listItemLabel(items[selectedIndex], selectedIndex);
    return (
      <TaskRowFrame {...frameProps} control={
        items.length === 0 ? (
          <TaskControlSlot><span className={cn(CTRL_TEXT, 'text-faint')}>—</span></TaskControlSlot>
        ) : (
          <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
            <button type="button" disabled={disabled} aria-label="Переключить пункт списка" className={CTRL_BTN_FLUSH}
              onClick={(e) => {
                e.stopPropagation();
                const n0 = rawList !== null && rawList !== undefined && rawList !== '' ? Number(rawList) : NaN;
                let cur = Number.isFinite(n0) && n0 >= 0 ? Math.max(0, Math.min(items.length - 1, Math.floor(n0))) : -1;
                const next = cur + 1 >= items.length ? -1 : cur + 1;
                if (next < 0) {
                  onPersist(id, { value: null, selected_list_item: null, completion_percent: 0 });
                } else {
                  const it = items[next];
                  onPersist(id, { value: next, selected_list_item: listItemLabel(it, next), completion_percent: Number(it?.percent ?? it?.percentage ?? 0) });
                }
              }}>
              <LoopingTaskLabel>{selectedLabel}</LoopingTaskLabel>
            </button>
          </TaskControlSlot>
        )
      } />
    );
  }

  if (taskType === 'timer') {
    const label = formatTimerHoursCompact(timerTotal);
    return (
      <TaskRowFrame {...frameProps} control={
        <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
          <button type="button" disabled={disabled} className={CTRL_BTN}
            onClick={(e) => { e.stopPropagation(); onGoTimerTask(id); }}>
            <Timer className="size-3.5 shrink-0" style={{ color: controlTint }} />
            <span className={CTRL_TEXT}>{label}</span>
          </button>
        </TaskControlSlot>
      } />
    );
  }

  if (taskType === 'nutrition') {
    const kcal = Math.round(nutritionTotals.calories);
    return (
      <TaskRowFrame {...frameProps} control={
        <TaskControlSlot className={cn(disabled && 'pointer-events-none opacity-50')}>
          <button type="button" disabled={disabled} className={CTRL_BTN}
            onClick={(e) => { e.stopPropagation(); onGoNutrition(); }}>
            <span className={CTRL_TEXT}>{kcal}</span>
          </button>
        </TaskControlSlot>
      } />
    );
  }

  if (taskType === 'ritual') {
    const rt = String(t.ritual_type ?? 'sunrise');
    const RitIcon = rt === 'sunset' ? Moon : rt === 'sun' ? Sun : Sunrise;
    const { completed = 0, total = 0 } = ritualCounts ?? {};
    return (
      <TaskRowFrame {...frameProps} control={
        <TaskControlSlot className={disabled ? 'pointer-events-none opacity-50' : ''}>
          <button type="button" disabled={disabled} className={CTRL_BTN}
            onClick={(e) => { e.stopPropagation(); onGoRituals(rt); }}>
            <RitIcon className="size-3.5 shrink-0" style={{ color: controlTint }} />
            <span className={CTRL_TEXT}>{completed}/{total}</span>
          </button>
        </TaskControlSlot>
      } />
    );
  }

  return (
    <TaskRowFrame {...frameProps} control={
      <TaskControlSlot><span className={cn(CTRL_TEXT, 'text-faint')}>—</span></TaskControlSlot>
    } />
  );
}
