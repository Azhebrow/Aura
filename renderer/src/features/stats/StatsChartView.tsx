import { useEffect, useMemo, useRef, useState } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import type { StatsAggregation, StatsGroupBy, StatsMeta, StatsMode, StatsTimeSummary } from '@/shared/stats/types';
import type { StatsFormattedTable } from '@/shared/stats/stats-table-format';
import { loadEChartsCore } from './echarts-runtime';
import { buildPanelOption, readThemeColors } from './stats-chart-options';
import { buildStatsChartScreenSpec } from './stats-chart-semantics';
import { StatsMetaIconBadge } from './StatsMetaIconBadge';

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

type ChartCanvasProps = {
  option: EChartsOption;
  minHeight?: string;
  skeletonVariant?: 'series' | 'donut';
  correlationIconRows?: Array<{
    key: string;
    icon: string | null;
    color: string;
  }>;
};

function ChartSkeleton({ variant }: { variant: 'series' | 'donut' }) {
  if (variant === 'donut') {
    return (
      <div className="absolute inset-0 p-5 sm:p-6">
        <div className="flex h-full flex-col gap-4">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="relative size-44 max-w-[65%] max-h-[65%]">
              <div className="aura-skeleton absolute inset-0 rounded-full opacity-80" />
              <div className="bg-card absolute inset-[24%] rounded-full border border-border/40" />
              <div className="absolute inset-[38%] flex flex-col items-center justify-center gap-2">
                <div className="aura-skeleton h-4 w-16 rounded-full" />
                <div className="aura-skeleton h-3 w-20 rounded-full opacity-75" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-2.5 py-2">
                <div className="aura-skeleton size-3 rounded-full" />
                <div className="aura-skeleton h-3 flex-1 rounded-full" style={{ opacity: 1 - index * 0.08 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 p-4 sm:p-5">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-end justify-between gap-2 px-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="aura-skeleton min-w-0 flex-1 rounded-t-xl rounded-b-md"
              style={{ height: `${36 + ((index * 11) % 42)}%`, opacity: 0.96 - index * 0.06 }}
            />
          ))}
        </div>
        <div className="space-y-2 px-1">
          <div className="aura-skeleton h-3 w-full rounded-full opacity-65" />
          <div className="aura-skeleton h-3 w-[82%] rounded-full opacity-50" />
        </div>
      </div>
    </div>
  );
}

function ChartCanvas({ option, minHeight = '0', skeletonVariant = 'series', correlationIconRows }: ChartCanvasProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);
  const latestOptionRef = useRef<EChartsOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [correlationIconPositions, setCorrelationIconPositions] = useState<Array<{
    key: string;
    icon: string | null;
    color: string;
    top: number;
  }> | null>(null);

  useEffect(() => {
    latestOptionRef.current = option;
  }, [option]);

  useEffect(() => {
    if (!correlationIconRows?.length) {
      setCorrelationIconPositions(null);
    }
  }, [correlationIconRows]);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let initialized = false;
    let echartsCore: typeof import('echarts/core') | null = null;
    let syncFrame = 0;

    const syncCorrelationIconPositions = () => {
      const instance = chartInstanceRef.current;
      const rows = correlationIconRows;
      if (!instance || !rows?.length) {
        setCorrelationIconPositions(null);
        return;
      }

      const positions = rows
        .map((row) => {
          const pixel = instance.convertToPixel({ yAxisIndex: 0 }, row.key);
          return typeof pixel === 'number' && Number.isFinite(pixel)
            ? { ...row, top: pixel }
            : null;
        })
        .filter((item): item is { key: string; icon: string | null; color: string; top: number } => item !== null);

      setCorrelationIconPositions(positions.length ? positions : null);
    };

    const scheduleCorrelationIconSync = () => {
      window.cancelAnimationFrame(syncFrame);
      syncFrame = window.requestAnimationFrame(syncCorrelationIconPositions);
    };

    setIsLoading(true);
    setShowSkeleton(true);
    void loadEChartsCore()
      .then((echarts) => {
        echartsCore = echarts;
        const tryInit = () => {
          if (cancelled || initialized || !chartRef.current || !echartsCore) return;
          const el = chartRef.current;
          if (el.clientWidth <= 0 || el.clientHeight <= 0) return;
          const instance = echartsCore.init(el, undefined, { renderer: 'canvas', useDirtyRect: true });
          chartInstanceRef.current = instance;
          initialized = true;
          if (latestOptionRef.current) {
            instance.setOption(latestOptionRef.current, { notMerge: true, lazyUpdate: true, silent: true });
          }
          instance.resize();
          scheduleCorrelationIconSync();
          setIsLoading(false);
          window.setTimeout(() => {
            if (!cancelled) setShowSkeleton(false);
          }, 260);
        };

        if (cancelled || !chartRef.current) return;
        observer = new ResizeObserver(() => {
          tryInit();
          chartInstanceRef.current?.resize();
          scheduleCorrelationIconSync();
        });
        observer.observe(chartRef.current);
        chartInstanceRef.current?.on('finished', scheduleCorrelationIconSync);
        tryInit();
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
          window.setTimeout(() => {
            if (!cancelled) setShowSkeleton(false);
          }, 260);
        }
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(syncFrame);
      observer?.disconnect();
      chartInstanceRef.current?.off('finished', scheduleCorrelationIconSync);
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, [correlationIconRows]);

  useEffect(() => {
    const instance = chartInstanceRef.current;
    if (!instance) return;
    instance.setOption(option, { notMerge: true, lazyUpdate: true, silent: true });
    instance.resize();
    if (correlationIconRows?.length) {
      window.requestAnimationFrame(() => {
        const positions = correlationIconRows
          .map((row) => {
            const pixel = instance.convertToPixel({ yAxisIndex: 0 }, row.key);
            return typeof pixel === 'number' && Number.isFinite(pixel)
              ? { ...row, top: pixel }
              : null;
          })
          .filter((item): item is { key: string; icon: string | null; color: string; top: number } => item !== null);
        setCorrelationIconPositions(positions.length ? positions : null);
      });
    }
  }, [option, correlationIconRows]);

  return (
    <div className="aura-surface-panel relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/80" style={{ minHeight }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--aura-surface-control)] via-transparent to-transparent opacity-70" />
      <div
        ref={chartRef}
        className="absolute inset-0 h-full w-full transition-all duration-500 ease-out"
        style={{
          opacity: isLoading ? 0 : 1,
          transform: isLoading ? 'translateY(4px)' : 'translateY(0)',
        }}
      />
      {correlationIconPositions?.length ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          {correlationIconPositions.map((row) => (
            <div
              key={row.key}
              className="absolute left-3 -translate-y-1/2"
              style={{ top: row.top }}
            >
              <StatsMetaIconBadge icon={row.icon} tint={row.color} size={16} className="bg-[var(--aura-surface-raised)] shadow-sm" />
            </div>
          ))}
        </div>
      ) : null}
      {showSkeleton ? (
        <div
          className="absolute inset-0 bg-[var(--aura-surface-panel)]/45 backdrop-blur-[1px] transition-opacity duration-500 ease-out"
          style={{ opacity: isLoading ? 1 : 0 }}
          aria-hidden
        >
          <ChartSkeleton variant={skeletonVariant} />
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {isLoading ? 'Загрузка диаграммы' : 'Диаграмма загружена'}
      </span>
    </div>
  );
}

