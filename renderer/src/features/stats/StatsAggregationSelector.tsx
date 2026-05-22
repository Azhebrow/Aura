import type { StatsAggregation } from '@/features/stats/types';
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
      <p className="text-[var(--aura-text-muted)] text-nano font-medium uppercase tracking-wider">Агрегация</p>
      <UniversalRadioGroup
        value={value}
        onValueChange={onChange}
        options={options}
        ariaLabel="Агрегация времени"
        fullWidth
      />
      {active ? <p className="text-[var(--aura-text-muted)] px-0.5 text-nano leading-snug">{active.hint}</p> : null}
    </div>
  );
}
