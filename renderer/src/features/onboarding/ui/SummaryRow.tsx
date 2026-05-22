// ─── SummaryRow ───────────────────────────────────────────────────────────────
// Строка сводки настроек на финальном шаге онбординга.

type Props = { label: string; value: string };

export function SummaryRow({ label, value }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
