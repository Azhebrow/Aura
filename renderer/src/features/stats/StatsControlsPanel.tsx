import {
  Apple,
  Award,
  Clock,
  GitCompare,
  Layers,
  List,
  Smile,
  SquareCheck,
  Sun,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import type { StatsControlsState, StatsMeta, StatsMode } from '@/shared/stats/types';
import { StatsAggregationSelector } from './StatsAggregationSelector';
import { StatsMetaIconBadge } from './StatsMetaIconBadge';

const MODES: { value: StatsMode; label: string; Icon: typeof SquareCheck }[] = [
  { value: 'tasks', label: 'Задачи', Icon: SquareCheck },
  { value: 'finance', label: 'Финансы', Icon: Wallet },
  { value: 'time', label: 'Время', Icon: Clock },
  { value: 'rituals', label: 'Ритуалы', Icon: Sun },
  { value: 'rank', label: 'Очки', Icon: Award },
  { value: 'mood', label: 'Настроение', Icon: Smile },
  { value: 'nutrition', label: 'Питание', Icon: Apple },
  { value: 'correlation', label: 'Корреляция', Icon: GitCompare },
];

const PERIODS = [7, 30, 120, 365] as const;
const GROUP_OPTIONS: UniversalRadioOption<'categories' | 'elements'>[] = [
  { value: 'categories', label: 'Категории', Icon: Layers },
  { value: 'elements', label: 'Элементы', Icon: List },
];
const PERIOD_OPTIONS: UniversalRadioOption<string>[] = PERIODS.map((n) => ({ value: String(n), label: String(n) }));

function clampRange(start: string, end: string): { startDate: string; endDate: string } {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (e < s) return { startDate: end, endDate: start };
  const diff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 730) return { startDate: start, endDate: end };
  const ns = new Date(e);
  ns.setDate(ns.getDate() - 730);
  const y = ns.getFullYear();
  const m = String(ns.getMonth() + 1).padStart(2, '0');
  const d = String(ns.getDate()).padStart(2, '0');
  return { startDate: `${y}-${m}-${d}`, endDate: end };
}

function daysBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

type Props = {
  state: StatsControlsState;
  onChange: (patch: Partial<StatsControlsState>) => void;
  seriesKeys: string[];
  meta?: StatsMeta;
};

export function StatsControlsPanel({ state, onChange, seriesKeys, meta }: Props) {
  const setPeriodPreset = (n: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - n);
    onChange({
      period: n,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  };

  const onStartDate = (v: string) => {
    const { startDate, endDate } = clampRange(v, state.endDate);
    onChange({
      startDate,
      endDate,
      period: daysBetween(startDate, endDate),
    });
  };

  const onEndDate = (v: string) => {
    const { startDate, endDate } = clampRange(state.startDate, v);
    onChange({
      startDate,
      endDate,
      period: daysBetween(startDate, endDate),
    });
  };

  const selectedCount = state.selectedSeriesKeys === null ? seriesKeys.length : state.selectedSeriesKeys.length;

  const toggleSeries = (key: string, checked: boolean) => {
    if (state.selectedSeriesKeys === null) {
      const all = [...seriesKeys];
      const next = checked ? all : all.filter((k) => k !== key);
      onChange({ selectedSeriesKeys: next.length === all.length ? null : next });
      return;
    }
    let next = [...state.selectedSeriesKeys];
    if (checked) {
      if (!next.includes(key)) next.push(key);
    } else {
      next = next.filter((k) => k !== key);
    }
    if (next.length === 0) onChange({ selectedSeriesKeys: [] });
    else if (next.length === seriesKeys.length) onChange({ selectedSeriesKeys: null });
    else onChange({ selectedSeriesKeys: next });
  };

  const selectAllSeries = () => onChange({ selectedSeriesKeys: null });
  const clearSeries = () => onChange({ selectedSeriesKeys: [] });
  const isSeriesChecked = (key: string) => (state.selectedSeriesKeys === null ? true : state.selectedSeriesKeys.includes(key));

  return (
    <div className="flex flex-col gap-5 pr-0.5 sm:gap-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Режим</Label>
        <Select value={state.mode} onValueChange={(v) => onChange({ mode: v as StatsMode, selectedSeriesKeys: null })}>
          <SelectTrigger className="h-9 w-full border-border/60 bg-background text-xs shadow-none">
            <SelectValue placeholder="Режим" />
          </SelectTrigger>
          <SelectContent>
            {MODES.map(({ value, label, Icon }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <Icon className="text-foreground/85 size-4 shrink-0" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Группировка</Label>
        <UniversalRadioGroup
          value={state.groupBy}
          onValueChange={(next) => onChange({ groupBy: next, selectedSeriesKeys: null })}
          options={GROUP_OPTIONS}
          ariaLabel="Группировка статистики"
          fullWidth
          className="border-border/60 bg-background p-0.5 shadow-none"
          optionClassName="h-8 flex-1 rounded-md text-xs"
        />
      </div>

      <div className="space-y-2">
        <StatsAggregationSelector value={state.aggregation} onChange={(v) => onChange({ aggregation: v })} />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Период</Label>
        <UniversalRadioGroup
          value={String(state.period)}
          onValueChange={(next) => setPeriodPreset(Number(next) || 30)}
          options={PERIOD_OPTIONS}
          ariaLabel="Период"
          fullWidth
          className="border-border/60 bg-background p-0.5 shadow-none"
          optionClassName="h-8 flex-1 rounded-md text-xs"
        />
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">От</Label>
            <Input type="date" className="h-9 w-full border-border/60 bg-background text-xs shadow-none" value={state.startDate} onChange={(e) => onStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">До</Label>
            <Input type="date" className="h-9 w-full border-border/60 bg-background text-xs shadow-none" value={state.endDate} onChange={(e) => onEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {seriesKeys.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Серии</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {selectedCount}/{seriesKeys.length}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 border-border/60 bg-background text-xs shadow-none"
              onClick={selectAllSeries}
            >
              Все
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 border-border/60 bg-background text-xs shadow-none"
              onClick={clearSeries}
            >
              Снять
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="space-y-1">
              {seriesKeys.map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/35">
                  <Checkbox checked={isSeriesChecked(key)} onCheckedChange={(c) => toggleSeries(key, c === true)} />
                  {meta ? <StatsMetaIconBadge icon={meta.icons[key]} tint={meta.colors[key]} size={11} className="shrink-0" /> : null}
                  <span className="min-w-0 flex-1 truncate">{key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
