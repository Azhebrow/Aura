import { formatAmount } from '@/shared/lib/money';
import { formatTimeFromHours } from '@/shared/stats/stats-table-format';
import type { StatsFormattedTable } from '@/shared/stats/stats-table-format';
import type { StatsAggregation, StatsGroupBy, StatsMeta, StatsMode, StatsTimeSummary } from '@/shared/stats/types';
import {
  getChartIconUrl,
  getChartNumericValue,
  getNutritionNumericValue,
  resolveChartColor,
  visibleSeriesKeys,
} from './stats-chart-utils';

export type StatsValueKind = 'percent' | 'currency' | 'duration' | 'count' | 'mood' | 'nutrition';
export type StatsSeriesVariant = 'bar' | 'line';
export type StatsTickFormat = 'percent' | 'currency' | 'duration' | 'integer' | 'plain';

export type StatsChartInteractionPolicy = {
  disableBlur: boolean;
  disableLegendHoverLink: boolean;
  disablePieSelection: boolean;
};

export type StatsChartSeriesSpec = {
  id: string;
  label: string;
  color: string;
  icon: string | null;
  data: Array<number | null>;
  total: number;
};

export type StatsSummarySlice = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  icon: string | null;
  color: string;
  sourceSeriesKeys: string[];
  detailText?: string;
};

export type StatsSeriesPanelSpec = {
  kind: 'series';
  mode: StatsMode;
  valueKind: StatsValueKind;
  tickFormat: StatsTickFormat;
  yAxisName: string;
  stacked: boolean;
  variant: StatsSeriesVariant;
  xLabels: string[];
  keys: string[];
  table: StatsFormattedTable;
  meta: StatsMeta;
  series: StatsChartSeriesSpec[];
};

export type StatsHeatmapPanelSpec = {
  kind: 'heatmap';
  mode: StatsMode;
  tickFormat: StatsTickFormat;
  table: StatsFormattedTable;
  meta: StatsMeta;
  keys: string[];
  normalizedMatrix: Array<[number, number, number]>;
};

export type StatsDonutPanelSpec = {
  kind: 'donut';
  title: string;
  centerPrimary: string;
  centerSecondary: string;
  slices: StatsSummarySlice[];
  emptyMessage: string;
};

export type StatsCorrelationOverviewPanelSpec = {
  kind: 'correlation-overview';
  rows: Array<{
    key: string;
    label: string;
    icon: string | null;
    color: string;
    value: number;
    displayValue: string;
  }>;
};

export type StatsCorrelationTrendPanelSpec = {
  kind: 'correlation-trend';
  xLabels: string[];
  values: number[];
};

export type StatsChartPanelSpec =
  | StatsSeriesPanelSpec
  | StatsHeatmapPanelSpec
  | StatsDonutPanelSpec
  | StatsCorrelationOverviewPanelSpec
  | StatsCorrelationTrendPanelSpec;

export type StatsChartScreenSpec = {
  mode: StatsMode;
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  visibleKeys: string[];
  panels: StatsChartPanelSpec[];
  interactionPolicy: StatsChartInteractionPolicy;
};

type BuilderArgs = {
  mode: StatsMode;
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  table: StatsFormattedTable;
  meta: StatsMeta;
  selectedSeriesKeys: string[] | null;
  currencyCode?: string;
  timeSummary: StatsTimeSummary | null;
};

const DEFAULT_INTERACTION_POLICY: StatsChartInteractionPolicy = {
  disableBlur: true,
  disableLegendHoverLink: true,
  disablePieSelection: true,
};

function getModeValueKind(mode: StatsMode): StatsValueKind {
  switch (mode) {
    case 'tasks':
    case 'rituals':
    case 'correlation':
      return 'percent';
    case 'finance':
      return 'currency';
    case 'time':
    case 'leisure':
      return 'duration';
    case 'rank':
      return 'count';
    case 'mood':
      return 'mood';
    case 'nutrition':
      return 'nutrition';
    default:
      return 'count';
  }
}

function getTickFormat(mode: StatsMode): StatsTickFormat {
  switch (mode) {
    case 'tasks':
    case 'rituals':
    case 'correlation':
      return 'percent';
    case 'finance':
      return 'currency';
    case 'time':
    case 'leisure':
      return 'duration';
    case 'rank':
    case 'mood':
      return 'integer';
    case 'nutrition':
      return 'plain';
    default:
      return 'plain';
  }
}

