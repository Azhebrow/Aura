import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  Eye,
  Moon,
  Palette,
  Pencil,
  Plus,
  Sunrise,
  Target,
  Trash2,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListItem } from '@/components/ui/list-item';
import { AddListButton } from '@/components/ui/add-list-button';
import { Card, CardContent } from '@/components/ui/card';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UniversalModalContent } from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useRitualsCache } from '@/shared/hooks/use-rituals-cache';
import { useRadioGroupSlideAnimation, getSlideAnimationClasses } from '@/shared/hooks/use-radio-group-slide-animation';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import { ColorPickerPanel } from '@/features/settings/color-picker-panel';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_INSET_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobileSectionSwitcher } from '@/shared/ui/mobile-section-switcher';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { SectionControlCard } from '@/shared/ui/section-control-card';
import { ActAffixValueField, ActModalFooter } from '@/features/act/ActModal';
import { AURA_DATA_CHANGED } from '@/features/stats/stats-data-events';

type RitualKind = 'morning' | 'evening';
type GoalsMode = 'active' | 'archive';
type TaskType = 'checkbox' | 'number';
type StageVisualState = 'completed' | 'current' | 'frozen' | 'active';

type GoalsDbApi = {
  getAllGoals?: () => AuraRow[];
  getStagesByGoal?: (goalId: string) => AuraRow[];
  getTasksByStage?: (stageId: string) => AuraRow[];
  getGoalTaskProgress?: (taskId: string, date: string) => AuraRow | null | undefined;
  getGoalTasksProgressByDate?: (date: string) => AuraRow[];
  saveGoalTaskProgress?: (taskId: string, date: string, data: AuraRow) => void;
  addGoal?: (data: AuraRow) => boolean;
  updateGoal?: (id: string, data: AuraRow) => void;
  setGoalCompletedAt?: (id: string, date: string | null) => boolean;
  deleteGoal?: (id: string) => void;
  moveGoal?: (id: string, direction: 'up' | 'down') => boolean;
  addStage?: (data: AuraRow) => boolean;
  updateStage?: (id: string, data: AuraRow) => void;
  setStageCompletedAt?: (id: string, date: string | null) => boolean;
  deleteStage?: (id: string) => void;
  moveStage?: (id: string, direction: 'up' | 'down') => boolean;
  addTask?: (data: AuraRow) => boolean;
  updateTask?: (id: string, data: AuraRow) => void;
  setTaskCompletedAt?: (id: string, date: string | null) => boolean;
  deleteTask?: (id: string) => void;
  moveTask?: (id: string, direction: 'up' | 'down') => boolean;
};

const RITUALS_KIND_STORAGE = 'aura-rituals-kind';
const RAW_BUTTON_FOCUS_CN = 'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none';
const CFG_DIALOG_INPUT_CN =
  'border-input bg-background h-9 w-full min-w-0 rounded-md border px-3 text-center text-sm shadow-xs';
const CFG_DIALOG_ICON_TRIGGER_CN =
  `border-input bg-background hover:bg-muted/30 flex h-9 w-full min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 text-center aura-tx-colors shadow-xs ${RAW_BUTTON_FOCUS_CN}`;
/** Icon-кнопки в панели целей ритуалов: один вариант и размер на цели / этапы / задачи. */
const GOALS_RITUALS_ICON_BTN_CN = 'shrink-0 rounded-md';
const GOALS_RITUALS_TOOLBAR_ROW_CN = 'flex flex-wrap items-center justify-end gap-1';
const GOALS_GLOBAL_SCOPE_DATE = '__goals_global__';

function idOrCreate(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function asIsoDate(value: unknown): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s.slice(0, 10);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatRuDate(value: unknown): string {
  const iso = asIsoDate(value);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Декор этапа: у каждого индекса свой набор форм (SVG, clip-path, градиенты) — не «шары». */
function StageSignatureDecor({ pattern, tint }: { pattern: number; tint: string }) {
  const p = pattern % 6;
  const m = (pct: number) => `color-mix(in srgb, ${tint} ${pct}%, transparent)`;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] opacity-[0.16]" aria-hidden>
      {p === 0 ? (
        <>
          <svg className="absolute -right-1 top-[-10%] h-[58%] w-[76%]" viewBox="0 0 420 240" preserveAspectRatio="xMaxYMin slice">
            <path fill={m(5)} d="M280-20c130 55 170 165 90 235-100 75-250 45-320-35-55-65-15-150 110-185 70-20 120 15 120-15z" />
          </svg>
          <div
            className="absolute bottom-[-20%] left-[-40%] h-28 w-[170%] -rotate-[11deg] rounded-[2.5rem] blur-3xl"
            style={{ background: `linear-gradient(100deg, ${m(7)}, transparent 72%)`, opacity: 0.2 }}
          />
        </>
      ) : null}
      {p === 1 ? (
        <>
          <div
            className="absolute left-[-32%] top-1/2 h-[150%] w-44 -translate-y-1/2 rotate-[26deg] rounded-[2rem] blur-3xl"
            style={{ background: m(6), opacity: 0.18 }}
          />
          <div
            className="absolute right-0 top-0 h-full w-[58%]"
            style={{
              clipPath: 'polygon(38% 0, 100% 0, 100% 100%, 0 100%)',
              background: `linear-gradient(128deg, transparent 0%, ${m(5)} 58%, transparent 100%)`,
              opacity: 0.28,
            }}
          />
        </>
      ) : null}
      {p === 2 ? (
        <>
          <svg className="absolute -left-6 bottom-[-18%] h-[72%] w-[88%]" viewBox="0 0 380 280" preserveAspectRatio="xMinYMax meet">
            <path fill={m(4)} d="M-10 200c50-100 160-140 250-95s150 110 90 175-190 55-280 5-90-85-60-85z" />
          </svg>
          <div
            className="absolute right-[6%] top-[10%] h-36 w-36 rotate-[52deg] rounded-3xl blur-2xl"
            style={{ background: m(6), opacity: 0.16 }}
          />
        </>
      ) : null}
      {p === 3 ? (
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.22,
            background: `conic-gradient(from 200deg at 88% 8%, ${m(6)} 0deg, transparent 46deg, ${m(3)} 112deg, transparent 200deg, ${m(4)} 300deg, transparent 360deg)`,
          }}
        />
      ) : null}
      {p === 4 ? (
        <>
          <div
            className="absolute left-[6%] top-0 h-[48%] w-[72%]"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 78%)',
              background: `linear-gradient(185deg, ${m(5)}, transparent 92%)`,
            }}
          />
          <div
            className="absolute bottom-0 right-[-12%] h-32 w-[95%] -rotate-[7deg] rounded-[3rem] blur-3xl"
            style={{ background: `linear-gradient(265deg, ${m(7)}, transparent 75%)`, opacity: 0.18 }}
          />
        </>
      ) : null}
      {p === 5 ? (
        <>
          <svg className="absolute right-0 top-[12%] h-[52%] w-[58%]" viewBox="0 0 320 200" preserveAspectRatio="xMaxYMid meet">
            <path fill={m(4)} d="M320 0v200H90C160 130 260 60 320 0z" />
          </svg>
          <div
            className="absolute bottom-[-8%] left-1/2 h-20 w-[125%] -translate-x-1/2 rounded-[4rem] blur-2xl"
            style={{ background: m(6), opacity: 0.16 }}
          />
        </>
      ) : null}
    </div>
  );
}

/** Порядковый номер этапа римскими цифрами (I … XX+). */
function stageOrderRoman(orderIndex: number): string {
  const n = orderIndex + 1;
  if (n <= 0) return '';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let x = n;
  let out = '';
  for (let i = 0; i < vals.length; i += 1) {
    while (x >= vals[i]) {
      out += syms[i];
      x -= vals[i];
    }
  }
  return out || String(n);
}

function loadCfg(db: AuraDatabase, kind: RitualKind): AuraRow[] {
  const table = kind === 'morning' ? 'cfg_rituals_morning' : 'cfg_rituals_evening';
  const all = db.getAll(table);
  return all
    .filter((r) => r.id && isRitualActive(r.active))
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
}

function isRitualActive(active: unknown): boolean {
  return !(active === 0 || active === '0' || active === false || active === 'false');
}

function loadCfgRows(rows: AuraRow[]): AuraRow[] {
  return rows
    .filter((r) => r.id && isRitualActive(r.active))
    .sort((a, b) => (Number(a.level) || 0) - Number(b.level || 0));
}

function completedSet(db: AuraDatabase, kind: RitualKind, date: string): Set<string> {
  const rows = kind === 'morning' ? db.getRitualsMorning(date) : db.getRitualsEvening(date);
  const s = new Set<string>();
  rows.forEach((r) => {
    if (r.completed === 1 && r.ritual_id) s.add(String(r.ritual_id));
  });
  return s;
}

function completedSetFromRows(rows: AuraRow[]): Set<string> {
  const s = new Set<string>();
  rows.forEach((r) => {
    if (r.completed === 1 && r.ritual_id) s.add(String(r.ritual_id));
  });
  return s;
}

function calcTaskProgress(task: AuraRow, rawProgress: AuraRow | null | undefined): number {
  const taskType = String(task.task_type ?? 'checkbox');
  if (!rawProgress) return 0;
  if (taskType === 'checkbox') return Number(rawProgress.completed) === 1 ? 100 : 0;
  if (taskType === 'number') {
    const target = Number(task.target_value ?? 0);
    const current = Number(rawProgress.current_value ?? 0);
    if (target <= 0) return 0;
    return Math.min(100, Math.max(0, (current / target) * 100));
  }
  return 0;
}

/**
 * Прогресс из равных «ячеек»: по одной на задачу; внутри ячейки ширина = % выполнения (чекбокс 0/100, число — доля цели).
 */
