import { useEffect, useMemo, useRef } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import type { StatsAggregation, StatsGroupBy, StatsMeta, StatsMode, StatsTimeSummary } from '@/features/stats/types';
import type { StatsFormattedTable } from '@/features/stats/stats-table-format';
import { loadEChartsCore } from './echarts-runtime';
import { getChartNumericValue, getNutritionNumericValue, resolveChartColor } from './stats-chart-utils';
import { useThemeRuntimeVersion } from '@/features/theme/use-theme-runtime-version';

type Props = {
  mode: StatsMode;
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  table: StatsFormattedTable;
  meta: StatsMeta;
  selectedSeriesKeys: string[] | null;
  currencyCode?: string;
  timeSummary: StatsTimeSummary | null;
  loading?: boolean;
};

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function numericValue(mode: StatsMode, key: string, raw: unknown): number {
  const value = mode === 'nutrition'
    ? getNutritionNumericValue(key, raw as never)
    : getChartNumericValue(mode, key, raw as never);
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatAxis(mode: StatsMode, value: number): string {
  if (mode === 'tasks' || mode === 'rituals' || mode === 'correlation') return `${Math.round(value)}%`;
  if (mode === 'time') return `${Math.round(value)}ч`;
  return Math.round(value).toLocaleString('ru-RU');
}

function formatTooltipValue(mode: StatsMode, value: unknown): string {
  const n = Number(Array.isArray(value) ? value[1] : value);
  if (!Number.isFinite(n)) return '0';
  if (mode === 'tasks' || mode === 'rituals' || mode === 'correlation') return `${Math.round(n)}%`;
  if (mode === 'time' || mode === 'leisure') return `${Math.round(n)} ч`;
  if (mode === 'nutrition') return Math.round(n).toLocaleString('ru-RU');
  return Math.round(n).toLocaleString('ru-RU');
}

type TooltipParam = {
  marker?: string;
  seriesName?: string;
  value?: unknown;
  data?: unknown;
  axisValueLabel?: string;
  name?: string;
};

function tooltipNumericValue(value: unknown): number {
  if (Array.isArray(value)) return Number(value[value.length - 1]);
  if (value && typeof value === 'object' && 'value' in value) return tooltipNumericValue((value as { value?: unknown }).value);
  return Number(value);
}

function formatAxisTooltip(mode: StatsMode, params: TooltipParam | TooltipParam[]): string {
  const list = Array.isArray(params) ? params : [params];
  const visible = list.filter((item) => Math.abs(tooltipNumericValue(item.value ?? item.data)) > 0.000001);
  const title = list[0]?.axisValueLabel ?? list[0]?.name ?? '';
  if (!visible.length) {
    return `<div style="font-weight:600;margin-bottom:6px">${title}</div><span style="opacity:.7">Нет значений</span>`;
  }
  return [
    `<div style="font-weight:600;margin-bottom:6px">${title}</div>`,
    ...visible.map((item) => {
      const raw = item.value ?? item.data;
      return `<div style="display:flex;align-items:center;gap:8px;min-width:140px;line-height:1.55">
        <span>${item.marker ?? ''}${item.seriesName ?? ''}</span>
        <b style="margin-left:auto">${formatTooltipValue(mode, raw)}</b>
      </div>`;
    }),
  ].join('');
}

function chartVariant(mode: StatsMode): 'bar' | 'line' {
  return mode === 'rank' || mode === 'mood' || mode === 'nutrition' ? 'line' : 'bar';
}

function stackedMode(mode: StatsMode): boolean {
  return mode === 'tasks' || mode === 'finance' || mode === 'rituals' || mode === 'time';
}

function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const fraction = rawStep / power;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * power;
}

function niceAxisBounds(values: number[], mode: StatsMode): { min: number; max: number } {
  const finite = values.filter((value) => Number.isFinite(value));
  const rawMin = Math.min(0, ...finite);
  const rawMax = Math.max(0, ...finite);

  if (mode === 'tasks' || mode === 'rituals' || mode === 'correlation') {
    return { min: Math.min(0, rawMin), max: Math.max(100, rawMax) };
  }

  if (rawMin === 0 && rawMax === 0) return { min: 0, max: 1 };

  const span = Math.max(Math.abs(rawMax - rawMin), Math.abs(rawMax), Math.abs(rawMin), 1);
  const step = niceStep(span / 5);
  return {
    min: Math.floor(rawMin / step) * step,
    max: Math.ceil(rawMax / step) * step,
  };
}

