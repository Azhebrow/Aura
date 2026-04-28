import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';

const BOX = 24;

type Props = {
  cx?: number;
  cy?: number;
  icon?: string | null;
  tint?: string | null;
};

/**
 * Маркер на линии при наведении: иконка в скруглённой подложке (SVG foreignObject).
 */
export function StatsChartPointGlyph({ cx = 0, cy = 0, icon, tint }: Props) {
  const x = cx - BOX / 2;
  const y = cy - BOX / 2;
  const name = icon && String(icon).trim() ? String(icon).trim() : 'layers';
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      <rect
        width={BOX}
        height={BOX}
        rx={7}
        className="fill-background stroke-border/70 dark:fill-card"
        strokeWidth={1.25}
      />
      <foreignObject x={0} y={0} width={BOX} height={BOX}>
        <div
          className="flex h-6 w-6 items-center justify-center"
          style={{ width: BOX, height: BOX }}
        >
          <ColoredAuraIcon name={name} tint={tint ?? undefined} size={15} />
        </div>
      </foreignObject>
    </g>
  );
}
