import { DateCellStrip } from '@/widgets/date-strip/DateCellStrip';

export function AppHeader() {
  return (
    <header
      className="border-border flex shrink-0 flex-col border-b bg-background px-2 pb-1.5 pt-[calc(env(safe-area-inset-top,0px)+1.65rem)] sm:px-4 md:flex-row md:items-center md:px-3 md:py-2"
    >
      <div className="flex w-full items-center justify-center pb-1 md:hidden">
        <p className="text-foreground/85 text-[0.72rem] font-semibold tracking-[0.18em]">AURA</p>
      </div>
      <div className="aura-mini-header-strip mx-auto w-full">
        <DateCellStrip />
      </div>
    </header>
  );
}
