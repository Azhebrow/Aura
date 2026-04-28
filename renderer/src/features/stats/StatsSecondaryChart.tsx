import { useId, useMemo } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import type { StatsAggregatedRow, StatsAggregation, StatsDayRow, StatsGroupBy, StatsMeta, StatsMode } from '@/shared/stats/types';
import {
  buildSeriesDefs,
  buildSummaryRows,
  buildTimeSeriesData,
  buildFinanceComposedData,
  resolveVisibleKeys,
  toChartConfigKey,
} from './stats-evil-adapters';
import { FINANCE_SEMANTIC } from '@/shared/design/aura-palette';
import { EvilDefaultMultipleBarChart } from './evil/EvilDefaultMultipleBarChart';
import { EvilGlowingStackedBarChart } from './evil/EvilGlowingStackedBarChart';
import { EvilPingingLineChart } from './evil/EvilPingingLineChart';
import { EvilSeriesIconLegend } from './evil/EvilSeriesIconLegend';
import { EvilVerticalCategoryBarChart } from './evil/EvilVerticalCategoryBarChart';
import { SECONDARY_EVIL_VARIANT } from './stats-evil-variant-map';

type Props = {
  mode: StatsMode;
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  aggregatedRows: StatsAggregatedRow[];
  dayRows: StatsDayRow[];
  meta: StatsMeta;
  selectedSeriesKeys: string[] | null;
  rankCumulativeRows: StatsAggregatedRow[] | null;
};

