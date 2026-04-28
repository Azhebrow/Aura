import { StatsMetaIconBadge } from '../stats-meta-icon-badge';

type Item = {
  key: string;
  label: string;
  color: string;
  icon?: string;
  value?: number;
};

type Props = {
  items: Item[];
};

export function EvilSeriesIconLegend({ items }: Props) {
  if (!items.length) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {items.slice(0, 10).map((item) => (
        <li key={item.key} className="bg-muted/20 border-border/40 inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <StatsMetaIconBadge icon={item.icon} tint={item.color} size={11} />
            <span className="max-w-[8.5rem] truncate text-xs leading-none">{item.label}</span>
          </span>
          {typeof item.value === 'number' ? (
            <span className="text-muted-foreground font-mono text-xs tabular-nums">{Math.round(item.value).toLocaleString('ru-RU')}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
