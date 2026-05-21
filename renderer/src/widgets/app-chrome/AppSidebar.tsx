import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useShell } from '@/app/navigation/shell-context';
import { getNavPageIds, type PageId } from '@/shared/config/nav-model';
import { PAGE_ICONS } from '@/shared/config/page-icons';
import { ShellNavItem } from '@/widgets/app-chrome/ShellNavItem';
import { SidebarDaySnapshot } from '@/widgets/app-chrome/SidebarDaySnapshot';
import { AuraBrandIcon } from '@/widgets/app-chrome/AuraBrandIcon';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { getPageSectionsFromSettings, isPageVisible } from '@/shared/lib/page-sections-visibility';
import type { AuraRow } from '@/types/aura';

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
  const { db } = useAuraDb();
  const [isBrandHovered, setIsBrandHovered] = useState(false);

  const sectionsVis = useMemo(() => {
    if (!db) return null;
    const settings = db.getAppSettings() as AuraRow | null;
    return getPageSectionsFromSettings(settings);
  }, [db]);

  const { mainPages, settingsPage } = useMemo(() => {
    const pages = getNavPageIds(navOrder);
    return {
      mainPages: pages.filter((id) => {
        if (id === 'settings' || id === 'calendar') return false;
        if (sectionsVis) return isPageVisible(sectionsVis, id);
        return true;
      }),
      settingsPage: pages.find((id) => id === 'settings'),
    };
  }, [navOrder, sectionsVis]);

  return (
    <aside className="hidden h-full min-h-0 w-[12.5rem] shrink-0 flex-col border-r border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-2 py-3 aura-tx-surface md:flex xl:w-52">
      <div className="mb-2.5 shrink-0 px-0.5">
        <div
          className="relative h-8"
          onMouseEnter={() => setIsBrandHovered(true)}
          onMouseLeave={() => setIsBrandHovered(false)}
        >
          {activePageId === 'calendar' || isBrandHovered ? (
            <button
              type="button"
              onClick={toggleCalendar}
              className="inline-flex h-8 w-full items-center gap-2 rounded-lg bg-primary/8 px-2 text-left aura-tx-colors hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={activePageId === 'calendar' ? t('common:action.back') : t('calendar')}
              title={activePageId === 'calendar' ? t('common:action.back') : t('calendar')}
            >
              <ChevronDown
                className={`size-3 shrink-0 text-primary/50 aura-tx-colors transition-transform duration-200 ${activePageId === 'calendar' ? 'rotate-0' : 'rotate-180'}`}
              />
              <CalendarDays className="size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-primary">{t('calendar')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActivePageId('home')}
              className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-1 text-left aura-tx-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={t('home')}
              title={t('home')}
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <AuraBrandIcon className="size-3.5 text-primary" />
              </div>
              <span className="font-heading text-[0.95rem] font-bold tracking-tight text-foreground">AURA</span>
            </button>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 [@media(min-height:760px)_and_(max-height:859px)]:block">
        <SidebarDaySnapshot compact={true} />
      </div>
      <div className="hidden shrink-0 [@media(min-height:860px)]:block">
        <SidebarDaySnapshot compact={false} />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0.5" aria-label={t('common:nav.title')}>
        <div className="flex min-h-0 flex-1 flex-col gap-1 py-1 px-0.5">
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
          <div className="mt-auto shrink-0 px-0.5 pt-2">
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
