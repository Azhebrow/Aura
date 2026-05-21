import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  Palette,
  Pencil,
  Plus,
  Target,
  Trash2,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddListButton } from '@/components/ui/add-list-button';
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
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData, clearBootstrapDataCache } from '@/shared/hooks/use-bootstrap-data';
import { invalidateBootstrapCache } from '@/shared/bridge/mini-app-client';
import { clearReadCache } from '@/shared/bridge/init-web-db-bridge';
import { dispatchAuraDataChanged } from '@/shared/lib/aura-data-events';
import { detectAuraDataSourceMode } from '@/shared/bridge/aura-data-source';
import { ColorPickerPanel } from '@/features/settings/color-picker-panel';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { warmIconsManifest } from '@/features/settings/load-icons-manifest';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import {
  LIST_SCROLL_CONTAINER_CN,
} from '@/shared/ui/mega-section-layout';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { ActAffixValueField, ActModalFooter } from '@/features/act/ActModal';
import { LoadingShell } from '@/shared/ui/data-states';
import { ANIM } from '@/shared/lib/animation-classes';
import { todayIsoDate } from '@/shared/lib/dates';
import {
  type GoalsMode,
  type TaskType,
  type GoalsDbApi,
  RAW_BUTTON_FOCUS_CN,
  CFG_DIALOG_INPUT_CN,
  CFG_DIALOG_ICON_TRIGGER_CN,
  GOALS_RITUALS_ICON_BTN_CN,
  GOALS_RITUALS_TOOLBAR_ROW_CN,
  GOALS_GLOBAL_SCOPE_DATE,
  idOrCreate,
  asIsoDate,
  formatRuDate,
  stageOrderRoman,
  calcTaskProgress,
  getStageVisualState,
  getStageStateClasses,
} from './rituals-utils';

const GOAL_TASK_ROW_CN = 'flex items-start gap-2.5 px-3 py-2.5 aura-tx-colors';

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
    <div className="grid grid-cols-1 border-b border-[var(--aura-border-soft)] last:border-b-0 sm:grid-cols-[minmax(9rem,30%)_1fr] sm:divide-x sm:divide-[var(--aura-border-soft)]">
      <div className="bg-[var(--aura-surface-panel)] flex items-center justify-center px-2 py-2 text-center sm:min-h-9 sm:px-3">
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
              className="aura-action-icon p-0"
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
                    className="aura-action-icon p-0"
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
                  <button type="button" className={CFG_DIALOG_ICON_TRIGGER_CN} onMouseEnter={warmIconsManifest} onFocus={warmIconsManifest} onClick={() => setIconPickerOpen(true)}>
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
                  className="aura-action-icon p-0"
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
                  className="aura-action-icon p-0"
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
                  className="aura-action-icon p-0"
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

