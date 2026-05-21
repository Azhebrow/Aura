import { useEffect, useState } from 'react';
import { useShell } from '@/app/navigation/shell-context';
import { ActivePageView } from '@/pages/view-registry';
import { CalendarPage } from '@/pages/CalendarPage';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { UniversalModalContent } from '@/components/ui/universal-modal';
import type { PageId } from '@/shared/config/nav-model';

export function AppMainArea() {
  const { activePageId, toggleCalendar } = useShell();
  const [prevPageId, setPrevPageId] = useState<PageId>('home');

  const scrollAreaClass =
    'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none bg-background p-0 aura-tx-colors sm:p-4 md:p-3';

  const calendarOpen = activePageId === 'calendar';

  useEffect(() => {
    if (activePageId !== 'calendar') {
      setPrevPageId(activePageId);
    }
  }, [activePageId]);

  const displayPageId = calendarOpen ? prevPageId : activePageId;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`relative ${scrollAreaClass}`}>
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
            <ActivePageView pageId={displayPageId} />
          </div>
        </div>
      </div>

      <Dialog open={calendarOpen} onOpenChange={(open) => { if (!open) toggleCalendar(); }}>
        <UniversalModalContent size="picker" scroll="content" className="flex max-h-[min(92svh,48rem)] flex-col gap-0 p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Календарь</DialogTitle>
          <CalendarPage inModal onRequestClose={toggleCalendar} />
        </UniversalModalContent>
      </Dialog>
    </main>
  );
}
