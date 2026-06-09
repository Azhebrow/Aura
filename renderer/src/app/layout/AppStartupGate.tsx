import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PageWarmer } from './PageWarmer';

/**
 * AppStartupGate управляет стартовым экраном.
 *
 * Единственный loading UI — inline HTML preloader в index.html (#aura-preload).
 * Он появляется мгновенно (до React), реагирует на тему/акцент из localStorage,
 * и убирается здесь с fade-out когда PageWarmer сигнализирует готовность.
 * React LoadingScreen больше не используется — один экран, нет переключений.
 */
export function AppStartupGate({ children }: { children: ReactNode }) {
  const [loadingDone, setLoadingDone] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!loadingDone || calledRef.current) return;
    calledRef.current = true;

    // Dismiss the inline HTML preloader
    const preload = document.getElementById('aura-preload');
    if (preload) {
      preload.classList.add('aura-preload-gone');
      window.setTimeout(() => preload.remove(), 250);
    }
  }, [loadingDone]);

  return (
    <div className="relative h-full w-full" style={{ height: 'var(--aura-app-height, 100svh)' }}>
      {loadingDone && (
        <div className="h-full w-full aura-app-soft-reveal">
          {children}
        </div>
      )}
      {!loadingDone && <PageWarmer onDone={() => setLoadingDone(true)} />}
    </div>
  );
}