function getYAxisName(mode: StatsMode): string {
  switch (mode) {
    case 'tasks':
    case 'rituals':
    case 'correlation':
      return '%';
    case 'finance':
      return '₽';
    case 'time':
    case 'leisure':
      return 'ч';
    case 'rank':
      return 'оч.';
    case 'mood':
      return 'ур.';
    case 'nutrition':
      return 'знач.';
    default:
      return 'знач.';
  }
}

function getSeriesVariant(mode: StatsMode): StatsSeriesVariant {
  if (mode === 'mood' || mode === 'rank' || mode === 'nutrition') return 'line';
  return 'bar';
}

function isStackedMode(mode: StatsMode): boolean {
  return mode === 'tasks' || mode === 'finance' || mode === 'rituals' || mode === 'time' || mode === 'leisure';
}

function getNumericValue(mode: StatsMode, key: string, raw: unknown): number | null {
  if (mode === 'nutrition') return getNutritionNumericValue(key, raw as never);
  return getChartNumericValue(mode, key, raw as never);
}

function sumValues(values: Array<number | null>): number {
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
}

function buildSeriesPanel(mode: StatsMode, table: StatsFormattedTable, meta: StatsMeta, visibleKeys: string[]): StatsSeriesPanelSpec {
  const series = visibleKeys.map((key) => {
    const data = table.rows.map((row) => getNumericValue(mode, key, row.originalValues[key]));
    return {
      id: key,
      label: key,
      color: resolveChartColor(meta.colors[key], '#60a5fa'),
      icon: getChartIconUrl(meta.icons[key]),
      data,
      total: sumValues(data),
    };
  });

  return {
    kind: 'series',
    mode,
    valueKind: getModeValueKind(mode),
    tickFormat: getTickFormat(mode),
    yAxisName: getYAxisName(mode),
    stacked: isStackedMode(mode),
    variant: getSeriesVariant(mode),
    xLabels: table.rows.map((row) => row.label),
    keys: visibleKeys,
    table,
    meta,
    series,
  };
}

function buildHeatmapPanel(mode: StatsMode, table: StatsFormattedTable, meta: StatsMeta, visibleKeys: string[]): StatsHeatmapPanelSpec {
  const normalizedMatrix: Array<[number, number, number]> = [];
  visibleKeys.forEach((key, yIndex) => {
    const values = table.rows.map((row) => getChartNumericValue(mode, key, row.originalValues[key]) ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);
    values.forEach((value, xIndex) => {
      normalizedMatrix.push([xIndex, yIndex, Math.min(100, Math.max(0, ((value - min) / span) * 100))]);
    });
  });

  return {
    kind: 'heatmap',
    mode,
    tickFormat: 'percent',
    table,
    meta,
    keys: visibleKeys,
    normalizedMatrix,
  };
}

function buildTimeSummaryFromCategories(
  timeSummary: StatsTimeSummary | null,
  meta: StatsMeta,
  visibleKeys: string[]
): StatsDonutPanelSpec {
  const items = (timeSummary?.items ?? []).filter((item) => visibleKeys.includes(item.key));
  const slices = items
    .filter((item) => item.actualHours > 0)
    .map((item) => ({
      id: item.key,
      label: item.key,
      value: item.actualHours,
      displayValue: formatTimeFromHours(item.actualHours),
      icon: getChartIconUrl(meta.icons[item.key] ?? item.icon),
      color: resolveChartColor(meta.colors[item.key] ?? item.color, '#60a5fa'),
      sourceSeriesKeys: [item.key],
      detailText: item.targetHours > 0 ? `Цель за период: ${formatTimeFromHours(item.targetHours)}` : undefined,
    }));
  const totalActual = items.reduce((sum, item) => sum + item.actualHours, 0);
  const totalTarget = items.reduce((sum, item) => sum + item.targetHours, 0);

  return {
    kind: 'donut',
    title: 'Время',
    centerPrimary: formatTimeFromHours(totalActual),
    centerSecondary: totalTarget > 0 ? `из ${formatTimeFromHours(totalTarget)} цели` : 'за период',
    slices,
    emptyMessage: 'Нет долей за выбранный период.',
  };
}

