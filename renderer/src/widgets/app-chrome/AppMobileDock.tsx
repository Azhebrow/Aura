import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useShell } from '@/app/navigation/shell-context';
import { getNavPagesInOrder, type NavPageDefinition } from '@/shared/config/nav-model';
import { PAGE_ICONS } from '@/shared/config/page-icons';

function DockPageButton({ page, active, onSelect }: { page: NavPageDefinition; active: boolean; onSelect: () => void }) {
  const Icon = PAGE_ICONS[page.id];
  return (
    <button
      type="button"
      className={cn(
        'relative flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-1 py-2 text-xs font-medium transition-all duration-aura-fast ease-aura',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-[0.98]'
      )}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon className="size-5 shrink-0" strokeWidth={active ? 2.35 : 2} aria-hidden />
      <span className="sr-only">{page.label}</span>
      {active ? <span className="bg-foreground/80 absolute -bottom-0.5 h-0.5 w-4 rounded-full" aria-hidden /> : null}
    </button>
  );
}

export function AppMobileDock() {
  const { activePageId, setActivePageId, navOrder } = useShell();
  const { mainPages, settingsPage } = useMemo(() => {
    const pages = getNavPagesInOrder(navOrder);
    return {
      mainPages: pages.filter((p) => p.id !== 'settings' && p.id !== 'calendar' && p.id !== 'stats'),
      settingsPage: pages.find((p) => p.id === 'settings'),
    };
  }, [navOrder]);

  return (
    <nav
      className="aura-mobile-dock bg-background shrink-0 border-t border-border/40 px-0 pb-[calc(env(safe-area-inset-bottom,0)+0.9rem)] pt-1 md:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch gap-1 rounded-none border-0 bg-transparent px-1 py-1">
        <div className="flex min-w-0 flex-1 flex-row items-stretch gap-1" role="group" aria-label="Разделы приложения">
          {mainPages.map((page) => (
            <DockPageButton
              key={page.id}
              page={page}
              active={activePageId === page.id}
              onSelect={() => setActivePageId(page.id)}
            />
          ))}
        </div>
        {settingsPage ? (
          <>
            <div className="bg-border/70 my-1 w-px shrink-0 self-stretch opacity-80" aria-hidden />
            <div className="flex w-11 shrink-0 flex-col justify-center" role="none">
              <DockPageButton
                page={settingsPage}
                active={activePageId === settingsPage.id}
                onSelect={() => setActivePageId(settingsPage.id)}
              />
            </div>
          </>
        ) : null}
      </div>
    </nav>
  );
}
