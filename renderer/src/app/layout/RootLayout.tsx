import { useEffect, useState } from 'react';
import { AppHeader } from '@/widgets/app-chrome/AppHeader';
import { AppSidebar } from '@/widgets/app-chrome/AppSidebar';
import { AppMainArea } from '@/widgets/app-chrome/AppMainArea';
import { AppMobileDock } from '@/widgets/app-chrome/AppMobileDock';
import { AppearanceScaleSync } from '@/features/theme/AppearanceScaleSync';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { ShellErrorBoundary } from '@/app/layout/ShellErrorBoundary';

type Stage = 'idle' | 'sidebar' | 'header' | 'content';

// Delays for each stage (ms from mount) — pure fade, no translate
const T_SIDEBAR = 0;
const T_HEADER  = 60;
const T_CONTENT = 120;

function isOnboardingComplete(value: unknown) {
  return value === true || value === 1 || value === '1';
}

export function RootLayout() {
  const { db, ready } = useAuraDb();
  const [stage, setStage] = useState<Stage>('idle');
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    try {
      const settings = db?.getAppSettings?.() as Record<string, unknown> | null | undefined;
      setOnboardingDone(isOnboardingComplete(settings?.onboarding_complete));
    } catch (error) {
      console.warn('[AURA] Failed to read onboarding settings, opening main shell.', error);
      setOnboardingDone(true);
    }
  }, [db, ready]);

  useEffect(() => {
    if (onboardingDone !== true) return;
    setStage('idle');
    const t1 = setTimeout(() => setStage('sidebar'), T_SIDEBAR);
    const t2 = setTimeout(() => setStage('header'),  T_HEADER);
    const t3 = setTimeout(() => setStage('content'), T_CONTENT);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onboardingDone]);

  const sidebarReady  = stage === 'sidebar' || stage === 'header' || stage === 'content';
  const headerReady   = stage === 'header'  || stage === 'content';
  const contentReady  = stage === 'content';

  const tx = (delay = 0) =>
    `aura-shell-reveal transition-opacity duration-[380ms] ease-out${delay ? ` delay-[${delay}ms]` : ''}`;

  if (!ready || onboardingDone === null) {
    return (
      <div className="bg-background aura-tx-colors" style={{ height: 'var(--aura-app-height, 100svh)' }}>
        <AppearanceScaleSync />
      </div>
    );
  }

  if (!onboardingDone) {
    return (
      <>
        <AppearanceScaleSync />
        <OnboardingWizard db={db} onComplete={() => setOnboardingDone(true)} />
      </>
    );
  }

  return (
    <div
      className="aura-app-root bg-background flex w-full min-w-0 overflow-hidden aura-tx-colors"
      style={{ height: 'var(--aura-app-height, 100svh)' }}
    >
      <AppearanceScaleSync />


      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Sidebar — slides in from left */}
        <div
          className={`aura-app-sidebar-shell flex min-h-0 shrink-0 ${tx()}`}
          style={{ opacity: sidebarReady ? 1 : 0 }}
        >
          <ShellErrorBoundary label="Навигация">
            <AppSidebar />
          </ShellErrorBoundary>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={`aura-app-header-shell shrink-0 ${tx(40)}`}
            style={{ opacity: headerReady ? 1 : 0 }}
          >
            <ShellErrorBoundary label="Верхняя панель">
              <AppHeader />
            </ShellErrorBoundary>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className={`aura-app-content-shell ${tx(80)} flex min-h-0 min-w-0 flex-1 flex-col`}
              style={{ opacity: contentReady ? 1 : 0 }}
            >
              <ShellErrorBoundary label="Страница">
                <AppMainArea />
              </ShellErrorBoundary>
            </div>
          </div>

          <div
            className={`aura-app-mobile-shell shrink-0 ${tx(120)}`}
            style={{ opacity: contentReady ? 1 : 0 }}
          >
            <ShellErrorBoundary label="Нижняя панель">
              <AppMobileDock />
            </ShellErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
