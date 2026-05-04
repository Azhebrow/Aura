import { DateCellStrip } from '@/widgets/date-strip/DateCellStrip';

export function AppHeader() {
  return (
    <header
      className="border-border flex shrink-0 flex-col border-b bg-background px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-4 md:flex-row md:items-center md:px-3 md:py-2"
    >
      <div className="aura-mini-header-strip mx-auto w-full">
        <DateCellStrip />
      </div>
    </header>
  );
}
