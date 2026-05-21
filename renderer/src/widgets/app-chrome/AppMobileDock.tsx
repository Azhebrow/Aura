import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useShell } from '@/app/navigation/shell-context';
import { getNavPageIds, type PageId } from '@/shared/config/nav-model';
import { PAGE_ICONS } from '@/shared/config/page-icons';

function DockPageButton({ pageId, active, onSelect }: { pageId: PageId; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('nav');
  const Icon = PAGE_ICONS[pageId];
  return (
    <button
      type="button"
      className={cn(
        'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 aura-tx-interactive',
        'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground active:scale-[0.95]'
      )}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon
        className="size-[var(--nav-icon-size)] shrink-0"
        strokeWidth={active ? 2.2 : 1.9}
        aria-hidden
      />
      <span className="sr-only">{t(pageId)}</span>
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
  const pages = useMemo(() => {
    const allPages = getNavPageIds(navOrder);
    return allPages.filter((id) => id !== 'stats' && id !== 'ranks' && id !== 'calendar');
  }, [navOrder]);

  return (
    <nav
      className="aura-mobile-dock shrink-0 border-t border-[var(--aura-border-soft)] bg-[var(--aura-surface-shell)] px-4 pb-[calc(env(safe-area-inset-bottom,0)+0.7rem)] pt-2 aura-tx-surface md:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="aura-surface-panel mx-auto flex w-full items-stretch gap-1 rounded-lg border p-1">
        <div className="flex min-w-0 flex-1 flex-row items-stretch gap-1" role="group" aria-label="Разделы приложения">
          {pages.map((pageId) => (
            <DockPageButton
              key={pageId}
              pageId={pageId}
              active={activePageId === pageId}
              onSelect={() => setActivePageId(pageId)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
