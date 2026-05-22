import { useEffect, useState } from 'react';
import { Pencil, Target, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UniversalModalContent } from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { ActModalFooter, ActAffixValueField } from '@/features/act/ActModal';
import { type TaskType, CFG_DIALOG_INPUT_CN, CFG_DIALOG_ICON_TRIGGER_CN } from './rituals-utils';
import { CfgLikeDialogRow } from './GoalEditDialog';

type GoalTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { title: string; description: string; taskType: TaskType; targetValue: string; unit: string; icon: string };
  onSubmit: (v: { title: string; description: string; taskType: TaskType; targetValue: number; unit: string; icon: string }) => void;
};

export function GoalTaskDialog({ open, onOpenChange, initial, onSubmit }: GoalTaskDialogProps) {
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
                <Button type="button" variant="ghost" size="icon-sm" className="aura-action-icon p-0">
                  <XIcon className="size-4" /><span className="sr-only">Close</span>
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
                <Textarea id="goal-task-description" value={desc} onChange={(e) => setDesc(e.target.value)}
                  placeholder="Описание" rows={3}
                  className="border-input bg-background w-full min-w-0 resize-y rounded-md border px-3 py-2 text-center text-sm shadow-xs" />
              </CfgLikeDialogRow>
              <CfgLikeDialogRow label="Иконка">
                <button type="button" className={CFG_DIALOG_ICON_TRIGGER_CN} onClick={() => setIconPickerOpen(true)}>
                  <AuraThemedIcon name={icon || null} className="size-5 shrink-0" />
                  <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">{icon || '—'}</span>
                </button>
              </CfgLikeDialogRow>
              <CfgLikeDialogRow label="Тип">
                <div className="flex w-full min-w-0 max-w-full gap-2">
                  {(['checkbox', 'number'] as const).map((type) => (
                    <Button key={type} type="button" className="h-9 min-h-0 min-w-0 flex-1 basis-0 justify-center px-3"
                      variant={taskType === type ? 'default' : 'outline'}
                      onClick={() => setTaskType(type)}>
                      <span className="min-w-0 truncate">{type === 'checkbox' ? 'Чекбокс' : 'Число'}</span>
                    </Button>
                  ))}
                </div>
              </CfgLikeDialogRow>
              {taskType === 'number' ? (
                <CfgLikeDialogRow label="Цель / Ед.">
                  <div className="grid w-full grid-cols-2 gap-2">
                    <ActAffixValueField
                      id="goal-task-target" ariaLabel="Цель" value={targetValue} onCommit={setTargetValue}
                      placeholder="Цель" inputKind="number" suffix={unit.trim() || 'ед.'} />
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ед." className={CFG_DIALOG_INPUT_CN} />
                  </div>
                </CfgLikeDialogRow>
              ) : null}
            </div>
          </div>
          <ActModalFooter
            cancelLabel="Отмена" submitLabel="Сохранить"
            onCancel={() => handleMainOpenChange(false)}
            onSubmit={() => {
              onSubmit({ title: name.trim(), description: desc.trim(), taskType, targetValue: Number(targetValue || 0), unit: unit.trim(), icon: icon.trim() });
              handleMainOpenChange(false);
            }}
          />
        </UniversalModalContent>
      </Dialog>
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <UniversalModalContent size="picker" scroll="content" className="flex max-h-[min(92svh,48rem)] flex-col gap-0 p-0" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" size="sm" variant="ghost" className="px-2 text-xs" onClick={() => setIconPickerOpen(false)}>← Назад</Button>
              <DialogTitle className="text-sm">
                <span className="inline-flex items-center gap-2"><Pencil className="size-4" /><span>Иконка</span></span>
              </DialogTitle>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="aura-action-icon p-0">
                  <XIcon className="size-4" /><span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
            <IconPickerPanel current={icon || undefined} onPick={(v) => { setIcon(v); setIconPickerOpen(false); }} />
          </div>
        </UniversalModalContent>
      </Dialog>
    </>
  );
}