function GoalTaskSegmentsBar({
  tasks,
  getRaw,
  doneFillStyle,
  partialFillStyle,
  segmentShellClassName,
  className,
}: {
  tasks: AuraRow[];
  getRaw: (taskId: string) => AuraRow | null | undefined;
  doneFillStyle: CSSProperties;
  partialFillStyle: CSSProperties;
  segmentShellClassName: string;
  className?: string;
}) {
  if (tasks.length === 0) {
    return <div className={cn('bg-muted/50 h-2 w-full rounded-full', className)} aria-hidden />;
  }
  const completedFull = tasks.filter((t) => Math.round(calcTaskProgress(t, getRaw(String(t.id)))) >= 100).length;
  return (
    <div
      className={cn('flex h-2 w-full gap-1', className)}
      role="progressbar"
      aria-valuenow={completedFull}
      aria-valuemax={tasks.length}
      aria-valuetext={`Выполнено ${completedFull} из ${tasks.length} задач`}
    >
      {tasks.map((t) => {
        const tid = String(t.id);
        const pct = Math.round(calcTaskProgress(t, getRaw(tid)));
        const fillStyle = pct >= 100 ? doneFillStyle : pct > 0 ? partialFillStyle : {};
        return (
          <div
            key={tid}
            title={`${String(t.title ?? tid)} — ${pct}%`}
            className={cn('min-w-0 flex-1 overflow-hidden rounded-sm', segmentShellClassName)}
          >
            <div
              className="aura-tx-width h-full min-h-px rounded-[1px]"
              style={{
                width: `${Math.min(100, Math.max(0, pct))}%`,
                ...fillStyle,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function getStageVisualState(params: {
  index: number;
  percent: number;
  contiguousCompletedIndex: number;
  nextStageIndex: number;
}): StageVisualState {
  const { index, percent, contiguousCompletedIndex, nextStageIndex } = params;
  if (percent === 100 && index <= contiguousCompletedIndex) return 'completed';
  if (index === nextStageIndex) return 'current';
  if (nextStageIndex !== -1 && index > nextStageIndex) return 'frozen';
  return 'active';
}

function getStageStateClasses(state: StageVisualState): {
  shell: string;
  title: string;
  meta: string;
  progressTrack: string;
  progressFill: string;
} {
  if (state === 'completed') {
    return {
      shell: 'border-transparent',
      title: 'text-foreground',
      meta: 'text-muted-foreground',
      progressTrack: 'bg-muted',
      progressFill: 'bg-primary',
    };
  }
  if (state === 'current') {
    return {
      shell: 'border-transparent',
      title: 'text-foreground',
      meta: 'text-muted-foreground',
      progressTrack: 'bg-muted',
      progressFill: 'bg-primary',
    };
  }
  if (state === 'frozen') {
    return {
      shell: 'border-transparent',
      title: 'text-foreground/85',
      meta: 'text-muted-foreground',
      progressTrack: 'bg-muted/80',
      progressFill: 'bg-muted-foreground/45',
    };
  }
  return {
    shell: 'border-transparent',
    title: 'text-foreground',
    meta: 'text-muted-foreground',
    progressTrack: 'bg-muted',
    progressFill: 'bg-primary/80',
  };
}

function getGoalTintSurfaceStyle(goalTint: string, state: StageVisualState): {
  shellStyle: Record<string, string>;
  progressFillStyle: Record<string, string>;
} {
  const baseShell = {
    backgroundColor: `color-mix(in srgb, ${goalTint} 2.5%, var(--background) 97.5%)`,
  };
  if (state === 'current') {
    return {
      shellStyle: {
        backgroundColor: `color-mix(in srgb, ${goalTint} 4.5%, var(--background) 95.5%)`,
        boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${goalTint} 5%, transparent)`,
      },
      progressFillStyle: { backgroundColor: goalTint },
    };
  }
  if (state === 'completed') {
    return {
      shellStyle: {
        ...baseShell,
        backgroundColor: `color-mix(in srgb, ${goalTint} 5.5%, var(--background) 94.5%)`,
      },
      progressFillStyle: { backgroundColor: goalTint },
    };
  }
  if (state === 'frozen') {
    return {
      shellStyle: {
        backgroundColor: `color-mix(in oklab, var(--muted) 18%, var(--background) 82%)`,
      },
      progressFillStyle: { backgroundColor: `color-mix(in srgb, ${goalTint} 44%, var(--muted-foreground) 56%)` },
    };
  }
  return {
    shellStyle: baseShell,
    progressFillStyle: { backgroundColor: `color-mix(in srgb, ${goalTint} 80%, var(--primary) 20%)` },
  };
}

function CfgLikeDialogRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 border-b border-border last:border-b-0 sm:grid-cols-[minmax(9rem,30%)_1fr] sm:divide-x sm:divide-border">
      <div className="bg-muted/30 flex items-center justify-center px-2 py-2 text-center sm:min-h-9 sm:px-3">
        <Label htmlFor={htmlFor} className="text-foreground cursor-default text-xs font-semibold leading-snug break-words">
          {label}
        </Label>
      </div>
      <div className="flex min-w-0 w-full flex-col items-center justify-center px-2 py-2 sm:min-h-9 sm:px-3">{children}</div>
    </div>
  );
}

function GoalEditDialog({
  open,
  onOpenChange,
  title,
  initial,
  supportsColor,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: { title: string; description: string; icon: string; color: string; completedAt?: string };
  supportsColor: boolean;
  onSubmit: (v: { title: string; description: string; icon: string; color: string; completedAt: string | null }) => void;
}) {
  const [name, setName] = useState(initial.title);
  const [desc, setDesc] = useState(initial.description);
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);
  const [completedAt, setCompletedAt] = useState(asIsoDate(initial.completedAt));
  const [dialogSub, setDialogSub] = useState<'form' | 'color'>('form');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial.title);
    setDesc(initial.description);
    setIcon(initial.icon);
    setColor(initial.color);
    setCompletedAt(asIsoDate(initial.completedAt));
    setDialogSub('form');
    setIconPickerOpen(false);
  }, [open, initial]);

  const handleMainOpenChange = (next: boolean) => {
    if (!next) setIconPickerOpen(false);
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleMainOpenChange}>
        <UniversalModalContent size="lg" showCloseButton={false}>
          <DialogHeader className={cn('shrink-0 px-6 pt-5', dialogSub === 'color' && 'border-b border-border/80 pb-3')}>
            {dialogSub === 'form' ? (
              <div className="flex min-h-10 items-center gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Target className="size-4" />
                  <DialogTitle>{title}</DialogTitle>
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button type="button" size="sm" variant="ghost" className="px-2 text-xs" onClick={() => setDialogSub('form')}>
                  ← Назад
                </Button>
                <DialogTitle className="text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Palette className="size-4" />
                    <span>Цвет</span>
                  </span>
                </DialogTitle>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            )}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            {dialogSub === 'form' ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <CfgLikeDialogRow label="Название" htmlFor="goal-edit-title">
                  <Input id="goal-edit-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className={CFG_DIALOG_INPUT_CN} />
                </CfgLikeDialogRow>
                <CfgLikeDialogRow label="Описание" htmlFor="goal-edit-description">
                  <Textarea
                    id="goal-edit-description"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Описание"
                    rows={4}
                    className="border-input bg-background w-full min-w-0 resize-y rounded-md border px-3 py-2 text-center text-sm shadow-xs"
                  />
                </CfgLikeDialogRow>
                <CfgLikeDialogRow label="Иконка">
                  <button type="button" className={CFG_DIALOG_ICON_TRIGGER_CN} onClick={() => setIconPickerOpen(true)}>
                    <AuraThemedIcon name={icon || null} className="size-5 shrink-0" />
                    <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">{icon || '—'}</span>
                  </button>
                </CfgLikeDialogRow>
                {supportsColor ? (
                  <CfgLikeDialogRow label="Цвет">
                    <button
                      type="button"
                      className={cn(
                        'border-input h-9 w-full min-w-0 overflow-hidden rounded-md border shadow-xs aura-tx-opacity hover:opacity-90',
                        RAW_BUTTON_FOCUS_CN
                      )}
                      style={{ backgroundColor: color || '#64748b' }}
                      onClick={() => setDialogSub('color')}
                    />
                  </CfgLikeDialogRow>
                ) : null}
                <CfgLikeDialogRow label="Дата завершения" htmlFor="goal-edit-completed-at">
                  <div className="flex w-full items-center justify-center gap-2">
                    <Input
                      id="goal-edit-completed-at"
                      type="date"
                      className={CFG_DIALOG_INPUT_CN}
                      value={completedAt}
                      onChange={(e) => setCompletedAt(e.target.value)}
                    />
                    <Button type="button" size="sm" variant="ghost" className="h-9 shrink-0 px-2" onClick={() => setCompletedAt('')}>
                      Сброс
                    </Button>
                  </div>
                </CfgLikeDialogRow>
              </div>
            ) : (
              <div className="min-w-0 w-full rounded-lg border border-border bg-background p-2">
                <ColorPickerPanel
                  value={color}
                  onChange={setColor}
                  onPresetPick={(value) => {
                    setColor(value);
                    setDialogSub('form');
                  }}
                />
              </div>
            )}
          </div>
          {dialogSub === 'form' ? (
            <ActModalFooter
              cancelLabel="Отмена"
              submitLabel="Сохранить"
              onCancel={() => handleMainOpenChange(false)}
              onSubmit={() => {
                onSubmit({
                  title: name.trim(),
                  description: desc.trim(),
                  icon: icon.trim(),
                  color: color.trim() || 'var(--primary)',
                  completedAt: completedAt || null,
                });
                handleMainOpenChange(false);
              }}
            />
          ) : null}
        </UniversalModalContent>
      </Dialog>
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <UniversalModalContent size="picker" scroll="content" className="flex max-h-[min(92svh,48rem)] flex-col gap-0 p-0" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" size="sm" variant="ghost" className="px-2 text-xs" onClick={() => setIconPickerOpen(false)}>
                ← Назад
              </Button>
              <DialogTitle className="text-sm">
                <span className="inline-flex items-center gap-2">
                  <Pencil className="size-4" />
                  <span>Иконка</span>
                </span>
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
            <IconPickerPanel
              current={icon || undefined}
              onPick={(v) => {
                setIcon(v);
                setIconPickerOpen(false);
              }}
            />
          </div>
        </UniversalModalContent>
      </Dialog>
    </>
  );
}

function GoalTaskDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { title: string; description: string; taskType: TaskType; targetValue: string; unit: string; icon: string };
  onSubmit: (v: { title: string; description: string; taskType: TaskType; targetValue: number; unit: string; icon: string }) => void;
}) {
  const [name, setName] = useState(initial.title);
  const [desc, setDesc] = useState(initial.description);
  const [taskType, setTaskType] = useState<TaskType>(initial.taskType);
  const [targetValue, setTargetValue] = useState(initial.targetValue);
  const [unit, setUnit] = useState(initial.unit);
  const [icon, setIcon] = useState(initial.icon);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial.title);
    setDesc(initial.description);
    setTaskType(initial.taskType);
    setTargetValue(initial.targetValue);
    setUnit(initial.unit);
    setIcon(initial.icon);
    setIconPickerOpen(false);
  }, [open, initial]);

  const handleMainOpenChange = (next: boolean) => {
    if (!next) setIconPickerOpen(false);
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleMainOpenChange}>
        <UniversalModalContent size="lg" showCloseButton={false}>
          <DialogHeader className="shrink-0 px-6 pt-5">
            <div className="flex min-h-10 items-center gap-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Target className="size-4" />
                <DialogTitle>Задача этапа</DialogTitle>
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <CfgLikeDialogRow label="Название" htmlFor="goal-task-title">
                <Input id="goal-task-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className={CFG_DIALOG_INPUT_CN} />
              </CfgLikeDialogRow>
              <CfgLikeDialogRow label="Описание" htmlFor="goal-task-description">
                <Textarea
                  id="goal-task-description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Описание"
                  rows={3}
                  className="border-input bg-background w-full min-w-0 resize-y rounded-md border px-3 py-2 text-center text-sm shadow-xs"
                />
              </CfgLikeDialogRow>
              <CfgLikeDialogRow label="Иконка">
                <button type="button" className={CFG_DIALOG_ICON_TRIGGER_CN} onClick={() => setIconPickerOpen(true)}>
                  <AuraThemedIcon name={icon || null} className="size-5 shrink-0" />
                  <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">{icon || '—'}</span>
                </button>
              </CfgLikeDialogRow>
              <CfgLikeDialogRow label="Тип">
                <div className="flex w-full min-w-0 max-w-full gap-2">
                  <Button
                    type="button"
                    className="h-9 min-h-0 min-w-0 flex-1 basis-0 justify-center px-3"
                    variant={taskType === 'checkbox' ? 'default' : 'outline'}
                    onClick={() => setTaskType('checkbox')}
                  >
                    <span className="min-w-0 truncate">Чекбокс</span>
                  </Button>
                  <Button
                    type="button"
                    className="h-9 min-h-0 min-w-0 flex-1 basis-0 justify-center px-3"
                    variant={taskType === 'number' ? 'default' : 'outline'}
                    onClick={() => setTaskType('number')}
                  >
                    <span className="min-w-0 truncate">Число</span>
                  </Button>
                </div>
              </CfgLikeDialogRow>
              {taskType === 'number' ? (
                <CfgLikeDialogRow label="Цель / Ед.">
                  <div className="grid w-full grid-cols-2 gap-2">
                    <ActAffixValueField
                      id="goal-task-target"
                      ariaLabel="Цель"
                      value={targetValue}
                      onCommit={setTargetValue}
                      placeholder="Цель"
                      inputKind="number"
                      suffix={unit.trim() || 'ед.'}
                    />
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ед." className={CFG_DIALOG_INPUT_CN} />
                  </div>
                </CfgLikeDialogRow>
              ) : null}
            </div>
          </div>
          <ActModalFooter
            cancelLabel="Отмена"
            submitLabel="Сохранить"
            onCancel={() => handleMainOpenChange(false)}
            onSubmit={() => {
              onSubmit({
                title: name.trim(),
                description: desc.trim(),
                taskType,
                targetValue: Number(targetValue || 0),
                unit: unit.trim(),
                icon: icon.trim(),
              });
              handleMainOpenChange(false);
            }}
          />
        </UniversalModalContent>
      </Dialog>
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <UniversalModalContent size="picker" scroll="content" className="flex max-h-[min(92svh,48rem)] flex-col gap-0 p-0" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" size="sm" variant="ghost" className="px-2 text-xs" onClick={() => setIconPickerOpen(false)}>
                ← Назад
              </Button>
              <DialogTitle className="text-sm">
                <span className="inline-flex items-center gap-2">
                  <Pencil className="size-4" />
                  <span>Иконка</span>
                </span>
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
            <IconPickerPanel
              current={icon || undefined}
              onPick={(v) => {
                setIcon(v);
                setIconPickerOpen(false);
              }}
            />
          </div>
        </UniversalModalContent>
      </Dialog>
    </>
  );
}

function RitualsChecklistPanel() {
  const { dateString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const { getCached, setCached, invalidate } = useRitualsCache(dateString);
  const [kind, setKind] = useState<RitualKind>('morning');
  const [priorityKind, setPriorityKind] = useState<RitualKind>('morning');
  const [morningRituals, setMorningRituals] = useState<AuraRow[]>(() => {
    const cached = getCached();
    if (cached) return cached.morning;
    return db ? loadCfg(db, 'morning') : [];
  });
  const [eveningRituals, setEveningRituals] = useState<AuraRow[]>(() => {
    const cached = getCached();
    if (cached) return cached.evening;
    return db ? loadCfg(db, 'evening') : [];
  });
  const [morningDone, setMorningDone] = useState<Set<string>>(() => {
    const cached = getCached();
    if (cached) return cached.morningDone;
    return db ? completedSet(db, 'morning', dateString) : new Set();
  });
  const [eveningDone, setEveningDone] = useState<Set<string>>(() => {
    const cached = getCached();
    if (cached) return cached.eveningDone;
    return db ? completedSet(db, 'evening', dateString) : new Set();
  });
  const [isLoaded, setIsLoaded] = useState(() => !!db || !!getCached());
  const kindSlideDirection = useRadioGroupSlideAnimation(kind, ['morning', 'evening'] as const);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RITUALS_KIND_STORAGE);
      if (raw === 'morning' || raw === 'evening') {
        setKind(raw);
        setPriorityKind(raw);
        sessionStorage.removeItem(RITUALS_KIND_STORAGE);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const reload = useCallback(() => {
    if (!db) return;
    const morning = loadCfg(db, 'morning');
    const evening = loadCfg(db, 'evening');
    const morningD = completedSet(db, 'morning', dateString);
    const eveningD = completedSet(db, 'evening', dateString);
    setMorningRituals(morning);
    setEveningRituals(evening);
    setMorningDone(morningD);
    setEveningDone(eveningD);
    setCached({ morning, evening, morningDone: morningD, eveningDone: eveningD });
    setIsLoaded(true);
  }, [db, dateString, setCached]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onData = (ev: Event) => {
      const t = (ev as CustomEvent<{ type?: string }>).detail?.type;
      if (t === 'ritual') {
        invalidate();
        reload();
      }
    };
    window.addEventListener(AURA_DATA_CHANGED, onData);
    return () => window.removeEventListener(AURA_DATA_CHANGED, onData);
  }, [reload, invalidate]);

  const toggle = (kind: RitualKind, ritualId: string, checked: boolean) => {
    if (!db) return;
    runAuraMutation('ritual', () => {
      if (kind === 'morning') db.saveRitualMorning(dateString, ritualId, checked);
      else db.saveRitualEvening(dateString, ritualId, checked);
    });
    if (kind === 'morning') {
      setMorningDone((prev) => {
        const next = new Set(prev);
        if (checked) next.add(ritualId);
        else next.delete(ritualId);
        return next;
      });
      return;
    }
    setEveningDone((prev) => {
      const next = new Set(prev);
      if (checked) next.add(ritualId);
      else next.delete(ritualId);
      return next;
    });
  };

  const orderedSections: Array<{ kind: RitualKind; title: string; rituals: AuraRow[]; done: Set<string> }> =
    priorityKind === 'morning'
      ? [
          { kind: 'morning', title: 'Утро', rituals: morningRituals, done: morningDone },
          { kind: 'evening', title: 'Вечер', rituals: eveningRituals, done: eveningDone },
        ]
      : [
          { kind: 'evening', title: 'Вечер', rituals: eveningRituals, done: eveningDone },
          { kind: 'morning', title: 'Утро', rituals: morningRituals, done: morningDone },
        ];
  const desktopRituals = kind === 'morning' ? morningRituals : eveningRituals;
  const desktopDone = kind === 'morning' ? morningDone : eveningDone;

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden lg:block">
          <ModeSwitchHeader
            value={kind}
            onValueChange={setKind}
            ariaLabel="Режим ритуалов"
            options={[
              { value: 'morning', label: 'Утро', Icon: Sunrise },
              { value: 'evening', label: 'Вечер', Icon: Moon },
            ]}
          />
        </div>
        <div className={cn(MEGA_PANEL_INSET_CN, 'gap-2', getSlideAnimationClasses(true, kindSlideDirection))}>
          {orderedSections.every((section) => section.rituals.length === 0) ? (
            <p className="text-muted-foreground text-sm">Нет активных ритуалов. Добавьте их в настройках.</p>
          ) : (
            <>
              <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto pr-0.5 lg:flex">
                {desktopRituals.length === 0 ? (
                  <p className="text-muted-foreground px-1 text-xs">Нет активных ритуалов</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 sm:gap-2">
                    {desktopRituals.map((r) => {
                      const id = String(r.id);
                      const label = String(r.title ?? r.name ?? id);
                      const isDone = desktopDone.has(id);
                      const ritualColor = 'var(--task-rituals)';
                      return (
                        <li key={id}>
                          <ListItem
                            mode="checkbox"
                            icon={typeof r.icon === 'string' ? r.icon : null}
                            iconTint={ritualColor}
                            title={label}
                            description={typeof r.description === 'string' && r.description.trim() ? r.description : undefined}
                            checked={isDone}
                            onCheckedChange={(v) => toggle(kind, id, v)}
                            isDone={isDone}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5 lg:hidden">
              {orderedSections.map((section) => (
                <section key={section.kind} className="flex min-h-0 flex-col gap-1.5">
                  <p className="text-muted-foreground px-1 text-xs font-semibold uppercase tracking-wider">
                    {section.title}
                  </p>
                  {section.rituals.length === 0 ? (
                    <p className="text-muted-foreground px-1 text-xs">Нет активных ритуалов</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5 sm:gap-2">
                      {section.rituals.map((r) => {
                        const id = String(r.id);
                        const label = String(r.title ?? r.name ?? id);
                        const isDone = section.done.has(id);
                        const ritualColor = 'var(--task-rituals)';
                        return (
                          <li key={id}>
                            <ListItem
                              mode="checkbox"
                              icon={typeof r.icon === 'string' ? r.icon : null}
                              iconTint={ritualColor}
                              title={label}
                              description={undefined}
                              className="border-border/70 bg-card/85 py-1.5"
                              checked={isDone}
                              onCheckedChange={(v) => toggle(section.kind, id, v)}
                              isDone={isDone}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function VowsSingleViewer({ vows, ready }: { vows: AuraRow[]; ready: boolean }) {
  const [idx, setIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!vows.length) {
      setIdx(0);
      return;
    }
    setIdx((prev) => (prev >= vows.length ? 0 : prev));
  }, [vows]);

  const current = vows[idx] as AuraRow | undefined;

  const handleVowChange = (newIdx: number) => {
    if (newIdx === idx) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIdx(newIdx);
      setIsTransitioning(false);
    }, 150);
  };

  const handleNextVow = () => {
    if (vows.length <= 1) return;
    const nextIdx = (idx + 1) % vows.length;
    handleVowChange(nextIdx);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader
        title="Обеты"
        right={
          vows.length > 1 ? (
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {idx + 1}/{vows.length}
            </span>
          ) : null
        }
      />
      <div className={cn(MEGA_PANEL_INSET_CN, 'overflow-hidden pt-2')}>
        {!ready ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : vows.length === 0 || !current ? (
          <p className="text-muted-foreground text-sm">Нет обетов.</p>
        ) : (
          <div
            role="button"
            tabIndex={vows.length > 1 ? 0 : -1}
            aria-disabled={vows.length <= 1}
            onClick={vows.length > 1 ? handleNextVow : undefined}
            onKeyDown={(e) => {
              if (vows.length <= 1) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNextVow();
              }
            }}
            className={cn(
              'flex min-h-0 flex-1 flex-col min-w-0 text-left aura-tx-opacity',
              vows.length > 1 ? 'cursor-pointer active:opacity-85' : 'cursor-default',
              RAW_BUTTON_FOCUS_CN
            )}
          >
            <div className={cn(
              'aura-tx-opacity-fast',
              isTransitioning && 'opacity-60'
            )}>
              <h3 className="mb-2 text-lg font-semibold leading-snug text-foreground sm:mb-3 sm:text-xl">
                {String(current.title ?? current.id)}
              </h3>
            </div>
            <div className={cn(
              'min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-[1.7] text-foreground/85 aura-tx-opacity-fast [scrollbar-width:thin] sm:pr-2 sm:leading-[1.85]',
              isTransitioning && 'opacity-60'
            )}>
              {current.description ? String(current.description) : 'Описание не задано.'}
            </div>
            {vows.length > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-2 shrink-0 pt-3 border-t border-muted/40">
                {vows.map((v, i) => (
                  <button
                    key={String(v.id)}
                    type="button"
                    className={cn(
                      `h-1.5 rounded-full aura-tx-interactive cursor-pointer ${RAW_BUTTON_FOCUS_CN}`,
                      i === idx ? 'bg-foreground/60 w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/45 w-2'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVowChange(i);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalsManagementPanel() {
  const { db, ready } = useAuraDb();
  const dbx = db as AuraDatabase & GoalsDbApi;
  const preferBootstrap = typeof window !== 'undefined' && Boolean(window.__auraMiniApi);

  const [mode, setMode] = useState<GoalsMode>('active');
  const [editMode, setEditMode] = useState(false);
  const [goalIndex, setGoalIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const modeSlideDirection = useRadioGroupSlideAnimation(mode, ['active', 'archive'] as const);

  const [goalDialog, setGoalDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [stageDialog, setStageDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [taskStageId, setTaskStageId] = useState<string | null>(null);
  const [editingTaskValues, setEditingTaskValues] = useState<Record<string, string>>({});
  const [ritualsBootstrap, setRitualsBootstrap] = useState<{
    goals?: AuraRow[];
    stagesByGoal?: Record<string, AuraRow[]>;
    tasksByStage?: Record<string, AuraRow[]>;
    goalProgressRows?: AuraRow[];
  } | null>(null);

  const canManage = Boolean(dbx?.getAllGoals && dbx?.getStagesByGoal && dbx?.getTasksByStage);

  useEffect(() => {
    let cancelled = false;
    const api = window.__auraMiniApi;
    if (!api || !ready) {
      setRitualsBootstrap(null);
      return;
    }
    api
      .fetchBootstrap('rituals', { date: GOALS_GLOBAL_SCOPE_DATE })
      .then((data) => {
        if (!cancelled) setRitualsBootstrap((data ?? null) as typeof ritualsBootstrap);
      })
      .catch(() => {
        if (!cancelled) setRitualsBootstrap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, tick]);

  const goals = useMemo(() => {
    if (!dbx || !ready || !dbx.getAllGoals) return [] as AuraRow[];
    if (ritualsBootstrap?.goals?.length) {
      return [...ritualsBootstrap.goals].sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
    }
    if (preferBootstrap) return [] as AuraRow[];
    return (dbx.getAllGoals() ?? []).sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
  }, [dbx, preferBootstrap, ready, ritualsBootstrap?.goals, tick]);

  const stagesByGoal = useMemo(() => {
    const out = new Map<string, AuraRow[]>();
    if (!dbx || !ready || !dbx.getStagesByGoal) return out;
    if (ritualsBootstrap?.stagesByGoal && Object.keys(ritualsBootstrap.stagesByGoal).length) {
      for (const [goalId, rows] of Object.entries(ritualsBootstrap.stagesByGoal)) {
        const sorted = [...rows].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
        out.set(goalId, sorted);
      }
      return out;
    }
    if (preferBootstrap) return out;
    for (const g of goals) {
      const gid = String(g.id);
      const stages = (dbx.getStagesByGoal(gid) ?? []).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
      out.set(gid, stages);
    }
    return out;
  }, [dbx, preferBootstrap, ready, goals, ritualsBootstrap?.stagesByGoal, tick]);

  const tasksByStage = useMemo(() => {
    const out = new Map<string, AuraRow[]>();
    if (!dbx || !ready || !dbx.getTasksByStage) return out;
    if (ritualsBootstrap?.tasksByStage && Object.keys(ritualsBootstrap.tasksByStage).length) {
      for (const [stageId, rows] of Object.entries(ritualsBootstrap.tasksByStage)) {
        const sorted = [...rows].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
        out.set(stageId, sorted);
      }
      return out;
    }
    if (preferBootstrap) return out;
    for (const stages of stagesByGoal.values()) {
      for (const s of stages) {
        const sid = String(s.id);
        const tasks = (dbx.getTasksByStage(sid) ?? []).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
        out.set(sid, tasks);
      }
    }
    return out;
  }, [dbx, preferBootstrap, ready, ritualsBootstrap?.tasksByStage, stagesByGoal, tick]);

  const goalTaskProgressById = useMemo(() => {
    const out = new Map<string, AuraRow | null | undefined>();
    if (!dbx || !ready) return out;

    const rows =
      ritualsBootstrap?.goalProgressRows ??
      (dbx.getGoalTasksProgressByDate ? dbx.getGoalTasksProgressByDate(GOALS_GLOBAL_SCOPE_DATE) ?? [] : []);
    if (preferBootstrap && !ritualsBootstrap?.goalProgressRows) return out;
    for (const row of rows) {
      const taskId = String(row.task_id ?? '');
      if (!taskId) continue;
      out.set(taskId, row);
    }
    return out;
  }, [dbx, preferBootstrap, ready, ritualsBootstrap?.goalProgressRows, tasksByStage, tick]);

  const goalProgress = useMemo(() => {
    const out = new Map<string, { completed: number; total: number; percent: number }>();
    if (!dbx || !dbx.getStagesByGoal || !dbx.getTasksByStage) return out;
    for (const g of goals) {
      const gid = String(g.id);
      const allStages = stagesByGoal.get(gid) ?? [];
      let total = 0;
      let completed = 0;
      for (const st of allStages) {
        const allTasks = tasksByStage.get(String(st.id)) ?? [];
        for (const t of allTasks) {
          total += 1;
          const tid = String(t.id);
          if (Math.round(calcTaskProgress(t, goalTaskProgressById.get(tid))) === 100) completed += 1;
        }
      }
      out.set(gid, { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 });
    }
    return out;
  }, [dbx, goals, stagesByGoal, tasksByStage, goalTaskProgressById]);

  const stageProgress = useMemo(() => {
    const out = new Map<string, { completed: number; total: number; percent: number }>();
    if (!dbx) return out;
    for (const [sid, allTasks] of tasksByStage.entries()) {
      let total = 0;
      let completed = 0;
      for (const t of allTasks) {
        total += 1;
        const tid = String(t.id);
        if (Math.round(calcTaskProgress(t, goalTaskProgressById.get(tid))) === 100) completed += 1;
      }
      out.set(sid, { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 });
    }
    return out;
  }, [dbx, tasksByStage, goalTaskProgressById]);

  const goalDetails = useMemo(() => {
    const out = new Map<
      string,
      { stagesTotal: number; tasksTotal: number; stageItems: Array<{ id: string; title: string; icon: string | null; done: number; total: number }> }
    >();
    if (!dbx || !dbx.getTasksByStage) return out;
    for (const g of goals) {
      const gid = String(g.id);
      const sts = stagesByGoal.get(gid) ?? [];
      let tasksTotal = 0;
      const stageItems = sts.map((s) => {
        const sid = String(s.id);
        const tks = tasksByStage.get(sid) ?? [];
        let done = 0;
        for (const t of tks) {
          const tid = String(t.id);
          if (Math.round(calcTaskProgress(t, goalTaskProgressById.get(tid))) === 100) done += 1;
        }
        tasksTotal += tks.length;
        return {
          id: sid,
          title: String(s.title ?? s.id),
          icon: typeof s.icon === 'string' ? s.icon : null,
          done,
          total: tks.length,
        };
      });
      out.set(gid, { stagesTotal: sts.length, tasksTotal, stageItems });
    }
    return out;
  }, [dbx, goals, stagesByGoal, tasksByStage, goalTaskProgressById]);

  useEffect(() => {
    if (!goals.length) setGoalIndex(0);
    if (goalIndex >= goals.length) setGoalIndex(0);
  }, [goals.length, goalIndex]);

  const filteredGoals = useMemo(
    () =>
      goals.filter((g) => {
        const p = goalProgress.get(String(g.id));
        const hasAt = g.completed_at != null && String(g.completed_at) !== '';
        if (mode === 'active') return !hasAt || (p?.percent ?? 0) < 100;
        return hasAt && (p?.percent ?? 0) === 100;
      }),
    [goals, goalProgress, mode]
  );

  useEffect(() => {
    if (goalIndex >= filteredGoals.length) setGoalIndex(0);
  }, [filteredGoals.length, goalIndex]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    runAuraMutation('goals', () => undefined);
  }, []);

  const currentGoal = filteredGoals[goalIndex] ?? null;
  const currentGoalId = currentGoal ? String(currentGoal.id) : null;
  const currentGoalHeroTint =
    currentGoal && typeof currentGoal.color === 'string' && currentGoal.color.trim()
      ? String(currentGoal.color)
      : 'var(--primary)';
  const currentStages = currentGoalId ? (stagesByGoal.get(currentGoalId) ?? []) : [];
  const currentGoalTasks = useMemo(
    () => currentStages.flatMap((st) => tasksByStage.get(String(st.id)) ?? []),
    [currentStages, tasksByStage]
  );
  const stageProgressList = currentStages.map((stage) => stageProgress.get(String(stage.id)) ?? { completed: 0, total: 0, percent: 0 });
  const contiguousCompletedStageIndex = (() => {
    let idx = -1;
    for (let i = 0; i < stageProgressList.length; i += 1) {
      if (stageProgressList[i].percent === 100) idx = i;
      else break;
    }
    return idx;
  })();
  const nextStageIndex = contiguousCompletedStageIndex + 1 < currentStages.length ? contiguousCompletedStageIndex + 1 : -1;

  useEffect(() => {
    if (!currentGoalId) return;
    const stat = goalProgress.get(currentGoalId);
    if (!stat || stat.total <= 0 || stat.completed !== stat.total) return;
    const hasStamp = asIsoDate(currentGoal?.completed_at);
    if (hasStamp) return;
    const completedAt = todayIsoDate();
    if (dbx.setGoalCompletedAt) dbx.setGoalCompletedAt(currentGoalId, completedAt);
    else dbx.updateGoal?.(currentGoalId, { completed_at: completedAt });
    refresh();
  }, [currentGoalId, currentGoal?.completed_at, goalProgress, dbx, refresh]);

  useEffect(() => {
    if (!currentStages.length) return;
    let changed = false;
    for (const stage of currentStages) {
      const sid = String(stage.id);
      const st = stageProgress.get(sid);
      if (!st || st.total <= 0 || st.completed !== st.total) continue;
      if (asIsoDate(stage.completed_at)) continue;
      const completedAt = todayIsoDate();
      if (dbx.setStageCompletedAt) dbx.setStageCompletedAt(sid, completedAt);
      else dbx.updateStage?.(sid, { completed_at: completedAt });
      changed = true;
    }
    if (changed) refresh();
  }, [currentStages, stageProgress, dbx, refresh]);

  const currentGoalHistory = useMemo(() => {
    if (!currentGoalTasks.length) return [] as Array<{ date: string; done: number; total: number; percent: number }>;
    const taskMap = new Map<string, AuraRow>(currentGoalTasks.map((t) => [String(t.id), t]));
    const rows = (dbx.getAll?.('act_goal_tasks') ?? []) as AuraRow[];
    const byDate = new Map<string, number>();
    for (const row of rows) {
      const tid = String(row.task_id ?? '');
      const date = asIsoDate(row.date);
      if (!tid || !date) continue;
      const task = taskMap.get(tid);
      if (!task) continue;
      if (Math.round(calcTaskProgress(task, row)) >= 100) {
        byDate.set(date, (byDate.get(date) ?? 0) + 1);
      }
    }
    const total = currentGoalTasks.length;
    return [...byDate.entries()]
      .map(([date, done]) => ({ date, done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [dbx, currentGoalTasks, tick]);

  const goalInitial = goalDialog.editId ? goals.find((g) => String(g.id) === goalDialog.editId) : null;
  const stageInitial = stageDialog.editId
    ? [...stagesByGoal.values()].flat().find((s) => String(s.id) === stageDialog.editId)
    : null;
  const taskInitial = taskDialog.editId
    ? [...tasksByStage.values()].flat().find((t) => String(t.id) === taskDialog.editId)
    : null;

  const goalsScrollRef = useRef<HTMLDivElement>(null);

  const firstIncompleteTask = useMemo(() => {
    if (!dbx) return null;
    for (const st of currentStages) {
      const sid = String(st.id);
      const stageTasks = tasksByStage.get(sid) ?? [];
      for (const t of stageTasks) {
        const tid = String(t.id);
        const raw = goalTaskProgressById.get(tid);
        if (Math.round(calcTaskProgress(t, raw)) < 100) return { sid, tid };
      }
    }
    return null;
  }, [dbx, currentStages, tasksByStage, goalTaskProgressById, tick]);

  const firstIncompleteScrollKey = firstIncompleteTask ? `${firstIncompleteTask.sid}:${firstIncompleteTask.tid}` : '';

  useLayoutEffect(() => {
    const root = goalsScrollRef.current;
    if (!root || !firstIncompleteTask) return;
    const el = root.querySelector<HTMLElement>('[data-goal-scroll-target="1"]');
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [currentGoalId, goalIndex, firstIncompleteScrollKey, filteredGoals.length]);

  const resumeArchivedGoal = useCallback(() => {
    if (!currentGoalId || currentGoalTasks.length === 0) return;
    if (!window.confirm('Сбросить прогресс текущей цели за выбранный день и вернуть её в активные?')) return;
    for (const task of currentGoalTasks) {
      const tid = String(task.id);
      const isNumber = String(task.task_type ?? 'checkbox') === 'number';
      dbx.saveGoalTaskProgress?.(tid, GOALS_GLOBAL_SCOPE_DATE, {
        completed: 0,
        current_value: isNumber ? 0 : null,
      });
      if (dbx.setTaskCompletedAt) dbx.setTaskCompletedAt(tid, null);
      else dbx.updateTask?.(tid, { completed_at: null });
    }
    for (const stage of currentStages) {
      const sid = String(stage.id);
      if (dbx.setStageCompletedAt) dbx.setStageCompletedAt(sid, null);
      else dbx.updateStage?.(sid, { completed_at: null });
    }
    if (dbx.setGoalCompletedAt) dbx.setGoalCompletedAt(currentGoalId, null);
    else dbx.updateGoal?.(currentGoalId, { completed_at: null });
    refresh();
  }, [currentGoalId, currentGoalTasks, currentStages, dbx]);

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden lg:block">
          <ModeSwitchHeader
            value={mode}
            onValueChange={setMode}
            ariaLabel="Режим отображения целей"
            options={[
              { value: 'active', label: 'Активные', Icon: Target },
              { value: 'archive', label: 'Архив', Icon: Archive },
            ]}
          />
        </div>
        <div className={cn(MEGA_PANEL_INSET_CN, getSlideAnimationClasses(true, modeSlideDirection))}>
          {!ready ? (
            <p className="text-muted-foreground text-sm">Загрузка…</p>
          ) : !canManage ? (
            <p className="text-muted-foreground text-sm">Панель целей недоступна в этой среде.</p>
          ) : filteredGoals.length === 0 ? (
            <EmptyState
              title="Список целей пока пуст."
              hint="Добавьте первую цель, чтобы начать трекинг этапов и задач."
              compact
            />
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              {currentGoal ? (
                <>
                  <SectionControlCard
                    className={cn(
                      'relative z-20 mb-0 shrink-0 overflow-hidden border p-0 shadow-sm',
                      'rounded-2xl aura-tx-surface ring-1 ring-foreground/[0.04] dark:ring-white/[0.06]'
                    )}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${currentGoalHeroTint} 2.5%, var(--background) 97.5%)`,
                      borderColor: `color-mix(in srgb, ${currentGoalHeroTint} 8%, var(--border) 92%)`,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute -right-4 -top-8 size-32 rounded-full opacity-[0.028] blur-3xl"
                      style={{
                        backgroundColor:
                          currentGoalHeroTint === 'var(--primary)' ? 'var(--primary)' : currentGoalHeroTint,
                      }}
                      aria-hidden
                    />
                    <div className="relative z-[1] px-2.5 pt-2 pb-0 sm:px-3 sm:pt-2.5">
                      <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
                        <IconWithBadge
                          iconName={typeof currentGoal.icon === 'string' ? currentGoal.icon : null}
                          tint={currentGoalHeroTint}
                          size="md"
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <h3 className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold leading-snug tracking-tight">
                              {String(currentGoal.title ?? currentGoal.id)}
                            </h3>
                            <Button
                              type="button"
                              size="icon"
                              variant={editMode ? 'secondary' : 'ghost'}
                              className={GOALS_RITUALS_ICON_BTN_CN}
                              onClick={() => setEditMode((v) => !v)}
                              aria-pressed={editMode}
                              aria-label={editMode ? 'Режим просмотра' : 'Режим редактирования'}
                              title={editMode ? 'Просмотр' : 'Редактирование'}
                            >
                              {editMode ? <Eye className="size-4" /> : <Pencil className="size-4" />}
                            </Button>
                          </div>
                          <p className="text-muted-foreground mt-0.5 truncate text-xs leading-snug tabular-nums">
                            {(goalDetails.get(String(currentGoal.id))?.stagesTotal ?? 0) === 1
                              ? '1 этап'
                              : `${goalDetails.get(String(currentGoal.id))?.stagesTotal ?? 0} этапов`}
                            <span className="text-muted-foreground/40 mx-1.5">·</span>
                            {(goalProgress.get(String(currentGoal.id))?.completed ?? 0) ===
                            (goalProgress.get(String(currentGoal.id))?.total ?? 0)
                              ? (goalProgress.get(String(currentGoal.id))?.total ?? 0) === 0
                                ? 'нет задач'
                                : `все ${goalProgress.get(String(currentGoal.id))?.total ?? 0} задач`
                              : `${goalProgress.get(String(currentGoal.id))?.completed ?? 0}/${goalProgress.get(String(currentGoal.id))?.total ?? 0} задач`}
                          </p>
                        </div>
                      </div>
                      <GoalTaskSegmentsBar
                        className="mt-2"
                        tasks={currentStages.flatMap((st) => tasksByStage.get(String(st.id)) ?? [])}
                        getRaw={(tid) => goalTaskProgressById.get(tid) ?? null}
                        doneFillStyle={
                          typeof currentGoal.color === 'string' && currentGoal.color.trim()
                            ? {
                                backgroundColor: `color-mix(in srgb, ${String(currentGoal.color)} 78%, var(--foreground) 22%)`,
                              }
                            : { backgroundColor: 'var(--primary)' }
                        }
                        partialFillStyle={
                          typeof currentGoal.color === 'string' && currentGoal.color.trim()
                            ? {
                                backgroundColor: `color-mix(in srgb, ${String(currentGoal.color)} 48%, var(--muted) 52%)`,
                              }
                            : { backgroundColor: 'color-mix(in srgb, var(--primary) 50%, transparent)' }
                        }
                        segmentShellClassName="bg-muted/50"
                      />

                      {mode === 'archive' ? (
                        <div className="border-border/20 mt-2.5 hidden rounded-lg border bg-background/40 px-2.5 py-2 lg:block">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-muted-foreground text-xs">
                              Завершено: <span className="text-foreground">{formatRuDate(currentGoal.completed_at)}</span>
                            </p>
                            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={resumeArchivedGoal}>
                              Сбросить и возобновить
                            </Button>
                          </div>
                          {currentGoalHistory.length ? (
                            <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px]">
                              {currentGoalHistory.slice(0, 6).map((h) => (
                                <span key={h.date}>
                                  {formatRuDate(h.date)}: {h.done}/{h.total}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {filteredGoals.length > 1 || editMode ? (
                        <div className="border-border/20 mt-1.5 flex min-h-8 items-center gap-0.5 border-t pt-1 pb-1 sm:gap-1">
                          {filteredGoals.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn('text-muted-foreground hover:text-foreground', GOALS_RITUALS_ICON_BTN_CN)}
                              disabled={filteredGoals.length <= 1}
                              onClick={() => setGoalIndex((p) => (p - 1 + filteredGoals.length) % filteredGoals.length)}
                              aria-label="Предыдущая цель"
                            >
                              <ChevronLeft className="size-4" />
                            </Button>
                          ) : (
                            <span className="size-8 shrink-0" aria-hidden />
                          )}

                          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2">
                            {filteredGoals.length > 1 ? (
                              <nav
                                className="flex max-w-full justify-center gap-1.5 overflow-x-auto px-0.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                aria-label="Выбор цели"
                              >
                                {filteredGoals.map((g, i) => (
                                  <button
                                    key={String(g.id)}
                                    type="button"
                                    onClick={() => setGoalIndex(i)}
                                    className={cn(
                                      RAW_BUTTON_FOCUS_CN,
                                      'h-1.5 shrink-0 rounded-full transition-[width,background-color,opacity]',
                                      i === goalIndex
                                        ? 'bg-foreground/80 w-5'
                                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5 opacity-90'
                                    )}
                                    aria-label={`Цель ${i + 1}: ${String(g.title ?? g.id)}`}
                                    aria-current={i === goalIndex ? true : undefined}
                                  />
                                ))}
                              </nav>
                            ) : null}
                            {editMode ? (
                              <>
                                {filteredGoals.length > 1 ? (
                                  <div className="bg-border/45 hidden h-4 w-px shrink-0 sm:block" aria-hidden />
                                ) : null}
                                <div
                                  className="flex shrink-0 flex-wrap items-center justify-center gap-0.5"
                                  role="toolbar"
                                  aria-label="Действия с целью"
                                >
                                  {dbx.moveGoal && goalIndex > 0 ? (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className={GOALS_RITUALS_ICON_BTN_CN}
                                      aria-label="Поднять цель"
                                      onClick={() => (dbx.moveGoal?.(String(currentGoal.id), 'up'), refresh())}
                                    >
                                      <ChevronUp className="size-4" />
                                    </Button>
                                  ) : null}
                                  {dbx.moveGoal && goalIndex < filteredGoals.length - 1 ? (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className={GOALS_RITUALS_ICON_BTN_CN}
                                      aria-label="Опустить цель"
                                      onClick={() => (dbx.moveGoal?.(String(currentGoal.id), 'down'), refresh())}
                                    >
                                      <ChevronDown className="size-4" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                    aria-label="Изменить цель"
                                    onClick={() => setGoalDialog({ open: true, editId: String(currentGoal.id) })}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)}
                                    aria-label="Удалить цель"
                                    onClick={() =>
                                      window.confirm('Удалить цель?') &&
                                      (dbx.deleteGoal?.(String(currentGoal.id)), refresh())
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                    onClick={() => setGoalDialog({ open: true, editId: null })}
                                    aria-label="Новая цель"
                                  >
                                    <Plus className="size-4" />
                                  </Button>
                                </div>
                              </>
                            ) : null}
                          </div>

                          {filteredGoals.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn('text-muted-foreground hover:text-foreground', GOALS_RITUALS_ICON_BTN_CN)}
                              disabled={filteredGoals.length <= 1}
                              onClick={() => setGoalIndex((p) => (p + 1) % filteredGoals.length)}
                              aria-label="Следующая цель"
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                          ) : (
                            <span className="size-8 shrink-0" aria-hidden />
                          )}
                        </div>
                      ) : null}
                    </div>
                  </SectionControlCard>

                  <div
                    ref={goalsScrollRef}
                    className="relative z-0 -mt-8 min-h-0 flex-1 overflow-y-auto overscroll-y-contain sm:-mt-9"
                    style={{
                      scrollPaddingTop: '4.25rem',
                      scrollPaddingBottom: '3rem',
                      /* Fade только сверху: заметнее, с запасом под отступ контента */
                      WebkitMaskImage:
                        'linear-gradient(to bottom, transparent 0px, transparent 14px, white 52px, white 100%)',
                      maskImage:
                        'linear-gradient(to bottom, transparent 0px, transparent 14px, white 52px, white 100%)',
                      WebkitMaskSize: '100% 100%',
                      maskSize: '100% 100%',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                    }}
                  >
                    <div className="space-y-0 pt-14 pb-14 sm:pt-16 sm:pb-16">
                    {currentStages.map((s, i) => {
                      const sid = String(s.id);
                      const stageP = stageProgress.get(sid) ?? { completed: 0, total: 0, percent: 0 };
                      const tasks = tasksByStage.get(sid) ?? [];
                      const stageState = getStageVisualState({
                        index: i,
                        percent: stageP.percent,
                        contiguousCompletedIndex: contiguousCompletedStageIndex,
                        nextStageIndex,
                      });
                      const stageClasses = getStageStateClasses(stageState);
                      const goalTint =
                        typeof currentGoal.color === 'string' && currentGoal.color.trim()
                          ? String(currentGoal.color)
                          : 'var(--primary)';
                      const stageTintStyles = getGoalTintSurfaceStyle(goalTint, stageState);
                      const stageCardStyle = stageTintStyles.shellStyle;
                      const tintBorder =
                        stageState === 'current'
                          ? `color-mix(in srgb, ${goalTint} 12%, var(--border) 88%)`
                          : stageState === 'completed'
                            ? `color-mix(in srgb, ${goalTint} 9%, var(--border) 91%)`
                            : stageState === 'frozen'
                              ? `var(--border)`
                              : `color-mix(in srgb, ${goalTint} 8%, var(--border) 92%)`;
                      const outerGlow =
                        stageState === 'current'
                          ? `0 0 0 1px color-mix(in srgb, ${goalTint} 6%, transparent), 0 10px 32px -18px color-mix(in srgb, ${goalTint} 7%, transparent)`
                          : stageState === 'active'
                            ? `0 8px 28px -20px color-mix(in srgb, ${goalTint} 5%, transparent)`
                            : stageState === 'completed'
                              ? `0 6px 22px -20px color-mix(in srgb, ${goalTint} 4%, transparent)`
                              : '';
                      const mergedStageStyle: CSSProperties = {
                        ...stageCardStyle,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: tintBorder,
                      };
                      const shadowParts = [outerGlow, stageCardStyle.boxShadow].filter(Boolean) as string[];
                      if (shadowParts.length) mergedStageStyle.boxShadow = shadowParts.join(', ');
                      return (
                        <div key={sid}>
                          {i > 0 ? <div className="bg-border/30 my-5 h-px w-full" role="presentation" /> : null}
                          <div
                            className={cn(
                              'relative overflow-hidden rounded-2xl aura-tx-surface shadow-sm ring-1 ring-foreground/[0.04] dark:ring-white/[0.06]',
                              stageState === 'current' && 'shadow-md',
                              stageClasses.shell
                            )}
                            style={mergedStageStyle}
                          >
                            <StageSignatureDecor pattern={i} tint={goalTint} />
                            <div className="relative z-[1] min-w-0 space-y-3 px-4 py-5 sm:px-5 sm:py-5">
                              <div
                                className="pointer-events-none mx-auto mb-2.5 h-px max-w-[min(14rem,90%)] rounded-full"
                                style={{
                                  background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${goalTint} 14%, var(--border) 86%) 50%, transparent 100%)`,
                                  boxShadow: `0 0 6px color-mix(in srgb, ${goalTint} 5%, transparent)`,
                                }}
                                aria-hidden
                              />
                                <div className="flex items-center gap-3.5">
                                  <IconWithBadge
                                    iconName={typeof s.icon === 'string' ? s.icon : null}
                                    tint={goalTint}
                                    size="md"
                                    className="shrink-0"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <h4 className={cn('text-sm font-semibold leading-snug sm:text-[15px]', stageClasses.title)}>
                                      <span className="text-muted-foreground font-medium tabular-nums tracking-tight">
                                        Этап {stageOrderRoman(i)}
                                      </span>
                                      <span className="text-muted-foreground/35 mx-2 font-normal" aria-hidden>
                                        ·
                                      </span>
                                      <span className="text-foreground tracking-tight">{String(s.title ?? s.id)}</span>
                                    </h4>
                                    <p className={cn('text-muted-foreground text-sm leading-snug', stageClasses.meta)}>
                                      {stageP.total === 0
                                        ? 'Нет задач'
                                        : stageP.completed === stageP.total
                                          ? `Все ${stageP.total} задач выполнены`
                                          : `${stageP.completed} из ${stageP.total} задач`}
                                      {asIsoDate(s.completed_at) ? (
                                        <>
                                          <span className="text-muted-foreground/45 mx-1.5">·</span>
                                          <span>завершен {formatRuDate(s.completed_at)}</span>
                                        </>
                                      ) : null}
                                    </p>
                                  </div>
                                </div>
                            {s.description && stageP.percent < 100 ? (
                              <p
                                className={cn(
                                  'text-muted-foreground mt-3 whitespace-pre-wrap border-t border-border/25 pt-3 text-sm leading-relaxed break-words',
                                  stageClasses.meta
                                )}
                              >
                                {String(s.description)}
                              </p>
                            ) : null}
                            <GoalTaskSegmentsBar
                              className="mt-3"
                              tasks={tasks}
                              getRaw={(tid) => goalTaskProgressById.get(tid) ?? null}
                              doneFillStyle={{
                                backgroundColor: `color-mix(in srgb, ${goalTint} 78%, var(--foreground) 22%)`,
                              }}
                              partialFillStyle={{
                                backgroundColor: `color-mix(in srgb, ${goalTint} 48%, var(--muted) 52%)`,
                              }}
                              segmentShellClassName="bg-muted/50"
                            />

                            {tasks.length > 0 ? (
                              <div className="divide-border/30 mt-4 divide-y border-t border-border/25 pt-0">
                                {tasks.map((t, ti) => {
                                  const tid = String(t.id);
                                  const tt = String(t.task_type ?? 'checkbox') === 'number' ? 'number' : 'checkbox';
                                  const raw = goalTaskProgressById.get(tid) ?? null;
                                  const pct = Math.round(calcTaskProgress(t, raw));
                                  const isTaskDone = pct === 100;
                                  const editDraft = editingTaskValues[tid];
                                  const trimmedUnit = String(t.unit ?? '').trim();
                                  const targetVal = Number(t.target_value ?? 0);
                                  const currentVal = Number(raw?.current_value ?? 0);
                                  const targetLabel = trimmedUnit ? `${targetVal} ${trimmedUnit}` : String(targetVal);

                                  const isScrollFocus =
                                    firstIncompleteTask != null &&
                                    firstIncompleteTask.sid === sid &&
                                    firstIncompleteTask.tid === tid;

                                  return (
                                    <div
                                      key={tid}
                                      className="flex items-start gap-3 py-3.5 first:pt-3"
                                      data-goal-scroll-target={isScrollFocus ? '1' : undefined}
                                    >
                                      <IconWithBadge
                                        iconName={typeof t.icon === 'string' ? t.icon : null}
                                        tint={goalTint}
                                        size="md"
                                        className="mt-1 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1 space-y-1.5">
                                        {tt === 'checkbox' ? (
                                          <div className="flex items-start gap-2">
                                            <button
                                              type="button"
                                              className={cn(
                                                'flex min-w-0 flex-1 items-start gap-3.5 rounded-md py-0.5 text-left text-sm outline-none',
                                                RAW_BUTTON_FOCUS_CN
                                              )}
                                              onClick={() => {
                                                const checked = Number(raw?.completed) === 1;
                                                dbx.saveGoalTaskProgress?.(tid, GOALS_GLOBAL_SCOPE_DATE, { completed: checked ? 0 : 1 });
                                                refresh();
                                              }}
                                            >
                                              <span
                                                className={cn(
                                                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border text-primary-foreground aura-tx-colors',
                                                  Number(raw?.completed) === 1
                                                    ? 'border-transparent'
                                                    : 'border-border/50 bg-muted/15 text-transparent'
                                                )}
                                                style={
                                                  Number(raw?.completed) === 1 ? { backgroundColor: goalTint } : undefined
                                                }
                                              >
                                                <Check className="size-3.5" strokeWidth={2.5} />
                                              </span>
                                              <span className="min-w-0 flex-1">
                                                <span
                                                  className={cn(
                                                    'block font-medium leading-snug',
                                                    Number(raw?.completed) === 1 && 'text-muted-foreground line-through'
                                                  )}
                                                >
                                                  {String(t.title ?? t.id)}
                                                </span>
                                                {t.description && !isTaskDone ? (
                                                  <span className="text-muted-foreground mt-1 block whitespace-pre-wrap text-sm leading-relaxed">
                                                    {String(t.description)}
                                                  </span>
                                                ) : null}
                                              </span>
                                            </button>
                                            {editMode ? (
                                              <div
                                                className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'shrink-0 justify-end pt-0.5')}
                                                role="toolbar"
                                                aria-label="Действия с задачей"
                                              >
                                                {dbx.moveTask && ti > 0 ? (
                                                  <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                                    aria-label="Поднять задачу"
                                                    onClick={() => (dbx.moveTask?.(tid, 'up'), refresh())}
                                                  >
                                                    <ChevronUp className="size-4" />
                                                  </Button>
                                                ) : null}
                                                {dbx.moveTask && ti < tasks.length - 1 ? (
                                                  <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                                    aria-label="Опустить задачу"
                                                    onClick={() => (dbx.moveTask?.(tid, 'down'), refresh())}
                                                  >
                                                    <ChevronDown className="size-4" />
                                                  </Button>
                                                ) : null}
                                                <Button
                                                  type="button"
                                                  size="icon"
                                                  variant="ghost"
                                                  className={GOALS_RITUALS_ICON_BTN_CN}
                                                  aria-label="Изменить задачу"
                                                  onClick={() => setTaskDialog({ open: true, editId: tid })}
                                                >
                                                  <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="icon"
                                                  variant="ghost"
                                                  className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)}
                                                  aria-label="Удалить задачу"
                                                  onClick={() =>
                                                    window.confirm('Удалить задачу?') && (dbx.deleteTask?.(tid), refresh())
                                                  }
                                                >
                                                  <Trash2 className="size-4" />
                                                </Button>
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                              <span className="text-sm font-medium leading-snug">{String(t.title ?? t.id)}</span>
                                              {editMode ? (
                                                <div
                                                  className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'shrink-0 justify-end')}
                                                  role="toolbar"
                                                  aria-label="Действия с задачей"
                                                >
                                                  {dbx.moveTask && ti > 0 ? (
                                                    <Button
                                                      type="button"
                                                      size="icon"
                                                      variant="ghost"
                                                      className={GOALS_RITUALS_ICON_BTN_CN}
                                                      aria-label="Поднять задачу"
                                                      onClick={() => (dbx.moveTask?.(tid, 'up'), refresh())}
                                                    >
                                                      <ChevronUp className="size-4" />
                                                    </Button>
                                                  ) : null}
                                                  {dbx.moveTask && ti < tasks.length - 1 ? (
                                                    <Button
                                                      type="button"
                                                      size="icon"
                                                      variant="ghost"
                                                      className={GOALS_RITUALS_ICON_BTN_CN}
                                                      aria-label="Опустить задачу"
                                                      onClick={() => (dbx.moveTask?.(tid, 'down'), refresh())}
                                                    >
                                                      <ChevronDown className="size-4" />
                                                    </Button>
                                                  ) : null}
                                                  <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                                    aria-label="Изменить задачу"
                                                    onClick={() => setTaskDialog({ open: true, editId: tid })}
                                                  >
                                                    <Pencil className="size-4" />
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn(
                                                      'text-destructive hover:text-destructive',
                                                      GOALS_RITUALS_ICON_BTN_CN
                                                    )}
                                                    aria-label="Удалить задачу"
                                                    onClick={() =>
                                                      window.confirm('Удалить задачу?') && (dbx.deleteTask?.(tid), refresh())
                                                    }
                                                  >
                                                    <Trash2 className="size-4" />
                                                  </Button>
                                                </div>
                                              ) : null}
                                            </div>
                                            {t.description && !isTaskDone ? (
                                              <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                                                {String(t.description)}
                                              </p>
                                            ) : null}
                                            <div className="text-sm leading-snug">
                                              {editDraft == null ? (
                                                <button
                                                  type="button"
                                                  className={cn(
                                                    'text-muted-foreground rounded-md py-0.5 text-left hover:bg-muted/30',
                                                    RAW_BUTTON_FOCUS_CN
                                                  )}
                                                  onClick={() =>
                                                    setEditingTaskValues((prev) => ({
                                                      ...prev,
                                                      [tid]: String(currentVal),
                                                    }))
                                                  }
                                                >
                                                  <span className="text-foreground font-medium tabular-nums">{currentVal}</span>
                                                  <span className="text-muted-foreground"> {' — '}</span>
                                                  <span className="tabular-nums">{targetLabel}</span>
                                                </button>
                                              ) : (
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                  <Input
                                                    autoFocus
                                                    value={editDraft}
                                                    inputMode="decimal"
                                                    className="h-9 w-full max-w-[10rem] rounded-md border border-input bg-background px-2 text-sm shadow-xs [appearance:textfield] focus-visible:ring-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                    onChange={(e) =>
                                                      setEditingTaskValues((prev) => ({
                                                        ...prev,
                                                        [tid]: (() => {
                                                          const normalized = e.target.value.replace(',', '.');
                                                          const cleaned = normalized.replace(/[^0-9.]/g, '');
                                                          const dotIndex = cleaned.indexOf('.');
                                                          if (dotIndex === -1) return cleaned;
                                                          return `${cleaned.slice(0, dotIndex)}.${cleaned
                                                            .slice(dotIndex + 1)
                                                            .replace(/\./g, '')}`;
                                                        })(),
                                                      }))
                                                    }
                                                    onBlur={() => {
                                                      dbx.saveGoalTaskProgress?.(tid, GOALS_GLOBAL_SCOPE_DATE, {
                                                        current_value: Number(editDraft || 0),
                                                      });
                                                      setEditingTaskValues((prev) => {
                                                        const next = { ...prev };
                                                        delete next[tid];
                                                        return next;
                                                      });
                                                      refresh();
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        (e.currentTarget as HTMLInputElement).blur();
                                                      }
                                                      if (e.key === 'Escape') {
                                                        setEditingTaskValues((prev) => {
                                                          const next = { ...prev };
                                                          delete next[tid];
                                                          return next;
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  <span className="text-muted-foreground text-sm tabular-nums">{targetLabel}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <EmptyState
                                title="Пока нет задач."
                                hint="Добавьте задачу в этот этап, чтобы отслеживать прогресс."
                                className="mt-4"
                                compact
                              />
                            )}

                            {editMode ? (
                              <div className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'mt-2')} role="toolbar" aria-label="Действия с этапом">
                                {dbx.moveStage && i > 0 ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                    aria-label="Поднять этап"
                                    onClick={() => (dbx.moveStage?.(sid, 'up'), refresh())}
                                  >
                                    <ChevronUp className="size-4" />
                                  </Button>
                                ) : null}
                                {dbx.moveStage && i < currentStages.length - 1 ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={GOALS_RITUALS_ICON_BTN_CN}
                                    aria-label="Опустить этап"
                                    onClick={() => (dbx.moveStage?.(sid, 'down'), refresh())}
                                  >
                                    <ChevronDown className="size-4" />
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={GOALS_RITUALS_ICON_BTN_CN}
                                  aria-label="Изменить этап"
                                  onClick={() => setStageDialog({ open: true, editId: sid })}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)}
                                  aria-label="Удалить этап"
                                  onClick={() => window.confirm('Удалить этап?') && (dbx.deleteStage?.(sid), refresh())}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={GOALS_RITUALS_ICON_BTN_CN}
                                  aria-label="Добавить задачу"
                                  onClick={() => (setTaskStageId(sid), setTaskDialog({ open: true, editId: null }))}
                                >
                                  <Plus className="size-4" />
                                </Button>
                              </div>
                            ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {currentStages.length === 0 ? (
                      <EmptyState
                        title="У цели пока нет этапов."
                        hint="Добавьте этап, чтобы распределить задачи по шагам."
                        compact
                      />
                    ) : null}
                    {editMode ? (
                      <AddListButton label="Добавить этап" onClick={() => setStageDialog({ open: true, editId: null })} />
                    ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <GoalEditDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog((s) => ({ ...s, open }))}
        title={goalDialog.editId ? 'Редактирование цели' : 'Новая цель'}
        supportsColor
        initial={{
          title: String(goalInitial?.title ?? ''),
          description: String(goalInitial?.description ?? ''),
          icon: String(goalInitial?.icon ?? ''),
          color: String(goalInitial?.color ?? 'var(--primary)'),
          completedAt: asIsoDate(goalInitial?.completed_at),
        }}
        onSubmit={(v) => {
          if (goalDialog.editId) {
            dbx.updateGoal?.(goalDialog.editId, {
              title: v.title,
              description: v.description,
              icon: v.icon,
              color: v.color,
              completed_at: v.completedAt,
            });
          } else {
            dbx.addGoal?.({
              id: idOrCreate('goal'),
              title: v.title || 'Новая цель',
              description: v.description,
              icon: v.icon,
              color: v.color,
              completed_at: v.completedAt,
              level: goals.length,
            });
          }
          refresh();
        }}
      />

      <GoalEditDialog
        open={stageDialog.open}
        onOpenChange={(open) => setStageDialog((s) => ({ ...s, open }))}
        title={stageDialog.editId ? 'Редактирование этапа' : 'Новый этап'}
        supportsColor={false}
        initial={{
          title: String(stageInitial?.title ?? ''),
          description: String(stageInitial?.description ?? ''),
          icon: String(stageInitial?.icon ?? ''),
          color: '',
          completedAt: asIsoDate(stageInitial?.completed_at),
        }}
        onSubmit={(v) => {
          if (!currentGoalId) return;
          if (stageDialog.editId) {
            dbx.updateStage?.(stageDialog.editId, {
              title: v.title,
              description: v.description,
              icon: v.icon,
              completed_at: v.completedAt,
            });
          } else {
            dbx.addStage?.({
              id: idOrCreate('stage'),
              goal_id: currentGoalId,
              title: v.title || 'Новый этап',
              description: v.description,
              icon: v.icon,
              completed_at: v.completedAt,
              order_index: currentStages.length,
            });
          }
          refresh();
        }}
      />

      <GoalTaskDialog
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((s) => ({ ...s, open }))}
        initial={{
          title: String(taskInitial?.title ?? ''),
          description: String(taskInitial?.description ?? ''),
          taskType: String(taskInitial?.task_type ?? 'checkbox') === 'number' ? 'number' : 'checkbox',
          targetValue: String(Number(taskInitial?.target_value ?? 0)),
          unit: String(taskInitial?.unit ?? ''),
          icon: String(taskInitial?.icon ?? ''),
        }}
        onSubmit={(v) => {
          const targetStageId = taskDialog.editId
            ? String(taskInitial?.stage_id ?? '')
            : String(taskStageId ?? '');
          if (!targetStageId) return;
          if (taskDialog.editId) {
            dbx.updateTask?.(taskDialog.editId, {
              title: v.title,
              description: v.description,
              task_type: v.taskType,
              target_value: v.taskType === 'number' ? v.targetValue : null,
              unit: v.taskType === 'number' ? v.unit : null,
              icon: v.icon,
            });
          } else {
            dbx.addTask?.({
              id: idOrCreate('goal_task'),
              stage_id: targetStageId,
              title: v.title || 'Новая задача',
              description: v.description,
              task_type: v.taskType,
              target_value: v.taskType === 'number' ? v.targetValue : null,
              unit: v.taskType === 'number' ? v.unit : null,
              icon: v.icon,
              order_index: (tasksByStage.get(targetStageId) ?? []).length,
            });
          }
          refresh();
        }}
      />
    </>
  );
}

function LeftStackRitualsVows({
  showRituals,
  showVows,
  vows,
}: {
  showRituals: boolean;
  showVows: boolean;
  vows: AuraRow[];
}) {
  const { ready } = useAuraDb();
  if (!showRituals && !showVows) return null;

  // Both sections visible: split equally
  if (showRituals && showVows) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-border/60 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RitualsChecklistPanel />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <VowsSingleViewer vows={vows} ready={ready} />
        </div>
      </div>
    );
  }

  // Only rituals
  if (showRituals) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RitualsChecklistPanel />
      </div>
    );
  }

  // Only vows
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <VowsSingleViewer vows={vows} ready={ready} />
    </div>
  );
}

export function RitualsPage() {
  const { db, ready } = useAuraDb();
  const [mobileTab, setMobileTab] = useState<'rituals' | 'vows' | 'goals'>('rituals');

  const visibility = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db, ready]);

  const showRituals = visibility.rituals.rituals !== false;
  const showVows = visibility.rituals.vows !== false;
  const showGoals = visibility.rituals.goals !== false;

  const vows = useMemo(() => {
    if (!db || !ready) return [] as AuraRow[];
    return db.getAll('cfg_vows').filter((v) => v.id);
  }, [db, ready]);

  if (!showRituals && !showVows && !showGoals) {
    return (
      <PageFrame>
        <p className="text-muted-foreground text-sm">Включите секции страницы «Ритуалы» в настройках приложения.</p>
      </PageFrame>
    );
  }

  const showLeft = showRituals || showVows;
  const twoColumns = showLeft && showGoals;
  const mobileSections = [
    showRituals ? { id: 'rituals' as const, label: 'Ритуалы', Icon: Sunrise } : null,
    showVows ? { id: 'vows' as const, label: 'Обеты', Icon: Eye } : null,
    showGoals ? { id: 'goals' as const, label: 'Цели', Icon: Target } : null,
  ].filter(Boolean) as Array<{ id: 'rituals' | 'vows' | 'goals'; label: string; Icon: typeof Sunrise }>;

  useEffect(() => {
    if (!mobileSections.some((section) => section.id === mobileTab)) {
      setMobileTab(mobileSections[0]?.id ?? 'rituals');
    }
  }, [mobileSections, mobileTab]);

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {twoColumns ? (
            <>
              <div className="hidden min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:divide-x lg:divide-border/60">
                <LeftStackRitualsVows showRituals={showRituals} showVows={showVows} vows={vows} />
                <GoalsManagementPanel />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {mobileTab === 'rituals' && showRituals ? <RitualsChecklistPanel /> : null}
                  {mobileTab === 'vows' && showVows ? <VowsSingleViewer vows={vows} ready={ready} /> : null}
                  {mobileTab === 'goals' && showGoals ? <GoalsManagementPanel /> : null}
                </div>
                <MobileSectionSwitcher sections={mobileSections} value={mobileTab} onChange={setMobileTab} />
              </div>
            </>
          ) : showLeft ? (
            <LeftStackRitualsVows showRituals={showRituals} showVows={showVows} vows={vows} />
          ) : (
            <GoalsManagementPanel />
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
