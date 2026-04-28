import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, type ChartConfig, ChartTooltip } from '@/components/ui/chart';
import type { StatsMeta } from '@/shared/stats/types';
import type { EvilSummaryRow } from '../stats-evil-adapters';
import { EvilStatsTooltipContent } from './EvilStatsTooltipContent';

type Props = {
  data: EvilSummaryRow[];
  chartConfig: ChartConfig;
  patternId: string;
  meta: StatsMeta;
};

export function EvilPieRadialChart({ data, chartConfig, patternId, meta }: Props) {
  void patternId;
  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-0 w-full rounded-xl border border-border/60 bg-muted/10 p-2"
      initialDimension={{ width: 680, height: 320 }}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="42%"
          outerRadius="72%"
          paddingAngle={1}
          stroke="var(--border)"
          strokeWidth={1}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip cursor={false} content={<EvilStatsTooltipContent meta={meta} mode="mood" />} />
      </PieChart>
    </ChartContainer>
  );
}
