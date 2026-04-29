import { useEffect, useRef, useState } from 'react';
import { useShell } from '@/app/navigation/shell-context';
import { ActivePageView } from '@/pages/view-registry';
import { DEFAULT_NAV_ORDER, type PageId } from '@/shared/config/nav-model';

function getNavIndex(pageId: PageId, order: readonly PageId[]): number {
  const idx = order.indexOf(pageId);
  return idx === -1 ? 0 : idx;
}

export function AppMainArea() {
  const { activePageId, navOrder } = useShell();
  const [displayedPageId, setDisplayedPageId] = useState(activePageId);
  const [animClass, setAnimClass] = useState('');
  const prevPageIdRef = useRef(activePageId);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (activePageId === prevPageIdRef.current) return;

    const order = navOrder ?? DEFAULT_NAV_ORDER;
    const prevIdx = getNavIndex(prevPageIdRef.current, order);
    const nextIdx = getNavIndex(activePageId, order);
    const goingForward = nextIdx >= prevIdx;

    prevPageIdRef.current = activePageId;

    // Cancel any in-flight timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Exit current page
    setAnimClass(goingForward ? 'aura-tabs-slide-exit-left' : 'aura-tabs-slide-exit-right');

    // Swap page content after exit
    const t1 = window.setTimeout(() => {
      setDisplayedPageId(activePageId);
      setAnimClass(goingForward ? 'aura-tabs-slide-enter-right' : 'aura-tabs-slide-enter-left');
    }, 150);

    // Clear animation class
    const t2 = window.setTimeout(() => {
      setAnimClass('');
    }, 450);

    timersRef.current = [t1, t2];

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [activePageId, navOrder]);

  const scrollAreaClass =
    displayedPageId === 'stats'
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden overscroll-y-none px-0 pb-0 pt-0 sm:px-5 sm:pt-4 md:px-6 md:pb-0 md:pt-5'
      : 'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none px-0 pb-0 pt-0 sm:px-5 sm:pt-4 md:px-6 md:pb-0 md:pt-5';

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`relative ${scrollAreaClass}`}>
        <div className={`flex h-full min-h-0 min-w-0 flex-1 flex-col ${animClass}`}>
          <ActivePageView pageId={displayedPageId} />
        </div>
      </div>
    </main>
  );
}