export function StatsSecondaryChart({
  mode,
  groupBy,
  aggregation,
  aggregatedRows,
  dayRows,
  meta,
  selectedSeriesKeys,
  rankCumulativeRows,
}: Props) {
  const gid = useId().replace(/:/g, '');
  const visibleKeys = useMemo(
    () => resolveVisibleKeys(aggregatedRows, mode, groupBy, selectedSeriesKeys),
    [aggregatedRows, mode, groupBy, selectedSeriesKeys]
  );
  const series = useMemo(() => buildSeriesDefs(visibleKeys, meta, mode), [visibleKeys, meta, mode]);
  const summary = useMemo(
    () => buildSummaryRows(mode, aggregatedRows, dayRows, visibleKeys, meta, rankCumulativeRows),
    [mode, aggregatedRows, dayRows, visibleKeys, meta, rankCumulativeRows]
  );

  const topSummary = useMemo(() => {
    const base = summary.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 12);
    if (mode === 'tasks' || mode === 'rituals') {
      const total = base.reduce((sum, item) => sum + item.value, 0);
      const avg = base.length ? total / base.length : 0;
      return [{ name: 'Выполнение за период, %', value: Math.max(0, Math.min(100, avg)), fill: base[0]?.fill ?? 'var(--chart-1)' }];
    }
    return base;
  }, [summary, mode]);

  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        (series.length ? series : topSummary.map((row) => ({ key: row.name, color: row.fill, label: row.name }))).map((item) => [
          toChartConfigKey(item.key),
          {
            label: item.label,
            color: item.color,
          },
        ])
      ),
    [series, topSummary]
  );

  const variant = SECONDARY_EVIL_VARIANT[mode];

  if (!topSummary.length) {
    return (
      <div className="text-muted-foreground flex h-44 min-h-[11rem] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-sm">
        Нет данных для сводки
      </div>
    );
  }

  const groupedData = topSummary.map((row) => ({
    labelDisplay: row.name,
    value: row.value,
    [row.name]: row.value,
  }));
  const singleValueSeries = [{ key: 'value', label: 'Значение', color: topSummary[0]?.fill ?? 'var(--chart-1)' }];
  const singleValueConfig: ChartConfig = {
    value: { label: 'Значение', color: topSummary[0]?.fill ?? 'var(--chart-1)' },
  };
  const timeSeriesData = buildTimeSeriesData(aggregatedRows, visibleKeys.slice(0, 3), mode, aggregation);
  const timeSeriesConfig: ChartConfig = Object.fromEntries(
    buildSeriesDefs(visibleKeys.slice(0, 3), meta).map((item) => [
      toChartConfigKey(item.key),
      { label: item.label, color: item.color },
    ])
  );
  const timeSeries = buildSeriesDefs(visibleKeys.slice(0, 3), meta, mode);

  if (mode === 'rank' && rankCumulativeRows?.length) {
    const rankKeys = visibleKeys.includes('Очки ранга') ? ['Очки ранга'] : visibleKeys.slice(0, 1);
    const rankSeries = buildSeriesDefs(rankKeys, meta, mode);
    const rankData = buildTimeSeriesData(rankCumulativeRows, rankKeys, mode, aggregation);
    const rankConfig: ChartConfig = Object.fromEntries(
      rankSeries.map((item) => [toChartConfigKey(item.key), { label: item.label, color: item.color }])
    );
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilPingingLineChart
          data={rankData}
          series={rankSeries}
          chartConfig={rankConfig}
          patternId={`evil-rank-cumulative-${gid}`}
          meta={meta}
          mode={mode}
        />
        <EvilSeriesIconLegend items={rankSeries.map((s) => ({ key: s.key, label: 'Накопительные очки', color: s.color, icon: s.icon }))} />
      </div>
    );
  }

  if (mode === 'finance') {
    const financeData = buildFinanceComposedData(aggregatedRows, visibleKeys, aggregation);
    const totals = financeData.reduce<{ income: number; expense: number; net: number }>(
      (acc, row) => {
        acc.income += Number(row.income ?? 0);
        acc.expense += Number(row.expense ?? 0);
        acc.net += Number(row.net ?? 0);
        return acc;
      },
      { income: 0, expense: 0, net: 0 }
    );
    const financeSummary = [
      { labelDisplay: 'Доходы', value: Number(totals.income), fill: FINANCE_SEMANTIC.income },
      { labelDisplay: 'Расходы', value: Number(totals.expense), fill: FINANCE_SEMANTIC.expense },
      { labelDisplay: 'Баланс', value: Number(totals.net), fill: FINANCE_SEMANTIC.transfer },
    ];
    const financeConfig: ChartConfig = {
      income: { label: 'Доходы', color: FINANCE_SEMANTIC.income },
      expense: { label: 'Расходы', color: FINANCE_SEMANTIC.expense },
      net: { label: 'Баланс', color: FINANCE_SEMANTIC.transfer },
    };
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilVerticalCategoryBarChart
          data={financeSummary}
          chartConfig={financeConfig}
          patternId={`evil-finance-secondary-${gid}`}
          meta={meta}
          mode={mode}
        />
        <EvilSeriesIconLegend
          items={[
            { key: 'income', label: 'Доходы', color: FINANCE_SEMANTIC.income, icon: meta.icons['Доходы'], value: Number(totals.income) },
            { key: 'expense', label: 'Расходы', color: FINANCE_SEMANTIC.expense, icon: meta.icons['Расходы'], value: Number(totals.expense) },
            { key: 'net', label: 'Баланс', color: FINANCE_SEMANTIC.transfer, icon: meta.icons['Баланс'], value: Number(totals.net) },
          ]}
        />
      </div>
    );
  }

  if (variant === 'glowingBar') {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilGlowingStackedBarChart
          data={groupedData}
          series={series.length ? series : topSummary.map((row) => ({ key: row.name, label: row.name, color: row.fill }))}
          chartConfig={chartConfig}
          meta={meta}
          mode={mode}
        />
        <EvilSeriesIconLegend
          items={(series.length ? series : topSummary.map((row) => ({ key: row.name, label: row.name, color: row.fill }))).map((s) => ({
            key: s.key,
            label: s.label,
            color: s.color,
            icon: meta.icons[s.key],
          }))}
        />
      </div>
    );
  }

  if (variant === 'glowingVerticalBar') {
    const verticalRows = topSummary.map((row) => ({
      labelDisplay: row.name,
      value: row.value,
      fill: row.fill,
    }));
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilVerticalCategoryBarChart
          data={verticalRows}
          chartConfig={singleValueConfig}
          patternId={`evil-vertical-${gid}`}
          meta={meta}
          mode={mode}
        />
        <EvilSeriesIconLegend
          items={topSummary.map((row) => ({
            key: row.name,
            label: row.name,
            color: row.fill,
            icon: meta.icons[row.name],
            value: row.value,
          }))}
        />
      </div>
    );
  }

  if (variant === 'multipleBar' && timeSeries.length > 0 && timeSeriesData.length > 0) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilDefaultMultipleBarChart
          data={timeSeriesData}
          series={timeSeries}
          chartConfig={timeSeriesConfig}
          patternId={`evil-secondary-pattern-${gid}`}
          meta={meta}
          mode={mode}
        />
        <EvilSeriesIconLegend items={timeSeries.map((s) => ({ key: s.key, label: s.label, color: s.color, icon: s.icon }))} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <EvilDefaultMultipleBarChart
        data={groupedData}
        series={singleValueSeries}
        chartConfig={singleValueConfig}
        patternId={`evil-secondary-pattern-${gid}`}
        vertical={variant === 'defaultBar'}
        meta={meta}
        mode={mode}
      />
      <EvilSeriesIconLegend
        items={topSummary.map((row) => ({
          key: row.name,
          label: row.name,
          color: row.fill,
          icon: meta.icons[row.name],
          value: row.value,
        }))}
      />
    </div>
  );
}

