import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, type ChartConfig, ChartTooltip } from '@/components/ui/chart';
import type { StatsMeta } from '@/shared/stats/types';
import type { EvilPoint } from '../stats-evil-adapters';
import { chartAxisUnit, formatChartAxisValue, formatChartXAxisLabel } from '../stats-chart-utils';
import { EvilStatsTooltipContent } from './EvilStatsTooltipContent';

type Props = {
  data: EvilPoint[];
  chartConfig: ChartConfig;
  patternId: string;
  meta: StatsMeta;
};

export function EvilComposedFinanceChart({ data, chartConfig, patternId, meta }: Props) {
  void patternId;
  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-0 w-full rounded-xl border border-border/60 bg-muted/10 p-2"
      initialDimension={{ width: 900, height: 320 }}
    >
      <ComposedChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.45} />
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
          width={60}
          tickFormatter={(value) => formatChartAxisValue(Number(value), 'finance')}
          label={{ value: chartAxisUnit('finance'), angle: -90, position: 'insideLeft', offset: -2, fill: 'var(--muted-foreground)' }}
        />
        <ReferenceLine y={0} stroke="var(--border)" strokeOpacity={0.9} />
        <ChartTooltip cursor={false} content={<EvilStatsTooltipContent meta={meta} mode="finance" />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={0} maxBarSize={26} isAnimationActive={false} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={0} maxBarSize={26} isAnimationActive={false} />
        <Line dataKey="net" type="linear" stroke="var(--color-net)" strokeWidth={2.6} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ChartContainer>
  );
}
