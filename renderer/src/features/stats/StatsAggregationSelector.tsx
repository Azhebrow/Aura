import { Label } from '@/components/ui/label';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import type { StatsAggregation } from '@/shared/stats/types';

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

/**
 * «Слайд-бар» сегментов: один ровный трек, активный сегмент выдвигается (как у витринных чартов).
 */
export function StatsAggregationSelector({ value, onChange }: Props) {
  const active = OPTIONS.find((o) => o.value === value);
  const options: UniversalRadioOption<StatsAggregation>[] = OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Агрегация</Label>
      <UniversalRadioGroup
        value={value}
        onValueChange={onChange}
        options={options}
        ariaLabel="Агрегация времени"
        fullWidth
        className="grid grid-cols-4 gap-0.5 border-border/60 bg-muted/25 p-1 shadow-inner"
        optionClassName="h-8 justify-center rounded-lg px-1 text-xs font-medium"
      />
      {active ? (
        <p className="text-muted-foreground border-border/40 rounded-lg border border-dashed bg-muted/10 px-2 py-1.5 text-xs leading-snug">
          {active.hint}
        </p>
      ) : null}
    </div>
  );
}
