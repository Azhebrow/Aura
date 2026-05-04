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
        'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 aura-tx-interactive',
        'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground active:scale-[0.95]'
      )}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon
        className="size-[var(--nav-icon-size)] shrink-0"
        strokeWidth={active ? 2.2 : 1.9}
        aria-hidden
      />
      <span className="sr-only">{page.label}</span>
      <span
        className={cn(
          'h-0.5 w-3.5 rounded-full aura-tx-interactive',
          active ? 'bg-primary opacity-100' : 'opacity-0'
        )}
        aria-hidden
      />
    </button>
  );
}

export function AppMobileDock() {
  const { activePageId, setActivePageId, navOrder } = useShell();
  const { mainPages, settingsPage } = useMemo(() => {
    const pages = getNavPagesInOrder(navOrder);
    return {
      mainPages: pages.filter((p) => p.id !== 'settings' && p.id !== 'calendar'),
      settingsPage: pages.find((p) => p.id === 'settings'),
    };
  }, [navOrder]);

  return (
    <nav
      className="aura-mobile-dock bg-background shrink-0 border-t border-border/40 px-4 pb-[calc(env(safe-area-inset-bottom,0)+0.7rem)] pt-2 md:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch gap-1 rounded-lg border border-border/60 bg-card/95 p-1 shadow-sm">
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
            <div className="flex w-12 shrink-0 flex-col justify-center" role="none">
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
