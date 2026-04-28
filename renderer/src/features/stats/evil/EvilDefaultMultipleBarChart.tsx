import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, type ChartConfig, ChartTooltip } from '@/components/ui/chart';
import type { StatsMeta, StatsMode } from '@/shared/stats/types';
import type { EvilPoint, EvilSeriesDef } from '../stats-evil-adapters';
import { chartAxisUnit, formatChartAxisValue, formatChartXAxisLabel } from '../stats-chart-utils';
import { EvilStatsTooltipContent } from './EvilStatsTooltipContent';

type Props = {
  data: EvilPoint[];
  series: EvilSeriesDef[];
  chartConfig: ChartConfig;
  patternId: string;
  vertical?: boolean;
  meta: StatsMeta;
  mode: StatsMode;
};

export function EvilDefaultMultipleBarChart({ data, series, chartConfig, patternId, vertical = false, meta, mode }: Props) {
  void patternId;
  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-0 w-full rounded-xl border border-border/60 bg-muted/10 p-2"
      initialDimension={{ width: 900, height: 320 }}
    >
      <BarChart accessibilityLayer data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.45} />
        {vertical ? (
          <>
            <YAxis
              type="category"
              dataKey="labelDisplay"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={128}
              label={{ value: 'Категории', angle: -90, position: 'insideLeft', offset: -6, fill: 'var(--muted-foreground)' }}
            />
            <XAxis
              type="number"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => formatChartAxisValue(Number(value), mode)}
              label={{ value: chartAxisUnit(mode), position: 'insideBottomRight', offset: -4, fill: 'var(--muted-foreground)' }}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="labelDisplay"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
              tickFormatter={formatChartXAxisLabel}
              label={{ value: 'Период', position: 'insideBottom', offset: -2, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => formatChartAxisValue(Number(value), mode)}
              label={{ value: chartAxisUnit(mode), angle: -90, position: 'insideLeft', offset: -2, fill: 'var(--muted-foreground)' }}
            />
          </>
        )}
        <ChartTooltip cursor={false} content={<EvilStatsTooltipContent meta={meta} mode={mode} />} />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} fill={item.color} radius={0} maxBarSize={30} isAnimationActive={false} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
