import { useState } from 'react';
import {
  Apple,
  Award,
  CalendarCheck2,
  CalendarRange,
  ChartColumn,
  Clock,
  GitCompare,
  Layers,
  List,
  Smile,
  SquareCheck,
  Sun,
  Table2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  StatsControlsState,
  StatsMeta,
  StatsMode,
  StatsViewType,
} from '@/shared/stats/types';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { StatsAggregationSelector } from './StatsAggregationSelector';
import { StatsMetaIconBadge } from './stats-meta-icon-badge';

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
const VIEW_OPTIONS: UniversalRadioOption<StatsViewType>[] = [
  { value: 'chart', label: 'Графики', Icon: ChartColumn },
  { value: 'table', label: 'Таблица', Icon: Table2 },
];
const GROUP_OPTIONS: UniversalRadioOption<'categories' | 'elements'>[] = [
  { value: 'categories', label: 'Категории', Icon: Layers },
  { value: 'elements', label: 'Элементы', Icon: List },
];

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
  /** Иконки/цвета серий для фильтра и единообразия с графиками. */
  meta?: StatsMeta;
};

export function StatsControlsPanel({ state, onChange, seriesKeys, meta }: Props) {
  const [seriesOpen, setSeriesOpen] = useState(false);

  const setPeriodPreset = (n: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - n);
    const endS = end.toISOString().slice(0, 10);
    const startS = start.toISOString().slice(0, 10);
    onChange({ period: n, startDate: startS, endDate: endS, selectedSeriesKeys: null });
  };

  const onStartDate = (v: string) => {
    const { startDate, endDate } = clampRange(v, state.endDate);
    onChange({
      startDate,
      endDate,
      period: daysBetween(startDate, endDate),
      selectedSeriesKeys: null,
    });
  };

  const onEndDate = (v: string) => {
    const { startDate, endDate } = clampRange(state.startDate, v);
    onChange({
      startDate,
      endDate,
      period: daysBetween(startDate, endDate),
      selectedSeriesKeys: null,
    });
  };

  const selectedCount =
    state.selectedSeriesKeys === null ? seriesKeys.length : state.selectedSeriesKeys.length;

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

  const isSeriesChecked = (key: string) =>
    state.selectedSeriesKeys === null ? true : state.selectedSeriesKeys.includes(key);

  return (
    <div className="flex flex-col gap-3.5 pr-0.5">
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Режим</Label>
        <Select
          value={state.mode}
          onValueChange={(v) => onChange({ mode: v as StatsMode, selectedSeriesKeys: null })}
        >
          <SelectTrigger className="w-full">
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

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Вид</Label>
        <UniversalRadioGroup
          value={state.viewType}
          onValueChange={(next) => onChange({ viewType: next })}
          options={VIEW_OPTIONS}
          ariaLabel="Вид статистики"
          fullWidth
          className="border-border/60 bg-muted/40"
          optionClassName="h-8 flex-1 rounded-md text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Группировка</Label>
        <UniversalRadioGroup
          value={state.groupBy}
          onValueChange={(next) => onChange({ groupBy: next, selectedSeriesKeys: null })}
          options={GROUP_OPTIONS}
          ariaLabel="Группировка статистики"
          fullWidth
          className="border-border/60 bg-muted/40"
          optionClassName="h-8 flex-1 rounded-md text-xs"
        />
      </div>

      <StatsAggregationSelector
        value={state.aggregation}
        onChange={(v) => onChange({ aggregation: v })}
      />

      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Период</Label>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={state.period === n ? 'default' : 'outline'}
              className="h-8 min-w-[2.75rem] flex-1 px-2 text-xs"
              onClick={() => setPeriodPreset(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <div className="border-border/50 bg-muted/15 space-y-2.5 rounded-xl border p-2.5 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <CalendarRange className="text-foreground/85 size-3.5 shrink-0" aria-hidden />
              <span className="text-muted-foreground">Начало периода</span>
            </div>
            <Input
              type="date"
              className="h-9 bg-background/80"
              value={state.startDate}
              onChange={(e) => onStartDate(e.target.value)}
            />
          </div>
          <div className="border-border/40 space-y-1 border-t pt-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <CalendarCheck2 className="text-foreground/85 size-3.5 shrink-0" aria-hidden />
              <span className="text-muted-foreground">Конец периода</span>
            </div>
            <Input
              type="date"
              className="h-9 bg-background/80"
              value={state.endDate}
              onChange={(e) => onEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {seriesKeys.length > 0 && (
        <div className="relative space-y-1.5">
          <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Серии</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full justify-between text-xs"
            onClick={() => setSeriesOpen((o) => !o)}
          >
            <span>Фильтр</span>
            <span className="text-muted-foreground tabular-nums">
              {selectedCount}/{seriesKeys.length}
            </span>
          </Button>
          {seriesOpen ? (
            <div className="border-border/80 bg-popover absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-hidden rounded-xl border p-2.5 shadow-lg ring-1 ring-foreground/8">
              <div className="mb-2 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => {
                    selectAllSeries();
                    setSeriesOpen(false);
                  }}
                >
                  Все
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={clearSeries}>
                  Снять
                </Button>
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto overscroll-y-contain pr-1">
                {seriesKeys.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm">
                    <Checkbox
                      checked={isSeriesChecked(key)}
                      onCheckedChange={(c) => toggleSeries(key, c === true)}
                    />
                    {meta ? (
                      <StatsMetaIconBadge
                        icon={meta.icons[key]}
                        tint={meta.colors[key]}
                        size={11}
                        className="shrink-0"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
