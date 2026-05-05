import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShell } from '@/app/navigation/shell-context';
import { getNavPageIds, type PageId } from '@/shared/config/nav-model';
import { PAGE_ICONS } from '@/shared/config/page-icons';
import { ShellNavItem } from '@/widgets/app-chrome/ShellNavItem';
import { SidebarDaySnapshot } from '@/widgets/app-chrome/SidebarDaySnapshot';
import { AuraBrandIcon } from '@/widgets/app-chrome/AuraBrandIcon';

function NavPageButton({
  pageId,
  isActive,
  onSelect,
  className,
}: {
  pageId: PageId;
  isActive: boolean;
  onSelect: () => void;
  className?: string;
}) {
  const { t } = useTranslation('nav');
  const Icon = PAGE_ICONS[pageId];
  return (
    <ShellNavItem icon={Icon} isActive={isActive} onClick={onSelect} className={className}>
      {t(pageId)}
    </ShellNavItem>
  );
}

export function AppSidebar() {
  const { t } = useTranslation(['nav', 'common']);
  const { activePageId, setActivePageId, toggleCalendar, navOrder } = useShell();
  const [isBrandHovered, setIsBrandHovered] = useState(false);
  const { mainPages, settingsPage } = useMemo(() => {
    const pages = getNavPageIds(navOrder);
    return {
      mainPages: pages.filter((id) => id !== 'settings' && id !== 'calendar'),
      settingsPage: pages.find((id) => id === 'settings'),
    };
  }, [navOrder]);

  return (
    <aside className="border-border bg-muted/25 hidden h-full min-h-0 w-[15.5rem] shrink-0 flex-col border-r px-2.5 py-3 md:flex xl:w-60">
      <div className="mb-2.5 shrink-0 px-0.5">
        <div
          className="relative h-8 overflow-hidden"
          onMouseEnter={() => setIsBrandHovered(true)}
          onMouseLeave={() => setIsBrandHovered(false)}
        >
          {activePageId === 'calendar' || isBrandHovered ? (
            <button
              type="button"
              onClick={toggleCalendar}
              className={cn(
                'border-border inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border px-2 text-xs font-medium outline-none aura-tx-interactive',
                'bg-primary/15 text-primary shadow-sm focus-visible:ring-2 focus-visible:ring-ring/70'
              )}
              aria-label={t('common:action.back')}
              title={t('common:action.back')}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <CalendarDays className="size-3.5 shrink-0" />
                <span className="truncate">{t('calendar')}</span>
              </span>
              <ChevronDown className="size-3.5 shrink-0 rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActivePageId('home')}
              className={cn(
                'inline-flex h-8 w-full items-center gap-2 rounded-lg px-1.5 text-left outline-none aura-tx-colors focus-visible:ring-2 focus-visible:ring-ring',
                'text-foreground'
              )}
              aria-label={t('home')}
              title={t('home')}
            >
              <AuraBrandIcon className="size-[1.05rem] shrink-0 text-foreground" />
              <span className="font-heading text-lg font-semibold tracking-tight text-foreground">AURA</span>
            </button>
          )}
        </div>
      </div>
      <div className="shrink-0 [@media(max-height:719px)]:block hidden">
        <SidebarDaySnapshot compact={true} />
      </div>
      <div className="shrink-0 hidden [@media(min-height:720px)]:block">
        <SidebarDaySnapshot compact={false} />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0.5" aria-label={t('common:nav.title')}>
        <div className="flex min-h-0 flex-1 flex-col gap-1 py-1">
          {mainPages.map((pageId) => (
            <div key={pageId} className="flex min-h-0 flex-1">
              <NavPageButton
                pageId={pageId}
                isActive={activePageId === pageId}
                onSelect={() => setActivePageId(pageId)}
                className="h-full"
              />
            </div>
          ))}
        </div>

        {settingsPage ? (
          <div className="mt-auto shrink-0 pt-2">
            <NavPageButton
              pageId={settingsPage}
              isActive={activePageId === settingsPage}
              onSelect={() => setActivePageId(settingsPage)}
            />
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
