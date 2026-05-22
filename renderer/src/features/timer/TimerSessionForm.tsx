// ─── TimerSessionForm ─────────────────────────────────────────────────────────
// Диалог создания и редактирования сессии таймера.
// Поля: тип (таймер/секундомер), задача, длительность в минутах.

import { Clock, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ActAffixValueField,
  ActField,
  ActFormTable,
  ActModal,
  ActModalFooter,
  ActModeSwitch,
  ActTableBox,
} from '@/features/act/ActModal';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import type { TimerTaskTab } from './use-timer-tasks';
import type { PickerTask } from './timer-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  dayLocked: boolean;
  // Form state
  formTaskId: string;
  formMinutes: string;
  formTimerType: 'timer' | 'stopwatch';
  formError: string | null;
  // Form callbacks
  onTaskIdChange: (id: string) => void;
  onMinutesChange: (minutes: string) => void;
  onTimerTypeChange: (type: 'timer' | 'stopwatch') => void;
  onSave: () => void;
  onCancel: () => void;
  // Data
  pickerTasks: PickerTask[];
  getTaskColor: (group: TimerTaskTab, taskColor?: string) => string;
};

const PICKER_GROUP_ORDER = ['Фокус', 'Эскапизм', 'Наполнение'] as const;
const GROUP_KEY_BY_LABEL: Record<string, TimerTaskTab> = {
  'Фокус':      'tasks',
  'Эскапизм':   'escape',
  'Наполнение':  'filling',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TimerSessionForm({
  open,
  onOpenChange,
  isEditing,
  dayLocked,
  formTaskId,
  formMinutes,
  formTimerType,
  formError,
  onTaskIdChange,
  onMinutesChange,
  onTimerTypeChange,
  onSave,
  onCancel,
  pickerTasks,
  groupAccentByKey,
  getTaskColor,
}: Props) {
  const { t } = useTranslation('common');

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ActModal
        icon={Timer}
        title={isEditing ? 'Изменить сессию' : 'Добавить сессию'}
        footer={
          <ActModalFooter
            onCancel={onCancel}
            onSubmit={onSave}
            submitDisabled={dayLocked}
            submitLabel={t('action.save')}
          />
        }
      >
        <ActTableBox>
          <ActFormTable>
            {/* Тип: таймер или секундомер */}
            <ActField label={t('field.type')}>
              <ActModeSwitch
                value={formTimerType}
                onValueChange={(next) => onTimerTypeChange(next as 'timer' | 'stopwatch')}
                options={[
                  { value: 'timer',     label: 'Таймер',     icon: Timer },
                  { value: 'stopwatch', label: 'Секундомер', icon: Clock },
                ]}
              />
            </ActField>

            {/* Выбор задачи */}
            <ActField id="sess-task" label={t('field.task')}>
              <Select value={formTaskId} onValueChange={onTaskIdChange}>
                <SelectTrigger id="sess-task" className="h-9 w-full min-w-0 justify-center text-center">
                  <SelectValue placeholder={t('placeholder.select_task')} />
                </SelectTrigger>
                <SelectContent>
                  {PICKER_GROUP_ORDER.map((groupLabel) => {
                    const groupKey = GROUP_KEY_BY_LABEL[groupLabel];
                    const items = pickerTasks.filter((task) => task.group === groupLabel);
                    if (!items.length || !groupKey) return null;
                    return (
                      <SelectGroup key={groupLabel}>
                        <SelectLabel>{groupLabel}</SelectLabel>
                        {items.map((task) => {
                          const tint = getTaskColor(groupKey, task.color);
                          return (
                            <SelectItem key={task.id} value={task.id} tint={tint}>
                              <span className="flex items-center gap-2">
                                <AuraThemedIcon name={typeof task.icon === 'string' ? task.icon : null} tint={tint} className="size-4 shrink-0" />
                                <span className="truncate">{task.title}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </ActField>

            {/* Длительность в минутах */}
            <ActField id="sess-min" label={t('field.duration_min')}>
              <ActAffixValueField
                id="sess-min"
                value={formMinutes}
                suffix={t('label.minutes')}
                inputKind="integer"
                ariaLabel={t('field.duration')}
                onCommit={onMinutesChange}
              />
            </ActField>
          </ActFormTable>
        </ActTableBox>

        {/* Ошибка сохранения */}
        {formError ? (
          <ActTableBox>
            <ActFormTable>
              <ActField label={t('field.error')}>
                <p className="text-destructive text-sm text-center">{formError}</p>
              </ActField>
            </ActFormTable>
          </ActTableBox>
        ) : null}
      </ActModal>
    </Dialog>
  );
}
