import { useEffect, useState } from 'react';
import { AppHeader } from '@/widgets/app-chrome/AppHeader';
import { AppSidebar } from '@/widgets/app-chrome/AppSidebar';
import { AppMainArea } from '@/widgets/app-chrome/AppMainArea';
import { AppMobileDock } from '@/widgets/app-chrome/AppMobileDock';

export function RootLayout() {
  const [startupReady, setStartupReady] = useState(false);
  const [stage, setStage] = useState<'idle' | 'sidebar' | 'header' | 'content'>('idle');
  const stageTransitionCn = 'transition-all duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu will-change-transform';

  useEffect(() => {
    const onReady = () => setStartupReady(true);
    window.addEventListener('aura-startup-done', onReady);
    const fallback = window.setTimeout(onReady, 15000);
    return () => {
      window.removeEventListener('aura-startup-done', onReady);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!startupReady) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setStage('content');
      return;
    }
    setStage('sidebar');
    const t1 = window.setTimeout(() => setStage('header'), 240);
    const t2 = window.setTimeout(() => setStage('content'), 540);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [startupReady]);

  const sidebarReady = stage === 'sidebar' || stage === 'header' || stage === 'content';
  const headerReady = stage === 'header' || stage === 'content';
  const contentReady = stage === 'content';

  return (
    <div
      className="bg-background flex w-full min-w-0 overflow-hidden aura-tx-colors"
      style={{ height: 'var(--aura-app-height, 100svh)' }}
    >
      <div className="flex min-h-0 min-w-0 flex-1">
        <div
          className={`flex min-h-0 shrink-0 ${stageTransitionCn} ${
            sidebarReady ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
          }`}
        >
          <AppSidebar />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={`shrink-0 ${stageTransitionCn} ${
              headerReady ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'
            }`}
          >
            <AppHeader />
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 z-[2] transition-opacity duration-300 ${
                startupReady ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div className="bg-background/85 h-full w-full p-0 sm:p-4">
                <div className="flex h-full w-full animate-pulse flex-col gap-2.5 rounded-xl border border-border/70 bg-card/70 p-3 sm:gap-3 sm:rounded-2xl sm:p-4">
                  <div className="bg-muted h-7 w-1/3 rounded-lg" />
                  <div className="bg-muted/90 h-24 w-full rounded-xl" />
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <div className="bg-muted/85 rounded-xl" />
                    <div className="bg-muted/80 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`${stageTransitionCn} flex min-h-0 min-w-0 flex-1 flex-col ${
                contentReady ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.985] opacity-0'
              }`}
            >
              <AppMainArea />
            </div>
          </div>
          <div
            className={`shrink-0 ${stageTransitionCn} ${
              contentReady ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <AppMobileDock />
          </div>
        </div>
      </div>
    </div>
  );
}
