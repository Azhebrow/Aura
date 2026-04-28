import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivePageView } from '@/pages/view-registry';
import type { PageId } from '@/shared/config/nav-model';

const PAGES_TO_WARM: PageId[] = ['home', 'diary', 'timer', 'rituals', 'ranks', 'stats', 'calendar', 'settings'];
const TOTAL_STEPS = PAGES_TO_WARM.length;

function emitProgress(progress: number, label: string) {
  window.dispatchEvent(
    new CustomEvent('aura-startup-progress', {
      detail: { progress, label },
    })
  );
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function getWarmCount(progress: number) {
  return Math.max(1, Math.min(TOTAL_STEPS, Math.ceil(progress * TOTAL_STEPS)));
}

export function PageWarmer({ onDone }: { onDone: () => void }) {
  const [warmCount, setWarmCount] = useState(1);
  const lastEmitRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 2200;

    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(raw);
      const nextCount = getWarmCount(eased);
      setWarmCount((prev) => (prev === nextCount ? prev : nextCount));

      const nowMs = performance.now();
      if (nowMs - lastEmitRef.current > 120 || raw >= 1) {
        lastEmitRef.current = nowMs;
        const index = Math.min(TOTAL_STEPS - 1, Math.max(0, nextCount - 1));
        emitProgress(eased, PAGES_TO_WARM[index] ?? 'Готово');
      }

      if (raw < 1) {
        raf = window.requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        emitProgress(1, 'Готово');
        window.setTimeout(onDone, 140);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [onDone]);

  const visiblePages = useMemo(() => PAGES_TO_WARM.slice(0, warmCount), [warmCount]);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: '-1px',
        top: '-1px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
        contain: 'strict',
      }}
    >
      {visiblePages.map((pageId) => (
        <ActivePageView key={pageId} pageId={pageId} />
      ))}
    </div>
  );
}
