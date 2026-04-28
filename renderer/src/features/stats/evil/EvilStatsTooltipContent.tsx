import { formatValueForTable } from '@/shared/stats/stats-table-format';
import type { StatsMeta, StatsMode } from '@/shared/stats/types';
import { resolveChartColor } from '../stats-chart-utils';
import { StatsMetaIconBadge } from '../stats-meta-icon-badge';

type PayloadEntry = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
};

type Props = {
  active?: boolean;
  label?: string | number;
  payload?: unknown[];
  meta: StatsMeta;
  mode: StatsMode;
};

export function EvilStatsTooltipContent({ active, label, payload, meta, mode }: Props) {
  if (!active || !payload?.length) return null;
  const rows = payload as PayloadEntry[];
  return (
    <div className="border-border/80 bg-background/95 text-popover-foreground min-w-[12rem] rounded-xl border px-3 py-2 shadow-lg">
      <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wider">
        {String(label ?? '')}
      </p>
      <ul className="space-y-1.5">
        {rows.map((entry, idx) => {
          const rawKey = String(entry.name ?? entry.dataKey ?? 'value');
          const inferred = typeof entry.payload?.labelDisplay === 'string' ? String(entry.payload.labelDisplay) : null;
          const key = rawKey === 'value' && inferred ? inferred : rawKey;
          const raw = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0);
          const numeric = Number.isFinite(raw) ? raw : 0;
          const color = resolveChartColor(meta.colors, key, idx);
          return (
            <li key={`${key}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <StatsMetaIconBadge icon={meta.icons[key]} tint={color} size={11} />
                <span className="truncate">{key}</span>
              </span>
              <span className="font-mono tabular-nums">{formatValueForTable(numeric, mode, key, null)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
