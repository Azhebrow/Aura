import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, type ChartConfig, ChartTooltip } from '@/components/ui/chart';
import type { StatsMeta, StatsMode } from '@/shared/stats/types';
import { chartAxisUnit, formatChartAxisValue } from '../stats-chart-utils';
import { EvilStatsTooltipContent } from './EvilStatsTooltipContent';

type Row = { labelDisplay: string; value: number; fill: string };

type Props = {
  data: Row[];
  chartConfig: ChartConfig;
  patternId: string;
  meta: StatsMeta;
  mode: StatsMode;
};

export function EvilVerticalCategoryBarChart({ data, chartConfig, patternId, meta, mode }: Props) {
  void patternId;
  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-0 w-full rounded-xl border border-border/60 bg-muted/10 p-2"
      initialDimension={{ width: 900, height: 340 }}
    >
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.45} />
        <YAxis
          type="category"
          dataKey="labelDisplay"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          width={132}
          tickFormatter={(value) => String(value).slice(0, 16)}
          label={{ value: 'Категории', angle: -90, position: 'insideLeft', offset: -6, fill: 'var(--muted-foreground)' }}
        />
        <XAxis
          type="number"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          tickFormatter={(value) => formatChartAxisValue(Number(value), mode)}
          label={{ value: chartAxisUnit(mode), position: 'insideBottomRight', offset: -4, fill: 'var(--muted-foreground)' }}
        />
        <ChartTooltip cursor={false} content={<EvilStatsTooltipContent meta={meta} mode={mode} />} />
        <Bar dataKey="value" radius={0} maxBarSize={22} isAnimationActive={false}>
          {data.map((row) => (
            <Cell key={row.labelDisplay} fill={row.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