function buildSummaryFromSeries(
  title: string,
  seriesPanel: StatsSeriesPanelSpec,
  currencyCode: string | undefined
): StatsDonutPanelSpec {
  const slices = seriesPanel.series
    .filter((series) => Math.abs(series.total) > 0)
    .map((series) => {
      if (seriesPanel.valueKind === 'currency') {
        return {
          id: series.id,
          label: series.label,
          value: Math.abs(series.total),
          displayValue: formatAmount(series.total, currencyCode),
          icon: series.icon,
          color: series.color,
          sourceSeriesKeys: [series.id],
        };
      }

      return {
        id: series.id,
        label: series.label,
        value: series.total,
        displayValue: formatTimeFromHours(series.total),
        icon: series.icon,
        color: series.color,
        sourceSeriesKeys: [series.id],
      };
    });

  const totalValue = slices.reduce((sum, slice) => sum + slice.value, 0);
  const centerPrimary =
    seriesPanel.valueKind === 'currency' ? formatAmount(totalValue, currencyCode) : formatTimeFromHours(totalValue);
  const centerSecondary = seriesPanel.valueKind === 'currency' ? 'оборот за период' : 'за период';

  return {
    kind: 'donut',
    title,
    centerPrimary,
    centerSecondary,
    slices,
    emptyMessage: 'Нет долей за выбранный период.',
  };
}

function buildCorrelationPanels(seriesPanel: StatsSeriesPanelSpec): [StatsCorrelationOverviewPanelSpec, StatsCorrelationTrendPanelSpec] {
  const rows = seriesPanel.series.map((series) => {
    const numeric = series.data.filter((value): value is number => value !== null && Number.isFinite(value));
    const average = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
    return {
      key: series.id,
      label: series.label,
      icon: series.icon,
      color: series.color,
      value: average,
      displayValue: `${average.toFixed(1)}%`,
    };
  });

  const values = seriesPanel.table.rows.map((row) => {
    const numeric = seriesPanel.keys
      .map((key) => Number(row.originalValues[key]))
      .filter((value) => Number.isFinite(value));
    return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
  });

  return [
    {
      kind: 'correlation-overview',
      rows,
    },
    {
      kind: 'correlation-trend',
      xLabels: seriesPanel.table.rows.map((row) => row.label),
      values,
    },
  ];
}

function buildRankDeltaPanel(seriesPanel: StatsSeriesPanelSpec): StatsSeriesPanelSpec {
  return {
    ...seriesPanel,
    stacked: false,
    variant: 'bar',
    yAxisName: 'за день',
    series: seriesPanel.series.map((series) => {
      let previous: number | null = null;
      const data = series.data.map((value) => {
        if (value === null) return null;
        const delta = previous === null ? value : value - previous;
        previous = value;
        return delta;
      });
      return {
        ...series,
        data,
        total: sumValues(data),
      };
    }),
  };
}

export function buildStatsChartScreenSpec({
  mode,
  groupBy,
  aggregation,
  table,
  meta,
  selectedSeriesKeys,
  currencyCode,
  timeSummary,
}: BuilderArgs): StatsChartScreenSpec {
  const visibleKeys = visibleSeriesKeys(table.columns, selectedSeriesKeys);

  if (mode === 'correlation') {
    const baseSeriesPanel = buildSeriesPanel(mode, table, meta, visibleKeys);
    const [overviewPanel, trendPanel] = buildCorrelationPanels(baseSeriesPanel);
    return {
      mode,
      groupBy,
      aggregation,
      visibleKeys,
      panels: [overviewPanel, trendPanel],
      interactionPolicy: DEFAULT_INTERACTION_POLICY,
    };
  }

  const mainPanel =
    mode === 'correlation' ? buildHeatmapPanel(mode, table, meta, visibleKeys) : buildSeriesPanel(mode, table, meta, visibleKeys);
  const panels: StatsChartPanelSpec[] = [mainPanel];

  if (mode === 'time' || mode === 'leisure') {
    const summaryPanel =
      groupBy === 'categories'
        ? buildTimeSummaryFromCategories(timeSummary, meta, visibleKeys)
        : buildSummaryFromSeries(mode === 'time' ? 'Время' : 'Досуг', mainPanel as StatsSeriesPanelSpec, currencyCode);
    panels.push(summaryPanel);
  } else if (mode === 'finance') {
    panels.push(buildSummaryFromSeries('Финансы', mainPanel as StatsSeriesPanelSpec, currencyCode));
  } else if (mode === 'rank') {
    panels.push(buildRankDeltaPanel(mainPanel as StatsSeriesPanelSpec));
  }

  return {
    mode,
    groupBy,
    aggregation,
    visibleKeys,
    panels,
    interactionPolicy: DEFAULT_INTERACTION_POLICY,
  };
}
