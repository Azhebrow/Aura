import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PageWarmer } from './PageWarmer';

const STARTUP_MIN_VISIBLE_MS = 1600;
const STARTUP_FADE_OUT_MS = 560;

/**
 * AppStartupGate управляет стартовым экраном.
 *
 * Единственный loading UI — inline HTML preloader в index.html (#aura-preload).
 * Он появляется мгновенно (до React), реагирует на тему/акцент из localStorage,
 * и убирается здесь с fade-out когда PageWarmer сигнализирует готовность.
 */
export function AppStartupGate({ children }: { children: ReactNode }) {
  const [loadingDone, setLoadingDone] = useState(false);
  const calledRef = useRef(false);
  const startedAtRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const doneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loadingDone || calledRef.current) return;
    calledRef.current = true;

    // Dismiss the inline HTML preloader
    const preload = document.getElementById('aura-preload');
    if (preload) {
      preload.classList.add('aura-preload-gone');
      window.setTimeout(() => preload.remove(), STARTUP_FADE_OUT_MS + 60);
    }
  }, [loadingDone]);

  useEffect(() => {
    return () => {
      if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current);
    };
  }, []);

  const handleWarmerDone = () => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - startedAtRef.current;
    const delay = Math.max(0, STARTUP_MIN_VISIBLE_MS - elapsed);

    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current);
    doneTimerRef.current = window.setTimeout(() => {
      doneTimerRef.current = null;
      setLoadingDone(true);
    }, delay);
  };

  return (
    <div className="relative h-full w-full" style={{ height: 'var(--aura-app-height, 100svh)' }}>
      {loadingDone && (
        <div className="h-full w-full aura-app-soft-reveal">
          {children}
        </div>
      )}
      {!loadingDone && <PageWarmer onDone={handleWarmerDone} />}
    </div>
  );
}
