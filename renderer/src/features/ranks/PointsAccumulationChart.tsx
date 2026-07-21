import { useEffect, useMemo, useRef, useState } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { addDaysIso } from '@/shared/lib/dates';
import { formatRankPoints, rankAuraHsl, type RankTier } from '@/shared/config/ranks-model';
import { loadEChartsCore } from '@/features/stats/echarts-runtime';
import { isStrictVisualMode, strictModeFaintFill } from '@/features/theme/strict-mode';
import type { AuraRow } from '@/types/aura';
import { formatHistoryDateShort, isIsoDate } from './rank-utils';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { useThemeRuntimeVersion } from '@/features/theme/use-theme-runtime-version';

type RangeId = 'week' | 'month' | 'quarter';

type Props = {
  history: AuraRow[];
  rank: RankTier;
  endDate: string;
};

const RANGE_OPTIONS: UniversalRadioOption<RangeId>[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
];

const RANGE_DAYS: Record<RangeId, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

function readStoredRange(): RangeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RANKS_ACCUMULATION_RANGE);
    return raw === 'week' || raw === 'month' || raw === 'quarter' ? raw : 'month';
  } catch {
    return 'month';
  }
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function rankHsla(rank: RankTier, alpha = 1): string {
  const match = rankAuraHsl(rank.id).match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/);
  if (!match) return `hsla(212, 78%, 52%, ${alpha})`;
  return `hsla(${match[1]}, ${match[2]}%, ${match[3]}%, ${alpha})`;
}

function buildChartRows(history: AuraRow[], endDate: string, range: RangeId) {
  const safeEnd = isIsoDate(endDate) ? endDate : String(history[0]?.date ?? '');
  if (!isIsoDate(safeEnd)) return [];
  const startDate = addDaysIso(safeEnd, -(RANGE_DAYS[range] - 1));
  const byDate = new Map(history.map((row) => [String(row.date), row]));
  const rows: AuraRow[] = [];
  for (let cursor = startDate, guard = 0; cursor <= safeEnd && guard < 120; cursor = addDaysIso(cursor, 1), guard += 1) {
    rows.push(byDate.get(cursor) ?? { id: `chart_empty_${cursor}`, date: cursor, cumulative_points: 0, daily_points: 0 });
  }
  return rows;
}

function makeOption(rows: AuraRow[], rank: RankTier): EChartsOption {
  const foreground = readCssVar('--foreground', '#f8fafc');
  const muted = readCssVar('--muted-foreground', '#94a3b8');
  const border = readCssVar('--border', '#334155');
  const popover = readCssVar('--popover', '#111827');
  const panel = readCssVar('--background', '#111827');
  const strict = isStrictVisualMode();
  const strictFill = strictModeFaintFill();
  const rankColor = strict ? foreground : rankHsla(rank, 1);
  const rankSoft = strict ? strictFill.soft : rankHsla(rank, 0.22);
  const rankFaint = strict ? strictFill.faint : rankHsla(rank, 0.035);
  const axisLabels = rows.map((row) => formatHistoryDateShort(String(row.date)));
  const values = rows.map((row) => Math.round(Number(row.cumulative_points ?? 0)));

  return {
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 550,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'quarticOut',
    backgroundColor: 'transparent',
    grid: { left: 8, right: 10, top: 14, bottom: 18, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: popover,
      borderColor: border,
      textStyle: { color: foreground, fontSize: 12 },
      formatter: (params: unknown) => {
        const first = Array.isArray(params) ? params[0] as { axisValue?: string; value?: number } : null;
        if (!first) return '';
        return `${first.axisValue}<br/>Накоплено: <b>${formatRankPoints(Number(first.value ?? 0))}</b>`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: axisLabels,
      axisLabel: { color: muted, fontSize: 10, margin: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: muted,
        formatter: (value: number) => formatRankPoints(value),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: border, opacity: 0.16 } },
    },
    series: [
      {
        id: 'rank-points-accumulation',
        name: 'Накоплено',
        type: 'line',
        smooth: true,
        symbol: 'none',
        showSymbol: false,
        lineStyle: {
          width: 2.5,
          color: rankColor,
          shadowColor: rankSoft,
          shadowBlur: 10,
        },
        itemStyle: {
          color: rankColor,
          borderColor: panel,
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: rankSoft },
              { offset: 1, color: rankFaint },
            ],
          },
        },
        emphasis: { focus: 'series' },
        data: values,
      },
    ],
  };
}

function ChartCanvas({ option }: { option: EChartsOption }) {
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
      requestAnimationFrame(() => instance.resize());
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge: false, lazyUpdate: false });
    instanceRef.current?.resize();
  }, [option]);

  return <div ref={ref} className="h-full min-h-[12rem] w-full" />;
}

export function PointsAccumulationChart({ history, rank, endDate }: Props) {
  const themeVersion = useThemeRuntimeVersion();
  const [range, setRange] = useState<RangeId>(readStoredRange);
  const setStoredRange = (next: RangeId) => {
    setRange(next);
    try { localStorage.setItem(STORAGE_KEYS.RANKS_ACCUMULATION_RANGE, next); } catch { /* ignore */ }
  };
  const rows = useMemo(() => buildChartRows(history, endDate, range), [endDate, history, range]);
  const option = useMemo(() => makeOption(rows, rank), [rank, rows, themeVersion]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-soft/30">
      <div className="aura-mega-panel-header aura-section-tab-header flex h-10 min-h-10 shrink-0 items-center justify-between gap-3 border-b border-soft bg-panel px-3 sm:h-11 sm:min-h-11 sm:px-4">
        <div className="aura-section-title min-w-0">
          <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-dim">Накопление очков</p>
        </div>
        <div className="aura-section-actions aura-section-tab-actions w-[16rem] max-w-[58vw]">
          <UniversalRadioGroup
            value={range}
            onValueChange={setStoredRange}
            options={RANGE_OPTIONS}
            ariaLabel="Диапазон графика"
            fullWidth
            variant="header"
          />
        </div>
      </div>
      <div className="min-h-0 shrink-0 px-3 py-3 sm:px-4">
        <div className="h-[13.5rem] overflow-hidden">
          {rows.length > 0 ? (
            <ChartCanvas option={option} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-subtle">Нет данных по очкам.</div>
          )}
        </div>
      </div>
    </div>
  );
}