function skeletonPanelsForMode(mode: StatsMode, groupBy: StatsGroupBy): Array<'series' | 'donut'> {
  if (mode === 'correlation') return ['series', 'series'];
  if (mode === 'finance' || mode === 'rank') return ['series', 'donut'];
  if (mode === 'time' || mode === 'leisure') return ['series', groupBy === 'categories' ? 'donut' : 'donut'];
  return ['series'];
}

function SummaryEmptyPanel({ message }: { message: string }) {
  return (
    <div className="aura-surface-control text-[var(--aura-text-subtle)] flex h-full min-h-0 w-full items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm">
      {message}
    </div>
  );
}

export function StatsChartView({
  mode,
  groupBy,
  aggregation,
  table,
  meta,
  selectedSeriesKeys,
  currencyCode,
  timeSummary,
  loading = false,
}: Props) {
  const theme = readThemeColors();
  const screen = useMemo(
    () =>
      buildStatsChartScreenSpec({
        mode,
        groupBy,
        aggregation,
        table,
        meta,
        selectedSeriesKeys,
        currencyCode,
        timeSummary,
      }),
    [aggregation, currencyCode, groupBy, meta, mode, selectedSeriesKeys, table, timeSummary]
  );

  const panelOptions = useMemo(
    () => screen.panels.map((panel) => buildPanelOption(screen, panel, theme)),
    [screen, theme]
  );

  if (!table.rows.length) {
    return (
      <div className="aura-surface-control text-[var(--aura-text-subtle)] flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm">
        Нет данных за выбранный период. Смените режим или расширьте даты.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {skeletonPanelsForMode(mode, groupBy).map((variant, index) => (
          <div key={`${variant}-${index}`} className="flex min-h-0 flex-1">
            <div className="aura-surface-panel relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/80">
              <ChartSkeleton variant={variant} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (screen.visibleKeys.length === 0) {
    return (
      <div className="aura-surface-control flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="max-w-sm space-y-3">
          <p className="aura-body-muted text-sm">Сейчас скрыты все серии. Включите хотя бы одну серию слева, чтобы показать диаграмму.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {screen.panels.map((panel, index) => {
        if (panel.kind === 'donut' && panel.slices.length === 0) {
          return (
            <div key={`${panel.kind}-${index}`} className="flex min-h-0 flex-1">
              <SummaryEmptyPanel message={panel.emptyMessage} />
            </div>
          );
        }

        return (
          <div key={`${panel.kind}-${index}`} className="flex min-h-0 flex-1">
            <ChartCanvas
              option={panelOptions[index]}
              minHeight="0"
              skeletonVariant={panel.kind === 'donut' ? 'donut' : 'series'}
              correlationIconRows={
                panel.kind === 'correlation-overview' ? (
                  panel.rows.map((row) => ({
                    key: row.key,
                    icon: row.icon,
                    color: row.color,
                  }))
                ) : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
