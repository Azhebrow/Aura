import { useEffect, useState } from 'react';
import { Target, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UNIVERSAL_MODAL_FORM_BODY_CN,
  UniversalModalContent,
} from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ActModalFooter, ActAffixValueField } from '@/features/act/ActModal';
import { type TaskType, CFG_DIALOG_INPUT_CN } from './rituals-utils';
import { CfgLikeDialogRow } from './GoalEditDialog';

type GoalTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { title: string; description: string; taskType: TaskType; targetValue: string; unit: string };
  onSubmit: (v: { title: string; description: string; taskType: TaskType; targetValue: number; unit: string }) => void;
};

export function GoalTaskDialog({ open, onOpenChange, initial, onSubmit }: GoalTaskDialogProps) {
  const [name, setName] = useState(initial.title);
  const [desc, setDesc] = useState(initial.description);
  const [taskType, setTaskType] = useState<TaskType>(initial.taskType);
  const [targetValue, setTargetValue] = useState(initial.targetValue);
  const [unit, setUnit] = useState(initial.unit);

  useEffect(() => {
    if (!open) return;
    setName(initial.title);
    setDesc(initial.description);
    setTaskType(initial.taskType);
    setTargetValue(initial.targetValue);
    setUnit(initial.unit);
  }, [open, initial]);

  const handleMainOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  return (
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
          <div className={UNIVERSAL_MODAL_FORM_BODY_CN}>
            <div className="overflow-hidden rounded-lg border border-border">
              <CfgLikeDialogRow label="Название" htmlFor="goal-task-title">
                <Input id="goal-task-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className={CFG_DIALOG_INPUT_CN} />
              </CfgLikeDialogRow>
              <CfgLikeDialogRow label="Описание" htmlFor="goal-task-description">
                <Textarea id="goal-task-description" value={desc} onChange={(e) => setDesc(e.target.value)}
                  placeholder="Описание" rows={3}
                  className="border-soft bg-control/55 w-full min-w-0 resize-none rounded-lg border px-3 py-2 text-left text-sm shadow-none focus-visible:bg-control/75" />
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
              onSubmit({ title: name.trim(), description: desc.trim(), taskType, targetValue: Number(targetValue || 0), unit: unit.trim() });
              handleMainOpenChange(false);
            }}
          />
        </UniversalModalContent>
      </Dialog>
  );
}
