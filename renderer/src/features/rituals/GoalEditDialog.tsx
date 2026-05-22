import { useEffect, useState, type ReactNode } from 'react';
import { Palette, Pencil, Target, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UniversalModalContent } from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPickerPanel } from '@/features/settings/color-picker-panel';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { warmIconsManifest } from '@/features/settings/load-icons-manifest';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { ActModalFooter } from '@/features/act/ActModal';
import { cn } from '@/lib/utils';
import { asIsoDate, RAW_BUTTON_FOCUS_CN, CFG_DIALOG_INPUT_CN, CFG_DIALOG_ICON_TRIGGER_CN } from './rituals-utils';

export function CfgLikeDialogRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
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

type GoalEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: { title: string; description: string; icon: string; color: string; completedAt?: string };
  supportsColor: boolean;
  onSubmit: (v: { title: string; description: string; icon: string; color: string; completedAt: string | null }) => void;
};

export function GoalEditDialog({ open, onOpenChange, title, initial, supportsColor, onSubmit }: GoalEditDialogProps) {
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
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            {dialogSub === 'form' ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <CfgLikeDialogRow label="Название" htmlFor="goal-edit-title">
                  <Input id="goal-edit-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className={CFG_DIALOG_INPUT_CN} />
                </CfgLikeDialogRow>
                <CfgLikeDialogRow label="Описание" htmlFor="goal-edit-description">
                  <Textarea id="goal-edit-description" value={desc} onChange={(e) => setDesc(e.target.value)}
                    placeholder="Описание" rows={4}
                    className="border-input bg-background w-full min-w-0 resize-y rounded-md border px-3 py-2 text-center text-sm shadow-xs" />
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
                      className={cn('border-input h-9 w-full min-w-0 overflow-hidden rounded-md border shadow-xs aura-tx-opacity hover:opacity-90', RAW_BUTTON_FOCUS_CN)}
                      style={{ backgroundColor: color || '#64748b' }}
                      onClick={() => setDialogSub('color')}
                    />
                  </CfgLikeDialogRow>
                ) : null}
                <CfgLikeDialogRow label="Дата завершения" htmlFor="goal-edit-completed-at">
                  <div className="flex w-full items-center justify-center gap-2">
                    <Input id="goal-edit-completed-at" type="date" className={CFG_DIALOG_INPUT_CN}
                      value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
                    <Button type="button" size="sm" variant="ghost" className="h-9 shrink-0 px-2" onClick={() => setCompletedAt('')}>
                      Сброс
                    </Button>
                  </div>
                </CfgLikeDialogRow>
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
              onSubmit={() => {
                onSubmit({ title: name.trim(), description: desc.trim(), icon: icon.trim(), color: color.trim() || 'var(--primary)', completedAt: completedAt || null });
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
