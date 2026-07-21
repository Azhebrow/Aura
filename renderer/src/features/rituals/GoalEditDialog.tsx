import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Clock, Palette, Pencil, Target, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UNIVERSAL_MODAL_COMPACT_PICKER_CN,
  UNIVERSAL_MODAL_FORM_BODY_CN,
  UniversalModalContent,
} from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_PICKER_COLOR } from '@/shared/config/aura-palette';
import { ColorPickerPanel } from '@/features/settings/color-picker-panel';
import { formatCfgIconLabel } from '@/features/settings/cfg-primitives';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { warmIconsManifest } from '@/features/settings/load-icons-manifest';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { ActModalFooter } from '@/features/act/ActModal';
import { cn } from '@/lib/utils';
import type { PickerTask } from '@/features/timer/timer-utils';
import type { GoalType } from './rituals-utils';
import { asIsoDate, RAW_BUTTON_FOCUS_CN, CFG_DIALOG_INPUT_CN, CFG_DIALOG_ICON_TRIGGER_CN } from './rituals-utils';

const PICKER_GROUP_ORDER = ['Фокус', 'Эскапизм', 'Наполнение'] as const;

export function CfgLikeDialogRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 border-b border-soft last:border-b-0 sm:grid-cols-[minmax(9rem,30%)_1fr] sm:divide-x sm:divide-soft">
      <div className="flex items-center px-2 py-2 text-left sm:min-h-9 sm:px-3">
        <Label htmlFor={htmlFor} className="text-foreground cursor-default text-xs font-semibold leading-snug break-words">
          {label}
        </Label>
      </div>
      <div className="flex min-w-0 w-full flex-col items-stretch justify-center px-2 py-2 sm:min-h-9 sm:px-3">{children}</div>
    </div>
  );
}

export type GoalEditDialogValues = {
  title: string;
  description: string;
  icon: string;
  color: string;
  completedAt: string | null;
  goalType?: GoalType;
  linkedTaskId?: string;
  timelineStartDate?: string;
  thresholdHours?: number | null;
};

type GoalEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: {
    title: string;
    description: string;
    icon: string;
    color: string;
    completedAt?: string;
    goalType?: GoalType;
    linkedTaskId?: string;
    timelineStartDate?: string;
    thresholdHours?: number | null;
  };
  supportsColor: boolean;
  supportsIcon?: boolean;
  /** Show goal-type selector + timeline-specific fields (task + start date). */
  showGoalTypeFields?: boolean;
  /** Show optional description field. Goals do not surface it anywhere, stages still can. */
  showDescriptionField?: boolean;
  /** Show threshold hours field (for timeline stage editing). */
  showThresholdHoursField?: boolean;
  /** Available timer tasks (all groups) for the linked task selector. */
  pickerTasks?: PickerTask[];
  onSubmit: (v: GoalEditDialogValues) => void;
};

