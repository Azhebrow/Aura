import { DateCellStrip } from '@/widgets/date-strip/DateCellStrip';

export function AppHeader() {
  return (
    <header
      className="flex shrink-0 flex-col border-b border-[var(--aura-border-soft)] bg-background px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] aura-tx-surface sm:px-4 md:flex-row md:items-center md:px-3 md:py-2"
    >
      <div className="aura-mini-header-strip mx-auto w-full">
        <DateCellStrip />
      </div>
    </header>
  );
}
