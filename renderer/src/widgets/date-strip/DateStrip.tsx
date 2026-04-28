import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';

export function DateStrip() {
  const { dateString, addDays, canGoNext } = useSelectedDate();

  return (
    <div className="border-border bg-muted/20 flex max-w-md flex-1 items-center justify-center gap-1 rounded-lg border px-1 py-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Предыдущий день"
        onClick={() => addDays(-1)}
      >
        <ChevronLeft data-icon="inline-start" />
      </Button>
      <time
        dateTime={dateString}
        className="text-foreground min-w-[9.5rem] text-center font-mono text-sm font-medium tabular-nums"
      >
        {dateString}
      </time>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Следующий день"
        disabled={!canGoNext}
        onClick={() => addDays(1)}
      >
        <ChevronRight data-icon="inline-start" />
      </Button>
    </div>
  );
}