export function GoalEditDialog({
  open, onOpenChange, title, initial, supportsColor,
  supportsIcon = true,
  showGoalTypeFields = false, showDescriptionField = true, showThresholdHoursField = false,
  pickerTasks = [],
  onSubmit,
}: GoalEditDialogProps) {
  const [name, setName] = useState(initial.title);
  const [desc, setDesc] = useState(initial.description);
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);
  const [completedAt, setCompletedAt] = useState(asIsoDate(initial.completedAt));
  const [goalType, setGoalType] = useState<GoalType>(initial.goalType ?? 'standard');
  const [linkedTaskId, setLinkedTaskId] = useState(initial.linkedTaskId ?? '');
  const [timelineStartDate, setTimelineStartDate] = useState(asIsoDate(initial.timelineStartDate));
  const [thresholdHours, setThresholdHours] = useState<string>(
    initial.thresholdHours != null ? String(initial.thresholdHours) : ''
  );
  const [dialogSub, setDialogSub] = useState<'form' | 'color'>('form');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial.title);
    setDesc(initial.description);
    setIcon(initial.icon);
    setColor(initial.color);
    setCompletedAt(asIsoDate(initial.completedAt));
    setGoalType(initial.goalType ?? 'standard');
    setLinkedTaskId(initial.linkedTaskId ?? '');
    setTimelineStartDate(asIsoDate(initial.timelineStartDate));
    setThresholdHours(initial.thresholdHours != null ? String(initial.thresholdHours) : '');
    setDialogSub('form');
    setIconPickerOpen(false);
  }, [open, initial]);

  const handleMainOpenChange = (next: boolean) => {
    if (!next) setIconPickerOpen(false);
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const parsed = parseFloat(thresholdHours);
    onSubmit({
      title: name.trim(),
      description: desc.trim(),
      icon: icon.trim(),
      color: color.trim() || 'var(--primary)',
      completedAt: completedAt || null,
      goalType: showGoalTypeFields ? goalType : undefined,
      linkedTaskId: showGoalTypeFields && goalType === 'timeline' ? linkedTaskId : undefined,
      timelineStartDate: showGoalTypeFields && goalType === 'timeline' ? (timelineStartDate || undefined) : undefined,
      thresholdHours: showThresholdHoursField ? (isNaN(parsed) ? null : parsed) : undefined,
    });
    handleMainOpenChange(false);
  };

  const isTimeline = showGoalTypeFields && goalType === 'timeline';

  return (
    <>
      <Dialog open={open} onOpenChange={handleMainOpenChange}>
        <UniversalModalContent size="lg" showCloseButton={false}>
          <DialogHeader className={cn('shrink-0 px-6 pt-5', dialogSub === 'color' && 'border-b border-border/80 pb-3')}>
            {dialogSub === 'form' ? (
              <div className="flex min-h-10 items-center gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {isTimeline ? <Clock className="size-4" /> : <Target className="size-4" />}
                  <DialogTitle>{title}</DialogTitle>
                </div>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="aura-action-icon p-0">
                    <XIcon className="size-4" /><span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button type="button" size="sm" variant="ghost" className="px-2 text-xs" onClick={() => setDialogSub('form')}>
                  ← Назад
                </Button>
                <DialogTitle className="text-sm">
                  <span className="inline-flex items-center gap-2"><Palette className="size-4" /><span>Цвет</span></span>
                </DialogTitle>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="aura-action-icon p-0">
                    <XIcon className="size-4" /><span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            )}
          </DialogHeader>
          <div className={UNIVERSAL_MODAL_FORM_BODY_CN}>
            {dialogSub === 'form' ? (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* Goal-type selector */}
                {showGoalTypeFields ? (
                  <CfgLikeDialogRow label="Тип цели">
                    <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
                      <SelectTrigger contentAlign="start" className={cn('h-9 w-full text-sm', CFG_DIALOG_INPUT_CN, 'px-3')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Стандартная</SelectItem>
                        <SelectItem value="timeline">Временная шкала</SelectItem>
                      </SelectContent>
                    </Select>
                  </CfgLikeDialogRow>
                ) : null}

                <CfgLikeDialogRow label="Название" htmlFor="goal-edit-title">
                  <Input id="goal-edit-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className={CFG_DIALOG_INPUT_CN} />
                </CfgLikeDialogRow>
                {showDescriptionField ? (
                  <CfgLikeDialogRow label="Описание" htmlFor="goal-edit-description">
                    <Textarea id="goal-edit-description" value={desc} onChange={(e) => setDesc(e.target.value)}
                      placeholder="Описание" rows={4}
                      className="border-soft bg-control/55 w-full min-w-0 resize-none rounded-lg border px-3 py-2 text-left text-sm shadow-none focus-visible:bg-control/75" />
                  </CfgLikeDialogRow>
                ) : null}
                {supportsIcon ? (
                  <CfgLikeDialogRow label="Иконка">
                    <button type="button" className={CFG_DIALOG_ICON_TRIGGER_CN} onMouseEnter={warmIconsManifest} onFocus={warmIconsManifest} onClick={() => setIconPickerOpen(true)}>
                      <span className="aura-inline-icon flex size-5 shrink-0 items-center justify-center text-current">
                        <AuraThemedIcon name={icon || null} size={14} tint="currentColor" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{formatCfgIconLabel(icon)}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </CfgLikeDialogRow>
                ) : null}
                {supportsColor ? (
                  <CfgLikeDialogRow label="Цвет">
                    <button
                      type="button"
                      className={cn('border-soft bg-control/55 text-foreground hover:bg-hover flex h-9 w-full min-w-0 items-center justify-start gap-2 rounded-lg border px-3 text-left text-sm shadow-none aura-tx-colors', RAW_BUTTON_FOCUS_CN)}
                      onClick={() => setDialogSub('color')}
                    >
                      <span className="aura-operator-swatch size-5 shrink-0 rounded-md border border-soft shadow-xs" style={{ backgroundColor: color || DEFAULT_PICKER_COLOR }} aria-hidden />
                      <span className="min-w-0 truncate font-medium tabular-nums">{color || DEFAULT_PICKER_COLOR}</span>
                    </button>
                  </CfgLikeDialogRow>
                ) : null}

                {/* Timeline-specific fields for the goal */}
                {isTimeline ? (
                  <>
                    <CfgLikeDialogRow label="Задача таймера">
                      {pickerTasks.length > 0 ? (
                        <Select value={linkedTaskId} onValueChange={setLinkedTaskId}>
                          <SelectTrigger contentAlign="start" className={CFG_DIALOG_INPUT_CN}>
                            <SelectValue placeholder="Выберите задачу" />
                          </SelectTrigger>
                          <SelectContent>
                            {PICKER_GROUP_ORDER.map((groupLabel) => {
                              const items = pickerTasks.filter((t) => t.group === groupLabel);
                              if (!items.length) return null;
                              return (
                                <SelectGroup key={groupLabel}>
                                  <SelectLabel>{groupLabel}</SelectLabel>
                                  {items.map((task) => (
                                    <SelectItem key={task.id} value={task.id} tint={task.color}>
                                      <span className="aura-operator-kpi flex items-center gap-2" style={{ color: task.color }}>
                                        <AuraThemedIcon
                                          name={task.icon ?? null}
                                          tint="currentColor"
                                          className="size-4 shrink-0"
                                        />
                                        <span className="truncate">{task.title}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">Нет задач типа «Таймер»</span>
                      )}
                    </CfgLikeDialogRow>
                    <CfgLikeDialogRow label="Начало отсчёта" htmlFor="goal-edit-start-date">
                      <div className="flex w-full items-center justify-center gap-2">
                        <Input
                          id="goal-edit-start-date"
                          type="date"
                          className={CFG_DIALOG_INPUT_CN}
                          value={timelineStartDate}
                          onChange={(e) => setTimelineStartDate(e.target.value)}
                        />
                        <Button type="button" size="sm" variant="ghost" className="h-9 shrink-0 px-2" onClick={() => setTimelineStartDate('')}>
                          Сброс
                        </Button>
                      </div>
                    </CfgLikeDialogRow>
                  </>
                ) : null}

                {/* Threshold hours for timeline stage */}
                {showThresholdHoursField ? (
                  <CfgLikeDialogRow label="Порог часов" htmlFor="stage-edit-threshold">
                    <Input
                      id="stage-edit-threshold"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="например, 20"
                      className={CFG_DIALOG_INPUT_CN}
                      value={thresholdHours}
                      onChange={(e) => setThresholdHours(e.target.value)}
                    />
                  </CfgLikeDialogRow>
                ) : null}

                {/* Completion date — only for standard goals/stages */}
                {!isTimeline ? (
                  <CfgLikeDialogRow label="Дата завершения" htmlFor="goal-edit-completed-at">
                    <div className="flex w-full items-center justify-center gap-2">
                      <Input id="goal-edit-completed-at" type="date" className={CFG_DIALOG_INPUT_CN}
                        value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
                      <Button type="button" size="sm" variant="ghost" className="h-9 shrink-0 px-2" onClick={() => setCompletedAt('')}>
                        Сброс
                      </Button>
                    </div>
                  </CfgLikeDialogRow>
                ) : null}
              </div>
            ) : (
              <div className="min-w-0 w-full rounded-lg border border-border bg-background p-2">
                <ColorPickerPanel value={color} onChange={setColor} onPresetPick={(value) => { setColor(value); setDialogSub('form'); }} />
              </div>
            )}
          </div>
          {dialogSub === 'form' ? (
            <ActModalFooter
              cancelLabel="Отмена" submitLabel="Сохранить"
              onCancel={() => handleMainOpenChange(false)}
              onSubmit={handleSubmit}
            />
          ) : null}
        </UniversalModalContent>
      </Dialog>
      {supportsIcon ? (
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <UniversalModalContent size="picker" scroll="content" className={UNIVERSAL_MODAL_COMPACT_PICKER_CN} showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <Button type="button" size="sm" variant="ghost" className="shrink-0 px-2 text-xs" onClick={() => setIconPickerOpen(false)}>← К форме</Button>
              <DialogTitle className="min-w-0 flex-1 text-center text-sm font-semibold leading-tight">
                <span className="inline-flex items-center justify-center gap-2"><Pencil className="size-4" /><span>Каталог иконок</span></span>
              </DialogTitle>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0">
                  <XIcon className="size-4" /><span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <IconPickerPanel current={icon || undefined} onPick={(v) => { setIcon(v); setIconPickerOpen(false); }} />
          </div>
        </UniversalModalContent>
      </Dialog>
      ) : null}
    </>
  );
}
