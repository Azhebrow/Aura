type Props = {
  id: string;
  dotRadius?: number;
  spacing?: number;
  opacity?: number;
};

export function EvilDottedPatternDefs({ id, dotRadius = 1.2, spacing = 10, opacity = 0.45 }: Props) {
  return (
    <pattern id={id} x="0" y="0" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
      <circle className="dark:text-muted/40 text-muted" cx={2} cy={2} r={dotRadius} fill="currentColor" opacity={opacity} />
    </pattern>
  );
}
