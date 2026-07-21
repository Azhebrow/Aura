import {
  Apple,
  Award,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ChevronDown,
  Clock,
  GitCompare,
  Layers,
  List,
  Moon,
  SquareCheck,
  Sun,
  SunDim,
  Table2,
  ChartPie,
  Wallet,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StatsControlsState, StatsMeta, StatsMode, StatsAggregation } from '@/features/stats/types';
import { StatsMetaIconBadge } from './StatsMetaIconBadge';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const MODES: { value: StatsMode; label: string; Icon: LucideIcon }[] = [
  { value: 'tasks',       label: 'Задачи',     Icon: SquareCheck },
  { value: 'finance',     label: 'Финансы',    Icon: Wallet      },
  { value: 'time',        label: 'Время',       Icon: Clock       },
  { value: 'rituals',     label: 'Ритуалы',    Icon: Sun         },
  { value: 'rank',        label: 'Очки',        Icon: Award       },
  { value: 'nutrition',   label: 'Питание',     Icon: Apple       },
  { value: 'correlation', label: 'Связи',       Icon: GitCompare  },
];

const AGGREGATIONS: { value: StatsAggregation; label: string; Icon: LucideIcon; hint: string }[] = [
  { value: 'day',   label: 'День',   Icon: SunDim,        hint: '' },
  { value: 'week',  label: 'Неделя', Icon: CalendarDays,  hint: '' },
  { value: 'month', label: 'Месяц',  Icon: Calendar,      hint: '' },
  { value: 'year',  label: 'Год',    Icon: CalendarRange, hint: '' },
];

const PERIODS: { value: number; label: string; Icon: LucideIcon }[] = [
  { value: 7,   label: '7д',   Icon: Moon         },
  { value: 30,  label: '30д',  Icon: CalendarDays },
  { value: 120, label: '120д', Icon: Calendar     },
  { value: 365, label: '365д', Icon: CalendarRange},
];

function clampRange(start: string, end: string): { startDate: string; endDate: string } {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (e < s) return { startDate: end, endDate: start };
  const diff = (e.getTime() - s.getTime()) / 86400000;
  if (diff <= 730) return { startDate: start, endDate: end };
  const ns = new Date(e);
  ns.setDate(ns.getDate() - 730);
  return {
    startDate: `${ns.getFullYear()}-${String(ns.getMonth() + 1).padStart(2, '0')}-${String(ns.getDate()).padStart(2, '0')}`,
    endDate: end,
  };
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000);
}

function compactDateLabel(value: string): string {
  const [, month, day] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  return month && day ? `${day}.${month}` : value;
}

const CONTROL_H_CN = 'h-7';
const CONTROL_SURFACE_CN = 'rounded-lg border border-soft/55 bg-control/55 shadow-none';
const COMPACT_SELECT_CN = cn('!h-7 !min-h-7 w-full min-w-0 rounded-lg border-soft/55 bg-control/55 px-2 py-0 !text-xs shadow-none');
const INPUT_CN = 'h-full w-full rounded-lg border-0 bg-transparent px-2 !text-xs shadow-none';
const FILTER_UNIT_CN = 'min-w-0 space-y-1';
const FILTER_LABEL_CN = 'text-dim text-[9px] font-semibold uppercase leading-none tracking-[0.04em]';

function Chip({
  active, onClick, icon: Icon, label, iconOnly = false,
}: {
  active: boolean; onClick: () => void; icon?: LucideIcon; label: string; iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'aura-stats-chip flex h-full min-h-0 min-w-0 items-center justify-center gap-1 rounded-md text-xs font-normal leading-none aura-tx-colors',
        iconOnly ? 'px-1' : 'px-1.5',
        active
          ? 'bg-primary/15 text-primary ring-1 ring-primary/25 font-medium'
          : 'text-dim hover:bg-hover hover:text-foreground'
      )}
    >
      {Icon && <Icon className="size-3 shrink-0 opacity-80" strokeWidth={1.75} />}
      <span className={cn('truncate', iconOnly && 'sr-only')}>{label}</span>
    </button>
  );
}

