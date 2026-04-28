import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/widgets/app-chrome/AppHeader';
import { AppSidebar } from '@/widgets/app-chrome/AppSidebar';
import { AppMainArea } from '@/widgets/app-chrome/AppMainArea';
import { AppMobileDock } from '@/widgets/app-chrome/AppMobileDock';

/**
 * Корневой layout: chrome (шапка + боковая навигация) и область страницы.
 * Соответствует роли `index.html` + `.page` в legacy, без смешения с доменом.
 */
export function RootLayout() {
  const [stage, setStage] = useState<'idle' | 'sidebar' | 'header' | 'content'>('idle');
  const startupSequenceStartedRef = useRef(false);
  const stageTransitionCn =
    'transition-all duration-[680ms] ease-[cubic-bezier(0.16,0.84,0.24,1)] transform-gpu will-change-transform';

  useEffect(() => {
    let t1: number | null = null;
    let t2: number | null = null;
    let t3: number | null = null;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = () => {
      if (startupSequenceStartedRef.current) return;
      startupSequenceStartedRef.current = true;
      if (reduceMotion) {
        setStage('content');
        return;
      }
      setStage('sidebar');
      t1 = window.setTimeout(() => setStage('header'), 520);
      t2 = window.setTimeout(() => setStage('content'), 1080);
    };
    const onStartupDone = () => run();
    window.addEventListener('aura-startup-done', onStartupDone);
    t3 = window.setTimeout(run, 1700);
    return () => {
      window.removeEventListener('aura-startup-done', onStartupDone);
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      if (t3) window.clearTimeout(t3);
    };
  }, []);

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
            sidebarReady ? 'translate-x-0 opacity-100' : '-translate-x-16 opacity-0'
          }`}
        >
          <AppSidebar />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={`shrink-0 ${stageTransitionCn} ${
              headerReady ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}
          >
            <AppHeader />
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className={`${stageTransitionCn} flex min-h-0 min-w-0 flex-1 flex-col origin-center ${
                contentReady ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-0 scale-[0.9] opacity-0'
              }`}
            >
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 z-[2] transition-opacity duration-[520ms] ease-aura ${
                    contentReady ? 'opacity-0' : 'opacity-100'
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
                  className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity duration-[520ms] ease-aura ${
                    contentReady ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <AppMainArea />
                </div>
              </div>
            </div>
          </div>
          <div
            className={`shrink-0 ${stageTransitionCn} ${
              contentReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <AppMobileDock />
          </div>
        </div>
      </div>
    </div>
  );
}
