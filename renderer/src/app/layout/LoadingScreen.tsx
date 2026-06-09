import { useEffect, useRef, useState } from 'react';
import { getStartupReadiness, subscribeStartupReadiness } from './startup-readiness';

// ─── Smooth progress tracker (no React re-renders for animation) ──────────────

const BACKGROUND_IDS = new Set(['icons-assets', 'ranks-art', 'heavy-modals', 'timer-warmup']);

function getVisualProgress(): number {
  const s = getStartupReadiness();
  if (s.startupReady) return 100;
  const p = s.progress;
  return Math.max(6, Math.min(97, p));
}

// ─── LoadingScreen ─────────────────────────────────────────────────────────────

export function LoadingScreen() {
  const barRef   = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const rafRef    = useRef<number | null>(null);
  const targetRef = useRef<number>(getVisualProgress());
  const currentRef= useRef<number>(getVisualProgress());
  const [mounted, setMounted] = useState(false);

  // Mount fade-in
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 16);
    return () => window.clearTimeout(id);
  }, []);

  // Smooth RAF-driven progress — zero React re-renders for animation
  useEffect(() => {
    const update = () => {
      const target = targetRef.current;
      const cur    = currentRef.current;
      const diff   = target - cur;
      const next   = Math.abs(diff) < 0.08 ? target : cur + diff * 0.09;
      currentRef.current = next;

      if (barRef.current) {
        barRef.current.style.transform = `translateX(-${100 - next}%)`;
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Subscribe to startup state changes — only update target, no re-render
  useEffect(() => {
    const unsubscribe = subscribeStartupReadiness(() => {
      const s = getStartupReadiness();
      targetRef.current = s.startupReady ? 100 : Math.max(6, Math.min(97, s.progress));

      // Update task label directly via DOM — no React state
      if (labelRef.current) {
        const label = s.tasks
          .find(t => !BACKGROUND_IDS.has(t.id) && t.status === 'running')?.label ?? null;
        labelRef.current.style.opacity = label ? '1' : '0';
        if (label) labelRef.current.textContent = label;
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background"
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >

      {/* Anchor point: absolute center, zero size — all children offset from here */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
        <div aria-hidden style={{
          position: 'absolute', borderRadius: '50%',
          width: 72, height: 72, top: -36, left: -36,
          border: '1px solid color-mix(in oklab, var(--primary) 22%, transparent)',
          animation: 'aura-loading-ring 2.8s ease-in-out infinite',
        }} />
        <div aria-hidden style={{
          position: 'absolute', borderRadius: '50%',
          width: 52, height: 52, top: -26, left: -26,
          border: '1px solid color-mix(in oklab, var(--primary) 14%, transparent)',
          animation: 'aura-loading-ring 2.8s ease-in-out infinite 0.6s',
        }} />
        <svg viewBox="0 0 24 24" fill="none" aria-hidden style={{
          position: 'absolute',
          width: 28, height: 28, top: -14, left: -14,
          color: 'var(--primary)',
          filter: 'drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 40%, transparent))',
          animation: 'aura-loading-star 4s ease-in-out infinite',
          transformOrigin: '14px 14px',
        }}>
          <path d="M12 1.75L14.88 9.12L22.25 12L14.88 14.88L12 22.25L9.12 14.88L1.75 12L9.12 9.12L12 1.75Z" fill="currentColor" />
        </svg>
      </div>

      {/* Progress bar — anchored to bottom-center, independent of icon */}
      <div style={{ position: 'absolute', bottom: '50%', left: '50%', transform: 'translateX(-50%) translateY(72px)', width: 160 }}>

        {/* Progress track */}
        <div className="flex w-full flex-col items-center gap-3">
          <div
            className="w-full overflow-hidden rounded-full"
            style={{
              height: 2,
              background: 'color-mix(in oklab, var(--primary) 10%, var(--aura-surface-control))',
            }}
            aria-hidden
          >
            <div
              ref={barRef}
              style={{
                height: '100%',
                borderRadius: 'inherit',
                background: 'linear-gradient(90deg, color-mix(in oklab, var(--primary) 55%, transparent), var(--primary))',
                transform: 'translateX(-100%)',
                willChange: 'transform',
                boxShadow: '2px 0 8px color-mix(in oklab, var(--primary) 60%, transparent)',
              }}
            />
          </div>

          {/* Task label — DOM-driven, no React state */}
          <p
            ref={labelRef}
            style={{
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'var(--muted-foreground)',
              opacity: 0,
              transition: 'opacity 400ms ease',
              textAlign: 'center',
              minHeight: '1.2em',
              lineHeight: 1.4,
            }}
            aria-live="polite"
            aria-atomic="true"
          />
        </div>
      </div>

      <style>{`
        @keyframes aura-loading-ring {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0.1;  transform: scale(1.08); }
        }
        @keyframes aura-loading-star {
          0%, 100% { opacity: 0.75; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
