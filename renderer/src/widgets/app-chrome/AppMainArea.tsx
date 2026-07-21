import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useShell } from '@/app/navigation/shell-context';
import { ActivePageView } from '@/pages/view-registry';
import { CalendarPage } from '@/pages/CalendarPage';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { UNIVERSAL_MODAL_COMPACT_PICKER_CN, UniversalModalContent } from '@/components/ui/universal-modal';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';
import { DEFAULT_NAV_ORDER, type PageId } from '@/shared/config/nav-model';

/** Подавляет цветовые переходы (aura-tx-colors и др.) на 600 мс при каждой
 *  смене страницы, чтобы данные, загружаемые после монтирования, не «моргали». */
function usePageColorFlashGuard(pageId: PageId) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-no-color-flash', '');
    const id = setTimeout(() => root.removeAttribute('data-no-color-flash'), 600);
    return () => { clearTimeout(id); root.removeAttribute('data-no-color-flash'); };
  }, [pageId]);

  useEffect(() => {
    const root = document.documentElement;
    let id: ReturnType<typeof setTimeout> | null = null;

    const suppress = () => {
      root.setAttribute('data-no-color-flash', '');
      if (id) clearTimeout(id);
      id = setTimeout(() => {
        root.removeAttribute('data-no-color-flash');
        id = null;
      }, 220);
    };

    window.addEventListener(AURA_DATA_CHANGED, suppress);
    window.addEventListener('settings-saved', suppress);
    window.addEventListener('task-categories-config-changed', suppress);

    return () => {
      window.removeEventListener(AURA_DATA_CHANGED, suppress);
      window.removeEventListener('settings-saved', suppress);
      window.removeEventListener('task-categories-config-changed', suppress);
      if (id) clearTimeout(id);
    };
  }, []);
}

export function AppMainArea() {
  const { activePageId, toggleCalendar } = useShell();
  const [prevPageId, setPrevPageId] = useState<PageId>('home');
  const lastDisplayPageIdRef = useRef<PageId>('home');
  usePageColorFlashGuard(activePageId);

  const scrollAreaClass =
    'aura-app-main-scroll aura-page-scroll-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none bg-background p-0 aura-tx-colors sm:p-4 md:p-3';

  const calendarOpen = activePageId === 'calendar';

  useEffect(() => {
    if (activePageId !== 'calendar') {
      setPrevPageId(activePageId);
    }
  }, [activePageId]);

  const displayPageId = calendarOpen ? prevPageId : activePageId;
  const prevDisplayPageId = lastDisplayPageIdRef.current;
  const prevDisplayIndex = DEFAULT_NAV_ORDER.indexOf(prevDisplayPageId);
  const displayIndex = DEFAULT_NAV_ORDER.indexOf(displayPageId);
  const pageMotion = prevDisplayIndex <= displayIndex ? 'up' : 'down';

  useLayoutEffect(() => {
    if (!calendarOpen) lastDisplayPageIdRef.current = displayPageId;
  }, [calendarOpen, displayPageId]);

  return (
    <main className="aura-col">
      <div className={`relative ${scrollAreaClass}`}>
        <div className="relative flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
          <div
            key={displayPageId}
            className={`aura-page-switch aura-page-switch-${pageMotion} flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col`}
          >
            <ActivePageView pageId={displayPageId} />
          </div>
        </div>
      </div>

      <Dialog open={calendarOpen} onOpenChange={(open) => { if (!open) toggleCalendar(); }}>
        <UniversalModalContent size="picker" scroll="content" className={UNIVERSAL_MODAL_COMPACT_PICKER_CN} showCloseButton={false}>
          <DialogTitle className="sr-only">Календарь</DialogTitle>
          <CalendarPage inModal onRequestClose={toggleCalendar} />
        </UniversalModalContent>
      </Dialog>
    </main>
  );
}
