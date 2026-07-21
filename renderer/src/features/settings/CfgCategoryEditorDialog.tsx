// ─── CfgCategoryEditorDialog ──────────────────────────────────────────────────
// Диалог редактирования внешнего вида категории задач на главной:
// название, иконка, цвет из палитры.

import { ChevronRight, Settings, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UNIVERSAL_MODAL_COMPACT_PICKER_CN,
  UniversalModalContent,
} from '@/components/ui/universal-modal';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { SettingsDialogHeader } from '@/features/settings/settings-form-primitives';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { SettingsDialogLayout } from '@/features/settings/settings-dialog-layout';
import { ActModalFooter } from '@/features/act/ActModal';
import { TASK_CATEGORY_PALETTE } from '@/shared/config/aura-palette';
import { cn } from '@/lib/utils';
import { CfgModalGridRow, CFG_INPUT_CN, CFG_ICON_TRIGGER_CN, formatCfgIconLabel } from './cfg-primitives';
import type { TaskCategoryConfig } from './cfg-category-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryForm: TaskCategoryConfig;
  onCategoryFormChange: (update: (prev: TaskCategoryConfig) => TaskCategoryConfig) => void;
  categoryError: string | null;
  /** Диалог выбора иконки (вложенный шаг). */
  iconPickerOpen: boolean;
  onIconPickerOpenChange: (open: boolean) => void;
  onSave: () => void;
  disabled: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CfgCategoryEditorDialog({
  open,
  onOpenChange,
  categoryForm,
  onCategoryFormChange,
  categoryError,
  iconPickerOpen,
  onIconPickerOpenChange,
  onSave,
  disabled,
}: Props) {
  return (
    <>
      {/* ── Main category editor dialog ── */}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) onIconPickerOpenChange(false);
        }}
      >
        <UniversalModalContent size="md" className="flex flex-col gap-0 p-0" showCloseButton={false}>
          <SettingsDialogLayout
            header={<SettingsDialogHeader icon={Settings} title="Внешний вид на главной" showCloseButton />}
            footer={
              <ActModalFooter
                cancelLabel="Отмена"
                submitLabel="Сохранить"
                onCancel={() => onOpenChange(false)}
                onSubmit={onSave}
                submitDisabled={disabled}
              />
            }
          >
            <div className="flex flex-col gap-3">
              {categoryError ? (
                <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm">
                  {categoryError}
                </p>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-soft divide-y divide-soft/70">
                {/* Title */}
                <CfgModalGridRow label="Название">
                  <Input
                    value={categoryForm.title}
                    onChange={(e) => onCategoryFormChange((prev) => ({ ...prev, title: e.target.value }))}
                    className={CFG_INPUT_CN}
                  />
                </CfgModalGridRow>

                {/* Icon */}
                <CfgModalGridRow label="Иконка">
                  <button
                    type="button"
                    className={CFG_ICON_TRIGGER_CN}
                    onClick={() => onIconPickerOpenChange(true)}
                  >
                    <span className="aura-inline-icon flex size-5 shrink-0 items-center justify-center text-current">
                      <AuraThemedIcon name={categoryForm.icon || null} size={14} tint="currentColor" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {categoryForm.icon ? formatCfgIconLabel(categoryForm.icon) : 'Выбрать иконку'}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </CfgModalGridRow>

                {/* Color palette */}
                <CfgModalGridRow label="Цвет">
                  <div className="grid w-full grid-cols-5 gap-1.5 sm:grid-cols-6">
                    {TASK_CATEGORY_PALETTE.map((c, idx) => (
                      <button
                        key={c}
                        type="button"
                        title={`Цвет ${idx + 1}`}
                        onClick={() => onCategoryFormChange((prev) => ({ ...prev, color: c }))}
                        className={cn(
                          'flex h-8 items-center justify-center rounded-lg border bg-control/55 aura-tx-transform hover:scale-[1.02] hover:bg-hover',
                          categoryForm.color === c
                            ? 'border-primary ring-primary/25 ring-2'
                            : 'border-border/70'
                        )}
                      >
                        <span className="aura-operator-swatch size-4 rounded-full border border-soft shadow-xs" style={{ backgroundColor: c }} aria-hidden />
                      </button>
                    ))}
                  </div>
                </CfgModalGridRow>
              </div>
            </div>
          </SettingsDialogLayout>
        </UniversalModalContent>
      </Dialog>

      {/* ── Nested icon picker dialog ── */}
      <Dialog open={iconPickerOpen} onOpenChange={onIconPickerOpenChange}>
        <UniversalModalContent
          size="picker"
          scroll="content"
          className={UNIVERSAL_MODAL_COMPACT_PICKER_CN}
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 border-b border-border/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="px-2 text-xs"
                onClick={() => onIconPickerOpenChange(false)}
              >
                ← Назад
              </Button>
              <DialogTitle className="text-sm">
                <span className="inline-flex items-center justify-center gap-2">
                  <Settings className="size-4" />
                  <span>Иконка категории</span>
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
                  <span className="sr-only">Закрыть</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <IconPickerPanel
              current={categoryForm.icon || undefined}
              onPick={(name) => {
                onCategoryFormChange((prev) => ({ ...prev, icon: name }));
                onIconPickerOpenChange(false);
              }}
            />
          </div>
        </UniversalModalContent>
      </Dialog>
    </>
  );
}