function DateRangeField({
  startDate,
  endDate,
  onStartDate,
  onEndDate,
}: {
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
}) {
  return (
    <div className={cn('relative flex w-full cursor-pointer items-center justify-center overflow-hidden px-1 text-xs aura-tx-colors hover:bg-hover focus-within:ring-2 focus-within:ring-ring/60', CONTROL_H_CN, CONTROL_SURFACE_CN)}>
      <span className="pointer-events-none flex min-w-0 items-center justify-center gap-1 text-foreground">
        <Calendar className="size-3 shrink-0 text-dim" aria-hidden />
        <span className="min-w-0 truncate tabular-nums">{compactDateLabel(startDate)}-{compactDateLabel(endDate)}</span>
      </span>
      <Input
        type="date"
        className={cn(
          INPUT_CN,
          'absolute inset-y-0 left-0 h-full w-1/2 cursor-pointer opacity-0',
          '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer'
        )}
        value={startDate}
        onChange={(e) => onStartDate(e.target.value)}
        aria-label="Начальная дата"
      />
      <Input
        type="date"
        className={cn(
          INPUT_CN,
          'absolute inset-y-0 right-0 h-full w-1/2 cursor-pointer opacity-0',
          '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer'
        )}
        value={endDate}
        onChange={(e) => onEndDate(e.target.value)}
        aria-label="Конечная дата"
      />
    </div>
  );
}

type Props = {
  state: StatsControlsState;
  onChange: (patch: Partial<StatsControlsState>) => void;
  seriesKeys: string[];
  meta?: StatsMeta;
  view: 'chart' | 'pie' | 'table';
  onViewChange: (view: 'chart' | 'pie' | 'table') => void;
  availableViews?: Array<'chart' | 'pie' | 'table'>;
};

