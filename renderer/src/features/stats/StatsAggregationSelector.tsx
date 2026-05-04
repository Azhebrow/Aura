import { Label } from '@/components/ui/label';
import type { StatsAggregation } from '@/shared/stats/types';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';

const OPTIONS: { value: StatsAggregation; label: string; hint: string }[] = [
  { value: 'day', label: 'День', hint: 'Каждая точка / строка — один календарный день' },
  { value: 'week', label: 'Неделя', hint: 'Суммы и средние по календарным неделям (пн–вс)' },
  { value: 'month', label: 'Месяц', hint: 'По календарным месяцам в выбранном диапазоне' },
  { value: 'year', label: 'Год', hint: 'По календарным годам' },
];

type Props = {
  value: StatsAggregation;
  onChange: (v: StatsAggregation) => void;
};

export function StatsAggregationSelector({ value, onChange }: Props) {
  const active = OPTIONS.find((o) => o.value === value);
  const options: UniversalRadioOption<StatsAggregation>[] = OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Агрегация</Label>
      <UniversalRadioGroup
        value={value}
        onValueChange={onChange}
        options={options}
        ariaLabel="Агрегация времени"
        fullWidth
        className="border-border/60 bg-background p-0.5 shadow-none"
        optionClassName="h-8 justify-center rounded-md px-1 text-xs font-medium"
      />
      {active ? <p className="text-muted-foreground px-0.5 text-xs leading-snug">{active.hint}</p> : null}
    </div>
  );
}
