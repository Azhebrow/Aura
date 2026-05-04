import { cn } from '@/lib/utils';

type Props = {
  rows?:      number;
  className?: string;
};

/**
 * LoadingShell — universal skeleton loading state.
 * Replaces every InlineLoader and "Загрузка…" paragraph in the app.
 *
 * Law 3: "Every data state is rendered." Use this via AsyncDataShell,
 * never manually check `if (!ready)`.
 */
export function LoadingShell({ rows = 3, className }: Props) {
  return (
    <div
      role="status"
      aria-label="Загрузка"
      className={cn('flex flex-col gap-aura-sm p-aura-lg', className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="aura-skeleton h-8 rounded-aura-control"
          style={{ opacity: 1 - i * 0.18 }}
        />
      ))}
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}
