import { useEffect, useMemo, useRef } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import type { StatsDayRow, StatsGroupBy, StatsMeta, StatsMode } from '@/features/stats/types';
import { LoadingShell } from '@/shared/ui/data-states';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { cn } from '@/lib/utils';
import { loadEChartsCore } from './echarts-runtime';
import { escapeHtml, getNutritionNumericValue, resolveChartColor, visibleSeriesKeys } from './stats-chart-utils';
import { formatTimeFromHours } from './stats-table-format';
import { currencySymbol } from '@/shared/lib/money';
import { useThemeRuntimeVersion } from '@/features/theme/use-theme-runtime-version';

type Props = {
  mode: StatsMode;
  groupBy: StatsGroupBy;
  rows: StatsDayRow[];
  columns: string[];
  meta: StatsMeta;
  selectedSeriesKeys: string[] | null;
  currencyCode?: string;
  loading?: boolean;
};

type PieSlice = {
  key: string;
  value: number;
  color: string;
  icon?: string;
};

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function rawNumber(mode: StatsMode, key: string, raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (mode === 'nutrition') return Number(getNutritionNumericValue(key, raw as never) ?? 0) || 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  return Number(raw) || 0;
}

function pieValue(mode: StatsMode, groupBy: StatsGroupBy, key: string, raw: unknown): number {
  const value = rawNumber(mode, key, raw);
  if (mode === 'finance') return Math.abs(value);
  if (mode === 'nutrition' && groupBy === 'categories' && key === 'Калории') return 0;
  return Math.max(0, value);
}

function formatSliceValue(mode: StatsMode, key: string, value: number, currencyCode?: string): string {
  if (mode === 'finance') return `${Math.round(value).toLocaleString('ru-RU')} ${currencySymbol(currencyCode ?? 'RUB')}`;
  if (mode === 'time' || mode === 'leisure') return formatTimeFromHours(value);
  if (mode === 'nutrition') {
    if (key === 'Белки' || key === 'Жиры' || key === 'Углеводы') return `${Math.round(value).toLocaleString('ru-RU')} г`;
    return `${Math.round(value).toLocaleString('ru-RU')} ккал`;
  }
  return Math.round(value).toLocaleString('ru-RU');
}

function buildSlices(props: Props): PieSlice[] {
  const keys = visibleSeriesKeys(props.columns, props.selectedSeriesKeys);
  const fallback = readCssVar('--primary', '#60a5fa');

  return keys
    .map((key) => {
      const value = props.rows.reduce((sum, row) => sum + pieValue(props.mode, props.groupBy, key, row.values[key]), 0);
      return {
        key,
        value,
        color: resolveChartColor(props.meta.colors[key], fallback),
        icon: props.meta.icons[key],
      };
    })
    .filter((slice) => slice.value > 0.000001)
    .sort((a, b) => b.value - a.value);
}