function useChartOption({ mode, table, meta, selectedSeriesKeys }: Props, themeVersion: number): EChartsOption {
  return useMemo(() => {
    const keys = selectedSeriesKeys ?? table.columns;
    const foreground = readCssVar('--foreground', '#f8fafc');
    const muted = readCssVar('--muted-foreground', '#94a3b8');
    const border = readCssVar('--border', '#334155');
    const popover = readCssVar('--popover', '#111827');
    const variant = chartVariant(mode);
    const stacked = stackedMode(mode);
    const barValuesByRow = table.rows.map((row) =>
      Object.fromEntries(keys.map((key) => [key, numericValue(mode, key, row.originalValues[key])])) as Record<string, number>
    );
    const axisValues = stacked
      ? barValuesByRow.flatMap((values) => {
          let positive = 0;
          let negative = 0;
          for (const key of keys) {
            const value = values[key] ?? 0;
            if (value > 0) positive += value;
            if (value < 0) negative += value;
          }
          return [positive, negative];
        })
      : barValuesByRow.flatMap((values) => keys.map((key) => values[key] ?? 0));
    const axisBounds = niceAxisBounds(axisValues, mode);
    const stackedOuterKeysByRow = barValuesByRow.map((values) => {
      let positive: string | null = null;
      let negative: string | null = null;
      for (const key of keys) {
        const value = values[key] ?? 0;
        if (value > 0) positive = key;
        if (value < 0) negative = key;
      }
      return { positive, negative };
    });

    const barBorderRadius = (rowIndex: number, key: string, value: number): [number, number, number, number] => {
      if (!stacked) return value < 0 ? [0, 0, 5, 5] : [5, 5, 0, 0];
      const outer = stackedOuterKeysByRow[rowIndex];
      if (value > 0 && outer?.positive === key) return [5, 5, 0, 0];
      if (value < 0 && outer?.negative === key) return [0, 0, 5, 5];
      return [0, 0, 0, 0];
    };

    return {
      animation: true,
      animationDuration: 900,
      animationDurationUpdate: 650,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'quarticOut',
      backgroundColor: 'transparent',
      color: keys.map((key) => resolveChartColor(meta.colors[key], readCssVar('--primary', '#60a5fa'))),
      grid: { left: 18, right: 16, top: 14, bottom: 28, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: popover,
        borderColor: border,
        textStyle: { color: foreground, fontSize: 12 },
        formatter: (params: unknown) => formatAxisTooltip(mode, params as TooltipParam | TooltipParam[]),
      },
      xAxis: {
        type: 'category',
        data: table.rows.map((row) => row.label),
        axisLabel: { color: muted, fontSize: 10 },
        axisLine: { lineStyle: { color: border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: axisBounds.min,
        max: axisBounds.max,
        axisLabel: { color: muted, formatter: (value: number) => formatAxis(mode, value) },
        splitLine: { lineStyle: { color: border, opacity: 0.22 } },
      },
      series: keys.map((key) => ({
        id: key,
        name: key,
        type: variant,
        stack: stacked ? 'total' : undefined,
        smooth: variant === 'line',
        symbolSize: 5,
        barMaxWidth: 28,
        emphasis: { focus: 'series' },
        universalTransition: true,
        animationDelay: (index: number) => Math.min(index * 24, 420),
        animationDelayUpdate: (index: number) => Math.min(index * 10, 180),
        data: table.rows.map((row, rowIndex) => {
          const value = barValuesByRow[rowIndex]?.[key] ?? numericValue(mode, key, row.originalValues[key]);
          if (variant !== 'bar') return value;
          return {
            value,
            itemStyle: {
              borderRadius: barBorderRadius(rowIndex, key, value),
            },
          };
        }),
      })),
    };
  }, [meta.colors, mode, selectedSeriesKeys, table.columns, table.rows, themeVersion]);
}

function zeroSeriesData(data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  return data.map((item) => {
    if (Array.isArray(item)) return item.map((value, index) => (index === item.length - 1 ? 0 : value));
    if (item && typeof item === 'object') return { ...(item as Record<string, unknown>), value: 0 };
    return 0;
  });
}

function makeIntroOption(option: EChartsOption): EChartsOption {
  const series = Array.isArray(option.series)
    ? option.series.map((item) => ({ ...item, data: zeroSeriesData(item.data) }))
    : option.series;
  return {
    ...option,
    animation: false,
    series,
  };
}

function ChartCanvas({ option }: { option: EChartsOption }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ECharts | null>(null);
  const didIntroRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    void loadEChartsCore().then((echarts) => {
      if (cancelled || !ref.current) return;
      const instance = echarts.init(ref.current, undefined, { renderer: 'canvas', useDirtyRect: true });
      instanceRef.current = instance;
      observer = new ResizeObserver(() => instance.resize());
      observer.observe(ref.current);
      instance.resize();
      requestAnimationFrame(() => {
        if (cancelled) return;
        instance.setOption(makeIntroOption(option), { notMerge: true, lazyUpdate: false });
        requestAnimationFrame(() => {
          if (cancelled) return;
          didIntroRef.current = true;
          instance.setOption(option, { notMerge: false, lazyUpdate: false });
        });
      });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!didIntroRef.current) return;
    instanceRef.current?.setOption(option, { notMerge: false, lazyUpdate: false });
    instanceRef.current?.resize();
  }, [option]);

  return <div ref={ref} className="h-full min-h-[18rem] w-full" />;
}

export function StatsChartView(props: Props) {
  const { table, loading, selectedSeriesKeys } = props;
  const themeVersion = useThemeRuntimeVersion();
  const option = useChartOption(props, themeVersion);

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-[18rem] w-full" />
      </div>
    );
  }

  if (!table.rows.length) {
    return (
      <div className="aura-surface-control flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-subtle">
        Нет данных за выбранный период.
      </div>
    );
  }

  if ((selectedSeriesKeys ?? table.columns).length === 0) {
    return (
      <div className="aura-surface-control flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-subtle">
        Включите хотя бы одну серию, чтобы показать диаграмму.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ChartCanvas option={option} />
    </div>
  );
}
