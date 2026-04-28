import { useId, useMemo } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import { FINANCE_SEMANTIC } from '@/shared/design/aura-palette';
import type { StatsAggregatedRow, StatsAggregation, StatsDayRow, StatsGroupBy, StatsMeta, StatsMode } from '@/shared/stats/types';
import {
  buildSummaryRows,
  buildFinanceComposedData,
  buildSeriesDefs,
  buildTimeSeriesData,
  resolveVisibleKeys,
  toChartConfigKey,
} from './stats-evil-adapters';
import { EvilComposedFinanceChart } from './evil/EvilComposedFinanceChart';
import { EvilDottedAreaChart } from './evil/EvilDottedAreaChart';
import { EvilPieRadialChart } from './evil/EvilPieRadialChart';
import { EvilPingingLineChart } from './evil/EvilPingingLineChart';
import { EvilSeriesIconLegend } from './evil/EvilSeriesIconLegend';
import { PRIMARY_EVIL_VARIANT } from './stats-evil-variant-map';

type Props = {
  mode: StatsMode;
  groupBy: StatsGroupBy;
  aggregation: StatsAggregation;
  rows: StatsAggregatedRow[];
  dayRows: StatsDayRow[];
  meta: StatsMeta;
  selectedSeriesKeys: string[] | null;
};

export function StatsPrimaryChart({ mode, groupBy, aggregation, rows, dayRows, meta, selectedSeriesKeys }: Props) {
  const gid = useId().replace(/:/g, '');
  const variant = PRIMARY_EVIL_VARIANT[mode];
  const seriesKeys = useMemo(
    () => resolveVisibleKeys(rows, mode, groupBy, selectedSeriesKeys),
    [rows, mode, groupBy, selectedSeriesKeys]
  );
  const series = useMemo(() => buildSeriesDefs(seriesKeys, meta, mode), [seriesKeys, meta, mode]);
  const timeSeries = useMemo(() => buildTimeSeriesData(rows, seriesKeys, mode, aggregation), [rows, seriesKeys, mode, aggregation]);

  if (!rows.length || !seriesKeys.length) {
    return (
      <div className="text-muted-foreground flex h-48 min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-sm">
        Нет данных за выбранный период
      </div>
    );
  }

  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        series.map((item) => [
          toChartConfigKey(item.key),
          {
            label: item.label,
            color: item.color,
          },
        ])
      ),
    [series]
  );

  if (variant === 'composedFinance') {
    const financeData = buildFinanceComposedData(rows, seriesKeys, aggregation);
    const financeConfig: ChartConfig = {
      income: { label: 'Доходы', color: FINANCE_SEMANTIC.income },
      expense: { label: 'Расходы', color: FINANCE_SEMANTIC.expense },
      net: { label: 'Баланс', color: FINANCE_SEMANTIC.transfer },
    };
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilComposedFinanceChart
          data={financeData}
          chartConfig={financeConfig}
          patternId={`evil-primary-pattern-${gid}`}
          meta={meta}
        />
        <EvilSeriesIconLegend
          items={[
            { key: 'income', label: 'Доходы', color: FINANCE_SEMANTIC.income, icon: meta.icons['Доходы'] },
            { key: 'expense', label: 'Расходы', color: FINANCE_SEMANTIC.expense, icon: meta.icons['Расходы'] },
            { key: 'net', label: 'Баланс', color: FINANCE_SEMANTIC.transfer, icon: meta.icons['Баланс'] },
          ]}
        />
      </div>
    );
  }

  if (variant === 'pie') {
    const pieData = buildSummaryRows('mood', rows, dayRows, seriesKeys, meta, null).map((item) => ({
      name: item.name,
      value: item.value,
      fill: item.fill,
    }));
    if (!pieData.some((item) => item.value > 0)) {
      return (
        <div className="text-muted-foreground flex h-48 min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-sm">
          Нет данных за выбранный период
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilPieRadialChart data={pieData} chartConfig={chartConfig} patternId={`evil-primary-pattern-${gid}`} meta={meta} />
        <EvilSeriesIconLegend
          items={pieData.map((item) => ({
            key: item.name,
            label: item.name,
            color: item.fill,
            icon: meta.icons[item.name],
            value: item.value,
          }))}
        />
      </div>
    );
  }

  if (variant === 'pingingLine') {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <EvilPingingLineChart
          data={timeSeries}
          series={series}
          chartConfig={chartConfig}
          patternId={`evil-primary-pattern-${gid}`}
          pingFirstSeries
          meta={meta}
          mode={mode}
        />
        <EvilSeriesIconLegend items={series.map((s) => ({ key: s.key, label: s.label, color: s.color, icon: s.icon }))} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <EvilDottedAreaChart
        data={timeSeries}
        series={series}
        chartConfig={chartConfig}
        patternId={`evil-primary-pattern-${gid}`}
        meta={meta}
        mode={mode}
      />
      <EvilSeriesIconLegend items={series.map((s) => ({ key: s.key, label: s.label, color: s.color, icon: s.icon }))} />
    </div>
  );
}
