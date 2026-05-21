import {
  Apple,
  Award,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  GitCompare,
  Layers,
  List,
  Moon,
  Smile,
  SquareCheck,
  Sun,
  SunDim,
  Wallet,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StatsControlsState, StatsMeta, StatsMode, StatsAggregation } from '@/shared/stats/types';
import { StatsMetaIconBadge } from './StatsMetaIconBadge';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const MODES: { value: StatsMode; label: string; Icon: LucideIcon }[] = [
  { value: 'tasks',       label: 'Задачи',     Icon: SquareCheck },
  { value: 'finance',     label: 'Финансы',    Icon: Wallet      },
  { value: 'time',        label: 'Время',       Icon: Clock       },
  { value: 'rituals',     label: 'Ритуалы',    Icon: Sun         },
  { value: 'rank',        label: 'Очки',        Icon: Award       },
  { value: 'mood',        label: 'Настроение',  Icon: Smile       },
  { value: 'nutrition',   label: 'Питание',     Icon: Apple       },
  { value: 'correlation', label: 'Корреляция',  Icon: GitCompare  },
];

const AGGREGATIONS: { value: StatsAggregation; label: string; Icon: LucideIcon; hint: string }[] = [
  { value: 'day',   label: 'День',   Icon: SunDim,        hint: 'Каждая точка — один день'       },
  { value: 'week',  label: 'Неделя', Icon: CalendarDays,  hint: 'По неделям (пн–вс)'             },
  { value: 'month', label: 'Месяц',  Icon: Calendar,      hint: 'По календарным месяцам'         },
  { value: 'year',  label: 'Год',    Icon: CalendarRange, hint: 'По календарным годам'           },
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

const LBL = 'text-[var(--aura-text-muted)] text-caption font-medium uppercase tracking-wider';
const GRID_SHELL = 'grid grid-cols-2 gap-1 rounded-md border border-[var(--aura-border-soft)] bg-transparent p-1';
const INPUT_CN = 'h-8 w-full rounded-md border-[var(--aura-border-soft)] bg-transparent px-2 !text-xs shadow-none';
const SEP = 'border-t border-[var(--aura-border-soft)]';

function Chip({
  active, onClick, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; icon?: LucideIcon; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-sm px-2 text-xs font-normal leading-none aura-tx-colors',
        active
          ? 'bg-primary/15 text-primary ring-1 ring-primary/25 font-medium'
          : 'text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground'
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0 opacity-80" strokeWidth={1.75} />}
      <span>{label}</span>
    </button>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative flex h-8 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-[var(--aura-border-soft)] bg-transparent px-2 text-xs shadow-none aura-tx-colors hover:bg-[var(--aura-action-hover-bg)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/60">
      <span className="pointer-events-none flex min-w-0 items-center justify-center gap-1.5 text-foreground">
        <Calendar className="size-3.5 shrink-0 text-[var(--aura-text-muted)]" aria-hidden />
        <span className="tabular-nums">{value}</span>
      </span>
      <Input
        type="date"
        className={cn(
          INPUT_CN,
          'absolute inset-0 h-full cursor-pointer opacity-0',
          '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer'
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={value}
      />
    </label>
  );
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

  const activeAgg = AGGREGATIONS.find((a) => a.value === state.aggregation);

  return (
    <div className="flex flex-col">

      {/* Mode */}
      <div className="space-y-1 pb-2.5">
        <p className={LBL}>Режим</p>
        <Select value={state.mode} onValueChange={(v) => onChange({ mode: v as StatsMode, selectedSeriesKeys: null })}>
          <SelectTrigger className="h-8 w-full rounded-md border-[var(--aura-border-soft)] bg-transparent text-xs shadow-none">
            <SelectValue />
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

      {/* Grouping */}
      <div className={cn(SEP, 'space-y-1 py-2.5')}>
        <p className={LBL}>Группировка</p>
        <div className={GRID_SHELL}>
          {([
            { value: 'categories', label: 'Категории', Icon: Layers },
            { value: 'elements',   label: 'Элементы',  Icon: List   },
          ] as const).map(({ value, label, Icon }) => (
            <Chip
              key={value}
              active={state.groupBy === value}
              onClick={() => onChange({ groupBy: value, selectedSeriesKeys: null })}
              icon={Icon}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* Aggregation */}
      <div className={cn(SEP, 'space-y-1 py-2.5')}>
        <p className={LBL}>Агрегация</p>
        <div className={GRID_SHELL}>
          {AGGREGATIONS.map(({ value, label, Icon }) => (
            <Chip
              key={value}
              active={state.aggregation === value}
              onClick={() => onChange({ aggregation: value })}
              icon={Icon}
              label={label}
            />
          ))}
        </div>
        {activeAgg && (
          <p className="text-[var(--aura-text-muted)] px-0.5 text-xs leading-snug">{activeAgg.hint}</p>
        )}
      </div>

      {/* Period */}
      <div className={cn(SEP, 'space-y-1 py-2.5')}>
        <p className={LBL}>Период</p>
        <div className={GRID_SHELL}>
          {PERIODS.map(({ value, label, Icon }) => (
            <Chip
              key={value}
              active={state.period === value}
              onClick={() => setPeriodPreset(value)}
              icon={Icon}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className={cn(SEP, 'space-y-1 py-2.5')}>
        <p className={LBL}>Диапазон</p>
        <div className="flex flex-col items-stretch gap-0.5">
          <DateField value={state.startDate} onChange={onStartDate} />
          <div className="flex justify-center py-0.5">
            <span className="text-[var(--aura-text-muted)] text-nano leading-none">↓</span>
          </div>
          <DateField value={state.endDate} onChange={onEndDate} />
        </div>
      </div>

      {/* Series */}
      {seriesKeys.length > 0 && (
        <div className={cn(SEP, 'space-y-1 py-2.5')}>
          <div className="flex items-center justify-between">
            <p className={LBL}>
              Серии
              <span className="ml-1 font-normal opacity-50 tabular-nums">{selectedCount}/{seriesKeys.length}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" className="text-xs text-[var(--aura-text-subtle)] hover:text-foreground hover:underline underline-offset-2" onClick={() => onChange({ selectedSeriesKeys: null })}>все</button>
              <button type="button" className="text-xs text-[var(--aura-text-subtle)] hover:text-foreground hover:underline underline-offset-2" onClick={() => onChange({ selectedSeriesKeys: [] })}>снять</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {seriesKeys.map((key) => {
              const active = isChecked(key);
              const tint = meta?.colors[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSeries(key, !active)}
                  className={cn(
                    'flex h-9 min-w-0 items-center gap-1.5 rounded-md px-2 text-left aura-tx-colors',
                    active
                      ? 'bg-[color-mix(in_srgb,var(--series-tint,var(--primary))_12%,transparent)] text-[var(--series-tint,var(--foreground))] ring-1 ring-[color-mix(in_srgb,var(--series-tint,var(--primary))_34%,transparent)]'
                      : 'text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground'
                  )}
                  style={{ '--series-tint': tint } as CSSProperties}
                >
                  <StatsMetaIconBadge
                    icon={meta?.icons[key]}
                    tint={active ? tint : undefined}
                    size={13}
                    className={cn('shrink-0 border-transparent transition-opacity', !active && 'opacity-35')}
                  />
                  <span className={cn('min-w-0 flex-1 truncate text-xs leading-tight', active && 'font-medium')}>{key}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
