import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
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
  pingFirstSeries?: boolean;
  meta: StatsMeta;
  mode: StatsMode;
};

export function EvilPingingLineChart({ data, series, chartConfig, patternId, pingFirstSeries = false, meta, mode }: Props) {
  void patternId;
  void pingFirstSeries;
  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-0 w-full rounded-xl border border-border/60 bg-muted/10 p-2"
      initialDimension={{ width: 900, height: 320 }}
    >
      <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} stroke="var(--border)" />
        <XAxis
          dataKey="labelDisplay"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          interval="preserveStartEnd"
          tickFormatter={formatChartXAxisLabel}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          label={{ value: 'Период', position: 'insideBottom', offset: -2, fill: 'var(--muted-foreground)', fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(value) => formatChartAxisValue(Number(value), mode)}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          label={{ value: chartAxisUnit(mode), angle: -90, position: 'insideLeft', offset: 8, fill: 'var(--muted-foreground)', fontSize: 10 }}
        />
        <ChartTooltip cursor={false} content={<EvilStatsTooltipContent meta={meta} mode={mode} />} />
        {series.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            type="linear"
            stroke={item.color}
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
