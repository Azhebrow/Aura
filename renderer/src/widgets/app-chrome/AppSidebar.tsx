import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShell } from '@/app/navigation/shell-context';
import { getNavPagesInOrder, type NavPageDefinition } from '@/shared/config/nav-model';
import { PAGE_ICONS } from '@/shared/config/page-icons';
import { ShellNavItem } from '@/widgets/app-chrome/ShellNavItem';
import { SidebarDaySnapshot } from '@/widgets/app-chrome/SidebarDaySnapshot';
import { AuraBrandIcon } from '@/widgets/app-chrome/AuraBrandIcon';

function NavPageButton({
  page,
  isActive,
  onSelect,
  className,
}: {
  page: NavPageDefinition;
  isActive: boolean;
  onSelect: () => void;
  className?: string;
}) {
  const Icon = PAGE_ICONS[page.id];
  return (
    <ShellNavItem icon={Icon} isActive={isActive} onClick={onSelect} className={className}>
      {page.label}
    </ShellNavItem>
  );
}

export function AppSidebar() {
  const { activePageId, setActivePageId, toggleCalendar, navOrder } = useShell();
  const { mainPages, settingsPage } = useMemo(() => {
    const pages = getNavPagesInOrder(navOrder);
    return {
      mainPages: pages.filter((p) => p.id !== 'settings' && p.id !== 'calendar'),
      settingsPage: pages.find((p) => p.id === 'settings'),
    };
  }, [navOrder]);

  return (
    <aside className="border-border bg-muted/25 hidden h-full min-h-0 w-[15.5rem] shrink-0 flex-col border-r px-2.5 py-3 md:flex xl:w-60">
      <div className="mb-2.5 shrink-0 px-0.5">
        <div className="group/brand relative flex items-center gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => setActivePageId('home')}
            className="text-foreground hover:text-foreground/90 focus-visible:ring-ring inline-flex h-8 items-center gap-2 rounded-lg px-1.5 text-left outline-none aura-tx-colors focus-visible:ring-2"
            aria-label="Перейти на домашнюю страницу"
          >
            <AuraBrandIcon className="size-[1.05rem]" />
            <span className="font-heading text-lg font-semibold tracking-tight">AURA</span>
          </button>

          <button
            type="button"
            onClick={toggleCalendar}
            className={cn(
              'border-border bg-background/90 text-foreground hover:bg-muted/80 focus-visible:ring-ring/80 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium outline-none shadow-sm transition-all duration-aura-base ease-aura focus-visible:ring-2',
              activePageId === 'calendar'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'opacity-80 hover:opacity-100'
            )}
            aria-label={activePageId === 'calendar' ? 'Вернуться назад' : 'Открыть календарь'}
            title={activePageId === 'calendar' ? 'Вернуться назад' : 'Открыть календарь'}
          >
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="hidden xl:inline">Календарь</span>
          </button>
        </div>
      </div>
      <div className="shrink-0 [@media(max-height:719px)]:block hidden">
        <SidebarDaySnapshot compact={true} />
      </div>
      <div className="shrink-0 hidden [@media(min-height:720px)]:block">
        <SidebarDaySnapshot compact={false} />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0.5" aria-label="Основная навигация">
        <div className="flex min-h-0 flex-1 flex-col gap-1 py-1">
          {mainPages.map((page) => (
            <div key={page.id} className="flex min-h-0 flex-1">
              <NavPageButton
                page={page}
                isActive={activePageId === page.id}
                onSelect={() => setActivePageId(page.id)}
                className="h-full"
              />
            </div>
          ))}
        </div>

        {settingsPage ? (
          <div className="mt-auto shrink-0 pt-2">
            <NavPageButton
              page={settingsPage}
              isActive={activePageId === settingsPage.id}
              onSelect={() => setActivePageId(settingsPage.id)}
            />
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
