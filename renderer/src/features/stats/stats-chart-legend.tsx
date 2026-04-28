import type { Payload as LegendPayload } from 'recharts/types/component/DefaultLegendContent';
import type { StatsMeta } from '@/shared/stats/types';
import { resolveChartColor } from './stats-chart-utils';
import { StatsMetaIconBadge } from './stats-meta-icon-badge';

type Props = {
  payload?: LegendPayload[];
  meta: StatsMeta;
};

export function StatsChartLegend({ payload, meta }: Props) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-0.5 pt-0.5">
      {payload.map((entry, i) => {
        const key = String(entry.dataKey ?? entry.value ?? i);
        const label = String(entry.value ?? key);
        const icon = meta.icons[key];
        const tint = resolveChartColor(meta.colors, key, i);
        return (
          <li key={`${key}-${i}`} className="flex items-center gap-2">
            <StatsMetaIconBadge icon={icon} tint={tint} size={12} />
            <span className="text-muted-foreground max-w-[10rem] truncate text-xs font-medium">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