export function GoalsManagementPanel() {
  const { db } = useAuraDb();
  const dbx = db as AuraDatabase & GoalsDbApi;

  // Single reactive tick — listens to 'goals' events dispatched by refresh().
  const dataTick = useAuraDataRefresh({ types: ['goals'] });

  const [mode, setMode] = useState<GoalsMode>('active');
  const [editMode, setEditMode] = useState(false);
  const [goalIndex, setGoalIndex] = useState(0);
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [stageDialog, setStageDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [taskStageId, setTaskStageId] = useState<string | null>(null);
  const [editingTaskValues, setEditingTaskValues] = useState<Record<string, string>>({});
  const bootstrapParams = useMemo(() => ({ date: GOALS_GLOBAL_SCOPE_DATE }), []);
  const { data: ritualsBootstrap } = useBootstrapData<{
    goals?: AuraRow[];
    stagesByGoal?: Record<string, AuraRow[]>;
    tasksByStage?: Record<string, AuraRow[]>;
    goalProgressRows?: AuraRow[];
  }>('rituals', bootstrapParams, [dataTick], { enabled: Boolean(db), keepStaleOnError: true });
  const waitForBootstrap = detectAuraDataSourceMode() === 'web-mini-api' && ritualsBootstrap == null;

  const canManage = Boolean(dbx?.getAllGoals && dbx?.getStagesByGoal && dbx?.getTasksByStage);

  const goals = useMemo(() => {
    if (!dbx || !dbx.getAllGoals) return [] as AuraRow[];
    if (ritualsBootstrap?.goals?.length) {
      return [...ritualsBootstrap.goals].sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
    }
    if (waitForBootstrap) return [] as AuraRow[];
    return (dbx.getAllGoals() ?? []).sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
  }, [dbx, ritualsBootstrap?.goals, waitForBootstrap, dataTick]);

  const stagesByGoal = useMemo(() => {
    const out = new Map<string, AuraRow[]>();
    if (!dbx || !dbx.getStagesByGoal) return out;
    if (ritualsBootstrap?.stagesByGoal && Object.keys(ritualsBootstrap.stagesByGoal).length) {
      for (const [goalId, rows] of Object.entries(ritualsBootstrap.stagesByGoal)) {
        const sorted = [...rows].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
        out.set(goalId, sorted);
      }
      return out;
    }
    if (waitForBootstrap) return out;
    for (const g of goals) {
      const gid = String(g.id);
      const stages = (dbx.getStagesByGoal(gid) ?? []).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
      out.set(gid, stages);
    }
    return out;
  }, [dbx, goals, ritualsBootstrap?.stagesByGoal, waitForBootstrap, dataTick]);

  const tasksByStage = useMemo(() => {
    const out = new Map<string, AuraRow[]>();
    if (!dbx || !dbx.getTasksByStage) return out;
    if (ritualsBootstrap?.tasksByStage && Object.keys(ritualsBootstrap.tasksByStage).length) {
      for (const [stageId, rows] of Object.entries(ritualsBootstrap.tasksByStage)) {
        const sorted = [...rows].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
        out.set(stageId, sorted);
      }
      return out;
    }
    if (waitForBootstrap) return out;
    for (const stages of stagesByGoal.values()) {
      for (const s of stages) {
        const sid = String(s.id);
        const tasks = (dbx.getTasksByStage(sid) ?? []).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
        out.set(sid, tasks);
      }
    }
    return out;
  }, [dbx, ritualsBootstrap?.tasksByStage, stagesByGoal, waitForBootstrap, dataTick]);

  const goalTaskProgressById = useMemo(() => {
    const out = new Map<string, AuraRow | null | undefined>();
    if (!dbx || !dbx.getGoalTasksProgressByDate) return out;
    if (ritualsBootstrap?.goalProgressRows) {
      for (const row of ritualsBootstrap.goalProgressRows) {
        const taskId = String(row.task_id ?? '');
        if (!taskId) continue;
        out.set(taskId, row);
      }
      return out;
    }
    if (waitForBootstrap) return out;
    // Direct fallback is only for non-mini-api mode. In mini-api mode the bootstrap
    // request is the freshness boundary and dataTick invalidates it after mutations.
    const rows = dbx.getGoalTasksProgressByDate(GOALS_GLOBAL_SCOPE_DATE) ?? [];
    for (const row of rows) {
      const taskId = String(row.task_id ?? '');
      if (!taskId) continue;
      out.set(taskId, row);
    }
    return out;
  }, [dbx, ritualsBootstrap?.goalProgressRows, waitForBootstrap, dataTick]);

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

  // Clears all cache layers and fires the 'goals' event.
  // The useAuraDataRefresh subscription (dataTick) handles the re-render.
  const refresh = useCallback(() => {
    const detail = { type: 'goals', date: GOALS_GLOBAL_SCOPE_DATE };
    clearReadCache();
    clearBootstrapDataCache(detail);
    invalidateBootstrapCache(detail);
    dispatchAuraDataChanged(detail);
  }, []);

  const currentGoal = filteredGoals[goalIndex] ?? null;
  const currentGoalId = currentGoal ? String(currentGoal.id) : null;
  const canDeleteCurrentGoal = goals.length > 1;
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

  const goalInitial = goalDialog.editId ? goals.find((g) => String(g.id) === goalDialog.editId) : null;
  const stageInitial = stageDialog.editId
    ? [...stagesByGoal.values()].flat().find((s) => String(s.id) === stageDialog.editId)
    : null;
  const taskInitial = taskDialog.editId
    ? [...tasksByStage.values()].flat().find((t) => String(t.id) === taskDialog.editId)
    : null;

  const goalsScrollRef = useRef<HTMLDivElement>(null);
  const [stagesScrolled, setStagesScrolled] = useState(false);

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
  }, [dbx, currentStages, tasksByStage, goalTaskProgressById, dataTick]);

  const firstIncompleteScrollKey = firstIncompleteTask ? `${firstIncompleteTask.sid}:${firstIncompleteTask.tid}` : '';

  useLayoutEffect(() => {
    setStagesScrolled(false);
    if (goalsScrollRef.current) goalsScrollRef.current.scrollTop = 0;
  }, [currentGoalId, goalIndex]);

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
        <div
          className={cn('min-h-0 flex flex-1 flex-col overflow-hidden px-2.5 pt-2 sm:px-4 sm:pt-3', ANIM.enterFade)}
        >
          {!db ? (
            <LoadingShell />
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
                  {/* Goal card — same visual language as NutritionDaySummaryBar */}
                  <div
                    className="relative z-20 shrink-0 overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs"
                    style={{ '--goal-tint': currentGoalHeroTint } as React.CSSProperties}
                  >
                    {/* Main row: icon + title/meta + edit toggle */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-md border"
                        style={{
                          borderColor: `color-mix(in oklab, ${currentGoalHeroTint} 25%, transparent)`,
                          backgroundColor: `color-mix(in oklab, ${currentGoalHeroTint} 12%, transparent)`,
                          color: currentGoalHeroTint,
                        }}
                      >
                        {typeof currentGoal.icon === 'string' && currentGoal.icon ? (
                          <AuraThemedIcon name={currentGoal.icon} className="size-4" />
                        ) : (
                          <Target className="size-4" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-nano font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">
                          {(goalDetails.get(String(currentGoal.id))?.stagesTotal ?? 0) === 1
                            ? '1 этап'
                            : `${goalDetails.get(String(currentGoal.id))?.stagesTotal ?? 0} этапов`}
                          <span className="mx-1 opacity-40">·</span>
                          {(() => {
                            const p = goalProgress.get(String(currentGoal.id));
                            if (!p || p.total === 0) return 'нет задач';
                            return p.completed === p.total ? `все ${p.total}` : `${p.completed} / ${p.total}`;
                          })()}
                        </p>
                        <p className="truncate text-sm font-semibold leading-tight text-foreground">
                          {String(currentGoal.title ?? currentGoal.id)}
                        </p>
                      </div>
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

                    {/* Full-width flush progress bar — edge-to-edge, single bar */}
                    {(() => {
                      const p = goalProgress.get(String(currentGoal.id));
                      const pct = p && p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                      return (
                        <div className="h-[3px] w-full bg-[var(--aura-surface-control)]">
                          <div
                            className="h-full transition-[width] duration-[400ms] ease-out"
                            style={{ width: `${pct}%`, backgroundColor: currentGoalHeroTint, opacity: 0.85 }}
                          />
                        </div>
                      );
                    })()}

                    {/* Bottom zone: nav dots + edit toolbar / archive info */}
                    {(filteredGoals.length > 1 || editMode || mode === 'archive') ? (
                      <div className="flex min-h-9 items-center gap-0.5 border-t border-[var(--aura-border-soft)] px-1">
                        {filteredGoals.length > 1 ? (
                          <Button type="button" variant="ghost" size="icon"
                            className={cn('text-muted-foreground hover:text-foreground', GOALS_RITUALS_ICON_BTN_CN)}
                            disabled={filteredGoals.length <= 1}
                            onClick={() => setGoalIndex((p) => (p - 1 + filteredGoals.length) % filteredGoals.length)}
                            aria-label="Предыдущая цель">
                            <ChevronLeft className="size-4" />
                          </Button>
                        ) : (
                          <span className="size-8 shrink-0" aria-hidden />
                        )}

                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                          {filteredGoals.length > 1 ? (
                            <nav className="flex max-w-full justify-center gap-1.5 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                              aria-label="Выбор цели">
                              {filteredGoals.map((g, i) => (
                                <button key={String(g.id)} type="button" onClick={() => setGoalIndex(i)}
                                  className={cn(RAW_BUTTON_FOCUS_CN, 'h-1.5 shrink-0 rounded-full transition-[width,background-color,opacity]',
                                    i === goalIndex ? 'w-5 bg-foreground/70' : 'w-1.5 bg-muted-foreground/30 opacity-90 hover:bg-muted-foreground/50')}
                                  aria-label={`Цель ${i + 1}: ${String(g.title ?? g.id)}`}
                                  aria-current={i === goalIndex ? true : undefined} />
                              ))}
                            </nav>
                          ) : null}
                          {mode === 'archive' ? (
                            <div className="flex items-center gap-2">
                              <p className="text-muted-foreground text-xs">
                                Завершено: <span className="text-foreground">{formatRuDate(currentGoal.completed_at)}</span>
                              </p>
                              <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={resumeArchivedGoal}>
                                Возобновить
                              </Button>
                            </div>
                          ) : null}
                          {editMode ? (
                            <div className="flex shrink-0 flex-wrap items-center justify-center gap-0.5" role="toolbar" aria-label="Действия с целью">
                              {dbx.moveGoal && goalIndex > 0 ? (
                                <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
                                  aria-label="Поднять цель" onClick={() => (dbx.moveGoal?.(String(currentGoal.id), 'up'), refresh())}>
                                  <ChevronUp className="size-4" />
                                </Button>
                              ) : null}
                              {dbx.moveGoal && goalIndex < filteredGoals.length - 1 ? (
                                <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
                                  aria-label="Опустить цель" onClick={() => (dbx.moveGoal?.(String(currentGoal.id), 'down'), refresh())}>
                                  <ChevronDown className="size-4" />
                                </Button>
                              ) : null}
                              <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
                                aria-label="Изменить цель" onClick={() => setGoalDialog({ open: true, editId: String(currentGoal.id) })}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost"
                                className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)}
                                aria-label="Удалить цель" disabled={!canDeleteCurrentGoal}
                                title={canDeleteCurrentGoal ? 'Удалить цель' : 'Нельзя удалить последнюю цель'}
                                onClick={() => { if (!canDeleteCurrentGoal) return; if (!window.confirm('Удалить цель?')) return; dbx.deleteGoal?.(String(currentGoal.id)); refresh(); }}>
                                <Trash2 className="size-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN}
                                onClick={() => setGoalDialog({ open: true, editId: null })} aria-label="Новая цель">
                                <Plus className="size-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {filteredGoals.length > 1 ? (
                          <Button type="button" variant="ghost" size="icon"
                            className={cn('text-muted-foreground hover:text-foreground', GOALS_RITUALS_ICON_BTN_CN)}
                            disabled={filteredGoals.length <= 1}
                            onClick={() => setGoalIndex((p) => (p + 1) % filteredGoals.length)}
                            aria-label="Следующая цель">
                            <ChevronRight className="size-4" />
                          </Button>
                        ) : (
                          <span className="size-8 shrink-0" aria-hidden />
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div
                    ref={goalsScrollRef}
                    className={cn(LIST_SCROLL_CONTAINER_CN, 'relative z-0 mt-2')}
                    onScroll={(e) => setStagesScrolled(e.currentTarget.scrollTop > 2)}
                    style={{
                      scrollPaddingTop: '0.5rem',
                      scrollPaddingBottom: '1rem',
                      WebkitMaskImage: stagesScrolled
                        ? 'linear-gradient(to bottom, transparent 0, black 2rem, black calc(100% - 2.5rem), transparent 100%)'
                        : 'linear-gradient(to bottom, black calc(100% - 2.5rem), transparent 100%)',
                      maskImage: stagesScrolled
                        ? 'linear-gradient(to bottom, transparent 0, black 2rem, black calc(100% - 2.5rem), transparent 100%)'
                        : 'linear-gradient(to bottom, black calc(100% - 2.5rem), transparent 100%)',
                    }}
                  >
                    <div className="flex flex-col gap-2 pt-1 pb-3">
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
                      const taskTint = stageState === 'frozen' ? 'var(--muted-foreground)' : goalTint;
                      return (
                        <div
                          key={sid}
                          className={cn(
                            'overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs',
                            stageClasses.opacity
                          )}
                        >
                          {/* Stage header */}
                          <div className="flex items-center gap-2 border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5">
                            {/* Number badge */}
                            <div
                              className={cn(
                                'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-micro font-bold leading-none tracking-wide',
                                stageState === 'completed' && 'bg-[var(--aura-surface-control)] text-[var(--aura-text-disabled)]',
                                stageState === 'frozen' && 'bg-[var(--aura-surface-control)] text-[var(--aura-text-disabled)]',
                                stageState === 'active' && 'bg-[var(--aura-surface-control)] text-[var(--aura-text-muted)]',
                              )}
                              style={stageState === 'current' ? { backgroundColor: goalTint, color: 'white' } : undefined}
                            >
                              {stageState === 'completed' ? (
                                <Check className="size-2.5" strokeWidth={3.5} />
                              ) : (
                                stageOrderRoman(i)
                              )}
                            </div>
                            <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', stageClasses.title)}>
                              {String(s.title ?? s.id)}
                            </span>
                            <span className={cn('shrink-0 text-xs tabular-nums', stageClasses.meta)}>
                              {stageP.total === 0
                                ? ''
                                : `${stageP.completed}/${stageP.total}`}
                            </span>
                            {editMode ? (
                              <div className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'shrink-0')} role="toolbar" aria-label="Действия с этапом">
                                {dbx.moveStage && i > 0 ? (
                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Поднять этап"
                                    onClick={() => (dbx.moveStage?.(sid, 'up'), refresh())}
                                  ><ChevronUp className="size-4" /></Button>
                                ) : null}
                                {dbx.moveStage && i < currentStages.length - 1 ? (
                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Опустить этап"
                                    onClick={() => (dbx.moveStage?.(sid, 'down'), refresh())}
                                  ><ChevronDown className="size-4" /></Button>
                                ) : null}
                                <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Изменить этап"
                                  onClick={() => setStageDialog({ open: true, editId: sid })}
                                ><Pencil className="size-4" /></Button>
                                <Button type="button" size="icon" variant="ghost"
                                  className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)} aria-label="Удалить этап"
                                  onClick={() => window.confirm('Удалить этап?') && (dbx.deleteStage?.(sid), refresh())}
                                ><Trash2 className="size-4" /></Button>
                              </div>
                            ) : null}
                          </div>

                            {/* Task list */}
                            {tasks.length > 0 ? (
                              <div className="divide-y divide-[var(--aura-border-soft)]">
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

                                  const taskRowBg = 'hover:bg-[var(--aura-action-hover-bg)]';
                                  return (
                                    <div
                                      key={tid}
                                      className={cn(GOAL_TASK_ROW_CN, taskRowBg)}
                                      data-goal-scroll-target={isScrollFocus ? '1' : undefined}
                                    >
                                      <IconWithBadge
                                        iconName={typeof t.icon === 'string' ? t.icon : null}
                                        tint={taskTint}
                                        size="sm"
                                        className="mt-0.5 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        {tt === 'checkbox' ? (
                                          <div className="flex items-start gap-2">
                                            <button
                                              type="button"
                                              className={cn(
                                                'flex min-w-0 flex-1 items-start gap-2.5 rounded-md py-0.5 text-left outline-none',
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
                                                  'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] aura-tx-colors',
                                                  Number(raw?.completed) === 1
                                                    ? 'border-transparent text-white'
                                                    : 'border-[var(--aura-border-soft)] bg-transparent text-transparent',
                                                )}
                                                style={Number(raw?.completed) === 1 ? { backgroundColor: taskTint } : undefined}
                                              >
                                                <Check className="size-2.5" strokeWidth={3} />
                                              </span>
                                              <span className="min-w-0 flex-1">
                                                <span className={cn(
                                                  'block text-sm font-medium leading-snug',
                                                  Number(raw?.completed) === 1 && 'text-[var(--aura-text-disabled)] line-through'
                                                )}>
                                                  {String(t.title ?? t.id)}
                                                </span>
                                                {t.description && !isTaskDone ? (
                                                  <span className="text-[var(--aura-text-subtle)] mt-0.5 block whitespace-pre-wrap text-xs leading-relaxed">
                                                    {String(t.description)}
                                                  </span>
                                                ) : null}
                                              </span>
                                            </button>
                                            {editMode ? (
                                              <div className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'shrink-0 justify-end pt-0.5')} role="toolbar" aria-label="Действия с задачей">
                                                {dbx.moveTask && ti > 0 ? (
                                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Поднять задачу"
                                                    onClick={() => (dbx.moveTask?.(tid, 'up'), refresh())}
                                                  ><ChevronUp className="size-4" /></Button>
                                                ) : null}
                                                {dbx.moveTask && ti < tasks.length - 1 ? (
                                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Опустить задачу"
                                                    onClick={() => (dbx.moveTask?.(tid, 'down'), refresh())}
                                                  ><ChevronDown className="size-4" /></Button>
                                                ) : null}
                                                <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Изменить задачу"
                                                  onClick={() => setTaskDialog({ open: true, editId: tid })}
                                                ><Pencil className="size-4" /></Button>
                                                <Button type="button" size="icon" variant="ghost"
                                                  className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)} aria-label="Удалить задачу"
                                                  onClick={() => window.confirm('Удалить задачу?') && (dbx.deleteTask?.(tid), refresh())}
                                                ><Trash2 className="size-4" /></Button>
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                              <span className={cn('text-sm font-medium leading-snug', isTaskDone && 'text-[var(--aura-text-disabled)] line-through')}>
                                                {String(t.title ?? t.id)}
                                              </span>
                                              {editMode ? (
                                                <div className={cn(GOALS_RITUALS_TOOLBAR_ROW_CN, 'shrink-0 justify-end')} role="toolbar" aria-label="Действия с задачей">
                                                  {dbx.moveTask && ti > 0 ? (
                                                    <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Поднять задачу"
                                                      onClick={() => (dbx.moveTask?.(tid, 'up'), refresh())}
                                                    ><ChevronUp className="size-4" /></Button>
                                                  ) : null}
                                                  {dbx.moveTask && ti < tasks.length - 1 ? (
                                                    <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Опустить задачу"
                                                      onClick={() => (dbx.moveTask?.(tid, 'down'), refresh())}
                                                    ><ChevronDown className="size-4" /></Button>
                                                  ) : null}
                                                  <Button type="button" size="icon" variant="ghost" className={GOALS_RITUALS_ICON_BTN_CN} aria-label="Изменить задачу"
                                                    onClick={() => setTaskDialog({ open: true, editId: tid })}
                                                  ><Pencil className="size-4" /></Button>
                                                  <Button type="button" size="icon" variant="ghost"
                                                    className={cn('text-destructive hover:text-destructive', GOALS_RITUALS_ICON_BTN_CN)} aria-label="Удалить задачу"
                                                    onClick={() => window.confirm('Удалить задачу?') && (dbx.deleteTask?.(tid), refresh())}
                                                  ><Trash2 className="size-4" /></Button>
                                                </div>
                                              ) : null}
                                            </div>
                                            {t.description && !isTaskDone ? (
                                              <p className="text-[var(--aura-text-subtle)] whitespace-pre-wrap text-xs leading-relaxed">
                                                {String(t.description)}
                                              </p>
                                            ) : null}
                                            <div className="space-y-1">
                                              {editDraft == null ? (
                                                <button
                                                  type="button"
                                                  className={cn(
                                                    'rounded px-0.5 py-0.5 text-left text-sm aura-tx-colors hover:bg-[var(--aura-action-hover-bg)]',
                                                    RAW_BUTTON_FOCUS_CN
                                                  )}
                                                  onClick={() =>
                                                    setEditingTaskValues((prev) => ({ ...prev, [tid]: String(currentVal) }))
                                                  }
                                                >
                                                  <span className="text-foreground font-medium tabular-nums">{currentVal}</span>
                                                  <span className="text-[var(--aura-text-muted)] text-xs"> / {targetLabel}</span>
                                                </button>
                                              ) : (
                                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                                                  <Input
                                                    autoFocus
                                                    value={editDraft}
                                                    inputMode="decimal"
                                                    className="h-8 w-full max-w-[8rem] rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-2 text-sm shadow-xs [appearance:textfield] focus-visible:ring-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                                                  <span className="text-[var(--aura-text-muted)] text-xs tabular-nums">{targetLabel}</span>
                                                </div>
                                              )}
                                              {/* Progress bar for number task */}
                                              {targetVal > 0 && (
                                                <div className="h-1 overflow-hidden rounded-full bg-[var(--aura-surface-panel)]">
                                                  <div
                                                    className="h-full rounded-full aura-tx-width"
                                                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: taskTint }}
                                                  />
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
                                className="px-3 py-3"
                                compact
                              />
                            )}

                            {editMode ? (
                              <div className="border-t border-[var(--aura-border-soft)] px-3 py-2">
                                <AddListButton
                                  label="Добавить задачу"
                                  onClick={() => (setTaskStageId(sid), setTaskDialog({ open: true, editId: null }))}
                                />
                              </div>
                            ) : null}
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
