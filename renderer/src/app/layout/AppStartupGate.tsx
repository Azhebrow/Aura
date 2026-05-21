import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { PageWarmer } from './PageWarmer';

export function AppStartupGate({ children }: { children: ReactNode }) {
  const [loadingDone, setLoadingDone] = useState(false);
  const [gone, setGone] = useState(false);
  const fadeOutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loadingDone) return;
    fadeOutRef.current = window.setTimeout(() => setGone(true), 240);
    return () => {
      if (fadeOutRef.current != null) {
        window.clearTimeout(fadeOutRef.current);
        fadeOutRef.current = null;
      }
    };
  }, [loadingDone]);

  return (
    <div className="relative h-full w-full" style={{ height: 'var(--aura-app-height, 100svh)' }}>
      {loadingDone ? <div className="h-full w-full aura-app-soft-reveal">{children}</div> : null}

      {!gone && (
        <div
          aria-hidden
          className={`absolute inset-0 z-[120] transition-opacity duration-300 ${
            loadingDone ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
          }`}
        >
          <LoadingScreen />
        </div>
      )}

      {!loadingDone && <PageWarmer onDone={() => setLoadingDone(true)} />}
    </div>
  );
}
