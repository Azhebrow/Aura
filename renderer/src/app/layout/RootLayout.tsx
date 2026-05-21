import { useEffect, useState } from 'react';
import { AppHeader } from '@/widgets/app-chrome/AppHeader';
import { AppSidebar } from '@/widgets/app-chrome/AppSidebar';
import { AppMainArea } from '@/widgets/app-chrome/AppMainArea';
import { AppMobileDock } from '@/widgets/app-chrome/AppMobileDock';
import { AppearanceScaleSync } from '@/features/theme/AppearanceScaleSync';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';
import { useAuraDb } from '@/shared/hooks/use-aura-db';

type Stage = 'idle' | 'sidebar' | 'header' | 'content';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Delays for each stage (ms from mount)
const T_SIDEBAR = 120;
const T_HEADER  = 480;
const T_CONTENT = 780;

function isOnboardingComplete(value: unknown) {
  return value === true || value === 1 || value === '1';
}

export function RootLayout() {
  const { db, ready } = useAuraDb();
  const [stage, setStage] = useState<Stage>('idle');
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    const settings = db?.getAppSettings?.() as Record<string, unknown> | null | undefined;
    setOnboardingDone(isOnboardingComplete(settings?.onboarding_complete));
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
    `transition-all duration-[520ms] ease-[${EASE}] transform-gpu will-change-transform${delay ? ` delay-[${delay}ms]` : ''}`;

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
      className="bg-background flex w-full min-w-0 overflow-hidden aura-tx-colors"
      style={{ height: 'var(--aura-app-height, 100svh)' }}
    >
      <AppearanceScaleSync />


      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Sidebar — slides in from left */}
        <div
          className={`flex min-h-0 shrink-0 ${tx()}`}
          style={{
            opacity:    sidebarReady ? 1 : 0,
            transform:  sidebarReady ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <AppSidebar />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Header — slides down from top */}
          <div
            className={`shrink-0 ${tx(40)}`}
            style={{
              opacity:   headerReady ? 1 : 0,
              transform: headerReady ? 'translateY(0)' : 'translateY(-110%)',
            }}
          >
            <AppHeader />
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* Content — fades in without scale to avoid layout jitter after settings changes. */}
            <div
              className={`${tx(80)} flex min-h-0 min-w-0 flex-1 flex-col`}
              style={{
                opacity:   contentReady ? 1 : 0,
                transform: contentReady ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              <AppMainArea />
            </div>
          </div>

          {/* Mobile dock — slides up from bottom */}
          <div
            className={`shrink-0 ${tx(120)}`}
            style={{
              opacity:   contentReady ? 1 : 0,
              transform: contentReady ? 'translateY(0)' : 'translateY(100%)',
            }}
          >
            <AppMobileDock />
          </div>
        </div>
      </div>
    </div>
  );
}
