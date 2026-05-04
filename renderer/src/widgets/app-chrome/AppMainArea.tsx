import { useMemo } from 'react';
import { useShell } from '@/app/navigation/shell-context';
import { ActivePageView } from '@/pages/view-registry';
import { DEFAULT_NAV_ORDER } from '@/shared/config/nav-model';

export function AppMainArea() {
  const { activePageId, navOrder } = useShell();
  const pageIds = useMemo(() => navOrder ?? DEFAULT_NAV_ORDER, [navOrder]);

  const scrollAreaClass =
    'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none px-0 pb-0 pt-0 sm:px-5 sm:pb-4 sm:pt-4 md:px-6 md:pb-5 md:pt-5';

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`relative ${scrollAreaClass}`}>
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
          {pageIds.map((pageId) => (
            <div
              key={pageId}
              className={pageId === activePageId ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}
              aria-hidden={pageId !== activePageId}
            >
              <ActivePageView pageId={pageId} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