export function StatsControlsPanel({ state, onChange, seriesKeys, meta, view, onViewChange, availableViews = ['chart', 'table'] }: Props) {
  const [seriesOpen, setSeriesOpen] = useState(false);

  const setPeriodPreset = (n: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - Math.max(0, n - 1));
    onChange({ period: n, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
  };

  const onStartDate = (v: string) => {
    const { startDate, endDate } = clampRange(v, state.endDate);
    onChange({ startDate, endDate, period: daysBetween(startDate, endDate) });
  };

  const onEndDate = (v: string) => {
    const { startDate, endDate } = clampRange(state.startDate, v);
    onChange({ startDate, endDate, period: daysBetween(startDate, endDate) });
  };

  const selectedCount = state.selectedSeriesKeys === null ? seriesKeys.length : state.selectedSeriesKeys.length;
  const isChecked = (k: string) => state.selectedSeriesKeys === null || state.selectedSeriesKeys.includes(k);
  const activeMode = MODES.find((m) => m.value === state.mode);
  const viewOptions = [
    { value: 'chart' as const, label: 'Граф.', Icon: ChartColumn },
    { value: 'pie' as const, label: 'Доли', Icon: ChartPie },
    { value: 'table' as const, label: 'Табл.', Icon: Table2 },
  ].filter((item) => availableViews.includes(item.value));
  const visibleSeriesLabel = useMemo(() => {
    if (!seriesKeys.length) return '0';
    if (state.selectedSeriesKeys === null) return `${seriesKeys.length}/${seriesKeys.length}`;
    return `${state.selectedSeriesKeys.length}/${seriesKeys.length}`;
  }, [seriesKeys.length, state.selectedSeriesKeys]);

  const toggleSeries = (key: string, checked: boolean) => {
    if (state.selectedSeriesKeys === null) {
      const next = checked ? null : seriesKeys.filter((k) => k !== key);
      onChange({ selectedSeriesKeys: next === null || next.length === seriesKeys.length ? null : next });
      return;
    }
    let next = [...state.selectedSeriesKeys];
    if (checked) { if (!next.includes(key)) next.push(key); }
    else { next = next.filter((k) => k !== key); }
    onChange({ selectedSeriesKeys: next.length === seriesKeys.length ? null : next });
  };

  return (
    <div className="aura-operator-toolbar aura-stats-toolbar flex shrink-0 flex-col gap-2 border-b border-soft bg-panel/95 px-2.5 py-2 shadow-xs backdrop-blur sm:px-3">
      <div className="aura-stats-control-grid grid min-w-0 grid-cols-2 gap-x-1.5 gap-y-2 md:grid-cols-4 xl:grid-cols-7">
        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Экран</span>
          <div className={cn('grid min-w-0 gap-0.5 p-0.5', viewOptions.length === 3 ? 'grid-cols-3' : viewOptions.length > 1 ? 'grid-cols-2' : 'grid-cols-1', CONTROL_H_CN, CONTROL_SURFACE_CN)}>
            {viewOptions.map(({ value, label, Icon }) => (
              <Chip key={value} active={view === value} onClick={() => onViewChange(value)} icon={Icon} label={label} iconOnly />
            ))}
          </div>
        </div>

        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Вид</span>
          <div className={cn('grid min-w-0 grid-cols-2 gap-0.5 p-0.5', CONTROL_H_CN, CONTROL_SURFACE_CN)}>
            {([
              { value: 'categories', label: 'Кат', Icon: Layers },
              { value: 'elements',   label: 'Эл',  Icon: List   },
            ] as const).map(({ value, label, Icon }) => (
              <Chip key={value} active={state.groupBy === value} onClick={() => onChange({ groupBy: value, selectedSeriesKeys: null })} icon={Icon} label={label} iconOnly />
            ))}
          </div>
        </div>

        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Тип</span>
          <Select value={state.mode} onValueChange={(v) => onChange({ mode: v as StatsMode, selectedSeriesKeys: null })}>
            <SelectTrigger size="sm" className={COMPACT_SELECT_CN}>
              <SelectValue>
                {activeMode ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <activeMode.Icon className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate text-xs">{activeMode.label}</span>
                  </span>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MODES.map(({ value, label, Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 shrink-0 opacity-70" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Шаг</span>
          <Select value={state.aggregation} onValueChange={(v) => onChange({ aggregation: v as StatsAggregation })}>
            <SelectTrigger size="sm" className={COMPACT_SELECT_CN}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGGREGATIONS.map(({ value, label, Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 shrink-0 opacity-70" />
                    <span>{label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Период</span>
          <Select value={String(state.period)} onValueChange={(v) => setPeriodPreset(Number(v))}>
            <SelectTrigger size="sm" className={COMPACT_SELECT_CN}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(({ value, label, Icon }) => (
                <SelectItem key={value} value={String(value)}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 shrink-0 opacity-70" />
                    <span>{label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Даты</span>
          <DateRangeField startDate={state.startDate} endDate={state.endDate} onStartDate={onStartDate} onEndDate={onEndDate} />
        </div>

        <div className={cn('aura-stats-control-cell', FILTER_UNIT_CN)}>
          <span className={cn('aura-stats-control-label', FILTER_LABEL_CN)}>Серии</span>
          <button
            type="button"
            className={cn('flex w-full min-w-0 items-center justify-between gap-1 px-2 text-xs text-foreground aura-tx-colors hover:bg-hover', CONTROL_H_CN, CONTROL_SURFACE_CN)}
            onClick={() => setSeriesOpen((v) => !v)}
            aria-expanded={seriesOpen}
          >
            <span className="min-w-0 truncate">{visibleSeriesLabel}</span>
            <ChevronDown className={cn('size-3 shrink-0 text-dim transition-transform', seriesOpen && 'rotate-180')} />
          </button>
        </div>
      </div>

      {seriesOpen && seriesKeys.length > 0 ? (
        <div className="rounded-md border border-soft bg-control/35 p-1.5">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <p className="text-dim text-[11px]">
              <span className="tabular-nums text-foreground">{selectedCount}</span>/<span className="tabular-nums">{seriesKeys.length}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" className="text-[11px] text-subtle hover:text-foreground hover:underline underline-offset-2" onClick={() => onChange({ selectedSeriesKeys: null })}>все</button>
              <button type="button" className="text-[11px] text-subtle hover:text-foreground hover:underline underline-offset-2" onClick={() => onChange({ selectedSeriesKeys: [] })}>0</button>
            </div>
          </div>
          <div className="grid max-h-32 grid-cols-2 gap-0.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {seriesKeys.map((key) => {
              const active = isChecked(key);
              const tint = meta?.colors[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSeries(key, !active)}
                  className={cn(
                    'aura-operator-control flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-left aura-tx-colors',
                    active
                      ? 'bg-[color-mix(in_srgb,var(--series-tint,var(--primary))_12%,transparent)] text-[var(--series-tint,var(--foreground))] ring-1 ring-[color-mix(in_srgb,var(--series-tint,var(--primary))_34%,transparent)]'
                      : 'text-subtle hover:bg-hover hover:text-foreground'
                  )}
                  style={{ '--series-tint': tint } as CSSProperties}
                >
                  <StatsMetaIconBadge icon={meta?.icons[key]} tint={active ? tint : undefined} size={12} className={cn('shrink-0 border-transparent transition-opacity', !active && 'opacity-35')} />
                  <span className={cn('aura-operator-kpi min-w-0 flex-1 truncate text-[11px] leading-tight', active && 'font-medium')}>{key}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
