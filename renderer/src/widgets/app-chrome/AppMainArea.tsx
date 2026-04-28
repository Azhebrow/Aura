import { useEffect, useState } from 'react';
import { useShell } from '@/app/navigation/shell-context';
import { ActivePageView } from '@/pages/view-registry';

export function AppMainArea() {
  const { activePageId } = useShell();
  const [prevPageId, setPrevPageId] = useState(activePageId);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (activePageId !== prevPageId) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setPrevPageId(activePageId);
        setIsFading(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [activePageId, prevPageId]);

  const scrollAreaClass =
    activePageId === 'stats'
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden overscroll-y-none px-0 pb-0 pt-0 sm:px-5 sm:pt-4 md:px-6 md:pb-0 md:pt-5'
      : 'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none px-0 pb-0 pt-0 sm:px-5 sm:pt-4 md:px-6 md:pb-0 md:pt-5';

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`relative ${scrollAreaClass}`}>
        <div className={`aura-page-enter flex h-full min-h-0 min-w-0 flex-1 flex-col transition-opacity duration-[280ms] ease-out ${
            isFading ? 'opacity-0' : 'opacity-100'
          }`}>
          <ActivePageView pageId={prevPageId} />
        </div>
      </div>
    </main>
  );
}