function makeOption(slices: PieSlice[], props: Props): EChartsOption {
  const foreground = readCssVar('--foreground', '#f8fafc');
  const muted = readCssVar('--muted-foreground', '#94a3b8');
  const border = readCssVar('--border', '#334155');
  const popover = readCssVar('--popover', '#111827');
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return {
    animation: true,
    animationDuration: 750,
    animationDurationUpdate: 520,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'quarticOut',
    backgroundColor: 'transparent',
    color: slices.map((slice) => slice.color),
    tooltip: {
      trigger: 'item',
      backgroundColor: popover,
      borderColor: border,
      textStyle: { color: foreground, fontSize: 12 },
      formatter: (param: unknown) => {
        const p = param as { name?: string; value?: number; percent?: number; marker?: string };
        const name = String(p.name ?? '');
        const value = Number(p.value ?? 0);
        const percent = Number.isFinite(Number(p.percent)) ? Number(p.percent) : total > 0 ? (value / total) * 100 : 0;
        return `<div style="font-weight:600;margin-bottom:6px">${p.marker ?? ''}${escapeHtml(name)}</div>
          <div style="display:flex;gap:14px;align-items:center;min-width:150px">
            <span style="opacity:.72">За период</span>
            <b style="margin-left:auto">${escapeHtml(formatSliceValue(props.mode, name, value, props.currencyCode))}</b>
          </div>
          <div style="display:flex;gap:14px;align-items:center;margin-top:2px">
            <span style="opacity:.72">Доля</span>
            <b style="margin-left:auto">${Math.round(percent)}%</b>
          </div>`;
      },
    },
    series: [
      {
        id: 'period-share',
        name: 'Доли периода',
        type: 'pie',
        radius: ['48%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 3,
        padAngle: 1.5,
        itemStyle: {
          borderColor: readCssVar('--aura-surface-panel', '#111827'),
          borderWidth: 2,
        },
        label: {
          color: muted,
          fontSize: 11,
          formatter: '{b}\n{d}%',
        },
        labelLine: {
          length: 10,
          length2: 8,
          lineStyle: { color: border },
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          focus: 'self',
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(0,0,0,.28)',
          },
        },
        universalTransition: true,
        data: slices.map((slice) => ({
          name: slice.key,
          value: slice.value,
          itemStyle: { color: slice.color },
        })),
      },
    ],
  };
}

function PieCanvas({ option }: { option: EChartsOption }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ECharts | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    void loadEChartsCore().then((echarts) => {
      if (cancelled || !ref.current) return;
      const instance = echarts.init(ref.current, undefined, { renderer: 'canvas', useDirtyRect: true });
      instanceRef.current = instance;
      observer = new ResizeObserver(() => instance.resize());
      observer.observe(ref.current);
      instance.setOption(option, { notMerge: true, lazyUpdate: false });
      instance.resize();
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge: true, lazyUpdate: false });
    instanceRef.current?.resize();
  }, [option]);

  return <div ref={ref} className="h-full min-h-[18rem] w-full" />;
}

export function StatsPieView(props: Props) {
  const themeVersion = useThemeRuntimeVersion();
  const slices = useMemo(() => buildSlices(props), [props.columns, props.groupBy, props.meta.colors, props.meta.icons, props.mode, props.rows, props.selectedSeriesKeys, themeVersion]);
  const option = useMemo(() => makeOption(slices, props), [props, slices, themeVersion]);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (props.loading) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <LoadingShell rows={5} className="h-full w-full" />
      </div>
    );
  }

  if (!slices.length) {
    return (
      <div className="aura-surface-control flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-subtle">
        Нет положительных значений для круговой диаграммы за выбранный период.
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-h-0">
        <PieCanvas option={option} />
      </div>
      <div className="min-h-0 overflow-y-auto border-t border-soft/50 p-3 lg:border-l lg:border-t-0">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-dim">Состав периода</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatSliceValue(props.mode, 'total', total, props.currencyCode)}
          </p>
        </div>
        <div className="space-y-1">
          {slices.map((slice) => {
            const pct = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <div key={slice.key} className="aura-operator-row grid min-h-9 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover/70">
                <span className="aura-icon-plate flex size-7 items-center justify-center rounded-lg border bg-control/55" style={{ '--aura-list-icon-tint': slice.color } as React.CSSProperties} aria-hidden>
                  <AuraThemedIcon name={slice.icon ?? null} tint="currentColor" size={14} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{slice.key}</p>
                  <div className="aura-operator-list-meter mt-1 h-1 overflow-hidden rounded-full bg-control">
                    <div className="aura-data-fill h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: slice.color }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('aura-operator-kpi text-xs font-semibold tabular-nums')} style={{ color: slice.color }}>{Math.round(pct)}%</p>
                  <p className="mt-0.5 text-[10px] font-medium tabular-nums text-faint">{formatSliceValue(props.mode, slice.key, slice.value, props.currencyCode)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
